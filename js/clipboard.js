// ========================================
// CLIPBOARD (Copy/Paste for Mobile & Desktop)
// ========================================

(function() {
    'use strict';

    DeckForge.Clipboard = {
        _copied: null,

        copy: function() {
            const obj = DeckForge.canvas.getActiveObject();
            if (!obj) {
                this.showToast('Nothing selected');
                return;
            }

            obj.clone((cloned) => {
                this._copied = cloned;
                this.showToast('Copied!');
            });
        },

        paste: function() {
            if (!this._copied) {
                this.showToast('Nothing to paste');
                return;
            }

            this._copied.clone((cloned) => {
                DeckForge.canvas.discardActiveObject();

                // Offset so it's not directly on top
                cloned.set({
                    left: cloned.left + 30,
                    top: cloned.top + 30,
                    evented: true
                });

                if (cloned.type === 'activeSelection') {
                    // Handle multiple objects
                    cloned.canvas = DeckForge.canvas;
                    cloned.forEachObject((obj) => {
                        DeckForge.canvas.add(obj);
                    });
                    cloned.setCoords();
                } else {
                    DeckForge.canvas.add(cloned);
                }

                // Update the stored copy for subsequent pastes (with new offset)
                this._copied.set({
                    left: this._copied.left + 30,
                    top: this._copied.top + 30
                });

                DeckForge.canvas.setActiveObject(cloned);
                DeckForge.canvas.requestRenderAll();
                DeckForge.History.save();
                this.showToast('Pasted!');
            });
        },

        duplicate: function() {
            const obj = DeckForge.canvas.getActiveObject();
            if (!obj) {
                this.showToast('Nothing selected');
                return;
            }

            obj.clone((cloned) => {
                cloned.set({
                    left: obj.left + 30,
                    top: obj.top + 30,
                    evented: true
                });

                if (cloned.type === 'activeSelection') {
                    cloned.canvas = DeckForge.canvas;
                    cloned.forEachObject((o) => {
                        DeckForge.canvas.add(o);
                    });
                    cloned.setCoords();
                } else {
                    DeckForge.canvas.add(cloned);
                }

                DeckForge.canvas.setActiveObject(cloned);
                DeckForge.canvas.requestRenderAll();
                DeckForge.History.save();
                this.showToast('Duplicated!');
            });
        },

        showToast: function(message) {
            let toast = document.getElementById('clipboard-toast');
            
            if (!toast) {
                toast = document.createElement('div');
                toast.id = 'clipboard-toast';
                toast.className = 'fixed top-20 left-1/2 -translate-x-1/2 bg-gray-900 text-white px-4 py-2 rounded-full text-xs font-bold z-[100] opacity-0 transition-opacity duration-200 pointer-events-none';
                document.body.appendChild(toast);
            }

            toast.textContent = message;
            toast.classList.remove('opacity-0');
            toast.classList.add('opacity-100');

            setTimeout(() => {
                toast.classList.remove('opacity-100');
                toast.classList.add('opacity-0');
            }, 1200);
        },

        // Keyboard shortcuts for desktop
        initKeyboardShortcuts: function() {
            document.addEventListener('keydown', (e) => {
                // Ignore if typing in an input
                if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;

                const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
                const modifier = isMac ? e.metaKey : e.ctrlKey;

                if (modifier && e.key === 'c') {
                    e.preventDefault();
                    this.copy();
                } else if (modifier && e.key === 'v') {
                    e.preventDefault();
                    this.paste();
                } else if (modifier && e.key === 'd') {
                    e.preventDefault();
                    this.duplicate();
                }
            });
        },

        init: function() {
            this.initKeyboardShortcuts();
        }
    };
})();
