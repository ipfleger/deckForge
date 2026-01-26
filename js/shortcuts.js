// ========================================
// KEYBOARD SHORTCUTS
// ========================================

(function() {
    'use strict';

    window.addEventListener('keydown', (e) => {
        // Ignore if typing in an input
        if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;

        if (e.key === 'Delete' || e.key === 'Backspace') {
            DeckForge.Canvas.deleteActive();
        }

        if ((e.ctrlKey || e.metaKey) && e.key === 'z') {
            e.preventDefault();
            DeckForge.History.undo();
        }

        if ((e.ctrlKey || e.metaKey) && (e.key === 'y' || (e.shiftKey && e.key === 'Z'))) {
            e.preventDefault();
            DeckForge.History.redo();
        }

        if (e.key === 'Escape') {
            DeckForge.UI.closeAllDrawers();
            DeckForge.canvas.discardActiveObject();
            DeckForge.canvas.requestRenderAll();
        }
        
        // Nudge controls
        const active = DeckForge.canvas.getActiveObject();
        if (active && !active.locked) {
            const step = e.shiftKey ? 10 : 1;
            if (e.key === 'ArrowUp') { active.top -= step; active.setCoords(); DeckForge.canvas.requestRenderAll(); e.preventDefault(); }
            if (e.key === 'ArrowDown') { active.top += step; active.setCoords(); DeckForge.canvas.requestRenderAll(); e.preventDefault(); }
            if (e.key === 'ArrowLeft') { active.left -= step; active.setCoords(); DeckForge.canvas.requestRenderAll(); e.preventDefault(); }
            if (e.key === 'ArrowRight') { active.left += step; active.setCoords(); DeckForge.canvas.requestRenderAll(); e.preventDefault(); }
        }
    });

})();
