// ========================================
// TEXT & TYPOGRAPHY
// ========================================

(function() {
    'use strict';

    DeckForge.Text = {
        init: function() {
            this.renderFontList();
            this.setupInputListeners();
            
            // Live update text from textarea
            const input = DeckForge.Utils.getElement('text-input');
            if (input) {
                input.addEventListener('input', (e) => {
                    const obj = DeckForge.canvas.getActiveObject();
                    if (obj && obj.type === 'i-text') {
                        obj.set('text', e.target.value);
                        DeckForge.canvas.requestRenderAll();
                        DeckForge.History.debouncedSave();
                        if (DeckForge.Layers && DeckForge.Layers.isOpen) DeckForge.Layers.render();
                    }
                });
            }
        },

        setupInputListeners: function() {
            const bindInput = (id, callback) => {
                const el = DeckForge.Utils.getElement(id);
                if (el) el.addEventListener('input', callback);
            };

            // Line Height
            bindInput('inp-line-height', (e) => {
                const val = parseFloat(e.target.value);
                this.setProp('lineHeight', val);
                DeckForge.Utils.setText('lbl-line-height', val.toFixed(1));
            });

            // Letter Spacing
            bindInput('inp-letter-spacing', (e) => {
                const val = parseInt(e.target.value);
                this.setProp('charSpacing', val);
                DeckForge.Utils.setText('lbl-letter-spacing', val);
            });

            // Shadow Blur
            bindInput('inp-shadow-blur', (e) => {
                this.updateShadow();
            });

            // Shadow Offset X
            bindInput('inp-shadow-x', (e) => {
                this.updateShadow();
            });

            // Shadow Offset Y
            bindInput('inp-shadow-y', (e) => {
                this.updateShadow();
            });

            // Shadow Color
            const shadowColor = DeckForge.Utils.getElement('inp-shadow-color');
            if (shadowColor) {
                shadowColor.addEventListener('change', () => this.updateShadow());
            }
        },

        updateShadow: function() {
            const obj = DeckForge.canvas.getActiveObject();
            if (!obj || obj.type !== 'i-text') return;

            const blur = parseInt(DeckForge.Utils.getElement('inp-shadow-blur')?.value || 0);
            const offsetX = parseInt(DeckForge.Utils.getElement('inp-shadow-x')?.value || 0);
            const offsetY = parseInt(DeckForge.Utils.getElement('inp-shadow-y')?.value || 0);
            const color = DeckForge.Utils.getElement('inp-shadow-color')?.value || 'rgba(0,0,0,0.5)';

            if (blur === 0 && offsetX === 0 && offsetY === 0) {
                obj.set('shadow', null);
            } else {
                obj.set('shadow', new fabric.Shadow({
                    color: color,
                    blur: blur,
                    offsetX: offsetX,
                    offsetY: offsetY
                }));
            }

            DeckForge.canvas.requestRenderAll();
            DeckForge.History.debouncedSave();
        },

        clearShadow: function() {
            const obj = DeckForge.canvas.getActiveObject();
            if (!obj || obj.type !== 'i-text') return;

            obj.set('shadow', null);
            
            // Reset UI
            DeckForge.Utils.setInputValue('inp-shadow-blur', 0);
            DeckForge.Utils.setInputValue('inp-shadow-x', 0);
            DeckForge.Utils.setInputValue('inp-shadow-y', 0);
            
            DeckForge.canvas.requestRenderAll();
            DeckForge.History.save();
        },

        toggleBold: function() {
            const obj = DeckForge.canvas.getActiveObject();
            if (!obj || obj.type !== 'i-text') return;

            const isBold = obj.fontWeight === 'bold' || obj.fontWeight >= 700;
            obj.set('fontWeight', isBold ? 'normal' : 'bold');
            
            this.updateStyleButtons();
            DeckForge.canvas.requestRenderAll();
            DeckForge.History.save();
        },

        toggleItalic: function() {
            const obj = DeckForge.canvas.getActiveObject();
            if (!obj || obj.type !== 'i-text') return;

            const isItalic = obj.fontStyle === 'italic';
            obj.set('fontStyle', isItalic ? 'normal' : 'italic');
            
            this.updateStyleButtons();
            DeckForge.canvas.requestRenderAll();
            DeckForge.History.save();
        },

        toggleUnderline: function() {
            const obj = DeckForge.canvas.getActiveObject();
            if (!obj || obj.type !== 'i-text') return;

            obj.set('underline', !obj.underline);
            
            this.updateStyleButtons();
            DeckForge.canvas.requestRenderAll();
            DeckForge.History.save();
        },

        setTextTransform: function(transform) {
            const obj = DeckForge.canvas.getActiveObject();
            if (!obj || obj.type !== 'i-text') return;

            let text = obj.text;
            
            switch(transform) {
                case 'uppercase':
                    text = text.toUpperCase();
                    break;
                case 'lowercase':
                    text = text.toLowerCase();
                    break;
                case 'capitalize':
                    text = text.replace(/\b\w/g, char => char.toUpperCase());
                    break;
            }
            
            obj.set('text', text);
            
            // Update textarea if open
            const input = DeckForge.Utils.getElement('text-input');
            if (input) input.value = text;
            
            DeckForge.canvas.requestRenderAll();
            DeckForge.History.save();
        },

        updateStyleButtons: function() {
            const obj = DeckForge.canvas.getActiveObject();
            if (!obj || obj.type !== 'i-text') return;

            const btnBold = DeckForge.Utils.getElement('btn-bold');
            const btnItalic = DeckForge.Utils.getElement('btn-italic');
            const btnUnderline = DeckForge.Utils.getElement('btn-underline');

            const isBold = obj.fontWeight === 'bold' || obj.fontWeight >= 700;
            const isItalic = obj.fontStyle === 'italic';
            const isUnderline = obj.underline;

            if (btnBold) {
                btnBold.classList.toggle('bg-blue-100', isBold);
                btnBold.classList.toggle('text-blue-600', isBold);
            }
            if (btnItalic) {
                btnItalic.classList.toggle('bg-blue-100', isItalic);
                btnItalic.classList.toggle('text-blue-600', isItalic);
            }
            if (btnUnderline) {
                btnUnderline.classList.toggle('bg-blue-100', isUnderline);
                btnUnderline.classList.toggle('text-blue-600', isUnderline);
            }
        },

        // Called when a text object is selected - updates all typography UI
        updateTypographyUI: function(obj) {
            if (!obj || obj.type !== 'i-text') return;

            // Line Height
            DeckForge.Utils.setInputValue('inp-line-height', obj.lineHeight || 1.2);
            DeckForge.Utils.setText('lbl-line-height', (obj.lineHeight || 1.2).toFixed(1));

            // Letter Spacing
            DeckForge.Utils.setInputValue('inp-letter-spacing', obj.charSpacing || 0);
            DeckForge.Utils.setText('lbl-letter-spacing', obj.charSpacing || 0);

            // Shadow
            if (obj.shadow) {
                DeckForge.Utils.setInputValue('inp-shadow-blur', obj.shadow.blur || 0);
                DeckForge.Utils.setInputValue('inp-shadow-x', obj.shadow.offsetX || 0);
                DeckForge.Utils.setInputValue('inp-shadow-y', obj.shadow.offsetY || 0);
                const colorInput = DeckForge.Utils.getElement('inp-shadow-color');
                if (colorInput && obj.shadow.color) {
                    // Try to set the color (may not work for rgba)
                    try {
                        colorInput.value = obj.shadow.color;
                    } catch(e) {}
                }
            } else {
                DeckForge.Utils.setInputValue('inp-shadow-blur', 0);
                DeckForge.Utils.setInputValue('inp-shadow-x', 0);
                DeckForge.Utils.setInputValue('inp-shadow-y', 0);
            }

            // Style buttons
            this.updateStyleButtons();
        },

        openEditor: function() {
            const obj = DeckForge.canvas.getActiveObject();
            if (!obj || obj.type !== 'i-text') return;

            const modal = DeckForge.Utils.getElement('text-editor');
            const input = DeckForge.Utils.getElement('text-input');
            
            if (modal && input) {
                input.value = obj.text;
                input.style.fontFamily = obj.fontFamily;
                modal.classList.remove('hidden');
                setTimeout(() => input.focus(), 100);
            }
            DeckForge.UI.minimizeMenu();
        },

        closeEditor: function(save) {
            const modal = DeckForge.Utils.getElement('text-editor');
            if (modal) modal.classList.add('hidden');
            if (save) DeckForge.History.save();
            DeckForge.UI.openProperties();
        },

        toggleFontMenu: function() {
            const menu = DeckForge.Utils.getElement('font-menu');
            if (menu) menu.classList.toggle('hidden');
        },

        renderFontList: function() {
            const container = DeckForge.Utils.getElement('font-list-container');
            if (!container) return;
            
            container.innerHTML = '';
            
            // Get all fonts (custom + built-in)
            const allFonts = DeckForge.Fonts ? DeckForge.Fonts.getAllFonts() : DeckForge.FONT_OPTIONS;
            
            allFonts.forEach(font => {
                const div = document.createElement('div');
                div.className = "p-3 rounded-lg hover:bg-white hover:shadow-sm cursor-pointer border border-transparent hover:border-gray-200 transition flex items-center justify-between group";
                div.onclick = () => this.setFont(font.val);
                div.innerHTML = `
                    <span style="font-family:'${font.val}', sans-serif" class="text-lg text-gray-700">${font.name}</span>
                    <i class="ph-bold ph-check text-blue-600 opacity-0 group-hover:opacity-100 transition-opacity"></i>
                `;
                container.appendChild(div);
            });
        },

        setFont: function(fontName) {
            const obj = DeckForge.canvas.getActiveObject();
            if (obj && obj.type === 'i-text') {
                obj.set('fontFamily', fontName);
                DeckForge.canvas.requestRenderAll();
                
                const input = DeckForge.Utils.getElement('text-input');
                if (input) input.style.fontFamily = fontName;
                
                this.toggleFontMenu();
                DeckForge.History.save();
            }
        },

        setProp: function(prop, value) {
            const obj = DeckForge.canvas.getActiveObject();
            if (obj && obj.type === 'i-text') {
                obj.set(prop, value);
                DeckForge.canvas.requestRenderAll();
                DeckForge.History.debouncedSave();
            }
        }
    };
})();
