#!/usr/bin/env python3
"""Capture a rendered website with Playwright for the local HTML editor worker."""

import argparse
import json
import os
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
        if scene_dir:
            scene_dir.mkdir(parents=True, exist_ok=True)

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
            "interactionTrace": interaction_trace,
        }
        report_path.write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
        if scene_report_path:
            scene_report_path.parent.mkdir(parents=True, exist_ok=True)
            scene_report_path.write_text(json.dumps({"sceneFiles": scene_files, "wasmFiles": wasm_files}, indent=2) + "\n", encoding="utf-8")
        browser.close()


if __name__ == "__main__":
    main()
