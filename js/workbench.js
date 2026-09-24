const PROJECTS_KEY = 'html-editor.projects';
const THEME_KEY = 'html-editor.theme';
let backendProjects = [];
let animationPlan = null;
let clonePollToken = 0;

const byId = (id) => document.getElementById(id);

const readProjects = () => {
    try {
        const value = JSON.parse(localStorage.getItem(PROJECTS_KEY) || '[]');
        return Array.isArray(value) ? value : [];
    } catch (error) {
        console.warn('Could not read local project metadata:', error);
        return [];
    }
};

const writeProjects = (projects) => {
    localStorage.setItem(PROJECTS_KEY, JSON.stringify(projects));
};

const syncProjectsFromBackend = async () => {
    try {
        const response = await fetch('/api/projects', { headers: { accept: 'application/json' } });
        if (!response.ok) throw new Error(`Project API returned ${response.status}`);
        const payload = await response.json();
        backendProjects = Array.isArray(payload.projects) ? payload.projects : [];
        if (backendProjects.length) {
            writeProjects(backendProjects);
        }
        renderProjectList();
        return true;
    } catch (error) {
        console.info('[workbench] backend project API unavailable; using browser metadata fallback', error.message);
        return false;
    }
};

const setStatus = (element, message, { loading = false, error = false } = {}) => {
    if (!element) return;
    element.classList.toggle('error', error);
    element.replaceChildren();
    if (loading) {
        const spinner = document.createElement('span');
        spinner.className = 'workbench-spinner';
        spinner.setAttribute('aria-hidden', 'true');
        element.append(spinner);
    }
    const text = document.createElement('span');
    text.textContent = message;
    element.append(text);
};

const updateCloneProgress = (job, { visible = true } = {}) => {
    const progress = byId('clone-progress');
    const fill = byId('clone-progress-fill');
    const label = byId('clone-progress-label');
    if (!progress || !fill || !label) return;
    progress.hidden = !visible;
    const percent = Math.max(0, Math.min(100, Number(job?.progress) || 0));
    fill.style.width = `${percent}%`;
    label.textContent = `${percent}% · ${job?.status || 'queued'} · ${job?.message || 'Waiting for the clone worker…'}`;
};

const setTheme = (theme) => {
    const nextTheme = theme === 'dark' ? 'dark' : 'light';
    document.body.dataset.theme = nextTheme;
    localStorage.setItem(THEME_KEY, nextTheme);
    const button = byId('theme-button');
    if (button) {
        button.textContent = nextTheme === 'dark' ? 'Light' : 'Dark';
        button.setAttribute('aria-label', `Switch to ${nextTheme === 'dark' ? 'light' : 'dark'} theme`);
    }
};

const openDrawer = () => {
    const drawer = byId('ai-drawer');
    const scrim = byId('workbench-scrim');
    drawer?.classList.add('active');
    drawer?.setAttribute('aria-hidden', 'false');
    scrim?.classList.add('active');
    scrim?.setAttribute('aria-hidden', 'false');
};

const closeDrawer = () => {
    const drawer = byId('ai-drawer');
    const scrim = byId('workbench-scrim');
    drawer?.classList.remove('active');
    drawer?.setAttribute('aria-hidden', 'true');
    scrim?.classList.remove('active');
    scrim?.setAttribute('aria-hidden', 'true');
};

const openProjectDialog = () => {
    const layer = byId('project-dialog-layer');
    layer?.classList.add('active');
    layer?.setAttribute('aria-hidden', 'false');
    renderProjectList();
};

const closeProjectDialog = () => {
    const layer = byId('project-dialog-layer');
    layer?.classList.remove('active');
    layer?.setAttribute('aria-hidden', 'true');
};

const selectProject = (project) => {
    window.workbenchProject = project;
    document.body.dataset.projectId = project.id;
    const status = byId('clone-status');
    setStatus(status, `Project “${project.name}” is active. Backend workspace: ${project.id}`);
    closeProjectDialog();
    if (project.lastCloneJobId) void pollCloneJob(project.id, project.lastCloneJobId);
};

const renderProjectList = () => {
    const list = byId('project-list');
    if (!list) return;

    const projects = backendProjects.length ? backendProjects : readProjects();
    if (!projects.length) {
        list.innerHTML = '<div class="workbench-status"><span>No projects yet. Create one to establish the local workspace metadata.</span></div>';
        return;
    }

    list.innerHTML = projects.map((project) => `
        <div class="workbench-project-card">
            <div>
                <strong>${escapeHtml(project.name)}</strong>
                <small>${escapeHtml(project.sourceUrl || 'No source URL')} · ${new Date(project.createdAt).toLocaleString()}</small>
            </div>
            <button class="workbench-button" type="button" data-project-id="${escapeHtml(project.id)}">Load</button>
        </div>
    `).join('');

    list.querySelectorAll('[data-project-id]').forEach((button) => {
        button.addEventListener('click', () => {
            const project = projects.find((item) => item.id === button.dataset.projectId);
            if (project) selectProject(project);
        });
    });
};

const createProject = async () => {
    const name = window.prompt('Project name', 'Untitled website project');
    if (!name?.trim()) return;

    const sourceUrl = byId('clone-url')?.value.trim() || '';
    try {
        const response = await fetch('/api/projects', {
            method: 'POST',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify({ name: name.trim(), sourceUrl })
        });
        if (!response.ok) throw new Error(`Project API returned ${response.status}`);
        const payload = await response.json();
        const project = payload.project;
        backendProjects = [project, ...backendProjects.filter((item) => item.id !== project.id)];
        writeProjects(backendProjects);
        selectProject(project);
        return;
    } catch (error) {
        console.info('[workbench] creating project in browser metadata fallback:', error.message);
    }

    const project = {
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        name: name.trim(),
        sourceUrl,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        phase: 'browser-fallback'
    };
    backendProjects = [project, ...backendProjects];
    writeProjects([project, ...readProjects()]);
    selectProject(project);
};

const validateUrl = (value) => {
    try {
        const url = new URL(value);
        return url.protocol === 'http:' || url.protocol === 'https:';
    } catch {
        return false;
    }
};

const handleCloneRequest = async () => {
    const input = byId('clone-url');
    const status = byId('clone-status');
    const url = input?.value.trim() || '';

    if (!validateUrl(url)) {
        setStatus(status, 'Enter a complete http:// or https:// website URL.', { error: true });
        input?.focus();
        return;
    }

    const projects = readProjects();
    const project = window.workbenchProject || projects.find((item) => item.sourceUrl === url);
    if (!project) {
        setStatus(status, 'Create or load a project first. The clone worker will write only inside the active project.', { error: true });
        openProjectDialog();
        return;
    }

    project.sourceUrl = url;
    project.lastCloneRequestAt = new Date().toISOString();
    writeProjects(projects.map((item) => item.id === project.id ? project : item));
    window.workbenchProject = project;

    try {
        const response = await fetch(`/api/projects/${encodeURIComponent(project.id)}/clone`, {
            method: 'POST',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify({ url })
        });
        if (!response.ok) throw new Error(`Clone API returned ${response.status}`);
        const payload = await response.json();
        const job = payload.job;
        updateCloneProgress(job);
        setStatus(status, `Clone job ${job.id} queued. Local worker started.`, { loading: true });
        pollCloneJob(project.id, job.id);
        return;
    } catch (error) {
        setStatus(status, `Clone metadata saved locally, but the backend worker could not be reached: ${error.message}`, { error: true });
    }
};

const pollCloneJob = async (projectId, jobId) => {
    const status = byId('clone-status');
    const pollToken = ++clonePollToken;
    for (let attempt = 0; attempt < 600; attempt += 1) {
        await new Promise((resolve) => window.setTimeout(resolve, 500));
        if (pollToken !== clonePollToken) return;
        try {
            const response = await fetch(`/api/projects/${encodeURIComponent(projectId)}/jobs/${encodeURIComponent(jobId)}`);
            if (!response.ok) throw new Error(`Job API returned ${response.status}`);
            const payload = await response.json();
            const job = payload.job;
            updateCloneProgress(job);
            if (job.status === 'completed') {
                const project = { ...window.workbenchProject, previewUrl: job.previewUrl, screenshotUrl: job.screenshotUrl, phase: 'browser-capture-ready', lastCloneJobId: job.id };
                window.workbenchProject = project;
                const projects = readProjects().map((item) => item.id === project.id ? project : item);
                writeProjects(projects);
                setStatus(status, `Clone ready: ${job.message}. Open the preview or rendered capture.`);
                updateCloneProgress(job);
                return;
            }
            if (job.status === 'failed') {
                setStatus(status, `Clone failed: ${job.message}`, { error: true });
                updateCloneProgress(job);
                return;
            }
            setStatus(status, `${job.message || 'Clone worker running'} (${job.progress || 0}%)`, { loading: true });
        } catch (error) {
            setStatus(status, `Clone status unavailable: ${error.message}`, { error: true });
            return;
        }
    }
    setStatus(status, 'Clone is still running. Progress will continue updating here; preview buttons unlock when it completes.', { loading: true });
};

const handleCaptureRequest = () => {
    const screenshotUrl = window.workbenchProject?.screenshotUrl;
    if (screenshotUrl && screenshotUrl.startsWith('/projects/')) {
        window.open(screenshotUrl, '_blank', 'noopener,noreferrer');
        return;
    }
    setStatus(byId('clone-status'), 'No Playwright capture is available for this project yet.', { error: true });
};

const handleImportRequest = async () => {
    const status = byId('clone-status');
    const projectId = window.workbenchProject?.id;
    if (!projectId) {
        setStatus(status, 'Create or load a project before importing a clone.', { error: true });
        openProjectDialog();
        return;
    }
    if (!window.htmlEditor) {
        setStatus(status, 'The GrapesJS editor is not ready yet. Wait for the canvas to load and try again.', { error: true });
        return;
    }
    try {
        setStatus(status, 'Loading the normalized clone package…', { loading: true });
        const packageResponse = await fetch(`/api/projects/${encodeURIComponent(projectId)}/package`);
        if (!packageResponse.ok) throw new Error('No completed clone package was found for this project');
        const { package: manifest } = await packageResponse.json();
        const htmlResponse = await fetch(manifest.indexUrl);
        if (!htmlResponse.ok) throw new Error(`Package HTML returned ${htmlResponse.status}`);
        const html = await htmlResponse.text();
        const documentFragment = new DOMParser().parseFromString(html, 'text/html');
        const packageBase = new URL(manifest.indexUrl, window.location.href);
        if (manifest.motionUrl) {
            const hero = documentFragment.querySelector('main > section');
            if (hero) {
                hero.classList.add('html-editor-motion-hero');
                const motionVideo = documentFragment.createElement('video');
                motionVideo.className = 'html-editor-motion-video';
                motionVideo.src = new URL(manifest.motionUrl, window.location.href).href;
                motionVideo.autoplay = true;
                motionVideo.loop = true;
                motionVideo.muted = true;
                motionVideo.playsInline = true;
                motionVideo.setAttribute('aria-hidden', 'true');
                hero.prepend(motionVideo);
            }
        }
        documentFragment.querySelectorAll('[src], [poster]').forEach((element) => {
            for (const attribute of ['src', 'poster']) {
                const value = element.getAttribute(attribute);
                if (value && !value.startsWith('data:') && !value.startsWith('#')) element.setAttribute(attribute, new URL(value, packageBase).href);
            }
        });
        const styles = [];
        for (const link of documentFragment.querySelectorAll('link[rel="stylesheet"][href]')) {
            try {
                const cssResponse = await fetch(new URL(link.getAttribute('href'), new URL(manifest.indexUrl, window.location.href)).href);
                if (cssResponse.ok) styles.push((await cssResponse.text()).replace(/url\(\s*["']?([^"')]+)["']?\s*\)/gi, (match, value) => `url(${new URL(value, new URL(link.href, packageBase)).href})`));
            } catch (error) {
                console.info('[workbench] stylesheet import skipped:', error.message);
            }
        }
        if (manifest.motionUrl) styles.push('.html-editor-motion-hero{position:relative;overflow:hidden}.html-editor-motion-hero>.html-editor-motion-video{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;z-index:0;pointer-events:none}.html-editor-motion-hero> :not(.html-editor-motion-video){position:relative;z-index:1}.html-editor-motion-hero canvas{display:none!important}');
        window.htmlEditor.setComponents(documentFragment.body?.innerHTML || html);
        if (styles.length) window.htmlEditor.setStyle(styles.join('\n'));
        setStatus(status, `Imported clone package into the editor: ${manifest.assets.length} local assets referenced.`);
    } catch (error) {
        setStatus(status, `Could not import clone package: ${error.message}`, { error: true });
    }
};

const handlePreviewRequest = () => {
    const status = byId('clone-status');
    const previewUrl = window.workbenchProject?.previewUrl;
    if (previewUrl && (/^https?:\/\/127\.0\.0\.1(?::\d+)?\//.test(previewUrl) || previewUrl.startsWith('/projects/'))) {
        window.open(previewUrl, '_blank', 'noopener,noreferrer');
        return;
    }
    setStatus(status, 'No local preview is registered for this project yet. The preview worker will provide one after cloning.', { error: true });
};

const handleImageSelection = () => {
    const projectId = window.workbenchProject?.id;
    if (!projectId) {
        setStatus(byId('animation-status'), 'Create or load a project before opening the SVG workspace.', { error: true });
        openProjectDialog();
        return;
    }
    window.open(`svg-workspace.html?project=${encodeURIComponent(projectId)}`, '_blank', 'noopener,noreferrer');
};

const handleAnimationPlan = () => {
    const prompt = byId('animation-prompt')?.value.trim();
    const mode = byId('animation-mode')?.value || 'timeline';
    const provider = byId('animation-provider')?.value || 'pinepaper';
    const status = byId('animation-status');
    if (!prompt) {
        setStatus(status, 'Describe the desired animation before planning.', { error: true });
        return;
    }
    const modeLabel = mode === 'relations' ? 'relation / behavior-driven' : 'timeline / keyframe';
    if (provider !== 'pinepaper') {
        setStatus(status, 'SVGator is not configured. Use PinePaper MCP for this phase.', { error: true });
        return;
    }
    setStatus(status, `Ollama is planning a ${modeLabel} animation…`, { loading: true });
    fetch('/api/animation/plan', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ prompt, mode, provider: 'ollama' }) })
        .then(async (response) => { const payload = await response.json(); if (!response.ok) throw new Error(payload.error || `Planning failed (${response.status})`); return payload.plan; })
        .then((plan) => {
            animationPlan = plan;
            const output = byId('animation-plan-output');
            if (output) { output.style.display = 'block'; output.textContent = JSON.stringify(plan, null, 2); }
            setStatus(status, `Plan ready for ${modeLabel}. Review it, then submit to PinePaper.`);
        })
        .catch((error) => setStatus(status, `Ollama planning failed: ${error.message}`, { error: true }));
};

const handleAnimationSubmit = async () => {
    const status = byId('animation-status');
    const projectId = window.workbenchProject?.id;
    if (!projectId) return setStatus(status, 'Create or load a project before submitting animation.', { error: true });
    if (!animationPlan) return setStatus(status, 'Plan the animation first.', { error: true });
    if (byId('animation-provider')?.value !== 'pinepaper') return setStatus(status, 'SVGator is not configured yet. Select PinePaper MCP.', { error: true });
    setStatus(status, 'Submitting the validated plan to PinePaper MCP…', { loading: true });
    try {
        const response = await fetch(`/api/projects/${encodeURIComponent(projectId)}/animation/submit`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ plan: animationPlan }) });
        const payload = await response.json();
        if (!response.ok) throw new Error(payload.error || `PinePaper returned ${response.status}`);
        const result = payload.result;
        setStatus(status, result.svgUrl ? `PinePaper animation exported. Open ${result.svgUrl} to inspect the animated SVG.` : `PinePaper generated code-mode output. Review ${result.codeUrl}.`);
    } catch (error) {
        setStatus(status, `PinePaper submission failed: ${error.message}`, { error: true });
    }
};

const escapeHtml = (value) => String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');

const initWorkbench = () => {
    setTheme(localStorage.getItem(THEME_KEY) || 'light');

    byId('ai-button')?.addEventListener('click', openDrawer);
    byId('ai-close')?.addEventListener('click', closeDrawer);
    byId('workbench-scrim')?.addEventListener('click', closeDrawer);
    byId('theme-button')?.addEventListener('click', () => {
        setTheme(document.body.dataset.theme === 'dark' ? 'light' : 'dark');
    });

    byId('project-button')?.addEventListener('click', openProjectDialog);
    byId('project-close')?.addEventListener('click', closeProjectDialog);
    byId('project-dialog-layer')?.addEventListener('click', (event) => {
        if (event.target === event.currentTarget) closeProjectDialog();
    });
    byId('new-project-button')?.addEventListener('click', createProject);
    byId('load-project-folder-button')?.addEventListener('click', () => {
        setStatus(byId('clone-status'), 'Folder selection will be connected to the local backend so project paths can be chosen safely.', { error: true });
        closeProjectDialog();
    });

    byId('clone-button')?.addEventListener('click', handleCloneRequest);
    byId('load-project-button')?.addEventListener('click', openProjectDialog);
    byId('preview-button')?.addEventListener('click', handlePreviewRequest);
    byId('capture-button')?.addEventListener('click', handleCaptureRequest);
    byId('import-button')?.addEventListener('click', handleImportRequest);
    byId('image-svg-button')?.addEventListener('click', handleImageSelection);
    byId('animation-plan-button')?.addEventListener('click', handleAnimationPlan);
    byId('animation-submit-button')?.addEventListener('click', handleAnimationSubmit);
    byId('svg-workspace-button')?.addEventListener('click', () => {
        window.open('svgedit/src/editor/index.html', '_blank', 'noopener,noreferrer');
    });

    document.addEventListener('keydown', (event) => {
        if (event.key === 'Escape') {
            closeDrawer();
            closeProjectDialog();
        }
    });

    window.addEventListener('paste', (event) => {
        const image = Array.from(event.clipboardData?.items || []).find((item) => item.type.startsWith('image/'));
        if (!image) return;
        const file = image.getAsFile();
        if (file) {
            const projectId = window.workbenchProject?.id;
            if (projectId) window.open(`svg-workspace.html?project=${encodeURIComponent(projectId)}`, '_blank', 'noopener,noreferrer');
            setStatus(byId('animation-status'), `Pasted ${file.type} image. Open the SVG workspace to convert it with VTracer.`);
            openDrawer();
        }
    });

    renderProjectList();
    void syncProjectsFromBackend();
    console.info('[workbench] Phase 1 UI shell initialized');
};

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initWorkbench, { once: true });
} else {
    initWorkbench();
}
