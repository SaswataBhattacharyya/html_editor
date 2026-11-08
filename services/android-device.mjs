import { spawn } from 'node:child_process';
import fs from 'node:fs/promises';

const ADB = process.env.ANDROID_ADB_PATH || 'adb';
const EMULATOR = process.env.ANDROID_EMULATOR_PATH || 'emulator';
const SERIAL_PATTERN = /^[a-zA-Z0-9._:-]{1,120}$/;
const PACKAGE_PATTERN = /^[a-zA-Z][a-zA-Z0-9_]*(?:\.[a-zA-Z][a-zA-Z0-9_]*)+$/;

export function validPackageName(value) {
    return typeof value === 'string' && PACKAGE_PATTERN.test(value) && value.length < 220;
}

export function packageFromPlayUrl(value) {
    const url = new URL(value);
    if (!['play.google.com', 'market.android.com'].includes(url.hostname) || !url.pathname.startsWith('/store/apps/details')) {
        throw new Error('Enter a Google Play app details URL.');
    }
    const id = url.searchParams.get('id');
    if (!validPackageName(id)) throw new Error('Google Play URL has no valid package id.');
    return id;
}

// Every device command is an argument-vector invocation; never pass user input to a shell.
export function runCommand(executable, args = [], options = {}) {
    const { timeoutMs = 30000, maxBytes = 12 * 1024 * 1024, input, cwd } = options;
    return new Promise((resolve, reject) => {
        const child = spawn(executable, args, { shell: false, stdio: ['pipe', 'pipe', 'pipe'], cwd, windowsHide: true });
        const stdout = [];
        const stderr = [];
        let outSize = 0;
        let errSize = 0;
        let settled = false;
        const fail = (error) => {
            if (settled) return;
            settled = true;
            clearTimeout(timer);
            child.kill('SIGKILL');
            reject(error);
        };
        const timer = setTimeout(() => fail(new Error(executable + ' timed out')), timeoutMs);
        child.on('error', (error) => fail(new Error(executable + ': ' + error.message)));
        child.stdout.on('data', (buffer) => {
            outSize += buffer.length;
            if (outSize > maxBytes) return fail(new Error(executable + ' exceeded output limit'));
            stdout.push(buffer);
        });
        child.stderr.on('data', (buffer) => {
            errSize += buffer.length;
            if (errSize > 100000) return fail(new Error(executable + ' error output limit exceeded'));
            stderr.push(buffer);
        });
        child.on('close', (code) => {
            if (settled) return;
            settled = true;
            clearTimeout(timer);
            const out = Buffer.concat(stdout);
            const err = Buffer.concat(stderr).toString('utf8');
            if (code !== 0) return reject(new Error(executable + ' exited ' + code + ': ' + err.slice(0, 1000)));
            resolve({ stdout: out, stderr: err });
        });
        child.stdin.on('error', () => {});
        if (input) child.stdin.end(input);
        else child.stdin.end();
    });
}

export async function capabilities() {
    const probes = [
        ['adb', ADB, ['version']],
        ['emulator', EMULATOR, ['-list-avds']],
        ['jadx', process.env.JADX_PATH || 'jadx', ['--version']],
        ['apktool', process.env.APKTOOL_PATH || 'apktool', ['--version']],
        ['aapt', process.env.AAPT_PATH || 'aapt', ['version']],
        ['java', 'java', ['-version']]
    ];
    return Object.fromEntries(await Promise.all(probes.map(async ([name, bin, args]) => {
        try {
            await runCommand(bin, args, { timeoutMs: 4500, maxBytes: 512000 });
            return [name, { available: true }];
        } catch (error) { return [name, { available: false, reason: error.message }]; }
    })));
}

export async function listDevices() {
    const { stdout } = await runCommand(ADB, ['devices', '-l']);
    return stdout.toString('utf8').split(/\r?\n/).slice(1)
        .map(line => line.trim()).filter(Boolean)
        .map(line => {
            const match = /^(\S+)\s+(device|offline|unauthorized|recovery|sideload)(?:\s|$)/.exec(line);
            return match ? { serial: match[1], state: match[2], detail: line } : null;
        }).filter(Boolean);
}

export async function resolveSerial(requested) {
    const devices = (await listDevices()).filter(device => device.state === 'device');
    if (requested) {
        if (!SERIAL_PATTERN.test(requested)) throw new Error('Invalid Android device serial');
        if (!devices.some(device => device.serial === requested)) throw new Error('Selected Android device is not connected and authorized');
        return requested;
    }
    if (devices.length !== 1) throw new Error('Connect exactly one Android device, or select a serial from the device list');
    return devices[0].serial;
}

export async function adb(args, serial, options) {
    const id = await resolveSerial(serial);
    return runCommand(ADB, ['-s', id, ...args], options);
}

export async function listAvds() {
    const { stdout } = await runCommand(EMULATOR, ['-list-avds'], { timeoutMs: 10000 });
    return stdout.toString('utf8').split(/\r?\n/).map(value => value.trim()).filter(Boolean);
}

export async function startAvd(name) {
    const choices = await listAvds();
    if (!choices.includes(name)) throw new Error('AVD not found. Create a Google Play-enabled AVD in Android Studio first.');
    return new Promise((resolve, reject) => {
        const child = spawn(EMULATOR, ['-avd', name], {
            detached: true, shell: false, stdio: 'ignore', windowsHide: true
        });
        child.once('error', error => reject(new Error('Could not start emulator: ' + error.message)));
        child.once('spawn', () => {
            child.unref();
            resolve({ started: true, avd: name, note: 'Emulator process started. Wait for Android to boot, then refresh devices.' });
        });
    });
}

export async function openPlayListing(playUrl, serial) {
    const pkg = packageFromPlayUrl(playUrl);
    const safeUrl = 'https://play.google.com/store/apps/details?id=' + encodeURIComponent(pkg);
    await adb(['shell', 'am', 'start', '-a', 'android.intent.action.VIEW', '-d', safeUrl], serial);
    return { packageName: pkg, note: 'Complete Google Play installation manually in the device, then verify it in this workbench.' };
}

export async function installed(packageName, serial) {
    if (!validPackageName(packageName)) throw new Error('Invalid package id');
    const { stdout } = await adb(['shell', 'pm', 'path', packageName], serial);
    return stdout.toString('utf8').includes('package:');
}

export async function installApk(apkFile, serial) {
    await fs.access(apkFile);
    const { stdout } = await adb(['install', '-r', apkFile], serial, { timeoutMs: 180000, maxBytes: 1000000 });
    return stdout.toString('utf8').trim();
}

export async function launchApp(packageName, serial) {
    if (!validPackageName(packageName)) throw new Error('Valid Android package name is required to launch the app');
    await adb(['shell', 'monkey', '-p', packageName, '-c', 'android.intent.category.LAUNCHER', '1'], serial);
}

export async function captureScreen(serial) {
    const { stdout } = await adb(['exec-out', 'screencap', '-p'], serial, { maxBytes: 32 * 1024 * 1024, timeoutMs: 45000 });
    if (!stdout.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))) {
        throw new Error('ADB did not return a PNG screenshot');
    }
    return stdout;
}

export async function captureAccessibility(serial) {
    await adb(['shell', 'uiautomator', 'dump', '/sdcard/html_editor_ui.xml'], serial, { timeoutMs: 20000 });
    let xml;
    try {
        const { stdout } = await adb(['exec-out', 'cat', '/sdcard/html_editor_ui.xml'], serial);
        xml = stdout.toString('utf8');
    } finally {
        await adb(['shell', 'rm', '/sdcard/html_editor_ui.xml'], serial).catch(() => {});
    }
    if (!xml?.includes('<hierarchy')) throw new Error('Android accessibility hierarchy was unavailable');
    return xml;
}

export async function interact(action, serial) {
    if (action.type === 'back') {
        await adb(['shell', 'input', 'keyevent', 'KEYCODE_BACK'], serial);
    } else if (action.type === 'home') {
        await adb(['shell', 'input', 'keyevent', 'KEYCODE_HOME'], serial);
    } else if (action.type === 'tap') {
        const x = Number(action.x);
        const y = Number(action.y);
        if (![x, y].every(value => Number.isInteger(value) && value >= 0 && value <= 10000)) throw new Error('Invalid tap coordinates');
        await adb(['shell', 'input', 'tap', String(x), String(y)], serial);
    } else if (action.type === 'swipe') {
        const fields = [action.x1, action.y1, action.x2, action.y2].map(Number);
        if (!fields.every(value => Number.isInteger(value) && value >= 0 && value <= 10000)) throw new Error('Invalid swipe coordinates');
        await adb(['shell', 'input', 'swipe', ...fields.map(String), '450'], serial);
    } else {
        throw new Error('Supported actions: tap, swipe, back, home');
    }
    return { ok: true };
}
