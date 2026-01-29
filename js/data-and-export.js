// ========================================
  // TEMPLATES MODULE (UPDATED FOR INDEXEDDB)
// ========================================
  
  const Templates = {
    openSaveModal: function() {
      const modal = Utils.getElement('save-modal');
      if (modal) modal.classList.remove('hidden');
    },
    
    confirmSave: async function() {
      const nameInput = Utils.getElement('template-name-input');
      const name = nameInput ? nameInput.value : '';
      
      if (!name) {
        alert('Please enter a name for your design.');
        return;
      }
      
      // Compress numbers to save space
      const json = canvas.toJSON(SAVE_PROPS);
      const optimizedString = JSON.stringify(json).replace(/(\d+\.\d{2})\d+/g, '$1');
      const optimizedData = JSON.parse(optimizedString);
      
      try {
        // Load existing list
        const saved = await localforage.getItem('deckforge_templates');
        const templates = saved ? saved : [];
        
        templates.push({ name: name, data: optimizedData });
        
        // Save back to Database
        await localforage.setItem('deckforge_templates', templates);
        
        const modal = Utils.getElement('save-modal');
        if (modal) modal.classList.add('hidden');
        
        this.loadList();
      } catch (e) {
        console.error(e);
        alert("Error saving. The database might be full or corrupted.");
      }
    },
    
    loadList: async function() {
      const list = Utils.getElement('template-list');
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
          canvas.loadFromJSON(saved[index].data, () => {
            Theme.updateCanvasColors();
            canvas.requestRenderAll();
            History.save();
            UI.closeAllDrawers();
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
  
  // ========================================
    // DECK DATA MODULE
  // ========================================
    
    const DeckData = {
      variables:{},
      count:0,
      currentIndex:0,
      originalTexts:new Map(),
      
      setVariable:function(key, valueString) {
        const varName = key.trim().startsWith('.') ? key.trim().substring(1) :key.trim();
        let values = [];
        
        // Parse ranges or lists
        if (valueString.match(/^\d+-\d+$/)) {
          const parts = valueString.split('-');
          for (let i = parseInt(parts[0]); i <= parseInt(parts[1]); i++) {
            values.push(i.toString());
          }
        } else if (valueString.includes(',')) {
          values = valueString.split(',').map(s => s.trim());
        } else {
          values = [valueString.trim()];
        }
        
        if (this.count === 0 && values.length > 1) {
          this.count = values.length;
          
          const nav = Utils.getElement('deck-nav');
          const btn = Utils.getElement('btn-init-deck');
          const ctrls = Utils.getElement('deck-controls');
          
          if (nav) nav.classList.remove('hidden');
          if (btn) btn.classList.remove('hidden');
          if (ctrls) ctrls.classList.add('hidden');
          
          Utils.setText('deck-total', this.count);
        }
        
        this.variables[varName] = values;
        this.renderVariableList();
        return true;
      },
      
      enablePreview:function() {
        const btn = Utils.getElement('btn-init-deck');
        const ctrls = Utils.getElement('deck-controls');
        
        if (btn) btn.classList.add('hidden');
        if (ctrls) ctrls.classList.remove('hidden');
        
        this.updateCanvas();
      },
      
      navigate:function(dir) {
        if (this.count === 0) return;
        
        let newIdx = this.currentIndex + dir;
        if (newIdx < 0) newIdx = this.count - 1;
        if (newIdx >= this.count) newIdx = 0;
        
        this.currentIndex = newIdx;
        this.updateCanvas();
      },
      
      updateCanvas:function() {
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
              :(valList[this.currentIndex] || valList[valList.length - 1]);
              newText = newText.split('.' + key).join(val);
            });
            obj.set('text', newText);
          }
        };
        
        canvas.getObjects().forEach(obj => processObj(obj));
        canvas.requestRenderAll();
        Utils.setText('deck-idx', this.currentIndex + 1);
      },
      
      openVariableModal:function() {
        const modal = Utils.getElement('variable-modal');
        const nameInput = Utils.getElement('var-name');
        
        if (modal) modal.classList.remove('hidden');
        if (nameInput) nameInput.focus();
      },
      
      confirmAddVariable:function() {
        const nameInput = Utils.getElement('var-name');
        const valuesInput = Utils.getElement('var-values');
        const modal = Utils.getElement('variable-modal');
        
        if (nameInput && valuesInput) {
          const name = nameInput.value.trim();
          const values = valuesInput.value.trim();
          
          if (name && values) {
            this.setVariable(name, values);
            nameInput.value = '';
            valuesInput.value = '';
          }
        }
        
        if (modal) modal.classList.add('hidden');
      },
      
      renderVariableList:function() {
        const list = Utils.getElement('variable-list');
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
      }
    };
    
    // ========================================
      // SVG MODULE (Patched for Smart Gradients)
    // ========================================
      
      const SVG = {
        confirmAdd: function() {
          const input = Utils.getElement('svg-input');
          const modal = Utils.getElement('svg-modal');
          
          if (!input) return;
          const code = input.value;
          if (!code) return;
          
          if (typeof chroma === 'undefined') {
            alert("Chroma.js is missing!");
            return;
          }
          
          try {
            fabric.loadSVGFromString(code, (objects, options) => {
              if (!objects || objects.length === 0) {
                alert("Could not parse SVG. Please check the code.");
                return;
              }
              
              // Helper to match a color string to your palette
              const findBestRole = (colorString) => {
                if (!colorString || colorString === 'none' || colorString === 'transparent') {
                  return -99;
                }
                
                let bestRole = -99;
                let minDistance = Infinity;
                
                state.palette.forEach((themeColor, index) => {
                  try {
                    const dist = chroma.distance(colorString, themeColor);
                    // We use a looser threshold for gradients to ensure they snap
                    if (dist < minDistance) {
                      minDistance = dist;
                      bestRole = index;
                    }
                  } catch (e) { /* Ignore */ }
                });
                
                return bestRole;
              };
              
              const processSVGObject = (o) => {
                o.set('objectCaching', false);
                
                // 1. Handle FILLS
                if (o.fill) {
                  // A. Solid Colors (Existing Logic)
                  if (typeof o.fill === 'string' && o.fill !== 'none') {
                    const role = findBestRole(o.fill);
                    if (role !== -99) {
                      o.roleFill = role;
                      o.set('fill', state.palette[role]);
                    }
                  } 
                  // B. Gradients (NEW LOGIC)
                  else if (typeof o.fill === 'object' && o.fill.colorStops) {
                    // If it's a gradient, try to convert it to a "Smart Gradient"
                            const stops = o.fill.colorStops;
                            
                            // We currently only support upgrading 2-stop gradients to Smart Gradients
                            if (stops.length >= 2) {
                                const startRole = findBestRole(stops[0].color);
                                const endRole = findBestRole(stops[stops.length - 1].color);
                                
                                if (startRole !== -99 && endRole !== -99) {
                                    // SUCCESS: We found matching roles for start and end
                                    // Assign the dynamic properties
                                    o.roleGradientStart = startRole;
                                    o.roleGradientEnd = endRole;
                                    o.gradBalance = 0;
                                    
                                    // The Theme engine will now take over and render a live gradient
                                    // overriding this static one on the next update.
                                }
                            }
                            
                            // Fallback: Still update the static colors just in case
                            stops.forEach(stop => {
                                const role = findBestRole(stop.color);
                                if (role !== -99) stop.color = state.palette[role];
                            });
                        }
                    }

                    // 2. Handle STROKES
                    if (o.stroke && typeof o.stroke === 'string' && o.stroke !== 'none') {
                        const role = findBestRole(o.stroke);
                        if (role !== -99) {
                            o.roleStroke = role;
                            o.set('stroke', state.palette[role]);
                        }
                    }

                    // Recurse into groups
                    if (o.getObjects) {
                        o.getObjects().forEach(processSVGObject);
                        o.set('dirty', true);
                    }
                };

                const obj = fabric.util.groupSVGElements(objects, options);
                
                // Center the new object
                obj.set({
                    left: CARD_WIDTH / 2,
                    top: CARD_HEIGHT / 2,
                    originX: 'center',
                    originY: 'center',
                    objectCaching: false
                });

                // Scale down if huge
                if (obj.width > CARD_WIDTH * 0.8) {
                    obj.scaleToWidth(CARD_WIDTH * 0.8);
                }

                // Run the processing logic
                processSVGObject(obj);

                canvas.add(obj);
                canvas.setActiveObject(obj);
                
                // Force an immediate color update to ensure gradients render correctly
                Theme.updateCanvasColors();
                History.save();

                if (modal) modal.classList.add('hidden');
                if (input) input.value = '';
            });
        } catch (e) {
            console.error('SVG parsing error:', e);
            alert("Error parsing SVG. Please check the code.");
        }
    }
};


// ========================================
// EXPORT MODULE (SMART GRID EDITION)
// ========================================

const Export = {
    open: function(deckIndex = -1) {
        const modal = Utils.getElement('export-modal');
        const title = Utils.getElement('export-title');
        const subtitle = Utils.getElement('export-subtitle');
        
        const optsSingle = Utils.getElement('opts-single');
        const optsDeck = Utils.getElement('opts-deck');
        const settings = Utils.getElement('export-settings');

        const modeInput = Utils.getElement('export-mode');
        const targetInput = Utils.getElement('export-target-idx');

        if (!modal) return;

        if (deckIndex === -1) {
            title.innerText = "Export Card";
            subtitle.innerText = "Save current canvas.";
            optsSingle.classList.remove('hidden');
            optsDeck.classList.add('hidden');
            settings.classList.add('hidden'); 
            modeInput.value = 'single';
        } else {
            const deckName = DeckCollection.decks[deckIndex].name;
            title.innerText = "Export Deck";
            subtitle.innerText = `${deckName} (${DeckCollection.decks[deckIndex].cards.length} cards)`;
            optsSingle.classList.add('hidden');
            optsDeck.classList.remove('hidden');
            settings.classList.remove('hidden'); 
            modeInput.value = 'deck';
            targetInput.value = deckIndex;
        }
        
        modal.classList.remove('hidden');
    },

    handleExport: function() { this.open(-1); },

    process: async function(format) {
        const modal = Utils.getElement('export-modal');
        if (modal) modal.classList.add('hidden');

        const mode = Utils.getElement('export-mode').value;
        const targetIdx = parseInt(Utils.getElement('export-target-idx').value);
        const includeBleed = document.getElementById('export-bleed')?.checked;
        
        // Get Page Size Config
        const formatSelect = document.getElementById('export-format');
        const paperType = formatSelect ? formatSelect.value : 'a4';
        
        let customDim = null;
        if (paperType === 'custom') {
            customDim = [
                parseInt(document.getElementById('custom-w').value) || 210,
                parseInt(document.getElementById('custom-h').value) || 297
            ];
        }

        state.isProcessing = true;

        try {
            if (mode === 'single') {
                await this.exportSingle(format);
            } else {
                await this.exportDeck(targetIdx, format, includeBleed, paperType, customDim);
            }
        } catch (e) {
            console.error(e);
            alert("Export failed.");
        } finally {
            state.isProcessing = false;
        }
    },

    exportSingle: async function(format) {
        const fileName = `card-${Date.now()}.${format}`;
        let blob;

        if (format === 'json') {
            const json = JSON.stringify(canvas.toJSON(SAVE_PROPS), null, 2);
            blob = new Blob([json], { type: 'application/json' });
        } else if (format === 'svg') {
            const svg = canvas.toSVG();
            blob = new Blob([svg], { type: 'image/svg+xml' });
        } else {
            const dataUrl = canvas.toDataURL({
                format: format === 'jpg' ? 'jpeg' : 'png',
                multiplier: 2, 
                quality: 0.9
            });
            blob = await (await fetch(dataUrl)).blob();
        }

        const link = document.createElement('a');
        link.download = fileName;
        link.href = URL.createObjectURL(blob);
        link.click();
    },

    exportDeck: async function(deckIdx, format, includeBleed, paperType, customDim) {
        const deck = DeckCollection.decks[deckIdx];
        if (!deck || deck.cards.length === 0) {
            alert("Deck is empty.");
            return;
        }

        // 1. PDF SHEET EXPORT (Dynamic Grid)
        if (format === 'pdf-sheet') {
            if (!window.jspdf) return alert("jsPDF library missing");
            const { jsPDF } = window.jspdf;
            
            // Determine Page Dimensions (mm)
            let pW = 210, pH = 297; // Default A4
            
            if (paperType === 'custom' && customDim) {
                pW = customDim[0]; pH = customDim[1];
            } else if (paperType === 'letter') { pW = 215.9; pH = 279.4; }
            else if (paperType === 'legal') { pW = 215.9; pH = 355.6; }
            else if (paperType === 'tabloid') { pW = 279.4; pH = 431.8; }
            else if (paperType === 'a3') { pW = 297; pH = 420; }

            // Create PDF with custom size support
            const doc = new jsPDF({ 
                orientation: pW > pH ? 'l' : 'p', 
                unit: 'mm', 
                format: paperType === 'custom' ? [pW, pH] : paperType 
            });

            // Card Dimensions (Standard Poker)
            const cardW = 63.5; 
            const cardH = 88.9;
            const bleed = includeBleed ? 3 : 0;
            
            const cellW = cardW + (bleed * 2);
            const cellH = cardH + (bleed * 2);
            
            // SMART GRID CALCULATION
            // Calculate how many fit with a 10mm safety margin
            const margin = 10;
            const availW = pW - (margin * 2);
            const availH = pH - (margin * 2);
            
            const cols = Math.floor(availW / cellW);
            const rows = Math.floor(availH / cellH);
            
            if (cols < 1 || rows < 1) return alert("Page too small for cards!");

            // Center the grid
            const startX = (pW - (cols * cellW)) / 2;
            const startY = (pH - (rows * cellH)) / 2;

            let col = 0, row = 0;

            for (let i = 0; i < deck.cards.length; i++) {
                await new Promise(resolve => canvas.loadFromJSON(deck.cards[i], resolve));
                Theme.updateCanvasColors(); 
                canvas.renderAll();

                const imgData = canvas.toDataURL({ format: 'png', multiplier: 1.5 });

                if (i > 0 && i % (cols * rows) === 0) {
                    doc.addPage();
                    col = 0; row = 0;
                }

                const x = startX + (col * cellW);
                const y = startY + (row * cellH);
                doc.addImage(imgData, 'PNG', x, y, cellW, cellH);

                if (includeBleed) {
                    doc.setLineWidth(0.1);
                    doc.setDrawColor(0);
                    const mLen = 3; 
                    const cx = x + bleed;
                    const cy = y + bleed;
                    const cw = cardW;
                    const ch = cardH;

                    // Cut Marks (At the CUT line, inside the bleed)
                    // TL
                    doc.line(cx, y - mLen, cx, y); 
                    doc.line(x - mLen, cy, x, cy); 
                    // TR
                    doc.line(cx + cw, y - mLen, cx + cw, y); 
                    doc.line(x + cellW, cy, x + cellW + mLen, cy);
                    // BL
                    doc.line(cx, y + cellH, cx, y + cellH + mLen);
                    doc.line(x - mLen, cy + ch, x, cy + ch);
                    // BR
                    doc.line(cx + cw, y + cellH, cx + cw, y + cellH + mLen);
                    doc.line(x + cellW, cy + ch, x + cellW + mLen, cy + ch);
                }

                col++;
                if (col >= cols) { col = 0; row++; }
            }

            doc.save(`${deck.name.replace(/\s+/g, '_')}_${paperType}.pdf`);
        } 
        // 2. ZIP Export
        else if (format === 'zip') {
            if (!window.JSZip) return alert("JSZip missing");
            const zip = new JSZip();
            const folder = zip.folder("images");

            for (let i = 0; i < deck.cards.length; i++) {
                await new Promise(resolve => canvas.loadFromJSON(deck.cards[i], resolve));
                Theme.updateCanvasColors();
                const dataUrl = canvas.toDataURL({ format: 'png', multiplier: 2 });
                const blob = await (await fetch(dataUrl)).blob();
                folder.file(`card_${i+1}.png`, blob);
            }

            const content = await zip.generateAsync({ type: "blob" });
            const link = document.createElement('a');
            link.download = `${deck.name}_Images.zip`;
            link.href = URL.createObjectURL(content);
            link.click();
        }
        // 3. PDF Digital
        else if (format === 'pdf-single') {
             if (!window.jspdf) return alert("jsPDF library missing");
            const { jsPDF } = window.jspdf;
            const doc = new jsPDF({ orientation: 'p', unit: 'mm', format: [63.5, 88.9] });

            for (let i = 0; i < deck.cards.length; i++) {
                if (i > 0) doc.addPage();
                await new Promise(resolve => canvas.loadFromJSON(deck.cards[i], resolve));
                Theme.updateCanvasColors();
                const imgData = canvas.toDataURL({ format: 'png', multiplier: 2 });
                doc.addImage(imgData, 'PNG', 0, 0, 63.5, 88.9);
            }
            doc.save(`${deck.name}_Digital.pdf`);
        }
    }
};

// ========================================
// DECK COLLECTION MODULE (UPDATED FOR INDEXEDDB)
// ========================================

const DeckCollection = {
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
        const container = Utils.getElement('deck-list-ui');
        const selector = Utils.getElement('deck-selector');
        
        if (!container || !selector) return;

        container.innerHTML = '';
        selector.innerHTML = '';

        this.decks.forEach((deck, idx) => {
            const div = document.createElement('div');
            div.className = "flex flex-col p-3 bg-white border border-gray-200 rounded-xl shadow-sm hover:border-purple-300 transition group mb-2";
            
            div.innerHTML = `
                <div class="flex justify-between items-center mb-2">
                    <div class="flex items-center gap-3 cursor-pointer deck-open-btn">
                        <div class="w-8 h-8 rounded bg-purple-100 text-purple-600 flex items-center justify-center font-bold text-xs">${deck.cards.length}</div>
                        <span class="text-xs font-bold text-gray-700 group-hover:text-purple-700">${deck.name}</span>
                    </div>
                    
                    <div class="flex gap-1">
                        <button class="deck-export-btn w-8 h-8 flex items-center justify-center rounded-full hover:bg-blue-50 text-gray-400 hover:text-blue-600 transition" title="Export ...">
                            <i class="ph-bold ph-export"></i>
                        </button>
                        <button class="deck-delete-btn w-8 h-8 flex items-center justify-center rounded-full hover:bg-red-50 text-gray-400 hover:text-red-500 transition" title="Delete De...">
                            <i class="ph-bold ph-trash"></i>
                        </button>
                    </div>
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
            
            // Hook up the new Export button
            div.querySelector('.deck-export-btn').onclick = (e) => {
                e.stopPropagation();
                // Trigger Export Module in 'deck' mode
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
        const selector = Utils.getElement('deck-selector');
        if (!selector) return;

        const idx = parseInt(selector.value);
        if (this.decks[idx]) {
            const rawJSON = canvas.toJSON(SAVE_PROPS);
            const optimized = JSON.parse(
                JSON.stringify(rawJSON).replace(/(\d+\.\d{2})\d+/g, '$1')
            );

            this.decks[idx].cards.push(optimized);
            this.save();

            const btn = document.querySelector('button[onclick="DeckForge.DeckCollection.addActiveToDeck()"]');
            if (btn) {
                const oldText = btn.innerText;
                btn.innerText = "SAVED!";
                btn.classList.add('bg-green-600');
                setTimeout(() => {
                    btn.innerText = oldText;
                    btn.classList.remove('bg-green-600');
                }, 1000);
            }
        }
    },

    setBack: function(deckIdx) {
        if (confirm("Set current canvas as deck back?")) {
            this.decks[deckIdx].back = canvas.toJSON(SAVE_PROPS);
            this.save();
        }
    },

    openRoulette: function(deckIdx) {
        if (this.decks[deckIdx].cards.length === 0) {
            alert("Deck is empty.");
            return;
        }

        this.activeDeckIdx = deckIdx;
        this.rouletteCardIdx = 0;
        
        const cardInner = Utils.getElement('card-inner');
        if (cardInner) cardInner.classList.remove('flipped');

        const el = Utils.getElement('deck-roulette');
        if (el) {
            el.classList.remove('hidden');
            el.setAttribute('aria-hidden', 'false');
            setTimeout(() => el.classList.remove('opacity-0'), 10);
        }

        Utils.setText('roulette-title', this.decks[deckIdx].name);

        // Initialize canvases
        if (!this.rCanvas) {
            this.rCanvas = new fabric.Canvas('roulette-canvas', {
                width: CARD_WIDTH,
                height: CARD_HEIGHT,
                backgroundColor: '#fff',
                        selection: false
                  });
            const rouletteCanvasEl = Utils.getElement('roulette-canvas');
            if (rouletteCanvasEl) {
              rouletteCanvasEl.style.width = '100%';
              rouletteCanvasEl.style.height = '100%';
            }
              }
                
                if (!this.rBackCanvas) {
                  this.rBackCanvas = new fabric.Canvas('roulette-back-canvas', {
                    width: CARD_WIDTH,
                    height: CARD_HEIGHT,
                    backgroundColor: '#111',
                    selection: false
                  });
                  const rouletteBackCanvasEl = Utils.getElement('roulette-back-canvas');
                  if (rouletteBackCanvasEl) {
                    rouletteBackCanvasEl.style.width = '100%';
                    rouletteBackCanvasEl.style.height = '100%';
                  }
                }
                
                this.showCard(0);
                
                // Render back
                const deck = this.decks[deckIdx];
                if (deck.back) {
                  this.rBackCanvas.loadFromJSON(deck.back, () => {
                    this.rBackCanvas.getObjects().forEach(obj => {
                      obj.set({ selectable: false, evented: false });
                    });
                    this.rBackCanvas.requestRenderAll();
                    const noBackMsg = Utils.getElement('no-back-msg');
                    if (noBackMsg) noBackMsg.classList.add('hidden');
                  });
                } else {
                  this.rBackCanvas.clear();
                  this.rBackCanvas.setBackgroundColor('#1f2937', this.rBackCanvas.renderAll.bind(this.rBackCanvas));
                  const noBackMsg = Utils.getElement('no-back-msg');
                  if (noBackMsg) noBackMsg.classList.remove('hidden');
                }
            },
              
              closeRoulette: function() {
                RouletteZoom.reset();
                const el = Utils.getElement('deck-roulette');
                if (el) {
                  el.classList.add('opacity-0');
                  el.setAttribute('aria-hidden', 'true');
                  setTimeout(() => el.classList.add('hidden'), 300);
                }
              },
              
              toggleFlip: function() {
                const cardInner = Utils.getElement('card-inner');
                if (!cardInner) return;
                
                const isFlippingToBack = !cardInner.classList.contains('flipped');
                cardInner.classList.toggle('flipped');
                
                if (isFlippingToBack && this.rBackCanvas) {
                  setTimeout(() => {
                    this.rBackCanvas.calcOffset();
                    this.rBackCanvas.requestRenderAll();
                  }, 50);
                }
              },
              
              nav: function(dir) {
                RouletteZoom.reset();
                
                const cardInner = Utils.getElement('card-inner');
                if (cardInner) cardInner.classList.remove('flipped');
                
                const deck = this.decks[this.activeDeckIdx];
                let next = this.rouletteCardIdx + dir;
                
                if (next >= deck.cards.length) next = 0;
                if (next < 0) next = deck.cards.length - 1;
                
                setTimeout(() => this.showCard(next), 200);
              },
              
              showCard: function(idx) {
                this.rouletteCardIdx = idx;
                const deck = this.decks[this.activeDeckIdx];
                
                Utils.setText('roulette-idx', idx + 1);
                Utils.setText('roulette-total', deck.cards.length);
                
                this.rCanvas.loadFromJSON(deck.cards[idx], () => {
                  this.rCanvas.getObjects().forEach(obj => {
                    obj.set({ selectable: false, evented: false });
                  });
                  this.rCanvas.requestRenderAll();
                });
              },
              
              loadCurrent: function() {
                if (confirm("Edit this card?")) {
                  const data = this.decks[this.activeDeckIdx].cards[this.rouletteCardIdx];
                  canvas.loadFromJSON(data, () => {
                    Theme.updateCanvasColors();
                    canvas.requestRenderAll();
                    History.save();
                    this.closeRoulette();
                  });
                }
              },
              
              deleteCurrent: function() {
                if (confirm("Remove this card from the deck?")) {
                  this.decks[this.activeDeckIdx].cards.splice(this.rouletteCardIdx, 1);
                  this.save();
                  
                  if (this.decks[this.activeDeckIdx].cards.length === 0) {
                    this.closeRoulette();
                  } else {
                    this.nav(0);
                  }
                }
              }
              };
