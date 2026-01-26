// ========================================
// TEXT & TYPOGRAPHY
// ========================================

(function() {
    'use strict';

    DeckForge.Text = {
        init: function() {
            this.renderFontList();
            
            // Live update text from textarea
            const input = DeckForge.Utils.getElement('text-input');
            if (input) {
                input.addEventListener('input', (e) => {
                    const obj = DeckForge.canvas.getActiveObject();
                    if (obj && obj.type === 'i-text') {
                        obj.set('text', e.target.value);
                        DeckForge.canvas.requestRenderAll();
                        DeckForge.History.debouncedSave();
                        // Update layer label if layer drawer is open
                        if (DeckForge.Layers && DeckForge.Layers.isOpen) DeckForge.Layers.render();
                    }
                });
            }
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
            DeckForge.UI.minimizeMenu(); // Hide bottom bar
        },

        closeEditor: function(save) {
            const modal = DeckForge.Utils.getElement('text-editor');
            if (modal) modal.classList.add('hidden');
            if (save) DeckForge.History.save();
            DeckForge.UI.openProperties(); // Bring back bottom bar
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
                
                // Update textarea preview
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
                DeckForge.History.save();
            }
        }
    };
})();
