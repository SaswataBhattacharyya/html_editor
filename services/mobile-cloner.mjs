import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import https from 'node:https';
import dns from 'node:dns';
import net from 'node:net';
import { capabilities, listDevices, listAvds, startAvd, openPlayListing, installed,
    installApk, launchApp, captureScreen, captureAccessibility, interact,
    packageFromPlayUrl, validPackageName, resolveSerial, runCommand } from './android-device.mjs';
import { parseHierarchy, buildScreenSpec, generateStarter, safeLabel } from './mobile-generator.mjs';
import { requestMobileCode, saveModelCode } from './mobile-ai.mjs';

const MAX_APK_BYTES = 250 * 1024 * 1024;
const MAX_CAPTURES = 80;
const now = () => new Date().toISOString();
const simpleError = (error) => String(error?.message || error).slice(0, 1100);
const stateFile = dir => path.join(dir, 'mobile', 'state.json');
const mobileDir = dir => path.join(dir, 'mobile');
const apkFile = dir => path.join(dir, 'mobile', 'source.apk');

async function ensureMobile(dir) {
    for (const name of ['captures', 'analysis', 'generated']) await fs.mkdir(path.join(mobileDir(dir), name), { recursive: true });
}

async function readState(dir) {
    try { return JSON.parse(await fs.readFile(stateFile(dir), 'utf8')); }
    catch (error) { if (error.code === 'ENOENT') return { phase: 'not-started', captures: [] }; throw error; }
}

async function writeState(dir, patch) {
    await ensureMobile(dir);
    const previous = await readState(dir);
    const next = { ...previous, ...patch, updatedAt: now() };
    await fs.writeFile(stateFile(dir), JSON.stringify(next, null, 2) + '\n', { mode: 0o600 });
    return next;
}

async function readBody(request, max = 65536) {
    const buffers = [];
    let size = 0;
    for await (const chunk of request) {
        size += chunk.length;
        if (size > max) throw new Error('Request body is too large');
        buffers.push(chunk);
    }
    const value = JSON.parse(Buffer.concat(buffers).toString('utf8') || '{}');
    if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('Expected a JSON object');
    return value;
}

async function saveApkStream(stream, dest) {
    const temp = dest + '.part-' + crypto.randomBytes(4).toString('hex');
    const handle = await fs.open(temp, 'wx', 0o600);
    let size = 0;
    const hash = crypto.createHash('sha256');
    let magic = Buffer.alloc(0);
    try {
        for await (const chunk of stream) {
            size += chunk.length;
            if (size > MAX_APK_BYTES) throw new Error('APK exceeds 250 MiB limit');
            if (magic.length < 4) magic = Buffer.concat([magic, chunk]).subarray(0, 4);
            hash.update(chunk);
            await handle.writeFile(chunk);
        }
        if (size < 100 || !magic.equals(Buffer.from([0x50, 0x4b, 0x03, 0x04])))
            throw new Error('File is not a standard standalone APK ZIP');
        await handle.close();
        await fs.rename(temp, dest);
        return { bytes: size, sha256: hash.digest('hex') };
    } catch (error) {
        await handle.close().catch(() => {});
        await fs.rm(temp, { force: true });
        throw error;
    }
}

function isPublicIp(value) {
    if (net.isIP(value) === 4) {
        const parts = value.split('.').map(Number);
        const [a, b] = parts;
        return !(a === 0 || a === 10 || a === 127 || a >= 224
            || (a === 169 && b === 254) || (a === 172 && b >= 16 && b <= 31)
            || (a === 192 && (b === 168 || (b === 0 && parts[2] === 0)))
            || (a === 100 && b >= 64 && b <= 127) || (a === 198 && (b === 18 || b === 19)));
    }
    if (net.isIP(value) === 6) {
        const v = value.toLowerCase();
        return !(v === '::1' || v === '::' || v.startsWith('fc') || v.startsWith('fd')
            || v.startsWith('fe8') || v.startsWith('fe9') || v.startsWith('fea')
            || v.startsWith('feb') || v.startsWith('::ffff:'));
    }
    return false;
}

function downloadApk(urlString, dest) {
    const url = new URL(urlString);
    if (url.protocol !== 'https:' || !url.hostname || url.username || url.password || url.port ||
        (net.isIP(url.hostname) && !isPublicIp(url.hostname)))
        throw new Error('Only direct, public HTTPS APK links without credentials or custom ports are supported');
    return new Promise((resolve, reject) => {
        let responseReceived = false;
        const request = https.get(url, {
            timeout: 45000,
            headers: { 'user-agent': 'html-editor-mobile-cloner/0.1', accept: 'application/vnd.android.package-archive,application/octet-stream' },
            lookup(hostname, options, callback) {
                dns.lookup(hostname, { all: true }, (error, results) => {
                    if (error) return callback(error);
                    if (!results.length || results.some(item => !isPublicIp(item.address)))
                        return callback(new Error('Private or reserved APK host is blocked'));
                    callback(null, results[0].address, results[0].family);
                });
            }
        }, async response => {
            responseReceived = true;
            if (response.statusCode !== 200) {
                response.resume();
                reject(new Error('APK download returned HTTP ' + response.statusCode + ' (redirects are not followed)'));
                return;
            }
            if (Number(response.headers['content-length'] || 0) > MAX_APK_BYTES) {
                response.destroy();
                reject(new Error('APK download is too large'));
                return;
            }
            try { resolve(await saveApkStream(response, dest)); }
            catch (error) { reject(error); }
        });
        request.on('timeout', () => request.destroy(new Error('APK download timed out')));
        request.on('error', error => { if (!responseReceived) reject(error); else reject(error); });
    });
}

async function maybeApkMetadata(dir) {
    try {
        const result = await runCommand(process.env.AAPT_PATH || 'aapt', ['dump', 'badging', apkFile(dir)], { timeoutMs: 25000, maxBytes: 1024 * 1024 });
        const text = result.stdout.toString('utf8');
        const match = /package: name='([^']+)' versionCode='([^']*)' versionName='([^']*)'/.exec(text);
        const activity = /launchable-activity: name='([^']+)'/.exec(text);
        return { available: true, packageName: match?.[1] || null, versionCode: match?.[2] || null,
            versionName: match?.[3] || null, launchableActivity: activity?.[1] || null };
    } catch (error) { return { available: false, reason: simpleError(error) }; }
}

async function getProjectData(dir, projectId) {
    const state = await readState(dir);
    return { state, captures: (state.captures || []).map(capture => ({
        id: capture.id, label: capture.label, screenshot: capture.screenshot,
        createdAt: capture.createdAt, elements: capture.nodes?.length || 0
    })), generatedUrl: state.generatedAt ? '/projects/' + projectId + '/mobile/generated/expo-starter/App.js' : null };
}

async function capture(dir, projectId, serial, label) {
    const state = await readState(dir);
    if ((state.captures || []).length >= MAX_CAPTURES) throw new Error('This project reached the 80 capture limit');
    const id = Date.now() + '-' + crypto.randomBytes(3).toString('hex');
    const shotPath = path.join(mobileDir(dir), 'captures', id + '.png');
    const image = await captureScreen(serial);
    let nodes = [];
    let hierarchyWarning = null;
    try { nodes = parseHierarchy(await captureAccessibility(serial)); }
    catch (error) { hierarchyWarning = simpleError(error); }
    await fs.writeFile(shotPath, image, { mode: 0o600 });
    const item = {
        id, label: safeLabel(label || 'Screen ' + ((state.captures || []).length + 1)),
        screenshot: '/projects/' + projectId + '/mobile/captures/' + id + '.png',
        createdAt: now(), serial: await resolveSerial(serial), nodes, hierarchyWarning
    };
    await fs.writeFile(path.join(mobileDir(dir), 'captures', id + '.json'), JSON.stringify(item, null, 2) + '\n', { mode: 0o600 });
    const next = await writeState(dir, { captures: [...(state.captures || []), item], phase: 'capturing' });
    return { capture: item, state: next };
}

async function analyze(dir, projectName) {
    const state = await readState(dir);
    const spec = buildScreenSpec(state.captures || [], projectName);
    if (!spec.screens.length) throw new Error('Capture an app screen first');
    await fs.writeFile(path.join(mobileDir(dir), 'analysis', 'screen-spec.json'), JSON.stringify(spec, null, 2) + '\n', { mode: 0o600 });
    return { state: await writeState(dir, { analyzedAt: now(), phase: 'analyzed' }), spec };
}

async function reportApk(dir) {
    try { await fs.access(apkFile(dir)); }
    catch { throw new Error('Upload an APK before inspecting it'); }
    const metadata = await maybeApkMetadata(dir);
    await fs.writeFile(path.join(mobileDir(dir), 'analysis', 'apk-report.json'), JSON.stringify(metadata, null, 2) + '\n', { mode: 0o600 });
    const state = await readState(dir);
    const next = await writeState(dir, { apkMetadata: metadata, packageName: metadata.packageName || state.packageName, apkInspectedAt: now() });
    return { state: next, metadata };
}

export async function handleMobileApi(request, response, segments, context) {
    const { sendJson, projectPath, readProject } = context;
    const method = request.method;
    const rootMobile = segments[0] === 'api' && segments[1] === 'mobile';
    const projectMobile = segments[0] === 'api' && segments[1] === 'projects' && segments[2] && segments[3] === 'mobile';
    if (!rootMobile && !projectMobile) return false;

    try {
        if (rootMobile) {
            if (segments.length === 3 && segments[2] === 'capabilities' && method === 'GET') sendJson(response, 200, { capabilities: await capabilities() });
            else if (segments.length === 3 && segments[2] === 'devices' && method === 'GET') sendJson(response, 200, { devices: await listDevices() });
            else if (segments.length === 3 && segments[2] === 'avds' && method === 'GET') sendJson(response, 200, { avds: await listAvds() });
            else if (segments.length === 4 && segments[2] === 'avds' && segments[3] === 'start' && method === 'POST')
                sendJson(response, 202, await startAvd((await readBody(request)).name));
            else sendJson(response, 404, { error: 'Unknown mobile endpoint' });
            return true;
        }
        const projectId = segments[2];
        const project = await readProject(projectId);
        if (!project) { sendJson(response, 404, { error: 'Project not found' }); return true; }
        const dir = projectPath(projectId);
        await ensureMobile(dir);
        const operation = segments[4] || '';
        if (!operation && method === 'GET') {
            sendJson(response, 200, await getProjectData(dir, projectId));
        } else if (operation === 'start' && method === 'POST') {
            const body = await readBody(request);
            if (!['play', 'apk'].includes(body.sourceType)) throw new Error('Select Play Store or APK mode');
            const packageName = body.sourceType === 'play' ? packageFromPlayUrl(body.playUrl) : (body.packageName || null);
            if (packageName && !validPackageName(packageName)) throw new Error('Invalid package name');
            const previous = await readState(dir);
            if (previous.packageName && packageName && previous.packageName !== packageName)
                throw new Error('This project is already linked to another app; create a new project');
            sendJson(response, 200, { state: await writeState(dir, { sourceType: body.sourceType, packageName,
                playUrl: body.sourceType === 'play' ? body.playUrl : null, phase: 'prepared' }) });
        } else if (operation === 'apk' && method === 'POST') {
            if (!['application/vnd.android.package-archive', 'application/octet-stream'].includes((request.headers['content-type'] || '').split(';')[0]))
                throw new Error('Upload a raw APK binary, not JSON or multipart form data');
            if (Number(request.headers['content-length'] || 0) > MAX_APK_BYTES) throw new Error('APK exceeds 250 MiB limit');
            const result = await saveApkStream(request, apkFile(dir));
            const state = await writeState(dir, { sourceType: 'apk', apk: result, phase: 'apk-ready' });
            sendJson(response, 201, { state, apk: result });
        } else if (operation === 'apk-url' && method === 'POST') {
            const body = await readBody(request);
            const result = await downloadApk(body.url, apkFile(dir));
            sendJson(response, 201, { state: await writeState(dir, { sourceType: 'apk', apk: result, phase: 'apk-ready' }), apk: result });
        } else if (operation === 'inspect' && method === 'POST') {
            sendJson(response, 200, await reportApk(dir));
        } else if (operation === 'open-play' && method === 'POST') {
            const body = await readBody(request);
            const state = await readState(dir);
            const result = await openPlayListing(state.playUrl, body.serial);
            sendJson(response, 200, { result, state: await writeState(dir, { serial: await resolveSerial(body.serial), phase: 'install-manually' }) });
        } else if (operation === 'install' && method === 'POST') {
            const body = await readBody(request);
            const result = await installApk(apkFile(dir), body.serial);
            sendJson(response, 200, { result, state: await writeState(dir, { serial: await resolveSerial(body.serial), phase: 'installed' }) });
        } else if (operation === 'verify' && method === 'POST') {
            const body = await readBody(request);
            const state = await readState(dir);
            const packageName = body.packageName || state.packageName;
            if (!validPackageName(packageName)) throw new Error('Enter an app package name first or inspect the APK');
            const isInstalled = await installed(packageName, body.serial);
            sendJson(response, 200, { installed: isInstalled,
                state: await writeState(dir, { packageName, serial: await resolveSerial(body.serial), phase: isInstalled ? 'installed' : 'install-manually' }) });
        } else if (operation === 'launch' && method === 'POST') {
            const body = await readBody(request);
            const state = await readState(dir);
            await launchApp(state.packageName, body.serial);
            sendJson(response, 200, { state: await writeState(dir, { serial: await resolveSerial(body.serial), phase: 'login-manual' }) });
        } else if (operation === 'resume' && method === 'POST') {
            sendJson(response, 200, { state: await writeState(dir, { phase: 'ready-to-capture' }) });
        } else if (operation === 'pause' && method === 'POST') {
            sendJson(response, 200, { state: await writeState(dir, { phase: 'login-manual' }) });
        } else if (operation === 'control' && method === 'POST') {
            const body = await readBody(request);
            await interact(body, body.serial);
            sendJson(response, 200, { ok: true });
        } else if (operation === 'capture' && method === 'POST') {
            const body = await readBody(request);
            const state = await readState(dir);
            if (state.phase === 'login-manual') throw new Error('Complete login and click Resume before capturing.');
            sendJson(response, 201, await capture(dir, projectId, body.serial, body.label));
        } else if (operation === 'analyze' && method === 'POST') {
            sendJson(response, 200, await analyze(dir, project.name));
        } else if (operation === 'generate-ai' && method === 'POST') {
            const body = await readBody(request, 12000);
            const { spec } = await analyze(dir, project.name);
            const model = await requestMobileCode(spec, body);
            await generateStarter(dir, spec);
            await saveModelCode(dir, model);
            sendJson(response, 201, { state: await writeState(dir, { generatedAt: now(), phase: 'model-draft-generated', model: model.model }),
                filesUrl: '/projects/' + projectId + '/mobile/generated/expo-starter/App.js',
                note: 'Unverified model-generated source. Review and build locally before execution.' });
        } else if (operation === 'generate' && method === 'POST') {
            const { spec } = await analyze(dir, project.name);
            await generateStarter(dir, spec);
            sendJson(response, 201, { state: await writeState(dir, { generatedAt: now(), phase: 'starter-generated' }),
                filesUrl: '/projects/' + projectId + '/mobile/generated/expo-starter/App.js',
                note: 'Generated a React Native screen starter; it is not a full clone or built APK.' });
        } else sendJson(response, 404, { error: 'Unknown mobile project operation' });
    } catch (error) {
        sendJson(response, 400, { error: simpleError(error) });
    }
    return true;
}
