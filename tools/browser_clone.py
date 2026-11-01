#!/usr/bin/env python3
"""Capture a rendered website with Playwright for the local HTML editor worker."""

import argparse
import json
import os
import hashlib
import time
from urllib.parse import unquote, urlparse
from pathlib import Path

from playwright.sync_api import sync_playwright


# `.meshy` is Meshy's proprietary runtime model payload. It is useful to retain
# for an authorized capture, but is not a standard Blender interchange format.
MODEL_EXTENSIONS = {".glb", ".gltf", ".fbx", ".obj", ".usdz", ".ktx2", ".basis", ".splinecode", ".meshy"}


def wait_for_login_continue(page, signal_path, timeout_seconds):
    signal = Path(signal_path)
    deadline = time.monotonic() + timeout_seconds
    while not signal.exists() and time.monotonic() < deadline:
        if page.is_closed():
            raise RuntimeError("Login browser was closed before capture")
        try:
            page.wait_for_timeout(300)
        except Exception as error:
            if page.is_closed():
                raise RuntimeError("Login browser was closed before capture") from error
            raise
    if not signal.exists():
        raise TimeoutError("Timed out waiting for the user to continue after login")
    signal.unlink(missing_ok=True)


def capture_model_download(download, capture_dir, safe_url, remaining_bytes, asset_limit_reached=False):
    """Persist a user-triggered 3D download within the clone package."""
    if asset_limit_reached:
        return None
    suggested = Path(download.suggested_filename).name
    extension = Path(suggested).suffix.lower()
    if extension not in MODEL_EXTENSIONS:
        return None
    digest = hashlib.sha256(download.url.encode("utf-8")).hexdigest()[:16]
    safe_name = "".join(c for c in Path(suggested).stem if c.isalnum() or c in "._-")[:100] or "model"
    relative = Path("assets") / "downloads" / f"{safe_name}-{digest}{extension}"
    root = Path(capture_dir).resolve()
    target = (root / relative).resolve()
    if not target.is_relative_to(root):
        return None
    target.parent.mkdir(parents=True, exist_ok=True)
    download.save_as(str(target))
    size = target.stat().st_size
    if size > remaining_bytes:
        target.unlink(missing_ok=True)
        return None
    if extension == ".glb":
        with target.open("rb") as stream:
            if stream.read(4) != b"glTF":
                target.unlink(missing_ok=True)
                return None
    return {
        "url": safe_url(download.url),
        "path": relative.as_posix(),
        "bytes": size,
        "contentType": "application/octet-stream",
        "status": 200,
        "external": False,
        "is3d": True,
        "download": True,
    }


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--url", required=True)
    parser.add_argument("--html", required=True)
    parser.add_argument("--screenshot", required=True)
    parser.add_argument("--report", required=True)
    parser.add_argument("--scene-dir")
    parser.add_argument("--scene-report")
    parser.add_argument("--capture-assets-dir")
    parser.add_argument("--runtime-assets-report")
    parser.add_argument("--interactive-login", action="store_true")
    parser.add_argument("--auth-continue-file", help="Single-use local signal after the user finishes logging in")
    parser.add_argument("--login-timeout", type=int, default=600)
    args = parser.parse_args()

    html_path = Path(args.html)
    screenshot_path = Path(args.screenshot)
    report_path = Path(args.report)
    html_path.parent.mkdir(parents=True, exist_ok=True)
    screenshot_path.parent.mkdir(parents=True, exist_ok=True)
    report_path.parent.mkdir(parents=True, exist_ok=True)

    chromium_path = os.environ.get("HTML_EDITOR_CHROMIUM_PATH")
    launch_options = {"headless": not args.interactive_login, "args": ["--no-sandbox", "--disable-dev-shm-usage"]}
    if args.interactive_login and not args.auth_continue_file:
        parser.error("--interactive-login requires --auth-continue-file")
    if chromium_path:
        launch_options["executable_path"] = chromium_path

    with sync_playwright() as playwright:
        browser = playwright.chromium.launch(**launch_options)
        page = browser.new_page(viewport={"width": 1440, "height": 1000}, device_scale_factor=1)
        # Apps with many large JS chunks can evict a model response from
        # Chromium's DevTools cache before Playwright's response.body() reads
        # it. Raise the bounded CDP body buffers before navigating so large
        # runtime models such as Meshy's `model.meshy` remain readable.
        cdp = page.context.new_cdp_session(page)
        cdp.send("Network.enable", {
            "maxTotalBufferSize": int(os.environ.get("BROWSER_CDP_TOTAL_BUFFER_BYTES", str(512 * 1024 * 1024))),
            "maxResourceBufferSize": int(os.environ.get("BROWSER_CDP_RESOURCE_BUFFER_BYTES", str(200 * 1024 * 1024))),
        })
        scene_dir = Path(args.scene_dir) if args.scene_dir else None
        scene_report_path = Path(args.scene_report) if args.scene_report else None
        scene_files = []
        wasm_files = []
        runtime_assets = []
        model_assets = []
        failed_requests = []
        http_errors = []
        capture_dir = Path(args.capture_assets_dir) if args.capture_assets_dir else None
        runtime_report_path = Path(args.runtime_assets_report) if args.runtime_assets_report else None
        capture_origin = urlparse(args.url).netloc

        def report_url(value):
            parsed = urlparse(value)
            return parsed._replace(query="", fragment="").geturl() if args.interactive_login else value
        capture_bytes = 0
        capture_count = 0
        model_extensions = MODEL_EXTENSIONS
        seen_assets = set()
        pending_downloads = []
        max_capture_assets = int(os.environ.get("BROWSER_CAPTURE_MAX_ASSETS", "300"))
        max_capture_bytes = int(os.environ.get("BROWSER_CAPTURE_MAX_BYTES", str(200 * 1024 * 1024)))
        if scene_dir:
            scene_dir.mkdir(parents=True, exist_ok=True)

        if capture_dir:
            capture_dir.mkdir(parents=True, exist_ok=True)

            def capture_runtime_asset(response):
                nonlocal capture_bytes, capture_count
                request = response.request
                parsed = urlparse(response.url)
                extension = Path(parsed.path).suffix.lower()
                content_type = response.headers.get("content-type", "").lower()
                content_disposition = response.headers.get("content-disposition", "").lower()
                is_model = extension in model_extensions or "model/gltf" in content_type
                generic_binary = content_type.split(";", 1)[0].strip() in {
                    "application/octet-stream", "binary/octet-stream"
                }
                same_origin = parsed.netloc == capture_origin or (args.interactive_login and parsed.netloc == urlparse(page.url).netloc)
                if (response.status != 200 or not (same_origin or is_model or generic_binary) or
                        request.resource_type in {"document", "websocket", "eventsource"} or
                        (args.interactive_login and request.resource_type in {"fetch", "xhr"} and not (is_model or generic_binary)) or
                        "attachment" in content_disposition or
                        capture_count >= max_capture_assets or capture_bytes >= max_capture_bytes):
                    return
                # Capture cross-origin responses ONLY for recognized 3D file formats.
                # Do not mirror arbitrary cross-origin API responses. Same-origin
                # authenticated responses may be private; keep the project local.
                safe_url = parsed._replace(query="", fragment="").geturl()
                identity = response.url
                if identity in seen_assets and not (args.interactive_login and request.resource_type in {"fetch", "xhr"}):
                    return
                try:
                    # Some CDNs return GLB with a signed, extensionless URL and a
                    # generic binary MIME type. Inspect only bounded binary
                    # responses from cross-origin hosts; persist them only when
                    # the GLB magic bytes prove that they are model files.
                    content_length = int(response.headers.get("content-length", "0") or 0)
                    if not same_origin and not is_model and generic_binary and content_length > max_capture_bytes - capture_bytes:
                        return
                    body = response.body()
                    if len(body) > max_capture_bytes - capture_bytes:
                        return
                    if body[:4] == b"glTF":
                        is_model = True
                        if not extension:
                            extension = ".glb"
                    # Authenticated fetch/XHR bodies can contain private profile,
                    # project, or API data. Persist only validated 3D payloads.
                    if args.interactive_login and request.resource_type in {"fetch", "xhr"} and not is_model:
                        return
                    if not same_origin and not is_model:
                        return
                    if extension == ".glb" and body[:4] != b"glTF":
                        return  # Reject mislabeled HTML/API responses.
                    if same_origin:
                        relative = Path(unquote(parsed.path).lstrip("/"))
                    else:
                        digest = hashlib.sha256(response.url.encode("utf-8")).hexdigest()[:20]
                        hostname = "".join(c for c in parsed.hostname or "" if c.isalnum() or c in ".-")
                        relative = Path("assets") / "external-models" / hostname / (digest + extension)
                    if (not relative.parts or any(part in {"..", "."} for part in relative.parts)
                            or relative.is_absolute()):
                        return
                    target = (capture_dir / relative).resolve()
                    if not target.is_relative_to(capture_dir.resolve()):
                        return
                    target.parent.mkdir(parents=True, exist_ok=True)
                    target.write_bytes(body)
                    seen_assets.add(identity)
                    capture_bytes += len(body)
                    capture_count += 1
                    record = {
                        "url": safe_url if args.interactive_login or not same_origin else response.url,
                        "path": relative.as_posix(),
                        "bytes": len(body),
                        "contentType": response.headers.get("content-type", ""),
                        "status": response.status,
                        "external": not same_origin,
                        "is3d": is_model,
                    }
                    runtime_assets.append(record)
                    if is_model:
                        model_assets.append(record)
                except Exception as error:
                    runtime_assets.append({"url": safe_url, "error": str(error)})

            # Playwright callbacks should only retain the completed Download
            # handle. Persist it after the event loop returns; calling
            # download.save_as() inside a sync callback can deadlock.
            page.on("download", lambda download: pending_downloads.append(download))
            page.on("response", capture_runtime_asset)

        page.on("requestfailed", lambda request: failed_requests.append({
            "url": report_url(request.url),
            "failure": request.failure,
        }))
        page.on("response", lambda response: http_errors.append({
            "url": report_url(response.url),
            "status": response.status,
        }) if response.status >= 400 else None)

        if scene_dir:
            def capture_spline_response(response):
                url = response.url
                is_scene = url.endswith("scene.splinecode")
                is_wasm = "modelling-wasm" in url and url.endswith(".wasm")
                if not (is_scene or is_wasm):
                    return
                try:
                    body = response.body()
                    name = (f"scene-{len(scene_files):02d}.splinecode" if is_scene
                            else f"modelling-{len(wasm_files):02d}.wasm")
                    target = scene_dir / name
                    target.write_bytes(body)
                    item = {"url": report_url(url), "path": str(target), "bytes": len(body), "status": response.status}
                    (scene_files if is_scene else wasm_files).append(item)
                except Exception as error:
                    (scene_files if is_scene else wasm_files).append({"url": report_url(url), "error": str(error)})

            page.on("response", capture_spline_response)
        response = page.goto(
            args.url,
            wait_until="domcontentloaded" if args.interactive_login else "networkidle",
            timeout=30000,
        )
        if args.interactive_login:
            # The user's own visible Chromium window handles credentials, 2FA and
            # protected navigation. No storage_state, cookies or passwords are saved.
            wait_for_login_continue(page, args.auth_continue_file, max(30, min(args.login_timeout, 1800)))
            try:
                page.wait_for_load_state("networkidle", timeout=15000)
            except Exception:
                pass  # Websocket/long-polling apps may never become network-idle.
            page.wait_for_timeout(1000)
        # Spline's canvas can finish loading after networkidle. Give its
        # runtime a short window to request .splinecode and WASM resources.
        if scene_dir:
            page.wait_for_timeout(5000)
        interaction_trace = []
        # Exercise the two browser signals most visual sites use for motion.
        # This trace is diagnostic data for future adapters; it does not
        # invent behavior when the source site does not expose one.
        for x, y in [(360, 260), (720, 500), (1080, 260)]:
            page.mouse.move(x, y)
            page.wait_for_timeout(150)
            interaction_trace.append({"type": "pointermove", "x": x, "y": y})
        document_height = page.evaluate("document.body.scrollHeight")
        scroll_positions = [0, min(600, max(0, document_height - 1000)), 0]
        for scroll_y in scroll_positions:
            page.evaluate("y => window.scrollTo(0, y)", scroll_y)
            page.wait_for_timeout(150)
            interaction_trace.append({"type": "scroll", "scrollY": scroll_y})
        # ActionForge's animation GLBs are fetched only after a clip is
        # selected. Sample one non-destructive clip so the clone captures the
        # real runtime asset as well as the initial mannequin and library.
        if not args.interactive_login and urlparse(args.url).hostname == "actionforge.app":
            try:
                page.evaluate("fetch('/assets/animation-library/icons/characters/mannequin.webp')")
                page.wait_for_timeout(500)
                interaction_trace.append({"type": "fetch", "target": "mannequin.webp"})
                page.get_by_text("Dance Loop", exact=True).first.click(timeout=2500)
                page.wait_for_timeout(1200)
                interaction_trace.append({"type": "click", "target": "Dance Loop"})
            except Exception as error:
                interaction_trace.append({"type": "click", "target": "Dance Loop", "error": str(error)})
        page.wait_for_timeout(300)
        for download in pending_downloads:
            try:
                record = capture_model_download(
                    download, capture_dir, report_url,
                    max_capture_bytes - capture_bytes,
                    asset_limit_reached=capture_count >= max_capture_assets,
                )
                if record:
                    capture_bytes += record["bytes"]
                    capture_count += 1
                    runtime_assets.append(record)
                    model_assets.append(record)
            except Exception as error:
                runtime_assets.append({"url": report_url(download.url), "error": str(error)})
        page.screenshot(path=str(screenshot_path), full_page=True)
        html_path.write_text(page.content(), encoding="utf-8")
        scene_hints = page.evaluate("""() => Array.from(document.querySelectorAll('canvas')).map(c => ({
          engine: c.dataset.engine || null,
          width: c.width,
          height: c.height,
          webglHint: /three|babylon|webgl|spline/i.test(c.dataset.engine || '')
        }))""")
        # A canvas is evidence of rendering, NOT proof that mesh export is possible.
        report = {
            "url": report_url(args.url),
            "title": page.title(),
            "status": response.status if response else None,
            "finalUrl": report_url(page.url),
            "viewport": {"width": 1440, "height": 1000},
            "links": page.locator("a").count(),
            "images": page.locator("img").count(),
            "screenshot": str(screenshot_path),
            "sceneFiles": scene_files,
            "wasmFiles": wasm_files,
            "runtimeAssets": runtime_assets,
            "modelAssets": model_assets,
            "canvasHints": scene_hints,
            "interactiveLogin": args.interactive_login,
            "runtimeAssetCount": capture_count,
            "runtimeAssetBytes": capture_bytes,
            "failedRequests": failed_requests,
            "httpErrors": http_errors,
            "interactionTrace": interaction_trace,
        }
        report_path.write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
        if runtime_report_path:
            runtime_report_path.parent.mkdir(parents=True, exist_ok=True)
            runtime_report_path.write_text(json.dumps({"assets": runtime_assets, "models": model_assets, "canvasHints": scene_hints, "count": capture_count, "bytes": capture_bytes, "failedRequests": failed_requests, "httpErrors": http_errors, "interactionTrace": interaction_trace}, indent=2) + "\n", encoding="utf-8")
        if scene_report_path:
            scene_report_path.parent.mkdir(parents=True, exist_ok=True)
            scene_report_path.write_text(json.dumps({"sceneFiles": scene_files, "wasmFiles": wasm_files}, indent=2) + "\n", encoding="utf-8")
        browser.close()


if __name__ == "__main__":
    main()
