#!/usr/bin/env python3
"""Capture the first-page hero as a local looping video."""

import argparse
import json
import shutil
import subprocess
import tempfile
import time
from pathlib import Path

from playwright.sync_api import sync_playwright


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--url', required=True)
    parser.add_argument('--output', required=True)
    parser.add_argument('--report', required=True)
    parser.add_argument('--duration', type=float, default=8.0)
    parser.add_argument('--fps', type=int, default=24)
    parser.add_argument('--width', type=int, default=1440)
    parser.add_argument('--height', type=int, default=1000)
    args = parser.parse_args()
    output = Path(args.output)
    report_path = Path(args.report)
    output.parent.mkdir(parents=True, exist_ok=True)
    report_path.parent.mkdir(parents=True, exist_ok=True)
    ffmpeg = shutil.which('ffmpeg')
    if not ffmpeg:
        raise RuntimeError('ffmpeg is required for motion capture')

    with tempfile.TemporaryDirectory(prefix='html-editor-motion-') as temp:
        frames = Path(temp) / 'frame-%06d.png'
        with sync_playwright() as playwright:
            browser = playwright.chromium.launch(
                executable_path='/usr/bin/chromium' if Path('/usr/bin/chromium').exists() else '/usr/bin/chromium-browser',
                headless=True,
                args=['--no-sandbox', '--disable-dev-shm-usage'],
            )
            page = browser.new_page(viewport={'width': args.width, 'height': args.height}, device_scale_factor=1)
            page.goto(args.url, wait_until='domcontentloaded', timeout=60000)
            page.wait_for_timeout(5000)
            hero = page.locator('main > section').first
            if not hero.count():
                raise RuntimeError('Could not find the first-page hero section')
            box = hero.bounding_box()
            if not box or box['width'] < 10 or box['height'] < 10:
                raise RuntimeError('Hero section has no measurable rendered area')
            clip = {
                'x': max(0, box['x']),
                'y': max(0, box['y']),
                'width': min(args.width, box['width']),
                'height': min(args.height, box['height']),
            }
            frame_count = max(1, int(args.duration * args.fps))
            interval = 1.0 / args.fps
            for index in range(frame_count):
                page.screenshot(path=str(Path(temp) / f'frame-{index + 1:06d}.png'), clip=clip)
                time.sleep(interval)
            browser.close()
        subprocess.run([
            ffmpeg, '-y', '-hide_banner', '-loglevel', 'error',
            '-framerate', str(args.fps), '-i', str(frames),
            '-vf', 'scale=trunc(iw/2)*2:trunc(ih/2)*2',
            '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-movflags', '+faststart',
            str(output),
        ], check=True)
    report_path.write_text(json.dumps({
        'url': args.url,
        'duration': args.duration,
        'fps': args.fps,
        'output': str(output),
        'status': 'completed',
    }, indent=2) + '\n', encoding='utf8')
    print(json.dumps({'output': str(output), 'duration': args.duration, 'fps': args.fps}))


if __name__ == '__main__':
    main()
