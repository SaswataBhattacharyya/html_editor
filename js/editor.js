/* global fabric */

const editor = grapesjs.init({
    container: '#gjs',
    height: '100vh',
    width: 'auto',
    dragMode: 'absolute',
    storageManager: false,
    panels: {
        defaults: [
            {
                id: 'layers',
                el: '.layers-container',
                resizable: {
                    tc: false,
                    cr: false,
                    cl: false,
                    bc: false,
                },
                buttons: []
            },
            {
                id: 'styles',
                el: '#styles-container',
                resizable: {
                    tc: false,
                    cr: false,
                    cl: false,
                    bc: false,
                },
                buttons: []
            },
            {
                id: 'panel-switcher',
                el: '.panel__switcher',
                buttons: [
                    {
                        id: 'show-layers',
                        active: true,
                        label: 'Layers',
                        command: 'show-layers',
                        togglable: false
                    },
                    {
                        id: 'show-style',
                        label: 'Styles',
                        command: 'show-styles',
                        togglable: false
                    }
                ],
            }
        ]
    },
    deviceManager: {
        devices: [
            {
                name: 'Desktop',
                width: '',
            },
            {
                name: 'Mobile',
                width: '320px',
                widthMedia: '480px',
            }
        ]
    },
    blockManager: {
        appendTo: '#blocks',
        blockCategories: [
            { id: 'layout', label: 'Layout', open: true },
            { id: 'basic', label: 'Basic' }
        ],
        blocks: [
            {
                id: 'section',
                label: 'Section',
                attributes: { class: 'gjs-block-section' },
                content: `<section>
                    <h1>This is a simple title</h1>
                    <p>This is just a Lorem text: Lorem ipsum dolor sit amet</p>
                </section>`,
                category: 'basic',
            },
            {
                id: 'flex-row',
                label: 'Flex Row',
                attributes: { class: 'gjs-block-section' },
                content: `<div style="display: flex; flex-direction: row; justify-content: space-between; align-items: center; padding: 10px; min-height: 100px; background-color: #f8f9fa; border: 1px dashed #dee2e6;">
                    <div style="flex: 1; padding: 10px; min-height: 50px; background-color: #e9ecef; border: 1px dashed #ced4da;">Column 1</div>
                    <div style="flex: 1; padding: 10px; min-height: 50px; background-color: #e9ecef; border: 1px dashed #ced4da;">Column 2</div>
                </div>`,
                category: 'Layout',
            },
            {
                id: 'flex-column',
                label: 'Column',
                attributes: { class: 'gjs-block-section' },
                content: `<div style="flex: 1; padding: 10px; min-height: 50px; background-color: #e9ecef; border: 1px dashed #ced4da;">
                    <p>Column content</p>
                </div>`,
                category: 'Layout',
            },
            {
                id: 'two-columns',
                label: '2 Columns',
                attributes: { class: 'gjs-block-section' },
                content: `<div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px; padding: 10px; min-height: 100px; background-color: #f8f9fa; border: 1px dashed #dee2e6;">
                    <div style="padding: 10px; min-height: 50px; background-color: #e9ecef; border: 1px dashed #ced4da;">Column 1</div>
                    <div style="padding: 10px; min-height: 50px; background-color: #e9ecef; border: 1px dashed #ced4da;">Column 2</div>
                </div>`,
                category: 'Layout',
            },
            {
                id: 'three-columns',
                label: '3 Columns',
                attributes: { class: 'gjs-block-section' },
                content: `<div style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 20px; padding: 10px; min-height: 100px; background-color: #f8f9fa; border: 1px dashed #dee2e6;">
                    <div style="padding: 10px; min-height: 50px; background-color: #e9ecef; border: 1px dashed #ced4da;">Column 1</div>
                    <div style="padding: 10px; min-height: 50px; background-color: #e9ecef; border: 1px dashed #ced4da;">Column 2</div>
                    <div style="padding: 10px; min-height: 50px; background-color: #e9ecef; border: 1px dashed #ced4da;">Column 3</div>
                </div>`,
                category: 'Layout',
            },
            {
                id: 'text',
                label: 'Text',
                content: '<div data-gjs-type="text">Insert your text here</div>',
                category: 'basic',
            },
            {
                id: 'image',
                label: 'Image',
                select: true,
                content: {
                    type: 'image',
                    style: { position: 'absolute' }
                },
                activate: true,
                category: 'basic',
            },
            {
                id: 'button',
                label: 'Button',
                content: {
                    type: 'button',
                    content: 'Click me',
                    style: {
                        'display': 'inline-block',
                        'padding': '10px 20px',
                        'background-color': '#4CAF50',
                        'color': 'white',
                        'border': 'none',
                        'border-radius': '8px',
                        'cursor': 'pointer',
                        'font-size': '16px',
                        'text-align': 'center'
                    }
                },
                category: 'basic',
            },
            {
                id: 'image-with-text',
                label: 'Image + Text',
                attributes: { class: 'gjs-block-section' },
                content: `<div style="display: flex; align-items: flex-start; gap: 20px; padding: 10px; background-color: #f8f9fa; border: 1px dashed #dee2e6;">
                    <div style="flex: 1; display: flex; flex-direction: column; align-items: center; width: 100%;">
                        <div style="width: 100%; overflow: hidden; display: flex; justify-content: center; align-items: center; background-color: #e9ecef; border: 1px solid #dee2e6; border-radius: 4px; padding: 10px;">
                            <img src="data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTAwIiBoZWlnaHQ9IjEwMCIgdmlld0JveD0iMCAwIDEwMCAxMDAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxyZWN0IHdpZHRoPSIxMDAiIGhlaWdodD0iMTAwIiBmaWxsPSIjRThFOEU4Ii8+CjxwYXRoIGQ9Ik01MC41IDQyLjVDNTAuNSA0Ni42NDIxIDQ3LjE0MjEgNTAgNDMgNTBDMzguODU3OSA1MCAzNS41IDQ2LjY0MjEgMzUuNSA0Mi41QzM1LjUgMzguMzU3OSAzOC44NTc5IDM1IDQzIDM1QzQ3LjE0MjEgMzUgNTAuNSAzOC4zNTc5IDUwLjUgNDIuNVoiIGZpbGw9IiM5QTlBOUEiLz4KPHBhdGggZD0iTTc2LjUgNjhDNzYuNSA1Ni40MDIgNjcuMzQ4IDQ3IDU1Ljc1IDQ3SDQ0LjI1QzMyLjY1MiA0NyAyMy41IDU2LjQwMiAyMy41IDY4VjcwSDc2LjVWNjhaIiBmaWxsPSIjOUE5QTlBIi8+Cjwvc3ZnPgo=" style="width: auto; height: auto; max-width: 100%; max-height: 250px;" alt="Placeholder image">
                        </div>
                        <div style="width: 100%; padding: 8px; font-size: 14px; color: #6c757d; text-align: center; font-style: italic; margin-top: 8px;" data-gjs-type="text">Image caption or legend</div>
                    </div>
                    <div style="flex: 2;">
                        <h3 style="margin-top:0;">Image with Text</h3>
                        <p>This is a block with an image next to some text. Drag and drop your own content here.</p>
                    </div>
                </div>`,
                category: 'Layout',
            }
        ]
    },
    layerManager: {
        appendTo: '.layers-container'
    },
    styleManager: {
        appendTo: '#styles-container',
        sectors: [
            {
                name: 'Dimension',
                open: false,
                buildProps: ['width', 'min-height', 'padding', 'margin']
            },
            {
                name: 'Typography',
                open: false,
                buildProps: ['font-family', 'font-size', 'font-weight', 'letter-spacing', 'color', 'line-height', 'text-align', 'text-transform'],
                properties: [
                    {
                        property: 'color',
                        type: 'color',
                        defaults: '#000000'
                    },
                    {
                        property: 'text-transform',
                        type: 'select',
                        defaults: 'none',
                        options: [
                            { value: 'none', name: 'None' },
                            { value: 'uppercase', name: 'Uppercase' },
                            { value: 'lowercase', name: 'Lowercase' },
                            { value: 'capitalize', name: 'Capitalize' }
                        ]
                    }
                ]
            },
            {
                name: 'Decorations',
                open: false,
                buildProps: ['background-color', 'border-radius', 'border', 'box-shadow', 'opacity', 'cursor'],
                properties: [
                    {
                        property: 'background-color',
                        type: 'color',
                        defaults: '#ffffff'
                    },
                    {
                        property: 'border-color',
                        type: 'color',
                        defaults: '#000000'
                    },
                    {
                        property: 'border-radius',
                        type: 'composite',
                        properties: [
                            { property: 'border-top-left-radius', name: 'Top Left', units: ['px', '%'] },
                            { property: 'border-top-right-radius', name: 'Top Right', units: ['px', '%'] },
                            { property: 'border-bottom-right-radius', name: 'Bottom Right', units: ['px', '%'] },
                            { property: 'border-bottom-left-radius', name: 'Bottom Left', units: ['px', '%'] }
                        ]
                    },
                    {
                        property: 'cursor',
                        type: 'select',
                        defaults: 'auto',
                        options: [
                            { value: 'auto', name: 'Auto' },
                            { value: 'pointer', name: 'Pointer' },
                            { value: 'default', name: 'Default' }
                        ]
                    }
                ]
            }
        ]
    },
    canvas: {
        styles: ['dist/output.css']
    }
});

// Add panels
editor.Panels.addPanel({
    id: 'panel-top',
    el: '.panel__top'
});

editor.Panels.addPanel({
    id: 'basic-actions',
    el: '.panel__basic-actions',
    buttons: [
        {
            id: 'visibility',
            active: true,
            className: 'btn-toggle-borders',
            label: '<u>B</u>',
            command: 'sw-visibility',
            attributes: {
                'data-dropdown': 'true'
            }
        },
        {
            id: 'save',
            className: 'btn-save',
            label: '💾 Save',
            command: 'save-template'
        },
        {
            id: 'export',
            className: 'btn-open-export',
            label: 'Exp',
            command: 'export-template'
        },
        {
            id: 'show-json',
            className: 'btn-show-json',
            label: 'JSON',
            context: 'show-json',
            command(editor) {
                editor.Modal.setTitle('Components JSON')
                    .setContent(`<textarea style="width:100%; height: 250px;">
                        ${JSON.stringify(editor.getComponents(), null, 2)}
                    </textarea>`)
                    .open();
            }
        },
        {
            id: 'load-html',
            className: 'btn-load',
            label: '📂 Load',
            command: 'load-html'
        },
        {
            id: 'toggle-files',
            className: 'btn-toggle-files',
            label: '📁 Files',
            command: 'toggle-file-explorer'
        },
        {
            id: 'fabric-draw-toggle',
            className: 'btn-fabric-draw',
            label: '✏️ Draw',
            command: 'fabric-toggle-draw',
            togglable: true,
            attributes: {
                title: 'Toggle Fabric draw mode'
            }
        },
        {
            id: 'fabric-commit',
            className: 'btn-fabric-commit',
            label: '✅ Commit',
            command: 'fabric-commit-drawing',
            attributes: {
                title: 'Commit drawing to canvas',
                disabled: 'true'
            }
        }
    ]
});

// Add a file explorer panel
editor.Panels.addPanel({
    id: 'file-explorer',
    el: '.file-explorer-container',
    resizable: {
        tc: false,
        cr: false,
        cl: false,
        bc: false,
    },
    buttons: []
});

const fabricDrawingIntegration = ((editorInstance) => {
    const state = {
        fabricCanvas: null,
        overlayCanvasEl: null,
        wrapperEl: null,
        resizeObserver: null,
        toolboxEl: null,
        isActive: false,
        currentTool: 'select',
        keyListener: null
    };

    const TOOL_DEFINITIONS = [
        { id: 'select', label: 'Select' },
        { id: 'free', label: 'Free Draw' },
        { id: 'rect', label: 'Rectangle' },
        { id: 'ellipse', label: 'Ellipse' },
        { id: 'arrow', label: 'Arrow' },
        { id: 'text', label: 'Text' },
    ];

    const COLORS = {
        stroke: '#1f2937',
        fillTransparent: 'rgba(0,0,0,0)'
    };

    const ensureFabricAvailable = () => {
        if (typeof fabric === 'undefined') {
            editorInstance.Modal.setTitle('Fabric.js not loaded')
                .setContent('<div style="padding:16px;">Fabric.js could not be found. Ensure the library is loaded and try again.</div>')
                .open();
            return false;
        }
        return true;
    };

    const getCommitButton = () => editorInstance.Panels.getButton('basic-actions', 'fabric-commit');
    const getToggleButton = () => editorInstance.Panels.getButton('basic-actions', 'fabric-draw-toggle');

    const syncCommitButtonState = () => {
        const commitButton = getCommitButton();
        if (!commitButton) return;
        const hasObjects = state.fabricCanvas ? state.fabricCanvas.getObjects().length > 0 : false;
        const shouldDisable = !state.isActive || !hasObjects;
        const attributes = Object.assign({}, commitButton.get('attributes') || {});
        if (shouldDisable) {
            attributes.disabled = 'true';
            commitButton.set('attributes', attributes);
            if (commitButton.view && commitButton.view.el) {
                commitButton.view.el.setAttribute('disabled', 'true');
            }
        } else {
            delete attributes.disabled;
            commitButton.set('attributes', attributes);
            if (commitButton.view && commitButton.view.el) {
                commitButton.view.el.removeAttribute('disabled');
            }
        }
    };

    const createToolbox = () => {
        if (state.toolboxEl) return state.toolboxEl;
        const panelTop = document.querySelector('.panel__top');
        if (!panelTop) return null;

        const toolbox = document.createElement('div');
        toolbox.className = 'fabric-draw-toolbar';

        TOOL_DEFINITIONS.forEach((tool) => {
            const btn = document.createElement('button');
            btn.type = 'button';
            btn.dataset.tool = tool.id;
            btn.textContent = tool.label;
            if (tool.id === state.currentTool) {
                btn.classList.add('active');
            }
            toolbox.appendChild(btn);
        });

        const clearBtn = document.createElement('button');
        clearBtn.type = 'button';
        clearBtn.dataset.action = 'clear';
        clearBtn.textContent = 'Clear';
        toolbox.appendChild(clearBtn);

        toolbox.addEventListener('click', (event) => {
            const button = event.target.closest('button');
            if (!button) return;
            if (button.dataset.action === 'clear') {
                clearOverlay();
                return;
            }
            if (button.dataset.tool) {
                setTool(button.dataset.tool);
            }
        });

        panelTop.appendChild(toolbox);
        state.toolboxEl = toolbox;
        return toolbox;
    };

    const setToolboxVisibility = (visible) => {
        const toolbox = createToolbox();
        if (!toolbox) return;
        if (visible) {
            toolbox.classList.add('active');
        } else {
            toolbox.classList.remove('active');
        }
    };

    const highlightActiveTool = () => {
        if (!state.toolboxEl) return;
        const buttons = state.toolboxEl.querySelectorAll('button[data-tool]');
        buttons.forEach((button) => {
            if (button.dataset.tool === state.currentTool) {
                button.classList.add('active');
            } else {
                button.classList.remove('active');
            }
        });
    };

    const ensureOverlay = () => {
        if (!ensureFabricAvailable()) return null;
        const canvasView = editorInstance.Canvas;
        const frameEl = canvasView.getFrameEl();
        if (!frameEl || !frameEl.contentDocument) {
            editorInstance.Modal.setTitle('Canvas not ready')
                .setContent('<div style="padding:16px;">Please wait for the editor canvas to finish loading and try again.</div>')
                .open();
            return null;
        }

        const frameDoc = frameEl.contentDocument;
        const wrapper = frameDoc.getElementById('wrapper') || frameDoc.body;
        state.wrapperEl = wrapper;

        if (getComputedStyle(wrapper).position === 'static') {
            wrapper.style.position = 'relative';
        }

        let overlay = frameDoc.getElementById('fabric-overlay-canvas');
        if (!overlay) {
            overlay = frameDoc.createElement('canvas');
            overlay.id = 'fabric-overlay-canvas';
            overlay.style.position = 'absolute';
            overlay.style.top = '0';
            overlay.style.left = '0';
            overlay.style.width = '100%';
            overlay.style.height = '100%';
            overlay.style.pointerEvents = 'none';
            overlay.style.background = 'transparent';
            overlay.style.zIndex = '9999';
            overlay.style.display = 'none';
            overlay.style.touchAction = 'none';
            wrapper.appendChild(overlay);
        }
        state.overlayCanvasEl = overlay;

        if (!state.fabricCanvas) {
            state.fabricCanvas = new fabric.Canvas(overlay, {
                selection: true,
                preserveObjectStacking: true,
                backgroundColor: null
            });
            state.fabricCanvas.renderOnAddRemove = true;
            state.fabricCanvas.on('mouse:down', handleCanvasPointer);
            state.fabricCanvas.on('object:added', syncCommitButtonState);
            state.fabricCanvas.on('object:removed', syncCommitButtonState);
            state.fabricCanvas.on('object:modified', syncCommitButtonState);
        }

        syncOverlaySize();
        observeWrapper();
        return state.fabricCanvas;
    };

    const observeWrapper = () => {
        if (!state.wrapperEl || typeof ResizeObserver === 'undefined') return;
        if (state.resizeObserver) return;
        state.resizeObserver = new ResizeObserver(() => {
            syncOverlaySize();
        });
        state.resizeObserver.observe(state.wrapperEl);
    };

    const syncOverlaySize = () => {
        if (!state.overlayCanvasEl || !state.wrapperEl) return;
        const rect = state.wrapperEl.getBoundingClientRect();
        const width = Math.max(1, Math.round(rect.width));
        const height = Math.max(1, Math.round(rect.height));

        if (state.overlayCanvasEl.width !== width || state.overlayCanvasEl.height !== height) {
            state.overlayCanvasEl.width = width;
            state.overlayCanvasEl.height = height;
        }
        state.overlayCanvasEl.style.width = `${width}px`;
        state.overlayCanvasEl.style.height = `${height}px`;

        if (state.fabricCanvas) {
            state.fabricCanvas.setDimensions({ width, height });
            state.fabricCanvas.calcOffset();
            state.fabricCanvas.requestRenderAll();
        }
    };

    const setTool = (toolId) => {
        state.currentTool = toolId;
        highlightActiveTool();
        if (!state.fabricCanvas) return;
        if (toolId === 'free') {
            state.fabricCanvas.isDrawingMode = true;
            if (!state.fabricCanvas.freeDrawingBrush) {
                state.fabricCanvas.freeDrawingBrush = new fabric.PencilBrush(state.fabricCanvas);
            }
            state.fabricCanvas.freeDrawingBrush.color = COLORS.stroke;
            state.fabricCanvas.freeDrawingBrush.width = 4;
        } else {
            state.fabricCanvas.isDrawingMode = false;
        }
        state.fabricCanvas.defaultCursor = toolId === 'text' ? 'text' : toolId === 'select' ? 'default' : 'crosshair';
    };

    const handleCanvasPointer = (options) => {
        if (!state.isActive || !state.fabricCanvas) return;
        if (state.fabricCanvas.isDrawingMode) return;
        if (state.currentTool === 'select') return;
        if (options.target) return;
        const pointer = state.fabricCanvas.getPointer(options.e);
        const created = createObjectForTool(state.currentTool, pointer);
        if (created) {
            state.fabricCanvas.setActiveObject(created);
            state.fabricCanvas.requestRenderAll();
            syncCommitButtonState();
        }
    };

    const createObjectForTool = (tool, pointer) => {
        if (!state.fabricCanvas) return null;
        const { x, y } = pointer;
        switch (tool) {
            case 'rect': {
                const rect = new fabric.Rect({
                    left: x,
                    top: y,
                    originX: 'center',
                    originY: 'center',
                    width: 160,
                    height: 100,
                    fill: COLORS.fillTransparent,
                    stroke: COLORS.stroke,
                    strokeWidth: 2,
                    rx: 8,
                    ry: 8,
                    cornerColor: '#2563eb',
                    cornerStrokeColor: '#1e293b',
                    borderColor: '#2563eb',
                    cornerStyle: 'circle'
                });
                state.fabricCanvas.add(rect);
                return rect;
            }
            case 'ellipse': {
                const ellipse = new fabric.Ellipse({
                    left: x,
                    top: y,
                    originX: 'center',
                    originY: 'center',
                    rx: 80,
                    ry: 50,
                    fill: COLORS.fillTransparent,
                    stroke: COLORS.stroke,
                    strokeWidth: 2,
                    cornerColor: '#2563eb',
                    borderColor: '#2563eb',
                    cornerStyle: 'circle'
                });
                state.fabricCanvas.add(ellipse);
                return ellipse;
            }
            case 'arrow': {
                const arrowPath = new fabric.Path('M 0 6 L 70 6 L 70 0 L 120 20 L 70 40 L 70 34 L 0 34 z', {
                    left: x,
                    top: y,
                    originX: 'center',
                    originY: 'center',
                    fill: COLORS.stroke,
                    stroke: COLORS.stroke,
                    strokeWidth: 1,
                    cornerColor: '#2563eb',
                    borderColor: '#2563eb',
                    cornerStyle: 'circle'
                });
                state.fabricCanvas.add(arrowPath);
                return arrowPath;
            }
            case 'text': {
                const text = new fabric.IText('Double-click to edit', {
                    left: x,
                    top: y,
                    originX: 'left',
                    originY: 'top',
                    fontSize: 24,
                    fill: COLORS.stroke,
                    fontFamily: 'Arial',
                    editable: true
                });
                state.fabricCanvas.add(text);
                text.enterEditing();
                text.selectAll();
                return text;
            }
            default:
                return null;
        }
    };

    const clearOverlay = () => {
        if (state.fabricCanvas) {
            state.fabricCanvas.clear();
            state.fabricCanvas.backgroundColor = null;
            syncCommitButtonState();
        }
    };

    const attachKeyListener = () => {
        if (state.keyListener) return;
        state.keyListener = (event) => {
            if (!state.isActive || !state.fabricCanvas) return;
            if (event.key === 'Delete' || event.key === 'Backspace') {
                const active = state.fabricCanvas.getActiveObjects();
                if (active.length) {
                    event.preventDefault();
                    active.forEach((obj) => state.fabricCanvas.remove(obj));
                    state.fabricCanvas.discardActiveObject();
                    state.fabricCanvas.requestRenderAll();
                    syncCommitButtonState();
                }
            }
        };
        document.addEventListener('keydown', state.keyListener);
    };

    const detachKeyListener = () => {
        if (!state.keyListener) return;
        document.removeEventListener('keydown', state.keyListener);
        state.keyListener = null;
    };

    const enterDrawMode = () => {
        const canvas = ensureOverlay();
        if (!canvas) return false;
        state.isActive = true;
        setToolboxVisibility(true);
        setTool(state.currentTool || 'select');
        state.overlayCanvasEl.style.display = 'block';
        state.overlayCanvasEl.style.pointerEvents = 'auto';
        canvas.discardActiveObject();
        canvas.defaultCursor = 'crosshair';
        attachKeyListener();
        syncCommitButtonState();
        return true;
    };

    const exitDrawMode = () => {
        if (!state.overlayCanvasEl || !state.fabricCanvas) {
            state.isActive = false;
            setToolboxVisibility(false);
            syncCommitButtonState();
            detachKeyListener();
            return;
        }
        state.isActive = false;
        state.fabricCanvas.isDrawingMode = false;
        state.fabricCanvas.discardActiveObject();
        state.overlayCanvasEl.style.pointerEvents = 'none';
        state.overlayCanvasEl.style.display = 'none';
        setToolboxVisibility(false);
        detachKeyListener();
        syncCommitButtonState();
    };

    const cloneObject = (object) => new Promise((resolve) => {
        object.clone((cloned) => resolve(cloned));
    });

    const exportToSvg = async () => {
        if (!state.fabricCanvas) return null;
        const objects = state.fabricCanvas.getObjects();
        if (!objects.length) return null;

        const bounds = objects.reduce((acc, obj) => {
            const rect = obj.getBoundingRect(true, true);
            return {
                minX: Math.min(acc.minX, rect.left),
                minY: Math.min(acc.minY, rect.top),
                maxX: Math.max(acc.maxX, rect.left + rect.width),
                maxY: Math.max(acc.maxY, rect.top + rect.height)
            };
        }, { minX: Infinity, minY: Infinity, maxX: -Infinity, maxY: -Infinity });

        const width = Math.max(1, Math.round(bounds.maxX - bounds.minX));
        const height = Math.max(1, Math.round(bounds.maxY - bounds.minY));

        const clones = await Promise.all(objects.map((obj) => cloneObject(obj)));
        const tempCanvas = new fabric.StaticCanvas(null, {
            width,
            height,
            backgroundColor: null
        });

        clones.forEach((clone) => {
            clone.set({
                left: clone.left - bounds.minX,
                top: clone.top - bounds.minY
            });
            tempCanvas.add(clone);
        });

        tempCanvas.renderAll();
        const svg = tempCanvas.toSVG({
            suppressPreamble: true,
            viewBox: {
                x: 0,
                y: 0,
                width,
                height
            }
        });
        tempCanvas.dispose();
        return {
            svgMarkup: svg,
            left: Math.round(bounds.minX),
            top: Math.round(bounds.minY),
            width,
            height
        };
    };

    const commitDrawing = async () => {
        const canvas = ensureOverlay();
        if (!canvas || !state.fabricCanvas) return;
        const exportResult = await exportToSvg();
        if (!exportResult) {
            editorInstance.Modal.setTitle('Nothing to export')
                .setContent('<div style="padding:16px;">Draw something on the canvas before committing.</div>')
                .open();
            return;
        }

        const wrapperComponent = editorInstance.getWrapper();
        const { svgMarkup, left, top, width, height } = exportResult;
        const drawingHtml = `<div class="fabric-drawing" style="position:absolute; left:${left}px; top:${top}px; width:${width}px; height:${height}px;" data-gjs-type="fabric-drawing">${svgMarkup}</div>`;
        wrapperComponent.append(drawingHtml);

        clearOverlay();
        canvas.requestRenderAll();
        exitDrawMode();
        const toggleButton = getToggleButton();
        if (toggleButton) {
            toggleButton.set('active', false);
        }
    };

    return {
        enterDrawMode,
        exitDrawMode,
        commitDrawing,
        syncCommitButtonState
    };
})(editor);

editor.on('canvas:frame:load', () => {
    fabricDrawingIntegration.syncCommitButtonState();
});

editor.Commands.add('fabric-toggle-draw', {
    run(editorInstance, sender) {
        const started = fabricDrawingIntegration.enterDrawMode();
        if (!started) {
            sender && sender.set && sender.set('active', false);
        } else {
            fabricDrawingIntegration.syncCommitButtonState();
        }
    },
    stop() {
        fabricDrawingIntegration.exitDrawMode();
        fabricDrawingIntegration.syncCommitButtonState();
    }
});

editor.Commands.add('fabric-commit-drawing', {
    async run() {
        await fabricDrawingIntegration.commitDrawing();
        fabricDrawingIntegration.syncCommitButtonState();
    }
});

// Custom color picker implementation
editor.on('load', () => {
    // Wait for components to fully render
    setTimeout(() => {
        // Initialize click handlers for all color pickers
        const initializeColorPickers = () => {
            const colorPickers = document.querySelectorAll('.gjs-field-color-picker');

            colorPickers.forEach(picker => {
                // Remove any existing event listeners
                const newPicker = picker.cloneNode(true);
                if (picker.parentNode) {
                    picker.parentNode.replaceChild(newPicker, picker);
                }

                newPicker.addEventListener('click', function (e) {
                    e.stopPropagation();

                    // Get current color
                    let currentColor = '#ffffff';
                    if (this.style.backgroundColor) {
                        currentColor = this.style.backgroundColor;
                        // Convert RGB to hex if needed
                        if (currentColor.startsWith('rgb')) {
                            const rgb = currentColor.match(/\d+/g);
                            if (rgb && rgb.length === 3) {
                                currentColor = `#${Number(rgb[0]).toString(16).padStart(2, '0')}${Number(rgb[1]).toString(16).padStart(2, '0')}${Number(rgb[2]).toString(16).padStart(2, '0')}`;
                            }
                        }
                    } else {
                        // Try to get color from input
                        const input = this.closest('.gjs-field-colorp-c').querySelector('input[type="text"]');
                        if (input && input.value) {
                            currentColor = input.value;
                        }
                    }

                    // Get the property and related elements
                    const colorPickerField = this.closest('.gjs-field-colorp-c');
                    const styleProperty = colorPickerField.closest('.gjs-sm-property');
                    const inputField = colorPickerField.querySelector('input[type="text"]');

                    // Use the React-based color picker
                    if (window.colorPickerManager) {
                        window.colorPickerManager.open(
                            this,
                            currentColor,
                            (newColor) => {
                                // Find the actual input field
                                // First look for the parent property container
                                const propertyContainer = colorPickerField.closest('.gjs-sm-property');

                                // Then find the input holder and input within it
                                const inputHolder = propertyContainer ? propertyContainer.querySelector('.gjs-input-holder') : null;
                                const realInputField = inputHolder ? inputHolder.querySelector('input') : null;

                                // Fall back to the color picker field's input if we can't find the real input
                                const targetInput = realInputField || inputField;

                                if (targetInput) {
                                    console.log("Found input to update:", targetInput);

                                    // Update the input value
                                    targetInput.value = newColor;

                                    // Focus the input
                                    targetInput.focus();

                                    // Trigger a sequence of events to ensure GrapesJS processes the change
                                    ['input', 'change', 'keydown', 'keyup'].forEach(eventType => {
                                        const event = new Event(eventType, { bubbles: true });
                                        if (eventType === 'keydown' || eventType === 'keyup') {
                                            // Simulate Enter key press to confirm the value
                                            event.key = 'Enter';
                                            event.keyCode = 13;
                                        }
                                        targetInput.dispatchEvent(event);
                                    });

                                    // Blur the input to finalize the change
                                    targetInput.blur();

                                    // Update the color picker's visual appearance
                                    this.style.backgroundColor = newColor;

                                    // Show a success notification
                                    const notification = document.createElement('div');
                                    notification.style.position = 'fixed';
                                    notification.style.top = '10px';
                                    notification.style.left = '50%';
                                    notification.style.transform = 'translateX(-50%)';
                                    notification.style.background = '#333';
                                    notification.style.color = '#fff';
                                    notification.style.padding = '10px 15px';
                                    notification.style.borderRadius = '4px';
                                    notification.style.zIndex = '100000';
                                    notification.textContent = `Color ${newColor} applied!`;

                                    document.body.appendChild(notification);
                                    setTimeout(() => notification.remove(), 2000);
                                } else {
                                    console.error("Could not find input field to update");
                                }
                            }
                        );
                    } else {
                        console.error("Color picker manager not found!");
                        // Fallback - use a standard color picker
                        const input = document.createElement('input');
                        input.type = 'color';
                        input.value = currentColor;
                        input.style.position = 'absolute';
                        input.style.left = '-9999px';
                        document.body.appendChild(input);

                        input.addEventListener('change', function () {
                            const newColor = this.value;

                            // Update the input field
                            if (inputField) {
                                inputField.value = newColor;

                                // Apply the color
                                const event = new Event('change', { bubbles: true });
                                inputField.dispatchEvent(event);

                                // Update visual appearance
                                newPicker.style.backgroundColor = newColor;
                            }

                            document.body.removeChild(this);
                        });

                        input.click();
                    }
                });
            });
        };

        // Initialize color pickers immediately
        initializeColorPickers();

        // Also initialize when style manager is shown or updated
        editor.on('styleManager:update', () => {
            setTimeout(initializeColorPickers, 100);
        });

        // Initialize when a component is selected
        editor.on('component:selected', () => {
            setTimeout(initializeColorPickers, 100);
        });

        // Handle B button dropdown
        const bButton = document.querySelector('.btn-toggle-borders');
        if (bButton) {
            const dropdownContent = document.createElement('div');
            dropdownContent.className = 'dropdown-content';
            dropdownContent.innerHTML = `
                <a href="#" class="active" data-command="sw-visibility">Toggle Borders</a>
                <a href="#" data-command="sw-visibility-all">Toggle All Borders</a>
                <a href="#" data-command="sw-visibility-none">Hide All Borders</a>
            `;
            bButton.appendChild(dropdownContent);

            // Toggle dropdown on button click
            bButton.addEventListener('click', (e) => {
                e.preventDefault();
                bButton.classList.toggle('active');
            });

            // Handle dropdown clicks
            dropdownContent.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation(); // Prevent dropdown from closing
                const command = e.target.getAttribute('data-command');
                if (command) {
                    editor.runCommand(command);
                    // Update active state
                    dropdownContent.querySelectorAll('a').forEach(a => a.classList.remove('active'));
                    e.target.classList.add('active');
                }
            });

            // Close dropdown when clicking outside
            document.addEventListener('click', (e) => {
                if (!bButton.contains(e.target)) {
                    bButton.classList.remove('active');
                }
            });
        }
    }, 500); // Wait for editor to fully initialize
});

// Commands
editor.Commands.add('set-device-desktop', {
    run: editor => editor.setDevice('Desktop')
});

editor.Commands.add('set-device-mobile', {
    run: editor => editor.setDevice('Mobile')
});

// Add Tailwind classes to the Style Manager
editor.StyleManager.addProperty('typography', {
    name: 'Tailwind Classes',
    property: 'class',
    type: 'select',
    defaults: '',
    options: [
        { value: 'text-sm', name: 'Small Text' },
        { value: 'text-base', name: 'Base Text' },
        { value: 'text-lg', name: 'Large Text' },
        { value: 'text-xl', name: 'Extra Large Text' },
        { value: 'font-bold', name: 'Bold' },
        { value: 'text-center', name: 'Center' },
        { value: 'text-right', name: 'Right' },
        { value: 'text-left', name: 'Left' }
    ]
});

// Make the canvas editable
editor.on('component:selected', () => {
    const selectedComponent = editor.getSelected();
    if (selectedComponent) {
        selectedComponent.set('editable', true);
    }
});

// Register custom button component
editor.DomComponents.addType('custom-button', {
    isComponent: el => {
        return el.tagName === 'BUTTON';
    },
    extend: 'text',
    model: {
        defaults: {
            tagName: 'button',
            name: 'Button',
            draggable: true,
            droppable: false,
            highlightable: true,
            selectable: true,
            layerable: true,
            editable: true,
            stylable: true,
            // Default button style
            style: {
                'display': 'inline-block',
                'padding': '10px 20px',
                'background-color': '#4CAF50',
                'color': 'white',
                'border': 'none',
                'border-radius': '8px',
                'cursor': 'pointer',
                'font-size': '16px',
                'text-align': 'center'
            },
            content: 'Click me',
        },
        init() {
            // This will be called once the model is created
            this.listenTo(this, 'change:attributes:id', this.handleIdChange);

            // Initialize with proper styling capabilities
            this.get('stylable') && (
                // Make sure these properties are always stylable
                this.set('stylable', [
                    // Dimension properties
                    'width', 'height', 'min-width', 'min-height',
                    'padding', 'padding-top', 'padding-right', 'padding-bottom', 'padding-left',
                    'margin', 'margin-top', 'margin-right', 'margin-bottom', 'margin-left',
                    // Typography properties
                    'color', 'font-size', 'font-weight', 'font-family', 'text-align', 'text-shadow',
                    'letter-spacing', 'line-height', 'text-transform',
                    // Decoration properties
                    'background-color', 'border', 'border-width', 'border-style', 'border-color',
                    'border-radius', 'box-shadow', 'opacity', 'cursor'
                ])
            );
        },
        handleIdChange() {
            // Do something when ID attribute changes
            console.log('Button ID changed');
        }
    },
    view: {
        events: {
            'dblclick': 'onDblClick'
        },
        onDblClick(e) {
            const em = this.model.em;
            if (em) {
                em.get('Commands').run('edit', { target: this.model });
            }
        },
        init() {
            // Listen for style changes on the model
            this.listenTo(this.model, 'change:style', this.updateStyle);
        },
        updateStyle() {
            console.log('Button style updated');
        }
    }
});

// Register button component by properly extending the text component
editor.DomComponents.addType('button', {
    extend: 'text',
    isComponent: function (el) {
        if (el.tagName === 'BUTTON') {
            return { type: 'button' };
        }
    },
    model: {
        defaults: {
            tagName: 'button',
            droppable: false,
            attributes: {},
            traits: [],
            style: {
                'display': 'inline-block',
                'padding': '10px 20px',
                'background-color': '#4CAF50',
                'color': 'white',
                'border': 'none',
                'border-radius': '8px',
                'cursor': 'pointer',
                'font-size': '16px',
                'text-align': 'center'
            }
        }
    },
    view: {
        // Use the standard text editing from the parent text component
        // No overrides needed - will automatically use the text component's behavior
    }
});

editor.DomComponents.addType('fabric-drawing', {
    isComponent(el) {
        if (el.dataset && el.dataset.gjsType === 'fabric-drawing') {
            return { type: 'fabric-drawing' };
        }
        if (el.classList && el.classList.contains('fabric-drawing')) {
            return { type: 'fabric-drawing' };
        }
        return false;
    },
    model: {
        defaults: {
            droppable: false,
            highlightable: true,
            selectable: true,
            copyable: true,
            removable: true,
            resizable: true,
            stylable: ['top', 'left', 'width', 'height', 'transform', 'z-index'],
            attributes: {
                'data-gjs-type': 'fabric-drawing'
            }
        }
    }
});

// Make sure the style manager and all other systems can interact with our component 
editor.on('component:selected', function (component) {
    if (component) {
        // Enable all style properties
        component.set('stylable', true);

        // Enable text editing when appropriate
        if (component.get('type') === 'button') {
            component.set('editable', true);
        }
    }
});

// Debug tool for style panel
editor.on('styleManager:update', function (sectors) {
    console.log('Style manager updated with sectors:', sectors);
});

// Enable drag and drop
editor.on('block:drag:start', () => {
    editor.refresh();
});

// Add default content
editor.setComponents(`
    <div class="container mx-auto p-4">
        <h1 class="text-4xl font-bold mb-4">Welcome to GrapesJS</h1>
        <p class="text-gray-600">Start building your page by dragging blocks from the left panel.</p>
    </div>
`);

// Add layer-related commands
editor.Commands.add('show-layers', {
    run(editor, sender) {
        const panel = editor.Panels.getPanel('layers');
        if (panel) {
            panel.set('visible', true);
            sender.set('active', true);
        }
    },
    stop(editor, sender) {
        const panel = editor.Panels.getPanel('layers');
        if (panel) {
            panel.set('visible', false);
            sender.set('active', false);
        }
    }
});

editor.Commands.add('show-styles', {
    run(editor, sender) {
        const panel = editor.Panels.getPanel('styles');
        if (panel) {
            panel.set('visible', true);
            sender.set('active', true);
        }
    },
    stop(editor, sender) {
        const panel = editor.Panels.getPanel('styles');
        if (panel) {
            panel.set('visible', false);
            sender.set('active', false);
        }
    }
});

// Add save command
editor.Commands.add('save-template', {
    run: function (editor, sender) {
        const html = editor.getHtml();
        const css = editor.getCss();

        // Show a custom modal to get the filename
        editor.Modal.setTitle('Save HTML Page')
            .setContent(`
                <div style="padding: 20px;">
                    <label for="filename" style="display: block; margin-bottom: 10px; font-weight: bold;">Enter filename:</label>
                    <input 
                        type="text" 
                        id="filename" 
                        value="page.html" 
                        style="width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 4px; margin-bottom: 20px;">
                    <div style="display: flex; justify-content: flex-end; gap: 10px;">
                        <button id="cancel-save" style="padding: 8px 16px; background: #f5f5f5; border: 1px solid #ddd; border-radius: 4px; cursor: pointer;">Cancel</button>
                        <button id="confirm-save" style="padding: 8px 16px; background: #4CAF50; color: white; border: none; border-radius: 4px; cursor: pointer;">Save</button>
                    </div>
                </div>
            `)
            .open();

        // Get modal elements
        const modal = editor.Modal.getContentEl();
        const filenameInput = modal.querySelector('#filename');
        const cancelButton = modal.querySelector('#cancel-save');
        const confirmButton = modal.querySelector('#confirm-save');

        // Focus the filename input when the modal opens
        setTimeout(() => filenameInput.focus(), 100);

        // Handle cancel button
        cancelButton.addEventListener('click', () => {
            editor.Modal.close();
        });

        // Handle save button
        confirmButton.addEventListener('click', () => {
            let filename = filenameInput.value.trim();

            // Add .html extension if missing
            if (!filename.toLowerCase().endsWith('.html')) {
                filename += '.html';
            }

            // Create the full HTML content
            const fullContent = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${filename}</title>
    <style>
        ${css}
    </style>
    <link href="dist/output.css" rel="stylesheet">
</head>
<body>
    ${html}
</body>
</html>`;

            // Create a blob and download it
            const blob = new Blob([fullContent], { type: 'text/html' });
            const url = window.URL.createObjectURL(blob);

            const a = document.createElement('a');
            a.href = url;
            a.download = filename;
            document.body.appendChild(a);
            a.click();

            window.URL.revokeObjectURL(url);
            document.body.removeChild(a);

            // Close the filename modal
            editor.Modal.close();

            // Show success notification
            editor.Modal.setTitle('Save Successful')
                .setContent(`<div style="padding: 20px; text-align: center;">
                    <p>Your page <strong>${filename}</strong> has been saved successfully!</p>
                </div>`)
                .open();

            setTimeout(() => {
                editor.Modal.close();
            }, 2000);
        });

        // Allow pressing Enter to save
        filenameInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                confirmButton.click();
            }
        });
    }
});

// Virtual File System implementation
class VirtualFileSystem {
    constructor() {
        this.files = {};
        this.mainHtmlFile = null;
        this.displayImages = {};  // Store blob URLs for images
    }

    // Add a file to the system
    addFile(path, content, type) {
        this.files[path] = {
            content: content,
            type: type || this.getFileType(path)
        };

        // If it's an HTML file and we don't have a main HTML file yet, set it as main
        if (path.toLowerCase().endsWith('.html') && !this.mainHtmlFile) {
            this.mainHtmlFile = path;
        }

        // Create blob URLs for images to display them
        if (this.isImageFile(path)) {
            const blob = new Blob([content], { type: this.getMimeType(path) });
            this.displayImages[path] = URL.createObjectURL(blob);
        }

        return this;
    }

    // Get a file from the system
    getFile(path) {
        return this.files[path];
    }

    // Get all file paths
    getAllPaths() {
        return Object.keys(this.files);
    }

    // Get main HTML file
    getMainHtmlFile() {
        return this.mainHtmlFile;
    }

    // Set main HTML file
    setMainHtmlFile(path) {
        if (this.files[path] && path.toLowerCase().endsWith('.html')) {
            this.mainHtmlFile = path;
        }
    }

    // Get the type of file based on extension
    getFileType(path) {
        const extension = path.split('.').pop().toLowerCase();

        if (['html', 'htm'].includes(extension)) return 'html';
        if (['css'].includes(extension)) return 'css';
        if (['js'].includes(extension)) return 'javascript';
        if (['jpg', 'jpeg', 'png', 'gif', 'svg', 'webp'].includes(extension)) return 'image';
        if (['json'].includes(extension)) return 'json';

        return 'unknown';
    }

    // Check if file is an image
    isImageFile(path) {
        const type = this.getFileType(path);
        return type === 'image';
    }

    // Get MIME type for a file
    getMimeType(path) {
        const extension = path.split('.').pop().toLowerCase();

        const mimeTypes = {
            'html': 'text/html',
            'htm': 'text/html',
            'css': 'text/css',
            'js': 'text/javascript',
            'jpg': 'image/jpeg',
            'jpeg': 'image/jpeg',
            'png': 'image/png',
            'gif': 'image/gif',
            'svg': 'image/svg+xml',
            'webp': 'image/webp',
            'json': 'application/json'
        };

        return mimeTypes[extension] || 'application/octet-stream';
    }

    // Resolve a relative path
    resolvePath(basePath, relativePath) {
        // If it's an absolute path, return as is
        if (relativePath.startsWith('/')) {
            return relativePath.slice(1); // Remove the leading slash
        }

        // Extract the directory from the base path
        const baseDir = basePath.split('/').slice(0, -1).join('/');

        // Handle '..' in the path
        const parts = relativePath.split('/');
        const newParts = [];

        for (const part of parts) {
            if (part === '..') {
                newParts.pop();
            } else if (part !== '.' && part !== '') {
                newParts.push(part);
            }
        }

        // If there's a base directory, join it with the new path
        if (baseDir) {
            return baseDir + '/' + newParts.join('/');
        }

        return newParts.join('/');
    }

    // Process HTML to replace references to external resources
    processHtml(html, basePath) {
        const parser = new DOMParser();
        const doc = parser.parseFromString(html, 'text/html');

        // Process CSS links
        doc.querySelectorAll('link[rel="stylesheet"]').forEach(link => {
            const href = link.getAttribute('href');
            if (!href) return;

            const resolvedPath = this.resolvePath(basePath, href);
            const cssFile = this.getFile(resolvedPath);

            if (cssFile) {
                // Replace with an inline style element
                const style = doc.createElement('style');
                style.textContent = cssFile.content;
                style.setAttribute('data-original-href', href);
                link.parentNode.replaceChild(style, link);
            } else {
                console.warn(`CSS file not found: ${resolvedPath}`);
                link.setAttribute('data-missing', 'true');
            }
        });

        // Process images
        doc.querySelectorAll('img').forEach(img => {
            const src = img.getAttribute('src');
            if (!src || src.startsWith('data:')) return; // Skip data URLs

            const resolvedPath = this.resolvePath(basePath, src);
            const imgFile = this.getFile(resolvedPath);

            if (imgFile) {
                if (this.displayImages[resolvedPath]) {
                    img.setAttribute('src', this.displayImages[resolvedPath]);
                    img.setAttribute('data-original-src', src);
                }
            } else {
                console.warn(`Image file not found: ${resolvedPath}`);
                img.setAttribute('data-missing', 'true');
                img.setAttribute('src', `data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='100' height='100' viewBox='0 0 100 100'%3E%3Crect width='100' height='100' fill='%23f8f9fa'/%3E%3Ctext x='50%25' y='50%25' dominant-baseline='middle' text-anchor='middle' font-family='sans-serif' font-size='12' fill='%23495057'%3EMissing Image%3C/text%3E%3Ctext x='50%25' y='70%25' dominant-baseline='middle' text-anchor='middle' font-family='sans-serif' font-size='10' fill='%23495057'%3E${encodeURIComponent(src)}%3C/text%3E%3C/svg%3E`);
            }
        });

        // Process scripts
        doc.querySelectorAll('script[src]').forEach(script => {
            const src = script.getAttribute('src');
            if (!src) return;

            const resolvedPath = this.resolvePath(basePath, src);
            const jsFile = this.getFile(resolvedPath);

            if (jsFile) {
                // Replace with an inline script
                const newScript = doc.createElement('script');
                newScript.textContent = jsFile.content;
                newScript.setAttribute('data-original-src', src);
                script.parentNode.replaceChild(newScript, script);
            } else {
                console.warn(`JavaScript file not found: ${resolvedPath}`);
                script.setAttribute('data-missing', 'true');
            }
        });

        return {
            body: doc.body.innerHTML,
            styles: Array.from(doc.querySelectorAll('style')).map(style => style.textContent).join('\n')
        };
    }

    // Update the file explorer UI
    updateFileExplorer(container) {
        if (!container) return;

        // Clear the container
        container.innerHTML = '';

        // Create a file list
        const fileList = document.createElement('ul');
        fileList.className = 'file-list';
        fileList.style.listStyle = 'none';
        fileList.style.padding = '10px';
        fileList.style.margin = '0';

        // Group files by directory
        const directories = {};

        this.getAllPaths().forEach(path => {
            const parts = path.split('/');
            let currentDir = directories;

            // Build directory tree
            for (let i = 0; i < parts.length - 1; i++) {
                const dir = parts[i];
                if (!currentDir[dir]) {
                    currentDir[dir] = {};
                }
                currentDir = currentDir[dir];
            }

            // Add file to its directory
            const fileName = parts[parts.length - 1];
            if (!currentDir._files) {
                currentDir._files = [];
            }
            currentDir._files.push({
                name: fileName,
                path: path,
                type: this.getFileType(path),
                isMain: path === this.mainHtmlFile
            });
        });

        // Recursively create directory elements
        const buildDirectoryElement = (dir, name, path = '', level = 0) => {
            const dirItem = document.createElement('li');
            dirItem.style.marginLeft = level > 0 ? '15px' : '0';

            const dirHeader = document.createElement('div');
            dirHeader.className = 'directory';
            dirHeader.style.padding = '5px';
            dirHeader.style.marginBottom = '5px';
            dirHeader.style.cursor = 'pointer';
            dirHeader.style.display = 'flex';
            dirHeader.style.alignItems = 'center';
            dirHeader.innerHTML = `
                <span style="margin-right: 5px;">📁</span>
                <span>${name || 'Root'}</span>
            `;

            const dirContent = document.createElement('ul');
            dirContent.style.listStyle = 'none';
            dirContent.style.paddingLeft = '0';
            dirContent.style.display = level > 0 ? 'none' : 'block';

            dirHeader.addEventListener('click', () => {
                dirContent.style.display = dirContent.style.display === 'none' ? 'block' : 'none';
            });

            dirItem.appendChild(dirHeader);
            dirItem.appendChild(dirContent);

            // Add files in this directory
            if (dir._files) {
                dir._files.forEach(file => {
                    const fileItem = document.createElement('li');
                    fileItem.style.padding = '5px';
                    fileItem.style.marginLeft = '15px';
                    fileItem.style.display = 'flex';
                    fileItem.style.alignItems = 'center';

                    let icon = '📄';
                    if (file.type === 'html') icon = '🌐';
                    if (file.type === 'css') icon = '🎨';
                    if (file.type === 'javascript') icon = '📜';
                    if (file.type === 'image') icon = '🖼️';

                    // Add 'main' indicator for the main HTML file
                    const mainIndicator = file.isMain ? ' <span style="color: #28a745; font-weight: bold;">[Main]</span>' : '';

                    fileItem.innerHTML = `
                        <span style="margin-right: 5px;">${icon}</span>
                        <span>${file.name}${mainIndicator}</span>
                    `;

                    // Add click event for HTML files to set as main
                    if (file.type === 'html' && !file.isMain) {
                        fileItem.style.cursor = 'pointer';
                        fileItem.setAttribute('title', 'Click to set as main HTML file');
                        fileItem.addEventListener('click', () => {
                            this.setMainHtmlFile(file.path);
                            this.updateFileExplorer(container);

                            // Notify user
                            const notification = document.createElement('div');
                            notification.style.position = 'fixed';
                            notification.style.top = '10px';
                            notification.style.left = '50%';
                            notification.style.transform = 'translateX(-50%)';
                            notification.style.background = '#28a745';
                            notification.style.color = '#fff';
                            notification.style.padding = '10px 15px';
                            notification.style.borderRadius = '4px';
                            notification.style.zIndex = '10000';
                            notification.textContent = `Set ${file.name} as main HTML file`;

                            document.body.appendChild(notification);
                            setTimeout(() => notification.remove(), 2000);
                        });
                    }

                    dirContent.appendChild(fileItem);
                });
            }

            // Add subdirectories
            Object.keys(dir).forEach(subDirName => {
                if (subDirName === '_files') return; // Skip the files array

                const subDirPath = path ? `${path}/${subDirName}` : subDirName;
                const subDirElement = buildDirectoryElement(dir[subDirName], subDirName, subDirPath, level + 1);
                dirContent.appendChild(subDirElement);
            });

            return dirItem;
        };

        const rootElement = buildDirectoryElement(directories, '', '', 0);
        fileList.appendChild(rootElement);
        container.appendChild(fileList);
    }
}

// Create a global instance of the VFS
window.vfs = new VirtualFileSystem();

// Add load multi-file HTML command
editor.Commands.add('load-html', {
    run: function (editor, sender) {
        // Show options for loading: single HTML file or multiple files
        editor.Modal.setTitle('Load Files')
            .setContent(`
                <div style="padding: 20px;">
                    <h3 style="margin-top: 0; margin-bottom: 15px;">Select files to load</h3>
                    
                    <div style="margin-bottom: 15px;">
                        <label style="display: block; margin-bottom: 5px; font-weight: bold;">Upload options:</label>
                        <div style="display: flex; gap: 10px; flex-wrap: wrap;">
                            <button id="load-html-only" style="padding: 10px; background: #f8f9fa; border: 1px solid #ddd; border-radius: 4px; cursor: pointer; flex: 1;">
                                <div style="font-size: 24px; margin-bottom: 5px;">📄</div>
                                Single HTML file
                            </button>
                            <button id="load-multiple-files" style="padding: 10px; background: #f8f9fa; border: 1px solid #ddd; border-radius: 4px; cursor: pointer; flex: 1;">
                                <div style="font-size: 24px; margin-bottom: 5px;">📂</div>
                                Multiple files
                            </button>
                            <button id="load-zip" style="padding: 10px; background: #f8f9fa; border: 1px solid #ddd; border-radius: 4px; cursor: pointer; flex: 1;">
                                <div style="font-size: 24px; margin-bottom: 5px;">📦</div>
                                Zip archive
                            </button>
                        </div>
                    </div>
                    
                    <div style="font-size: 13px; color: #6c757d;">
                        <p><strong>Single HTML file</strong>: Load a single HTML file with embedded CSS and images.</p>
                        <p><strong>Multiple files</strong>: Select HTML, CSS, JS, and image files to load together.</p>
                        <p><strong>Zip archive</strong>: Upload a ZIP file containing an entire website project.</p>
                    </div>
                </div>
            `)
            .open();

        // Handle button clicks
        const modal = editor.Modal.getContentEl();

        // Single HTML file
        const htmlOnlyBtn = modal.querySelector('#load-html-only');
        htmlOnlyBtn.addEventListener('click', () => {
            editor.Modal.close();
            loadSingleHtmlFile(editor);
        });

        // Multiple files
        const multipleFilesBtn = modal.querySelector('#load-multiple-files');
        multipleFilesBtn.addEventListener('click', () => {
            editor.Modal.close();
            loadMultipleFiles(editor);
        });

        // Zip archive
        const zipBtn = modal.querySelector('#load-zip');
        zipBtn.addEventListener('click', () => {
            editor.Modal.close();
            loadZipArchive(editor);
        });
    }
});

// Function to load a single HTML file
function loadSingleHtmlFile(editor) {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.html,.htm';
    input.style.display = 'none';

    input.addEventListener('change', function () {
        const file = this.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = function (e) {
                const content = e.target.result;
                const parser = new DOMParser();
                const doc = parser.parseFromString(content, 'text/html');

                // Extract HTML content from the body
                const bodyContent = doc.body.innerHTML;

                // Extract CSS from style tags
                let css = '';
                doc.querySelectorAll('style').forEach(style => {
                    css += style.textContent + '\n';
                });

                // Clear previous files in the VFS
                window.vfs = new VirtualFileSystem();

                // Add the file to VFS
                window.vfs.addFile(file.name, content, 'html');

                // Load the content into the editor
                editor.setComponents(bodyContent);
                if (css) {
                    editor.setStyle(css);
                }

                // Update file explorer
                const fileExplorer = document.querySelector('.file-explorer-container');
                if (fileExplorer) {
                    window.vfs.updateFileExplorer(fileExplorer);
                }

                editor.Modal.setTitle('Load Successful')
                    .setContent(`<div style="padding: 20px; text-align: center;">
                        <p>HTML file <strong>${file.name}</strong> loaded successfully!</p>
                    </div>`)
                    .open();

                setTimeout(() => {
                    editor.Modal.close();
                }, 2000);
            };
            reader.readAsText(file);
        }
    });

    document.body.appendChild(input);
    input.click();
    document.body.removeChild(input);
}

// Function to load multiple files
function loadMultipleFiles(editor) {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.html,.htm,.css,.js,.jpg,.jpeg,.png,.gif,.svg,.webp';
    input.multiple = true;
    input.style.display = 'none';

    input.addEventListener('change', function () {
        const files = Array.from(this.files);
        if (files.length === 0) return;

        // Show loading indicator
        editor.Modal.setTitle('Loading Files')
            .setContent(`
                <div style="padding: 20px; text-align: center;">
                    <p>Loading ${files.length} files...</p>
                    <div style="width: 100%; height: 20px; background-color: #f0f0f0; border-radius: 10px; margin-top: 15px; overflow: hidden;">
                        <div id="load-progress" style="width: 0%; height: 100%; background-color: #4CAF50; transition: width 0.3s;"></div>
                    </div>
                </div>
            `)
            .open();

        // Reset the VFS
        window.vfs = new VirtualFileSystem();

        // Process each file
        let loadedCount = 0;
        const htmlFiles = [];

        const processNextFile = (index) => {
            if (index >= files.length) {
                // All files loaded, process the main HTML file
                finishLoading();
                return;
            }

            const file = files[index];
            const reader = new FileReader();

            reader.onload = function (e) {
                const content = e.target.result;

                // For text files, store as string
                if (file.type.startsWith('text/') ||
                    file.type === 'application/javascript' ||
                    file.name.endsWith('.html') ||
                    file.name.endsWith('.htm') ||
                    file.name.endsWith('.css') ||
                    file.name.endsWith('.js')) {

                    window.vfs.addFile(file.name, content);

                    if (file.name.endsWith('.html') || file.name.endsWith('.htm')) {
                        htmlFiles.push(file.name);
                    }
                } else {
                    // For binary files like images, store as ArrayBuffer
                    window.vfs.addFile(file.name, new Uint8Array(e.target.result));
                }

                // Update progress
                loadedCount++;
                const progressBar = document.getElementById('load-progress');
                if (progressBar) {
                    progressBar.style.width = `${(loadedCount / files.length) * 100}%`;
                }

                // Process next file
                processNextFile(index + 1);
            };

            reader.onerror = function () {
                console.error(`Error reading file: ${file.name}`);
                processNextFile(index + 1);
            };

            // Read file based on type
            if (file.type.startsWith('text/') ||
                file.type === 'application/javascript' ||
                file.name.endsWith('.html') ||
                file.name.endsWith('.htm') ||
                file.name.endsWith('.css') ||
                file.name.endsWith('.js')) {
                reader.readAsText(file);
            } else {
                reader.readAsArrayBuffer(file);
            }
        };

        const finishLoading = () => {
            // Update file explorer
            const fileExplorer = document.querySelector('.file-explorer-container');
            if (fileExplorer) {
                window.vfs.updateFileExplorer(fileExplorer);
            }

            // If no HTML files found, show warning
            if (htmlFiles.length === 0) {
                editor.Modal.setTitle('Loading Complete')
                    .setContent(`
                        <div style="padding: 20px; text-align: center;">
                            <p style="color: #dc3545; margin-bottom: 15px;"><strong>Warning:</strong> No HTML files were found in the uploaded files.</p>
                            <p>Please upload at least one HTML file to edit.</p>
                        </div>
                    `)
                    .open();
                return;
            }

            // Get the main HTML file
            const mainHtmlFile = window.vfs.getMainHtmlFile();
            if (mainHtmlFile) {
                const htmlFile = window.vfs.getFile(mainHtmlFile);
                if (htmlFile) {
                    const processedHtml = window.vfs.processHtml(htmlFile.content, mainHtmlFile);

                    // Load content into editor
                    editor.setComponents(processedHtml.body);
                    editor.setStyle(processedHtml.styles);

                    // Show success message
                    editor.Modal.setTitle('Loading Complete')
                        .setContent(`
                            <div style="padding: 20px; text-align: center;">
                                <p>Successfully loaded ${files.length} files.</p>
                                <p>Main HTML file: <strong>${mainHtmlFile}</strong></p>
                                <p style="margin-top: 15px; font-size: 13px; color: #6c757d;">You can change the main HTML file in the Files panel.</p>
                            </div>
                        `)
                        .open();

                    setTimeout(() => {
                        editor.Modal.close();
                    }, 3000);
                }
            }
        };

        // Start processing files
        processNextFile(0);
    });

    document.body.appendChild(input);
    input.click();
    document.body.removeChild(input);
}

// Function to load a zip archive
function loadZipArchive(editor) {
    // Check if JSZip is available, if not load it dynamically
    if (!window.JSZip) {
        // Show loading indicator
        editor.Modal.setTitle('Loading JSZip')
            .setContent(`
                <div style="padding: 20px; text-align: center;">
                    <p>Loading JSZip library...</p>
                    <div style="width: 100%; height: 20px; background-color: #f0f0f0; border-radius: 10px; margin-top: 15px; overflow: hidden;">
                        <div style="width: 50%; height: 100%; background-color: #4CAF50;"></div>
                    </div>
                </div>
            `)
            .open();

        // Load JSZip from CDN
        const script = document.createElement('script');
        script.src = 'https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js';
        script.onload = function () {
            editor.Modal.close();
            continueWithZipLoad();
        };
        script.onerror = function () {
            editor.Modal.setTitle('Error')
                .setContent(`
                    <div style="padding: 20px; text-align: center;">
                        <p style="color: #dc3545;">Failed to load JSZip library.</p>
                        <p>Please try again or use the multiple files option instead.</p>
                    </div>
                `)
                .open();
        };
        document.head.appendChild(script);
    } else {
        continueWithZipLoad();
    }

    function continueWithZipLoad() {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.zip';
        input.style.display = 'none';

        input.addEventListener('change', function () {
            const file = this.files[0];
            if (!file) return;

            // Show loading indicator
            editor.Modal.setTitle('Loading Zip Archive')
                .setContent(`
                    <div style="padding: 20px; text-align: center;">
                        <p>Extracting files from ${file.name}...</p>
                        <div style="width: 100%; height: 20px; background-color: #f0f0f0; border-radius: 10px; margin-top: 15px; overflow: hidden;">
                            <div id="zip-progress" style="width: 0%; height: 100%; background-color: #4CAF50; transition: width 0.3s;"></div>
                        </div>
                    </div>
                `)
                .open();

            const reader = new FileReader();
            reader.onload = function (e) {
                const zip = new JSZip();

                zip.loadAsync(e.target.result)
                    .then(function (zipContents) {
                        // Reset the VFS
                        window.vfs = new VirtualFileSystem();

                        // Get total number of files
                        const totalFiles = Object.keys(zipContents.files).length;
                        let processedFiles = 0;
                        const htmlFiles = [];

                        // Process each file in the zip
                        const zipFilePromises = [];

                        zipContents.forEach(function (relativePath, zipEntry) {
                            // Skip directories
                            if (zipEntry.dir) {
                                processedFiles++;
                                return;
                            }

                            // Process file based on its extension
                            const fileName = zipEntry.name;
                            const fileType = window.vfs.getFileType(fileName);

                            let filePromise;

                            if (fileType === 'html' || fileType === 'css' || fileType === 'javascript' || fileType === 'json') {
                                // Text files
                                filePromise = zipEntry.async('string').then(function (content) {
                                    window.vfs.addFile(fileName, content);

                                    if (fileType === 'html') {
                                        htmlFiles.push(fileName);
                                    }

                                    // Update progress
                                    processedFiles++;
                                    const progressBar = document.getElementById('zip-progress');
                                    if (progressBar) {
                                        progressBar.style.width = `${(processedFiles / totalFiles) * 100}%`;
                                    }
                                });
                            } else {
                                // Binary files (like images)
                                filePromise = zipEntry.async('uint8array').then(function (content) {
                                    window.vfs.addFile(fileName, content);

                                    // Update progress
                                    processedFiles++;
                                    const progressBar = document.getElementById('zip-progress');
                                    if (progressBar) {
                                        progressBar.style.width = `${(processedFiles / totalFiles) * 100}%`;
                                    }
                                });
                            }

                            zipFilePromises.push(filePromise);
                        });

                        // After all files are processed
                        Promise.all(zipFilePromises).then(function () {
                            // Update file explorer
                            const fileExplorer = document.querySelector('.file-explorer-container');
                            if (fileExplorer) {
                                window.vfs.updateFileExplorer(fileExplorer);
                            }

                            // If no HTML files found, show warning
                            if (htmlFiles.length === 0) {
                                editor.Modal.setTitle('Loading Complete')
                                    .setContent(`
                                        <div style="padding: 20px; text-align: center;">
                                            <p style="color: #dc3545; margin-bottom: 15px;"><strong>Warning:</strong> No HTML files were found in the ZIP archive.</p>
                                            <p>Please upload a ZIP file containing at least one HTML file to edit.</p>
                                        </div>
                                    `)
                                    .open();
                                return;
                            }

                            // Look for common main HTML files
                            const commonMainFiles = ['index.html', 'main.html', 'default.html', 'home.html'];
                            let mainFileFound = false;

                            for (const commonFile of commonMainFiles) {
                                // Look for the common file in any directory
                                for (const htmlFile of htmlFiles) {
                                    if (htmlFile.endsWith(`/${commonFile}`) || htmlFile === commonFile) {
                                        window.vfs.setMainHtmlFile(htmlFile);
                                        mainFileFound = true;
                                        break;
                                    }
                                }
                                if (mainFileFound) break;
                            }

                            // If no common main file, use the first HTML file
                            if (!mainFileFound && htmlFiles.length > 0) {
                                window.vfs.setMainHtmlFile(htmlFiles[0]);
                            }

                            // Load the main HTML file into the editor
                            const mainHtmlFile = window.vfs.getMainHtmlFile();
                            if (mainHtmlFile) {
                                const htmlFile = window.vfs.getFile(mainHtmlFile);
                                if (htmlFile) {
                                    const processedHtml = window.vfs.processHtml(htmlFile.content, mainHtmlFile);

                                    // Load content into editor
                                    editor.setComponents(processedHtml.body);
                                    editor.setStyle(processedHtml.styles);

                                    // Show success message
                                    editor.Modal.setTitle('Loading Complete')
                                        .setContent(`
                                            <div style="padding: 20px; text-align: center;">
                                                <p>Successfully extracted ${processedFiles} files from ZIP archive.</p>
                                                <p>Main HTML file: <strong>${mainHtmlFile}</strong></p>
                                                <p style="margin-top: 15px; font-size: 13px; color: #6c757d;">You can change the main HTML file in the Files panel.</p>
                                            </div>
                                        `)
                                        .open();

                                    setTimeout(() => {
                                        editor.Modal.close();
                                    }, 3000);
                                }
                            }
                        }).catch(function (error) {
                            console.error('Error processing ZIP contents:', error);
                            editor.Modal.setTitle('Error')
                                .setContent(`
                                    <div style="padding: 20px; text-align: center;">
                                        <p style="color: #dc3545;">Error processing ZIP contents: ${error.message}</p>
                                    </div>
                                `)
                                .open();
                        });
                    })
                    .catch(function (error) {
                        console.error('Error loading ZIP file:', error);
                        editor.Modal.setTitle('Error')
                            .setContent(`
                                <div style="padding: 20px; text-align: center;">
                                    <p style="color: #dc3545;">Error loading ZIP file: ${error.message}</p>
                                </div>
                            `)
                            .open();
                    });
            };
            reader.readAsArrayBuffer(file);
        });

        document.body.appendChild(input);
        input.click();
        document.body.removeChild(input);
    }
}

// Add toggle file explorer command
editor.Commands.add('toggle-file-explorer', {
    run: function (editor) {
        const fileExplorer = document.querySelector('.file-explorer-container');
        if (fileExplorer) {
            const currentDisplay = window.getComputedStyle(fileExplorer).display;
            fileExplorer.style.display = currentDisplay === 'none' ? 'block' : 'none';

            // Update file explorer when shown
            if (fileExplorer.style.display !== 'none') {
                window.vfs.updateFileExplorer(fileExplorer);
            }
        }
    }
}); 