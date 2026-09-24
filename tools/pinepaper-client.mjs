import { spawn } from 'node:child_process';
import { createInterface } from 'node:readline';
import { promises as fs } from 'node:fs';

const serverRoot = process.env.PINEPAPER_ROOT || '/home/riki/web_dev/html_editor/mcp-server';
const serverEntry = `${serverRoot}/dist/cli.js`;
let requestId = 0;

const extractText = (value) => {
    if (typeof value === 'string') return value;
    if (Array.isArray(value)) return value.map(extractText).join('\n');
    if (value && typeof value === 'object') return Object.values(value).map(extractText).join('\n');
    return '';
};

const extractSvg = async (value) => {
    const text = extractText(value);
    const match = text.match(/<svg[\s\S]*<\/svg>/i);
    if (match) return match[0];
    const dataUrl = text.match(/data:image\/svg\+xml(?:;charset=[^;,]+)?;base64,([a-z0-9+/=\s]+)/i);
    if (dataUrl) return Buffer.from(dataUrl[1].replace(/\s/g, ''), 'base64').toString('utf8');
    const paths = [...text.matchAll(/(?:file|path|output|artifact)[^\n]*?([/\\][^\s"']+\.svg)/gi)].map((item) => item[1]);
    const visit = (node, key = '') => {
        if (typeof node === 'string') {
            if (/(?:file|path|output|artifact)/i.test(key) && /\.svg(?:$|[?#])/i.test(node)) paths.push(node);
            return;
        }
        if (Array.isArray(node)) node.forEach((item) => visit(item, key));
        else if (node && typeof node === 'object') Object.entries(node).forEach(([childKey, child]) => visit(child, childKey));
    };
    visit(value);
    for (const candidate of paths) {
        const normalized = candidate.startsWith('file://') ? new URL(candidate) : candidate;
        try { return await fs.readFile(normalized, 'utf8'); } catch { /* continue */ }
        try { return await fs.readFile(`${serverRoot}/${candidate.replace(/^[/\\]+/, '')}`, 'utf8'); } catch { /* continue */ }
    }
    return null;
};

const runPinePaper = async (plan) => {
    const executionMode = process.env.PINEPAPER_EXECUTION_MODE || 'puppeteer';
    const args = [serverEntry, '--mode', executionMode, '--toolkit', 'agent', '--verbosity', 'verbose'];
    const child = spawn(process.env.PINEPAPER_NODE || 'node', args, {
        cwd: serverRoot,
        env: { ...process.env, PINEPAPER_EXECUTION_MODE: executionMode },
        stdio: ['pipe', 'pipe', 'pipe']
    });
    const output = createInterface({ input: child.stdout });
    const pending = new Map();
    const errors = [];
    output.on('line', (line) => {
        try {
            const message = JSON.parse(line);
            const callback = pending.get(message.id);
            if (callback) {
                pending.delete(message.id);
                if (message.error) callback.reject(new Error(message.error.message || JSON.stringify(message.error)));
                else callback.resolve(message.result);
            }
        } catch { /* PinePaper keeps diagnostics on stderr; ignore non-JSON stdout lines. */ }
    });
    child.stderr.on('data', (chunk) => errors.push(chunk.toString()));
    const call = (method, params) => new Promise((resolve, reject) => {
        const id = ++requestId;
        pending.set(id, { resolve, reject });
        child.stdin.write(`${JSON.stringify({ jsonrpc: '2.0', id, method, params })}\n`);
        setTimeout(() => {
            if (pending.delete(id)) reject(new Error(`PinePaper request timed out: ${method}`));
        }, Number(process.env.PINEPAPER_TIMEOUT || 120000));
    });
    const notify = (method, params) => child.stdin.write(`${JSON.stringify({ jsonrpc: '2.0', method, params })}\n`);
    try {
        await call('initialize', { protocolVersion: '2025-06-18', capabilities: {}, clientInfo: { name: 'html-editor', version: '1.0.0' } });
        notify('notifications/initialized', {});
        const started = await call('tools/call', { name: 'pinepaper_agent_start_job', arguments: { name: 'HTML editor animation', description: plan.summary, canvasPreset: 'web', screenshotPolicy: 'on_complete', clearCanvas: true } });
        const batch = await call('tools/call', { name: 'pinepaper_agent_batch_execute', arguments: { operations: plan.operations } });
        const ended = await call('tools/call', { name: 'pinepaper_agent_end_job', arguments: { includeScreenshot: true, analyzeContent: true } });
        const exported = await call('tools/call', { name: 'pinepaper_agent_export', arguments: { platform: 'web', format: 'svg', quality: 'standard', duration: plan.duration || 5 } });
        const svg = await extractSvg(exported);
        const code = extractText({ started, batch, ended, exported });
        return { executionMode, svg, code, started, batch, ended, exported, diagnostics: errors.join('') };
    } finally {
        output.close();
        child.kill();
    }
};

export { runPinePaper };
