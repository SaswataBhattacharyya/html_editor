import test from 'node:test';
import assert from 'node:assert/strict';
import { safePackageRelativePath, safePackageUrlPath } from '../tools/package-path.mjs';

test('reserves the preview page path and its descendants for resources', () => {
    for (const url of [
        new URL('https://example.test/index.html'),
        new URL('https://example.test/index.html/'),
        new URL('https://example.test/index.html/nested/model.glb')
    ]) {
        assert.match(safePackageUrlPath(url), /^assets\/captured\//);
    }
});

test('keeps safe asset paths and aliases reserved runtime capture paths', () => {
    assert.equal(safePackageUrlPath(new URL('https://example.test/assets/app.js')), 'assets/app.js');
    assert.match(safePackageRelativePath('index.html/nested.js', 'https://example.test/index.html/nested.js'), /^assets\/captured\//);
    assert.match(safePackageRelativePath('manifest.json', 'https://example.test/manifest.json'), /^assets\/captured\//);
});

test('rejects paths that escape the package root', () => {
    assert.throws(() => safePackageRelativePath('../outside.js'), /escapes the clone package/);
});
