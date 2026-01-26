// ========================================
// DECK DATA (Variables → live preview cycling)
// ========================================
(function() {
    'use strict';

    const STORAGE_KEY = 'deckforge_variables';

    DeckForge.DeckData = {
        variables: {},          // { varName: [values] }
        count: 0,               // longest variable list
        currentIndex: 0,
        originalTexts: new Map(), // Map<fabric.IText, originalText>

        init: async function() {
            try {
                const saved = await localforage.getItem(STORAGE_KEY);
                if (saved) {
                    this.variables = saved.variables || {};
                    this.count = saved.count || 0;
                }
                this.renderVariableList();
                
                // Show deck nav if we have multi values
                if (this.count > 1) {
                    const nav = DeckForge.Utils.getElement('deck-nav');
                    const btn = DeckForge.Utils.getElement('btn-init-deck');
                    const ctrls = DeckForge.Utils.getElement('deck-controls');
                    if (nav) nav.classList.remove('hidden');
                    if (btn) btn.classList.remove('hidden');
                    if (ctrls) ctrls.classList.add('hidden');
                    DeckForge.Utils.setText('deck-total', this.count);
                }
            } catch (e) {
                console.error('Error loading variables:', e);
                this.renderVariableList();
            }
        },

        save: async function() {
            try {
                await localforage.setItem(STORAGE_KEY, {
                    variables: this.variables,
                    count: this.count
                });
            } catch (e) {
                console.error('Error saving variables:', e);
            }
        },

        // Add or update a variable list. Accepts ranges "1-10" or comma lists.
        setVariable: function(key, valueString) {
            const varName = key.trim().startsWith('.') ? key.trim().substring(1) : key.trim();
            let values = [];

            if (valueString.match(/^\d+-\d+$/)) {
                const parts = valueString.split('-');
                for (let i = parseInt(parts[0]); i <= parseInt(parts[1]); i++) values.push(i.toString());
            } else if (valueString.includes(',')) {
                values = valueString.split(',').map(s => s.trim()).filter(Boolean);
            } else {
                values = [valueString.trim()];
            }

            this.variables[varName] = values;
            this.count = Math.max(this.count, values.length);

            // Show deck nav if we have multi values
            if (this.count > 1) {
                const nav = DeckForge.Utils.getElement('deck-nav');
                const btn = DeckForge.Utils.getElement('btn-init-deck');
                const ctrls = DeckForge.Utils.getElement('deck-controls');
                if (nav) nav.classList.remove('hidden');
                if (btn) btn.classList.remove('hidden');
                if (ctrls) ctrls.classList.add('hidden');
                DeckForge.Utils.setText('deck-total', this.count);
            }

            this.renderVariableList();
            this.save(); // Persist to localforage
            return true;
        },

        enablePreview: function() {
            if (this.count === 0) return;
            const btn = DeckForge.Utils.getElement('btn-init-deck');
            const ctrls = DeckForge.Utils.getElement('deck-controls');
            if (btn) btn.classList.add('hidden');
            if (ctrls) ctrls.classList.remove('hidden');
            this.updateCanvas();
        },

        navigate: function(dir) {
            if (this.count === 0) return;
            let newIdx = this.currentIndex + dir;
            if (newIdx < 0) newIdx = this.count - 1;
            if (newIdx >= this.count) newIdx = 0;
            this.currentIndex = newIdx;
            this.updateCanvas();
        },

        updateCanvas: function() {
            const processObj = (obj) => {
                if (obj.type === 'group') {
                    obj.getObjects().forEach(child => processObj(child));
                    return;
                }
                if (obj.type === 'i-text') {
                    if (!this.originalTexts.has(obj)) {
                        this.originalTexts.set(obj, obj.text);
                    }
                    let newText = this.originalTexts.get(obj);
                    Object.keys(this.variables).forEach(key => {
                        const valList = this.variables[key];
                        const val = valList.length === 1
                            ? valList[0]
                            : (valList[this.currentIndex % valList.length] || valList[valList.length - 1]);
                        newText = newText.split('.' + key).join(val);
                    });
                    obj.set('text', newText);
                }
            };

            DeckForge.canvas.getObjects().forEach(obj => processObj(obj));
            DeckForge.canvas.requestRenderAll();
            DeckForge.Utils.setText('deck-idx', this.currentIndex + 1);
        },

        renderVariableList: function() {
            const list = DeckForge.Utils.getElement('variable-list');
            if (!list) return;

            list.innerHTML = '';
            const keys = Object.keys(this.variables);
            if (keys.length === 0) {
                list.innerHTML = '<div class="text-[10px] text-gray-400 italic p-1">No variables added yet.</div>';
                return;
            }

            keys.forEach(key => {
                const valCount = this.variables[key].length;
                const div = document.createElement('div');
                div.className = "flex justify-between items-center p-2 bg-gray-50 border rounded text-xs";
                div.setAttribute('role', 'listitem');
                div.innerHTML = `
                    <div class="flex items-center gap-2">
                        <span class="font-bold text-blue-600">.${key}</span>
                    </div>
                    <span class="text-gray-400 font-mono text-[10px]">${valCount} items</span>
                `;
                list.appendChild(div);
            });
        },

        openVariableModal: function() {
            const modal = DeckForge.Utils.getElement('variable-modal');
            const nameInput = DeckForge.Utils.getElement('var-name');
            if (modal) modal.classList.remove('hidden');
            if (nameInput) nameInput.focus();
        },

        confirmAddVariable: function() {
            const nameInput = DeckForge.Utils.getElement('var-name');
            const valuesInput = DeckForge.Utils.getElement('var-values');
            const modal = DeckForge.Utils.getElement('variable-modal');

            if (!nameInput || !valuesInput) return;
            const name = nameInput.value.trim();
            const values = valuesInput.value.trim();

            if (name && values) {
                this.setVariable(name, values);
                nameInput.value = '';
                valuesInput.value = '';
            }
            if (modal) modal.classList.add('hidden');
        }
    };
})();
