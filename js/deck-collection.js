// ========================================
// DECK COLLECTION & ROULETTE (with backs)
// ========================================
(function() {
    'use strict';

    DeckForge.DeckCollection = {
        decks: [],
        activeDeckIdx: -1,
        rouletteCardIdx: 0,
        rCanvas: null,
        rBackCanvas: null,

        init: async function() {
            try {
                const saved = await localforage.getItem('deckforge_decks');
                if (saved) {
                    this.decks = saved;
                } else {
                    this.decks = [{ name: 'Starter Deck', cards: [], back: null }];
                }
                this.renderUI();
            } catch (e) {
                console.error('Error loading decks:', e);
                this.decks = [{ name: 'Starter Deck', cards: [], back: null }];
                this.renderUI();
            }
        },

        save: async function() {
            try {
                await localforage.setItem('deckforge_decks', this.decks);
                this.renderUI();
            } catch (e) {
                alert("Error saving deck data. Database might be full.");
            }
        },

        renderUI: function() {
            const container = DeckForge.Utils.getElement('deck-list-ui');
            const selector = DeckForge.Utils.getElement('deck-selector');
            
            if (!container || !selector) return;

            container.innerHTML = '';
            selector.innerHTML = '';

            this.decks.forEach((deck, idx) => {
                const div = document.createElement('div');
                div.className = "flex flex-col p-3 bg-white border border-gray-200 rounded-xl shadow-sm hover:border-purple-300 transition group mb-2";
                
                div.innerHTML = `
                    <div class="flex justify-between items-center mb-2">
                        <div class="flex items-center gap-3 cursor-pointer deck-open-btn">
                            <div class="w-8 h-8 rounded bg-purple-100 text-purple-600 flex itemscenter justify-center font-bold text-xs">${deck.cards.length}</div>
                            <span class="text-xs font-bold text-gray-700 group-hover:text-purple-700">${deck.name}</span>
                        </div>
                        
                        <div class="flex gap-1">
                            <button class="deck-export-btn w-8 h-8 flex items-center justify-center rounded-full hover:bg-blue-50 text-gray-400 hover:text-blue-600 transition" title="Export Deck">
                                <i class="ph-bold ph-export"></i>
                            </button>
                            <button class="deck-delete-btn w-8 h-8 flex items-center justify-center rounded-full hover:bg-red-50 text-gray-400 hover:text-red-500 transition" title="Delete Deck">
                                <i class="ph-bold ph-trash"></i>
                            </button>
                        </div>
                    </div>
                    <div class="flex gap-2 mb-2 overflow-x-auto no-scrollbar pb-1">
                        ${deck.cards.slice(-5).map(c => 
                            `<img src="${c.thumb || ''}" class="w-8 h-10 rounded border border-gray-100 object-cover bg-gray-50">`
                        ).join('')}
                    </div>
                    <div class="flex gap-2">
                        <button class="deck-back-btn flex-1 py-1.5 bg-gray-50 text-[10px] font-bold text-gray-500 hover:bg-gray-100 rounded uppercase border border-gray-200 transition">
                            ${deck.back ? '<i class="ph-fill ph-check-circle text-green-500"></i> Back Set' : 'Set Active as Back'}
                        </button>
                    </div>
                `;
                
                div.querySelector('.deck-open-btn').onclick = () => this.openRoulette(idx);
                div.querySelector('.deck-delete-btn').onclick = () => this.deleteDeck(idx);
                div.querySelector('.deck-back-btn').onclick = () => this.setBack(idx);
                div.querySelector('.deck-export-btn').onclick = (e) => {
                    e.stopPropagation();
                    DeckForge.Export.open(idx);
                };
                
                container.appendChild(div);

                const opt = document.createElement('option');
                opt.value = idx;
                opt.innerText = deck.name;
                selector.appendChild(opt);
            });
        },

        createDeck: function() {
            const name = prompt("Deck Name:", "New Deck " + (this.decks.length + 1));
            if (name) {
                this.decks.push({ name: name, cards: [], back: null });
                this.save();
            }
        },

        deleteDeck: function(idx) {
            if (confirm("Delete this entire deck?")) {
                this.decks.splice(idx, 1);
                this.save();
            }
        },

        addActiveToDeck: function() {
            const selector = DeckForge.Utils.getElement('deck-selector');
            if (!selector) return;

            const idx = parseInt(selector.value);
            if (this.decks[idx]) {
                const rawJSON = DeckForge.canvas.toJSON(DeckForge.SAVE_PROPS);
                const optimized = JSON.parse(
                    JSON.stringify(rawJSON).replace(/(\d+\.\d{2})\d+/g, '$1')
                );

                const thumb = DeckForge.canvas.toDataURL({ format: 'png', multiplier: 0.2 });
                this.decks[idx].cards.push({ json: optimized, thumb });
                this.save();

                const btn = document.querySelector('button[onclick="DeckForge.DeckCollection.addActiveToDeck()"]');
                if (btn) {
                    const oldText = btn.innerText;
                    btn.innerText = "SAVED!";
                    btn.classList.add('bg-green-600', 'text-white');
                    setTimeout(() => {
                        btn.innerText = oldText;
                        btn.classList.remove('bg-green-600', 'text-white');
                    }, 1000);
                }
            }
        },

        setBack: function(deckIdx) {
            if (confirm("Set current canvas as deck back?")) {
                const rawJSON = DeckForge.canvas.toJSON(DeckForge.SAVE_PROPS);
                const optimized = JSON.parse(
                    JSON.stringify(rawJSON).replace(/(\d+\.\d{2})\d+/g, '$1')
                );
                this.decks[deckIdx].back = optimized;
                this.save();
            }
        },

        // ================= Roulette Viewer =================

        openRoulette: function(deckIdx) {
            this.activeDeckIdx = deckIdx;
            this.rouletteCardIdx = 0;

            const cardInner = DeckForge.Utils.getElement('card-inner');
            if (cardInner) cardInner.classList.remove('flipped');

            const el = DeckForge.Utils.getElement('deck-roulette');
            if (el) {
                el.classList.remove('hidden');
                el.setAttribute('aria-hidden', 'false');
                setTimeout(() => el.classList.remove('opacity-0'), 10);
            }

            DeckForge.Utils.setText('roulette-title', this.decks[deckIdx].name);

            if (!this.rCanvas) {
                this.rCanvas = new fabric.Canvas('roulette-canvas', {
                    width: DeckForge.CARD_WIDTH,
                    height: DeckForge.CARD_HEIGHT,
                    backgroundColor: '#fff',
                    selection: false
                });
                const elC = DeckForge.Utils.getElement('roulette-canvas');
                if (elC) { elC.style.width = '100%'; elC.style.height = '100%'; }
            }

            if (!this.rBackCanvas) {
                this.rBackCanvas = new fabric.Canvas('roulette-back-canvas', {
                    width: DeckForge.CARD_WIDTH,
                    height: DeckForge.CARD_HEIGHT,
                    backgroundColor: '#111',
                    selection: false
                });
                const elB = DeckForge.Utils.getElement('roulette-back-canvas');
                if (elB) { elB.style.width = '100%'; elB.style.height = '100%'; }
            }

            this.showCard(0);
            const deck = this.decks[deckIdx];
            if (deck.back) {
                this.rBackCanvas.loadFromJSON(deck.back, () => {
                    this.rBackCanvas.getObjects().forEach(obj => {
                        obj.set({ selectable: false, evented: false });
                    });
                    this.rBackCanvas.requestRenderAll();
                    const noBackMsg = DeckForge.Utils.getElement('no-back-msg');
                    if (noBackMsg) noBackMsg.classList.add('hidden');
                });
            } else {
                this.rBackCanvas.clear();
                this.rBackCanvas.setBackgroundColor('#1f2937', this.rBackCanvas.renderAll.bind(this.rBackCanvas));
                const noBackMsg = DeckForge.Utils.getElement('no-back-msg');
                if (noBackMsg) noBackMsg.classList.remove('hidden');
            }
        },

        closeRoulette: function() {
            const el = DeckForge.Utils.getElement('deck-roulette');
            if (el) {
                el.classList.add('opacity-0');
                el.setAttribute('aria-hidden', 'true');
                setTimeout(() => el.classList.add('hidden'), 300);
            }
        },

        toggleFlip: function() {
            const cardInner = DeckForge.Utils.getElement('card-inner');
            if (!cardInner) return;
            cardInner.classList.toggle('flipped');
        },

        nav: function(dir) {
            const deck = this.decks[this.activeDeckIdx];
            if (!deck || deck.cards.length === 0) return;

            let next = this.rouletteCardIdx + dir;
            if (next >= deck.cards.length) next = 0;
            if (next < 0) next = deck.cards.length - 1;

            this.rouletteCardIdx = next;

            const cardInner = DeckForge.Utils.getElement('card-inner');
            if (cardInner) cardInner.classList.remove('flipped');

            setTimeout(() => this.showCard(next), 200);
        },

        showCard: function(idx) {
            const deck = this.decks[this.activeDeckIdx];
            const card = deck.cards[idx];
            DeckForge.Utils.setText('roulette-idx', idx + 1);
            DeckForge.Utils.setText('roulette-total', deck.cards.length);

            this.rCanvas.loadFromJSON(card.json, () => {
                this.rCanvas.getObjects().forEach(obj => {
                    obj.set({ selectable: false, evented: false });
                });
                this.rCanvas.requestRenderAll();
            });
        },

        loadCurrent: function() {
            if (confirm("Edit this card?")) {
                const deck = this.decks[this.activeDeckIdx];
                const data = deck.cards[this.rouletteCardIdx];
                DeckForge.canvas.loadFromJSON(data.json, () => {
                    DeckForge.Theme.updateCanvasColors();
                    DeckForge.canvas.requestRenderAll();
                    DeckForge.History.save();
                    this.closeRoulette();
                });
            }
        },

        deleteCurrent: function() {
            if (confirm("Remove this card from the deck?")) {
                const deck = this.decks[this.activeDeckIdx];
                deck.cards.splice(this.rouletteCardIdx, 1);
                this.save();
                if (deck.cards.length === 0) {
                    this.closeRoulette();
                } else {
                    this.nav(0);
                }
            }
        }
    };
})();
