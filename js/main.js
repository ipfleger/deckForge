

        // ========================================
        // CANVAS MODULE
        // ========================================
        
        const Canvas = {
            init:function() {
                canvas = new fabric.Canvas('c', {
                    width:CARD_WIDTH,
                    height:CARD_HEIGHT,
                    backgroundColor:state.palette[0],
                    selection:false,
                    preserveObjectStacking:true,
                    enableRetinaScaling:true
                });

                // Configure default object properties
                // Configure default object properties
fabric.Object.prototype.set({
    transparentCorners:false,
    cornerColor:'#2563eb',
    cornerSize:20,
    touchCornerSize:40,
    borderScaleFactor:2,
    borderColor:'#2563eb',
    padding:10,
    perPixelTargetFind: true 
});


                // FIX 1: Allow clicking through transparent parts of Images
                fabric.Image.prototype.set({
                    perPixelTargetFind: true
                });

                // FIX 2: Allow clicking through transparent parts of Groups
                // This globally fixes Arcane, Circuit, etc.
                fabric.Group.prototype.set({
                    perPixelTargetFind: true
                });

                // Extend serialization
                fabric.Object.prototype.toObject = (function(toObject) {
                    return function(propertiesToInclude) {
                        return fabric.util.object.extend(toObject.call(this, propertiesToInclude), {
                            roleFill:this.roleFill,
                            roleStroke:this.roleStroke,
                            locked:this.locked,
                            roleGradientStart:this.roleGradientStart,
                            roleGradientEnd:this.roleGradientEnd,
                            gradBalance:this.gradBalance,
                            isParticleGroup:this.isParticleGroup,
                            generativeType:this.generativeType
                        });
                    };
                })(fabric.Object.prototype.toObject);

                // Event handlers
                canvas.on('selection:created', this.onSelect.bind(this));
                canvas.on('selection:updated', this.onSelect.bind(this));
                canvas.on('selection:cleared', this.onDeselect.bind(this));
                canvas.on('object:modified', () => History.save());
                canvas.on('object:added', () => History.save());

                this.loadDefaultTemplate();
            },

            onSelect:function(e) {
                if (!e.selected || e.selected.length === 0) return;
                const obj = e.selected[0];

                try {
                    UI.minimizeMenu();
                    UI.setPropTab('color');
                    UI.updateContextualUI(obj);
                    UI.updateLockUI(obj.locked);
                    Theme.updateGradientUI(obj);

                    Utils.setInputValue('inp-opacity', obj.opacity || 1);
                    Utils.setText('lbl-opacity', Math.round((obj.opacity || 1) * 100) + '%');
                    Utils.setInputValue('inp-stroke', obj.strokeWidth || 0);
                    Utils.setText('lbl-stroke', obj.strokeWidth || 0);

                    if (obj.type === 'i-text') {
                        Utils.setInputValue('inp-size', obj.fontSize || 40);
                        Utils.setText('lbl-size', obj.fontSize || 40);
                    } else {
                        const s = Math.round((obj.scaleX || 1) * 100);
                        Utils.setInputValue('inp-size', s);
                        Utils.setText('lbl-size', s + '%');

                        if (obj.type === 'rect') {
                            Utils.setInputValue('inp-radius', obj.rx || 0);
                            Utils.setText('lbl-radius', obj.rx || 0);
                        }
                    }

                    Theme.renderPaletteUI();
                } catch (err) {
                    console.warn("Selection UI Warning:", err);
                }

                canvas.requestRenderAll();
            },

            onDeselect:function() {
                const fab = Utils.getElement('btn-open-props');
                const propBar = Utils.getElement('prop-bar');
                const mainControls = Utils.getElement('main-controls');

                if (fab) fab.classList.add('scale-0');
                if (propBar) {
                    propBar.classList.add('translate-y-[120%]');
                    propBar.style.transform = '';
                }
                if (mainControls) mainControls.classList.remove('translate-y-24');
            },

            loadDefaultTemplate:function() {
                canvas.clear();
                canvas.setBackgroundColor(state.palette[0], canvas.renderAll.bind(canvas));

                const centerNum = new fabric.IText('3', {
                    left:CARD_WIDTH / 2,
                    top:CARD_HEIGHT / 2,
                    fontFamily:'Inter',
                    fontSize:400,
                    fontWeight:'bold',
                    fill:state.palette[4],
                    originX:'center',
                    originY:'center',
                    roleFill:4,
                    roleStroke:-1
                });

                const topLeft = new fabric.IText('3', {
                    left:145,
                    top:145,
                    fontFamily:'Inter',
                    fontSize:100,
                    fontWeight:'bold',
                    fill:state.palette[4],
                    originX:'center',
                    originY:'center',
                    roleFill:4,
                    roleStroke:-1
                });

                const btmRight = new fabric.IText('3', {
                    left:CARD_WIDTH - 145,
                    top:CARD_HEIGHT - 145,
                    fontFamily:'Inter',
                    fontSize:100,
                    fontWeight:'bold',
                    fill:state.palette[4],
                    originX:'center',
                    originY:'center',
                    angle:180,
                    roleFill:4,
                    roleStroke:-1
                });

                canvas.add(centerNum, topLeft, btmRight);
                canvas.requestRenderAll();
                History.save();
            },

            addShape:function(type) {
                UI.closeAllDrawers();
                
                const center = {
                    left:CARD_WIDTH / 2,
                    top:CARD_HEIGHT / 2,
                    originX:'center',
                    originY:'center'
                };
                
                let obj;

                if (type === 'safe') {
                    obj = new fabric.Rect({
                        ...center,
                        width:600,
                        height:900,
                        rx:40,
                        ry:40,
                        fill:'transparent',
                        stroke:Utils.getPaletteColor(2),
                        strokeWidth:15,
                        perPixelTargetFind:true
                    });
                    obj.roleStroke = 2;
                    obj.roleFill = -1;
                } else {
                    switch (type) {
                        case 'rect':
                            obj = new fabric.Rect({ ...center, width:250, height:250 });
                            break;
                        case 'circle':
                            obj = new fabric.Circle({ ...center, radius:125 });
                            break;
                        case 'triangle':
                            obj = new fabric.Triangle({ ...center, width:250, height:250 });
                            break;
                        case 'star':
                            const points = [
                                { x:0, y:-50 }, { x:14, y:-20 }, { x:47, y:-15 },
                                { x:23, y:7 }, { x:29, y:40 }, { x:0, y:25 },
                                { x:-29, y:40 }, { x:-23, y:7 }, { x:-47, y:-15 },
                                { x:-14, y:-20 }
                            ];
                            obj = new fabric.Polygon(points, { ...center, scaleX:4, scaleY:4 });
                            break;
                        case 'hexagon':
                            // Flat-topped Hexagon
                            const hexRadius = 125;
                            const hexPoints = [];
                            for (let i = 0; i < 6; i++) {
                                const angle_deg = 60 * i;
                                const angle_rad = Math.PI / 180 * angle_deg;
                                hexPoints.push({
                                    x: hexRadius * Math.cos(angle_rad),
                                    y: hexRadius * Math.sin(angle_rad)
                                });
                            }
                            obj = new fabric.Polygon(hexPoints, { ...center, scaleX: 1, scaleY: 1 });
                            break;

                        case 'shield':
                            // Classic Defender Shield Path
                            const shieldPath = "M 0 0 C 0 -20 20 -40 100 -40 C 180 -40 200 -20 200 0 C 200 100 150 180 100 220 C 50 180 0 100 0 0 Z";
                            obj = new fabric.Path(shieldPath, { ...center });
                            // Center the shield logic
                            obj.set({ originX: 'center', originY: 'center' });
                            if(obj.width > 250) obj.scaleToWidth(250);
                            break;

                        case 'diamond':
                            // Rarity Gem
                            obj = new fabric.Polygon([
                                {x: 0, y: -100}, // Top
                                {x: 70, y: 0},   // Right
                                {x: 0, y: 100},  // Bottom
                                {x: -70, y: 0}   // Left
                            ], { ...center });
                            break;
                        case 'placeholder':
                            const grp = [];
                            const boxSize = 600;
                            // Box
                            grp.push(new fabric.Rect({
                                width: boxSize, height: boxSize/1.5,
                                fill: '#f3f4f6', stroke: '#d1d5db', strokeWidth: 4
                            }));
                            // X lines
                            grp.push(new fabric.Line([0, 0, boxSize, boxSize/1.5], { stroke: '#e5e7eb', strokeWidth: 4 }));
                            grp.push(new fabric.Line([boxSize, 0, 0, boxSize/1.5], { stroke: '#e5e7eb', strokeWidth: 4 }));
                            
                            obj = new fabric.Group(grp, { ...center });
                            break;
                        default:
                            obj = new fabric.Rect({ ...center, width:250, height:250 });
                    }
                    
                    obj.roleFill = 2;
                    obj.roleStroke = -1;
                    obj.set({
                        fill:Utils.getPaletteColor(2),
                        stroke:Utils.getPaletteColor(-1),
                        strokeWidth:0
                    });
                }

                canvas.add(obj);
                canvas.setActiveObject(obj);
                this.autoPanToSelection();
            },

            addText:function() {
                const text = new fabric.IText('New Text', {
                    left:CARD_WIDTH / 2,
                    top:CARD_HEIGHT / 2,
                    originX:'center',
                    originY:'center',
                    fontFamily:'Inter',
                    fontSize:60,
                    editable:false
                });
                
                text.roleFill = 4;
                text.roleStroke = -1;
                text.set('fill', Utils.getPaletteColor(4));
                
                canvas.add(text);
                canvas.setActiveObject(text);
                this.autoPanToSelection();
            },

            autoPanToSelection:function() {
                state.panY -= 150 * state.scale;
                UI.renderTransform();
            },

            triggerImageUpload:function() {
                const input = Utils.getElement('img-upload');
                if (input) input.click();
            },

            handleImageUpload:function(file) {
                if (!file) return;

                const reader = new FileReader();
                reader.onload = (ev) => {
                    fabric.Image.fromURL(ev.target.result, (img) => {
                        img.set({
                            left:CARD_WIDTH / 2,
                            top:CARD_HEIGHT / 2,
                            originX:'center',
                            originY:'center'
                        });
                        
                        if (img.width > CARD_WIDTH * 0.8) {
                            img.scaleToWidth(CARD_WIDTH * 0.8);
                        }
                        
                        canvas.add(img);
                        canvas.setActiveObject(img);
                        History.save();
                    });
                };
                reader.readAsDataURL(file);
            },

            deleteActive:function() {
                const obj = canvas.getActiveObject();
                if (obj && !obj.locked) {
                    canvas.remove(obj);
                    canvas.discardActiveObject();
                    canvas.requestRenderAll();
                    History.save();
                }
            },

            adjustLayer:function(direction) {
                const obj = canvas.getActiveObject();
                if (obj && !obj.locked) {
                    if (direction === 'up') {
                        obj.bringForward();
                    } else {
                        obj.sendBackwards();
                    }
                    History.save();
                }
            },

            toggleLock:function() {
                const obj = canvas.getActiveObject();
                if (!obj) return;

                const isLocked = !obj.locked;
                obj.set({
                    locked:isLocked,
                    lockMovementX:isLocked,
                    lockMovementY:isLocked,
                    lockRotation:isLocked,
                    lockScalingX:isLocked,
                    lockScalingY:isLocked,
                    hasControls:!isLocked
                });
                
                canvas.requestRenderAll();
                UI.updateLockUI(isLocked);
                History.save();
            },

            rotateActive:function() {
                const obj = canvas.getActiveObject();
                if (!obj || obj.locked) return;

                let angle = (obj.angle + 45) % 360;
                obj.set('angle', angle);
                obj.setCoords();
                canvas.requestRenderAll();
                History.save();
            },

            updateProp:function(key, value) {
                const obj = canvas.getActiveObject();
                if (!obj || obj.locked) return;

                obj.set(key, value);
                
                if (key === 'rx') obj.set('ry', value);
                
                canvas.requestRenderAll();
                
                if (key === 'opacity') {
                    Utils.setText('lbl-opacity', Math.round(value * 100) + '%');
                }
                if (key === 'strokeWidth') {
                    Utils.setText('lbl-stroke', value);
                }
                if (key === 'rx') {
                    Utils.setText('lbl-radius', value);
                }
                
                History.debouncedSave();
            },

            updateSize:function(value) {
                const obj = canvas.getActiveObject();
                if (!obj || obj.locked) return;

                if (obj.type === 'i-text') {
                    obj.set('fontSize', parseInt(value));
                    Utils.setText('lbl-size', value);
                } else {
                    obj.scaleToWidth(parseInt(value) * 2.5);
                    Utils.setText('lbl-size', value + '%');
                }
                
                canvas.requestRenderAll();
                History.debouncedSave();
            },

            cycleBlendMode:function() {
                const obj = canvas.getActiveObject();
                if (!obj || obj.locked) return;

                const currentMode = obj.globalCompositeOperation || 'source-over';
                const currentIndex = BLEND_MODES.indexOf(currentMode);
                const nextIndex = (currentIndex + 1) % BLEND_MODES.length;
                
                obj.set('globalCompositeOperation', BLEND_MODES[nextIndex]);
                canvas.requestRenderAll();
                History.save();
            },

            applyFilter:function(type, value) {
                const obj = canvas.getActiveObject();
                if (!obj || obj.type !== 'image') return;

                const val = parseFloat(value);
                
                if (!obj.filters) obj.filters = [];

                if (type === 'pixelate') {
                    obj.filters = obj.filters.filter(f => !(f instanceof fabric.Image.filters.Pixelate));
                    if (val > 0) {
                        obj.filters.push(new fabric.Image.filters.Pixelate({ blocksize:val }));
                    }
                    Utils.setText('lbl-pixelate', val > 0 ? val :'Off');
                } else if (type === 'blur') {
                    obj.filters = obj.filters.filter(f => !(f instanceof fabric.Image.filters.Blur));
                    if (val > 0) {
                        obj.filters.push(new fabric.Image.filters.Blur({ blur:val }));
                    }
                    Utils.setText('lbl-blur', val > 0 ? val.toFixed(2) :'Off');
                }

                obj.applyFilters();
                canvas.requestRenderAll();
                History.debouncedSave();
            },

            toggleSelectionMode:function() {
                canvas.selection = !canvas.selection;
                
                const btn = Utils.getElement('btn-multiselect');
                if (btn) {
                    if (canvas.selection) {
                        btn.classList.add('text-blue-600', 'bg-blue-50');
                        btn.setAttribute('aria-pressed', 'true');
                        canvas.defaultCursor = 'crosshair';
                    } else {
                        btn.classList.remove('text-blue-600', 'bg-blue-50');
                        btn.setAttribute('aria-pressed', 'false');
                        canvas.defaultCursor = 'default';
                    }
                }
            },

            createClippingMask:function() {
                const sel = canvas.getActiveObjects();

                if (sel.length !== 2) {
                    alert("Please select exactly 2 objects:An Image (bottom) and a Shape (top).");
                    return;
                }

                sel.sort((a, b) => canvas.getObjects().indexOf(a) - canvas.getObjects().indexOf(b));

                const content = sel[0];
                const maskSource = sel[1];

                maskSource.clone(function(clonedMask) {
                    clonedMask.absolutePositioned = true;
                    content.set('clipPath', clonedMask);
                    canvas.remove(maskSource);
                    canvas.discardActiveObject();
                    canvas.setActiveObject(content);
                    canvas.requestRenderAll();
                    History.save();
                });
            },

            getCanvas:function() {
                return canvas;
            }
        };

        // ========================================
// ALIGNMENT MODULE
// ========================================

const Align = {
    // direction: 'left', 'center', 'right', 'top', 'middle', 'bottom'
    align: function(direction) {
        const active = canvas.getActiveObject();
        const selection = canvas.getActiveObjects();

        if (!active) return;

        // 1. Single Object Selected -> Align to Canvas
        if (selection.length === 1) {
            const obj = selection[0];
            const bound = obj.getBoundingRect(true); // Absolute coords
            const canvasW = canvas.width;
            const canvasH = canvas.height;

            switch(direction) {
                case 'left': 
                    obj.set('left', obj.left - bound.left); 
                    break;
                case 'center': 
                    obj.centerH(); 
                    break;
                case 'right': 
                    obj.set('left', canvasW - (bound.width / 2) - (bound.width/2 - (obj.left - bound.left))); 
                    // Simpler: just adjust left based on width. 
                    // For robust generic alignment, usually centerH/centerV is safest for single objects
                    // But here is a generic manual calc:
                    obj.set('left', canvasW - bound.width + (obj.left - bound.left));
                    break;
                case 'top': 
                    obj.set('top', obj.top - bound.top); 
                    break;
                case 'middle': 
                    obj.centerV(); 
                    break;
                case 'bottom': 
                    obj.set('top', canvasH - bound.height + (obj.top - bound.top)); 
                    break;
            }
            obj.setCoords();
        } 
        // 2. Multiple Objects (Group) -> Align relative to Selection Box
        else if (selection.length > 1) {
            // The 'active' object in a multi-selection is the selection group wrapper
            const groupWidth = active.width;
            const groupHeight = active.height;
            const groupLeft = active.left;
            const groupTop = active.top;

            selection.forEach(obj => {
                // We must calculate position relative to the group center
                const objBounds = obj.getBoundingRect(true);
                
                // Fabric groups have origin at center. 
                // Coordinates are relative to group center.
                
                switch(direction) {
                    case 'left':
                        // Move to left edge of group (-width/2)
                        obj.set('left', -(groupWidth / 2) + (obj.width * obj.scaleX / 2));
                        break;
                    case 'center':
                        obj.set('left', 0);
                        break;
                    case 'right':
                        obj.set('left', (groupWidth / 2) - (obj.width * obj.scaleX / 2));
                        break;
                    case 'top':
                        obj.set('top', -(groupHeight / 2) + (obj.height * obj.scaleY / 2));
                        break;
                    case 'middle':
                        obj.set('top', 0);
                        break;
                    case 'bottom':
                        obj.set('top', (groupHeight / 2) - (obj.height * obj.scaleY / 2));
                        break;
                }
                obj.setCoords();
            });
            
            // Force re-render of the group
            canvas.discardActiveObject();
            const sel = new fabric.ActiveSelection(selection, { canvas: canvas });
            canvas.setActiveObject(sel);
        }

        canvas.requestRenderAll();
        History.save();
    },

    distribute: function(axis) {
        const selection = canvas.getActiveObjects();
        if (selection.length < 3) return; // Need 3+ to distribute

        if (axis === 'horizontal') {
            // Sort by left position
            selection.sort((a, b) => a.left - b.left);
            const totalW = selection[selection.length - 1].left - selection[0].left;
            const step = totalW / (selection.length - 1);
            
            selection.forEach((obj, i) => {
                if (i === 0 || i === selection.length - 1) return; // Anchors stay put
                obj.set('left', selection[0].left + (step * i));
                obj.setCoords();
            });
        } else {
            // Sort by top position
            selection.sort((a, b) => a.top - b.top);
            const totalH = selection[selection.length - 1].top - selection[0].top;
            const step = totalH / (selection.length - 1);
            
            selection.forEach((obj, i) => {
                if (i === 0 || i === selection.length - 1) return;
                obj.set('top', selection[0].top + (step * i));
                obj.setCoords();
            });
        }
        canvas.requestRenderAll();
        History.save();
    }
};
        // ========================================
        // THEME MODULE
        // ========================================
        
        const Theme = {
            // Inside Theme object...

initColorEngine: function() {
    try {
        colorPickerInstance = new iro.ColorPicker("#iro-picker", {
            width: 220,
            color: builderPalette[activeBuilderSlot],
            layout: [
                { component: iro.ui.Wheel, options: {} },
                { component: iro.ui.Slider, options: { sliderType: 'value' } }
            ]
        });

        const hexInput = Utils.getElement('hex-input');

        // 1. Listen for Picker Changes (Drag)
        colorPickerInstance.on('color:change', (color) => {
            // Update the Data
            builderPalette[activeBuilderSlot] = color.hexString;
            
            // Update the UI Slots
            this.renderBuilderSlots();
            
            // Update the Hex Input (only if not currently focused to prevent fighting)
            if (hexInput && document.activeElement !== hexInput) {
                hexInput.value = color.hexString.toUpperCase();
            }
        });

        // 2. Listen for Input Changes (Typing)
        if (hexInput) {
            // Set initial value
            hexInput.value = builderPalette[activeBuilderSlot].toUpperCase();

            hexInput.addEventListener('input', (e) => {
                let val = e.target.value;
                
                // Add # if missing
                if (val.length > 0 && !val.startsWith('#')) {
                    val = '#' + val;
                }

                // Validate Hex format
                if (/^#[0-9A-F]{6}$/i.test(val)) {
                    // Valid Hex - Update Picker & Data
                    colorPickerInstance.color.set(val);
                    builderPalette[activeBuilderSlot] = val;
                    this.renderBuilderSlots();
                }
            });

            // Force update on blur to ensure consistency
            hexInput.addEventListener('blur', () => {
                hexInput.value = colorPickerInstance.color.hexString.toUpperCase();
            });
        }

        this.renderBuilderSlots();
    } catch (e) {
        console.error('Color engine init error:', e);
    }
},


                        renderBuilderSlots:function() {
                const container = Utils.getElement('builder-slots');
                if (!container) return;

                container.innerHTML = '';
                
                builderPalette.forEach((color, index) => {
                    const btn = document.createElement('button');
                    btn.className = "w-9 h-9 rounded-lg cursor-pointer transition shadow-sm border relative";
                    btn.style.backgroundColor = color;
                    btn.setAttribute('aria-label', `Color slot ${index + 1}`);
                    
                    if (index === activeBuilderSlot) {
                        btn.classList.add('ring-2', 'ring-blue-500', 'ring-offset-2');
                        btn.innerHTML = `<div class="absolute -top-1 -right-1 w-2.5 h-2.5 bg-blue-500 rounded-full border border-white"></div>`;
                    } else {
                        btn.classList.add('border-gray-200');
                    }
                    
                    btn.onclick = () => {
                        activeBuilderSlot = index;
                        colorPickerInstance.color.set(builderPalette[index]);
                        this.renderBuilderSlots();
                    };
                    
                    container.appendChild(btn);
                });
            },

            generateHarmony:function(mode) {
                if (typeof chroma === 'undefined') {
                    console.warn('Chroma.js not loaded');
                    return;
                }

                const base = colorPickerInstance.color.hexString;
                let newColors = [];
                
                if (mode === 'scale') {
                    newColors = chroma.scale([
                        chroma(base).brighten(2.5),
                        base,
                        chroma(base).darken(2.5)
                    ]).mode('lch').colors(5);
                } else if (mode === 'contrast') {
                    newColors = [
                        '#ffffff',
                        '#f3f4f6',
                        base,
                        chroma(base).darken(1.5).hex(),
                        chroma(base).darken(3.5).hex()
                    ];
                }
                
                builderPalette = newColors;
                activeBuilderSlot = 2;
                colorPickerInstance.color.set(builderPalette[2]);
                this.renderBuilderSlots();
            },

            saveCustomPalette:function() {
                const nameInput = Utils.getElement('new-palette-name');
                const name = nameInput ?  nameInput.value :'Custom Theme';
                
                const palette = {
                    id:'c-' + Date.now(),
                    name:name || 'Custom Theme',
                    colors:[...builderPalette]
                };
                
                state.palettes.push(palette);
                
                // Save to localStorage
                const customPalettes = state.palettes.filter(p => p.id.startsWith('c-'));
                try {
                    localStorage.setItem('deckforge_custom_palettes', JSON.stringify(customPalettes));
                    this.renderSettingsUI();
                    this.selectPalette(palette.colors);
                } catch (e) {
                    alert("Storage Full:Cannot save theme.");
                }
            },

            loadCustomPalettes:function() {
                try {
                    const saved = localStorage.getItem('deckforge_custom_palettes');
                    if (saved) {
                        const customPalettes = JSON.parse(saved);
                        state.palettes = [
                            ...DEFAULT_PALETTES,
                            ...customPalettes
                        ];
                    }
                } catch (e) {
                    console.error('Error loading custom palettes:', e);
                }
            },

            selectPalette:function(colors) {
                state.palette = colors;
                if (state.coordinatedColors) {
                    this.updateCanvasColors();
                }
                this.renderPaletteUI();
                History.save();
            },

            renderSettingsUI:function() {
                const list = Utils.getElement('palette-list');
                if (!list) return;

                list.innerHTML = '';
                
                state.palettes.forEach(palette => {
                    const btn = document.createElement('button');
                    btn.className = "flex justify-between p-2 bg-white border rounded w-full hover:border-blue-300 transition";
                    btn.setAttribute('aria-label', `Select ${palette.name} palette`);
                    
                    const swatches = palette.colors.map(c => 
                        `<div class="w-3 h-3 rounded-full" style="background:${c}"></div>`
                    ).join('');
                    
                    btn.innerHTML = `
                        <span class="text-xs font-bold">${palette.name}</span>
                        <div class="flex gap-0.5">${swatches}</div>
                    `;
                    
                    btn.onclick = () => this.selectPalette(palette.colors);
                    list.appendChild(btn);
                });
            },

            renderPaletteUI:function() {
                const row = Utils.getElement('active-palette-row');
                if (!row) return;

                row.innerHTML = '';
                
                const obj = canvas ?  canvas.getActiveObject() :null;
                const currentRole = obj ? (state.editMode === 'fill' ? obj.roleFill :obj.roleStroke) :-99;

                // Transparent swatch
                const transparentBtn = document.createElement('button');
                transparentBtn.className = `swatch bg-checkers ${currentRole === -1 ? 'active-role' :''}`;
                transparentBtn.setAttribute('aria-label', 'Transparent');
                transparentBtn.setAttribute('aria-pressed', currentRole === -1 ? 'true' :'false');
                transparentBtn.onclick = () => this.assignRole(-1);
                row.appendChild(transparentBtn);

                // Color swatches
                [0, 1, 2, 3, 4].forEach(i => {
                    const swatch = document.createElement('button');
                    swatch.className = `swatch ${currentRole === i ? 'active-role' :''}`;
                    swatch.style.backgroundColor = Utils.getPaletteColor(i);
                    swatch.setAttribute('aria-label', `Color ${i + 1}`);
                    swatch.setAttribute('aria-pressed', currentRole === i ? 'true' :'false');
                    swatch.onclick = () => this.assignRole(i);
                    row.appendChild(swatch);
                });
            },

            assignRole:function(idx) {
                const obj = canvas.getActiveObject();
                if (!obj || obj.locked) return;

                // Gradient mode
                if (obj.roleGradientStart !== undefined && obj.roleGradientEnd !== undefined) {
                    if (state.gradSlot === 'start') {
                        obj.roleGradientStart = (idx === -1) ? 0 :idx;
                    } else {
                        obj.roleGradientEnd = (idx === -1) ? 0 :idx;
                    }
                    this.updateCanvasColors();
                    this.updateGradientUI(obj);
                    History.save();
                    return;
                }

                // Standard mode
                const color = Utils.getPaletteColor(idx);

                const applyToItem = (o) => {
                    o.set('objectCaching', false);
                    const isLineArt = (o.type === 'line' || (o.stroke && (!o.fill || o.fill === 'none')));

                    if (state.editMode === 'stroke' || isLineArt) {
                        o.roleStroke = idx;
                        o.roleFill = null;
                        o.set('stroke', color);
                        if (idx !== -1 && (!o.strokeWidth || o.strokeWidth === 0)) {
                            o.set('strokeWidth', 2);
                        }
                    } else {
                        o.roleFill = idx;
                        o.roleStroke = null;
                        o.set('fill', color);
                        
                    }
                };

                const traverse = (target) => {
                    if (target.type === 'group' || target.type === 'activeSelection') {
                        target.getObjects().forEach(child => traverse(child));
                        target.set('dirty', true);
                        target.set('objectCaching', false);
                    } else {
                        applyToItem(target);
                    }
                };

                traverse(obj);
                canvas.requestRenderAll();
                this.renderPaletteUI();
                History.save();
            },

            toggleDarkMode:function() {
                state.darkMode = !state.darkMode;
                this.updateCanvasColors();
                this.renderPaletteUI();

                const btn = Utils.getElement('btn-dark-mode');
                const icon = Utils.getElement('icon-dark-mode');

                if (btn && icon) {
                    if (state.darkMode) {
                        btn.classList.replace('bg-gray-900', 'bg-white');
                        btn.classList.replace('text-white', 'text-gray-900');
                        btn.setAttribute('aria-pressed', 'true');
                        icon.className = "ph-fill ph-sun text-lg";
                    } else {
                        btn.classList.replace('bg-white', 'bg-gray-900');
                        btn.classList.replace('text-gray-900', 'text-white');
                        btn.setAttribute('aria-pressed', 'false');
                        icon.className = "ph-fill ph-moon text-lg";
                    }
                }
            },

            toggleGradientMode:function() {
                const obj = canvas.getActiveObject();
                if (!obj || obj.locked) return;

                if (obj.roleGradientStart === undefined) {
                    // Switch to gradient
                    obj.roleGradientStart = 2;
                    obj.roleGradientEnd = 3;
                    obj.gradBalance = 0;

                    if (obj.roleFill === -1 || obj.fill === 'transparent' || obj.fill === null) {
                        obj.roleFill = -1;
                    } else {
                        delete obj.roleFill;
                    }
                } else {
                    // Switch to solid
                    obj.roleFill = 2;
                    delete obj.roleGradientStart;
                    delete obj.roleGradientEnd;
                    obj.set('fill', Utils.getPaletteColor(2));
                }

                this.updateCanvasColors();
                this.updateGradientUI(obj);
                this.renderPaletteUI();
                History.save();
            },

            setGradientSlot:function(slot) {
                state.gradSlot = slot;
                
                const btnStart = Utils.getElement('btn-grad-start');
                const btnEnd = Utils.getElement('btn-grad-end');

                if (slot === 'start') {
                    if (btnStart) {
                        btnStart.className = "flex-1 py-2 flex items-center justify-center gap-2 rounded-lg bg-white shadow-sm ring-1 ring-black/5 text-blue-600 transition";
                        btnStart.setAttribute('aria-pressed', 'true');
                    }
                    if (btnEnd) {
                        btnEnd.className = "flex-1 py-2 flex items-center justify-center gap-2 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-white/50 transition";
                        btnEnd.setAttribute('aria-pressed', 'false');
                    }
                } else {
                    if (btnStart) {
                        btnStart.className = "flex-1 py-2 flex items-center justify-center gap-2 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-white/50 transition";
                        btnStart.setAttribute('aria-pressed', 'false');
                    }
                    if (btnEnd) {
                        btnEnd.className = "flex-1 py-2 flex items-center justify-center gap-2 rounded-lg bg-white shadow-sm ring-1 ring-black/5 text-blue-600 transition";
                        btnEnd.setAttribute('aria-pressed', 'true');
                    }
                }
            },

            updateGradientUI:function(obj) {
                const controls = Utils.getElement('gradient-controls');
                if (!controls) return;

                if (obj && obj.roleGradientStart !== undefined) {
                    controls.classList.remove('hidden');

                    const startColor = Utils.getPaletteColor(obj.roleGradientStart);
                    const endColor = Utils.getPaletteColor(obj.roleGradientEnd);

                    const previewStart = Utils.getElement('preview-grad-start');
                    const previewEnd = Utils.getElement('preview-grad-end');

                    if (previewStart) previewStart.style.backgroundColor = startColor;
                    if (previewEnd) previewEnd.style.backgroundColor = endColor;

                    const currentBalance = (obj.gradBalance || 0) * 100;
                    Utils.setInputValue('grad-balance', currentBalance);
                } else {
                    controls.classList.add('hidden');
                }
            },

            updateGradientBalance:function(val) {
                const obj = canvas.getActiveObject();
                if (!obj || obj.locked || obj.roleGradientStart === undefined) return;

                obj.gradBalance = parseInt(val) / 100;
                this.updateCanvasColors();
                History.save();
            },

            updateCanvasColors:function() {
                const applyColor = (o) => {
                    if (o.locked) return;

                    // Handle particle groups
                    if ((o.isParticleGroup || (o.type === 'group' && o.roleGradientStart !== undefined)) && 
                        o.roleGradientStart !== undefined) {
                        
                        const startColor = Utils.getPaletteColor(o.roleGradientStart);
                        const endColor = Utils.getPaletteColor(o.roleGradientEnd);
                        const h = o.height;
                        const objects = o.getObjects();

                        objects.forEach(child => {
                            const t = (child.top + (h / 2)) / h;
                            const newCol = Utils.getInterpColor(startColor, endColor, Math.max(0, Math.min(1, t)));
                            const type = o.generativeType || (child.strokeWidth > 0 && !child.fill ? 'stroke' :'fill');

                            if (type === 'stroke') {
                                child.set('stroke', newCol);
                            } else {
                                child.set('fill', newCol);
                                if (child.strokeWidth > 0) child.set('stroke', newCol);
                            }
                        });
                        o.set('dirty', true);
                        return;
                    }

                    // Standard gradients
                    if (o.roleGradientStart !== undefined && o.roleGradientEnd !== undefined) {
                        const startColor = Utils.getPaletteColor(o.roleGradientStart);
                        const endColor = Utils.getPaletteColor(o.roleGradientEnd);
                        const shift = o.gradBalance || 0;

                        const shiftedCoords = {
                            x1:0 + shift,
                            y1:0 + shift,
                            x2:1 + shift,
                            y2:1 + shift
                        };

                        if (o.type === 'path' && o.width > o.height * 1.5) {
                            shiftedCoords.y1 = 0;
                            shiftedCoords.y2 = 0;
                        }

                        const newGrad = new fabric.Gradient({
                            type:'linear',
                            gradientUnits:'percentage',
                            coords:shiftedCoords,
                            colorStops:[
                                { offset:0, color:startColor },
                                { offset:1, color:endColor }
                            ]
                        });

                        if (o.strokeWidth > 0) o.set('stroke', newGrad);

                        if (o.roleFill !== -1) {
                            o.set('fill', newGrad);
                            
                        } else {
                            o.set('fill', 'transparent');
                            o.set('perPixelTargetFind', true);
                        }
                    }
                    // Standard solid colors
                    else {
                        if (o.roleFill !== undefined && o.roleFill !== null && o.roleFill !== -99) {
                            o.set('fill', Utils.getPaletteColor(o.roleFill));
                            
                        }
                        if (o.roleStroke !== undefined && o.roleStroke !== null && o.roleStroke !== -99) {
                            o.set('stroke', Utils.getPaletteColor(o.roleStroke));
                        }
                    }

                    // Recursion for groups
                    if (o.getObjects && !o.isParticleGroup) {
                        o.getObjects().forEach(child => applyColor(child));
                        o.set('dirty', true);
                    }
                };

                canvas.setBackgroundColor(Utils.getPaletteColor(0), canvas.renderAll.bind(canvas));
                canvas.getObjects().forEach(obj => applyColor(obj));
                canvas.requestRenderAll();
            }
        };

        // ========================================
        // TEXT MODULE
        // ========================================
        
        const Text = {
            openEditor:function() {
                const obj = canvas.getActiveObject();
                if (!obj || obj.type !== 'i-text') return;

                const modal = Utils.getElement('text-editor');
                const input = Utils.getElement('text-input');

                if (modal && input) {
                    input.value = obj.text;
                    input.style.fontFamily = obj.fontFamily;
                    input.style.textAlign = obj.textAlign;
                    this.renderFontList(obj.fontFamily);
                    
                    const fontMenu = Utils.getElement('font-menu');
                    if (fontMenu) fontMenu.classList.add('hidden');
                    
                    modal.classList.remove('hidden');
                    input.focus();
                }
            },

            closeEditor:function(save) {
                const modal = Utils.getElement('text-editor');
                if (modal) modal.classList.add('hidden');

                if (save) {
                    const obj = canvas.getActiveObject();
                    const input = Utils.getElement('text-input');
                    if (obj && obj.type === 'i-text' && input) {
                        obj.set('text', input.value);
                        canvas.requestRenderAll();
                        History.save();
                    }
                }
            },

            setProp:function(prop, value) {
                const obj = canvas.getActiveObject();
                if (obj && obj.type === 'i-text') {
                    obj.set(prop, value);
                    
                    if (prop === 'textAlign') {
                        const input = Utils.getElement('text-input');
                        if (input) input.style.textAlign = value;
                    }
                    
                    canvas.requestRenderAll();
                    History.save();
                }
            },

            toggleFontMenu:function() {
                const menu = Utils.getElement('font-menu');
                const btn = document.querySelector('[aria-controls="font-menu"]');
                
                if (menu) {
                    menu.classList.toggle('hidden');
                    if (btn) {
                        btn.setAttribute('aria-expanded', !menu.classList.contains('hidden'));
                    }
                }
            },

            renderFontList:function(currentFont) {
                const container = Utils.getElement('font-list-container');
                if (!container) return;

                container.innerHTML = '';

                FONT_OPTIONS.forEach(font => {
                    const btn = document.createElement('button');
                    const isActive = font.val === currentFont;
                    
                    btn.className = `w-full text-left px-3 py-2 rounded border text-sm flex items-center justify-between ${
                        isActive ?  'bg-blue-50 border-blue-500 text-blue-700' :'bg-white border-gray-200'
                    }`;
                    btn.style.fontFamily = font.val;
                    btn.setAttribute('role', 'option');
                    btn.setAttribute('aria-selected', isActive);
                    btn.innerHTML = `<span>${font.name}</span>`;
                    
                    btn.onclick = () => {
                        this.applyFont(font.val);
                        this.renderFontList(font.val);
                    };
                    
                    container.appendChild(btn);
                });
            },

            applyFont:function(fontFamily) {
                const obj = canvas.getActiveObject();
                const input = Utils.getElement('text-input');
                
                if (obj && obj.type === 'i-text') {
                    obj.set('fontFamily', fontFamily);
                    if (input) input.style.fontFamily = fontFamily;
                    canvas.requestRenderAll();
                    History.save();
                }
            }
        };

      // ========================================
        // TEMPLATES MODULE (UPDATED FOR INDEXEDDB)
        // ========================================
        
        const Templates = {
            openSaveModal: function() {
                const modal = Utils.getElement('save-modal');
                if (modal) modal.classList.remove('hidden');
            },

            confirmSave: async function() {
                const nameInput = Utils.getElement('template-name-input');
                const name = nameInput ? nameInput.value : '';
                
                if (!name) {
                    alert('Please enter a name for your design.');
                    return;
                }

                // Compress numbers to save space
                const json = canvas.toJSON(SAVE_PROPS);
                const optimizedString = JSON.stringify(json).replace(/(\d+\.\d{2})\d+/g, '$1');
                const optimizedData = JSON.parse(optimizedString);

                try {
                    // Load existing list
                    const saved = await localforage.getItem('deckforge_templates');
                    const templates = saved ? saved : [];
                    
                    templates.push({ name: name, data: optimizedData });
                    
                    // Save back to Database
                    await localforage.setItem('deckforge_templates', templates);
                    
                    const modal = Utils.getElement('save-modal');
                    if (modal) modal.classList.add('hidden');
                    
                    this.loadList();
                } catch (e) {
                    console.error(e);
                    alert("Error saving. The database might be full or corrupted.");
                }
            },

            loadList: async function() {
                const list = Utils.getElement('template-list');
                if (!list) return;

                list.innerHTML = '<div class="text-xs text-gray-400 p-2">Loading...</div>';

                try {
                    const saved = await localforage.getItem('deckforge_templates');
                    list.innerHTML = ''; // Clear loading message

                    if (saved && saved.length > 0) {
                        saved.forEach((template, index) => {
                            const div = document.createElement('div');
                            div.className = "flex justify-between items-center p-2 bg-gray-50 border rounded group hover:border-blue-200 transition";
                            
                            div.innerHTML = `
                                <span class="text-xs truncate w-24 font-medium text-gray-600">${template.name}</span>
                                <div class="flex gap-2">
                                    <button class="load-btn text-[10px] text-blue-600 font-bold bg-blue-50 px-2 py-1 rounded hover:bg-blue-100">LOAD</button>
                                    <button class="delete-btn text-gray-300 hover:text-red-500 transition"><i class="ph-bold ph-trash"></i></button>
                                </div>
                            `;
                            
                            div.querySelector('.load-btn').onclick = () => this.load(index);
                            div.querySelector('.delete-btn').onclick = () => this.delete(index);
                            
                            list.appendChild(div);
                        });
                    } else {
                        list.innerHTML = '<div class="text-[10px] text-gray-400 p-2">No saved designs found.</div>';
                    }
                } catch (e) {
                    console.error('Error loading template list:', e);
                }
            },

            load: async function(index) {
                try {
                    const saved = await localforage.getItem('deckforge_templates');
                    if (!saved || !saved[index]) return;

                    if (confirm(`Load '${saved[index].name}'? Unsaved changes will be lost.`)) {
                        canvas.loadFromJSON(saved[index].data, () => {
                            Theme.updateCanvasColors();
                            canvas.requestRenderAll();
                            History.save();
                            UI.closeAllDrawers();
                        });
                    }
                } catch (e) {
                    console.error('Error loading template:', e);
                }
            },

            delete: async function(index) {
                if (confirm("Permanently delete this saved design?")) {
                    try {
                        const saved = await localforage.getItem('deckforge_templates');
                        if (saved) {
                            saved.splice(index, 1);
                            await localforage.setItem('deckforge_templates', saved);
                            this.loadList();
                        }
                    } catch (e) {
                        console.error('Error deleting template:', e);
                    }
                }
            }
        };

        // ========================================
        // DECK DATA MODULE
        // ========================================
        
        const DeckData = {
            variables:{},
            count:0,
            currentIndex:0,
            originalTexts:new Map(),

            setVariable:function(key, valueString) {
                const varName = key.trim().startsWith('.') ? key.trim().substring(1) :key.trim();
                let values = [];

                // Parse ranges or lists
                if (valueString.match(/^\d+-\d+$/)) {
                    const parts = valueString.split('-');
                    for (let i = parseInt(parts[0]); i <= parseInt(parts[1]); i++) {
                        values.push(i.toString());
                    }
                } else if (valueString.includes(',')) {
                    values = valueString.split(',').map(s => s.trim());
                } else {
                    values = [valueString.trim()];
                }

                if (this.count === 0 && values.length > 1) {
                    this.count = values.length;

                    const nav = Utils.getElement('deck-nav');
                    const btn = Utils.getElement('btn-init-deck');
                    const ctrls = Utils.getElement('deck-controls');

                    if (nav) nav.classList.remove('hidden');
                    if (btn) btn.classList.remove('hidden');
                    if (ctrls) ctrls.classList.add('hidden');

                    Utils.setText('deck-total', this.count);
                }

                this.variables[varName] = values;
                this.renderVariableList();
                return true;
            },

            enablePreview:function() {
                const btn = Utils.getElement('btn-init-deck');
                const ctrls = Utils.getElement('deck-controls');

                if (btn) btn.classList.add('hidden');
                if (ctrls) ctrls.classList.remove('hidden');

                this.updateCanvas();
            },

            navigate:function(dir) {
                if (this.count === 0) return;

                let newIdx = this.currentIndex + dir;
                if (newIdx < 0) newIdx = this.count - 1;
                if (newIdx >= this.count) newIdx = 0;

                this.currentIndex = newIdx;
                this.updateCanvas();
            },

            updateCanvas:function() {
                const processObj = (obj) => {
                    if (obj.type === 'group') {
                        obj.getObjects().forEach(child => processObj(child));
                        return;
                    }

                    if (obj.type === 'i-text') {
                        if (!this.originalTexts.has(obj)) {
                            this.originalTexts.set(obj, obj.text);
                        }

                        let newText = this.originalTexts.get(obj);
                        Object.keys(this.variables).forEach(key => {
                            const valList = this.variables[key];
                            const val = valList.length === 1 
                                ? valList[0] 
                                :(valList[this.currentIndex] || valList[valList.length - 1]);
                            newText = newText.split('.' + key).join(val);
                        });
                        obj.set('text', newText);
                    }
                };

                canvas.getObjects().forEach(obj => processObj(obj));
                canvas.requestRenderAll();
                Utils.setText('deck-idx', this.currentIndex + 1);
            },

            openVariableModal:function() {
                const modal = Utils.getElement('variable-modal');
                const nameInput = Utils.getElement('var-name');
                
                if (modal) modal.classList.remove('hidden');
                if (nameInput) nameInput.focus();
            },

            confirmAddVariable:function() {
                const nameInput = Utils.getElement('var-name');
                const valuesInput = Utils.getElement('var-values');
                const modal = Utils.getElement('variable-modal');

                if (nameInput && valuesInput) {
                    const name = nameInput.value.trim();
                    const values = valuesInput.value.trim();

                    if (name && values) {
                        this.setVariable(name, values);
                        nameInput.value = '';
                        valuesInput.value = '';
                    }
                }

                if (modal) modal.classList.add('hidden');
            },

            renderVariableList:function() {
                const list = Utils.getElement('variable-list');
                if (!list) return;

                list.innerHTML = '';

                const keys = Object.keys(this.variables);
                if (keys.length === 0) {
                    list.innerHTML = '<div class="text-[10px] text-gray-400 italic p-1">No variables added yet.</div>';
                    return;
                }

                keys.forEach(key => {
                    const valCount = this.variables[key].length;
                    const div = document.createElement('div');
                    div.className = "flex justify-between items-center p-2 bg-gray-50 border rounded text-xs";
                    div.setAttribute('role', 'listitem');
                    div.innerHTML = `
                        <div class="flex items-center gap-2">
                            <span class="font-bold text-blue-600">.${key}</span>
                        </div>
                        <span class="text-gray-400 font-mono text-[10px]">${valCount} items</span>
                    `;
                    list.appendChild(div);
                });
            }
        };

// ========================================
// SVG MODULE (Patched for Smart Gradients)
// ========================================

const SVG = {
    confirmAdd: function() {
        const input = Utils.getElement('svg-input');
        const modal = Utils.getElement('svg-modal');
        
        if (!input) return;
        const code = input.value;
        if (!code) return;

        if (typeof chroma === 'undefined') {
            alert("Chroma.js is missing!");
            return;
        }

        try {
            fabric.loadSVGFromString(code, (objects, options) => {
                if (!objects || objects.length === 0) {
                    alert("Could not parse SVG. Please check the code.");
                    return;
                }

                // Helper to match a color string to your palette
                const findBestRole = (colorString) => {
                    if (!colorString || colorString === 'none' || colorString === 'transparent') {
                        return -99;
                    }

                    let bestRole = -99;
                    let minDistance = Infinity;

                    state.palette.forEach((themeColor, index) => {
                        try {
                            const dist = chroma.distance(colorString, themeColor);
                            // We use a looser threshold for gradients to ensure they snap
                            if (dist < minDistance) {
                                minDistance = dist;
                                bestRole = index;
                            }
                        } catch (e) { /* Ignore */ }
                    });

                    return bestRole;
                };

                const processSVGObject = (o) => {
                    o.set('objectCaching', false);

                    // 1. Handle FILLS
                    if (o.fill) {
                        // A. Solid Colors (Existing Logic)
                        if (typeof o.fill === 'string' && o.fill !== 'none') {
                            const role = findBestRole(o.fill);
                            if (role !== -99) {
                                o.roleFill = role;
                                o.set('fill', state.palette[role]);
                            }
                        } 
                        // B. Gradients (NEW LOGIC)
                        else if (typeof o.fill === 'object' && o.fill.colorStops) {
                            // If it's a gradient, try to convert it to a "Smart Gradient"
                            const stops = o.fill.colorStops;
                            
                            // We currently only support upgrading 2-stop gradients to Smart Gradients
                            if (stops.length >= 2) {
                                const startRole = findBestRole(stops[0].color);
                                const endRole = findBestRole(stops[stops.length - 1].color);
                                
                                if (startRole !== -99 && endRole !== -99) {
                                    // SUCCESS: We found matching roles for start and end
                                    // Assign the dynamic properties
                                    o.roleGradientStart = startRole;
                                    o.roleGradientEnd = endRole;
                                    o.gradBalance = 0;
                                    
                                    // The Theme engine will now take over and render a live gradient
                                    // overriding this static one on the next update.
                                }
                            }
                            
                            // Fallback: Still update the static colors just in case
                            stops.forEach(stop => {
                                const role = findBestRole(stop.color);
                                if (role !== -99) stop.color = state.palette[role];
                            });
                        }
                    }

                    // 2. Handle STROKES
                    if (o.stroke && typeof o.stroke === 'string' && o.stroke !== 'none') {
                        const role = findBestRole(o.stroke);
                        if (role !== -99) {
                            o.roleStroke = role;
                            o.set('stroke', state.palette[role]);
                        }
                    }

                    // Recurse into groups
                    if (o.getObjects) {
                        o.getObjects().forEach(processSVGObject);
                        o.set('dirty', true);
                    }
                };

                const obj = fabric.util.groupSVGElements(objects, options);
                
                // Center the new object
                obj.set({
                    left: CARD_WIDTH / 2,
                    top: CARD_HEIGHT / 2,
                    originX: 'center',
                    originY: 'center',
                    objectCaching: false
                });

                // Scale down if huge
                if (obj.width > CARD_WIDTH * 0.8) {
                    obj.scaleToWidth(CARD_WIDTH * 0.8);
                }

                // Run the processing logic
                processSVGObject(obj);

                canvas.add(obj);
                canvas.setActiveObject(obj);
                
                // Force an immediate color update to ensure gradients render correctly
                Theme.updateCanvasColors();
                History.save();

                if (modal) modal.classList.add('hidden');
                if (input) input.value = '';
            });
        } catch (e) {
            console.error('SVG parsing error:', e);
            alert("Error parsing SVG. Please check the code.");
        }
    }
};


        // ========================================
        // EXPORT MODULE (SMART GRID EDITION)
        // ========================================
        
        const Export = {
            open: function(deckIndex = -1) {
                const modal = Utils.getElement('export-modal');
                const title = Utils.getElement('export-title');
                const subtitle = Utils.getElement('export-subtitle');
                
                const optsSingle = Utils.getElement('opts-single');
                const optsDeck = Utils.getElement('opts-deck');
                const settings = Utils.getElement('export-settings');

                const modeInput = Utils.getElement('export-mode');
                const targetInput = Utils.getElement('export-target-idx');

                if (!modal) return;

                if (deckIndex === -1) {
                    title.innerText = "Export Card";
                    subtitle.innerText = "Save current canvas.";
                    optsSingle.classList.remove('hidden');
                    optsDeck.classList.add('hidden');
                    settings.classList.add('hidden'); 
                    modeInput.value = 'single';
                } else {
                    const deckName = DeckCollection.decks[deckIndex].name;
                    title.innerText = "Export Deck";
                    subtitle.innerText = `${deckName} (${DeckCollection.decks[deckIndex].cards.length} cards)`;
                    optsSingle.classList.add('hidden');
                    optsDeck.classList.remove('hidden');
                    settings.classList.remove('hidden'); 
                    modeInput.value = 'deck';
                    targetInput.value = deckIndex;
                }
                
                modal.classList.remove('hidden');
            },

            handleExport: function() { this.open(-1); },

            process: async function(format) {
                const modal = Utils.getElement('export-modal');
                if (modal) modal.classList.add('hidden');

                const mode = Utils.getElement('export-mode').value;
                const targetIdx = parseInt(Utils.getElement('export-target-idx').value);
                const includeBleed = document.getElementById('export-bleed')?.checked;
                
                // Get Page Size Config
                const formatSelect = document.getElementById('export-format');
                const paperType = formatSelect ? formatSelect.value : 'a4';
                
                let customDim = null;
                if (paperType === 'custom') {
                    customDim = [
                        parseInt(document.getElementById('custom-w').value) || 210,
                        parseInt(document.getElementById('custom-h').value) || 297
                    ];
                }

                state.isProcessing = true;

                try {
                    if (mode === 'single') {
                        await this.exportSingle(format);
                    } else {
                        await this.exportDeck(targetIdx, format, includeBleed, paperType, customDim);
                    }
                } catch (e) {
                    console.error(e);
                    alert("Export failed.");
                } finally {
                    state.isProcessing = false;
                }
            },

            exportSingle: async function(format) {
                const fileName = `card-${Date.now()}.${format}`;
                let blob;

                if (format === 'json') {
                    const json = JSON.stringify(canvas.toJSON(SAVE_PROPS), null, 2);
                    blob = new Blob([json], { type: 'application/json' });
                } else if (format === 'svg') {
                    const svg = canvas.toSVG();
                    blob = new Blob([svg], { type: 'image/svg+xml' });
                } else {
                    const dataUrl = canvas.toDataURL({
                        format: format === 'jpg' ? 'jpeg' : 'png',
                        multiplier: 2, 
                        quality: 0.9
                    });
                    blob = await (await fetch(dataUrl)).blob();
                }

                const link = document.createElement('a');
                link.download = fileName;
                link.href = URL.createObjectURL(blob);
                link.click();
            },

            exportDeck: async function(deckIdx, format, includeBleed, paperType, customDim) {
                const deck = DeckCollection.decks[deckIdx];
                if (!deck || deck.cards.length === 0) {
                    alert("Deck is empty.");
                    return;
                }

                // 1. PDF SHEET EXPORT (Dynamic Grid)
                if (format === 'pdf-sheet') {
                    if (!window.jspdf) return alert("jsPDF library missing");
                    const { jsPDF } = window.jspdf;
                    
                    // Determine Page Dimensions (mm)
                    let pW = 210, pH = 297; // Default A4
                    
                    if (paperType === 'custom' && customDim) {
                        pW = customDim[0]; pH = customDim[1];
                    } else if (paperType === 'letter') { pW = 215.9; pH = 279.4; }
                    else if (paperType === 'legal') { pW = 215.9; pH = 355.6; }
                    else if (paperType === 'tabloid') { pW = 279.4; pH = 431.8; }
                    else if (paperType === 'a3') { pW = 297; pH = 420; }

                    // Create PDF with custom size support
                    const doc = new jsPDF({ 
                        orientation: pW > pH ? 'l' : 'p', 
                        unit: 'mm', 
                        format: paperType === 'custom' ? [pW, pH] : paperType 
                    });

                    // Card Dimensions (Standard Poker)
                    const cardW = 63.5; 
                    const cardH = 88.9;
                    const bleed = includeBleed ? 3 : 0;
                    
                    const cellW = cardW + (bleed * 2);
                    const cellH = cardH + (bleed * 2);
                    
                    // SMART GRID CALCULATION
                    // Calculate how many fit with a 10mm safety margin
                    const margin = 10;
                    const availW = pW - (margin * 2);
                    const availH = pH - (margin * 2);
                    
                    const cols = Math.floor(availW / cellW);
                    const rows = Math.floor(availH / cellH);
                    
                    if (cols < 1 || rows < 1) return alert("Page too small for cards!");

                    // Center the grid
                    const startX = (pW - (cols * cellW)) / 2;
                    const startY = (pH - (rows * cellH)) / 2;

                    let col = 0, row = 0;

                    for (let i = 0; i < deck.cards.length; i++) {
                        await new Promise(resolve => canvas.loadFromJSON(deck.cards[i], resolve));
                        Theme.updateCanvasColors(); 
                        canvas.renderAll();

                        const imgData = canvas.toDataURL({ format: 'png', multiplier: 1.5 });

                        if (i > 0 && i % (cols * rows) === 0) {
                            doc.addPage();
                            col = 0; row = 0;
                        }

                        const x = startX + (col * cellW);
                        const y = startY + (row * cellH);
                        doc.addImage(imgData, 'PNG', x, y, cellW, cellH);

                        if (includeBleed) {
                            doc.setLineWidth(0.1);
                            doc.setDrawColor(0);
                            const mLen = 3; 
                            const cx = x + bleed;
                            const cy = y + bleed;
                            const cw = cardW;
                            const ch = cardH;

                            // Cut Marks (At the CUT line, inside the bleed)
                            // TL
                            doc.line(cx, y - mLen, cx, y); 
                            doc.line(x - mLen, cy, x, cy); 
                            // TR
                            doc.line(cx + cw, y - mLen, cx + cw, y); 
                            doc.line(x + cellW, cy, x + cellW + mLen, cy);
                            // BL
                            doc.line(cx, y + cellH, cx, y + cellH + mLen);
                            doc.line(x - mLen, cy + ch, x, cy + ch);
                            // BR
                            doc.line(cx + cw, y + cellH, cx + cw, y + cellH + mLen);
                            doc.line(x + cellW, cy + ch, x + cellW + mLen, cy + ch);
                        }

                        col++;
                        if (col >= cols) { col = 0; row++; }
                    }

                    doc.save(`${deck.name.replace(/\s+/g, '_')}_${paperType}.pdf`);
                } 
                // 2. ZIP Export
                else if (format === 'zip') {
                    if (!window.JSZip) return alert("JSZip missing");
                    const zip = new JSZip();
                    const folder = zip.folder("images");

                    for (let i = 0; i < deck.cards.length; i++) {
                        await new Promise(resolve => canvas.loadFromJSON(deck.cards[i], resolve));
                        Theme.updateCanvasColors();
                        const dataUrl = canvas.toDataURL({ format: 'png', multiplier: 2 });
                        const blob = await (await fetch(dataUrl)).blob();
                        folder.file(`card_${i+1}.png`, blob);
                    }

                    const content = await zip.generateAsync({ type: "blob" });
                    const link = document.createElement('a');
                    link.download = `${deck.name}_Images.zip`;
                    link.href = URL.createObjectURL(content);
                    link.click();
                }
                // 3. PDF Digital
                else if (format === 'pdf-single') {
                     if (!window.jspdf) return alert("jsPDF library missing");
                    const { jsPDF } = window.jspdf;
                    const doc = new jsPDF({ orientation: 'p', unit: 'mm', format: [63.5, 88.9] });

                    for (let i = 0; i < deck.cards.length; i++) {
                        if (i > 0) doc.addPage();
                        await new Promise(resolve => canvas.loadFromJSON(deck.cards[i], resolve));
                        Theme.updateCanvasColors();
                        const imgData = canvas.toDataURL({ format: 'png', multiplier: 2 });
                        doc.addImage(imgData, 'PNG', 0, 0, 63.5, 88.9);
                    }
                    doc.save(`${deck.name}_Digital.pdf`);
                }
            }
        };
 // ========================================
        // DECK COLLECTION MODULE (UPDATED FOR INDEXEDDB)
        // ========================================
        
        const DeckCollection = {
            decks: [],
            activeDeckIdx: -1,
            rouletteCardIdx: 0,
            rCanvas: null,
            rBackCanvas: null,

            init: async function() {
                try {
                    const saved = await localforage.getItem('deckforge_decks');
                    if (saved) {
                        this.decks = saved;
                    } else {
                        this.decks = [{ name: 'Starter Deck', cards: [], back: null }];
                    }
                    this.renderUI();
                } catch (e) {
                    console.error('Error loading decks:', e);
                    this.decks = [{ name: 'Starter Deck', cards: [], back: null }];
                    this.renderUI();
                }
            },

            save: async function() {
                try {
                    await localforage.setItem('deckforge_decks', this.decks);
                    this.renderUI();
                } catch (e) {
                    alert("Error saving deck data. Database might be full.");
                }
            },

            renderUI: function() {
                const container = Utils.getElement('deck-list-ui');
                const selector = Utils.getElement('deck-selector');
                
                if (!container || !selector) return;

                container.innerHTML = '';
                selector.innerHTML = '';

                this.decks.forEach((deck, idx) => {
                    const div = document.createElement('div');
                    div.className = "flex flex-col p-3 bg-white border border-gray-200 rounded-xl shadow-sm hover:border-purple-300 transition group mb-2";
                    
                    div.innerHTML = `
                        <div class="flex justify-between items-center mb-2">
                            <div class="flex items-center gap-3 cursor-pointer deck-open-btn">
                                <div class="w-8 h-8 rounded bg-purple-100 text-purple-600 flex items-center justify-center font-bold text-xs">${deck.cards.length}</div>
                                <span class="text-xs font-bold text-gray-700 group-hover:text-purple-700">${deck.name}</span>
                            </div>
                            
                            <div class="flex gap-1">
                                <button class="deck-export-btn w-8 h-8 flex items-center justify-center rounded-full hover:bg-blue-50 text-gray-400 hover:text-blue-600 transition" title="Export Deck">
                                    <i class="ph-bold ph-export"></i>
                                </button>
                                <button class="deck-delete-btn w-8 h-8 flex items-center justify-center rounded-full hover:bg-red-50 text-gray-400 hover:text-red-500 transition" title="Delete Deck">
                                    <i class="ph-bold ph-trash"></i>
                                </button>
                            </div>
                        </div>
                        <div class="flex gap-2">
                            <button class="deck-back-btn flex-1 py-1.5 bg-gray-50 text-[10px] font-bold text-gray-500 hover:bg-gray-100 rounded uppercase border border-gray-200 transition">
                                ${deck.back ? '<i class="ph-fill ph-check-circle text-green-500"></i> Back Set' : 'Set Active as Back'}
                            </button>
                        </div>
                    `;
                    
                    div.querySelector('.deck-open-btn').onclick = () => this.openRoulette(idx);
                    div.querySelector('.deck-delete-btn').onclick = () => this.deleteDeck(idx);
                    div.querySelector('.deck-back-btn').onclick = () => this.setBack(idx);
                    
                    // Hook up the new Export button
                    div.querySelector('.deck-export-btn').onclick = (e) => {
                        e.stopPropagation();
                        // Trigger Export Module in 'deck' mode
                        DeckForge.Export.open(idx); 
                    };
                    
                    container.appendChild(div);

                    const opt = document.createElement('option');
                    opt.value = idx;
                    opt.innerText = deck.name;
                    selector.appendChild(opt);
                });
            },

            createDeck: function() {
                const name = prompt("Deck Name:", "New Deck " + (this.decks.length + 1));
                if (name) {
                    this.decks.push({ name: name, cards: [], back: null });
                    this.save();
                }
            },

            deleteDeck: function(idx) {
                if (confirm("Delete this entire deck?")) {
                    this.decks.splice(idx, 1);
                    this.save();
                }
            },

            addActiveToDeck: function() {
                const selector = Utils.getElement('deck-selector');
                if (!selector) return;

                const idx = parseInt(selector.value);
                if (this.decks[idx]) {
                    const rawJSON = canvas.toJSON(SAVE_PROPS);
                    const optimized = JSON.parse(
                        JSON.stringify(rawJSON).replace(/(\d+\.\d{2})\d+/g, '$1')
                    );

                    this.decks[idx].cards.push(optimized);
                    this.save();

                    const btn = document.querySelector('button[onclick="DeckForge.DeckCollection.addActiveToDeck()"]');
                    if (btn) {
                        const oldText = btn.innerText;
                        btn.innerText = "SAVED!";
                        btn.classList.add('bg-green-600');
                        setTimeout(() => {
                            btn.innerText = oldText;
                            btn.classList.remove('bg-green-600');
                        }, 1000);
                    }
                }
            },

            setBack: function(deckIdx) {
                if (confirm("Set current canvas as deck back?")) {
                    this.decks[deckIdx].back = canvas.toJSON(SAVE_PROPS);
                    this.save();
                }
            },

            openRoulette: function(deckIdx) {
                if (this.decks[deckIdx].cards.length === 0) {
                    alert("Deck is empty.");
                    return;
                }

                this.activeDeckIdx = deckIdx;
                this.rouletteCardIdx = 0;
                
                const cardInner = Utils.getElement('card-inner');
                if (cardInner) cardInner.classList.remove('flipped');

                const el = Utils.getElement('deck-roulette');
                if (el) {
                    el.classList.remove('hidden');
                    el.setAttribute('aria-hidden', 'false');
                    setTimeout(() => el.classList.remove('opacity-0'), 10);
                }

                Utils.setText('roulette-title', this.decks[deckIdx].name);

                // Initialize canvases
                if (!this.rCanvas) {
                    this.rCanvas = new fabric.Canvas('roulette-canvas', {
                        width: CARD_WIDTH,
                        height: CARD_HEIGHT,
                        backgroundColor: '#fff',
                        selection: false
                    });
                    const rouletteCanvasEl = Utils.getElement('roulette-canvas');
                    if (rouletteCanvasEl) {
                        rouletteCanvasEl.style.width = '100%';
                        rouletteCanvasEl.style.height = '100%';
                    }
                }

                if (!this.rBackCanvas) {
                    this.rBackCanvas = new fabric.Canvas('roulette-back-canvas', {
                        width: CARD_WIDTH,
                        height: CARD_HEIGHT,
                        backgroundColor: '#111',
                        selection: false
                    });
                    const rouletteBackCanvasEl = Utils.getElement('roulette-back-canvas');
                    if (rouletteBackCanvasEl) {
                        rouletteBackCanvasEl.style.width = '100%';
                        rouletteBackCanvasEl.style.height = '100%';
                    }
                }

                this.showCard(0);

                // Render back
                const deck = this.decks[deckIdx];
                if (deck.back) {
                    this.rBackCanvas.loadFromJSON(deck.back, () => {
                        this.rBackCanvas.getObjects().forEach(obj => {
                            obj.set({ selectable: false, evented: false });
                        });
                        this.rBackCanvas.requestRenderAll();
                        const noBackMsg = Utils.getElement('no-back-msg');
                        if (noBackMsg) noBackMsg.classList.add('hidden');
                    });
                } else {
                    this.rBackCanvas.clear();
                    this.rBackCanvas.setBackgroundColor('#1f2937', this.rBackCanvas.renderAll.bind(this.rBackCanvas));
                    const noBackMsg = Utils.getElement('no-back-msg');
                    if (noBackMsg) noBackMsg.classList.remove('hidden');
                }
            },

            closeRoulette: function() {
                RouletteZoom.reset();
                const el = Utils.getElement('deck-roulette');
                if (el) {
                    el.classList.add('opacity-0');
                    el.setAttribute('aria-hidden', 'true');
                    setTimeout(() => el.classList.add('hidden'), 300);
                }
            },

            toggleFlip: function() {
                const cardInner = Utils.getElement('card-inner');
                if (!cardInner) return;

                const isFlippingToBack = !cardInner.classList.contains('flipped');
                cardInner.classList.toggle('flipped');

                if (isFlippingToBack && this.rBackCanvas) {
                    setTimeout(() => {
                        this.rBackCanvas.calcOffset();
                        this.rBackCanvas.requestRenderAll();
                    }, 50);
                }
            },

            nav: function(dir) {
                RouletteZoom.reset();
                
                const cardInner = Utils.getElement('card-inner');
                if (cardInner) cardInner.classList.remove('flipped');

                const deck = this.decks[this.activeDeckIdx];
                let next = this.rouletteCardIdx + dir;
                
                if (next >= deck.cards.length) next = 0;
                if (next < 0) next = deck.cards.length - 1;

                setTimeout(() => this.showCard(next), 200);
            },

            showCard: function(idx) {
                this.rouletteCardIdx = idx;
                const deck = this.decks[this.activeDeckIdx];

                Utils.setText('roulette-idx', idx + 1);
                Utils.setText('roulette-total', deck.cards.length);

                this.rCanvas.loadFromJSON(deck.cards[idx], () => {
                    this.rCanvas.getObjects().forEach(obj => {
                        obj.set({ selectable: false, evented: false });
                    });
                    this.rCanvas.requestRenderAll();
                });
            },

            loadCurrent: function() {
                if (confirm("Edit this card?")) {
                    const data = this.decks[this.activeDeckIdx].cards[this.rouletteCardIdx];
                    canvas.loadFromJSON(data, () => {
                        Theme.updateCanvasColors();
                        canvas.requestRenderAll();
                        History.save();
                        this.closeRoulette();
                    });
                }
            },

            deleteCurrent: function() {
                if (confirm("Remove this card from the deck?")) {
                    this.decks[this.activeDeckIdx].cards.splice(this.rouletteCardIdx, 1);
                    this.save();
                    
                    if (this.decks[this.activeDeckIdx].cards.length === 0) {
                        this.closeRoulette();
                    } else {
                        this.nav(0);
                    }
                }
            }
        };
