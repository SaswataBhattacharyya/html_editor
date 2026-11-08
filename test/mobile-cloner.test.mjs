import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { validPackageName, packageFromPlayUrl, runCommand } from '../services/android-device.mjs';
import { parseHierarchy, buildScreenSpec, generateStarter, safeLabel } from '../services/mobile-generator.mjs';

test('Google Play links resolve package names and reject unrelated URLs', () => {
    assert.equal(packageFromPlayUrl('https://play.google.com/store/apps/details?id=com.hevy&hl=en'), 'com.hevy');
    assert.equal(validPackageName('com.hevy'), true);
    assert.equal(validPackageName('bad;rm -rf /'), false);
    assert.throws(() => packageFromPlayUrl('https://evil.example/store/apps/details?id=com.hevy'));
    assert.throws(() => packageFromPlayUrl('file:///tmp/sample.apk'));
});

test('accessibility parsing extracts labels and suppresses editable values', () => {
    const xml = '<hierarchy><node text="Start workout" class="android.widget.Button" clickable="true" bounds="[1,2][3,4]"/>'
        + '<node text="private@example.com" resource-id="com.app:id/email" class="android.widget.EditText" clickable="true"/>'
        + '<node text="Workout" content-desc="Home" class="android.view.View" clickable="false"/></hierarchy>';
    const nodes = parseHierarchy(xml);
    assert.equal(nodes.length, 3);
    assert.equal(nodes[0].text, 'Start workout');
    assert.equal(nodes[0].clickable, true);
    assert.equal(nodes[1].text, '');
    assert.equal(nodes[2].description, 'Home');
});

test('screen specs use observed actions without inventing routes', () => {
    const spec = buildScreenSpec([
        { label: 'Workout', screenshot: '/img.png', createdAt: '2026-01-01',
            nodes: [{ clickable: true, text: 'Start workout' }, { clickable: true, text: 'Delete account' }] }
    ], 'My Test App');
    assert.equal(spec.appName, 'My Test App');
    assert.deepEqual(spec.screens[0].buttons, ['Start workout']);
    assert.equal(spec.screens[0].id, 'screen-1');
    assert.equal(safeLabel('<Hi>\n'), 'Hi');
});

test('Expo scaffold creates editable source and spec without a device', async t => {
    const folder = await fs.mkdtemp(path.join(os.tmpdir(), 'mobile-cloner-test-'));
    t.after(async () => fs.rm(folder, { recursive: true, force: true }));
    const spec = buildScreenSpec([{ label: 'Home', screenshot: '/shot.png', nodes: [] }], 'Demo');
    const output = await generateStarter(folder, spec);
    const app = await fs.readFile(path.join(output, 'App.js'), 'utf8');
    const pkg = JSON.parse(await fs.readFile(path.join(output, 'package.json'), 'utf8'));
    assert.match(app, /Home/);
    assert.match(app, /screens\.find/);
    assert.ok(pkg.dependencies.expo);
    assert.equal((await fs.readFile(path.join(output, 'screens.json'), 'utf8')).includes('Home'), true);
});

test('command runner collects subprocess output without shell expansion', async () => {
    const result = await runCommand(process.execPath, ['-e', 'process.stdout.write("ok")']);
    assert.equal(result.stdout.toString('utf8'), 'ok');
});
