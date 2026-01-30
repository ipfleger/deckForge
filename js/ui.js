// ========================================
// UI CONTROLLER & INTERACTION
// ========================================

(function() {
    'use strict';

    DeckForge.UI = {
        init: function() {
            // Force the viewport to scale from the top-left corner
            // This is critical for the centering math to work correctly
            const viewport = DeckForge.Utils.getElement('viewport');
            if (viewport) {
                viewport.style.transformOrigin = '0 0';
                viewport.style.willChange = 'transform';
            }

            this.setupOverlayListener();
            this.setupDragHandle();
            this.setupGestureHandlers();
            this.setupInputListeners();
            this.setupMouseZoom();
            this.setupContextMenu();
        },

        setupOverlayListener: function() {
            const overlay = DeckForge.Utils.getElement('overlay');
            if (overlay) {
                overlay.addEventListener('click', () => this.closeAllDrawers());
            }
        },

        setupDragHandle: function() {
            const dragHandle = DeckForge.Utils.getElement('drag-handle');
            if (!dragHandle) return;

            let dragStartY = 0;
            let isDraggingBar = false;
            const propBar = DeckForge.Utils.getElement('prop-bar');

            dragHandle.addEventListener('touchstart', (e) => {
                dragStartY = e.touches[0].clientY;
                isDraggingBar = true;
                propBar.classList.add('dragging');
            }, { passive: false });

            dragHandle.addEventListener('touchmove', (e) => {
                if (!isDraggingBar) return;
                const dy = Math.max(0, e.touches[0].clientY - dragStartY);
                propBar.style.transform = `translateY(${dy}px)`;
                e.preventDefault();
            }, { passive: false });

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

        setupGestureHandlers: function() {
    const stage = DeckForge.Utils.getElement('stage-container');
    if (!stage) return;

    let isGesturing = false;
    let startDist = 0;
    let startScale = 1;
    let startPanX = 0;
    let startPanY = 0;
    let startCenter = { x: 0, y: 0 };  // Screen coords of initial pinch center
    let anchorWorld = { x: 0, y: 0 };  // World coords under initial pinch (THE KEY)

    const getDist = (t1, t2) => Math.hypot(t2.clientX - t1.clientX, t2.clientY - t1.clientY);
    
    const getCenter = (t1, t2) => ({
        x: (t1.clientX + t2.clientX) / 2,
        y: (t1.clientY + t2.clientY) / 2
    });

    // Convert screen coordinates to world (canvas) coordinates
    const screenToWorld = (screenX, screenY, panX, panY, scale) => ({
        x: (screenX - panX) / scale,
        y: (screenY - panY) / scale
    });

    // Convert world coordinates back to screen coordinates
    const worldToScreen = (worldX, worldY, panX, panY, scale) => ({
        x: worldX * scale + panX,
        y: worldY * scale + panY
    });

    stage.addEventListener('touchstart', (e) => {
        if (e.touches.length === 2) {
            isGesturing = true;
            e.preventDefault(); 
            
            const t1 = e.touches[0];
            const t2 = e.touches[1];
            
            startDist = getDist(t1, t2);
            startCenter = getCenter(t1, t2);
            
            startScale = DeckForge.state.scale;
            startPanX = DeckForge.state.panX;
            startPanY = DeckForge.state.panY;

            // CRITICAL: Calculate the world-space point under the pinch center
            // This point should stay visually anchored throughout the gesture
            anchorWorld = screenToWorld(
                startCenter.x, 
                startCenter.y, 
                startPanX, 
                startPanY, 
                startScale
            );
        }
    }, { passive: false });

    stage.addEventListener('touchmove', (e) => {
        if (isGesturing && e.touches.length === 2) {
            e.preventDefault();
            
            const t1 = e.touches[0];
            const t2 = e.touches[1];
            
            const curDist = getDist(t1, t2);
            const curCenter = getCenter(t1, t2);
            
            // Calculate new scale based on pinch distance ratio
            const zoomRatio = curDist / startDist;
            let newScale = startScale * zoomRatio;
            newScale = Math.min(Math.max(newScale, DeckForge.ZOOM_MIN), DeckForge.ZOOM_MAX);
            
            // ADOBE-STYLE: Calculate where the anchor point WOULD appear with new scale
            // Then adjust pan so it appears at the CURRENT pinch center instead
            const anchorScreen = worldToScreen(
                anchorWorld.x, 
                anchorWorld.y, 
                startPanX, 
                startPanY, 
                newScale
            );
            
            // The difference between where anchor would be vs where pinch is now = pan adjustment
            const newPanX = startPanX + (curCenter.x - anchorScreen.x);
            const newPanY = startPanY + (curCenter.y - anchorScreen.y);
            
            DeckForge.state.panX = newPanX;
            DeckForge.state.panY = newPanY;
            DeckForge.state.scale = newScale;
            
            requestAnimationFrame(() => this.renderTransform());
        }
    }, { passive: false });

    stage.addEventListener('touchend', (e) => {
        if (e.touches.length < 2) {
            isGesturing = false;
        }
    });
},

        setupMouseZoom: function() {
    // Reuse the coordinate conversion helpers (or define inline)
    const screenToWorld = (screenX, screenY, panX, panY, scale) => ({
        x: (screenX - panX) / scale,
        y: (screenY - panY) / scale
    });

    window.addEventListener('wheel', (opt) => {
        // Detect zoom gesture: ctrl+wheel OR trackpad pinch (ctrlKey is auto-set for pinch)
        if (opt.ctrlKey) {
            opt.preventDefault();
            
            const oldScale = DeckForge.state.scale;
            
            // Normalized zoom factor (Adobe-style)
            // Using a consistent multiplier rather than 0.999^delta which varies by device
            const zoomIntensity = 0.002;
            const zoomDelta = -opt.deltaY * zoomIntensity;
            let newScale = oldScale * (1 + zoomDelta);
            
            // Clamp to zoom limits
            newScale = Math.min(Math.max(newScale, DeckForge.ZOOM_MIN), DeckForge.ZOOM_MAX);
            
            // If scale didn't actually change (hit limits), skip pan recalculation
            if (newScale === oldScale) return;
            
            // ZOOM-TO-CURSOR: Keep the point under the mouse stationary
            // 1. Get current mouse position (screen coords)
            const mouseX = opt.clientX;
            const mouseY = opt.clientY;
            
            // 2. Calculate world coordinate under mouse at OLD scale
            const worldPoint = screenToWorld(
                mouseX, 
                mouseY, 
                DeckForge.state.panX, 
                DeckForge.state.panY, 
                oldScale
            );
            
            // 3. Calculate where that world point WOULD be at NEW scale (with current pan)
            const newScreenX = worldPoint.x * newScale + DeckForge.state.panX;
            const newScreenY = worldPoint.y * newScale + DeckForge.state.panY;
            
            // 4. Adjust pan so the world point stays under the mouse
            DeckForge.state.panX += mouseX - newScreenX;
            DeckForge.state.panY += mouseY - newScreenY;
            DeckForge.state.scale = newScale;
            
            this.renderTransform();
            
        } else if (!opt.target.closest('.overflow-y-auto')) {
            // Regular pan (two-finger scroll on trackpad or scroll wheel)
            DeckForge.state.panX -= opt.deltaX;
            DeckForge.state.panY -= opt.deltaY;
            this.renderTransform();
        }
    }, { passive: false });
},

        setupInputListeners: function() {
            const bindInput = (id, callback) => {
                const el = DeckForge.Utils.getElement(id);
                if (el) el.addEventListener('input', callback);
            };

            bindInput('inp-size', (e) => DeckForge.Canvas.updateSize(e.target.value));
            bindInput('inp-stroke', (e) => DeckForge.Canvas.updateProp('strokeWidth', parseInt(e.target.value)));
            bindInput('inp-radius', (e) => {
                const val = parseInt(e.target.value);
                DeckForge.Canvas.updateProp('rx', val);
                DeckForge.Canvas.updateProp('ry', val);
            });
            bindInput('inp-opacity', (e) => DeckForge.Canvas.updateProp('opacity', parseFloat(e.target.value)));
            bindInput('grad-balance', (e) => DeckForge.Theme.updateGradientBalance(e.target.value));
            
            bindInput('inp-pixelate', (e) => DeckForge.Canvas.applyFilter('pixelate', e.target.value));
            bindInput('inp-blur', (e) => DeckForge.Canvas.applyFilter('blur', e.target.value));
        },

        renderTransform: function() {
            const viewport = DeckForge.Utils.getElement('viewport');
            const zoomLabel = DeckForge.Utils.getElement('zoom-level');
            
            if (viewport) {
                // IMPORTANT: transform-origin MUST be '0 0' (top left) for this translation to work
                viewport.style.transform = `translate(${DeckForge.state.panX}px, ${DeckForge.state.panY}px) scale(${DeckForge.state.scale})`;
            }
            
            if (zoomLabel) {
                zoomLabel.innerText = Math.round(DeckForge.state.scale * 100) + '%';
                zoomLabel.style.opacity = '1';
                
                if (window.zoomTimer) clearTimeout(window.zoomTimer);
                window.zoomTimer = setTimeout(() => {
                    zoomLabel.style.opacity = '0';
                }, 1000);
            }
        },

        resetView: function() {
            // Use window dimensions directly for mobile safety
            const w = window.innerWidth;
            const h = window.innerHeight;
            
            // Padding around the card
            const padding = 20;

            // Calculate scale based on fitting width OR height
            // We use 750 (Card Width) and 1050 (Card Height)
            const scaleX = (w - (padding * 2)) / DeckForge.CARD_WIDTH;
            const scaleY = (h - (padding * 2) - 100) / DeckForge.CARD_HEIGHT; // -100 for top/bottom UI bars

            // Pick the smaller scale so it fits entirely
            let newScale = Math.min(scaleX, scaleY);
            
            // Limit max initial scale
            newScale = Math.min(newScale, 0.85);
            // Limit min initial scale
            newScale = Math.max(newScale, 0.2);

            DeckForge.state.scale = newScale;

            // Center Math:
            // (Screen Dimension - (Card Dimension * Scale)) / 2
            DeckForge.state.panX = (w - (DeckForge.CARD_WIDTH * newScale)) / 2;
            DeckForge.state.panY = (h - (DeckForge.CARD_HEIGHT * newScale)) / 2;

            this.renderTransform();
        },

        toggleSettings: function() {
            const drawer = DeckForge.Utils.getElement('settings-drawer');
            if (!drawer) return;

            if (drawer.classList.contains('translate-x-full')) {
                this.closeAllDrawers();
                drawer.classList.remove('translate-x-full');
                drawer.setAttribute('aria-hidden', 'false');
                DeckForge.Utils.showOverlay();
                
                if (DeckForge.Templates) DeckForge.Templates.loadSaved();
                if (DeckForge.Theme) DeckForge.Theme.renderSettingsUI();
                if (DeckForge.DeckData) DeckForge.DeckData.renderUI();
                
                if (DeckForge.Theme && typeof DeckForge.Theme.resizePicker === 'function') {
                    DeckForge.Theme.resizePicker();
                }
            } else {
                this.closeAllDrawers();
            }
        },

        openShapesDrawer: function() {
            const drawer = DeckForge.Utils.getElement('shapes-drawer');
            if (!drawer) return;

            this.closeAllDrawers();
            if (DeckForge.GenUI) DeckForge.GenUI.showList();
            
            drawer.classList.remove('translate-y-full');
            drawer.setAttribute('aria-hidden', 'false');
            DeckForge.Utils.showOverlay();
        },

        closeAllDrawers: function() {
            const settingsDrawer = DeckForge.Utils.getElement('settings-drawer');
            const shapesDrawer = DeckForge.Utils.getElement('shapes-drawer');
            const layersDrawer = DeckForge.Utils.getElement('layers-drawer');
            
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
                if (DeckForge.Layers) DeckForge.Layers.isOpen = false;
            }
            
            DeckForge.Utils.hideOverlay();
        },

        openProperties: function() {
            const fab = DeckForge.Utils.getElement('btn-open-props');
            const propBar = DeckForge.Utils.getElement('prop-bar');
            const mainControls = DeckForge.Utils.getElement('main-controls');
            
            if (fab) fab.classList.add('scale-0');
            if (propBar) {
                propBar.classList.remove('translate-y-[120%]');
                propBar.style.transform = '';
            }
            if (mainControls) mainControls.classList.add('translate-y-24');
        },

        minimizeMenu: function() {
            const fab = DeckForge.Utils.getElement('btn-open-props');
            const propBar = DeckForge.Utils.getElement('prop-bar');
            const mainControls = DeckForge.Utils.getElement('main-controls');
            
            if (fab) fab.classList.remove('scale-0');
            if (propBar) {
                propBar.classList.add('translate-y-[120%]');
                propBar.style.transform = '';
            }
            if (mainControls) mainControls.classList.remove('translate-y-24');
        },

setPropTab: function(tab) {
    const tabs = ['color', 'shape', 'fx', 'type'];
    
    tabs.forEach(t => {
        const btn = DeckForge.Utils.getElement(`tab-btn-${t}`);
        const panel = DeckForge.Utils.getElement(`tab-${t}`);
        
        if (btn) {
            if (t === tab) {
                btn.classList.add('text-blue-600', 'border-blue-600');
                btn.classList.remove('text-gray-400', 'border-transparent');
                btn.setAttribute('aria-selected', 'true');
            } else {
                btn.classList.remove('text-blue-600', 'border-blue-600');
                btn.classList.add('text-gray-400', 'border-transparent');
                btn.setAttribute('aria-selected', 'false');
            }
        }
        
        if (panel) {
            if (t === tab) {
                panel.classList.remove('hidden');
            } else {
                panel.classList.add('hidden');
            }
        }
    });
},

        setEditMode: function(mode) {
            DeckForge.state.editMode = mode;
            
            const fillBtn = DeckForge.Utils.getElement('mode-fill');
            const strokeBtn = DeckForge.Utils.getElement('mode-stroke');
            
            const activeClass = "flex-1 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wide bg-white shadow-sm text-blue-600 transition";
            const inactiveClass = "flex-1 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wide text-gray-400 hover:text-gray-600 transition";

            if (mode === 'fill') {
                if (fillBtn) { fillBtn.className = activeClass; fillBtn.setAttribute('aria-pressed', 'true'); }
                if (strokeBtn) { strokeBtn.className = inactiveClass; strokeBtn.setAttribute('aria-pressed', 'false'); }
            } else {
                if (strokeBtn) { strokeBtn.className = activeClass; strokeBtn.setAttribute('aria-pressed', 'true'); }
                if (fillBtn) { fillBtn.className = inactiveClass; fillBtn.setAttribute('aria-pressed', 'false'); }
            }
            
            if (DeckForge.Theme) DeckForge.Theme.renderPaletteUI();
        },

 updateContextualUI: function(obj) {
    const editTextBtn = DeckForge.Utils.getElement('btn-edit-text');
    const radiusGroup = DeckForge.Utils.getElement('group-radius');
    const imageFilters = DeckForge.Utils.getElement('image-filters');
    const typeTab = DeckForge.Utils.getElement('tab-btn-type');

    // Show/hide text edit button
    if (editTextBtn) {
        if (obj && obj.type === 'i-text') {
            editTextBtn.classList.remove('hidden');
        } else {
            editTextBtn.classList.add('hidden');
        }
    }

    // Show/hide Type tab for text objects
    if (typeTab) {
        if (obj && obj.type === 'i-text') {
            typeTab.classList.remove('hidden');
        } else {
            typeTab.classList.add('hidden');
        }
    }

    // Show/hide corner radius for rectangles
    if (radiusGroup) {
        if (obj && obj.type === 'rect') {
            radiusGroup.classList.remove('hidden');
        } else {
            radiusGroup.classList.add('hidden');
        }
    }

    // Show/hide image filters
    if (imageFilters) {
        if (obj && obj.type === 'image') {
            imageFilters.classList.remove('hidden');
        } else {
            imageFilters.classList.add('hidden');
        }
    }
},

        updateLockUI: function(isLocked) {
            const btn = DeckForge.Utils.getElement('btn-lock');
            const overlay = DeckForge.Utils.getElement('lock-overlay');
            const deleteBtn = DeckForge.Utils.getElement('btn-delete');
            const layerUp = DeckForge.Utils.getElement('btn-layer-up');
            const layerDown = DeckForge.Utils.getElement('btn-layer-down');

            if (!btn) return;
            const icon = btn.querySelector('i');

            if (isLocked) {
                if (icon) icon.className = "ph-fill ph-lock-key text-orange-500 text-xl";
                btn.setAttribute('aria-pressed', 'true');
                if (overlay) overlay.classList.remove('hidden');
                
                [deleteBtn, layerUp, layerDown].forEach(b => {
                    if (b) { b.disabled = true; b.classList.add('opacity-30'); }
                });
            } else {
                if (icon) icon.className = "ph-bold ph-lock-open text-gray-400 text-xl";
                btn.setAttribute('aria-pressed', 'false');
                if (overlay) overlay.classList.add('hidden');

                [deleteBtn, layerUp, layerDown].forEach(b => {
                    if (b) { b.disabled = false; b.classList.remove('opacity-30'); }
                });
            }
        },

        toggleGuides: function() {
            const guides = DeckForge.Utils.getElement('print-guides');
            const btn = DeckForge.Utils.getElement('btn-guides');
            
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
        }
    };
})();
