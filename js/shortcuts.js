// ========================================
// CENTRALIZED KEYBOARD SHORTCUTS (Adobe-style)
// ========================================

(function() {
    'use strict';

    DeckForge.Shortcuts = {
        // Command registry - single source of truth
        commands: {
            'delete': () => DeckForge.Canvas.deleteActive(),
            'undo': () => DeckForge.History.undo(),
            'redo': () => DeckForge.History.redo(),
            'escape': () => {
                DeckForge.UI.closeAllDrawers();
                DeckForge.canvas?.discardActiveObject();
                DeckForge.canvas?.requestRenderAll();
            },
            'copy': () => DeckForge.Clipboard.copy(),
            'paste': () => DeckForge.Clipboard.paste(),
            'duplicate': () => DeckForge.Clipboard.duplicate(),
            'nudge-up': (shift) => DeckForge.Shortcuts.nudge('up', shift),
            'nudge-down': (shift) => DeckForge.Shortcuts.nudge('down', shift),
            'nudge-left': (shift) => DeckForge.Shortcuts.nudge('left', shift),
            'nudge-right': (shift) => DeckForge.Shortcuts.nudge('right', shift),
        },

        // Check if user is typing in an input field
        isTyping: function() {
            const el = document.activeElement;
            const tag = el?.tagName;
            return tag === 'INPUT' || tag === 'TEXTAREA' || el?.isContentEditable;
        },

        // Check if a text object is being edited on canvas
        isEditingText: function() {
            const active = DeckForge.canvas?.getActiveObject();
            return active?.isEditing === true;
        },

        // Nudge helper
        nudge: function(direction, shift) {
            const active = DeckForge.canvas?.getActiveObject();
            if (!active || active.locked) return;

            const step = shift ? 10 : 1;
            switch (direction) {
                case 'up': active.top -= step; break;
                case 'down': active.top += step; break;
                case 'left': active.left -= step; break;
                case 'right': active.left += step; break;
            }
            active.setCoords();
            DeckForge.canvas.requestRenderAll();
        },

        // Main keyboard handler
        handleKeyDown: function(e) {
            const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
            const modifier = isMac ? e.metaKey : e.ctrlKey;
            const isTyping = this.isTyping();
            const isEditingText = this.isEditingText();

            // Allow normal typing in inputs and text objects
            if (isTyping || isEditingText) {
                // Only intercept global shortcuts even when typing
                if (modifier && e.key === 'z' && !e.shiftKey) {
                    e.preventDefault();
                    this.commands['undo']();
                    return;
                }
                if (modifier && (e.key === 'y' || (e.shiftKey && e.key === 'z'))) {
                    e.preventDefault();
                    this.commands['redo']();
                    return;
                }
                // Let all other keys pass through for typing
                return;
            }

            // --- Canvas-focused shortcuts ---

            // Delete / Backspace
            if (e.key === 'Delete' || e.key === 'Backspace') {
                e.preventDefault();
                this.commands['delete']();
                return;
            }

            // Escape
            if (e.key === 'Escape') {
                this.commands['escape']();
                return;
            }

            // Undo: Ctrl/Cmd + Z
            if (modifier && e.key === 'z' && !e.shiftKey) {
                e.preventDefault();
                this.commands['undo']();
                return;
            }

            // Redo: Ctrl/Cmd + Y or Ctrl/Cmd + Shift + Z
            if (modifier && (e.key === 'y' || (e.shiftKey && e.key === 'z'))) {
                e.preventDefault();
                this.commands['redo']();
                return;
            }

            // Copy: Ctrl/Cmd + C
            if (modifier && e.key === 'c') {
                e.preventDefault();
                this.commands['copy']();
                return;
            }

            // Paste: Ctrl/Cmd + V
            if (modifier && e.key === 'v') {
                e.preventDefault();
                this.commands['paste']();
                return;
            }

            // Duplicate: Ctrl/Cmd + D
            if (modifier && e.key === 'd') {
                e.preventDefault();
                this.commands['duplicate']();
                return;
            }

            // Arrow key nudging
            if (e.key === 'ArrowUp') { e.preventDefault(); this.commands['nudge-up'](e.shiftKey); return; }
            if (e.key === 'ArrowDown') { e.preventDefault(); this.commands['nudge-down'](e.shiftKey); return; }
            if (e.key === 'ArrowLeft') { e.preventDefault(); this.commands['nudge-left'](e.shiftKey); return; }
            if (e.key === 'ArrowRight') { e.preventDefault(); this.commands['nudge-right'](e.shiftKey); return; }
        },

        init: function() {
            // Single listener - the ONLY keydown handler in the app
            document.addEventListener('keydown', (e) => this.handleKeyDown(e));
        }
    };

})();
