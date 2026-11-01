#!/usr/bin/env python3
"""Capture a rendered website with Playwright for the local HTML editor worker."""

import argparse
import json
import os
from urllib.parse import unquote, urlparse
from pathlib import Path

from playwright.sync_api import sync_playwright


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
    args = parser.parse_args()

    html_path = Path(args.html)
    screenshot_path = Path(args.screenshot)
    report_path = Path(args.report)
    html_path.parent.mkdir(parents=True, exist_ok=True)
    screenshot_path.parent.mkdir(parents=True, exist_ok=True)
    report_path.parent.mkdir(parents=True, exist_ok=True)

    chromium_path = os.environ.get("HTML_EDITOR_CHROMIUM_PATH")
    launch_options = {"headless": True, "args": ["--no-sandbox", "--disable-dev-shm-usage"]}
    if chromium_path:
        launch_options["executable_path"] = chromium_path

    with sync_playwright() as playwright:
        browser = playwright.chromium.launch(**launch_options)
        page = browser.new_page(viewport={"width": 1440, "height": 1000}, device_scale_factor=1)
        scene_dir = Path(args.scene_dir) if args.scene_dir else None
        scene_report_path = Path(args.scene_report) if args.scene_report else None
        scene_files = []
        wasm_files = []
        runtime_assets = []
        failed_requests = []
        http_errors = []
        capture_dir = Path(args.capture_assets_dir) if args.capture_assets_dir else None
        runtime_report_path = Path(args.runtime_assets_report) if args.runtime_assets_report else None
        capture_origin = urlparse(args.url).netloc
        capture_bytes = 0
        capture_count = 0
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
                if (response.status != 200 or parsed.netloc != capture_origin or
                        request.resource_type in {"document", "websocket", "eventsource"} or
                        capture_count >= max_capture_assets or capture_bytes >= max_capture_bytes):
                    return
                try:
                    body = response.body()
                    if len(body) > max_capture_bytes - capture_bytes:
                        return
                    relative = Path(unquote(parsed.path).lstrip("/"))
                    if not relative.parts or any(part in {"..", "."} for part in relative.parts):
                        return
                    target = (capture_dir / relative).resolve()
                    if not target.is_relative_to(capture_dir.resolve()):
                        return
                    target.parent.mkdir(parents=True, exist_ok=True)
                    target.write_bytes(body)
                    capture_bytes += len(body)
                    capture_count += 1
                    runtime_assets.append({
                        "url": response.url,
                        "path": relative.as_posix(),
                        "bytes": len(body),
                        "contentType": response.headers.get("content-type", ""),
                        "status": response.status,
                    })
                except Exception as error:
                    runtime_assets.append({"url": response.url, "error": str(error)})

            page.on("response", capture_runtime_asset)

        page.on("requestfailed", lambda request: failed_requests.append({
            "url": request.url,
            "failure": request.failure,
        }))
        page.on("response", lambda response: http_errors.append({
            "url": response.url,
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
                    item = {"url": url, "path": str(target), "bytes": len(body), "status": response.status}
                    (scene_files if is_scene else wasm_files).append(item)
                except Exception as error:
                    (scene_files if is_scene else wasm_files).append({"url": url, "error": str(error)})

            page.on("response", capture_spline_response)
        response = page.goto(args.url, wait_until="networkidle", timeout=30000)
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
        if urlparse(args.url).hostname == "actionforge.app":
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
        page.screenshot(path=str(screenshot_path), full_page=True)
        html_path.write_text(page.content(), encoding="utf-8")
        report = {
            "url": args.url,
            "title": page.title(),
            "status": response.status if response else None,
            "finalUrl": page.url,
            "viewport": {"width": 1440, "height": 1000},
            "links": page.locator("a").count(),
            "images": page.locator("img").count(),
            "screenshot": str(screenshot_path),
            "sceneFiles": scene_files,
            "wasmFiles": wasm_files,
            "runtimeAssets": runtime_assets,
            "runtimeAssetCount": capture_count,
            "runtimeAssetBytes": capture_bytes,
            "failedRequests": failed_requests,
            "httpErrors": http_errors,
            "interactionTrace": interaction_trace,
        }
        report_path.write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
        if runtime_report_path:
            runtime_report_path.parent.mkdir(parents=True, exist_ok=True)
            runtime_report_path.write_text(json.dumps({"assets": runtime_assets, "count": capture_count, "bytes": capture_bytes, "failedRequests": failed_requests, "httpErrors": http_errors, "interactionTrace": interaction_trace}, indent=2) + "\n", encoding="utf-8")
        if scene_report_path:
            scene_report_path.parent.mkdir(parents=True, exist_ok=True)
            scene_report_path.write_text(json.dumps({"sceneFiles": scene_files, "wasmFiles": wasm_files}, indent=2) + "\n", encoding="utf-8")
        browser.close()


if __name__ == "__main__":
    main()
