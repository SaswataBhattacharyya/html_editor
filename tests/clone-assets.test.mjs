import test from 'node:test';
import assert from 'node:assert/strict';
import { extractAssetReferences } from '../tools/clone-assets.mjs';

test('asset extraction ignores navigation links but keeps browser resources', () => {
    const html = `<!doctype html>
      <a href="/integrations">Integrations</a>
      <a href="/?model-tab=image-to-3d">Image to 3D</a>
      <link rel="canonical" href="https://example.test/page">
      <link rel="stylesheet" href="/styles/app.css">
      <link rel="modulepreload" href="/scripts/vendor.js">
      <script type="module" src="/scripts/main.js"></script>
      <img src="/images/hero.webp" srcset="/images/hero-sm.webp 480w, /images/hero-lg.webp 1200w">
      <video poster="/images/poster.jpg"><source src="/media/demo.mp4"></video>
      <div style="background-image:url('/images/panel.png')"></div>`;
    const refs = extractAssetReferences(html, 'https://example.test/workspace');
    const paths = refs.map(({ url }) => url.pathname + url.search);
    assert.deepEqual(paths, [
        '/styles/app.css', '/scripts/vendor.js', '/scripts/main.js',
        '/images/hero.webp', '/images/hero-sm.webp', '/images/hero-lg.webp',
        '/images/poster.jpg', '/media/demo.mp4', '/images/panel.png'
    ]);
});

test('extensionless workspace routes are not mistaken for resource assets', () => {
    const refs = extractAssetReferences('<a href="/workspace?model-tab=image-to-3d">workspace</a><script src="/assets/app.js"></script>', 'https://www.meshy.ai/workspace');
    assert.deepEqual(refs.map((item) => item.url.pathname), ['/assets/app.js']);
});
