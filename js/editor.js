const editor = grapesjs.init({
    container: '#gjs',
    height: '100vh',
    width: 'auto',
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
        blocks: [
            {
                id: 'section',
                label: 'Section',
                attributes: { class: 'gjs-block-section' },
                content: `
                    <section class="py-8 px-4">
                        <div class="container mx-auto">
                            <h2 class="text-4xl font-bold mb-4">Title</h2>
                            <p class="text-gray-600">Content goes here</p>
                        </div>
                    </section>
                `,
            },
            {
                id: 'text',
                label: 'Text',
                content: '<div data-gjs-type="text">Insert your text here</div>',
            },
            {
                id: 'image',
                label: 'Image',
                select: true,
                content: { type: 'image' },
                activate: true
            },
            {
                id: 'button',
                label: 'Button',
                content: '<button class="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600">Click me</button>',
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
                buildProps: ['font-family', 'font-size', 'font-weight', 'letter-spacing', 'color', 'line-height', 'text-align']
            },
            {
                name: 'Decorations',
                open: false,
                buildProps: ['background-color', 'border-radius', 'border', 'box-shadow', 'opacity']
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
        }
    ]
});

// Add dropdown content to B button
editor.on('load', () => {
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