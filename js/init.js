// ========================================
// INITIALIZATION BOOTSTRAP
// ========================================

(function() {
    'use strict';

    DeckForge.init = function() {
        console.log("DeckForge Initializing...");

        // 1. Init Canvas (Model) - CRITICAL: MUST BE FIRST
        if (DeckForge.Canvas) {
            DeckForge.Canvas.init();
        } else {
            console.error("DeckForge.Canvas module is missing!");
            return;
        }

        // 2. Init UI (Controller)
        if (DeckForge.UI) {
            DeckForge.UI.init();
        }

        // 3. Setup Image Upload Handler (THE FIX)
        const imgUpload = DeckForge.Utils.getElement('img-upload');
        if (imgUpload) {
            // Remove any old listeners by cloning
            const newUpload = imgUpload.cloneNode(true);
            imgUpload.parentNode.replaceChild(newUpload, imgUpload);
            
            newUpload.addEventListener('change', (e) => {
                if (e.target.files && e.target.files[0]) {
                    DeckForge.Canvas.handleImageUpload(e.target.files[0]);
                    e.target.value = ''; // Allow re-uploading same file
                }
            });
        }

        // 4. Init managers/tools
        if (DeckForge.Assets?.init) DeckForge.Assets.init();
        if (DeckForge.Text) DeckForge.Text.init();
        if (DeckForge.GenUI) DeckForge.GenUI.init();
        if (DeckForge.Templates) DeckForge.Templates.init();
        if (DeckForge.DeckData) DeckForge.DeckData.init();
        if (DeckForge.Fonts) DeckForge.Fonts.init();
        if (DeckForge.Clipboard) DeckForge.Clipboard.init();

        // 5. Theme engine
        if (DeckForge.Theme) {
            DeckForge.Theme.initColorEngine();
            DeckForge.Theme.loadCustomPalettes();
            DeckForge.Theme.renderSettingsUI();
        }

        // 6. Collections & zoom
        if (DeckForge.DeckCollection) DeckForge.DeckCollection.init();
        if (DeckForge.RouletteZoom) DeckForge.RouletteZoom.init();

        // 7. Initial view
        if (DeckForge.UI) DeckForge.UI.resetView();
        setTimeout(() => DeckForge.UI && DeckForge.UI.resetView(), 500); // mobile address bar correction

        // 8. Canvas hooks (mask tool)
        const canvas = DeckForge.getCanvas ? DeckForge.getCanvas() : null;
        if (canvas && DeckForge.MaskTool) {
            canvas.on('mouse:down', (opt) => {
                DeckForge.MaskTool.handleTap(opt);
            });
        }

        // 9. Keyboard shortcuts
        if (DeckForge.Shortcuts) {
            DeckForge.Shortcuts.init();
        }

        // 10. Keyboard safety (Delete/Escape) and undo/redo
        document.addEventListener('keydown', (e) => {
            if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !e.shiftKey) {
                e.preventDefault(); DeckForge.History.undo();
            }
            if ((e.ctrlKey || e.metaKey) && (e.key === 'y' || (e.key === 'z' && e.shiftKey))) {
                e.preventDefault(); DeckForge.History.redo();
            }
            if (e.key === 'Delete' || e.key === 'Backspace') {
                const activeEl = document.activeElement;
                if (activeEl.tagName !== 'INPUT' && activeEl.tagName !== 'TEXTAREA') {
                    e.preventDefault(); DeckForge.Canvas.deleteActive();
                }
            }
            if (e.key === 'Escape') {
                if (canvas) {
                    canvas.discardActiveObject();
                    canvas.requestRenderAll();
                }
                DeckForge.UI?.closeAllDrawers?.();
            }
        });

        // 11. Window resize handler
        window.addEventListener('resize', DeckForge.Utils.debounce(() => {
            DeckForge.UI?.resetView?.();
        }, 250));

        console.log("DeckForge Ready.");
    };

    // Auto-init on window load (single source)
    window.addEventListener('load', () => {
        if (window.DeckForge) {
            DeckForge.init();
        }
    });

})();
