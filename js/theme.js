// ========================================
// THEME & COLOR ENGINE
// ========================================

(function() {
    'use strict';

    let colorPickerInstance = null;
    let builderPalette = ['#ffffff', '#f1f5f9', '#e2e8f0', '#94a3b8', '#3b82f6', '#2563eb', '#1d4ed8', '#0f172a'];
    let activeBuilderSlot = 2;

    DeckForge.Theme = {
        initColorEngine: function() {
            try {
                colorPickerInstance = new iro.ColorPicker("#iro-picker", {
                    width: 220,
                    color: builderPalette[activeBuilderSlot],
                    layout: [
                        { component: iro.ui.Wheel, options: {} },
                        { component: iro.ui.Slider, options: { sliderType: 'value' } }
                    ]
                });

                const hexInput = DeckForge.Utils.getElement('hex-input');

                colorPickerInstance.on('color:change', (color) => {
                    builderPalette[activeBuilderSlot] = color.hexString;
                    this.renderBuilderSlots();
                    if (hexInput && document.activeElement !== hexInput) {
                        hexInput.value = color.hexString.toUpperCase();
                    }
                });

                if (hexInput) {
                    hexInput.value = builderPalette[activeBuilderSlot].toUpperCase();
                    hexInput.addEventListener('input', (e) => {
                        let val = e.target.value;
                        if (val.length > 0 && !val.startsWith('#')) val = '#' + val;
                        if (/^#[0-9A-F]{6}$/i.test(val)) {
                            colorPickerInstance.color.set(val);
                            builderPalette[activeBuilderSlot] = val;
                            this.renderBuilderSlots();
                        }
                    });
                    hexInput.addEventListener('blur', () => {
                        hexInput.value = colorPickerInstance.color.hexString.toUpperCase();
                    });
                }
                this.renderBuilderSlots();
            } catch (e) {
                console.error('Color engine init error:', e);
            }
        },

        renderBuilderSlots: function() {
            const container = DeckForge.Utils.getElement('builder-slots');
            if (!container) return;
            container.innerHTML = '';
            
            builderPalette.forEach((color, index) => {
                const btn = document.createElement('button');
                btn.className = "w-9 h-9 rounded-lg cursor-pointer transition shadow-sm border relative";
                btn.style.backgroundColor = color;
                if (index === activeBuilderSlot) {
                    btn.classList.add('ring-2', 'ring-blue-500', 'ring-offset-2');
                    btn.innerHTML = `<div class="absolute -top-1 -right-1 w-2.5 h-2.5 bg-blue-500 rounded-full border border-white"></div>`;
                } else {
                    btn.classList.add('border-gray-200');
                }
                btn.onclick = () => {
                    activeBuilderSlot = index;
                    colorPickerInstance.color.set(builderPalette[index]);
                    this.renderBuilderSlots();
                };
                container.appendChild(btn);
            });
        },

        generateHarmony: function(mode) {
    if (typeof chroma === 'undefined') return;
    const base = colorPickerInstance.color.hexString;
    let newColors = [];
    
    if (mode === 'scale') {
        newColors = chroma.scale([
            chroma(base).brighten(3),
            chroma(base).brighten(1.5),
            base,
            chroma(base).darken(1.5),
            chroma(base).darken(3)
        ]).mode('lch').colors(8);
    } else if (mode === 'contrast') {
        newColors = [
            '#ffffff',
            '#f8fafc',
            '#f1f5f9',
            '#e2e8f0',
            base,
            chroma(base).darken(1).hex(),
            chroma(base).darken(2).hex(),
            chroma(base).darken(3.5).hex()
        ];
    }
    
    builderPalette = newColors;
    activeBuilderSlot = 4; // Middle slot
    colorPickerInstance.color.set(builderPalette[4]);
    this.renderBuilderSlots();
},

        loadCustomPalettes: function() {
            try {
                const saved = localStorage.getItem('deckforge_custom_palettes');
                if (saved) {
                    DeckForge.state.palettes = [...DeckForge.DEFAULT_PALETTES, ...JSON.parse(saved)];
                }
            } catch (e) {
                console.error(e);
            }
        },

        selectPalette: function(colors) {
            DeckForge.state.palette = colors;
            if (DeckForge.state.coordinatedColors) this.updateCanvasColors();
            this.renderPaletteUI();
            DeckForge.History.save();
        },

        renderSettingsUI: function() {
            const list = DeckForge.Utils.getElement('palette-list');
            if (!list) return;
            list.innerHTML = '';
            
            DeckForge.state.palettes.forEach(palette => {
                const btn = document.createElement('button');
                btn.className = "flex justify-between p-2 bg-white border rounded w-full hover:border-blue-300 transition";
                const swatches = palette.colors.map(c => `<div class="w-3 h-3 rounded-full" style="background:${c}"></div>`).join('');
                btn.innerHTML = `<span class="text-xs font-bold">${palette.name}</span><div class="flex gap-0.5">${swatches}</div>`;
                btn.onclick = () => this.selectPalette(palette.colors);
                list.appendChild(btn);
            });
        },

        renderPaletteUI: function() {
            const row = DeckForge.Utils.getElement('active-palette-row');
            if (!row) return;
            row.innerHTML = '';
            
            const obj = DeckForge.canvas ? DeckForge.canvas.getActiveObject() : null;
            const currentRole = obj ? (DeckForge.state.editMode === 'fill' ? obj.roleFill : obj.roleStroke) : -99;

            const transparentBtn = document.createElement('button');
            transparentBtn.className = `swatch bg-checkers ${currentRole === -1 ? 'active-role' : ''}`;
            transparentBtn.onclick = () => this.assignRole(-1);
            row.appendChild(transparentBtn);

            [0, 1, 2, 3, 4].forEach(i => {
                const swatch = document.createElement('button');
                swatch.className = `swatch ${currentRole === i ? 'active-role' : ''}`;
                swatch.style.backgroundColor = DeckForge.Utils.getPaletteColor(i);
                swatch.onclick = () => this.assignRole(i);
                row.appendChild(swatch);
            });
        },

        assignRole: function(idx) {
            const obj = DeckForge.canvas.getActiveObject();
            if (!obj || obj.locked) return;

            if (obj.roleGradientStart !== undefined) {
                if (DeckForge.state.gradSlot === 'start') obj.roleGradientStart = (idx === -1) ? 0 : idx;
                else obj.roleGradientEnd = (idx === -1) ? 0 : idx;
                this.updateCanvasColors();
                this.updateGradientUI(obj);
            } else {
                const color = DeckForge.Utils.getPaletteColor(idx);
                const applyToItem = (o) => {
                    o.set('objectCaching', false);
                    const isLineArt = (o.type === 'line' || (o.stroke && (!o.fill || o.fill === 'none')));
                    if (DeckForge.state.editMode === 'stroke' || isLineArt) {
                        o.roleStroke = idx; o.roleFill = null; o.set('stroke', color);
                        if (idx !== -1 && !o.strokeWidth) o.set('strokeWidth', 2);
                    } else {
                        o.roleFill = idx; o.roleStroke = null; o.set('fill', color);
                    }
                };
                if (obj.getObjects && !obj.isParticleGroup) obj.getObjects().forEach(applyToItem);
                else applyToItem(obj);
            }
            DeckForge.canvas.requestRenderAll();
            this.renderPaletteUI();
            DeckForge.History.save();
        },

        toggleDarkMode: function() {
            DeckForge.state.darkMode = !DeckForge.state.darkMode;
            this.updateCanvasColors();
            this.renderPaletteUI();
            const btn = DeckForge.Utils.getElement('btn-dark-mode');
            const icon = DeckForge.Utils.getElement('icon-dark-mode');
            if (btn && icon) {
                if (DeckForge.state.darkMode) {
                    btn.classList.replace('bg-gray-900', 'bg-white');
                    btn.classList.replace('text-white', 'text-gray-900');
                    icon.className = "ph-fill ph-sun text-lg";
                } else {
                    btn.classList.replace('bg-white', 'bg-gray-900');
                    btn.classList.replace('text-gray-900', 'text-white');
                    icon.className = "ph-fill ph-moon text-lg";
                }
            }
        },

        toggleGradientMode: function() {
            const obj = DeckForge.canvas.getActiveObject();
            if (!obj || obj.locked) return;

            if (obj.roleGradientStart === undefined) {
                obj.roleGradientStart = 2; obj.roleGradientEnd = 3; obj.gradBalance = 0;
                if (obj.roleFill === -1 || !obj.fill) obj.roleFill = -1;
                else delete obj.roleFill;
            } else {
                obj.roleFill = 2;
                delete obj.roleGradientStart; delete obj.roleGradientEnd;
                obj.set('fill', DeckForge.Utils.getPaletteColor(2));
            }
            this.updateCanvasColors();
            this.updateGradientUI(obj);
            this.renderPaletteUI();
            DeckForge.History.save();
        },

        setGradientSlot: function(slot) {
            DeckForge.state.gradSlot = slot;
            const btnStart = DeckForge.Utils.getElement('btn-grad-start');
            const btnEnd = DeckForge.Utils.getElement('btn-grad-end');
            const activeClass = "flex-1 py-1.5 flex items-center justify-center gap-2 rounded-lg bg-white shadow-sm ring-1 ring-black/5 text-blue-600 transition";
            const inactiveClass = "flex-1 py-1.5 flex items-center justify-center gap-2 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-white/50 transition";
            
            if (btnStart) btnStart.className = slot === 'start' ? activeClass : inactiveClass;
            if (btnEnd) btnEnd.className = slot === 'end' ? activeClass : inactiveClass;
        },

        updateGradientUI: function(obj) {
            const controls = DeckForge.Utils.getElement('gradient-controls');
            if (!controls) return;
            if (obj && obj.roleGradientStart !== undefined) {
                controls.classList.remove('hidden');
                const start = DeckForge.Utils.getElement('preview-grad-start');
                const end = DeckForge.Utils.getElement('preview-grad-end');
                if (start) start.style.backgroundColor = DeckForge.Utils.getPaletteColor(obj.roleGradientStart);
                if (end) end.style.backgroundColor = DeckForge.Utils.getPaletteColor(obj.roleGradientEnd);
                DeckForge.Utils.setInputValue('grad-balance', (obj.gradBalance || 0) * 100);
            } else {
                controls.classList.add('hidden');
            }
        },

        updateCanvasColors: function() {
            const applyColor = (o) => {
                if (o.locked) return;
                
                // Gradients & Particle Groups
                if (o.roleGradientStart !== undefined) {
                    const startColor = DeckForge.Utils.getPaletteColor(o.roleGradientStart);
                    const endColor = DeckForge.Utils.getPaletteColor(o.roleGradientEnd);
                    
                    if (o.isParticleGroup) {
                        o.getObjects().forEach(child => {
                            const t = (child.top + (o.height/2)) / o.height;
                            const newCol = DeckForge.Utils.getInterpColor(startColor, endColor, Math.max(0, Math.min(1, t)));
                            const type = o.generativeType || 'fill';
                            if (type === 'stroke') child.set('stroke', newCol);
                            else { child.set('fill', newCol); if(child.strokeWidth) child.set('stroke', newCol); }
                        });
                        o.set('dirty', true);
                    } else {
                        const newGrad = new fabric.Gradient({
                            type: 'linear', gradientUnits: 'percentage',
                            coords: { x1: 0, y1: 0, x2: 1, y2: 1 },
                            colorStops: [{ offset: 0, color: startColor }, { offset: 1, color: endColor }]
                        });
                        if (o.roleFill !== -1) o.set('fill', newGrad);
                        if (o.strokeWidth > 0) o.set('stroke', newGrad);
                    }
                } 
                // Solid Colors
                else {
                    if (o.roleFill !== undefined && o.roleFill !== -99) o.set('fill', DeckForge.Utils.getPaletteColor(o.roleFill));
                    if (o.roleStroke !== undefined && o.roleStroke !== -99) o.set('stroke', DeckForge.Utils.getPaletteColor(o.roleStroke));
                }
                
                if (o.getObjects && !o.isParticleGroup) {
                    o.getObjects().forEach(child => applyColor(child));
                    o.set('dirty', true);
                }
            };

            DeckForge.canvas.setBackgroundColor(DeckForge.Utils.getPaletteColor(0), DeckForge.canvas.renderAll.bind(DeckForge.canvas));
            DeckForge.canvas.getObjects().forEach(obj => applyColor(obj));
            DeckForge.canvas.requestRenderAll();
        }
    };
})();
