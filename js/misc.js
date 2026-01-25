
        // ========================================
        // ROULETTE ZOOM MODULE
        // ========================================
        
        const RouletteZoom = {
            scale:1,
            panX:0,
            panY:0,
            isGesturing:false,
            startDist:0,
            startScale:1,
            startX:0,
            startY:0,
            startPan:{ x:0, y:0 },

            init:function() {
                const el = Utils.getElement('deck-roulette');
                if (!el) return;

                el.addEventListener('touchstart', (e) => {
                    if (e.touches.length === 2) {
                        this.isGesturing = true;
                        this.startDist = Math.hypot(
                            e.touches[0].clientX - e.touches[1].clientX,
                            e.touches[0].clientY - e.touches[1].clientY
                        );
                        this.startScale = this.scale;
                    } else if (e.touches.length === 1 && this.scale > 1.05) {
                        this.isGesturing = true;
                        this.startX = e.touches[0].clientX;
                        this.startY = e.touches[0].clientY;
                        this.startPan = { x:this.panX, y:this.panY };
                    }
                }, { passive:false });

                el.addEventListener('touchmove', (e) => {
                    if (!this.isGesturing) return;
                    e.preventDefault();

                    if (e.touches.length === 2) {
                        const dist = Math.hypot(
                            e.touches[0].clientX - e.touches[1].clientX,
                            e.touches[0].clientY - e.touches[1].clientY
                        );
                        const zoom = dist / this.startDist;
                        this.scale = Math.min(Math.max(this.startScale * zoom, 1), 4);

                        if (this.scale === 1) {
                            this.panX = 0;
                            this.panY = 0;
                        }
                        this.update();
                    } else if (e.touches.length === 1 && this.scale > 1.05) {
                        const dx = e.touches[0].clientX - this.startX;
                        const dy = e.touches[0].clientY - this.startY;
                        this.panX = this.startPan.x + dx;
                        this.panY = this.startPan.y + dy;
                        this.update();
                    }
                }, { passive:false });

                el.addEventListener('touchend', (e) => {
                    if (e.touches.length < 2 && this.scale <= 1.05) {
                        this.reset();
                    }
                    if (e.touches.length === 0) {
                        this.isGesturing = false;
                    }
                });
            },

            update:function() {
                const target = Utils.getElement('roulette-viewport');
                if (target) {
                    target.style.transform = `translate(${this.panX}px, ${this.panY}px) scale(${this.scale})`;
                }
            },

            reset:function() {
                this.scale = 1;
                this.panX = 0;
                this.panY = 0;
                this.isGesturing = false;
                this.update();
            }
        };

        // ========================================
        // MASK TOOL MODULE
        // ========================================
        
        const MaskTool = {
            isActive:false,
            target:null,
            points:[],
            markers:[],
            lines:[],

            start:function() {
                const obj = canvas.getActiveObject();
                if (!obj) {
                    alert("Select an image first!");
                    return;
                }

                this.target = obj;
                this.isActive = true;

                canvas.discardActiveObject();
                canvas.requestRenderAll();

                const controls = Utils.getElement('mask-controls');
                if (controls) controls.classList.remove('hidden');
                
                UI.closeAllDrawers();

                canvas.defaultCursor = 'crosshair';
                canvas.hoverCursor = 'crosshair';
                canvas.selection = false;
                this.target.evented = false;
            },

            handleTap:function(opt) {
                if (!this.isActive) return;

                const pointer = canvas.getPointer(opt.e);
                const x = pointer.x;
                const y = pointer.y;

                this.points.push({ x:x, y:y });

                const marker = new fabric.Circle({
                    left:x,
                    top:y,
                    radius:5 / canvas.getZoom(),
                    fill:'#fff',
                    stroke:'#2563eb',
                    strokeWidth:2,
                    originX:'center',
                    originY:'center',
                    selectable:false,
                    evented:false,
                    hasControls:false
                });
                canvas.add(marker);
                this.markers.push(marker);

                if (this.points.length > 1) {
                    const prev = this.points[this.points.length - 2];
                    const line = new fabric.Line([prev.x, prev.y, x, y], {
                        stroke:'#2563eb',
                        strokeWidth:2 / canvas.getZoom(),
                        selectable:false,
                        evented:false,
                        originX:'center',
                        originY:'center'
                    });
                    canvas.add(line);
                    line.sendToBack();
                    this.lines.push(line);
                }

                canvas.requestRenderAll();
            },

            finish:function() {
                if (this.points.length < 3) {
                    alert("Need at least 3 points.Tap the canvas to draw.");
                    return;
                }

                const target = this.target;

                const relativePoints = this.points.map(p => {
                    const relX = p.x - target.left;
                    const relY = p.y - target.top;

                    const angleRad = -fabric.util.degreesToRadians(target.angle);
                    const rotatedX = relX * Math.cos(angleRad) - relY * Math.sin(angleRad);
                    const rotatedY = relX * Math.sin(angleRad) + relY * Math.cos(angleRad);

                    return {
                        x:rotatedX / target.scaleX,
                        y:rotatedY / target.scaleY
                    };
                });

                const clipPath = new fabric.Polygon(relativePoints, {
                    originX:'center',
                    originY:'center',
                    left:0,
                    top:0
                });

                const polyCenter = clipPath.getCenterPoint();
                clipPath.setPositionByOrigin(
                    new fabric.Point(polyCenter.x, polyCenter.y),
                    'center',
                    'center'
                );

                target.set({ clipPath:clipPath });

                this.reset();

                canvas.setActiveObject(target);
                canvas.requestRenderAll();
                History.save();
            },

            cancel:function() {
                this.reset();
            },

            reset:function() {
                this.isActive = false;

                if (this.target) {
                    this.target.evented = true;
                    this.target = null;
                }

                this.points = [];

                this.markers.forEach(m => canvas.remove(m));
                this.lines.forEach(l => canvas.remove(l));
                this.markers = [];
                this.lines = [];

                const controls = Utils.getElement('mask-controls');
                if (controls) controls.classList.add('hidden');

                canvas.selection = true;
                canvas.defaultCursor = 'default';
                canvas.hoverCursor = 'move';
                canvas.requestRenderAll();
            }
        };

  

// ========================================
        // SHORTCUTS MODULE
        // ========================================
        
        const Shortcuts = {
            _clipboard: null,

            init: function() {
                document.addEventListener('keydown', (e) => {
                    // 1. Safety Check: Don't trigger if typing in a text box
                    const activeEl = document.activeElement;
                    if (activeEl.tagName === 'INPUT' || activeEl.tagName === 'TEXTAREA') {
                        return; 
                    }

                    const key = e.key.toLowerCase();
                    const cmd = e.ctrlKey || e.metaKey; // Ctrl or Command (Mac)
                    
                    // 2. COPY (Cmd + C)
                    if (cmd && key === 'c') {
                        e.preventDefault();
                        this.copy();
                    }

                    // 3. PASTE (Cmd + V)
                    if (cmd && key === 'v') {
                        e.preventDefault();
                        this.paste();
                    }

                    // 4. DUPLICATE (Cmd + D)
                    if (cmd && key === 'd') {
                        e.preventDefault();
                        this.copy();
                        this.paste();
                    }

                    // 5. GROUP (Cmd + G)
                    if (cmd && key === 'g' && !e.shiftKey) {
                        e.preventDefault();
                        this.group();
                    }

                    // 6. UNGROUP (Cmd + Shift + G)
                    if (cmd && key === 'g' && e.shiftKey) {
                        e.preventDefault();
                        this.ungroup();
                    }

                    // 7. UNDO (Cmd + Z)
                    if (cmd && key === 'z' && !e.shiftKey) {
                        e.preventDefault();
                        History.undo();
                    }

                    // 8. REDO (Cmd + Shift + Z or Cmd + Y)
                    if ((cmd && key === 'z' && e.shiftKey) || (cmd && key === 'y')) {
                        e.preventDefault();
                        History.redo();
                    }

                    // 9. DELETE (Del or Backspace)
                    if (key === 'delete' || key === 'backspace') {
                        e.preventDefault();
                        Canvas.deleteActive();
                    }

                    // 10. LAYER ORDER ([ or ])
                    if (key === '[') Canvas.adjustLayer('down');
                    if (key === ']') Canvas.adjustLayer('up');

                    // 11. NUDGE (Arrow Keys)
                    if (['arrowup', 'arrowdown', 'arrowleft', 'arrowright'].includes(key)) {
                        e.preventDefault();
                        this.nudge(key, e.shiftKey ? 10 : 1); // Shift moves 10px
                    }
                    
                    // 12. ESCAPE (Deselect)
                    if (key === 'escape') {
                        canvas.discardActiveObject();
                        canvas.requestRenderAll();
                        UI.closeAllDrawers();
                    }
                });
            },

            copy: function() {
                const active = canvas.getActiveObject();
                if (!active) return;
                
                active.clone((cloned) => {
                    this._clipboard = cloned;
                }, SAVE_PROPS);
            },

            paste: function() {
                if (!this._clipboard) return;

                this._clipboard.clone((cloned) => {
                    canvas.discardActiveObject();
                    
                    cloned.set({
                        left: cloned.left + 20,
                        top: cloned.top + 20,
                        evented: true
                    });

                    if (cloned.type === 'activeSelection') {
                        // Active selections need special handling to become active again
                        cloned.canvas = canvas;
                        cloned.forEachObject((obj) => {
                            canvas.add(obj);
                        });
                        cloned.setCoords();
                    } else {
                        canvas.add(cloned);
                    }

                    this._clipboard.top += 20;
                    this._clipboard.left += 20;
                    
                    canvas.setActiveObject(cloned);
                    canvas.requestRenderAll();
                    History.save();
                }, SAVE_PROPS);
            },

            group: function() {
                const active = canvas.getActiveObject();
                if (!active || active.type !== 'activeSelection') return;
                
                active.toGroup();
                canvas.requestRenderAll();
                History.save();
            },

            ungroup: function() {
                const active = canvas.getActiveObject();
                if (!active || active.type !== 'group') return;
                
                active.toActiveSelection();
                canvas.requestRenderAll();
                History.save();
            },

            nudge: function(key, amount) {
                const active = canvas.getActiveObject();
                if (!active) return;

                if (key === 'arrowup') active.top -= amount;
                if (key === 'arrowdown') active.top += amount;
                if (key === 'arrowleft') active.left -= amount;
                if (key === 'arrowright') active.left += amount;

                active.setCoords();
                canvas.requestRenderAll();
                // We don't save history on every pixel nudge to avoid flooding the undo stack
                // But we should save it once the user stops (debounce could be added here)
            }
        };

        // ========================================
        // INITIALIZATION
        // ========================================
        
        function init() {
            // Initialize canvas
            Canvas.init();

            // Initialize UI
            UI.init();

            // Load custom palettes
            Theme.loadCustomPalettes();

            // Initialize color engine
            Theme.initColorEngine();

            // Render settings UI
            Theme.renderSettingsUI();

            // Initialize deck collection
            DeckCollection.init();

            // Initialize roulette zoom
            RouletteZoom.init();

            // Reset view
            UI.resetView();

            // Setup image upload handler
            const imgUpload = Utils.getElement('img-upload');
            if (imgUpload) {
                imgUpload.addEventListener('change', (e) => {
                    Canvas.handleImageUpload(e.target.files[0]);
                    e.target.value = '';
                });
            }

            // Setup canvas tap handler for mask tool
            if (canvas) {
                canvas.on('mouse:down', (opt) => {
                    MaskTool.handleTap(opt);
                });
            }

            // Setup keyboard shortcuts
            document.addEventListener('keydown', (e) => {
                // Undo:Ctrl/Cmd + Z
                if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !e.shiftKey) {
                    e.preventDefault();
                    History.undo();
                }
                // Redo:Ctrl/Cmd + Shift + Z or Ctrl/Cmd + Y
                if ((e.ctrlKey || e.metaKey) && (e.key === 'y' || (e.key === 'z' && e.shiftKey))) {
                    e.preventDefault();
                    History.redo();
                }
                // Delete:Delete or Backspace
                if (e.key === 'Delete' || e.key === 'Backspace') {
                    const activeEl = document.activeElement;
                    if (activeEl.tagName !== 'INPUT' && activeEl.tagName !== 'TEXTAREA') {
                        e.preventDefault();
                        Canvas.deleteActive();
                    }
                }
                // Escape:Deselect
                if (e.key === 'Escape') {
                    if (canvas) {
                        canvas.discardActiveObject();
                        canvas.requestRenderAll();
                    }
                    UI.closeAllDrawers();
                }
            });

            // Setup window resize handler
            window.addEventListener('resize', Utils.debounce(() => {
                UI.resetView();
            }, 250));

	    Shortcuts.init();

            console.log('DeckForge V18 initialized successfully');
        }

       // ========================================
        // LAYERS MODULE (FINAL - PERSISTENT IDS)
        // ========================================

        const Layers = {
            isOpen: false,
            _hooked: false,
            _idCounter: 1, // Counter for assigning permanent IDs

            toggle: function() {
                const drawer = Utils.getElement('layers-drawer');
                if (!drawer) return;

                const wasOpen = this.isOpen;
                UI.closeAllDrawers();

                if (!wasOpen) {
                    this.isOpen = true;
                    drawer.classList.remove('translate-x-full');
                    drawer.setAttribute('aria-hidden', 'false');
                    Utils.showOverlay();
                    this.render();
                    
                    if (!this._hooked) {
                        canvas.on('object:added', () => this.isOpen && this.render());
                        canvas.on('object:removed', () => this.isOpen && this.render());
                        canvas.on('object:modified', () => this.isOpen && this.render());
                        this._hooked = true;
                    }
                }
            },

            // FIX: Assign permanent ID so names stick to objects when moving
            getLabel: function(obj) {
                // If object doesn't have a UI ID yet, give it one
                if (!obj._uiId) {
                    obj._uiId = this._idCounter++;
                }

                let name = Utils.capitalize(obj.type);
                if (obj.type === 'i-text') name = `"${obj.text.substring(0, 15)}${obj.text.length>15?'...':''}"`;
                if (obj.type === 'rect') name = 'Rectangle';
                if (obj.type === 'path') name = 'Vector';
                if (obj.type === 'group') name = 'Group';
                if (obj.type === 'circle') name = 'Circle';
                if (obj.type === 'image') name = 'Image';

                // Use the permanent ID instead of the changing index
                return `${name} #${obj._uiId}`;
            },

            render: function() {
                const list = Utils.getElement('layers-list');
                if (!list) return;

                list.innerHTML = '';
                const objects = canvas.getObjects(); 
                const activeObj = canvas.getActiveObject();

                // Render Top-to-Bottom (Reverse Fabric order)
                [...objects].reverse().forEach((obj, i) => {
                    const trueIndex = objects.length - 1 - i;
                    const isActive = activeObj === obj;
                    
                    // Boundary checks for buttons
                    const isTop = (trueIndex === objects.length - 1);
                    const isBottom = (trueIndex === 0);
                    
                    const div = document.createElement('div');
                    div.className = `flex items-center gap-2 p-2 rounded-lg border transition group ${
                        isActive ? 'bg-blue-50 border-blue-200 shadow-sm' : 'bg-white border-transparent hover:border-gray-200'
                    }`;
                    
                    let icon = 'ph-square';
                    if (obj.type === 'i-text') icon = 'ph-text-t';
                    if (obj.type === 'image') icon = 'ph-image';
                    if (obj.type === 'group') icon = 'ph-selection-all';
                    
                    const label = this.getLabel(obj); // No index needed now

                    div.innerHTML = `
                        <div class="cursor-pointer flex-1 flex items-center gap-3 overflow-hidden" onclick="DeckForge.Layers.select(${trueIndex})">
                            <i class="ph-bold ${icon} ${isActive ? 'text-blue-600' : 'text-gray-400'}"></i>
                            <span class="text-xs font-bold ${isActive ? 'text-blue-700' : 'text-gray-600'} truncate select-none">
                                ${label}
                            </span>
                        </div>
                        
                        <div class="flex items-center gap-1">
                            <button onclick="event.stopPropagation(); DeckForge.Layers.toggleVis(${trueIndex})" class="p-1 rounded hover:bg-gray-100 text-gray-400 hover:text-gray-700" title="Toggle Visibility">
                                <i class="ph-bold ${obj.visible ? 'ph-eye' : 'ph-eye-slash text-red-400'}"></i>
                            </button>
                            
                            <button onclick="event.stopPropagation(); DeckForge.Layers.toggleLock(${trueIndex})" class="p-1 rounded hover:bg-gray-100 text-gray-400 hover:text-gray-700" title="Toggle Lock">
                                <i class="ph-bold ${obj.locked ? 'ph-lock-key text-orange-400' : 'ph-lock-open'}"></i>
                            </button>
                            
                            <button onclick="event.stopPropagation(); DeckForge.Layers.move(${trueIndex}, 1)" 
                                    class="p-1 rounded transition ${isTop ? 'opacity-20 cursor-not-allowed' : 'hover:bg-gray-100 text-gray-400 hover:text-blue-600'}" 
                                    ${isTop ? 'disabled' : ''} title="Bring Forward">
                                <i class="ph-bold ph-caret-up"></i>
                            </button>
                            
                            <button onclick="event.stopPropagation(); DeckForge.Layers.move(${trueIndex}, -1)" 
                                    class="p-1 rounded transition ${isBottom ? 'opacity-20 cursor-not-allowed' : 'hover:bg-gray-100 text-gray-400 hover:text-blue-600'}" 
                                    ${isBottom ? 'disabled' : ''} title="Send Backward">
                                <i class="ph-bold ph-caret-down"></i>
                            </button>
                        </div>
                    `;
                    list.appendChild(div);
                });

                if (objects.length === 0) {
                    list.innerHTML = `<div class="text-center p-8 text-gray-400 text-xs italic">Canvas is empty</div>`;
                }
            },

            select: function(index) {
                const obj = canvas.item(index);
                if (obj && obj.visible) { 
                    canvas.setActiveObject(obj);
                    canvas.requestRenderAll();
                    this.render(); 
                }
            },

            toggleVis: function(index) {
                const obj = canvas.item(index);
                if (obj) {
                    obj.set('visible', !obj.visible);
                    obj.set('dirty', true); 
                    if (!obj.visible) canvas.discardActiveObject();
                    canvas.requestRenderAll();
                    this.render();
                    History.save();
                }
            },

            toggleLock: function(index) {
                const obj = canvas.item(index);
                if (obj) {
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
                    if (canvas.getActiveObject() === obj) UI.updateLockUI(isLocked);
                    canvas.requestRenderAll();
                    this.render();
                    History.save();
                }
            },

            move: function(index, dir) {
                const objects = canvas.getObjects();
                const obj = objects[index];
                if (!obj) return;

                const newIndex = index + dir;
                if (newIndex < 0 || newIndex >= objects.length) return;

                obj.moveTo(newIndex);
                canvas.setActiveObject(obj);
                
                canvas.requestRenderAll();
                this.render();
                History.save();
            }
        };

        // ========================================
        // PUBLIC API
        // ========================================
        
        return {
            // Constants
            CARD_WIDTH,
            CARD_HEIGHT,

            // Modules
            Utils,
            History,
            UI,
            Canvas,
            Align,
            Theme,
            Text,
            Templates,
            DeckData,
            SVG,
            Export,
            DeckCollection,
            RouletteZoom,
            MaskTool,
            GenUI,
            Generators,
            Layers,
            // State access (read-only)
            getState:() => ({ ...state }),
            getCanvas:() => canvas,

            // Initialization
            init
        };
    })();

    // ========================================
    // BOOTSTRAP
    // ========================================
    
    window.addEventListener('load', () => {
        DeckForge.init();
    });

    // Expose to window for onclick handlers
    window.DeckForge = DeckForge;
