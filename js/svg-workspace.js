const params = new URLSearchParams(location.search);
const projectId = params.get('project');
const byId = (id) => document.getElementById(id);
let selected = null;
let zoom = 1;
const tags = [];
let currentSvgFilename = null;

const escapeHtml = (value) => String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');

const status = (message, error = false) => {
    const el = byId('workspace-status');
    el.textContent = message;
    el.classList.toggle('error', error);
};

const setZoom = (next) => {
    zoom = Math.min(3, Math.max(.25, next));
    byId('svg-preview').style.transform = `scale(${zoom})`;
    byId('zoom-reset').textContent = `${Math.round(zoom * 100)}%`;
};

const selectElement = (element) => {
    if (selected) selected.style.outline = selected.dataset.previousOutline || '';
    selected = element;
    selected.dataset.previousOutline = selected.style.outline || '';
    selected.style.outline = '3px solid #e07b39';
    byId('selection-label').textContent = `Selected <${element.tagName.toLowerCase()}>${element.id ? ` #${element.id}` : ''}`;
    byId('tag-id').value = element.id || '';
};

const renderTags = () => {
    const list = byId('tag-list');
    list.innerHTML = tags.length ? tags.map((tag, index) => `<div class="tag-item" data-tag-index="${index}"><strong>${escapeHtml(tag.id)}</strong> · ${escapeHtml(tag.role)}<br><span class="muted">${escapeHtml(tag.intent)}</span></div>`).join('') : '<span class="muted">No tags yet.</span>';
};

const bindSvgElements = () => {
    byId('svg-preview').querySelectorAll('path, polygon, rect, circle, ellipse, line, polyline').forEach((element) => element.addEventListener('click', (event) => { event.stopPropagation(); selectElement(element); }));
};

const loadSavedSvg = async () => {
    if (!projectId) return;
    try {
        const response = await fetch(`/api/projects/${encodeURIComponent(projectId)}/svg-tags`);
        if (!response.ok) return;
        const saved = await response.json();
        currentSvgFilename = saved.svgFilename;
        tags.splice(0, tags.length, ...(saved.tags || []));
        renderTags();
        if (saved.svgUrl) {
            const svgResponse = await fetch(saved.svgUrl);
            if (svgResponse.ok) {
                byId('svg-preview').innerHTML = await svgResponse.text();
                bindSvgElements();
                status(`Loaded saved SVG and ${tags.length} saved tag${tags.length === 1 ? '' : 's'}.`);
            }
        }
    } catch (error) {
        console.info('[svg-workspace] saved metadata unavailable:', error.message);
    }
};

const saveTags = async () => {
    if (!projectId) throw new Error('No project is active');
    const response = await fetch(`/api/projects/${encodeURIComponent(projectId)}/svg-tags`, {
        method: 'PUT', headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ svgFilename: currentSvgFilename, tags })
    });
    const payload = await response.json();
    if (!response.ok) throw new Error(payload.error || `Tag save failed (${response.status})`);
    return payload;
};

const traceFile = async () => {
    const file = byId('image-input').files?.[0];
    if (!file) return status('Choose an image first.', true);
    if (!projectId) return status('Open this workspace from an active project so the generated SVG has a project folder.', true);
    status(`Reading ${file.name}…`);
    const dataUrl = await new Promise((resolve, reject) => { const reader = new FileReader(); reader.onload = () => resolve(reader.result); reader.onerror = reject; reader.readAsDataURL(file); });
    status('VTracer is converting the image…');
    const response = await fetch(`/api/projects/${encodeURIComponent(projectId)}/trace`, { method:'POST', headers:{'content-type':'application/json'}, body:JSON.stringify({ filename:file.name, dataUrl }) });
    const payload = await response.json();
    if (!response.ok) throw new Error(payload.error || `Trace failed (${response.status})`);
    byId('svg-preview').innerHTML = payload.result.svg;
    currentSvgFilename = payload.result.svgFilename;
    bindSvgElements();
    setZoom(1);
    status(`Converted ${file.name}. Click an SVG element to tag it. Saved ${payload.result.svgFilename}.`);
};

byId('trace-button').addEventListener('click', () => traceFile().catch((error) => status(error.message, true)));
byId('zoom-in').addEventListener('click', () => setZoom(zoom + .25));
byId('zoom-out').addEventListener('click', () => setZoom(zoom - .25));
byId('zoom-reset').addEventListener('click', () => setZoom(1));
byId('fit-button').addEventListener('click', () => setZoom(1));
byId('back-button').addEventListener('click', () => { location.href = './index.html'; });
byId('svgedit-button').addEventListener('click', () => window.open(`svgedit/src/editor/index.html?project=${encodeURIComponent(projectId || '')}&asset=${encodeURIComponent(currentSvgFilename || '')}`, '_blank', 'noopener,noreferrer'));
byId('save-tag').addEventListener('click', () => {
    if (!selected) return status('Select an SVG element first.', true);
    const tag = { id: byId('tag-id').value.trim() || `svg-element-${tags.length + 1}`, role: byId('tag-role').value.trim() || 'unspecified', intent: byId('tag-intent').value.trim() || 'No animation intent provided', element: selected.tagName.toLowerCase() };
    selected.id = tag.id;
    selected.dataset.role = tag.role;
    selected.dataset.animationIntent = tag.intent;
    const existing = tags.findIndex((item) => item.id === tag.id);
    if (existing >= 0) tags.splice(existing, 1, tag); else tags.push(tag);
    saveTags().then(() => {
        renderTags();
        status(`Tagged and saved ${tag.id}. Metadata is stored in this project's svg-work/tags.json.`);
    }).catch((error) => status(`Tag applied locally but could not be saved: ${error.message}`, true));
});
renderTags();
void loadSavedSvg();
