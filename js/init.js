// ========================================
// INITIALIZATION BOOTSTRAP
// ========================================

(function() {
    'use strict';

    DeckForge.init = function() {
        console.log("DeckForge Initializing...");

        // 1. Init Canvas (Model) - CRITICAL: MUST BE FIRST
        if (DeckForge.Canvas) {
            DeckForge.Canvas.init();  // <-- FIXED: was ".()"
        } else {
            console.error("DeckForge.Canvas module is missing!");
            return;
        }

        // 2. Init UI (Controller)
        if (DeckForge.UI) {
            DeckForge.UI.init();
        }

        // 3. Init Assets Manager
        if (DeckForge.Assets && typeof DeckForge.Assets.init === 'function') {
            DeckForge.Assets.init();
        }

        // 4. Init Specific Tools & Helpers
        if (DeckForge.Text) DeckForge.Text.init();
        if (DeckForge.GenUI) DeckForge.GenUI.init();
        if (DeckForge.Templates) DeckForge.Templates.init();
        if (DeckForge.DeckData) DeckForge.DeckData.init();
        if (DeckForge.Fonts) DeckForge.Fonts.init();
        if (DeckForge.Clipboard) DeckForge.Clipboard.init();
        
        // 5. Init Theme Engine (Color System)
        if (DeckForge.Theme) {
            DeckForge.Theme.initColorEngine();
            DeckForge.Theme.loadCustomPalettes();
            DeckForge.Theme.renderSettingsUI();
        }
        
        // 6. Initial Viewport Setup (The Fix)
        if (DeckForge.UI) {
            // Run immediately
            DeckForge.UI.resetView();

            // Run again after 500ms to correct for mobile address bar shifting
            setTimeout(() => {
                DeckForge.UI.resetView();
            }, 500);
        }

        console.log("DeckForge Ready.");
    };

    // Auto-init on window load
    window.addEventListener('load', () => {
        if (window.DeckForge) {
            DeckForge.init();
        }
    });

})();
