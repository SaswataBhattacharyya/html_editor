import fs from 'node:fs/promises';
import path from 'node:path';

// Only minimum observed labels are shared with a model; never send APK files,
// screenshots, accessibility XML, device identifiers, login data or tokens.
export function modelEvidence(spec) {
    return {
        app: spec.appName,
        screens: spec.screens.slice(0, 40).map(screen => ({
            title: screen.title,
            actions: screen.buttons.slice(0, 12)
        }))
    };
}

const instruction = [
    'Create ONE self-contained JavaScript App.js for an Expo React Native application.',
    'Use only react and react-native imports; no network APIs, shell commands, eval, extra libraries or external asset URLs.',
    'Return JS source only with a default React component export, no markdown fences or explanation.',
    'Use functional React components, useState for navigation and local demo interactions, StyleSheet for styling.',
    'Ground screens, labels, and actions in the observed evidence. Clearly mark placeholder behavior; do not pretend to implement any private services or accounts.',
    'Create a polished original interface using your own layout and colors; do not copy protected branding, artwork or copyrighted assets.',
    'Never request passwords, payment details or secret tokens in generated UI.'
].join(' ');

function normalizeCode(value) {
    let code = String(value || '').trim();
    const fence = String.fromCharCode(96).repeat(3);
    if (code.startsWith(fence)) code = code.slice(code.indexOf('\n') + 1);
    if (code.endsWith(fence)) code = code.slice(0, -fence.length);
    code = code.trim();
    if (!/export\s+default\s+/m.test(code) || !/react-native/.test(code) || code.length < 100 || code.length > 90000)
        throw new Error('Model did not return a valid-sized React Native App.js scaffold');
    if (/\b(?:child_process|process\.env|eval\s*\(|Function\s*\(|require\s*\(|fetch\s*\(|XMLHttpRequest|WebSocket)\b/.test(code))
        throw new Error('Generated code contains a disallowed API; review through Codex instead');
    return code + '\n';
}

export async function requestMobileCode(spec, opts = {}) {
    const provider = opts.provider;
    if (!['ollama', 'openrouter'].includes(provider)) throw new Error('Select Ollama or OpenRouter');
    if (provider === 'openrouter' && opts.shareUiMetadata !== true)
        throw new Error('Confirm permission to send observed UI labels to OpenRouter');
    const modelName = String(opts.model || '').trim().slice(0, 140);
    const prompt = instruction + '\n\nObserved evidence JSON:\n' + JSON.stringify(modelEvidence(spec))
        + '\n\nAdditional implementation guidance:\n' + String(opts.instructions || '').slice(0, 2000);
    let value;
    if (provider === 'ollama') {
        const base = process.env.OLLAMA_BASE_URL || 'http://127.0.0.1:11434';
        const model = modelName || process.env.OLLAMA_MODEL || 'qwen3.6:35b';
        const response = await fetch(new URL('/api/generate', base), {
            method: 'POST', headers: { 'content-type': 'application/json' },
            body: JSON.stringify({ model, prompt, stream: false, options: { temperature: 0.2 } }),
            signal: AbortSignal.timeout(240000)
        });
        if (!response.ok) throw new Error('Ollama returned HTTP ' + response.status);
        value = (await response.json()).response;
    } else {
        const key = process.env.OPENROUTER_API_KEY;
        const model = modelName || process.env.OPENROUTER_MODEL;
        if (!key || !model) throw new Error('Set OPENROUTER_API_KEY and OPENROUTER_MODEL on the server or enter the model');
        const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
            method: 'POST', headers: { 'content-type': 'application/json', authorization: 'Bearer ' + key },
            body: JSON.stringify({
                model, temperature: 0.2, max_tokens: 6000,
                messages: [{ role: 'system', content: instruction }, { role: 'user', content: prompt }]
            }),
            signal: AbortSignal.timeout(240000)
        });
        if (!response.ok) throw new Error('OpenRouter returned HTTP ' + response.status);
        value = (await response.json()).choices?.[0]?.message?.content;
    }
    return { provider, code: normalizeCode(value), model: modelName || (provider === 'ollama'
        ? process.env.OLLAMA_MODEL || 'qwen3.6:35b' : process.env.OPENROUTER_MODEL) };
}

export async function saveModelCode(projectDir, result) {
    const dir = path.join(projectDir, 'mobile', 'generated', 'expo-starter');
    await fs.mkdir(dir, { recursive: true });
    const current = path.join(dir, 'App.js');
    const fallback = path.join(dir, 'App.starter.js');
    try { await fs.access(fallback); }
    catch {
        try { await fs.copyFile(current, fallback); } catch {}
    }
    await fs.writeFile(current, result.code, { mode: 0o600 });
    await fs.writeFile(path.join(dir, 'generation-info.json'), JSON.stringify({
        provider: result.provider, model: result.model, createdAt: new Date().toISOString(),
        note: 'Untrusted generated source. Review, lint and build before running; visual parity is not verified.'
    }, null, 2) + '\n');
}
