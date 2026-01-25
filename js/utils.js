    /**
     * ========================================
     * DECKFORGE V18 - REFACTORED EDITION
     * ========================================
     * 
     * Modular architecture with namespaced modules,
     * proper error handling, debouncing, and accessibility.
     */

    // ========================================
    // NAMESPACE & CONFIGURATION
    // ========================================
    
    const DeckForge = (function() {
        'use strict';

        // ========================================
        // CONSTANTS
        // ========================================
        
        const CARD_WIDTH = 750;
        const CARD_HEIGHT = 1050;
        const BLEED_MARGIN = 37;
        const SAFE_MARGIN = 75;
        const MAX_HISTORY_LENGTH = 10;
        const DEBOUNCE_DELAY = 100;
        const ZOOM_MIN = 0.1;
        const ZOOM_MAX = 5;

        const SAVE_PROPS = [
            'roleFill', 'roleStroke', 'locked',
            'roleGradientStart', 'roleGradientEnd', 'gradBalance',
            'isParticleGroup', 'generativeType',
            'clipPath'
        ];

        const DEFAULT_PALETTES = [
            { id:'corporate', name:'Breach', colors:['#ddfff7', '#93e1d8', '#ffa69e', '#aa4465', '#191919'] },
            { id:'sunset', name:'Sunset', colors:['#fff7ed', '#fed7aa', '#f97316', '#c2410c', '#431407'] },
            { id:'forest', name:'Forest', colors:['#f0fdf4', '#bbf7d0', '#22c55e', '#15803d', '#052e16'] },
            { id:'berry', name:'Berry', colors:['#fdf2f8', '#fbcfe8', '#ec4899', '#be185d', '#831843'] },
            { id:'cyber', name:'Cyber', colors:['#f0f9ff', '#22d3ee', '#0ea5e9', '#6366f1', '#1e1b4b'] },
            { id:'mono', name:'Monochrome', colors:['#ffffff', '#e5e5e5', '#a3a3a3', '#525252', '#171717'] }
        ];

        const FONT_OPTIONS = [
            { name:'Inter', val:'Inter' },
            { name:'Roboto', val:'Roboto' },
            { name:'Merriweather', val:'Merriweather' },
            { name:'Playfair', val:'Playfair Display' },
            { name:'Oswald', val:'Oswald' },
            { name:'Lobster', val:'Lobster' },
            { name:'Dancing Script', val:'Dancing Script' },
            { name:'Courier', val:'Courier Prime' },
            { name:'Monoton', val:'Monoton' },
            { name:'Cinzel (Fantasy)', val:'Cinzel' },
            { name:'Orbitron (Sci-Fi)', val:'Orbitron' },
            { name:'Bangers (Comic)', val:'Bangers' },
            { name:'Georama (Geom)', val:'Georama' },
            { name:'Rajdhani (Tech)', val:'Rajdhani' },
            { name:'Chakra Petch (Mech)', val:'Chakra Petch' },
            { name:'Audiowide (Cyber)', val:'Audiowide' },
            { name:'Cormorant (Elegant)', val:'Cormorant Garamond' },
            { name:'Crimson (Classic)', val:'Crimson Text' },
            { name:'Montserrat', val:'Montserrat' },
            { name:'Open Sans', val:'Open Sans' },
            { name:'Lato', val:'Lato' },
            { name:'Poppins', val:'Poppins' },
            { name:'Raleway', val:'Raleway' },
            { name:'Ubuntu', val:'Ubuntu' },
            { name:'Nunito', val:'Nunito' },
            { name:'Rubik', val:'Rubik' },
            { name:'Quicksand', val:'Quicksand' }
        ];

        const BLEND_MODES = ['source-over', 'multiply', 'screen', 'overlay', 'darken', 'lighten'];

        // ========================================
        // STATE
        // ========================================
        
        let state = {
            palette:DEFAULT_PALETTES[0].colors,
            palettes:[...DEFAULT_PALETTES],
            coordinatedColors:true,
            darkMode:false,
            editMode:'fill',
            gradSlot:'start',
            history:[],
            redoStack:[],
            isProcessing:false,
            scale:0.8,
            panX:0,
            panY:0,
            activePattern:null
        };

        let canvas = null;
        let colorPickerInstance = null;
        let builderPalette = ['#ffffff', '#e2e8f0', '#3b82f6', '#1d4ed8', '#0f172a'];
        let activeBuilderSlot = 2;

        // ========================================
        // UTILITIES
        // ========================================
        
        const Utils = {
            /**
             * Debounce function execution
             */
            debounce:function(func, wait) {
                let timeout;
                return function executedFunction(...args) {
                    const later = () => {
                        clearTimeout(timeout);
                        func(...args);
                    };
                    clearTimeout(timeout);
                    timeout = setTimeout(later, wait);
                };
            },

            /**
             * Safe DOM element getter
             */
            getElement:function(id) {
                const el = document.getElementById(id);
                if (!el) {
                    console.warn(`Element not found:${id}`);
                }
                return el;
            },
            /**
             * Capitalize first letter
             */
            capitalize: function(str) {
                if (!str) return '';
                return str.charAt(0).toUpperCase() + str.slice(1);
            },
            /**
             * Safe value setter for inputs
             */
            setInputValue:function(id, value) {
                const el = this.getElement(id);
                if (el) el.value = value;
            },

            /**
             * Safe text setter
             */
            setText:function(id, text) {
                const el = this.getElement(id);
                if (el) el.innerText = text;
            },

            /**
             * Interpolate between two colors
             */
            getInterpColor:function(c1, c2, factor) {
                try {
                    const rgb1 = new fabric.Color(c1).getSource();
                    const rgb2 = new fabric.Color(c2).getSource();
                    
                    const r = Math.round(rgb1[0] + factor * (rgb2[0] - rgb1[0]));
                    const g = Math.round(rgb1[1] + factor * (rgb2[1] - rgb1[1]));
                    const b = Math.round(rgb1[2] + factor * (rgb2[2] - rgb1[2]));
                    
                    return `rgb(${r},${g},${b})`;
                } catch (e) {
                    console.warn('Color interpolation error:', e);
                    return c1;
                }
            },

            /**
             * Get palette color by role index
             */
            getPaletteColor:function(idx) {
                if (idx === -1) return 'transparent';
                const effectiveIdx = state.darkMode ? (4 - idx) : idx;
                return state.palette[effectiveIdx] || state.palette[0];
            },

            /**
             * Show overlay backdrop
             */
            showOverlay:function() {
                const overlay = this.getElement('overlay');
                if (overlay) {
                    overlay.classList.remove('hidden');
                    overlay.setAttribute('aria-hidden', 'false');
                    requestAnimationFrame(() => {
                        overlay.classList.remove('opacity-0');
                    });
                }
            },

            /**
             * Hide overlay backdrop
             */
            hideOverlay:function() {
                const overlay = this.getElement('overlay');
                if (overlay) {
                    overlay.classList.add('opacity-0');
                    overlay.setAttribute('aria-hidden', 'true');
                    setTimeout(() => overlay.classList.add('hidden'), 200);
                }
            }
        };

        // ========================================
        // SIMPLEX NOISE ENGINE
        // ========================================
        
        const FastSimplex = (function() {
            const F2 = 0.5 * (Math.sqrt(3.0) - 1.0);
            const G2 = (3.0 - Math.sqrt(3.0)) / 6.0;
            
            function FastSimplex() {
                this.p = new Uint8Array(256);
                this.perm = new Uint8Array(512);
                this.permMod12 = new Uint8Array(512);
                
                for (let i = 0; i < 256; i++) this.p[i] = i;
                
                for (let i = 0; i < 256; i++) {
                    const r = (Math.random() * (256 - i)) | 0;
                    const t = this.p[i];
                    this.p[i] = this.p[i + r];
                    this.p[i + r] = t;
                    this.perm[i] = this.perm[i + 256] = this.p[i];
                    this.permMod12[i] = this.permMod12[i + 256] = this.p[i] % 12;
                }
            }
            
            FastSimplex.prototype.noise2D = function(xin, yin) {
                const permMod12 = this.permMod12;
                const perm = this.perm;
                const Grad3 = [
                    [1,1,0], [-1,1,0], [1,-1,0], [-1,-1,0],
                    [1,0,1], [-1,0,1], [1,0,-1], [-1,0,-1],
                    [0,1,1], [0,-1,1], [0,1,-1], [0,-1,-1]
                ];
                
                let n0 = 0, n1 = 0, n2 = 0;
                const s = (xin + yin) * F2;
                const i = Math.floor(xin + s);
                const j = Math.floor(yin + s);
                const t = (i + j) * G2;
                const X0 = i - t;
                const Y0 = j - t;
                const x0 = xin - X0;
                const y0 = yin - Y0;
                
                let i1, j1;
                if (x0 > y0) { i1 = 1; j1 = 0; }
                else { i1 = 0; j1 = 1; }
                
                const x1 = x0 - i1 + G2;
                const y1 = y0 - j1 + G2;
                const x2 = x0 - 1.0 + 2.0 * G2;
                const y2 = y0 - 1.0 + 2.0 * G2;
                
                const ii = i & 255;
                const jj = j & 255;
                
                let t0 = 0.5 - x0 * x0 - y0 * y0;
                if (t0 >= 0) {
                    const gi0 = permMod12[ii + perm[jj]];
                    t0 *= t0;
                    n0 = t0 * t0 * (Grad3[gi0][0] * x0 + Grad3[gi0][1] * y0);
                }
                
                let t1 = 0.5 - x1 * x1 - y1 * y1;
                if (t1 >= 0) {
                    const gi1 = permMod12[ii + i1 + perm[jj + j1]];
                    t1 *= t1;
                    n1 = t1 * t1 * (Grad3[gi1][0] * x1 + Grad3[gi1][1] * y1);
                }
                
                let t2 = 0.5 - x2 * x2 - y2 * y2;
                if (t2 >= 0) {
                    const gi2 = permMod12[ii + 1 + perm[jj + 1]];
                    t2 *= t2;
                    n2 = t2 * t2 * (Grad3[gi2][0] * x2 + Grad3[gi2][1] * y2);
                }
                
                return 70.0 * (n0 + n1 + n2);
            };
            
            return FastSimplex;
        })();

        const simplex = new FastSimplex();

        // ========================================
        // HISTORY MODULE
        // ========================================
        
        const History = {
            save:function() {
                if (state.isProcessing) return;
                
                try {
                    if (state.history.length > MAX_HISTORY_LENGTH) {
                        state.history.shift();
                    }
                    
                    const json = JSON.stringify(canvas.toJSON(SAVE_PROPS));
                    state.history.push(json);
                    state.redoStack = [];
                    this.updateButtons();
                } catch (e) {
                    console.error('History save error:', e);
                }
            },

            debouncedSave:Utils.debounce(function() {
                History.save();
            }, 500),

            undo:function() {
                if (state.history.length <= 1) return;
                
                state.isProcessing = true;
                state.redoStack.push(state.history.pop());
                
                canvas.loadFromJSON(state.history[state.history.length - 1], () => {
                    canvas.renderAll();
                    state.isProcessing = false;
                    this.updateButtons();
                });
            },

            redo:function() {
                if (state.redoStack.length === 0) return;
                
                state.isProcessing = true;
                const json = state.redoStack.pop();
                state.history.push(json);
                
                canvas.loadFromJSON(json, () => {
                    canvas.renderAll();
                    state.isProcessing = false;
                    this.updateButtons();
                });
            },

            updateButtons:function() {
                const undoBtn = Utils.getElement('btn-undo');
                const redoBtn = Utils.getElement('btn-redo');
                
                if (undoBtn) {
                    undoBtn.disabled = state.history.length <= 1;
                    undoBtn.style.opacity = state.history.length <= 1 ? '0.3' :'1';
                }
                
                if (redoBtn) {
                    redoBtn.disabled = state.redoStack.length === 0;
                    redoBtn.style.opacity = state.redoStack.length === 0 ? '0.3' :'1';
                }
            }
        };

        // ========================================
        // UI MODULE
        // ========================================
        
        const UI = {
            init:function() {
                this.setupOverlayListener();
                this.setupDragHandle();
                this.setupGestureHandlers();
                this.setupInputListeners();
            },

            setupOverlayListener:function() {
                const overlay = Utils.getElement('overlay');
                if (overlay) {
                    overlay.addEventListener('click', () => this.closeAllDrawers());
                }
            },

            setupDragHandle:function() {
                const dragHandle = Utils.getElement('drag-handle');
                if (!dragHandle) return;

                let dragStartY = 0;
                let isDraggingBar = false;
                const propBar = Utils.getElement('prop-bar');

                dragHandle.addEventListener('touchstart', (e) => {
                    dragStartY = e.touches[0].clientY;
                    isDraggingBar = true;
                    propBar.classList.add('dragging');
                }, { passive:false });

                dragHandle.addEventListener('touchmove', (e) => {
                    if (!isDraggingBar) return;
                    const dy = Math.max(0, e.touches[0].clientY - dragStartY);
                    propBar.style.transform = `translateY(${dy}px)`;
                    e.preventDefault();
                }, { passive:false });

                dragHandle.addEventListener('touchend', (e) => {
                    if (!isDraggingBar) return;
                    isDraggingBar = false;
                    propBar.classList.remove('dragging');
                    
                    if ((e.changedTouches[0].clientY - dragStartY) > 60) {
                        this.minimizeMenu();
                    } else {
                        propBar.style.transform = '';
                    }
                });
            },

            setupGestureHandlers:function() {
                const stage = Utils.getElement('stage-container');
                const viewport = Utils.getElement('viewport');
                if (!stage || !viewport) return;

                let isGesturing = false;
                let startDist = 0;
                let startScale = 1;
                let startPanX = 0;
                let startPanY = 0;
                let pinchCenter = { x:0, y:0 };

                const getDist = (t1, t2) => Math.hypot(t2.clientX - t1.clientX, t2.clientY - t1.clientY);
                const getCenter = (t1, t2) => ({
                    x:(t1.clientX + t2.clientX) / 2,
                    y:(t1.clientY + t2.clientY) / 2
                });

                stage.addEventListener('touchstart', (e) => {
                    if (e.touches.length === 2) {
                        isGesturing = true;
                        e.preventDefault();
                        const t1 = e.touches[0];
                        const t2 = e.touches[1];
                        startDist = getDist(t1, t2);
                        pinchCenter = getCenter(t1, t2);
                        startScale = state.scale;
                        startPanX = state.panX;
                        startPanY = state.panY;
                    }
                }, { passive:false });

                stage.addEventListener('touchmove', (e) => {
                    if (isGesturing && e.touches.length === 2) {
                        e.preventDefault();
                        const t1 = e.touches[0];
                        const t2 = e.touches[1];
                        const curDist = getDist(t1, t2);
                        const curCenter = getCenter(t1, t2);
                        const zoom = curDist / startDist;
                        
                        let newScale = Math.min(Math.max(startScale * zoom, ZOOM_MIN), ZOOM_MAX);
                        
                        const dx = curCenter.x - pinchCenter.x;
                        const dy = curCenter.y - pinchCenter.y;
                        const zsx = (pinchCenter.x - startPanX) * (1 - newScale / startScale);
                        const zsy = (pinchCenter.y - startPanY) * (1 - newScale / startScale);
                        
                        state.panX = startPanX + dx + zsx;
                        state.panY = startPanY + dy + zsy;
                        state.scale = newScale;
                        
                        requestAnimationFrame(() => this.renderTransform());
                    }
                }, { passive:false });

                stage.addEventListener('touchend', (e) => {
                    if (e.touches.length < 2) isGesturing = false;
                });
            },

            setupInputListeners:function() {
                // Size input
                const inpSize = Utils.getElement('inp-size');
                if (inpSize) {
                    inpSize.addEventListener('input', (e) => {
                        Canvas.updateSize(e.target.value);
                    });
                }

                // Stroke input
                const inpStroke = Utils.getElement('inp-stroke');
                if (inpStroke) {
                    inpStroke.addEventListener('input', (e) => {
                        Canvas.updateProp('strokeWidth', parseInt(e.target.value));
                    });
                }

                // Radius input
                const inpRadius = Utils.getElement('inp-radius');
                if (inpRadius) {
                    inpRadius.addEventListener('input', (e) => {
                        const val = parseInt(e.target.value);
                        Canvas.updateProp('rx', val);
                        Canvas.updateProp('ry', val);
                    });
                }

                // Opacity input
                const inpOpacity = Utils.getElement('inp-opacity');
                if (inpOpacity) {
                    inpOpacity.addEventListener('input', (e) => {
                        Canvas.updateProp('opacity', parseFloat(e.target.value));
                    });
                }

                // Pixelate filter
                const inpPixelate = Utils.getElement('inp-pixelate');
                if (inpPixelate) {
                    inpPixelate.addEventListener('input', (e) => {
                        Canvas.applyFilter('pixelate', e.target.value);
                    });
                }

                // Blur filter
                const inpBlur = Utils.getElement('inp-blur');
                if (inpBlur) {
                    inpBlur.addEventListener('input', (e) => {
                        Canvas.applyFilter('blur', e.target.value);
                    });
                }

                // Gradient balance
                const gradBalance = Utils.getElement('grad-balance');
                if (gradBalance) {
                    gradBalance.addEventListener('input', (e) => {
                        Theme.updateGradientBalance(e.target.value);
                    });
                }

                // Text input live update
                const textInput = Utils.getElement('text-input');
                if (textInput) {
                    textInput.addEventListener('input', () => {
                        const obj = canvas.getActiveObject();
                        if (obj) {
                            obj.set('text', textInput.value);
                            canvas.requestRenderAll();
                        }
                    });
                }
            },

            renderTransform:function() {
                const viewport = Utils.getElement('viewport');
                const zoomLabel = Utils.getElement('zoom-level');
                
                if (viewport) {
                    viewport.style.transform = `translate(${state.panX}px, ${state.panY}px) scale(${state.scale})`;
                }
                
                if (zoomLabel) {
                    zoomLabel.innerText = Math.round(state.scale * 100) + '%';
                    zoomLabel.style.opacity = '1';
                    
                    clearTimeout(window.zoomTimer);
                    window.zoomTimer = setTimeout(() => {
                        zoomLabel.style.opacity = '0';
                    }, 1000);
                }
            },

            resetView:function() {
                const stage = Utils.getElement('stage-container');
                if (!stage) return;

                const margin = 40;
                const cw = stage.clientWidth;
                const ch = stage.clientHeight;
                const sx = (cw - margin) / CARD_WIDTH;
                const sy = (ch - margin) / CARD_HEIGHT;
                
                state.scale = Math.min(sx, sy, 0.85);
                state.panX = (cw - (CARD_WIDTH * state.scale)) / 2;
                state.panY = (ch - (CARD_HEIGHT * state.scale)) / 2;
                
                this.renderTransform();
            },

            toggleSettings:function() {
                const drawer = Utils.getElement('settings-drawer');
                if (!drawer) return;

                if (drawer.classList.contains('translate-x-full')) {
                    this.closeAllDrawers();
                    drawer.classList.remove('translate-x-full');
                    drawer.setAttribute('aria-hidden', 'false');
                    Utils.showOverlay();
                    Templates.loadList();
                    Theme.renderSettingsUI();
                    DeckData.renderVariableList();
                    
                    if (!colorPickerInstance) {
                        Theme.initColorEngine();
                    }
                    if (colorPickerInstance) {
                        colorPickerInstance.resize(220);
                    }
                } else {
                    this.closeAllDrawers();
                }
            },

            openShapesDrawer:function() {
                const drawer = Utils.getElement('shapes-drawer');
                if (!drawer) return;

                this.closeAllDrawers();
                GenUI.showList();
                drawer.classList.remove('translate-y-full');
                drawer.setAttribute('aria-hidden', 'false');
                Utils.showOverlay();
            },

            closeAllDrawers:function() {
                const settingsDrawer = Utils.getElement('settings-drawer');
                const shapesDrawer = Utils.getElement('shapes-drawer');
                const layersDrawer = Utils.getElement('layers-drawer');
                
                if (settingsDrawer) {
                    settingsDrawer.classList.add('translate-x-full');
                    settingsDrawer.setAttribute('aria-hidden', 'true');
                }
                
                if (shapesDrawer) {
                    shapesDrawer.classList.add('translate-y-full');
                    shapesDrawer.setAttribute('aria-hidden', 'true');
                }

                if (layersDrawer) {
                    layersDrawer.classList.add('translate-x-full');
                    layersDrawer.setAttribute('aria-hidden', 'true');
                    DeckForge.Layers.isOpen = false;
                }
                
                Utils.hideOverlay();
            },

            toggleGuides:function() {
                const guides = Utils.getElement('print-guides');
                const btn = Utils.getElement('btn-guides');
                
                if (!guides || !btn) return;
                
                if (guides.style.display === 'block') {
                    guides.style.display = 'none';
                    btn.classList.remove('text-blue-600', 'bg-blue-50');
                    btn.setAttribute('aria-pressed', 'false');
                } else {
                    guides.style.display = 'block';
                    btn.classList.add('text-blue-600', 'bg-blue-50');
                    btn.setAttribute('aria-pressed', 'true');
                }
            },

            openProperties:function() {
                const fab = Utils.getElement('btn-open-props');
                const propBar = Utils.getElement('prop-bar');
                const mainControls = Utils.getElement('main-controls');
                
                if (fab) fab.classList.add('scale-0');
                if (propBar) {
                    propBar.classList.remove('translate-y-[120%]');
                    propBar.style.transform = '';
                }
                if (mainControls) mainControls.classList.add('translate-y-24');
            },

            minimizeMenu:function() {
                const fab = Utils.getElement('btn-open-props');
                const propBar = Utils.getElement('prop-bar');
                const mainControls = Utils.getElement('main-controls');
                
                if (fab) fab.classList.remove('scale-0');
                if (propBar) {
                    propBar.classList.add('translate-y-[120%]');
                    propBar.style.transform = '';
                }
                if (mainControls) mainControls.classList.remove('translate-y-24');
            },

            setPropTab:function(tabName) {
                ['color', 'shape', 'fx'].forEach(t => {
                    const content = Utils.getElement(`tab-${t}`);
                    const btn = Utils.getElement(`tab-btn-${t}`);
                    
                    if (content) content.classList.add('hidden');
                    if (btn) {
                        btn.classList.remove('text-blue-600', 'border-blue-600');
                        btn.classList.add('text-gray-400', 'border-transparent');
                        btn.setAttribute('aria-selected', 'false');
                    }
                });

                const activeContent = Utils.getElement(`tab-${tabName}`);
                const activeBtn = Utils.getElement(`tab-btn-${tabName}`);
                
                if (activeContent) activeContent.classList.remove('hidden');
                if (activeBtn) {
                    activeBtn.classList.remove('text-gray-400', 'border-transparent');
                    activeBtn.classList.add('text-blue-600', 'border-blue-600');
                    activeBtn.setAttribute('aria-selected', 'true');
                }
            },

            setEditMode:function(mode) {
                state.editMode = mode;
                
                const fillBtn = Utils.getElement('mode-fill');
                const strokeBtn = Utils.getElement('mode-stroke');
                
                if (mode === 'fill') {
                    if (fillBtn) {
                        fillBtn.className = "flex-1 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wide bg-white shadow-sm text-blue-600 transition";
                        fillBtn.setAttribute('aria-pressed', 'true');
                    }
                    if (strokeBtn) {
                        strokeBtn.className = "flex-1 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wide text-gray-400 hover:text-gray-600 transition";
                        strokeBtn.setAttribute('aria-pressed', 'false');
                    }
                } else {
                    if (strokeBtn) {
                        strokeBtn.className = "flex-1 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wide bg-white shadow-sm text-blue-600 transition";
                        strokeBtn.setAttribute('aria-pressed', 'true');
                    }
                    if (fillBtn) {
                        fillBtn.className = "flex-1 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wide text-gray-400 hover:text-gray-600 transition";
                        fillBtn.setAttribute('aria-pressed', 'false');
                    }
                }
                
                Theme.renderPaletteUI();
            },

            updateContextualUI:function(obj) {
                if (!obj) return;

                const elEditText = Utils.getElement('btn-edit-text');
                const elRadius = Utils.getElement('group-radius');
                const elFilters = Utils.getElement('image-filters');
                const elFillBtn = Utils.getElement('mode-fill');
                const lblSizeTitle = Utils.getElement('lbl-size-title');

                // Reset
                if (elEditText) elEditText.classList.add('hidden');
                if (elRadius) elRadius.classList.add('hidden');
                if (elFilters) elFilters.classList.add('hidden');
                if (elFillBtn) elFillBtn.classList.remove('hidden');

                switch (obj.type) {
                    case 'i-text':
                        if (elEditText) elEditText.classList.remove('hidden');
                        if (lblSizeTitle) lblSizeTitle.innerHTML = '<i class="ph-bold ph-text-aa"></i> Font Size';
                        break;

                    case 'image':
                        if (elFilters) elFilters.classList.remove('hidden');
                        if (elFillBtn) elFillBtn.classList.add('hidden');
                        if (lblSizeTitle) lblSizeTitle.innerHTML = '<i class="ph-bold ph-arrows-out-simple"></i> Scale';
                        break;

                    case 'rect':
                        if (elRadius) elRadius.classList.remove('hidden');
                        if (lblSizeTitle) lblSizeTitle.innerHTML = '<i class="ph-bold ph-arrows-out-simple"></i> Size';
                        break;

                    default:
                        if (lblSizeTitle) lblSizeTitle.innerHTML = '<i class="ph-bold ph-arrows-out-simple"></i> Scale';
                        break;
                }
            },

            updateLockUI:function(isLocked) {
                const btn = Utils.getElement('btn-lock');
                const overlay = Utils.getElement('lock-overlay');
                const deleteBtn = Utils.getElement('btn-delete');
                const layerUp = Utils.getElement('btn-layer-up');
                const layerDown = Utils.getElement('btn-layer-down');

                if (!btn) return;
                const icon = btn.querySelector('i');

                if (isLocked) {
                    if (icon) icon.className = "ph-fill ph-lock-key text-orange-500 text-xl";
                    btn.setAttribute('aria-pressed', 'true');
                    if (overlay) overlay.classList.remove('hidden');
                    [deleteBtn, layerUp, layerDown].forEach(b => {
                        if (b) {
                            b.disabled = true;
                            b.classList.add('opacity-30');
                        }
                    });
                } else {
                    if (icon) icon.className = "ph-bold ph-lock-open text-gray-400 text-xl";
                    btn.setAttribute('aria-pressed', 'false');
                    if (overlay) overlay.classList.add('hidden');
                    [deleteBtn, layerUp, layerDown].forEach(b => {
                        if (b) {
                            b.disabled = false;
                            b.classList.remove('opacity-30');
                        }
                    });
                }
            }
        };
