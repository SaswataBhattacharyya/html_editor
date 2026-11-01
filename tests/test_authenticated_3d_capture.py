import json
import os
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
import struct
import subprocess
import sys
import tempfile
import threading
import unittest

from tools.browser_clone import (
    MODEL_EXTENSIONS,
    capture_model_download,
    is_wasm_resource,
    should_capture_cross_origin_asset,
    should_capture_authenticated_fetch,
    should_retain_authenticated_response,
    wait_for_login_continue,
)


def make_minimal_glb():
    document = json.dumps({"asset": {"version": "2.0"}, "scenes": [{"nodes": []}], "scene": 0}).encode()
    document += b" " * ((4 - len(document) % 4) % 4)
    total = 12 + 8 + len(document)
    return b"glTF" + struct.pack("<II", 2, total) + struct.pack("<II", len(document), 0x4E4F534A) + document


class FakeDownload:
    def __init__(self, filename, url, content):
        self.suggested_filename = filename
        self.url = url
        self.content = content

    def save_as(self, path):
        Path(path).write_bytes(self.content)


class TestDownloadCapture(unittest.TestCase):
    def test_meshy_payload_is_recognized_as_a_runtime_model_format(self):
        self.assertIn(".meshy", MODEL_EXTENSIONS)

    def test_authenticated_capture_keeps_wasm_decoder_but_discards_other_fetch_data(self):
        self.assertTrue(is_wasm_resource("https://meshy.invalid/resource/mesh_loader.wasm", "application/wasm"))
        self.assertTrue(is_wasm_resource("https://meshy.invalid/loader", "application/wasm; charset=binary"))
        self.assertTrue(should_capture_authenticated_fetch("fetch", False, False, True))
        self.assertFalse(should_capture_authenticated_fetch("fetch", False, False, False))
        self.assertTrue(should_capture_authenticated_fetch("script", False, False, False))
        self.assertTrue(should_retain_authenticated_response("fetch", False, True))
        self.assertFalse(should_retain_authenticated_response("fetch", False, False))
        self.assertTrue(should_capture_cross_origin_asset(False, False, False, True))
        self.assertFalse(should_capture_cross_origin_asset(False, False, False, False))

    def test_login_wait_reports_when_browser_is_closed(self):
        class ClosingPage:
            closed = False

            def is_closed(self):
                return self.closed

            def wait_for_timeout(self, _milliseconds):
                self.closed = True
                raise RuntimeError("Target page has been closed")

        with tempfile.TemporaryDirectory() as directory:
            with self.assertRaisesRegex(RuntimeError, "Login browser was closed before capture"):
                wait_for_login_continue(ClosingPage(), Path(directory) / "continue", 1)

    def test_downloaded_glb_is_safely_saved_and_query_redacted(self):
        with tempfile.TemporaryDirectory() as directory:
            content = make_minimal_glb()
            download = FakeDownload("../../mesh body.glb", "blob:https://mesh.invalid/model?token=secret", content)
            record = capture_model_download(
                download,
                directory,
                lambda url: "blob:https://mesh.invalid/model",
                remaining_bytes=1024,
            )
            self.assertIsNotNone(record)
            self.assertEqual(record["path"].split("/")[:2], ["assets", "downloads"])
            self.assertEqual(record["bytes"], len(content))
            self.assertTrue(record["download"])
            self.assertNotIn("secret", record["url"])
            self.assertEqual((Path(directory) / record["path"]).read_bytes(), content)

    def test_non_model_download_and_invalid_glb_are_ignored(self):
        with tempfile.TemporaryDirectory() as directory:
            self.assertIsNone(capture_model_download(
                FakeDownload("account.txt", "https://mesh.invalid/account", b"private"),
                directory, lambda url: url, remaining_bytes=1024,
            ))
            self.assertIsNone(capture_model_download(
                FakeDownload("fake.glb", "https://mesh.invalid/fake.glb", b"not a glb"),
                directory, lambda url: url, remaining_bytes=1024,
            ))
            self.assertEqual([item for item in Path(directory).rglob("*") if item.is_file()], [])

    def test_size_limit_rejects_model_download(self):
        with tempfile.TemporaryDirectory() as directory:
            self.assertIsNone(capture_model_download(
                FakeDownload("large.glb", "https://mesh.invalid/large.glb", make_minimal_glb()),
                directory, lambda url: url, remaining_bytes=1,
            ))
            self.assertEqual([item for item in Path(directory).rglob("*") if item.is_file()], [])


class TestBrowserRuntimeCapture(unittest.TestCase):
    def test_extensionless_cross_origin_glb_is_captured_but_other_binary_is_not(self):
        glb = make_minimal_glb()
        meshy = b"MESHY\x00encrypted-test-payload"
        wasm = b"\x00asm\x01\x00\x00\x00test-decoder"
        other = b"not a model response"
        class CdnHandler(BaseHTTPRequestHandler):
            def do_GET(self):
                body = (glb if self.path == "/asset" else meshy if self.path == "/model.meshy"
                        else wasm if self.path == "/decoder.wasm" else other)
                self.send_response(200)
                self.send_header("Content-Type", "application/wasm" if self.path == "/decoder.wasm" else "application/octet-stream")
                self.send_header("Access-Control-Allow-Origin", "*")
                self.send_header("Content-Length", str(len(body)))
                self.end_headers()
                self.wfile.write(body)

            def log_message(self, *_args):
                pass

        cdn = ThreadingHTTPServer(("127.0.0.1", 0), CdnHandler)
        cdn_port = cdn.server_address[1]
        cdn_thread = threading.Thread(target=cdn.serve_forever, daemon=True)
        cdn_thread.start()

        class SiteHandler(BaseHTTPRequestHandler):
            def do_GET(self):
                if self.path == "/local-decoder.wasm":
                    self.send_response(200)
                    self.send_header("Content-Type", "application/wasm")
                    self.send_header("Content-Length", str(len(wasm)))
                    self.end_headers()
                    self.wfile.write(wasm)
                    return
                if self.path == "/meshy-export.glb":
                    self.send_response(200)
                    self.send_header("Content-Type", "application/octet-stream")
                    self.send_header("Content-Disposition", 'attachment; filename="meshy-export.glb"')
                    self.send_header("Content-Length", str(len(glb)))
                    self.end_headers()
                    self.wfile.write(glb)
                    return
                page = f"""<!doctype html><title>3D fixture</title><script>
                  Promise.all([
                    fetch('http://localhost:{cdn_port}/asset').then(r => r.arrayBuffer()),
                    fetch('http://localhost:{cdn_port}/model.meshy').then(r => r.arrayBuffer()),
                    fetch('http://localhost:{cdn_port}/not-a-model').then(r => r.arrayBuffer()),
                    fetch('http://localhost:{cdn_port}/decoder.wasm').then(r => r.arrayBuffer()),
                    fetch('/local-decoder.wasm').then(r => r.arrayBuffer())
                  ]);
                </script>""".encode()
                self.send_response(200)
                self.send_header("Content-Type", "text/html")
                self.send_header("Content-Length", str(len(page)))
                self.end_headers()
                self.wfile.write(page)

            def log_message(self, *_args):
                pass

        site = ThreadingHTTPServer(("127.0.0.1", 0), SiteHandler)
        site_thread = threading.Thread(target=site.serve_forever, daemon=True)
        site_thread.start()
        try:
            with tempfile.TemporaryDirectory() as directory:
                root = Path(directory)
                package = root / "package"
                source = root / "source"
                previews = root / "previews"
                env = os.environ.copy()
                command = [
                    sys.executable, "tools/browser_clone.py",
                    "--url", f"http://127.0.0.1:{site.server_address[1]}/",
                    "--html", str(package / "rendered.html"),
                    "--screenshot", str(previews / "capture.png"),
                    "--report", str(source / "browser-report.json"),
                    "--capture-assets-dir", str(package),
                    "--runtime-assets-report", str(source / "runtime-assets.json"),
                ]
                result = subprocess.run(command, timeout=90, env=env, capture_output=True, text=True)
                self.assertEqual(result.returncode, 0, result.stderr or result.stdout)
                report = json.loads((source / "runtime-assets.json").read_text())
                self.assertEqual(len(report["models"]), 2, json.dumps(report, indent=2))
                self.assertEqual(len(report["decoderFiles"]), 2, json.dumps(report, indent=2))
                self.assertTrue(any(model.get("external") for model in report["models"]))
                for model in report["models"]:
                    content = (package / model["path"]).read_bytes()
                    if model["path"].endswith(".glb"):
                        self.assertEqual(content[:4], b"glTF")
                    else:
                        self.assertTrue(model["path"].endswith(".meshy"))
                        self.assertEqual(content, meshy)
                for decoder in report["decoderFiles"]:
                    self.assertEqual((package / decoder["path"]).read_bytes(), wasm)
                self.assertEqual(len(report["assets"]), 4)
        finally:
            cdn.shutdown()
            cdn.server_close()
            site.shutdown()
            site.server_close()



if __name__ == "__main__":
    unittest.main()
