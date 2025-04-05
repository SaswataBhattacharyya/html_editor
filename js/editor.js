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
        blockCategories: [
            { id: 'layout', label: 'Layout', open: true },
            { id: 'basic', label: 'Basic' }
        ],
        blocks: [
            {
                id: 'section',
                label: 'Section',
                attributes: { class:'gjs-block-section' },
                content: `<section>
                    <h1>This is a simple title</h1>
                    <p>This is just a Lorem text: Lorem ipsum dolor sit amet</p>
                </section>`,
                category: 'basic',
            },
            {
                id: 'flex-row',
                label: 'Flex Row',
                attributes: { class:'gjs-block-section' },
                content: `<div style="display: flex; flex-direction: row; justify-content: space-between; align-items: center; padding: 10px; min-height: 100px; background-color: #f8f9fa; border: 1px dashed #dee2e6;">
                    <div style="flex: 1; padding: 10px; min-height: 50px; background-color: #e9ecef; border: 1px dashed #ced4da;">Column 1</div>
                    <div style="flex: 1; padding: 10px; min-height: 50px; background-color: #e9ecef; border: 1px dashed #ced4da;">Column 2</div>
                </div>`,
                category: 'Layout',
            },
            {
                id: 'flex-column',
                label: 'Column',
                attributes: { class:'gjs-block-section' },
                content: `<div style="flex: 1; padding: 10px; min-height: 50px; background-color: #e9ecef; border: 1px dashed #ced4da;">
                    <p>Column content</p>
                </div>`,
                category: 'Layout',
            },
            {
                id: 'two-columns',
                label: '2 Columns',
                attributes: { class:'gjs-block-section' },
                content: `<div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px; padding: 10px; min-height: 100px; background-color: #f8f9fa; border: 1px dashed #dee2e6;">
                    <div style="padding: 10px; min-height: 50px; background-color: #e9ecef; border: 1px dashed #ced4da;">Column 1</div>
                    <div style="padding: 10px; min-height: 50px; background-color: #e9ecef; border: 1px dashed #ced4da;">Column 2</div>
                </div>`,
                category: 'Layout',
            },
            {
                id: 'three-columns',
                label: '3 Columns',
                attributes: { class:'gjs-block-section' },
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
                content: { type: 'image' },
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
                attributes: { class:'gjs-block-section' },
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
            label: '�� Load',
            command: 'load-html'
        }
    ]
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
                
                newPicker.addEventListener('click', function(e) {
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
                        
                        input.addEventListener('change', function() {
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
    isComponent: function(el) {
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

// Make sure the style manager and all other systems can interact with our component 
editor.on('component:selected', function(component) {
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
editor.on('styleManager:update', function(sectors) {
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
    run: function(editor, sender) {
        const html = editor.getHtml();
        const css = editor.getCss();
        
        // Create the full HTML content
        const fullContent = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Saved Page</title>
    <style>
        ${css}
    </style>
    <link href="dist/output.css" rel="stylesheet">
</head>
<body>
    ${html}
</body>
</html>`;

        // Create a temporary input element for the file picker
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.html';
        input.webkitdirectory = true;
        input.style.display = 'none';
        
        input.addEventListener('change', function() {
            const file = this.files[0];
            if (file) {
                const blob = new Blob([fullContent], { type: 'text/html' });
                const url = window.URL.createObjectURL(blob);
                
                const a = document.createElement('a');
                a.href = url;
                a.download = file.name;
                document.body.appendChild(a);
                a.click();
                
                window.URL.revokeObjectURL(url);
                document.body.removeChild(a);
                
                editor.Modal.setTitle('Save Successful')
                    .setContent('Your page has been saved successfully!')
                    .open();
                
                setTimeout(() => {
                    editor.Modal.close();
                }, 2000);
            }
        });
        
        document.body.appendChild(input);
        input.click();
        document.body.removeChild(input);
    }
});

// Add load HTML command
editor.Commands.add('load-html', {
    run: function(editor, sender) {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.html';
        input.style.display = 'none';
        
        input.addEventListener('change', function() {
            const file = this.files[0];
            if (file) {
                const reader = new FileReader();
                reader.onload = function(e) {
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
                    
                    // Load the content into the editor
                    editor.setComponents(bodyContent);
                    if (css) {
                        editor.setStyle(css);
                    }
                    
                    editor.Modal.setTitle('Load Successful')
                        .setContent('HTML file loaded successfully!')
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
}); 