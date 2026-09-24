import { createServer } from 'node:http';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import crypto from 'node:crypto';
import { spawn } from 'node:child_process';
import { convertBuffer } from '@visioncortex/vtracer';
import { runPinePaper } from './tools/pinepaper-client.mjs';

const rootDir = path.dirname(fileURLToPath(import.meta.url));
const projectsDir = path.join(rootDir, 'projects');
const port = Number(process.env.PORT || 3000);
const cloneLimits = { assets: 300, assetBytes: 50 * 1024 * 1024, totalBytes: 200 * 1024 * 1024 };

const mimeTypes = {
    '.css': 'text/css; charset=utf-8',
    '.gif': 'image/gif',
    '.html': 'text/html; charset=utf-8',
    '.ico': 'image/x-icon',
    '.jpeg': 'image/jpeg',
    '.jpg': 'image/jpeg',
    '.js': 'text/javascript; charset=utf-8',
    '.json': 'application/json; charset=utf-8',
    '.mjs': 'text/javascript; charset=utf-8',
    '.png': 'image/png',
    '.svg': 'image/svg+xml',
    '.txt': 'text/plain; charset=utf-8',
    '.webp': 'image/webp',
    '.woff': 'font/woff',
    '.woff2': 'font/woff2'
};

const sendJson = (response, statusCode, payload) => {
    const body = JSON.stringify(payload, null, 2);
    response.writeHead(statusCode, {
        'content-type': 'application/json; charset=utf-8',
        'cache-control': 'no-store'
    });
    response.end(body);
};

const readJsonBody = async (request) => {
    const chunks = [];
    for await (const chunk of request) chunks.push(chunk);
    if (!chunks.length) return {};
    return JSON.parse(Buffer.concat(chunks).toString('utf8'));
};

const animationPlanSchema = {
    summary: 'string',
    mode: 'timeline | relations',
    duration: 'number',
    operations: 'array'
};

const buildFallbackPlan = (prompt, mode) => {
    const summary = String(prompt || '').trim();
    const operations = [
        { type: 'set_canvas_size', preset: 'web' },
        { type: 'create', itemType: 'circle', position: { x: 360, y: 240 }, properties: { radius: 48, color: '#c87835' } }
    ];
    if (mode === 'relations') {
        operations.push({ type: 'create', itemType: 'circle', position: { x: 360, y: 240 }, properties: { radius: 10, color: '#243146' } });
        operations.push({ type: 'relation', sourceId: '$1', targetId: '$0', relationType: 'orbits', relationOptions: { radius: 110, duration: 5, loop: true } });
    } else {
        operations.push({ type: 'keyframe_animate', itemId: '$0', keyframes: [{ time: 0, properties: { scale: 0.8, opacity: 0.5 } }, { time: 2, properties: { scale: 1, opacity: 1 }, easing: 'easeOut' }], duration: 2, loop: true });
    }
    return { summary, mode, duration: 5, operations, source: 'deterministic-fallback' };
};

const requestOllamaPlan = async (prompt, mode) => {
    const model = process.env.OLLAMA_MODEL || 'qwen3.6:35b';
    const instruction = `You are an SVG animation planner. Return ONLY valid JSON matching this schema: {"summary": string, "mode": "timeline" or "relations", "duration": number, "operations": array}. The operations must be PinePaper pinepaper_agent_batch_execute operations. For timeline mode use keyframe_animate. For relations mode use relation. User request: ${prompt}`;
    const response = await fetch(`${process.env.OLLAMA_BASE_URL || 'http://127.0.0.1:11434'}/api/generate`, {
        method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ model, prompt: instruction, stream: false, format: 'json', options: { temperature: 0.2 } }), signal: AbortSignal.timeout(120000)
    });
    if (!response.ok) throw new Error(`Ollama returned HTTP ${response.status}`);
    const payload = await response.json();
    // qwen3.6 may place structured output in `thinking` when the response
    // channel is empty. Prefer response, but accept either channel.
    const rawPlan = String(payload.response || payload.thinking || '').trim();
    const jsonText = rawPlan.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim();
    const plan = JSON.parse(jsonText || '{}');
    if (!plan.summary || !Array.isArray(plan.operations)) throw new Error('Ollama returned an invalid animation plan');
    return { ...plan, mode, source: 'ollama', model };
};

const validateAnimationPlan = (plan) => {
    if (!plan || !['timeline', 'relations'].includes(plan.mode) || !Array.isArray(plan.operations) || !plan.operations.length) throw new Error(`Invalid animation plan. Required schema: ${JSON.stringify(animationPlanSchema)}`);
    const allowed = new Set(['set_canvas_size', 'set_background', 'create', 'animate', 'keyframe_animate', 'relation', 'apply_effect', 'apply_mask', 'play_timeline']);
    for (const [index, operation] of plan.operations.entries()) {
        if (!allowed.has(operation.type)) throw new Error(`Invalid operation ${index}: ${operation.type}`);
    }
    return { ...plan, duration: Math.min(60, Math.max(0.5, Number(plan.duration || 5))) };
};

const decodeDataUrl = (value) => {
    const match = /^data:(image\/(?:png|jpeg|webp|gif|bmp));base64,([a-z0-9+/=\s]+)$/i.exec(String(value || ''));
    if (!match) throw new Error('Expected a base64 PNG, JPEG, WebP, GIF, or BMP data URL');
    const buffer = Buffer.from(match[2].replace(/\s/g, ''), 'base64');
    if (!buffer.length || buffer.length > 12 * 1024 * 1024) throw new Error('Image must be between 1 byte and 12 MB');
    return { buffer, extension: match[1].split('/')[1].replace('jpeg', 'jpg') };
};

const safeProjectId = (value) => /^[a-zA-Z0-9][a-zA-Z0-9._-]{0,80}$/.test(value || '');

const projectPath = (projectId) => {
    if (!safeProjectId(projectId)) throw new Error('Invalid project id');
    return path.join(projectsDir, projectId);
};

const createProjectId = (name) => {
    const slug = String(name || 'project')
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '')
        .slice(0, 42) || 'project';
    return `${slug}-${crypto.randomBytes(4).toString('hex')}`;
};

const ensureProject = async (projectId) => {
    const directory = projectPath(projectId);
    await fs.mkdir(directory, { recursive: true });
    await Promise.all([
        fs.mkdir(path.join(directory, 'source'), { recursive: true }),
        fs.mkdir(path.join(directory, 'website-package'), { recursive: true }),
        fs.mkdir(path.join(directory, 'svg-work'), { recursive: true }),
        fs.mkdir(path.join(directory, 'research'), { recursive: true }),
        fs.mkdir(path.join(directory, 'jobs'), { recursive: true }),
        fs.mkdir(path.join(directory, 'previews'), { recursive: true }),
        fs.mkdir(path.join(directory, 'exports'), { recursive: true }),
        fs.mkdir(path.join(directory, 'graphify-out'), { recursive: true })
    ]);
    return directory;
};

const readProject = async (projectId) => {
    try {
        const content = await fs.readFile(path.join(projectPath(projectId), 'project.json'), 'utf8');
        return JSON.parse(content);
    } catch (error) {
        if (error.code === 'ENOENT') return null;
        throw error;
    }
};

const refreshProjectGraph = async (projectId) => {
    const directory = await ensureProject(projectId);
    const graphDirectory = path.join(directory, 'graphify-out');
    const files = [];
    const walk = async (current, relative = '') => {
        for (const entry of await fs.readdir(current, { withFileTypes: true })) {
            if (entry.name === 'graphify-out' || entry.name === 'jobs') continue;
            const absolute = path.join(current, entry.name);
            const childRelative = path.join(relative, entry.name);
            if (entry.isDirectory()) await walk(absolute, childRelative);
            else files.push(childRelative.split(path.sep).join('/'));
        }
    };
    await walk(directory);
    const nodes = files.map((file) => ({
        id: file.replace(/[^a-zA-Z0-9_.-]/g, '_'),
        label: file,
        source_file: file,
        file_type: path.extname(file).slice(1) || 'file',
        _origin: 'project-artifact'
    }));
    const links = files.flatMap((file) => {
        const parent = path.dirname(file).split(path.sep).join('/');
        if (parent === '.') return [];
        const parentId = parent.replace(/[^a-zA-Z0-9_.-]/g, '_');
        return [{ source: parentId, target: file.replace(/[^a-zA-Z0-9_.-]/g, '_'), relation: 'contains' }];
    });
    const graph = { directed: false, multigraph: false, graph: { projectId, generatedAt: new Date().toISOString() }, nodes, links, hyperedges: [] };
    await fs.writeFile(path.join(graphDirectory, 'graph.json'), `${JSON.stringify(graph, null, 2)}\n`);
    await fs.writeFile(path.join(graphDirectory, 'GRAPH_REPORT.md'), `# Project Graph Report\n\n- Project: \`${projectId}\`\n- Artifacts: ${files.length}\n- Generated: ${graph.graph.generatedAt}\n- Purpose: restore the project artifact map for the HTML/SVG editor and agents.\n`);
    return { status: 'created', files: files.length };
};

const listProjects = async () => {
    await fs.mkdir(projectsDir, { recursive: true });
    const entries = await fs.readdir(projectsDir, { withFileTypes: true });
    const projects = await Promise.all(entries
        .filter((entry) => entry.isDirectory() && safeProjectId(entry.name))
        .map((entry) => readProject(entry.name)));
    return projects.filter(Boolean).sort((a, b) => String(b.updatedAt).localeCompare(String(a.updatedAt)));
};

const createProject = async (payload) => {
    const name = String(payload.name || '').trim();
    if (!name) throw new Error('Project name is required');
    const id = createProjectId(name);
    const now = new Date().toISOString();
    const project = {
        id,
        name,
        sourceUrl: String(payload.sourceUrl || '').trim(),
        createdAt: now,
        updatedAt: now,
        phase: 'backend-projects',
        graphifyStatus: 'created',
        previewUrl: null
    };
    const directory = await ensureProject(id);
    await fs.writeFile(path.join(directory, 'project.json'), `${JSON.stringify(project, null, 2)}\n`);
    await refreshProjectGraph(id);
    return project;
};

const createCloneJob = async (projectId, payload) => {
    const project = await readProject(projectId);
    if (!project) return null;
    const jobId = `${Date.now()}-${crypto.randomBytes(4).toString('hex')}`;
    const jobDirectory = path.join(projectPath(projectId), 'jobs', jobId);
    const now = new Date().toISOString();
    const request = {
        id: jobId,
        type: 'clone-website',
        status: 'queued',
        createdAt: now,
        updatedAt: now,
        projectId,
        url: String(payload.url || '').trim(),
        worker: 'local-static-crawler'
    };
    await fs.mkdir(jobDirectory, { recursive: true });
    await fs.writeFile(path.join(jobDirectory, 'request.json'), `${JSON.stringify(request, null, 2)}\n`);
    await fs.writeFile(path.join(jobDirectory, 'status.json'), `${JSON.stringify(request, null, 2)}\n`);
    return request;
};

const writeJobStatus = async (projectId, jobId, patch) => {
    const statusPath = path.join(projectPath(projectId), 'jobs', jobId, 'status.json');
    let current = {};
    try { current = JSON.parse(await fs.readFile(statusPath, 'utf8')); } catch (error) { if (error.code !== 'ENOENT') throw error; }
    const next = { ...current, ...patch, updatedAt: new Date().toISOString() };
    await fs.writeFile(statusPath, `${JSON.stringify(next, null, 2)}\n`);
    return next;
};

const absoluteAssetUrl = (value, pageUrl) => {
    try {
        const url = new URL(value, pageUrl);
        if (!['http:', 'https:'].includes(url.protocol)) return null;
        return url;
    } catch { return null; }
};

const downloadUrlForAsset = (url) => {
    // Next.js image optimization URLs are generated views of the real image.
    // Fetch the encoded source instead of the optimizer endpoint, which often
    // requires runtime headers and returns HTTP 400 to a crawler.
    if (url.pathname === '/_next/image' && url.searchParams.get('url')) {
        try { return new URL(url.searchParams.get('url'), url.origin); } catch { return url; }
    }
    return url;
};

const fileNameForUrl = (url, index) => {
    const base = path.basename(url.pathname).replace(/[^a-z0-9._-]/gi, '_').slice(0, 80) || `asset-${index}`;
    return `${String(index).padStart(3, '0')}-${base}`;
};

const isPublicMediaAsset = (url) => /\.(?:avif|bmp|css|gif|ico|jpe?g|mjs|mp3|mp4|ogg|png|svg|webm|webp|woff2?|ttf|otf)(?:$|[?#])/i.test(url.pathname);
const splineRuntimeUrl = 'https://unpkg.com/@splinetool/runtime@1.10.89/build/runtime.js';

const extractAssetReferences = (html, pageUrl) => {
    const page = new URL(pageUrl);
    const values = [];
    const pattern = /(?:src|href|poster|data-src)\s*=\s*["']([^"']+)["']/gi;
    for (const match of html.matchAll(pattern)) values.push(match[1]);
    const srcsetPattern = /(?:srcset|imagesrcset)\s*=\s*["']([^"']+)["']/gi;
    for (const match of html.matchAll(srcsetPattern)) {
        for (const candidate of match[1].split(',')) values.push(candidate.trim().split(/\s+/)[0]);
    }
    for (const match of html.matchAll(/url\(\s*["']?([^"')]+)["']?\s*\)/gi)) values.push(match[1]);
    const seen = new Set();
    return values.map((value) => absoluteAssetUrl(value, pageUrl)).filter((url) => {
        // A page's own canonical/root URL is a navigation link, not a
        // downloadable asset. In particular, replacing `/` globally would
        // corrupt every path in a root-page clone.
        if (!url || url.href === page.href || (url.origin === page.origin && url.pathname === '/' && !url.search && !url.hash)) return false;
        if (seen.has(url.href)) return false;
        seen.add(url.href);
        return true;
    });
};

const fetchBytes = async (url) => {
    const response = await fetch(url, { redirect: 'follow', signal: AbortSignal.timeout(20000), headers: { 'user-agent': 'html-editor-local-cloner/1.0' } });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const bytes = Buffer.from(await response.arrayBuffer());
    if (bytes.length > cloneLimits.assetBytes) throw new Error(`asset exceeds ${cloneLimits.assetBytes} byte limit`);
    return { bytes, contentType: response.headers.get('content-type') || '' };
};

const runBrowserCapture = (projectId, job, directory) => new Promise((resolve) => {
    const packageDirectory = path.join(directory, 'website-package');
    const sceneDirectory = path.join(packageDirectory, 'spline-scenes');
    const args = [
        path.join(rootDir, 'tools', 'browser_clone.py'),
        '--url', job.url,
        '--html', path.join(packageDirectory, 'rendered.html'),
        '--screenshot', path.join(directory, 'previews', 'browser-capture.png'),
        '--report', path.join(directory, 'source', 'browser-report.json'),
        '--scene-dir', sceneDirectory,
        '--scene-report', path.join(directory, 'source', 'spline-scenes.json')
    ];
    const child = spawn(process.env.PYTHON_BIN || 'python3', args, { cwd: rootDir, env: process.env });
    let stderr = '';
    child.stderr.on('data', (chunk) => { stderr += chunk.toString(); });
    child.on('error', (error) => resolve({ ok: false, error: error.message }));
    child.on('close', (code) => resolve(code === 0 ? { ok: true } : { ok: false, error: stderr.trim() || `browser worker exited with ${code}` }));
});

const runMotionCapture = (job, directory) => new Promise((resolve) => {
    const output = path.join(directory, 'website-package', 'assets', 'hero-motion.mp4');
    const report = path.join(directory, 'source', 'motion-report.json');
    const args = [
        path.join(rootDir, 'tools', 'motion_capture.py'),
        '--url', job.url,
        '--output', output,
        '--report', report,
        '--duration', process.env.MOTION_CAPTURE_DURATION || '8',
        '--fps', process.env.MOTION_CAPTURE_FPS || '24'
    ];
    const child = spawn(process.env.PYTHON_BIN || 'python3', args, { cwd: rootDir, env: process.env });
    let stderr = '';
    child.stderr.on('data', (chunk) => { stderr += chunk.toString(); });
    child.on('error', (error) => resolve({ ok: false, error: error.message }));
    child.on('close', (code) => resolve(code === 0 ? { ok: true, url: `/projects/${job.projectId}/website-package/assets/hero-motion.mp4` } : { ok: false, error: stderr.trim() || `motion worker exited with ${code}` }));
});

const captureSplineRuntime = async (directory, projectId) => {
    const sceneReportPath = path.join(directory, 'source', 'spline-scenes.json');
    const sceneReport = JSON.parse(await fs.readFile(sceneReportPath, 'utf8'));
    if (!sceneReport.sceneFiles?.length) return { ok: false, skipped: true, error: 'No Spline scene files were captured' };
    const runtime = await fetchBytes(splineRuntimeUrl);
    const runtimePath = path.join(directory, 'website-package', 'assets', 'spline-runtime.js');
    await fs.writeFile(runtimePath, runtime.bytes);
    return {
        ok: true,
        runtimeUrl: `/projects/${projectId}/website-package/assets/spline-runtime.js`,
        sceneUrl: `/projects/${projectId}/website-package/spline-scenes/scene-00.splinecode`,
        runtimeBytes: runtime.bytes.length
    };
};

const injectMotionReplay = (html) => {
    const style = `<style id="html-editor-motion-replay">.html-editor-motion-hero{position:relative;overflow:hidden}.html-editor-motion-hero>.html-editor-motion-video{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;z-index:0;pointer-events:none}.html-editor-motion-hero> :not(.html-editor-motion-video){position:relative;z-index:1}.html-editor-motion-hero canvas{display:none!important}</style>`;
    const script = `<script id="html-editor-motion-replay-script">(()=>{const hero=document.querySelector('main > section');if(!hero||hero.querySelector('.html-editor-motion-video'))return;hero.classList.add('html-editor-motion-hero');const video=document.createElement('video');video.className='html-editor-motion-video';video.src='assets/hero-motion.mp4';video.autoplay=true;video.loop=true;video.muted=true;video.playsInline=true;video.setAttribute('aria-hidden','true');hero.prepend(video);video.play().catch(()=>{});})();</script>`;
    return html.replace('</head>', `${style}</head>`).replace('</body>', `${script}</body>`);
};

const injectSplineRuntime = (html) => {
    const style = `<style id="html-editor-spline-runtime-style">.html-editor-spline-runtime-hero{position:relative;overflow:hidden;isolation:isolate}.html-editor-spline-runtime-hero .html-editor-spline-runtime-canvas{position:absolute;inset:0;width:100%;height:100%;display:block;z-index:0;pointer-events:auto}.html-editor-spline-runtime-hero> :not(.html-editor-spline-runtime-canvas){position:relative;z-index:1}.html-editor-spline-runtime-hero .html-editor-motion-video{display:none!important}.html-editor-spline-runtime-status{position:absolute;left:-99999px;width:1px;height:1px;overflow:hidden}</style>`;
    const script = `<script type="module" id="html-editor-spline-runtime-script">(()=>{const hero=document.querySelector('main > section');if(!hero||hero.querySelector('.html-editor-spline-runtime-canvas'))return;hero.classList.add('html-editor-spline-runtime-hero');const canvas=document.createElement('canvas');canvas.className='html-editor-spline-runtime-canvas';canvas.setAttribute('aria-label','Interactive Spline scene');canvas.setAttribute('role','img');hero.prepend(canvas);const status=document.createElement('span');status.className='html-editor-spline-runtime-status';status.setAttribute('aria-live','polite');status.textContent='Loading interactive 3D scene';hero.append(status);const forwardPointer=(event)=>{if(event.target===canvas)return;const rect=canvas.getBoundingClientRect();if(event.clientX>=rect.left&&event.clientX<=rect.right&&event.clientY>=rect.top&&event.clientY<=rect.bottom){canvas.dispatchEvent(new PointerEvent(event.type,{bubbles:true,clientX:event.clientX,clientY:event.clientY,pointerId:event.pointerId,pointerType:event.pointerType,buttons:event.buttons}))}};window.addEventListener('pointermove',forwardPointer,{passive:true});window.addEventListener('pointerdown',forwardPointer,{passive:true});window.addEventListener('pointerup',forwardPointer,{passive:true});window.addEventListener('scroll',()=>{canvas.dataset.scrollY=String(window.scrollY);window.dispatchEvent(new CustomEvent('html-editor-spline-scroll',{detail:{scrollY:window.scrollY}}))},{passive:true});import('./assets/spline-runtime.js').then(({Application})=>{const app=new Application(canvas);window.htmlEditorSpline={app,canvas,sceneUrl:'spline-scenes/scene-00.splinecode'};return app.load('spline-scenes/scene-00.splinecode')}).then(()=>{status.textContent='Interactive 3D scene ready';window.dispatchEvent(new CustomEvent('html-editor-spline-ready'))}).catch(error=>{console.error('[html-editor] Spline runtime failed',error);status.textContent='Interactive 3D scene unavailable';canvas.remove();hero.classList.remove('html-editor-spline-runtime-hero')})})();</script>`;
    return html.replace('</head>', `${style}</head>`).replace('</body>', `${script}</body>`);
};

const runCloneJob = async (projectId, job) => {
    const directory = await ensureProject(projectId);
    const packageDirectory = path.join(directory, 'website-package');
    const assetDirectory = path.join(packageDirectory, 'assets');
    const warnings = [];
    try {
        await writeJobStatus(projectId, job.id, { status: 'running', worker: 'local-static-crawler', progress: 5, message: 'Fetching the target HTML' });
        const targetUrl = new URL(job.url);
        const page = await fetchBytes(targetUrl.href);
        let html = page.bytes.toString('utf8');
        // A new clone is a refresh of the package. Remove stale assets from a
        // previous attempt so broken old references cannot survive a retry.
        await fs.rm(assetDirectory, { recursive: true, force: true });
        await fs.rm(path.join(packageDirectory, 'spline-scenes'), { recursive: true, force: true });
        await fs.mkdir(assetDirectory, { recursive: true });
        await fs.writeFile(path.join(directory, 'source', 'raw.html'), html);
        const assetGroups = new Map();
        for (const reference of extractAssetReferences(html, targetUrl.href)) {
            const downloadUrl = downloadUrlForAsset(reference);
            const key = downloadUrl.href;
            if (!assetGroups.has(key)) assetGroups.set(key, { downloadUrl, references: [] });
            assetGroups.get(key).references.push(reference);
        }
        const assets = [...assetGroups.values()].slice(0, cloneLimits.assets);
        let totalBytes = page.bytes.length;
        const replacements = [];
        const downloadedAssets = [];
        for (let index = 0; index < assets.length; index += 1) {
            const { downloadUrl, references } = assets[index];
            if (downloadUrl.origin !== targetUrl.origin && !isPublicMediaAsset(downloadUrl)) {
                warnings.push(`Skipped cross-origin asset: ${downloadUrl.href}`);
                continue;
            }
            if (totalBytes >= cloneLimits.totalBytes) {
                warnings.push('Stopped downloading assets at the total size limit.');
                break;
            }
            try {
                const asset = await fetchBytes(downloadUrl.href);
                totalBytes += asset.bytes.length;
                const assetName = fileNameForUrl(downloadUrl, index);
                await fs.writeFile(path.join(assetDirectory, assetName), asset.bytes);
                const local = `assets/${assetName}`;
                downloadedAssets.push({ downloadUrl: downloadUrl.href, local, filePath: path.join(assetDirectory, assetName) });
                for (const reference of references) {
                    replacements.push([reference.href, local]);
                    const relative = reference.href.replace(targetUrl.origin, '');
                    if (relative && relative !== '/') replacements.push([relative, local]);
                }
                replacements.push([downloadUrl.href, local]);
            } catch (error) {
                warnings.push(`Could not download ${downloadUrl.href}: ${error.message}`);
            }
            await writeJobStatus(projectId, job.id, { status: 'running', worker: 'local-static-crawler', progress: Math.min(90, 10 + Math.round(((index + 1) / Math.max(assets.length, 1)) * 75)), message: `Downloaded ${index + 1}/${assets.length} referenced assets` });
        }
        // HTML module scripts commonly import sibling files using their
        // original basename. The crawler prefixes downloaded files to keep
        // names unique, so also publish safe basename aliases for local
        // module dependencies instead of leaving the browser with broken
        // imports such as ./index-e4482d9c.js.
        for (const asset of downloadedAssets) {
            const base = path.basename(new URL(asset.downloadUrl).pathname);
            if (!base || base === path.basename(asset.filePath) || !/^[a-z0-9._-]+$/i.test(base)) continue;
            const aliasPath = path.join(assetDirectory, base);
            try { await fs.access(aliasPath); } catch { await fs.copyFile(asset.filePath, aliasPath); }
        }
        // Replace the most specific paths first. Otherwise a short route such
        // as /community can corrupt a longer media path such as
        // /community/uploads/pages_media/example.mp4 before its exact mapping
        // gets a chance to apply.
        const replaceLiteral = (source, remote, local) => {
            if (!remote) return source;
            const escaped = remote.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
            // Apply the same path boundary to absolute and relative URLs.
            // Without it, a mapping for `/community` can match the prefix of
            // `/community/uploads/...` and create an invalid local path.
            const boundary = remote.endsWith('/') ? '(?![a-z0-9_-])' : '(?![a-z0-9_/-])';
            return source.replace(new RegExp(escaped + boundary, 'gi'), local);
        };
        for (const [remote, local] of [...replacements].sort((a, b) => b[0].length - a[0].length)) {
            html = replaceLiteral(html, remote, local);
            const relative = remote.replace(targetUrl.origin, '');
            if (relative && relative !== '/') html = replaceLiteral(html, relative, local);
        }
        await fs.writeFile(path.join(packageDirectory, 'index.html'), html);
        const report = { url: job.url, fetchedAt: new Date().toISOString(), assetsDownloaded: replacements.length, warnings, limitations: ['Static HTML/assets only; JavaScript execution, authenticated content, CORS restrictions, and server-side routes require the AI/browser worker.'] };
        await fs.writeFile(path.join(directory, 'source', 'clone-report.json'), `${JSON.stringify(report, null, 2)}\n`);
        await writeJobStatus(projectId, job.id, { status: 'running', worker: 'local-static-crawler+playwright', progress: 92, message: 'Capturing the rendered page with Playwright' });
        const browserCapture = await runBrowserCapture(projectId, job, directory);
        if (browserCapture.ok) {
            report.browserCapture = 'completed';
            const sceneReportPath = path.join(directory, 'source', 'spline-scenes.json');
            try {
                const sceneReport = JSON.parse(await fs.readFile(sceneReportPath, 'utf8'));
                const localize = (item) => ({ ...item, path: item.path ? `/projects/${projectId}/website-package/spline-scenes/${path.basename(item.path)}` : item.path });
                report.splineScenes = {
                    sceneFiles: (sceneReport.sceneFiles || []).map(localize),
                    wasmFiles: (sceneReport.wasmFiles || []).map(localize)
                };
                if (sceneReport.sceneFiles?.length) {
                    report.limitations = ['Spline scene data was captured locally. The HTML editor uses the rendered replay for stable editing; native Spline object editing still requires the Spline runtime/editor.'];
                }
            } catch { report.splineScenes = { sceneFiles: [], wasmFiles: [] }; }
            report.limitations = report.splineScenes?.sceneFiles?.length
                ? ['Authenticated content and server-side routes still require credentials or an agent worker.', 'Spline scene data was captured locally. The HTML editor uses the rendered replay for stable editing; native Spline object editing still requires the Spline runtime/editor.']
                : ['Authenticated content and server-side routes still require credentials or an agent worker.'];
        } else {
            report.browserCapture = 'unavailable';
            warnings.push(`Browser capture unavailable: ${browserCapture.error}`);
        }
        let motionCapture = { ok: false, skipped: true, error: 'Not needed when a native Spline scene is available' };
        let splineRuntime = { ok: false, error: 'No native Spline scene captured' };
        if (browserCapture.ok) {
            const hasSplineScene = Boolean(report.splineScenes?.sceneFiles?.length);
            if (hasSplineScene) {
                await writeJobStatus(projectId, job.id, { status: 'running', worker: 'local-static-crawler+playwright+spline-runtime', progress: 96, message: 'Bundling the captured Spline scene runtime' });
                try {
                    splineRuntime = await captureSplineRuntime(directory, projectId);
                    const packageHtml = await fs.readFile(path.join(packageDirectory, 'index.html'), 'utf8');
                    await fs.writeFile(path.join(packageDirectory, 'index.html'), injectSplineRuntime(packageHtml));
                    report.splineRuntime = 'completed';
                    report.motionCapture = 'not-needed-native-runtime';
                } catch (error) {
                    splineRuntime = { ok: false, error: error.message };
                    report.splineRuntime = 'unavailable';
                    warnings.push(`Native Spline runtime unavailable: ${error.message}`);
                }
            } else {
                await writeJobStatus(projectId, job.id, { status: 'running', worker: 'local-static-crawler+playwright+motion', progress: 96, message: 'Capturing a local replay of the rendered hero animation' });
                motionCapture = await runMotionCapture(job, directory);
                if (motionCapture.ok) {
                    const packageHtml = await fs.readFile(path.join(packageDirectory, 'index.html'), 'utf8');
                    await fs.writeFile(path.join(packageDirectory, 'index.html'), injectMotionReplay(packageHtml));
                    report.motionCapture = 'completed';
                } else {
                    report.motionCapture = 'unavailable';
                    warnings.push(`Hero motion capture unavailable: ${motionCapture.error}`);
                }
            }
        }
        await fs.writeFile(path.join(directory, 'source', 'clone-report.json'), `${JSON.stringify(report, null, 2)}\n`);
        const project = await readProject(projectId);
        const nextProject = { ...project, sourceUrl: job.url, updatedAt: new Date().toISOString(), phase: 'browser-capture-ready', previewUrl: `/projects/${projectId}/website-package/index.html`, screenshotUrl: browserCapture.ok ? `/projects/${projectId}/previews/browser-capture.png` : null, motionUrl: motionCapture.ok ? motionCapture.url : null, splineRuntimeUrl: splineRuntime.ok ? splineRuntime.runtimeUrl : null, lastCloneJobId: job.id };
        const manifest = {
            version: 1,
            projectId,
            sourceUrl: job.url,
            packageRoot: `/projects/${projectId}/website-package/`,
            indexUrl: `/projects/${projectId}/website-package/index.html`,
            renderedUrl: browserCapture.ok ? `/projects/${projectId}/website-package/rendered.html` : null,
            screenshotUrl: nextProject.screenshotUrl,
            motionUrl: nextProject.motionUrl,
            splineRuntime: splineRuntime.ok ? splineRuntime : null,
            splineScenes: report.splineScenes || null,
            reportUrl: `/projects/${projectId}/source/clone-report.json`,
            assets: replacements.map(([, local]) => local)
        };
        await fs.writeFile(path.join(packageDirectory, 'manifest.json'), `${JSON.stringify(manifest, null, 2)}\n`);
        await fs.writeFile(path.join(directory, 'project.json'), `${JSON.stringify(nextProject, null, 2)}\n`);
        await refreshProjectGraph(projectId);
        await refreshProjectGraph(projectId);
        const workerName = splineRuntime.ok ? 'local-static-crawler+playwright+spline-runtime' : (browserCapture.ok ? 'local-static-crawler+playwright+motion' : 'local-static-crawler');
        const message = splineRuntime.ok
            ? `Static package ready with ${replacements.length} local assets and a native Spline WebGL scene`
            : (browserCapture.ok
                ? `Static package ready with ${replacements.length} local assets; rendered capture${motionCapture.ok ? ' and hero motion replay' : ''} saved`
                : `Static package ready with ${replacements.length} local assets; browser capture unavailable`);
        await writeJobStatus(projectId, job.id, { status: 'completed', worker: workerName, progress: 100, message, warnings, previewUrl: nextProject.previewUrl, screenshotUrl: nextProject.screenshotUrl, motionUrl: nextProject.motionUrl, splineRuntime: splineRuntime.ok ? 'completed' : 'unavailable', browserCapture: browserCapture.ok ? 'completed' : 'unavailable', motionCapture: motionCapture.ok ? 'completed' : (motionCapture.skipped ? 'not-needed' : 'unavailable') });
    } catch (error) {
        await writeJobStatus(projectId, job.id, { status: 'failed', worker: 'local-static-crawler', progress: 100, message: error.message, error: error.message, warnings });
    }
};

const traceImage = async (projectId, payload) => {
    const project = await readProject(projectId);
    if (!project) return null;
    const { buffer, extension } = decodeDataUrl(payload.dataUrl);
    const directory = await ensureProject(projectId);
    const traceId = `${Date.now()}-${crypto.randomBytes(4).toString('hex')}`;
    const sourceDirectory = path.join(directory, 'svg-work', 'source-images');
    const generatedDirectory = path.join(directory, 'svg-work', 'generated');
    await fs.mkdir(sourceDirectory, { recursive: true });
    await fs.mkdir(generatedDirectory, { recursive: true });
    const sourceName = `${traceId}.${extension}`;
    const outputName = `${traceId}.svg`;
    await fs.writeFile(path.join(sourceDirectory, sourceName), buffer);
    const svg = convertBuffer(buffer, payload.options && typeof payload.options === 'object' ? payload.options : {});
    await fs.writeFile(path.join(generatedDirectory, outputName), svg, 'utf8');
    const now = new Date().toISOString();
    const nextProject = { ...project, updatedAt: now, lastSvgTraceAt: now, lastSvgAsset: outputName };
    await fs.writeFile(path.join(directory, 'project.json'), `${JSON.stringify(nextProject, null, 2)}\n`);
    await refreshProjectGraph(projectId);
    return {
        id: traceId,
        filename: String(payload.filename || sourceName),
        svgFilename: outputName,
        svg,
        sourcePath: `projects/${projectId}/svg-work/source-images/${sourceName}`,
        outputPath: `projects/${projectId}/svg-work/generated/${outputName}`
    };
};

const cleanSvgTags = (value) => {
    if (!Array.isArray(value)) throw new Error('tags must be an array');
    return value.slice(0, 500).map((tag, index) => {
        const id = String(tag.id || `svg-element-${index + 1}`).trim();
        const role = String(tag.role || 'unspecified').trim();
        const intent = String(tag.intent || 'No animation intent provided').trim();
        if (!/^[a-zA-Z][a-zA-Z0-9_.:-]{0,120}$/.test(id)) throw new Error(`Invalid SVG tag id: ${id}`);
        return { id, role: role.slice(0, 240), intent: intent.slice(0, 1000), element: String(tag.element || 'unknown').slice(0, 40) };
    });
};

const readSvgTags = async (projectId) => {
    try {
        return JSON.parse(await fs.readFile(path.join(projectPath(projectId), 'svg-work', 'tags.json'), 'utf8'));
    } catch (error) {
        if (error.code === 'ENOENT') return { version: 1, tags: [], svgFilename: null, updatedAt: null };
        throw error;
    }
};

const saveSvgTags = async (projectId, payload) => {
    const project = await readProject(projectId);
    if (!project) return null;
    const tags = cleanSvgTags(payload.tags);
    const svgFilename = String(payload.svgFilename || project.lastSvgAsset || '').trim();
    if (svgFilename && !/^[a-zA-Z0-9._-]+\.svg$/.test(svgFilename)) throw new Error('Invalid SVG filename');
    const data = { version: 1, tags, svgFilename: svgFilename || null, updatedAt: new Date().toISOString() };
    const directory = await ensureProject(projectId);
    await fs.writeFile(path.join(directory, 'svg-work', 'tags.json'), `${JSON.stringify(data, null, 2)}\n`);
    const nextProject = { ...project, updatedAt: data.updatedAt, svgTagCount: tags.length, svgTagsFile: 'svg-work/tags.json' };
    await fs.writeFile(path.join(directory, 'project.json'), `${JSON.stringify(nextProject, null, 2)}\n`);
    await refreshProjectGraph(projectId);
    return data;
};

const planAnimation = async (payload) => {
    const prompt = String(payload.prompt || '').trim();
    const mode = payload.mode === 'relations' ? 'relations' : 'timeline';
    if (!prompt) throw new Error('Animation prompt is required');
    if (payload.provider && payload.provider !== 'ollama') throw new Error(`${payload.provider} planning is not configured yet; select Ollama for planning`);
    return validateAnimationPlan(await requestOllamaPlan(prompt, mode));
};

const submitAnimation = async (projectId, payload) => {
    const project = await readProject(projectId);
    if (!project) return null;
    const plan = validateAnimationPlan(payload.plan);
    const result = await runPinePaper(plan);
    const directory = await ensureProject(projectId);
    const animationId = `${Date.now()}-${crypto.randomBytes(4).toString('hex')}`;
    const artifactDirectory = path.join(directory, 'svg-work', 'animated');
    await fs.mkdir(artifactDirectory, { recursive: true });
    const record = { id: animationId, provider: 'pinepaper', executionMode: result.executionMode, plan, createdAt: new Date().toISOString(), diagnostics: result.diagnostics || null };
    let outputPath = null;
    if (result.svg) {
        const filename = `${animationId}.svg`;
        outputPath = path.join(artifactDirectory, filename);
        await fs.writeFile(outputPath, result.svg, 'utf8');
        record.svgUrl = `/projects/${projectId}/svg-work/animated/${filename}`;
    } else {
        const filename = `${animationId}.pinepaper-code.txt`;
        outputPath = path.join(artifactDirectory, filename);
        await fs.writeFile(outputPath, result.code || 'PinePaper returned no export text.', 'utf8');
        record.codeUrl = `/projects/${projectId}/svg-work/animated/${filename}`;
    }
    await fs.writeFile(path.join(artifactDirectory, `${animationId}.json`), `${JSON.stringify(record, null, 2)}\n`);
    const nextProject = { ...project, updatedAt: record.createdAt, phase: 'animation-ready', lastAnimationId: animationId, lastAnimationUrl: record.svgUrl || record.codeUrl };
    await fs.writeFile(path.join(directory, 'project.json'), `${JSON.stringify(nextProject, null, 2)}\n`);
    await refreshProjectGraph(projectId);
    return record;
};

const serveStatic = async (request, response, pathname) => {
    const requestedPath = pathname === '/' ? '/index.html' : pathname;
    const absolutePath = path.resolve(rootDir, `.${requestedPath}`);
    if (absolutePath !== rootDir && !absolutePath.startsWith(`${rootDir}${path.sep}`)) {
        sendJson(response, 403, { error: 'Forbidden path' });
        return;
    }

    try {
        const stat = await fs.stat(absolutePath);
        if (!stat.isFile()) throw Object.assign(new Error('Not a file'), { code: 'ENOENT' });
        const extension = path.extname(absolutePath).toLowerCase();
        response.writeHead(200, { 'content-type': mimeTypes[extension] || 'application/octet-stream' });
        response.end(await fs.readFile(absolutePath));
    } catch (error) {
        if (error.code === 'ENOENT') {
            sendJson(response, 404, { error: 'Not found' });
            return;
        }
        sendJson(response, 500, { error: 'Could not serve file' });
    }
};

const server = createServer(async (request, response) => {
    try {
        const url = new URL(request.url || '/', `http://${request.headers.host || 'localhost'}`);
        const segments = url.pathname.split('/').filter(Boolean);

        if (url.pathname === '/api/health' && request.method === 'GET') {
            sendJson(response, 200, { ok: true, service: 'html_editor', projectsRoot: projectsDir, time: new Date().toISOString() });
            return;
        }

        if (url.pathname === '/api/projects' && request.method === 'GET') {
            sendJson(response, 200, { projects: await listProjects() });
            return;
        }

        if (url.pathname === '/api/projects' && request.method === 'POST') {
            const project = await createProject(await readJsonBody(request));
            sendJson(response, 201, { project });
            return;
        }

        if (url.pathname === '/api/animation/plan' && request.method === 'POST') {
            sendJson(response, 200, { plan: await planAnimation(await readJsonBody(request)) });
            return;
        }

        if (segments[0] === 'api' && segments[1] === 'projects' && segments[2]) {
            const projectId = segments[2];
            if (segments.length === 3 && request.method === 'GET') {
                const project = await readProject(projectId);
                if (!project) {
                    sendJson(response, 404, { error: 'Project not found' });
                    return;
                }
                sendJson(response, 200, { project });
                return;
            }

            if (segments[3] === 'jobs' && segments[4] && segments.length === 5 && request.method === 'GET') {
                try {
                    const status = JSON.parse(await fs.readFile(path.join(projectPath(projectId), 'jobs', segments[4], 'status.json'), 'utf8'));
                    sendJson(response, 200, { job: status });
                } catch (error) {
                    sendJson(response, error.code === 'ENOENT' ? 404 : 500, { error: error.code === 'ENOENT' ? 'Job not found' : error.message });
                }
                return;
            }

            if (segments[3] === 'package' && segments.length === 4 && request.method === 'GET') {
                try {
                    const manifest = JSON.parse(await fs.readFile(path.join(projectPath(projectId), 'website-package', 'manifest.json'), 'utf8'));
                    sendJson(response, 200, { package: manifest });
                } catch (error) {
                    sendJson(response, error.code === 'ENOENT' ? 404 : 500, { error: error.code === 'ENOENT' ? 'Clone package not found' : error.message });
                }
                return;
            }

            if (segments[3] === 'svg-tags' && segments.length === 4) {
                if (request.method === 'GET') {
                    const project = await readProject(projectId);
                    if (!project) {
                        sendJson(response, 404, { error: 'Project not found' });
                        return;
                    }
                    const saved = await readSvgTags(projectId);
                    sendJson(response, 200, {
                        ...saved,
                        svgUrl: saved.svgFilename ? `/projects/${projectId}/svg-work/generated/${saved.svgFilename}` : null
                    });
                    return;
                }
                if (request.method === 'PUT') {
                    const saved = await saveSvgTags(projectId, await readJsonBody(request));
                    if (!saved) {
                        sendJson(response, 404, { error: 'Project not found' });
                        return;
                    }
                    sendJson(response, 200, saved);
                    return;
                }
            }

            if (segments[3] === 'clone' && request.method === 'POST') {
                const payload = await readJsonBody(request);
                if (!/^https?:\/\//i.test(String(payload.url || ''))) {
                    sendJson(response, 400, { error: 'A valid http(s) URL is required' });
                    return;
                }
                const job = await createCloneJob(projectId, payload);
                if (!job) {
                    sendJson(response, 404, { error: 'Project not found' });
                    return;
                }
                sendJson(response, 202, { job });
                void runCloneJob(projectId, job);
                return;
            }

            if (segments[3] === 'trace' && request.method === 'POST') {
                const result = await traceImage(projectId, await readJsonBody(request));
                if (!result) {
                    sendJson(response, 404, { error: 'Project not found' });
                    return;
                }
                sendJson(response, 201, { result });
                return;
            }

            if (segments[3] === 'animation' && segments[4] === 'submit' && segments.length === 5 && request.method === 'POST') {
                const result = await submitAnimation(projectId, await readJsonBody(request));
                if (!result) {
                    sendJson(response, 404, { error: 'Project not found' });
                    return;
                }
                sendJson(response, 201, { result });
                return;
            }
        }

        await serveStatic(request, response, url.pathname);
    } catch (error) {
        console.error('[html_editor] request failed:', error);
        sendJson(response, 500, { error: error.message || 'Internal server error' });
    }
});

await fs.mkdir(projectsDir, { recursive: true });
server.listen(port, '0.0.0.0', () => {
    console.log(`[html_editor] listening on http://127.0.0.1:${port}`);
    console.log(`[html_editor] projects root: ${projectsDir}`);
});
