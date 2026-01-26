// ========================================
// TEMPLATES (Saved Designs) - deckForge parity
// ========================================
(function() {
    'use strict';

    DeckForge.Templates = {
        init: function() {
            this.loadList();
        },

        openSaveModal: function() {
            const modal = DeckForge.Utils.getElement('save-modal');
            if (modal) {
                modal.classList.remove('hidden');
                setTimeout(() => DeckForge.Utils.getElement('template-name-input')?.focus(), 50);
            }
        },

        confirmSave: async function() {
            const nameInput = DeckForge.Utils.getElement('template-name-input');
            const name = nameInput ? nameInput.value.trim() : '';
            if (!name) {
                alert('Please enter a name for your design.');
                return;
            }

            // Compress numbers a bit (keep 2 decimals)
            const json = DeckForge.canvas.toJSON(DeckForge.SAVE_PROPS);
            const optimizedString = JSON.stringify(json).replace(/(\d+\.\d{2})\d+/g, '$1');
            const optimizedData = JSON.parse(optimizedString);

            try {
                const saved = await localforage.getItem('deckforge_templates');
                const templates = saved ? saved : [];
                templates.push({ name, data: optimizedData });
                await localforage.setItem('deckforge_templates', templates);

                const modal = DeckForge.Utils.getElement('save-modal');
                if (modal) modal.classList.add('hidden');
                if (nameInput) nameInput.value = '';
                this.loadList();
            } catch (e) {
                console.error(e);
                alert("Error saving. The database might be full or corrupted.");
            }
        },

        loadList: async function() {
            const list = DeckForge.Utils.getElement('template-list');
            if (!list) return;

            list.innerHTML = '<div class="text-xs text-gray-400 p-2">Loading...</div>';

            try {
                const saved = await localforage.getItem('deckforge_templates');
                list.innerHTML = ''; // Clear loading message

                if (saved && saved.length > 0) {
                    saved.forEach((template, index) => {
                        const div = document.createElement('div');
                        div.className = "flex justify-between items-center p-2 bg-gray-50 border rounded group hover:border-blue-200 transition";
                        
                        div.innerHTML = `
                            <span class="text-xs truncate w-24 font-medium text-gray-600">${template.name}</span>
                            <div class="flex gap-2">
                                <button class="load-btn text-[10px] text-blue-600 font-bold bg-blue-50 px-2 py-1 rounded hover:bg-blue-100">LOAD</button>
                                <button class="delete-btn text-gray-300 hover:text-red-500 transition"><i class="ph-bold ph-trash"></i></button>
                            </div>
                        `;
                        
                        div.querySelector('.load-btn').onclick = () => this.load(index);
                        div.querySelector('.delete-btn').onclick = () => this.delete(index);
                        
                        list.appendChild(div);
                    });
                } else {
                    list.innerHTML = '<div class="text-[10px] text-gray-400 p-2">No saved designs found.</div>';
                }
            } catch (e) {
                console.error('Error loading template list:', e);
            }
        },

        load: async function(index) {
            try {
                const saved = await localforage.getItem('deckforge_templates');
                if (!saved || !saved[index]) return;

                if (confirm(`Load '${saved[index].name}'? Unsaved changes will be lost.`)) {
                    DeckForge.canvas.loadFromJSON(saved[index].data, () => {
                        DeckForge.Theme.updateCanvasColors();
                        DeckForge.canvas.requestRenderAll();
                        DeckForge.History.save();
                        DeckForge.UI.closeAllDrawers();
                    });
                }
            } catch (e) {
                console.error('Error loading template:', e);
            }
        },

        delete: async function(index) {
            if (confirm("Permanently delete this saved design?")) {
                try {
                    const saved = await localforage.getItem('deckforge_templates');
                    if (saved) {
                        saved.splice(index, 1);
                        await localforage.setItem('deckforge_templates', saved);
                        this.loadList();
                    }
                } catch (e) {
                    console.error('Error deleting template:', e);
                }
            }
        }
    };
})();
