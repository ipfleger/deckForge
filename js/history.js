// ========================================
// HISTORY & PERSISTENCE
// ========================================

(function() {
    'use strict';

    let isLocked = false;

    DeckForge.History = {
        save: function() {
            // Prevent re-entrant saves during undo/redo or locked loads
            if (DeckForge.state.isProcessing || isLocked) return;

            // Prune redo stack on new action
            DeckForge.state.redoStack = []; 
            
            const json = JSON.stringify(DeckForge.canvas.toJSON(DeckForge.SAVE_PROPS));
            DeckForge.state.history.push(json);
            
            if (DeckForge.state.history.length > DeckForge.MAX_HISTORY_LENGTH) {
                DeckForge.state.history.shift();
            }
            
            this.updateButtons();
            
            // Auto-persist to session storage (crash recovery)
            localStorage.setItem('deckforge_autosave', json);
        },

        debouncedSave: null, // Initialized in init

        undo: function() {
            if (DeckForge.state.history.length <= 1) return;
            
            isLocked = true;
            DeckForge.state.isProcessing = true;

            const current = DeckForge.state.history.pop();
            DeckForge.state.redoStack.push(current);
            
            const prev = DeckForge.state.history[DeckForge.state.history.length - 1];
            this.loadState(prev);
        },

        redo: function() {
            if (DeckForge.state.redoStack.length === 0) return;
            
            isLocked = true;
            DeckForge.state.isProcessing = true;

            const next = DeckForge.state.redoStack.pop();
            DeckForge.state.history.push(next);
            
            this.loadState(next);
        },

        loadState: function(jsonStr) {
            DeckForge.state.isProcessing = true;

            DeckForge.canvas.loadFromJSON(JSON.parse(jsonStr), () => {
                DeckForge.canvas.requestRenderAll();
                isLocked = false;
                DeckForge.state.isProcessing = false;
                this.updateButtons();
                // Ensure UI is synced
                if (DeckForge.Layers && DeckForge.Layers.isOpen) DeckForge.Layers.render();
            });
        },

        updateButtons: function() {
            const btnUndo = DeckForge.Utils.getElement('btn-undo');
            const btnRedo = DeckForge.Utils.getElement('btn-redo');
            
            if (btnUndo) btnUndo.disabled = DeckForge.state.history.length <= 1;
            if (btnRedo) btnRedo.disabled = DeckForge.state.redoStack.length === 0;
            
            if (btnUndo) btnUndo.style.opacity = btnUndo.disabled ? 0.3 : 1;
            if (btnRedo) btnRedo.style.opacity = btnRedo.disabled ? 0.3 : 1;
        }
    };

    // Initialize debounce
    DeckForge.History.debouncedSave = DeckForge.Utils.debounce(() => {
        DeckForge.History.save();
    }, 500);

})();
