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
            this.setupTextureControl();
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

            // Gesture state
            let isGesturing = false;
            let gestureType = null; // 'pinch' | 'pan' | null
            let startDist = 0;
            let startScale = 1;
            let startPanX = 0;
            let startPanY = 0;
            let startCenter = { x: 0, y: 0 };
            let anchorWorld = { x: 0, y: 0 };

            // Single-finger pan state
            let isSingleFingerPan = false;
            let singleFingerStart = { x: 0, y: 0 };
            
            // CRITICAL FIX: Lock the interaction mode on touchstart
            // This prevents switching between dragging an object and panning the canvas
            // while moving your finger.
            let isObjectInteraction = false;

            // Momentum state
            let velocityX = 0;
            let velocityY = 0;
            let lastCenter = { x: 0, y: 0 };
            let lastTime = 0;
            let momentumRAF = null;

            // Momentum config
            const FRICTION = 0.92;
            const MIN_VELOCITY = 0.5;
            const VELOCITY_SMOOTHING = 0.3;

            const getDist = (t1, t2) => Math.hypot(t2.clientX - t1.clientX, t2.clientY - t1.clientY);
            
            const getCenter = (t1, t2) => ({
                x: (t1.clientX + t2.clientX) / 2,
                y: (t1.clientY + t2.clientY) / 2
            });

            const screenToWorld = (screenX, screenY, panX, panY, scale) => ({
                x: (screenX - panX) / scale,
                y: (screenY - panY) / scale
            });

            const worldToScreen = (worldX, worldY, panX, panY, scale) => ({
                x: worldX * scale + panX,
                y: worldY * scale + panY
            });

            // Check if a touch point is over a Fabric.js object
            const isTouchOnObject = (touch) => {
                const canvas = DeckForge.canvas;
                if (!canvas) return false;

                // CRITICAL FIX: Check if Fabric is currently transforming an object
                // This detects touches on the selection handles (blue box) which findTarget often misses
                if (canvas._currentTransform) return true;

                // Get the canvas element's bounding rect
                const canvasEl = canvas.upperCanvasEl;
                const rect = canvasEl.getBoundingClientRect();

                // Check if touch is even within the canvas bounds
                if (touch.clientX < rect.left || touch.clientX > rect.right ||
                    touch.clientY < rect.top || touch.clientY > rect.bottom) {
                    return false;
                }

                // Check if there's an object at this point
                const target = canvas.findTarget({
                    clientX: touch.clientX,
                    clientY: touch.clientY
                });

                return !!target;
            };

            const stopMomentum = () => {
                if (momentumRAF) {
                    cancelAnimationFrame(momentumRAF);
                    momentumRAF = null;
                }
                velocityX = 0;
                velocityY = 0;
            };

            const animateMomentum = () => {
                velocityX *= FRICTION;
                velocityY *= FRICTION;

                if (Math.abs(velocityX) < MIN_VELOCITY && Math.abs(velocityY) < MIN_VELOCITY) {
                    stopMomentum();
                    return;
                }

                DeckForge.state.panX += velocityX;
                DeckForge.state.panY += velocityY;
                this.renderTransform();

                momentumRAF = requestAnimationFrame(() => animateMomentum());
            };

            // ==================== TOUCH START ====================
            stage.addEventListener('touchstart', (e) => {
                stopMomentum();

                if (e.touches.length === 2) {
                    // ===== TWO-FINGER: Always pinch-zoom =====
                    isGesturing = true;
                    gestureType = 'pinch';
                    isSingleFingerPan = false;
                    isObjectInteraction = false;
                    e.preventDefault();

                    const t1 = e.touches[0];
                    const t2 = e.touches[1];

                    startDist = getDist(t1, t2);
                    startCenter = getCenter(t1, t2);
                    lastCenter = { ...startCenter };
                    lastTime = performance.now();

                    startScale = DeckForge.state.scale;
                    startPanX = DeckForge.state.panX;
                    startPanY = DeckForge.state.panY;

                    anchorWorld = screenToWorld(
                        startCenter.x,
                        startCenter.y,
                        startPanX,
                        startPanY,
                        startScale
                    );

                } else if (e.touches.length === 1) {
                    // ===== SINGLE-FINGER: Decide ONCE if object or pan =====
                    const touch = e.touches[0];
                    
                    if (isTouchOnObject(touch)) {
                        // We are interacting with an object.
                        // LOCK this state so we don't accidentally pan if we slip off.
                        isObjectInteraction = true;
                        isSingleFingerPan = false;
                        isGesturing = false;
                        gestureType = null;
                        // Let Fabric handle the event
                    } else {
                        // We are hitting empty space. Prepare to pan.
                        isObjectInteraction = false;
                        isSingleFingerPan = false; // Will be set true on move
                        singleFingerStart = { x: touch.clientX, y: touch.clientY };
                        lastCenter = { x: touch.clientX, y: touch.clientY };
                        lastTime = performance.now();
                        startPanX = DeckForge.state.panX;
                        startPanY = DeckForge.state.panY;
                    }
                }
            }, { passive: false });

            // ==================== TOUCH MOVE ====================
            stage.addEventListener('touchmove', (e) => {
                const now = performance.now();
                const dt = now - lastTime;

                if (e.touches.length === 2 && gestureType === 'pinch') {
                    // ===== TWO-FINGER PINCH-ZOOM =====
                    e.preventDefault();

                    const t1 = e.touches[0];
                    const t2 = e.touches[1];

                    const curDist = getDist(t1, t2);
                    const curCenter = getCenter(t1, t2);

                    // Track velocity
                    if (dt > 0) {
                        const newVelX = (curCenter.x - lastCenter.x) / dt * 16;
                        const newVelY = (curCenter.y - lastCenter.y) / dt * 16;
                        velocityX = velocityX * (1 - VELOCITY_SMOOTHING) + newVelX * VELOCITY_SMOOTHING;
                        velocityY = velocityY * (1 - VELOCITY_SMOOTHING) + newVelY * VELOCITY_SMOOTHING;
                    }

                    lastCenter = { ...curCenter };
                    lastTime = now;

                    const zoomRatio = curDist / startDist;
                    let newScale = startScale * zoomRatio;
                    newScale = Math.min(Math.max(newScale, DeckForge.ZOOM_MIN), DeckForge.ZOOM_MAX);

                    const anchorScreen = worldToScreen(
                        anchorWorld.x,
                        anchorWorld.y,
                        startPanX,
                        startPanY,
                        newScale
                    );

                    const newPanX = startPanX + (curCenter.x - anchorScreen.x);
                    const newPanY = startPanY + (curCenter.y - anchorScreen.y);

                    DeckForge.state.panX = newPanX;
                    DeckForge.state.panY = newPanY;
                    DeckForge.state.scale = newScale;

                    requestAnimationFrame(() => this.renderTransform());

                } else if (e.touches.length === 1) {
                    // ===== SINGLE-FINGER HANDLING =====
                    
                    // If we determined this was an object interaction at start,
                    // DO NOT allow panning. Just return and let Fabric handle it.
                    if (isObjectInteraction) {
                        return; 
                    }

                    // Otherwise, we are in panning mode
                    const touch = e.touches[0];
                    const dx = touch.clientX - singleFingerStart.x;
                    const dy = touch.clientY - singleFingerStart.y;

                    // Only start panning if moved more than 10px (prevents accidental pan on tap)
                    if (!isSingleFingerPan && (Math.abs(dx) > 10 || Math.abs(dy) > 10)) {
                        isSingleFingerPan = true;
                        e.preventDefault();
                    }

                    if (isSingleFingerPan) {
                        e.preventDefault();

                        if (dt > 0) {
                            const newVelX = (touch.clientX - lastCenter.x) / dt * 16;
                            const newVelY = (touch.clientY - lastCenter.y) / dt * 16;
                            velocityX = velocityX * (1 - VELOCITY_SMOOTHING) + newVelX * VELOCITY_SMOOTHING;
                            velocityY = velocityY * (1 - VELOCITY_SMOOTHING) + newVelY * VELOCITY_SMOOTHING;
                        }

                        lastCenter = { x: touch.clientX, y: touch.clientY };
                        lastTime = now;

                        DeckForge.state.panX = startPanX + dx;
                        DeckForge.state.panY = startPanY + dy;

                        requestAnimationFrame(() => this.renderTransform());
                    }
                }
            }, { passive: false });

            // ==================== TOUCH END ====================
            stage.addEventListener('touchend', (e) => {
                if (e.touches.length < 2 && gestureType === 'pinch') {
                    gestureType = null;
                    isGesturing = false;

                    if (Math.abs(velocityX) > MIN_VELOCITY || Math.abs(velocityY) > MIN_VELOCITY) {
                        momentumRAF = requestAnimationFrame(() => animateMomentum());
                    }
                }

                if (e.touches.length === 0) {
                    if (isSingleFingerPan) {
                        isSingleFingerPan = false;
                        if (Math.abs(velocityX) > MIN_VELOCITY || Math.abs(velocityY) > MIN_VELOCITY) {
                            momentumRAF = requestAnimationFrame(() => animateMomentum());
                        }
                    }
                    // Reset interaction lock
                    isObjectInteraction = false;
                }
            });

            // Cancel momentum on any new touch
            stage.addEventListener('touchstart', stopMomentum, { passive: true });
        },
        setupMouseZoom: function() {
    const screenToWorld = (screenX, screenY, panX, panY, scale) => ({
        x: (screenX - panX) / scale,
        y: (screenY - panY) / scale
    });

    // Track for pinch gesture detection
    let lastWheelTime = 0;
    let wheelEventCount = 0;
    let isPinchGesture = false;

    window.addEventListener('wheel', (e) => {
        const now = performance.now();
        
        // ===== DETECT PINCH GESTURE =====
        // Trackpad pinch characteristics:
        // 1. ctrlKey is true (browser convention for pinch)
        // 2. deltaY is small (typically < 10 for pinch, > 50 for mouse wheel click)
        // 3. Events fire rapidly (< 50ms apart)
        // 4. deltaMode is 0 (pixel-based, not line-based)
        
        const isCtrlZoom = e.ctrlKey;
        const isSmallDelta = Math.abs(e.deltaY) < 50;
        const isRapidFire = (now - lastWheelTime) < 100;
        const isPixelMode = e.deltaMode === 0;
        
        // Detect if this is likely a trackpad pinch
        if (isCtrlZoom && isSmallDelta && isPixelMode) {
            isPinchGesture = true;
            wheelEventCount++;
        } else if (!isCtrlZoom) {
            isPinchGesture = false;
            wheelEventCount = 0;
        }
        
        lastWheelTime = now;

        // ===== ZOOM HANDLING =====
        if (isCtrlZoom) {
            e.preventDefault();
            
            const oldScale = DeckForge.state.scale;
            
            // Different zoom intensity for trackpad vs mouse wheel
            // Trackpad pinch: smoother, smaller steps
            // Mouse wheel: larger, discrete steps
            let zoomIntensity;
            if (isPinchGesture) {
                // Trackpad pinch - very smooth
                zoomIntensity = 0.01;
            } else {
                // Mouse wheel with Ctrl - discrete steps
                zoomIntensity = 0.002;
            }
            
            const zoomDelta = -e.deltaY * zoomIntensity;
            let newScale = oldScale * (1 + zoomDelta);
            
            // Clamp to zoom limits
            newScale = Math.min(Math.max(newScale, DeckForge.ZOOM_MIN), DeckForge.ZOOM_MAX);
            
            // Skip if scale didn't change (hit limits)
            if (newScale === oldScale) return;
            
            // ZOOM-TO-CURSOR
            const mouseX = e.clientX;
            const mouseY = e.clientY;
            
            const worldPoint = screenToWorld(
                mouseX, 
                mouseY, 
                DeckForge.state.panX, 
                DeckForge.state.panY, 
                oldScale
            );
            
            const newScreenX = worldPoint.x * newScale + DeckForge.state.panX;
            const newScreenY = worldPoint.y * newScale + DeckForge.state.panY;
            
            DeckForge.state.panX += mouseX - newScreenX;
            DeckForge.state.panY += mouseY - newScreenY;
            DeckForge.state.scale = newScale;
            
            this.renderTransform();
            
        } else if (!e.target.closest('.overflow-y-auto')) {
            // ===== PAN HANDLING =====
            // Regular two-finger scroll on trackpad or mouse wheel
            DeckForge.state.panX -= e.deltaX;
            DeckForge.state.panY -= e.deltaY;
            this.renderTransform();
        }
    }, { passive: false });
},
        setupContextMenu: function() {
            // Create the context menu element
            const menu = document.createElement('div');
            menu.id = 'custom-context-menu';
            menu.className = 'fixed bg-white rounded-xl shadow-2xl border border-gray-200 py-2 z-[200] min-w-[180px] opacity-0 pointer-events-none transition-opacity duration-150';
            menu.innerHTML = `
                <div class="px-3 py-1.5 text-[10px] font-bold text-gray-400 uppercase tracking-wide">Edit</div>
                <button data-action="cut" class="context-btn w-full text-left px-4 py-2 hover:bg-blue-50 text-sm text-gray-700 flex items-center gap-3">
                    <i class="ph-bold ph-scissors text-gray-400"></i> Cut
                    <span class="ml-auto text-[10px] text-gray-400">⌘X</span>
                </button>
                <button data-action="copy" class="context-btn w-full text-left px-4 py-2 hover:bg-blue-50 text-sm text-gray-700 flex items-center gap-3">
                    <i class="ph-bold ph-copy text-gray-400"></i> Copy
                    <span class="ml-auto text-[10px] text-gray-400">⌘C</span>
                </button>
                <button data-action="paste" class="context-btn w-full text-left px-4 py-2 hover:bg-blue-50 text-sm text-gray-700 flex items-center gap-3">
                    <i class="ph-bold ph-clipboard text-gray-400"></i> Paste
                    <span class="ml-auto text-[10px] text-gray-400">⌘V</span>
                </button>
                <button data-action="duplicate" class="context-btn w-full text-left px-4 py-2 hover:bg-blue-50 text-sm text-gray-700 flex items-center gap-3">
                    <i class="ph-bold ph-copy-simple text-gray-400"></i> Duplicate
                    <span class="ml-auto text-[10px] text-gray-400">⌘D</span>
                </button>
                <div class="h-px bg-gray-200 my-2"></div>
                <div class="px-3 py-1.5 text-[10px] font-bold text-gray-400 uppercase tracking-wide">Add</div>
                <button data-action="add-text" class="context-btn w-full text-left px-4 py-2 hover:bg-blue-50 text-sm text-gray-700 flex items-center gap-3">
                    <i class="ph-bold ph-text-t text-gray-400"></i> Add Text
                </button>
                <button data-action="add-image" class="context-btn w-full text-left px-4 py-2 hover:bg-blue-50 text-sm text-gray-700 flex items-center gap-3">
                    <i class="ph-bold ph-image text-gray-400"></i> Add Image
                </button>
                <button data-action="add-shape" class="context-btn w-full text-left px-4 py-2 hover:bg-blue-50 text-sm text-gray-700 flex items-center gap-3">
                    <i class="ph-bold ph-shapes text-gray-400"></i> Add Shape
                </button>
                <button data-action="add-pattern" class="context-btn w-full text-left px-4 py-2 hover:bg-blue-50 text-sm text-gray-700 flex items-center gap-3">
                    <i class="ph-bold ph-grid-four text-gray-400"></i> Add Pattern
                </button>
                <div class="h-px bg-gray-200 my-2"></div>
                <button data-action="delete" class="context-btn w-full text-left px-4 py-2 hover:bg-red-50 text-sm text-red-600 flex items-center gap-3">
                    <i class="ph-bold ph-trash text-red-400"></i> Delete
                    <span class="ml-auto text-[10px] text-red-400">⌫</span>
                </button>
            `;
            document.body.appendChild(menu);

            // Track menu state
            let menuVisible = false;
            let menuPosition = { x: 0, y: 0 };

            // Show menu at position
            const showMenu = (x, y) => {
                // Adjust position to stay within viewport
                const menuRect = menu.getBoundingClientRect();
                const padding = 10;
                
                let posX = x;
                let posY = y;
                
                // Prevent menu from going off-screen
                if (x + 200 > window.innerWidth) posX = window.innerWidth - 200 - padding;
                if (y + 350 > window.innerHeight) posY = window.innerHeight - 350 - padding;
                if (posX < padding) posX = padding;
                if (posY < padding) posY = padding;

                menu.style.left = posX + 'px';
                menu.style.top = posY + 'px';
                menu.classList.remove('opacity-0', 'pointer-events-none');
                menu.classList.add('opacity-100', 'pointer-events-auto');
                menuVisible = true;
                menuPosition = { x: posX, y: posY };
            };

            // Hide menu
            const hideMenu = () => {
                menu.classList.add('opacity-0', 'pointer-events-none');
                menu.classList.remove('opacity-100', 'pointer-events-auto');
                menuVisible = false;
            };

            // Handle menu actions
            menu.addEventListener('click', (e) => {
                const btn = e.target.closest('[data-action]');
                if (!btn) return;

                const action = btn.dataset.action;
                hideMenu();

                switch (action) {
                    case 'cut':
                        if (DeckForge.Clipboard) {
                            DeckForge.Clipboard.copy();
                            DeckForge.Canvas.deleteActive();
                        }
                        break;
                    case 'copy':
                        if (DeckForge.Clipboard) DeckForge.Clipboard.copy();
                        break;
                    case 'paste':
                        if (DeckForge.Clipboard) DeckForge.Clipboard.paste();
                        break;
                    case 'duplicate':
                        if (DeckForge.Clipboard) DeckForge.Clipboard.duplicate();
                        break;
                    case 'add-text':
                        DeckForge.Canvas.addText();
                        break;
                    case 'add-image':
                        DeckForge.Canvas.triggerImageUpload();
                        break;
                    case 'add-shape':
                        DeckForge.UI.openShapesDrawer();
                        break;
                    case 'add-pattern':
                        DeckForge.UI.openShapesDrawer();
                        // Could auto-select patterns tab if you have one
                        break;
                    case 'delete':
                        DeckForge.Canvas.deleteActive();
                        break;
                }
            });

            // Update menu state based on selection
            const updateMenuState = () => {
                const hasSelection = !!DeckForge.canvas?.getActiveObject();
                const hasCopied = !!DeckForge.Clipboard?._copied;

                // Disable/enable buttons based on context
                menu.querySelector('[data-action="cut"]').classList.toggle('opacity-30', !hasSelection);
                menu.querySelector('[data-action="copy"]').classList.toggle('opacity-30', !hasSelection);
                menu.querySelector('[data-action="paste"]').classList.toggle('opacity-30', !hasCopied);
                menu.querySelector('[data-action="duplicate"]').classList.toggle('opacity-30', !hasSelection);
                menu.querySelector('[data-action="delete"]').classList.toggle('opacity-30', !hasSelection);
            };

            // Desktop: Right-click context menu
            window.addEventListener('contextmenu', (e) => {
                const isOnStage = e.target.closest('#stage-container') || e.target.tagName === 'CANVAS';
                
                if (isOnStage) {
                    e.preventDefault();
                    updateMenuState();
                    showMenu(e.clientX, e.clientY);
                }
            });

            // Mobile: Double-tap detection
            let lastTap = 0;
            let lastTapX = 0;
            let lastTapY = 0;
            const DOUBLE_TAP_DELAY = 300;
            const DOUBLE_TAP_DISTANCE = 30;

            const stage = DeckForge.Utils.getElement('stage-container');
            if (stage) {
                stage.addEventListener('touchend', (e) => {
                    const now = Date.now();
                    const touch = e.changedTouches[0];
                    
                    const timeDiff = now - lastTap;
                    const distX = Math.abs(touch.clientX - lastTapX);
                    const distY = Math.abs(touch.clientY - lastTapY);
                    
                    if (timeDiff < DOUBLE_TAP_DELAY && distX < DOUBLE_TAP_DISTANCE && distY < DOUBLE_TAP_DISTANCE) {
                        // Double tap detected!
                        e.preventDefault();
                        updateMenuState();
                        showMenu(touch.clientX, touch.clientY);
                        lastTap = 0; // Reset to prevent triple-tap
                    } else {
                        lastTap = now;
                        lastTapX = touch.clientX;
                        lastTapY = touch.clientY;
                    }
                }, { passive: false });
            }

            // Hide menu when clicking elsewhere
            window.addEventListener('click', (e) => {
                if (menuVisible && !menu.contains(e.target)) {
                    hideMenu();
                }
            });

            // Hide menu on scroll/zoom
            window.addEventListener('wheel', hideMenu);
            
            // Hide menu on escape
            window.addEventListener('keydown', (e) => {
                if (e.key === 'Escape' && menuVisible) {
                    hideMenu();
                }
            });

            // Store reference for other modules
            DeckForge.UI.contextMenu = {
                show: showMenu,
                hide: hideMenu,
                isVisible: () => menuVisible
            };
        },
    renderTransform: function() {
            const viewport = DeckForge.Utils.getElement('viewport');
            const zoomLabel = DeckForge.Utils.getElement('zoom-level');
            
            // If pan hasn't been initialized yet, do it now
            if (DeckForge.state.panX === null || DeckForge.state.panY === null) {
                this.resetView();
                return;
            }
            
            if (viewport) {
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
        //

setupTextureControl: function() {
    // 1. Find the container where Blend Mode lives (tab-fx)
    const fxTab = document.getElementById('tab-fx');
    const blendBtn = document.getElementById('btn-blend');
    
    if (!fxTab || !blendBtn) return;

    // 2. Create the wrapper for our new Texture UI
    const container = document.createElement('div');
    container.className = "flex flex-col gap-2 mt-4 pt-4 border-t border-gray-100";
    
    // 3. Create Label
    const labelHeader = document.createElement('div');
    labelHeader.className = "flex justify-between text-[10px] text-gray-500 font-bold uppercase tracking-wide";
    labelHeader.innerHTML = `<span>Texture</span><span id="lbl-texture" class="text-blue-600">None</span>`;
    
    // 4. Create Dropdown
    const select = document.createElement('select');
    select.className = "w-full text-xs p-2 rounded-lg border border-gray-200 bg-gray-50 font-bold text-gray-700 outline-none focus:border-blue-500";
    
    // Default Option
    const defaultOpt = document.createElement('option');
    defaultOpt.value = 'none';
    defaultOpt.innerText = 'None';
    select.appendChild(defaultOpt);

    // Add Presets
    if (DeckForge.Textures) {
        const group = document.createElement('optgroup');
        group.label = "Presets";
        Object.keys(DeckForge.Textures).forEach(key => {
            if(key === 'none') return;
            const opt = document.createElement('option');
            opt.value = key;
            opt.innerText = key.charAt(0).toUpperCase() + key.slice(1);
            group.appendChild(opt);
        });
        select.appendChild(group);
    }

    // Add User Assets
    if (DeckForge.Assets && DeckForge.Assets.items.length > 0) {
        const group = document.createElement('optgroup');
        group.label = "My Assets";
        DeckForge.Assets.items.forEach(asset => {
            const opt = document.createElement('option');
            opt.value = asset.id;
            opt.innerText = asset.name;
            group.appendChild(opt);
        });
        select.appendChild(group);
    }

    // 5. Event Listener
    select.addEventListener('change', (e) => {
        const val = e.target.value;
        const label = document.getElementById('lbl-texture');
        if(label) label.innerText = e.target.options[e.target.selectedIndex].text;
        
        // Call the utility we created earlier
        if(DeckForge.Utils.applyTextureToActiveObject) {
            DeckForge.Utils.applyTextureToActiveObject(val);
            DeckForge.History.save();
        }
    });

    // 6. Append to UI
    container.appendChild(labelHeader);
    container.appendChild(select);
    
    // Insert it after the Blend Mode button's container
    // The blend button is inside a grid div, so we append after that grid div
    blendBtn.parentElement.after(container);
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

            // DEBUG: Add this line
            console.log('resetView:', { w, h, panX: DeckForge.state.panX, panY: DeckForge.state.panY, scale: newScale });

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
