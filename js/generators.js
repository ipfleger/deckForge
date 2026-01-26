// ========================================
// GENERATORS & ALGORITHMS (FIXED)
// ========================================

(function() {
    'use strict';

    // Aliases
    const state = DeckForge.state;
    const Utils = DeckForge.Utils;
    const CARD_WIDTH = DeckForge.CARD_WIDTH;
    const CARD_HEIGHT = DeckForge.CARD_HEIGHT;

    // Helper: FastSimplex Noise
    const FastSimplex = (function() {
        const F2 = 0.5 * (Math.sqrt(3.0) - 1.0);
        const G2 = (3.0 - Math.sqrt(3.0)) / 6.0;
        function FastSimplex() {
            this.p = new Uint8Array(256);
            this.perm = new Uint8Array(512);
            this.permMod12 = new Uint8Array(512);
            for (let i = 0; i < 256; i++) this.p[i] = i;
            for (let i = 0; i < 256; i++) {
                const r = (Math.random() * (256 - i)) | 0;
                const t = this.p[i];
                this.p[i] = this.p[i + r];
                this.p[i + r] = t;
                this.perm[i] = this.perm[i + 256] = this.p[i];
                this.permMod12[i] = this.permMod12[i + 256] = this.p[i] % 12;
            }
        }
        FastSimplex.prototype.noise2D = function(xin, yin) {
            const permMod12 = this.permMod12, perm = this.perm;
            const Grad3 = [[1,1,0],[-1,1,0],[1,-1,0],[-1,-1,0],[1,0,1],[-1,0,1],[1,0,-1],[-1,0,-1],[0,1,1],[0,-1,1],[0,1,-1],[0,-1,-1]];
            let n0 = 0, n1 = 0, n2 = 0;
            const s = (xin + yin) * F2;
            const i = Math.floor(xin + s);
            const j = Math.floor(yin + s);
            const t = (i + j) * G2;
            const X0 = i - t;
            const Y0 = j - t;
            const x0 = xin - X0;
            const y0 = yin - Y0;
            let i1, j1;
            if (x0 > y0) { i1 = 1; j1 = 0; } else { i1 = 0; j1 = 1; }
            const x1 = x0 - i1 + G2;
            const y1 = y0 - j1 + G2;
            const x2 = x0 - 1.0 + 2.0 * G2;
            const y2 = y0 - 1.0 + 2.0 * G2;
            const ii = i & 255;
            const jj = j & 255;
            let t0 = 0.5 - x0 * x0 - y0 * y0;
            if (t0 >= 0) {
                const gi0 = permMod12[ii + perm[jj]];
                t0 *= t0;
                n0 = t0 * t0 * (Grad3[gi0][0] * x0 + Grad3[gi0][1] * y0);
            }
            let t1 = 0.5 - x1 * x1 - y1 * y1;
            if (t1 >= 0) {
                const gi1 = permMod12[ii + i1 + perm[jj + j1]];
                t1 *= t1;
                n1 = t1 * t1 * (Grad3[gi1][0] * x1 + Grad3[gi1][1] * y1);
            }
            let t2 = 0.5 - x2 * x2 - y2 * y2;
            if (t2 >= 0) {
                const gi2 = permMod12[ii + 1 + perm[jj + 1]];
                t2 *= t2;
                n2 = t2 * t2 * (Grad3[gi2][0] * x2 + Grad3[gi2][1] * y2);
            }
            return 70.0 * (n0 + n1 + n2);
        };
        return FastSimplex;
    })();

    // ========================================
    // UI CONTROLLER
    // ========================================

    DeckForge.GenUI = {
        init: function() {
            this.renderList();
        },

        renderList: function() {
            this.showList();
        },

        showList: function() {
            const content = DeckForge.Utils.getElement('gen-content');
            const backBtn = DeckForge.Utils.getElement('gen-back-btn');
            const title = DeckForge.Utils.getElement('gen-header-title');
            
            if (backBtn) backBtn.classList.add('hidden');
            if (title) title.innerText = "Create";
            
            if (content) {
                content.innerHTML = '';
                const cats = [
                    { id: 'shape', name: 'Basic Shapes', icon: 'ph-shapes', color: 'text-blue-500', bg: 'bg-blue-50' },
                    { id: 'algo', name: 'Generative Art', icon: 'ph-sparkle', color: 'text-purple-500', bg: 'bg-purple-50' },
                    { id: 'text', name: 'Typography', icon: 'ph-text-t', color: 'text-gray-600', bg: 'bg-gray-100' },
                    { id: 'svg', name: 'Import Vector', icon: 'ph-vector-three', color: 'text-pink-500', bg: 'bg-pink-50' }
                ];

                const grid = document.createElement('div');
                grid.className = "grid grid-cols-2 gap-3";
                
                cats.forEach(c => {
                    const btn = document.createElement('button');
                    btn.className = "flex flex-col items-center justify-center p-6 rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition active:scale-95 bg-white group";
                    btn.onclick = () => this.openCategory(c.id);
                    btn.innerHTML = `
                        <div class="w-12 h-12 rounded-full ${c.bg} ${c.color} flex items-center justify-center mb-3 text-2xl group-hover:scale-110 transition-transform">
                            <i class="ph-bold ${c.icon}"></i>
                        </div>
                        <span class="font-bold text-gray-700 text-xs uppercase tracking-wide">${c.name}</span>
                    `;
                    grid.appendChild(btn);
                });
                content.appendChild(grid);
            }
        },

        openCategory: function(catId) {
            const content = DeckForge.Utils.getElement('gen-content');
            const backBtn = DeckForge.Utils.getElement('gen-back-btn');
            const title = DeckForge.Utils.getElement('gen-header-title');
            
            if (backBtn) backBtn.classList.remove('hidden');
            if (title) title.innerText = catId;
            if (!content) return;

            content.innerHTML = '';
            
            if (catId === 'shape') {
                const shapes = ['rect','circle','triangle','star','hexagon','shield','diamond','placeholder','safe'];
                const grid = document.createElement('div');
                grid.className = "grid grid-cols-3 gap-3";
                shapes.forEach(s => {
                    const btn = document.createElement('button');
                    btn.className = "aspect-square flex flex-col items-center justify-center bg-gray-50 rounded-xl hover:bg-blue-50 hover:text-blue-600 text-gray-500 transition";
                    btn.onclick = () => { DeckForge.Canvas.addShape(s); }; // Shapes add instantly
                    btn.innerHTML = `<i class="ph-bold ph-${this.getShapeIcon(s)} text-2xl mb-1"></i><span class="text-[9px] font-bold uppercase">${s}</span>`;
                    grid.appendChild(btn);
                });
                content.appendChild(grid);
            }
            else if (catId === 'text') {
                DeckForge.Canvas.addText();
            }
            else if (catId === 'svg') {
                DeckForge.SVG.openModal();
            }
            else if (catId === 'algo') {
                // FIXED: Clicking a generator now opens sub-menu without closing drawer
                const algos = [
                    { id: 'circuit', name: 'Tech Circuit', desc: 'PCB Traces' },
                    { id: 'arcane', name: 'Arcane Sigil', desc: 'Magic Circles' },
                    { id: 'topo', name: 'Topography', desc: 'Map Contours' },
                    { id: 'flux', name: 'Flux Waves', desc: 'Liquid Layers' },
                    { id: 'horizon', name: 'Neon Horizon', desc: 'Retro Sun' },
                    { id: 'scribble', name: 'Noise Flow', desc: 'Organic Lines' },
                    { id: 'poly', name: 'Poly Mesh', desc: 'Low Poly' },
                    { id: 'halftone', name: 'Halftone', desc: 'Comic Dots' },
                    { id: 'orbit', name: 'Orbit Pack', desc: 'Circle Packing' },
                    { id: 'grid', name: 'Iso Grid', desc: 'Pattern Grid' },
                    { id: 'motif', name: 'Motif Grid', desc: 'Repeated Shapes' },
                    { id: 'waves', name: 'Neo Waves', desc: 'Interference' },
                    { id: 'maze', name: '10-Print Maze', desc: 'Labyrinth' },
                    { id: 'flurry', name: 'Flurry', desc: 'Wind Lines' }
                ];
                
                const list = document.createElement('div');
                list.className = "flex flex-col gap-2";
                algos.forEach(a => {
                    const btn = document.createElement('button');
                    btn.className = "flex items-center gap-4 p-3 rounded-xl border border-gray-100 hover:border-purple-200 hover:bg-purple-50 transition text-left group";
                    // ERROR WAS HERE: Removed DeckForge.UI.closeAllDrawers()
                    btn.onclick = () => { DeckForge.Generators.run(a.id); }; 
                    btn.innerHTML = `
                        <div class="w-10 h-10 rounded-lg bg-gray-100 group-hover:bg-white text-purple-600 flex items-center justify-center">
                            <i class="ph-bold ph-magic-wand"></i>
                        </div>
                        <div>
                            <span class="font-bold text-gray-800 text-sm block">${a.name}</span>
                            <span class="text-[10px] text-gray-400 font-bold uppercase">${a.desc}</span>
                        </div>
                    `;
                    list.appendChild(btn);
                });
                content.appendChild(list);
            }
        },

        getShapeIcon: function(s) {
            const map = { rect: 'square', circle: 'circle', triangle: 'triangle', star: 'star', hexagon: 'hexagon', shield: 'shield', diamond: 'diamond', placeholder: 'image', safe: 'corners-out' };
            return map[s] || 'square';
        },

        getPreviewSize: function() {
            const w = Math.min(window.innerWidth * 0.45, 220);
            const h = w * (DeckForge.CARD_HEIGHT / DeckForge.CARD_WIDTH);
            return { w, h, scale: w / DeckForge.CARD_WIDTH };
        },

        showGeneratorUI: function(key) {
            this.currentGen = key;
            const gen = DeckForge.Generators.registry[key];
            if (!gen) return;

            const container = DeckForge.Utils.getElement('gen-content');
            const header = DeckForge.Utils.getElement('gen-header-title');
            const backBtn = DeckForge.Utils.getElement('gen-back-btn');

            if (header) header.innerText = gen.name;
            if (backBtn) backBtn.classList.remove('hidden');

            const size = this.getPreviewSize();

            let html = `
                <div class="flex justify-center mb-4">
                    <div class="rounded-xl border border-gray-200 overflow-hidden shadow-sm bg-white relative">
                        <div class="absolute inset-0 opacity-20 pointer-events-none" style="background-image:radial-gradient(#94a3b8 1px, transparent 1px); background-size:10px 10px;"></div>
                        <canvas id="preview-c" width="${size.w}" height="${size.h}"></canvas>
                    </div>
                </div>
                <div class="space-y-4 animate-fade-in pb-4">
                <div class="grid grid-cols-2 gap-3">
            `;

            gen.params.forEach(p => {
                const colSpan = p.half ? 'col-span-1' : 'col-span-2';
                if (p.type === 'range') {
                    html += `
                        <div class="${colSpan}">
                            <div class="flex justify-between text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">
                                <label for="input-${p.id}">${p.label}</label>
                                <span id="val-${p.id}">${p.def}</span>
                            </div>
                            <input type="range" id="input-${p.id}" min="${p.min}" max="${p.max}" value="${p.def}" step="${p.step || 1}" class="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer">
                        </div>
                    `;
                } else if (p.type === 'color') {
                    html += `
                        <div class="${colSpan}">
                            <div class="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1"><span>${p.label}</span></div>
                            <input type="hidden" id="input-${p.id}" value="${p.def}">
                            <div class="flex gap-1">
                    `;
                    state.palette.forEach(color => {
                        html += `<button type="button" onclick="document.getElementById('input-${p.id}').value = '${color}'; DeckForge.GenUI.debouncedUpdatePreview();" class="w-6 h-6 rounded cursor-pointer border border-gray-200 hover:scale-110 transition shadow-sm" style="background-color:${color};"></button>`;
                    });
                    html += `</div></div>`;
                } else if (p.type === 'checkbox') {
                    html += `
                        <div class="${colSpan} flex items-center justify-between bg-gray-50 p-3 rounded-xl border border-gray-200">
                            <label for="input-${p.id}" class="text-[10px] font-bold text-gray-500 uppercase tracking-widest">${p.label}</label>
                            <div class="relative inline-block w-10 align-middle select-none">
                                <input type="checkbox" id="input-${p.id}" ${p.def ? 'checked' : ''} class="toggle-checkbox absolute block w-5 h-5 rounded-full bg-white border-4 appearance-none cursor-pointer transition-all duration-200 top-0 left-0"/>
                                <label for="input-${p.id}" class="toggle-label block overflow-hidden h-5 rounded-full bg-gray-300 cursor-pointer transition-colors duration-200"></label>
                            </div>
                        </div>
                    `;
                }
            });

            html += `
                </div>
                <button onclick="DeckForge.GenUI.run()" class="w-full py-3 bg-blue-600 text-white font-bold rounded-xl shadow-lg shadow-blue-200 active:scale-95 transition mt-2">Add to Canvas</button>
            </div>
            `;

            if (container) container.innerHTML = html;

            setTimeout(() => {
                const dims = this.getPreviewSize();
                this.previewCanvas = new fabric.Canvas('preview-c', {
                    width: dims.w, height: dims.h,
                    backgroundColor: 'transparent', selection: false, renderOnAddRemove: false
                });
                this.previewCanvas.setZoom(dims.scale);

                gen.params.forEach(p => {
                    const input = DeckForge.Utils.getElement(`input-${p.id}`);
                    if (input) {
                        input.addEventListener('input', (e) => {
                            if (p.type === 'range') DeckForge.Utils.setText(`val-${p.id}`, e.target.value);
                            this.debouncedUpdatePreview();
                        });
                    }
                });
                this.updatePreview();
            }, 50);
        },

        updatePreview: function() {
            if (!this.currentGen || !this.previewCanvas) return;
            const gen = DeckForge.Generators.registry[this.currentGen];
            const values = {};
            gen.params.forEach(p => {
                const el = DeckForge.Utils.getElement(`input-${p.id}`);
                if (el) values[p.id] = (p.type === 'checkbox') ? el.checked : el.value;
            });

            try {
                const fabricObj = gen.generate(values);
                this.previewCanvas.clear();
                fabricObj.set({ selectable: false, evented: false, hasControls: false, hasBorders: false });
                this.previewCanvas.add(fabricObj);
                this.previewCanvas.requestRenderAll();
            } catch (e) { console.error(e); }
        },

        debouncedUpdatePreview: function() {
            if (this._timer) clearTimeout(this._timer);
            this._timer = setTimeout(() => this.updatePreview(), 200);
        },

        run: function() {
            if (!this.currentGen) return;
            const gen = DeckForge.Generators.registry[this.currentGen];
            const values = {};
            gen.params.forEach(p => {
                const el = DeckForge.Utils.getElement(`input-${p.id}`);
                if (el) values[p.id] = (p.type === 'checkbox') ? el.checked : el.value;
            });

            try {
                const fabricObj = gen.generate(values);
                fabricObj.set({ selectable: true, evented: true });
                DeckForge.canvas.add(fabricObj);
                DeckForge.canvas.setActiveObject(fabricObj);
                DeckForge.canvas.requestRenderAll();
                DeckForge.History.save();
                DeckForge.UI.closeAllDrawers();
            } catch (e) {
                console.error('Generator error:', e);
                alert('Error generating pattern.');
            }
        }
    };

    // ========================================
    // ADVANCED GENERATORS (LOGIC PORTED FROM SPA)
    // ========================================

    DeckForge.Generators = {
        run: function(id) {
            DeckForge.GenUI.showGeneratorUI(id);
        },

        registry: {
            'motif':{
                name:'Motif Grid',
                icon:'ph-grid-four',
                description:'Repeated geometric shapes',
                params:[
                    { id:'col1', type:'color', label:'Top Color', def:state.palette[2], half:true },
                    { id:'col2', type:'color', label:'Btm Color', def:state.palette[3], half:true },
                    { id:'shape', type:'range', label:'Shape (Sq/Ci/Tri)', min:0, max:2, def:0, step:1 },
                    { id:'scale', type:'range', label:'Size', min:20, max:200, def:80, half:true },
                    { id:'rotate', type:'range', label:'Rotate', min:0, max:90, def:45, half:true }
                ],
                generate:(values) => {
                    const shapeType = parseInt(values.shape);
                    const size = parseInt(values.scale);
                    const rot = parseInt(values.rotate);
                    const cols = Math.ceil(CARD_WIDTH / size) + 1;
                    const rows = Math.ceil(CARD_HEIGHT / size) + 1;

                    const shapes = [];

                    for (let r = 0; r < rows; r++) {
                        for (let c = 0; c < cols; c++) {
                            const x = (c * size) - (size / 2);
                            const y = (r * size) - (size / 2);
                            const half = size / 2;
                            let s;

                            if (shapeType === 0) {
                                s = new fabric.Rect({ width:half, height:half, left:x, top:y, originX:'center', originY:'center' });
                            } else if (shapeType === 1) {
                                s = new fabric.Circle({ radius:half / 2, left:x, top:y, originX:'center', originY:'center' });
                            } else {
                                s = new fabric.Triangle({ width:half, height:half, left:x, top:y, originX:'center', originY:'center' });
                            }

                            s.set({ angle:rot });

                            const t = Math.max(0, Math.min(1, y / CARD_HEIGHT));
                            s.set('fill', Utils.getInterpColor(values.col1, values.col2, t));
                            shapes.push(s);
                        }
                    }

                    const idx1 = state.palette.indexOf(values.col1);
                    const idx2 = state.palette.indexOf(values.col2);

                    return new fabric.Group(shapes, {
                        left:CARD_WIDTH / 2,
                        top:CARD_HEIGHT / 2,
                        originX:'center',
                        originY:'center',
                        isParticleGroup:true,
                        generativeType:'fill',
                        roleGradientStart:idx1 > -1 ? idx1 :2,
                        roleGradientEnd:idx2 > -1 ? idx2 :3
                    });
                }
            },

            'poly':{
                name:'Poly Mesh',
                icon:'ph-triangle',
                description:'Delaunay triangulation network',
                params:[
                    { id:'col1', type:'color', label:'Top Color', def:state.palette[2], half:true },
                    { id:'col2', type:'color', label:'Btm Color', def:state.palette[3], half:true },
                    { id:'size', type:'range', label:'Cell Size', min:40, max:150, def:80, half:true },
                    { id:'variance', type:'range', label:'Irregularity', min:0, max:100, def:50, half:true }
                ],
                generate:(values) => {
                    if (!window.d3) {
                        console.warn("D3 library not loaded");
                        return new fabric.Rect({ width:100, height:100, fill:'#ccc' });
                    }

                    const cellSize = parseInt(values.size);
                    const variance = parseInt(values.variance);
                    const bleed = 100;

                    const points = [];
                    for (let x = -bleed; x < CARD_WIDTH + bleed; x += cellSize) {
                        for (let y = -bleed; y < CARD_HEIGHT + bleed; y += cellSize) {
                            const xOff = (Math.random() - 0.5) * cellSize * (variance / 50);
                            const yOff = (Math.random() - 0.5) * cellSize * (variance / 50);
                            points.push([x + xOff, y + yOff]);
                        }
                    }

                    const delaunay = d3.Delaunay.from(points);
                    const triangles = delaunay.trianglePolygons();
                    const shapes = [];

                    for (const tri of triangles) {
                        const pts = tri.map(p => ({ x:p[0], y:p[1] }));
                        const cy = (tri[0][1] + tri[1][1] + tri[2][1]) / 3;
                        const t = Math.max(0, Math.min(1, cy / CARD_HEIGHT));
                        const col = Utils.getInterpColor(values.col1, values.col2, t);

                        const poly = new fabric.Polygon(pts, {
                            fill:col,
                            stroke:col,
                            strokeWidth:1
                        });
                        shapes.push(poly);
                    }

                    const idx1 = state.palette.indexOf(values.col1);
                    const idx2 = state.palette.indexOf(values.col2);

                    return new fabric.Group(shapes, {
                        left:CARD_WIDTH / 2,
                        top:CARD_HEIGHT / 2,
                        originX:'center',
                        originY:'center',
                        isParticleGroup:true,
                        generativeType:'fill',
                        roleGradientStart:idx1 > -1 ? idx1 :2,
                        roleGradientEnd:idx2 > -1 ?  idx2 :3
                    });
                }
            },

            'flurry':{
                name:'Flurry',
                icon:'ph-wind',
                description:'Scattered wind lines',
                params:[
                    { id:'col1', type:'color', label:'Top Color', def:state.palette[2], half:true },
                    { id:'col2', type:'color', label:'Btm Color', def:state.palette[3], half:true },
                    { id:'count', type:'range', label:'Density', min:50, max:500, def:150, half:true },
                    { id:'angle', type:'range', label:'Angle', min:0, max:360, def:45, half:true },
                    { id:'len', type:'range', label:'Length', min:10, max:200, def:60, half:true },
                    { id:'width', type:'range', label:'Width', min:1, max:10, def:3, half:true }
                ],
                generate:(values) => {
                    const count = parseInt(values.count);
                    const angleRad = (parseInt(values.angle) * Math.PI) / 180;
                    const len = parseInt(values.len);
                    const width = parseInt(values.width);
                    const cos = Math.cos(angleRad);
                    const sin = Math.sin(angleRad);

                    const lines = [];

                    for (let i = 0; i < count; i++) {
                        const x = Math.random() * CARD_WIDTH;
                        const y = Math.random() * CARD_HEIGHT;
                        const l = len * (0.5 + Math.random());
                        const x2 = x + (cos * l);
                        const y2 = y + (sin * l);

                        const t = Math.max(0, Math.min(1, y / CARD_HEIGHT));
                        const col = Utils.getInterpColor(values.col1, values.col2, t);

                        const line = new fabric.Line([x, y, x2, y2], {
                            stroke:col,
                            strokeWidth:width,
                            strokeLineCap:'round',
                            opacity:0.4 + Math.random() * 0.6
                        });
                        lines.push(line);
                    }

                    const idx1 = state.palette.indexOf(values.col1);
                    const idx2 = state.palette.indexOf(values.col2);

                    return new fabric.Group(lines, {
                        left:CARD_WIDTH / 2,
                        top:CARD_HEIGHT / 2,
                        originX:'center',
                        originY:'center',
                        isParticleGroup:true,
                        generativeType:'stroke',
                        roleGradientStart:idx1 > -1 ? idx1 :2,
                        roleGradientEnd:idx2 > -1 ? idx2 :3
                    });
                }
            },

            'maze':{
                name:'10-Print Maze',
                icon:'ph-arrows-split',
                description:'Procedural maze grid',
                params:[
                    { id:'col1', type:'color', label:'Top Color', def:state.palette[2], half:true },
                    { id:'col2', type:'color', label:'Btm Color', def:state.palette[3], half:true },
                    { id:'step', type:'range', label:'Grid Size', min:10, max:100, def:40, half:true },
                    { id:'width', type:'range', label:'Stroke', min:1, max:10, def:4, half:true },
                    { id:'prob', type:'range', label:'Balance', min:0, max:100, def:50 }
                ],
                generate:(values) => {
                    const step = parseInt(values.step);
                    const width = parseInt(values.width);
                    const prob = parseInt(values.prob) / 100;

                    const lines = [];

                    for (let x = 0; x < CARD_WIDTH; x += step) {
                        for (let y = 0; y < CARD_HEIGHT; y += step) {
                            let l;
                            if (Math.random() < prob) {
                                l = new fabric.Line([x, y, x + step, y + step], { strokeWidth:width });
                            } else {
                                l = new fabric.Line([x, y + step, x + step, y], { strokeWidth:width });
                            }

                            const t = Math.max(0, Math.min(1, y / CARD_HEIGHT));
                            l.set({ stroke:Utils.getInterpColor(values.col1, values.col2, t), strokeLineCap:'square' });
                            lines.push(l);
                        }
                    }

                    const idx1 = state.palette.indexOf(values.col1);
                    const idx2 = state.palette.indexOf(values.col2);

                    return new fabric.Group(lines, {
                        left:CARD_WIDTH / 2,
                        top:CARD_HEIGHT / 2,
                        originX:'center',
                        originY:'center',
                        isParticleGroup:true,
                        generativeType:'stroke',
                        roleGradientStart:idx1 > -1 ? idx1 :2,
                        roleGradientEnd:idx2 > -1 ? idx2 :3
                    });
                }
            },

            'horizon': {
    name: 'Neon Horizon',
    icon: 'ph-sun-horizon',
    description: 'Retro sun with perspective blinds',
    params: [
        { id: 'col1', type: 'color', label: 'Sky/Lines', def: state.palette[2], half: true },
        { id: 'col2', type: 'color', label: 'Sun Color', def: state.palette[3], half: true },
        { id: 'sunSize', type: 'range', label: 'Sun Size', min: 100, max: 600, def: 350, half: true },
        { id: 'lineCount', type: 'range', label: 'Line Count', min: 10, max: 60, def: 30, half: true },
        { id: 'curve', type: 'range', label: 'Perspective', min: 1, max: 50, def: 20, half: true }
    ],
    generate: (values) => {
        const width = CARD_WIDTH;
        const height = CARD_HEIGHT;
        const sunR = parseInt(values.sunSize);
        const lineCount = parseInt(values.lineCount);
        const curveStrength = parseInt(values.curve) / 10;
        const group = [];

        // Background rectangle
        const bg = new fabric.Rect({
            width: width + 100,
            height: height + 100,
            left: 0,
            top: 0,
            originX: 'center',
            originY: 'center',
            fill: values.col1
        });
        group.push(bg);

        // Top sun (rising)
        const sunTop = new fabric.Circle({
            radius: sunR,
            left: 0,
            top: -height / 2 + sunR * 0.3,
            originX: 'center',
            originY: 'center',
            fill: values.col2
        });
        group.push(sunTop);

        // Bottom sun (reflection)
        const sunBot = new fabric.Circle({
            radius: sunR,
            left: 0,
            top: height / 2 - sunR * 0.3,
            originX: 'center',
            originY: 'center',
            fill: values.col2
        });
        group.push(sunBot);

        // Horizontal lines (venetian blind effect)
        const totalHeight = height;
        const spacing = totalHeight / lineCount;
        
        for (let i = 0; i < lineCount; i++) {
            // Perspective: lines get thinner and closer together toward horizon (center)
            const normalizedPos = Math.abs((i / lineCount) - 0.5) * 2; // 0 at center, 1 at edges
            const thickness = Math.max(1, spacing * 0.6 * Math.pow(normalizedPos, curveStrength));
            const y = -height / 2 + (i * spacing) + spacing / 2;
            
            const line = new fabric.Rect({
                width: width + 100,
                height: thickness,
                left: 0,
                top: y,
                originX: 'center',
                originY: 'center',
                fill: values.col1
            });
            group.push(line);
        }

        const idx1 = state.palette.indexOf(values.col1);
        const idx2 = state.palette.indexOf(values.col2);

        const artGroup = new fabric.Group(group, {
            left: CARD_WIDTH / 2,
            top: CARD_HEIGHT / 2,
            originX: 'center',
            originY: 'center',
            isParticleGroup: true,
            generativeType: 'fill',
            roleGradientStart: idx1 > -1 ? idx1 : 2,
            roleGradientEnd: idx2 > -1 ? idx2 : 3
        });

        return artGroup;
    }
},

            'scribble': {
                name: 'Noise Flow',
                icon: 'ph-scribble-loop',
                description: 'Smooth, fluid-like particle streams',
                params: [
                    { id: 'col1', type: 'color', label: 'Start Color', def: state.palette[2], half: true },
                    { id: 'col2', type: 'color', label: 'End Color', def: state.palette[3], half: true },
                    { id: 'count', type: 'range', label: 'Density', min: 50, max: 800, def: 400, half: true },
                    { id: 'chaos', type: 'range', label: 'Flow Scale', min: 100, max: 800, def: 400, half: true },
                    { id: 'len', type: 'range', label: 'Length', min: 10, max: 100, def: 40, half: true },
                    { id: 'width', type: 'range', label: 'Stroke', min: 0.5, max: 4, def: 1.5, step: 0.1, half: true }
                ],
                generate: (values) => {
                    const count = parseInt(values.count);
                    const scale = parseInt(values.chaos);
                    const len = parseInt(values.len);
                    const width = parseFloat(values.width);
                    const localSimplex = new FastSimplex();
                    const paths = [];

                    for (let i = 0; i < count; i++) {
                        let x = Math.random() * CARD_WIDTH;
                        let y = Math.random() * CARD_HEIGHT;
                        const startY = y;
                        let d = `M ${x} ${y}`;
                        let points = [{x, y}];
                        
                        for (let j = 0; j < len; j++) {
                            const angle = localSimplex.noise2D(x / scale, y / scale) * Math.PI * 2;
                            x += Math.cos(angle) * 5; 
                            y += Math.sin(angle) * 5;
                            points.push({x, y});
                        }

                        for (let k = 0; k < points.length - 1; k++) {
                            const p0 = points[k];
                            const p1 = points[k + 1];
                            if (k === 0) d += ` L ${p1.x} ${p1.y}`;
                            else {
                                const mx = (p0.x + p1.x) / 2;
                                const my = (p0.y + p1.y) / 2;
                                d += ` Q ${p0.x} ${p0.y} ${mx} ${my}`;
                            }
                        }

                        const t = Math.max(0, Math.min(1, startY / CARD_HEIGHT));
                        const lineColor = Utils.getInterpColor(values.col1, values.col2, t);

                        const path = new fabric.Path(d, {
                            fill: null, stroke: lineColor, strokeWidth: width,
                            strokeLineCap: 'round', strokeLineJoin: 'round',
                            opacity: 0.3 + (Math.random() * 0.5), objectCaching: false
                        });
                        paths.push(path);
                    }

                    const idx1 = state.palette.indexOf(values.col1);
                    const idx2 = state.palette.indexOf(values.col2);

                    return new fabric.Group(paths, {
                        left: CARD_WIDTH / 2, top: CARD_HEIGHT / 2, originX: 'center', originY: 'center',
                        isParticleGroup: true, generativeType: 'stroke',
                        roleGradientStart: idx1 > -1 ? idx1 : 2, roleGradientEnd: idx2 > -1 ? idx2 : 3
                    });
                }
            },

            'orbit':{
                name:'Orbit Pack',
                icon:'ph-circles-three-plus',
                description:'Theme-reactive circle pack',
                params:[
                    { id:'col1', type:'color', label:'Top Color', def:state.palette[2], half:true },
                    { id:'col2', type:'color', label:'Btm Color', def:state.palette[3], half:true },
                    { id:'count', type:'range', label:'Attempts', min:100, max:2000, def:500 },
                    { id:'min', type:'range', label:'Min Size', min:2, max:20, def:5, half:true },
                    { id:'max', type:'range', label:'Max Size', min:20, max:100, def:50, half:true },
                    { id:'gap', type:'range', label:'Gap', min:0, max:20, def:4 }
                ],
                generate:(values) => {
                    const count = parseInt(values.count);
                    const min = parseInt(values.min);
                    const max = parseInt(values.max);
                    const gap = parseInt(values.gap);

                    const circles = [];
                    const shapes = [];

                    for (let i = 0; i < count; i++) {
                        const newX = Math.random() * CARD_WIDTH;
                        const newY = Math.random() * CARD_HEIGHT;
                        let valid = true;
                        let maxR = max;

                        for (const c of circles) {
                            const d = Math.hypot(newX - c.x, newY - c.y);
                            if (d < c.r + min + gap) {
                                valid = false;
                                break;
                            }
                            const avail = d - c.r - gap;
                            if (avail < maxR) maxR = avail;
                        }

                        if (valid && maxR >= min) {
                            circles.push({ x:newX, y:newY, r:maxR });
                            const t = Math.max(0, Math.min(1, newY / CARD_HEIGHT));
                            const circleColor = Utils.getInterpColor(values.col1, values.col2, t);

                            const circle = new fabric.Circle({
                                left:newX, top:newY, radius:maxR,
                                originX:'center', originY:'center',
                                fill:circleColor, stroke:null
                            });
                            shapes.push(circle);
                        }
                    }

                    const idx1 = state.palette.indexOf(values.col1);
                    const idx2 = state.palette.indexOf(values.col2);

                    return new fabric.Group(shapes, {
                        left:CARD_WIDTH / 2, top:CARD_HEIGHT / 2, originX:'center', originY:'center',
                        isParticleGroup:true, generativeType:'fill',
                        roleGradientStart:idx1 > -1 ?  idx1 :2, roleGradientEnd:idx2 > -1 ? idx2 :3
                    });
                }
            },

            'grid':{
                name:'Iso Grid',
                icon:'ph-grid-nine',
                description:'Isometric or square grid patterns',
                params:[
                    { id:'gap', type:'range', label:'Spacing', min:10, max:100, def:40 },
                    { id:'thick', type:'range', label:'Thickness', min:1, max:10, def:2 }
                ],
                generate:(values) => {
                    const gap = parseInt(values.gap);
                    const thick = parseInt(values.thick);
                    const size = 300;
                    const group = [];

                    for (let i = -size; i <= size; i += gap) {
                        group.push(new fabric.Rect({
                            left:i, top:-size, width:thick, height:size * 2,
                            fill:state.palette[1], roleFill:1
                        }));
                        group.push(new fabric.Rect({
                            left:-size, top:i, width:size * 2, height:thick,
                            fill:state.palette[1], roleFill:1
                        }));
                    }

                    return new fabric.Group(group, {
                        left:CARD_WIDTH / 2, top:CARD_HEIGHT / 2, originX:'center', originY:'center'
                    });
                }
            },

            'waves':{
                name:'Neo Waves',
                icon:'ph-waves',
                description:'Gradient interference patterns',
                params:[
                    { id:'col1', type:'color', label:'Start Color', def:state.palette[2], half:true },
                    { id:'col2', type:'color', label:'End Color', def:state.palette[3], half:true },
                    { id:'bend', type:'range', label:'Radial Bend', min:0, max:100, def:0, half:true },
                    { id:'gap', type:'range', label:'Line Gap', min:10, max:100, def:20, half:true },
                    { id:'amp', type:'range', label:'Height', min:0, max:300, def:50, half:true },
                    { id:'freq', type:'range', label:'Frequency', min:1, max:100, def:15, half:true },
                    { id:'phase', type:'range', label:'Organic Drift', min:0, max:50, def:3, step:0.1, half:true },
                    { id:'width', type:'range', label:'Stroke Width', min:0.5, max:5, def:1.5, step:0.1, half:true }
                ],
                generate:(values) => {
                    const width = CARD_WIDTH;
                    const height = CARD_HEIGHT;
                    const col1 = values.col1;
                    const col2 = values.col2;
                    const bend = parseInt(values.bend) / 100;
                    const amplitude = parseInt(values.amp);
                    const frequency = parseInt(values.freq) / 1000;
                    const ySpacing = parseInt(values.gap);
                    const phaseShift = parseFloat(values.phase) / 10;
                    const strokeWidth = parseFloat(values.width);

                    const totalLines = Math.ceil((height * 1.5) / ySpacing);
                    const xStep = 3;
                    const cx = width / 2;
                    const cy = height / 2;
                    const minRadius = Math.min(width, height) * 0.15;

                    let d = "";
                    for (let i = -10; i < totalLines; i++) {
                        const baseY = i * ySpacing;
                        const phaseOffset = i * phaseShift;
                        let isFirstPoint = true;

                        for (let x = -50; x <= width + 50; x += xStep) {
                            const waveY = Math.sin((x * frequency) + phaseOffset) * amplitude;
                            const linearX = x;
                            const linearY = baseY + waveY;
                            const angle = (x / width) * (Math.PI * 2) - (Math.PI / 2);
                            const radius = minRadius + baseY + waveY;
                            const polarX = cx + (Math.cos(angle) * radius);
                            const polarY = cy + (Math.sin(angle) * radius);
                            const finalX = linearX * (1 - bend) + polarX * bend;
                            const finalY = linearY * (1 - bend) + polarY * bend;
                            const fx = Math.round(finalX * 10) / 10;
                            const fy = Math.round(finalY * 10) / 10;

                            if (isFirstPoint) { d += `M ${fx} ${fy} `; isFirst = false; } 
                            else { d += `L ${fx} ${fy} `; }
                        }
                    }

                    const waveObj = new fabric.Path(d, {
                        fill:null, strokeWidth:strokeWidth,
                        strokeLineCap:'round', strokeLineJoin:'round',
                        originX:'center', originY:'center',
                        left:CARD_WIDTH / 2, top:CARD_HEIGHT / 2, objectCaching:false,
                        roleStroke:-99, roleFill:-99,
                        roleGradientStart:state.palette.indexOf(col1) > -1 ?  state.palette.indexOf(col1) :2,
                        roleGradientEnd:state.palette.indexOf(col2) > -1 ?  state.palette.indexOf(col2) :3
                    });

                    const gradient = new fabric.Gradient({
                        type:'linear', gradientUnits:'percentage',
                        coords:{ x1:0, y1:0, x2:1, y2:0 },
                        colorStops:[{ offset:0, color:col1 }, { offset:1, color:col2 }]
                    });
                    waveObj.set('stroke', gradient);

                    return waveObj;
                }
            },

            'topo': {
                name: 'Topography',
                icon: 'ph-map-trifold',
                description: 'Organic contour map textures',
                params: [
                    { id: 'col1', type: 'color', label: 'Start Color', def: state.palette[2], half: true },
                    { id: 'col2', type: 'color', label: 'End Color', def: state.palette[3], half: true },
                    { id: 'width', type: 'range', label: 'Line Width', min: 1, max: 5, def: 1.5, step: 0.1, half: true },
                    { id: 'gap', type: 'range', label: 'Spacing', min: 10, max: 100, def: 30, half: true },
                    { id: 'wobble', type: 'range', label: 'Distortion', min: 0, max: 100, def: 40, half: true },
                    { id: 'complex', type: 'range', label: 'Roughness', min: 1, max: 10, def: 3, half: true },
                    { id: 'seed', type: 'range', label: 'Seed/Shift', min: 0, max: 100, def: 1, half: true },
                    { id: 'res', type: 'range', label: 'Detail', min: 20, max: 100, def: 60, half: true }
                ],
                generate: (values) => {
                    const count = 25;
                    const gap = parseInt(values.gap);
                    const wobble = parseInt(values.wobble);
                    const complexity = parseInt(values.complex);
                    const seed = parseInt(values.seed);
                    const resolution = parseInt(values.res);

                    const getNoise = (angle, ringIndex) => {
                        let n = 0;
                        n += Math.sin(angle * complexity + seed + ringIndex) * 1.0;
                        n += Math.sin(angle * (complexity * 2) - seed) * 0.5;
                        const lowFreq = Math.ceil(complexity / 2); 
                        n += Math.cos(angle * lowFreq + ringIndex) * 0.8;
                        return n;
                    };

                    let pathData = "";
                    const safeCount = Math.min(count, 80);

                    for (let i = 1; i <= safeCount; i++) {
                        const baseRadius = i * gap;
                        if (baseRadius > Math.max(CARD_WIDTH, CARD_HEIGHT) * 1.5) break;

                        let isFirst = true;
                        for (let j = 0; j <= resolution; j++) {
                            const theta = (j / resolution) * Math.PI * 2;
                            const r = baseRadius + (getNoise(theta, i * 0.2) * wobble);
                            const x = (CARD_WIDTH / 2) + r * Math.cos(theta);
                            const y = (CARD_HEIGHT / 2) + r * Math.sin(theta);
                            const fx = Math.round(x * 10) / 10;
                            const fy = Math.round(y * 10) / 10;

                            if (isFirst) { pathData += `M ${fx} ${fy} `; isFirst = false; }
                            else { pathData += `L ${fx} ${fy} `; }
                        }
                        pathData += "Z ";
                    }

                    if (pathData.length < 10) pathData = "M 0 0 L 10 10";

                    const topoObj = new fabric.Path(pathData, {
                        fill: null, strokeWidth: parseFloat(values.width),
                        strokeLineCap: 'round', strokeLineJoin: 'round',
                        originX: 'center', originY: 'center',
                        left: CARD_WIDTH / 2, top: CARD_HEIGHT / 2, objectCaching: false,
                        roleStroke: -99, roleFill: -99,
                        roleGradientStart: state.palette.indexOf(values.col1) > -1 ? state.palette.indexOf(values.col1) : 2,
                        roleGradientEnd: state.palette.indexOf(values.col2) > -1 ? state.palette.indexOf(values.col2) : 3
                    });

                    const gradient = new fabric.Gradient({
                        type: 'linear', gradientUnits: 'percentage',
                        coords: { x1: 0, y1: 0, x2: 1, y2: 1 },
                        colorStops: [{ offset: 0, color: values.col1 }, { offset: 1, color: values.col2 }]
                    });
                    topoObj.set('stroke', gradient);

                    return topoObj;
                }
            },

            'flux':{
                name:'Flux Waves',
                icon:'ph-waves',
                description:'Stacked organic noise layers',
                params:[
                    { id:'col1', type:'color', label:'Start Color', def:state.palette[2], half:true },
                    { id:'col2', type:'color', label:'End Color', def:state.palette[3], half:true },
                    { id:'layers', type:'range', label:'Layers', min:3, max:12, def:6, half:true },
                    { id:'complex', type:'range', label:'Complexity', min:20, max:100, def:50, half:true },
                    { id:'height', type:'range', label:'Wave Height', min:20, max:200, def:80, half:true }
                ],
                generate:(values) => {
                    const layers = parseInt(values.layers);
                    const complexity = parseInt(values.complex);
                    const amp = parseInt(values.height);
                    const stepY = (CARD_HEIGHT * 0.85) / layers;
                    const localSimplex = new FastSimplex();
                    const group = [];

                    for (let i = 0; i < layers; i++) {
                        const baseY = (i * stepY) + (CARD_HEIGHT * 0.15);
                        let pathData = `M -50 ${CARD_HEIGHT} L -50 ${baseY} `;
                        for (let x = -50; x <= CARD_WIDTH + 50; x += 20) {
                            const n = localSimplex.noise2D(x / (400 - complexity * 2), i * 0.3);
                            const y = baseY + (n * amp);
                            pathData += `L ${x} ${y} `;
                        }
                        pathData += `L ${CARD_WIDTH + 50} ${CARD_HEIGHT} Z`;

                        const grad = new fabric.Gradient({
                            type:'linear', gradientUnits:'percentage',
                            coords:{ x1:0, y1:0, x2:0, y2:1 },
                            colorStops:[{ offset:0, color:values.col1 }, { offset:1, color:values.col2 }]
                        });

                        const shape = new fabric.Path(pathData, {
                            fill:grad, stroke:null, objectCaching:false,
                            roleGradientStart:state.palette.indexOf(values.col1) > -1 ? state.palette.indexOf(values.col1) :2,
                            roleGradientEnd:state.palette.indexOf(values.col2) > -1 ? state.palette.indexOf(values.col2) :3
                        });
                        group.push(shape);
                    }

                    return new fabric.Group(group, {
                        left:CARD_WIDTH / 2, top:CARD_HEIGHT, originX:'center', originY:'bottom',
                        isParticleGroup:true, generativeType:'fill'
                    });
                }
            },

            'circuit': {
                name: 'Tech Circuits',
                icon: 'ph-cpu',
                description: 'Grid-aligned PCB traces',
                params: [
                    { id: 'col1', type: 'color', label: 'Start Color', def: state.palette[2], half: true },
                    { id: 'col2', type: 'color', label: 'End Color', def: state.palette[3], half: true },
                    { id: 'grid', type: 'range', label: 'Grid Size', min: 20, max: 80, def: 40, half: true },
                    { id: 'density', type: 'range', label: 'Density', min: 10, max: 100, def: 50, half: true },
                    { id: 'width', type: 'range', label: 'Trace Width', min: 1, max: 8, def: 3, half: true },
                    { id: 'style', type: 'range', label: 'Tech Style', min: 0, max: 2, def: 0, half: true }
                ],
                generate: (values) => {
                    const gridSize = parseInt(values.grid);
                    const density = parseInt(values.density);
                    const width = parseInt(values.width);
                    const style = parseInt(values.style);
                    
                    const cols = Math.ceil(CARD_WIDTH / gridSize);
                    const rows = Math.ceil(CARD_HEIGHT / gridSize);
                    const groupObjects = [];

                    const getGridPoint = () => ({
                        x: Math.floor(Math.random() * cols) * gridSize,
                        y: Math.floor(Math.random() * rows) * gridSize
                    });

                    for (let i = 0; i < density; i++) {
                        const start = getGridPoint();
                        const xDir = Math.random() > 0.5 ? 1 : -1;
                        const yDir = Math.random() > 0.5 ? 1 : -1;
                        const xLen = (Math.floor(Math.random() * 3) + 1) * gridSize * xDir;
                        const yLen = (Math.floor(Math.random() * 3) + 1) * gridSize * yDir;
                        const end = { x: start.x + xLen, y: start.y + yLen };

                        let d = "";
                        if (style === 2) { 
                            const midX = start.x + xLen;
                            d = `M ${start.x} ${start.y} L ${midX} ${start.y} L ${midX} ${end.y}`;
                        } else {
                            const chamfer = Math.min(Math.abs(xLen), Math.abs(yLen)) / 2;
                            const midX = start.x + xLen - (chamfer * xDir);
                            d = `M ${start.x} ${start.y} L ${midX} ${start.y} L ${start.x + xLen} ${start.y + (chamfer * yDir)} L ${end.x} ${end.y}`;
                        }

                        const t = Math.max(0, Math.min(1, start.y / CARD_HEIGHT));
                        const color = Utils.getInterpColor(values.col1, values.col2, t);

                        groupObjects.push(new fabric.Path(d, {
                            fill: null, stroke: color, strokeWidth: width,
                            strokeLineCap: style === 0 ? 'round' : 'square',
                            strokeLineJoin: style === 0 ? 'round' : 'miter',
                            objectCaching: false
                        }));

                        if (style === 0) {
                            groupObjects.push(new fabric.Circle({
                                left: start.x, top: start.y, radius: width * 1.5,
                                fill: color, originX: 'center', originY: 'center'
                            }));
                        } else {
                            const hexSize = width * 2;
                            groupObjects.push(new fabric.Rect({
                                left: start.x, top: start.y, width: hexSize, height: hexSize,
                                fill: color, originX: 'center', originY: 'center', angle: 45
                            }));
                        }

                        groupObjects.push(new fabric.Circle({
                            left: end.x, top: end.y, radius: width,
                            fill: color, originX: 'center', originY: 'center'
                        }));
                    }

                    const idx1 = state.palette.indexOf(values.col1);
                    const idx2 = state.palette.indexOf(values.col2);

                    return new fabric.Group(groupObjects, {
                        left: CARD_WIDTH / 2, top: CARD_HEIGHT / 2, originX: 'center', originY: 'center',
                        isParticleGroup: true, generativeType: 'fill', 
                        roleGradientStart: idx1 > -1 ? idx1 : 2, roleGradientEnd: idx2 > -1 ? idx2 : 3
                    });
                }
            },

            'halftone': {
                name: 'Halftone Fade',
                icon: 'ph-dots-nine',
                description: 'Comic book style gradient dots',
                params: [
                    { id: 'col1', type: 'color', label: 'Start Color', def: state.palette[2], half: true },
                    { id: 'col2', type: 'color', label: 'End Color', def: state.palette[3], half: true },
                    { id: 'size', type: 'range', label: 'Max Dot Size', min: 5, max: 40, def: 15, half: true },
                    { id: 'gap', type: 'range', label: 'Grid Spacing', min: 10, max: 50, def: 20, half: true },
                    { id: 'angle', type: 'range', label: 'Direction', min: 0, max: 360, def: 45 }
                ],
                generate: (values) => {
                    const maxR = parseInt(values.size) / 2;
                    const gap = parseInt(values.gap);
                    const angleRad = (parseInt(values.angle) * Math.PI) / 180;
                    
                    const dots = [];
                    const cos = Math.cos(angleRad);
                    const sin = Math.sin(angleRad);
                    const diag = Math.hypot(CARD_WIDTH, CARD_HEIGHT);

                    for (let x = 0; x <= CARD_WIDTH; x += gap) {
                        for (let y = 0; y <= CARD_HEIGHT; y += gap) {
                            const cx = x - CARD_WIDTH / 2;
                            const cy = y - CARD_HEIGHT / 2;
                            const projection = (cx * cos + cy * sin);
                            let norm = (projection / diag) + 0.5;
                            norm = Math.max(0, Math.min(1, norm)); 
                            
                            const r = maxR * norm;
                            const dotColor = Utils.getInterpColor(values.col1, values.col2, norm);
                            
                            if (r > 0.5) {
                                dots.push(new fabric.Circle({
                                    left: x, top: y, radius: r, fill: dotColor,
                                    originX: 'center', originY: 'center'
                                }));
                            }
                        }
                    }
                    
                    const idx1 = state.palette.indexOf(values.col1);
                    const idx2 = state.palette.indexOf(values.col2);

                    return new fabric.Group(dots, {
                        left: CARD_WIDTH / 2, top: CARD_HEIGHT / 2, originX: 'center', originY: 'center',
                        isParticleGroup: true, generativeType: 'fill',
                        roleGradientStart: idx1 > -1 ? idx1 : 2, roleGradientEnd: idx2 > -1 ? idx2 : 3
                    });
                }
            },

            'arcane': {
                name: 'Arcane Sigil',
                icon: 'ph-star-four',
                description: 'Procedural magic circles and runes',
                params: [
                    { id: 'col1', type: 'color', label: 'Center Color', def: state.palette[2], half: true },
                    { id: 'col2', type: 'color', label: 'Outer Color', def: state.palette[3], half: true },
                    { id: 'rings', type: 'range', label: 'Complexity', min: 2, max: 8, def: 4, half: true },
                    { id: 'width', type: 'range', label: 'Line Width', min: 1, max: 5, def: 2, half: true },
                    { id: 'detail', type: 'checkbox', label: 'Add Glyphs', def: true }
                ],
                generate: (values) => {
                    const rings = parseInt(values.rings);
                    const width = parseInt(values.width);
                    const addGlyphs = values.detail;
                    const group = [];
                    const center = { x: CARD_WIDTH / 2, y: CARD_HEIGHT / 2 };
                    let currentRadius = 50;
                    
                    for (let i = 0; i < rings; i++) {
                        currentRadius += 20 + Math.random() * 40;
                        const t = i / (rings - 1 || 1); 
                        const color = Utils.getInterpColor(values.col1, values.col2, t);

                        group.push(new fabric.Circle({
                            radius: currentRadius, left: center.x, top: center.y,
                            originX: 'center', originY: 'center', fill: null,
                            stroke: color, strokeWidth: width
                        }));

                        if (Math.random() > 0.3) {
                            const sides = Math.floor(Math.random() * 3) + 3;
                            const points = [];
                            const step = (Math.PI * 2) / sides;
                            const offset = Math.random() * Math.PI;
                            for(let j=0; j<sides; j++) {
                                points.push({
                                    x: center.x + currentRadius * Math.cos(j * step + offset),
                                    y: center.y + currentRadius * Math.sin(j * step + offset)
                                });
                            }
                            group.push(new fabric.Polygon(points, {
                                fill: null, stroke: color, strokeWidth: width / 2, selectable: false
                            }));
                        }

                        if (addGlyphs && Math.random() > 0.4) {
                            const glyphCount = 8 + Math.floor(Math.random() * 8);
                            const step = (Math.PI * 2) / glyphCount;
                            for(let g=0; g<glyphCount; g++) {
                                const angle = g * step;
                                const gx = center.x + (currentRadius - 10) * Math.cos(angle);
                                const gy = center.y + (currentRadius - 10) * Math.sin(angle);
                                const glyphSize = 3 + Math.random() * 3;
                                
                                if (g % 2 === 0) {
                                    group.push(new fabric.Circle({
                                        radius: glyphSize, left: gx, top: gy,
                                        originX: 'center', originY: 'center', fill: color
                                    }));
                                } else {
                                     group.push(new fabric.Rect({
                                        width: glyphSize*1.5, height: glyphSize*1.5,
                                        left: gx, top: gy, originX: 'center', originY: 'center',
                                        fill: null, stroke: color, strokeWidth: 1, angle: 45
                                    }));
                                }
                            }
                        }
                    }

                    const idx1 = state.palette.indexOf(values.col1);
                    const idx2 = state.palette.indexOf(values.col2);

                    return new fabric.Group(group, {
                        left: CARD_WIDTH / 2, top: CARD_HEIGHT / 2, originX: 'center', originY: 'center',
                        isParticleGroup: true, generativeType: 'stroke', 
                        roleGradientStart: idx1 > -1 ? idx1 : 2, roleGradientEnd: idx2 > -1 ? idx2 : 3
                    });
                }
            }
        }
    };
})();
