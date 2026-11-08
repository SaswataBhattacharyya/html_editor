// Mobile App Cloner UI. Intentionally does not automate account sign-in or destructive navigation.
const el = id => document.getElementById(id);
const msg = (text, error = false) => {
    const output = el('mobile-status');
    if (!output) return;
    output.textContent = text;
    output.classList.toggle('error', error);
};
const currentProject = () => window.workbenchProject?.id;
const endpoint = suffix => {
    const id = currentProject();
    if (!id) throw new Error('Create or select a project using the Project button first.');
    return '/api/projects/' + encodeURIComponent(id) + '/mobile' + (suffix ? '/' + suffix : '');
};
async function json(url, options) {
    const response = await fetch(url, options);
    let result;
    try { result = await response.json(); } catch { throw new Error('Server did not return JSON (' + response.status + ')'); }
    if (!response.ok) throw new Error(result.error || 'HTTP ' + response.status);
    return result;
}
const body = value => ({ method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(value) });

async function task(description, action) {
    msg(description + '…');
    try {
        const result = await action();
        msg(description + ' complete.');
        await refreshState().catch(() => {});
        return result;
    } catch (error) {
        msg(error.message || String(error), true);
        return null;
    }
}

function activateTab(tab) {
    const mobile = tab === 'mobile';
    el('web-workbench-page').hidden = mobile;
    el('mobile-workbench-page').hidden = !mobile;
    el('ai-site-tab').setAttribute('aria-selected', String(!mobile));
    el('ai-mobile-tab').setAttribute('aria-selected', String(mobile));
    if (mobile) {
        void refreshDevices();
        void refreshState().catch(error => msg(error.message, true));
    }
}

function sourceForm() {
    const isPlay = el('mobile-source-type').value === 'play';
    el('mobile-play-fields').hidden = !isPlay;
    el('mobile-apk-fields').hidden = isPlay;
    el('mobile-open-play').hidden = !isPlay;
    el('mobile-install').hidden = isPlay;
}

function selectedSerial() {
    return el('mobile-device').value || null;
}

function renderCaptures(captures) {
    const container = el('mobile-captures');
    container.replaceChildren();
    if (!captures.length) {
        container.textContent = 'No screens captured. After signing in, navigate to a screen and choose Capture.';
        return;
    }
    for (const capture of captures) {
        const figure = document.createElement('button');
        figure.type = 'button';
        figure.className = 'mobile-thumbnail';
        const img = document.createElement('img');
        img.src = capture.screenshot;
        img.alt = 'Captured screen: ' + capture.label;
        img.loading = 'lazy';
        const caption = document.createElement('span');
        caption.textContent = capture.label + ' · ' + capture.elements + ' UI elements';
        figure.append(img, caption);
        figure.addEventListener('click', () => displayScreen(capture.screenshot));
        container.append(figure);
    }
}

function displayScreen(source) {
    const image = el('mobile-live-image');
    if (!image) return;
    image.src = source;
    image.hidden = false;
    el('mobile-preview-note').textContent = 'Click the screenshot to tap the corresponding location on the connected device. Then recapture to see changes.';
}

async function refreshState() {
    if (!currentProject()) {
        el('mobile-project').textContent = 'No active project.';
        return;
    }
    el('mobile-project').textContent = 'Project: ' + window.workbenchProject.name;
    const data = await json(endpoint(''));
    const state = data.state || {};
    el('mobile-phase').textContent = 'Stage: ' + (state.phase || 'not-started') +
        (state.packageName ? ' · ' + state.packageName : '');
    if (state.sourceType) el('mobile-source-type').value = state.sourceType;
    if (state.playUrl) el('mobile-play-url').value = state.playUrl;
    if (state.packageName) el('mobile-package').value = state.packageName;
    sourceForm();
    renderCaptures(data.captures || []);
    if (data.captures?.length) {
        const last = data.captures[data.captures.length - 1];
        if (!el('mobile-live-image').src || el('mobile-live-image').hidden) displayScreen(last.screenshot);
    }
    if (data.generatedUrl) {
        el('mobile-generated-link').href = data.generatedUrl;
        el('mobile-generated-link').hidden = false;
    }
}

async function refreshDevices() {
    const [capabilities, devices, avds] = await Promise.allSettled([
        json('/api/mobile/capabilities'), json('/api/mobile/devices'), json('/api/mobile/avds')
    ]);
    if (capabilities.status === 'fulfilled') {
        const values = capabilities.value.capabilities;
        el('mobile-tools').textContent = Object.entries(values)
            .map(([name, entry]) => name + ': ' + (entry.available ? 'ready' : 'not found')).join(' · ');
    } else el('mobile-tools').textContent = 'Tool detection failed: ' + capabilities.reason.message;
    if (devices.status === 'fulfilled') {
        const select = el('mobile-device');
        const current = select.value;
        select.replaceChildren();
        for (const item of devices.value.devices.filter(d => d.state === 'device')) {
            const option = document.createElement('option');
            option.value = item.serial;
            option.textContent = item.serial;
            select.append(option);
        }
        if (current && [...select.options].some(option => option.value === current)) select.value = current;
        if (!select.options.length) {
            const option = document.createElement('option');
            option.textContent = 'No authorized Android device';
            option.value = '';
            select.append(option);
        }
    } else msg('Could not query ADB devices: ' + devices.reason.message, true);
    if (avds.status === 'fulfilled') {
        const select = el('mobile-avd');
        select.replaceChildren();
        for (const name of avds.value.avds) {
            const option = document.createElement('option');
            option.value = name;
            option.textContent = name;
            select.append(option);
        }
        if (!select.options.length) {
            const option = document.createElement('option');
            option.value = '';
            option.textContent = 'Create an AVD in Android Studio';
            select.append(option);
        }
    }
}

async function prepare() {
    return task('Preparing mobile project', async () => {
        const sourceType = el('mobile-source-type').value;
        return json(endpoint('start'), body({
            sourceType, playUrl: el('mobile-play-url').value.trim(),
            packageName: sourceType === 'apk' ? el('mobile-package').value.trim() || null : null
        }));
    });
}

async function uploadApk() {
    const file = el('mobile-apk-file').files[0];
    if (!file) return msg('Choose an APK file first.', true);
    return task('Uploading APK', async () => {
        const response = await json(endpoint('apk'), {
            method: 'POST', headers: { 'content-type': 'application/vnd.android.package-archive' }, body: file
        });
        return response;
    });
}

async function runAction(operation, payload = {}) {
    return task(operation.replaceAll('-', ' '), () => json(endpoint(operation),
        body({ serial: selectedSerial(), ...payload })));
}

async function capture() {
    const result = await runAction('capture', { label: el('mobile-screen-label').value });
    if (result?.capture) displayScreen(result.capture.screenshot);
}

async function screenshotTap(event) {
    const img = event.currentTarget;
    if (!img.naturalWidth || !img.naturalHeight) return;
    const rect = img.getBoundingClientRect();
    const x = Math.round((event.clientX - rect.left) * img.naturalWidth / rect.width);
    const y = Math.round((event.clientY - rect.top) * img.naturalHeight / rect.height);
    await runAction('control', { type: 'tap', x, y });
}

function initMobile() {
    el('ai-site-tab')?.addEventListener('click', () => activateTab('site'));
    el('mobile-choose-project')?.addEventListener('click', () => el('project-button')?.click());
    el('ai-mobile-tab')?.addEventListener('click', () => activateTab('mobile'));
    el('mobile-source-type')?.addEventListener('change', sourceForm);
    el('mobile-prepare')?.addEventListener('click', prepare);
    el('mobile-upload')?.addEventListener('click', uploadApk);
    el('mobile-download')?.addEventListener('click', () => runAction('apk-url', { url: el('mobile-apk-url').value.trim() }));
    el('mobile-inspect')?.addEventListener('click', () => runAction('inspect'));
    el('mobile-refresh')?.addEventListener('click', () => task('Refreshing Android devices', refreshDevices));
    el('mobile-start-avd')?.addEventListener('click', () => task('Starting emulator', () =>
        json('/api/mobile/avds/start', body({ name: el('mobile-avd').value }))));
    el('mobile-open-play')?.addEventListener('click', () => runAction('open-play'));
    el('mobile-install')?.addEventListener('click', () => runAction('install'));
    el('mobile-verify')?.addEventListener('click', () => runAction('verify', { packageName: el('mobile-package').value.trim() }));
    el('mobile-launch')?.addEventListener('click', () => runAction('launch'));
    el('mobile-pause')?.addEventListener('click', () => runAction('pause'));
    el('mobile-resume')?.addEventListener('click', () => runAction('resume'));
    el('mobile-capture')?.addEventListener('click', capture);
    el('mobile-analyze')?.addEventListener('click', () => runAction('analyze'));
    el('mobile-generate')?.addEventListener('click', () => runAction('generate'));
    el('mobile-generate-ai')?.addEventListener('click', () => runAction('generate-ai', {
        provider: el('mobile-model-provider').value,
        model: el('mobile-model-name').value.trim(),
        instructions: el('mobile-model-guidance').value.trim(),
        shareUiMetadata: el('mobile-share-ui').checked
    }));
    el('mobile-back')?.addEventListener('click', () => runAction('control', { type: 'back' }));
    el('mobile-home')?.addEventListener('click', () => runAction('control', { type: 'home' }));
    el('mobile-swipe-up')?.addEventListener('click', () => runAction('control', { type: 'swipe', x1: 500, y1: 1300, x2: 500, y2: 350 }));
    el('mobile-swipe-down')?.addEventListener('click', () => runAction('control', { type: 'swipe', x1: 500, y1: 350, x2: 500, y2: 1300 }));
    el('mobile-live-image')?.addEventListener('click', screenshotTap);
    window.addEventListener('workbench:project-selected', () => void refreshState().catch(error => msg(error.message, true)));
    sourceForm();
}

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', initMobile, { once: true });
else initMobile();
