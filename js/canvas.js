// js/canvas.js

(function() {
    'use strict';

    DeckForge.Canvas = {
        init: function() {
            DeckForge.canvas = new fabric.Canvas('c', {
                width: DeckForge.CARD_WIDTH,
                height: DeckForge.CARD_HEIGHT,
                backgroundColor: DeckForge.state.palette[0],
                selection: true,
                preserveObjectStacking: true,
                enableRetinaScaling: true
            });

            // ===========================================
            // FIX: Larger Touch Targets for Mobile
            // ===========================================
            fabric.Object.prototype.set({
                transparentCorners: false,
                cornerColor: '#2563eb', // Blue
                cornerStyle: 'circle',  // Round handles are easier to see/touch
                borderColor: '#2563eb',
                
                // Desktop sizes
                cornerSize: 24,         
                padding: 15,            // More "breathing room" around the object
                borderScaleFactor: 3,   // Thicker selection border
                
                // Mobile Touch Area (Invisible hit box around corners)
                // Increased from 40 to 80 for much easier grabbing
                touchCornerSize: 80     
            });

            // Allow clicking through transparent parts
            fabric.Image.prototype.set({ perPixelTargetFind: true });
            fabric.Group.prototype.set({ perPixelTargetFind: true });

            // Extend Serialization
            fabric.Object.prototype.toObject = (function(toObject) {
                return function(propertiesToInclude) {
                    return fabric.util.object.extend(toObject.call(this, propertiesToInclude), {
                        roleFill: this.roleFill,
                        roleStroke: this.roleStroke,
                        locked: this.locked,
                        roleGradientStart: this.roleGradientStart,
                        roleGradientEnd: this.roleGradientEnd,
                        gradBalance: this.gradBalance,
                        isParticleGroup: this.isParticleGroup,
                        generativeType: this.generativeType,
                        _uiId: this._uiId
                    });
                };
            })(fabric.Object.prototype.toObject);

            // Events
            DeckForge.canvas.on('selection:created', this.onSelect.bind(this));
            DeckForge.canvas.on('selection:updated', this.onSelect.bind(this));
            DeckForge.canvas.on('selection:cleared', this.onDeselect.bind(this));
            DeckForge.canvas.on('object:modified', () => DeckForge.History.save());
            DeckForge.canvas.on('object:added', () => DeckForge.History.save());

            this.loadDefaultTemplate();
        },

        // ... (Keep the rest of your existing functions: onSelect, addShape, etc.) ...
        
        // COPY/PASTE the rest of the file from the previous version here
        // If you need the full file again, let me know, but the only change
        // is inside the `fabric.Object.prototype.set` block above.

        onSelect: function(e) {
            if (!e.selected || e.selected.length === 0) return;
            const obj = e.selected[0];

            try {
                DeckForge.UI.minimizeMenu();
                DeckForge.UI.setPropTab('color');
                DeckForge.UI.updateContextualUI(obj);
                DeckForge.UI.updateLockUI(obj.locked);
                if (DeckForge.Theme) DeckForge.Theme.updateGradientUI(obj);

                DeckForge.Utils.setInputValue('inp-opacity', obj.opacity || 1);
                DeckForge.Utils.setText('lbl-opacity', Math.round((obj.opacity || 1) * 100) + '%');
                DeckForge.Utils.setInputValue('inp-stroke', obj.strokeWidth || 0);
                DeckForge.Utils.setText('lbl-stroke', obj.strokeWidth || 0);

                if (obj.type === 'i-text') {
                    DeckForge.Utils.setInputValue('inp-size', obj.fontSize || 40);
                    DeckForge.Utils.setText('lbl-size', obj.fontSize || 40);
                } else {
                    const s = Math.round((obj.scaleX || 1) * 100);
                    DeckForge.Utils.setInputValue('inp-size', s);
                    DeckForge.Utils.setText('lbl-size', s + '%');

                    if (obj.type === 'rect') {
                        DeckForge.Utils.setInputValue('inp-radius', obj.rx || 0);
                        DeckForge.Utils.setText('lbl-radius', obj.rx || 0);
                    }
                }
                if (DeckForge.Theme) DeckForge.Theme.renderPaletteUI();
            } catch (err) {
                console.warn("Selection UI Warning:", err);
            }
        },

        onDeselect: function() {
            const fab = DeckForge.Utils.getElement('btn-open-props');
            const propBar = DeckForge.Utils.getElement('prop-bar');
            const mainControls = DeckForge.Utils.getElement('main-controls');

            if (fab) fab.classList.add('scale-0');
            if (propBar) {
                propBar.classList.add('translate-y-[120%]');
                propBar.style.transform = '';
            }
            if (mainControls) mainControls.classList.remove('translate-y-24');
        },

        loadDefaultTemplate: function() {
            DeckForge.canvas.clear();
            DeckForge.canvas.setBackgroundColor(DeckForge.state.palette[0], DeckForge.canvas.renderAll.bind(DeckForge.canvas));

            const centerNum = new fabric.IText('3', {
                left: DeckForge.CARD_WIDTH / 2,
                top: DeckForge.CARD_HEIGHT / 2,
                fontFamily: 'Inter',
                fontSize: 400,
                fontWeight: 'bold',
                fill: DeckForge.state.palette[4],
                originX: 'center',
                originY: 'center',
                roleFill: 4,
                roleStroke: -1
            });

            DeckForge.canvas.add(centerNum);
            DeckForge.canvas.requestRenderAll();
            DeckForge.History.save();
        },

        addShape: function(type) {
            DeckForge.UI.closeAllDrawers();
            
            const center = {
                left: DeckForge.CARD_WIDTH / 2,
                top: DeckForge.CARD_HEIGHT / 2,
                originX: 'center',
                originY: 'center'
            };
            
            let obj;

            if (type === 'safe') {
                obj = new fabric.Rect({
                    ...center,
                    width: 600, height: 900,
                    rx: 40, ry: 40,
                    fill: 'transparent',
                    stroke: DeckForge.Utils.getPaletteColor(2),
                    strokeWidth: 15,
                    perPixelTargetFind: true
                });
                obj.roleStroke = 2;
                obj.roleFill = -1;
            } else {
                switch (type) {
                    case 'rect':
                        obj = new fabric.Rect({ ...center, width: 250, height: 250 });
                        break;
                    case 'circle':
                        obj = new fabric.Circle({ ...center, radius: 125 });
                        break;
                    case 'triangle':
                        obj = new fabric.Triangle({ ...center, width: 250, height: 250 });
                        break;
                    case 'star':
                        const points = [
                            { x:0, y:-50 }, { x:14, y:-20 }, { x:47, y:-15 },
                            { x:23, y:7 }, { x:29, y:40 }, { x:0, y:25 },
                            { x:-29, y:40 }, { x:-23, y:7 }, { x:-47, y:-15 },
                            { x:-14, y:-20 }
                        ];
                        obj = new fabric.Polygon(points, { ...center, scaleX: 4, scaleY: 4 });
                        break;
                    case 'hexagon':
                        const hexPoints = [];
                        for (let i = 0; i < 6; i++) {
                            const angle_rad = Math.PI / 180 * (60 * i);
                            hexPoints.push({ x: 125 * Math.cos(angle_rad), y: 125 * Math.sin(angle_rad) });
                        }
                        obj = new fabric.Polygon(hexPoints, { ...center });
                        break;
                    case 'placeholder':
                        const grp = [];
                        const boxSize = 600;
                        grp.push(new fabric.Rect({ width: boxSize, height: boxSize/1.5, fill: '#f3f4f6', stroke: '#d1d5db', strokeWidth: 4 }));
                        grp.push(new fabric.Line([0, 0, boxSize, boxSize/1.5], { stroke: '#e5e7eb', strokeWidth: 4 }));
                        grp.push(new fabric.Line([boxSize, 0, 0, boxSize/1.5], { stroke: '#e5e7eb', strokeWidth: 4 }));
                        obj = new fabric.Group(grp, { ...center });
                        break;
                    default:
                        obj = new fabric.Rect({ ...center, width: 250, height: 250 });
                }
                
                // Assign default roles if not manually set above
                if (obj.roleFill === undefined) {
                    obj.roleFill = 2;
                    obj.roleStroke = -1;
                    obj.set({
                        fill: DeckForge.Utils.getPaletteColor(2),
                        stroke: 'transparent',
                        strokeWidth: 0
                    });
                }
            }

            DeckForge.canvas.add(obj);
            DeckForge.canvas.setActiveObject(obj);
            this.autoPanToSelection();
        },

        addText: function() {
            const text = new fabric.IText('New Text', {
                left: DeckForge.CARD_WIDTH / 2,
                top: DeckForge.CARD_HEIGHT / 2,
                originX: 'center',
                originY: 'center',
                fontFamily: 'Inter',
                fontSize: 60,
                editable: true
            });
            
            text.roleFill = 4;
            text.roleStroke = -1;
            text.set('fill', DeckForge.Utils.getPaletteColor(4));
            
            DeckForge.canvas.add(text);
            DeckForge.canvas.setActiveObject(text);
            this.autoPanToSelection();
        },

        autoPanToSelection: function() {
            DeckForge.state.panY -= 150 * DeckForge.state.scale;
            DeckForge.UI.renderTransform();
        },

        triggerImageUpload: function() {
            const input = DeckForge.Utils.getElement('img-upload');
            if (input) input.click();
        },

        handleImageUpload: function(file) {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
        // ✅ get the actual fabric canvas instance
        const canvas = DeckForge.getCanvas && DeckForge.getCanvas();
        if (!canvas) return;

        fabric.Image.fromURL(ev.target.result, (img) => {
            img.set({
                left: DeckForge.CARD_WIDTH / 2,
                top: DeckForge.CARD_HEIGHT / 2,
                originX: 'center',
                originY: 'center'
            });
            
            if (img.width > DeckForge.CARD_WIDTH * 0.8) {
                img.scaleToWidth(DeckForge.CARD_WIDTH * 0.8);
            }
            
            canvas.add(img);
            canvas.setActiveObject(img);
            canvas.requestRenderAll();
            DeckForge.History.save();
        });
    };
    reader.readAsDataURL(file);
},

        deleteActive: function() {
            const obj = DeckForge.canvas.getActiveObject();
            if (obj && !obj.locked) {
                DeckForge.canvas.remove(obj);
                DeckForge.canvas.discardActiveObject();
                DeckForge.canvas.requestRenderAll();
                DeckForge.History.save();
            }
        },

        adjustLayer: function(direction) {
            const obj = DeckForge.canvas.getActiveObject();
            if (obj && !obj.locked) {
                if (direction === 'up') obj.bringForward();
                else obj.sendBackwards();
                DeckForge.History.save();
            }
        },

        toggleLock: function() {
            const obj = DeckForge.canvas.getActiveObject();
            if (!obj) return;

            const isLocked = !obj.locked;
            obj.set({
                locked: isLocked,
                lockMovementX: isLocked,
                lockMovementY: isLocked,
                lockRotation: isLocked,
                lockScalingX: isLocked,
                lockScalingY: isLocked,
                hasControls: !isLocked
            });
            
            DeckForge.canvas.requestRenderAll();
            DeckForge.UI.updateLockUI(isLocked);
            DeckForge.History.save();
        },

        rotateActive: function() {
            const obj = DeckForge.canvas.getActiveObject();
            if (!obj || obj.locked) return;
            obj.set('angle', (obj.angle + 45) % 360);
            obj.setCoords();
            DeckForge.canvas.requestRenderAll();
            DeckForge.History.save();
        },

        updateProp: function(key, value) {
            const obj = DeckForge.canvas.getActiveObject();
            if (!obj || obj.locked) return;

            obj.set(key, value);
            if (key === 'rx') obj.set('ry', value);
            
            DeckForge.canvas.requestRenderAll();
            
            if (key === 'opacity') DeckForge.Utils.setText('lbl-opacity', Math.round(value * 100) + '%');
            if (key === 'strokeWidth') DeckForge.Utils.setText('lbl-stroke', value);
            if (key === 'rx') DeckForge.Utils.setText('lbl-radius', value);
            
            DeckForge.History.debouncedSave();
        },

        updateSize: function(value) {
            const obj = DeckForge.canvas.getActiveObject();
            if (!obj || obj.locked) return;

            if (obj.type === 'i-text') {
                obj.set('fontSize', parseInt(value));
                DeckForge.Utils.setText('lbl-size', value);
            } else {
                obj.scaleToWidth(parseInt(value) * 2.5);
                DeckForge.Utils.setText('lbl-size', value + '%');
            }
            
            DeckForge.canvas.requestRenderAll();
            DeckForge.History.debouncedSave();
        },

        cycleBlendMode: function() {
            const obj = DeckForge.canvas.getActiveObject();
            if (!obj || obj.locked) return;

            const modes = DeckForge.BLEND_MODES;
            const currentMode = obj.globalCompositeOperation || 'source-over';
            const nextIndex = (modes.indexOf(currentMode) + 1) % modes.length;
            
            obj.set('globalCompositeOperation', modes[nextIndex]);
            DeckForge.canvas.requestRenderAll();
            DeckForge.History.save();
        },

        applyFilter: function(type, value) {
            const obj = DeckForge.canvas.getActiveObject();
            if (!obj || obj.type !== 'image') return;
            const val = parseFloat(value);
            
            if (!obj.filters) obj.filters = [];

            if (type === 'pixelate') {
                obj.filters = obj.filters.filter(f => !(f instanceof fabric.Image.filters.Pixelate));
                if (val > 0) obj.filters.push(new fabric.Image.filters.Pixelate({ blocksize: val }));
                DeckForge.Utils.setText('lbl-pixelate', val > 0 ? val : 'Off');
            } else if (type === 'blur') {
                obj.filters = obj.filters.filter(f => !(f instanceof fabric.Image.filters.Blur));
                if (val > 0) obj.filters.push(new fabric.Image.filters.Blur({ blur: val }));
                DeckForge.Utils.setText('lbl-blur', val > 0 ? val.toFixed(2) : 'Off');
            }

            obj.applyFilters();
            DeckForge.canvas.requestRenderAll();
            DeckForge.History.debouncedSave();
        },

        toggleSelectionMode: function() {
            DeckForge.canvas.selection = !DeckForge.canvas.selection;
            const btn = DeckForge.Utils.getElement('btn-multiselect');
            
            if (btn) {
                if (DeckForge.canvas.selection) {
                    btn.classList.add('text-blue-600', 'bg-blue-50');
                    DeckForge.canvas.defaultCursor = 'crosshair';
                } else {
                    btn.classList.remove('text-blue-600', 'bg-blue-50');
                    DeckForge.canvas.defaultCursor = 'default';
                }
            }
        },

        createClippingMask: function() {
            const sel = DeckForge.canvas.getActiveObjects();
            if (sel.length !== 2) {
                alert("Select exactly 2 objects: Image (bottom) and Shape (top).");
                return;
            }

            sel.sort((a, b) => DeckForge.canvas.getObjects().indexOf(a) - DeckForge.canvas.getObjects().indexOf(b));
            const content = sel[0];
            const maskSource = sel[1];

            maskSource.clone(function(clonedMask) {
                clonedMask.absolutePositioned = true;
                content.set('clipPath', clonedMask);
                DeckForge.canvas.remove(maskSource);
                DeckForge.canvas.discardActiveObject();
                DeckForge.canvas.setActiveObject(content);
                DeckForge.canvas.requestRenderAll();
                DeckForge.History.save();
            });
        },

        getCanvas: function() { return DeckForge.canvas; }
    };
})();
