      // ========================================
        // GENERATOR UI MODULE
        // ========================================
        
        const GenUI = {
            currentGen:null,
            previewCanvas:null,

            getPreviewSize:function() {
                const w = Math.min(window.innerWidth * 0.45, 220);
                const h = w * (CARD_HEIGHT / CARD_WIDTH);
                return { w, h, scale:w / CARD_WIDTH };
            },

            showList:function() {
                const container = Utils.getElement('gen-content');
                const header = Utils.getElement('gen-header-title');
                const backBtn = Utils.getElement('gen-back-btn');

                if (this.previewCanvas) {
                    this.previewCanvas.dispose();
                    this.previewCanvas = null;
                }

                if (header) header.innerText = 'Select Generator';
                if (backBtn) backBtn.classList.add('hidden');

                let html = `
                    <div class="mb-6 pb-4 border-b border-gray-100">
                        <span class="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-3 block">Quick Shapes</span>
                        <div class="flex gap-4 overflow-x-auto pb-2 no-scrollbar" role="group" aria-label="Basic shapes">
                            <button onclick="DeckForge.Canvas.addShape('rect')" class="w-10 h-10 shrink-0 bg-gray-100 rounded-lg flex items-center justify-center text-gray-500 hover:text-blue-600 hover:bg-blue-50 transition" aria-label="Add rectangle">
                                <i class="ph-bold ph-square text-xl" aria-hidden="true"></i>
                            </button>
                            <button onclick="DeckForge.Canvas.addShape('circle')" class="w-10 h-10 shrink-0 bg-gray-100 rounded-lg flex items-center justify-center text-gray-500 hover:text-blue-600 hover:bg-blue-50 transition" aria-label="Add circle">
                                <i class="ph-bold ph-circle text-xl" aria-hidden="true"></i>
                            </button>
                            <button onclick="DeckForge.Canvas.addShape('triangle')" class="w-10 h-10 shrink-0 bg-gray-100 rounded-lg flex items-center justify-center text-gray-500 hover:text-blue-600 hover:bg-blue-50 transition" aria-label="Add triangle">
                                <i class="ph-bold ph-triangle text-xl" aria-hidden="true"></i>
                            </button>
                            <button onclick="DeckForge.Canvas.addShape('star')" class="w-10 h-10 shrink-0 bg-gray-100 rounded-lg flex items-center justify-center text-gray-500 hover:text-blue-600 hover:bg-blue-50 transition" aria-label="Add star">
                                <i class="ph-bold ph-star text-xl" aria-hidden="true"></i>
                            </button>
                            <button onclick="DeckForge.Canvas.addShape('hexagon')" ...><i class="ph-bold ph-hexagon text-xl"></i></button>
                            <button onclick="DeckForge.Canvas.addShape('shield')" ...><i class="ph-bold ph-shield text-xl"></i></button>
                            <button onclick="DeckForge.Canvas.addShape('diamond')" ...><i class="ph-bold ph-diamond text-xl"></i></button>
                            <div class="w-px h-10 bg-gray-200 mx-1" aria-hidden="true"></div>
                            <button onclick="DeckForge.Canvas.addShape('placeholder')" 
                                    class="w-10 h-10 shrink-0 bg-gray-100 rounded-lg flex items-center justify-center text-gray-500 hover:text-blue-600 hover:bg-blue-50 transition" 
                                    aria-label="Add placeholder image box">
                                <i class="ph-bold ph-image-square text-xl" aria-hidden="true"></i>
                            </button>
                            <button onclick="DeckForge.Canvas.addShape('safe')" class="flex flex-col items-center gap-2 group shrink-0" title="Safe Zone Guide" aria-label="Add safe zone guide">
                                <div class="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center text-gray-500 hover:text-blue-600 hover:bg-blue-50 transition">
                                    <i class="ph-bold ph-frame-corners text-xl" aria-hidden="true"></i>
                                </div>
                            </button>
                        </div>
                    </div>
                `;

                                html += `<div class="grid grid-cols-2 gap-3" role="list" aria-label="Pattern generators">`;
                
                Object.keys(Generators.registry).forEach(key => {
                    const gen = Generators.registry[key];
                    html += `
                        <button onclick="DeckForge.GenUI.openGenerator('${key}')" 
                                class="flex flex-col items-center p-4 bg-gray-50 hover:bg-blue-50 border border-gray-100 rounded-xl transition group text-center"
                                role="listitem"
                                aria-label="Create ${gen.name} pattern">
                            <i class="ph-bold ${gen.icon} text-3xl text-gray-400 group-hover:text-blue-600 mb-2" aria-hidden="true"></i>
                            <span class="text-xs font-bold text-gray-600 group-hover:text-blue-700">${gen.name}</span>
                        </button>
                    `;
                });
                
                html += `</div>`;

                if (container) container.innerHTML = html;
            },

            openGenerator:function(key) {
                this.currentGen = key;
                const gen = Generators.registry[key];
                
                if (!gen) {
                    console.error('Generator not found:', key);
                    return;
                }

                const container = Utils.getElement('gen-content');
                const header = Utils.getElement('gen-header-title');
                const backBtn = Utils.getElement('gen-back-btn');

                if (header) header.innerText = gen.name;
                if (backBtn) backBtn.classList.remove('hidden');

                const size = this.getPreviewSize();

                let html = `
                    <div class="flex justify-center mb-4">
                        <div class="rounded-xl border border-gray-200 overflow-hidden shadow-sm bg-white relative">
                            <div class="absolute inset-0 opacity-20 pointer-events-none" style="background-image:radial-gradient(#94a3b8 1px, transparent 1px); background-size:10px 10px;"></div>
                            <canvas id="preview-c" width="${size.w}" height="${size.h}" aria-label="Pattern preview"></canvas>
                        </div>
                    </div>
                    <div class="space-y-4 animate-fade-in pb-4">
                    <div class="grid grid-cols-2 gap-3">
                `;

                gen.params.forEach(p => {
                    const colSpan = p.half ? 'col-span-1' :'col-span-2';

                    if (p.type === 'range') {
                        html += `
                            <div class="${colSpan}">
                                <div class="flex justify-between text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">
                                    <label for="input-${p.id}">${p.label}</label>
                                    <span id="val-${p.id}">${p.def}</span>
                                </div>
                                <input type="range" 
                                       id="input-${p.id}" 
                                       min="${p.min}" 
                                       max="${p.max}" 
                                       value="${p.def}" 
                                       step="${p.step || 1}"
                                       class="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                                       aria-label="${p.label}">
                            </div>
                        `;
                    } else if (p.type === 'color') {
                        html += `
                            <div class="${colSpan}">
                                <div class="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">
                                    <span>${p.label}</span>
                                </div>
                                <input type="hidden" id="input-${p.id}" value="${p.def}">
                                <div class="flex gap-1" role="group" aria-label="${p.label} options">
                        `;
                        state.palette.forEach(color => {
                            html += `
                                <button type="button"
                                        onclick="document.getElementById('input-${p.id}').value = '${color}'; DeckForge.GenUI.debouncedUpdatePreview();"
                                        class="w-6 h-6 rounded cursor-pointer border border-gray-200 hover:scale-110 transition shadow-sm"
                                        style="background-color:${color};"
                                        aria-label="Select color ${color}"></button>
                            `;
                        });
                        html += `</div></div>`;
                    } else if (p.type === 'checkbox') {
                        html += `
                            <div class="${colSpan} flex items-center justify-between bg-gray-50 p-3 rounded-xl border border-gray-200">
                                <label for="input-${p.id}" class="text-[10px] font-bold text-gray-500 uppercase tracking-widest">${p.label}</label>
                                <div class="relative inline-block w-10 align-middle select-none">
                                    <input type="checkbox" 
                                           id="input-${p.id}" 
                                           ${p.def ? 'checked' :''}
                                           class="toggle-checkbox absolute block w-5 h-5 rounded-full bg-white border-4 appearance-none cursor-pointer transition-all duration-200 top-0 left-0"
                                           aria-label="${p.label}"/>
                                    <label for="input-${p.id}" class="toggle-label block overflow-hidden h-5 rounded-full bg-gray-300 cursor-pointer transition-colors duration-200"></label>
                                </div>
                            </div>
                        `;
                    } else if (p.type === 'text') {
                        html += `
                            <div class="${colSpan}">
                                <label for="input-${p.id}" class="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1 block">${p.label}</label>
                                <textarea id="input-${p.id}" 
                                          rows="4"
                                          class="w-full p-2 bg-gray-100 rounded-lg border border-gray-200 text-[10px] font-mono font-bold text-gray-700 focus:outline-none focus:border-blue-500 transition resize-y"
                                          aria-label="${p.label}">${p.def}</textarea>
                            </div>
                        `;
                    }
                });

                html += `
                    </div>
                    <button onclick="DeckForge.GenUI.run()" 
                            class="w-full py-3 bg-blue-600 text-white font-bold rounded-xl shadow-lg shadow-blue-200 active:scale-95 transition mt-2">
                        Add to Canvas
                    </button>
                </div>
                `;

                if (container) container.innerHTML = html;

                // Setup input listeners with debouncing
                setTimeout(() => {
                    const dims = this.getPreviewSize();
                    this.previewCanvas = new fabric.Canvas('preview-c', {
                        width:dims.w,
                        height:dims.h,
                        backgroundColor:'transparent',
                        selection:false,
                        renderOnAddRemove:false
                    });
                    this.previewCanvas.setZoom(dims.scale);

                    // Add event listeners to inputs
                    gen.params.forEach(p => {
                        const input = Utils.getElement(`input-${p.id}`);
                        if (input) {
                            if (p.type === 'range') {
                                input.addEventListener('input', (e) => {
                                    Utils.setText(`val-${p.id}`, e.target.value);
                                    this.debouncedUpdatePreview();
                                });
                            } else if (p.type === 'checkbox' || p.type === 'text') {
                                input.addEventListener('input', () => this.debouncedUpdatePreview());
                            }
                        }
                    });

                    this.updatePreview();
                }, 50);
            },

            updatePreview:function() {
                if (!this.currentGen || !this.previewCanvas) return;

                const gen = Generators.registry[this.currentGen];
                if (!gen) return;

                const values = {};
                gen.params.forEach(p => {
                    const el = Utils.getElement(`input-${p.id}`);
                    if (el) {
                        values[p.id] = (p.type === 'checkbox') ? el.checked :el.value;
                    }
                });

                try {
                    const fabricObj = gen.generate(values);
                    this.previewCanvas.clear();
                    fabricObj.set({
                        selectable:false,
                        evented:false,
                        hasControls:false,
                        hasBorders:false
                    });
                    this.previewCanvas.add(fabricObj);
                    this.previewCanvas.requestRenderAll();
                } catch (e) {
                    console.error('Preview generation error:', e);
                }
            },

            debouncedUpdatePreview:Utils.debounce(function() {
                GenUI.updatePreview();
            }, DEBOUNCE_DELAY),

            run:function() {
                if (!this.currentGen) return;

                const gen = Generators.registry[this.currentGen];
                if (!gen) return;

                const values = {};
                gen.params.forEach(p => {
                    const el = Utils.getElement(`input-${p.id}`);
                    if (el) {
                        values[p.id] = (p.type === 'checkbox') ? el.checked :el.value;
                    }
                });

                try {
                    const fabricObj = gen.generate(values);
                    fabricObj.set({ selectable:true, evented:true });
                    canvas.add(fabricObj);
                    canvas.setActiveObject(fabricObj);
                    canvas.requestRenderAll();
                    History.save();
                    UI.closeAllDrawers();
                } catch (e) {
                    console.error('Generator run error:', e);
                    alert('Error generating pattern. Please try again.');
                }
            }
        };

        // ========================================
        // GENERATORS MODULE
        // ========================================
        
        const Generators = {
            registry:{
                'smartsvg':{
                    name:'Smart Vector',
                    icon:'ph-vector-three',
                    description:'Theme-reactive SVG importer',
                    params:[
                        { id:'code', type:'text', label:'Paste SVG Code', def:'<svg viewBox="0 0 100 100"><circle cx="50" cy="50" r="40" fill="#000" /></svg>' },
                        { id:'scale', type:'range', label:'Scale', min:10, max:200, def:80, half:true },
                        { id:'force', type:'range', label:'Color Force', min:0, max:100, def:100, half:true },
                        { id:'constrain', type:'checkbox', label:'Snap to Theme', def:true, half:false }
                    ],
                    generate:(values) => {
                        const group = new fabric.Group([], {
                            left:CARD_WIDTH / 2,
                            top:CARD_HEIGHT / 2,
                            originX:'center',
                            originY:'center',
                            objectCaching:false
                        });

                        fabric.loadSVGFromString(values.code, (objects, options) => {
                            if (!objects || objects.length === 0) return;

                            const shouldSnap = values.constrain;

                            const findBestRole = (colorString) => {
                                if (!shouldSnap) return -99;
                                if (!colorString || colorString === 'none' || colorString === 'transparent') return -99;
                                if (typeof chroma === 'undefined') return -99;

                                let bestRole = -99;
                                let minDistance = Infinity;

                                state.palette.forEach((themeColor, index) => {
                                    try {
                                        const dist = chroma.distance(colorString, themeColor);
                                        if (dist < minDistance && dist < (parseInt(values.force) + 20)) {
                                            minDistance = dist;
                                            bestRole = index;
                                        }
                                    } catch (e) { /* Ignore */ }
                                });
                                return bestRole;
                            };

                            const processObj = (o) => {
                                o.set('objectCaching', false);

                                if (o.fill) {
                                    if (typeof o.fill === 'string' && o.fill !== 'none') {
                                        const role = findBestRole(o.fill);
                                        if (role !== -99) {
                                            o.roleFill = role;
                                            o.set('fill', state.palette[role]);
                                        }
                                    } else if (typeof o.fill === 'object' && o.fill.colorStops) {
                                        o.fill.colorStops.forEach(stop => {
                                            const role = findBestRole(stop.color);
                                            if (role !== -99) stop.color = state.palette[role];
                                        });
                                    }
                                }

                                if (o.stroke && typeof o.stroke === 'string' && o.stroke !== 'none') {
                                    const role = findBestRole(o.stroke);
                                    if (role !== -99) {
                                        o.roleStroke = role;
                                        o.set('stroke', state.palette[role]);
                                    }
                                }

                                if (o.getObjects) o.getObjects().forEach(processObj);
                            };

                            const loadedObj = fabric.util.groupSVGElements(objects, options);
                            loadedObj.set({ left:0, top:0, originX:'center', originY:'center' });

                            const targetScale = parseInt(values.scale) / 100;
                            const maxSize = Math.min(CARD_WIDTH, CARD_HEIGHT) * 0.8 * targetScale;
                            if (loadedObj.width > loadedObj.height) {
                                loadedObj.scaleToWidth(maxSize);
                            } else {
                                loadedObj.scaleToHeight(maxSize);
                            }

                            processObj(loadedObj);
                            group.addWithUpdate(loadedObj);
                            if (group.canvas) group.canvas.requestRenderAll();
                        });

                        return group;
                    }
                },

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
        { id: 'col1', type: 'color', label: 'Top Color', def: state.palette[2], half: true },
        { id: 'col2', type: 'color', label: 'Bottom Color', def: state.palette[3], half: true },
        { id: 'sunSize', type: 'range', label: 'Sun Size', min: 100, max: 600, def: 350, half: true },
        { id: 'curve', type: 'range', label: 'Perspective', min: 1, max: 50, def: 20, half: true }, // Controls how fast lines get thin
        { id: 'gap', type: 'range', label: 'Line Gap', min: 2, max: 20, def: 8, half: true },
        { id: 'invert', type: 'checkbox', label: 'Invert Mask', def: false }
    ],
    generate: (values) => {
        const width = CARD_WIDTH;
        const height = CARD_HEIGHT;
        const sunR = parseInt(values.sunSize);
        const gap = parseInt(values.gap);
        const curveStrength = parseInt(values.curve) / 10;
        const isInverted = values.invert;

        // 1. Create the Artwork Content (The shapes that will be visible)
        // We create a group containing the background and the two suns.
        
        // Background Rect
        const bg = new fabric.Rect({
            width: width, 
            height: height,
            left: 0, 
            top: 0,
            originX: 'center', 
            originY: 'center',
            fill: values.col1 // Placeholder color
        });

        // Top Sun
        const sunTop = new fabric.Circle({
            radius: sunR,
            left: 0,
            top: -height/2, // Centered on top edge
            originX: 'center', 
            originY: 'center',
            fill: values.col1
        });

        // Bottom Sun (Reflection)
        const sunBot = new fabric.Circle({
            radius: sunR,
            left: 0,
            top: height/2, // Centered on bottom edge
            originX: 'center', 
            originY: 'center',
            fill: values.col1
        });

        // 2. Create the Mask (The "Blinds" effect)
        // We generate a series of rectangles. Where a rectangle exists, the art is visible.
        const maskLines = [];
        let currentY = -height / 2;
        
        // We loop from top to bottom
        while (currentY < height / 2) {
            // Calculate distance from the "horizon" (center)
            // Range 0 (center) to 1 (edge)
            const dist = Math.abs(currentY) / (height / 2);
            
            // Perspective logic: Lines are thicker at edges, thinner at center
            // We use a power function to curve the thickness reduction
            let thickness = Math.max(1, 40 * Math.pow(dist, curveStrength));
            
            // Create the strip
            const strip = new fabric.Rect({
                width: width,
                height: thickness,
                left: 0,
                top: currentY,
                originX: 'center',
                originY: 'top', // Draw downwards
                fill: 'black' // Color irrelevant for clipPath, but needed for rendering
            });
            
            maskLines.push(strip);
            
            // Increment Y
            currentY += thickness + gap;
        }

        const maskGroup = new fabric.Group(maskLines, {
            originX: 'center',
            originY: 'center',
            objectCaching: false
        });

        // 3. Assemble
        // Group the artwork logic
        const artGroup = new fabric.Group([bg, sunTop, sunBot], {
            left: CARD_WIDTH / 2,
            top: CARD_HEIGHT / 2,
            originX: 'center',
            originY: 'center',
            objectCaching: false
        });

        // Apply the mask
        // Note: Inverted logic could be achieved by swapping mask/gap logic, 
        // but for now we stick to the standard clipPath behavior.
        artGroup.clipPath = maskGroup;

        // 4. Apply Theme Logic
        // We apply the roles to the *Group* itself. The DeckForge theme engine
        // will apply a Linear Gradient across the entire group bounding box.
        const idx1 = state.palette.indexOf(values.col1);
        const idx2 = state.palette.indexOf(values.col2);

        artGroup.set({
            roleGradientStart: idx1 > -1 ? idx1 : 2,
            roleGradientEnd: idx2 > -1 ? idx2 : 3,
            gradBalance: 0 // Ensure centered gradient
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
        { id: 'chaos', type: 'range', label: 'Flow Scale', min: 100, max: 800, def: 400, half: true }, // Higher = smoother curves
        { id: 'len', type: 'range', label: 'Length', min: 10, max: 100, def: 40, half: true },
        { id: 'width', type: 'range', label: 'Stroke', min: 0.5, max: 4, def: 1.5, step: 0.1, half: true }
    ],
    generate: (values) => {
        const count = parseInt(values.count);
        const scale = parseInt(values.chaos); // Renamed visual label to "Flow Scale"
        const len = parseInt(values.len);
        const width = parseFloat(values.width);
        
        // Re-initialize noise for unique patterns every click
        const localSimplex = new FastSimplex();
        const paths = [];

        for (let i = 0; i < count; i++) {
            let x = Math.random() * CARD_WIDTH;
            let y = Math.random() * CARD_HEIGHT;
            
            const startY = y; // Save for gradient calculation
            
            // Start the path string
            let d = `M ${x} ${y}`;
            
            // Generate points
            let points = [{x, y}];
            
            for (let j = 0; j < len; j++) {
                // Use larger division for 'scale' to get sweeping curves instead of jitter
                const angle = localSimplex.noise2D(x / scale, y / scale) * Math.PI * 2;
                
                // Move in the direction of the angle
                x += Math.cos(angle) * 5; 
                y += Math.sin(angle) * 5;
                points.push({x, y});
            }

            // Convert points to smooth Quadratic Bezier curves
            // This technique takes the midpoint between points as the anchor
            for (let k = 0; k < points.length - 1; k++) {
                const p0 = points[k];
                const p1 = points[k + 1];
                
                if (k === 0) {
                    d += ` L ${p1.x} ${p1.y}`;
                } else {
                    // Calculate midpoint
                    const mx = (p0.x + p1.x) / 2;
                    const my = (p0.y + p1.y) / 2;
                    // Draw curve to midpoint using p0 as control
                    d += ` Q ${p0.x} ${p0.y} ${mx} ${my}`;
                }
            }

            // Calculate gradient position (0 to 1)
            const t = Math.max(0, Math.min(1, startY / CARD_HEIGHT));
            const lineColor = Utils.getInterpColor(values.col1, values.col2, t);

            const path = new fabric.Path(d, {
                fill: null,
                stroke: lineColor,
                strokeWidth: width,
                strokeLineCap: 'round',
                strokeLineJoin: 'round',
                // Varied opacity creates depth
                opacity: 0.3 + (Math.random() * 0.5), 
                objectCaching: false
            });
            paths.push(path);
        }

        const idx1 = state.palette.indexOf(values.col1);
        const idx2 = state.palette.indexOf(values.col2);

        return new fabric.Group(paths, {
            left: CARD_WIDTH / 2,
            top: CARD_HEIGHT / 2,
            originX: 'center',
            originY: 'center',
            isParticleGroup: true,
            generativeType: 'stroke',
            roleGradientStart: idx1 > -1 ? idx1 : 2,
            roleGradientEnd: idx2 > -1 ? idx2 : 3
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
                                    left:newX,
                                    top:newY,
                                    radius:maxR,
                                    originX:'center',
                                    originY:'center',
                                    fill:circleColor,
                                    stroke:null
                                });
                                shapes.push(circle);
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
                            roleGradientStart:idx1 > -1 ?  idx1 :2,
                            roleGradientEnd:idx2 > -1 ? idx2 :3
                        });
                    }
                },

                'sunburst':{
                    name:'Sunburst',
                    icon:'ph-sun',
                    description:'Create retro sunburst backgrounds',
                    params:[
                        { id:'rays', type:'range', label:'Ray Count', min:4, max:40, def:12 },
                        { id:'inner', type:'range', label:'Center Size', min:0, max:100, def:20 }
                    ],
                    generate:(values) => {
                        const rays = parseInt(values.rays);
                        const inner = parseInt(values.inner);
                        const radius = 150;
                        const center = { x:0, y:0 };
                        const points = [];

                        const step = (Math.PI * 2) / rays;
                        for (let i = 0; i < rays; i++) {
                            const angle = i * step;
                            points.push({
                                x:center.x + radius * Math.cos(angle),
                                y:center.y + radius * Math.sin(angle)
                            });
                            points.push({
                                x:center.x + inner * Math.cos(angle + step / 2),
                                y:center.y + inner * Math.sin(angle + step / 2)
                            });
                        }

                        const shape = new fabric.Polygon(points, {
                            left:CARD_WIDTH / 2,
                            top:CARD_HEIGHT / 2,
                            originX:'center',
                            originY:'center',
                            fill:state.palette[2],
                            roleFill:2,
                            stroke:null,
                            roleStroke:-1
                        });

                        return shape;
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
                                left:i,
                                top:-size,
                                width:thick,
                                height:size * 2,
                                fill:state.palette[1],
                                roleFill:1
                            }));
                            group.push(new fabric.Rect({
                                left:-size,
                                top:i,
                                width:size * 2,
                                height:thick,
                                fill:state.palette[1],
                                roleFill:1
                            }));
                        }

                        return new fabric.Group(group, {
                            left:CARD_WIDTH / 2,
                            top:CARD_HEIGHT / 2,
                            originX:'center',
                            originY:'center'
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

                                if (isFirstPoint) {
                                    d += `M ${fx} ${fy} `;
                                    isFirstPoint = false;
                                } else {
                                    d += `L ${fx} ${fy} `;
                                }
                            }
                        }

                        const waveObj = new fabric.Path(d, {
                            fill:null,
                            strokeWidth:strokeWidth,
                            strokeLineCap:'round',
                            strokeLineJoin:'round',
                            originX:'center',
                            originY:'center',
                            left:CARD_WIDTH / 2,
                            top:CARD_HEIGHT / 2,
                            objectCaching:false,
                            roleStroke:-99,
                            roleFill:-99,
                            roleGradientStart:state.palette.indexOf(col1) > -1 ?  state.palette.indexOf(col1) :2,
                            roleGradientEnd:state.palette.indexOf(col2) > -1 ?  state.palette.indexOf(col2) :3
                        });

                        const gradient = new fabric.Gradient({
                            type:'linear',
                            gradientUnits:'percentage',
                            coords:{ x1:0, y1:0, x2:1, y2:0 },
                            colorStops:[
                                { offset:0, color:col1 },
                                { offset:1, color:col2 }
                            ]
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
        const count = 25; // Increased count slightly to fill corners better
        const gap = parseInt(values.gap);
        const wobble = parseInt(values.wobble);
        const complexity = parseInt(values.complex);
        const seed = parseInt(values.seed);
        const resolution = parseInt(values.res);

        // FIX: Ensure all frequency multipliers are Integers to prevent seams
        const getNoise = (angle, ringIndex) => {
            let n = 0;
            // Term 1: Main wobble (Integer freq)
            n += Math.sin(angle * complexity + seed + ringIndex) * 1.0;
            
            // Term 2: High freq detail (Integer freq)
            n += Math.sin(angle * (complexity * 2) - seed) * 0.5;
            
            // Term 3: Low freq variation (Fixed to be Integer)
            // Was: complexity * 0.5 (Caused seam on odd numbers)
            // Now: Math.ceil(complexity / 2) (Always Integer)
            const lowFreq = Math.ceil(complexity / 2); 
            n += Math.cos(angle * lowFreq + ringIndex) * 0.8;
            
            return n;
        };

        let pathData = "";
        
        // Increase render distance to ensure corners are covered
        const safeCount = Math.min(count, 80);

        for (let i = 1; i <= safeCount; i++) {
            const baseRadius = i * gap;
            // Stop if we are way off screen to save performance
            if (baseRadius > Math.max(CARD_WIDTH, CARD_HEIGHT) * 1.5) break;

            let isFirst = true;
            // j <= resolution ensures we go from 0 to 2PI inclusive (closing the loop)
            for (let j = 0; j <= resolution; j++) {
                const theta = (j / resolution) * Math.PI * 2;
                const r = baseRadius + (getNoise(theta, i * 0.2) * wobble);
                
                const x = (CARD_WIDTH / 2) + r * Math.cos(theta);
                const y = (CARD_HEIGHT / 2) + r * Math.sin(theta);
                
                // Rounding reduces SVG path size significantly
                const fx = Math.round(x * 10) / 10;
                const fy = Math.round(y * 10) / 10;

                if (isFirst) {
                    pathData += `M ${fx} ${fy} `;
                    isFirst = false;
                } else {
                    pathData += `L ${fx} ${fy} `;
                }
            }
            pathData += "Z ";
        }

        if (pathData.length < 10) pathData = "M 0 0 L 10 10";

        const topoObj = new fabric.Path(pathData, {
            fill: null,
            strokeWidth: parseFloat(values.width),
            strokeLineCap: 'round',
            strokeLineJoin: 'round',
            originX: 'center',
            originY: 'center',
            left: CARD_WIDTH / 2,
            top: CARD_HEIGHT / 2,
            objectCaching: false,
            // Smart Coordination metadata
            roleStroke: -99, 
            roleFill: -99,
            roleGradientStart: state.palette.indexOf(values.col1) > -1 ? state.palette.indexOf(values.col1) : 2,
            roleGradientEnd: state.palette.indexOf(values.col2) > -1 ? state.palette.indexOf(values.col2) : 3
        });

        const gradient = new fabric.Gradient({
            type: 'linear',
            gradientUnits: 'percentage',
            coords: { x1: 0, y1: 0, x2: 1, y2: 1 },
            colorStops: [
                { offset: 0, color: values.col1 },
                { offset: 1, color: values.col2 }
            ]
        });
        topoObj.set('stroke', gradient);

        return topoObj;
    }
},

                'textring':{
                    name:'Text Ring',
                    icon:'ph-text-aa',
                    description:'Circular text for badges and coins',
                    params:[
                        { id:'text', type:'text', label:'Message', def:'DECKFORGE • PRO •' },
                        { id:'radius', type:'range', label:'Radius', min:50, max:300, def:100 },
                        { id:'spacing', type:'range', label:'Spacing', min:5, max:30, def:10 }
                    ],
                    generate:(values) => {
                        const text = values.text || "TEXT RING";
                        const radius = parseInt(values.radius);
                        const spacing = parseInt(values.spacing);

                        const letters = [];
                        const center = { x:0, y:0 };
                        const totalAngle = (text.length - 1) * spacing;
                        const startAngle = -90 - (totalAngle / 2);

                        for (let i = 0; i < text.length; i++) {
                            const char = text[i];
                            const angleDeg = startAngle + (i * spacing);
                            const angleRad = fabric.util.degreesToRadians(angleDeg);

                            const x = center.x + radius * Math.cos(angleRad);
                            const y = center.y + radius * Math.sin(angleRad);

                            const letter = new fabric.Text(char, {
                                left:x,
                                top:y,
                                fontSize:24,
                                fontFamily:'Inter',
                                fontWeight:'bold',
                                originX:'center',
                                originY:'center',
                                angle:angleDeg + 90,
                                fill:state.palette[4],
                                roleFill:4
                            });
                            letters.push(letter);
                        }

                        return new fabric.Group(letters, {
                            left:CARD_WIDTH / 2,
                            top:CARD_HEIGHT / 2,
                            originX:'center',
                            originY:'center'
                        });
                    }
                },

                'icon_grid':{
                    name:'Icon Grid',
                    icon:'ph-squares-four',
                    description:'Repeat multiple SVGs in a grid',
                    params:[
                        { id:'code', type:'text', label:'Paste SVG Code', def:'<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/></svg>\n<svg viewBox="0 0 24 24"><rect x="2" y="2" width="20" height="20"/></svg>' },
                        { id:'scale', type:'range', label:'Icon Size', min:20, max:150, def:60, half:true },
                        { id:'gap', type:'range', label:'Gap', min:0, max:50, def:10, half:true },
                        { id:'order', type:'range', label:'Order:Row/Col/Rnd', min:0, max:2, step:1, def:0, half:true },
                        { id:'force', type:'range', label:'Color Force', min:0, max:100, def:100, half:true },
                        { id:'constrain', type:'checkbox', label:'Snap to Theme', def:true }
                    ],
                    generate:(values) => {
                        const group = new fabric.Group([], {
                            left:CARD_WIDTH / 2,
                            top:CARD_HEIGHT / 2,
                            originX:'center',
                            originY:'center',
                            objectCaching:false
                        });

                        let rawInput = values.code || "";
                        let svgStrings = [];

                        const matches = rawInput.match(/<svg[\s\S]*? <\/svg>/gi);

                        if (matches && matches.length > 0) {
                            svgStrings = matches;
                        } else {
                            svgStrings = [`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">${rawInput}</svg>`];
                        }

                        const findBestRole = (colorString) => {
                            if (!values.constrain) return -99;
                            if (!colorString || colorString === 'none') return -99;
                            if (typeof chroma === 'undefined') return -99;

                            let best = -99;
                            let min = Infinity;

                            state.palette.forEach((c, i) => {
                                try {
                                    const d = chroma.distance(colorString, c);
                                    if (d < min && d < (parseInt(values.force) + 20)) {
                                        min = d;
                                        best = i;
                                    }
                                } catch (e) { /* Ignore */ }
                            });
                            return best;
                        };

                        const prototypes = [];
                        let loadedCount = 0;

                        const updateGrid = () => {
                            group.remove(...group.getObjects());

                            const iconSize = parseInt(values.scale);
                            const gap = parseInt(values.gap);
                            const step = iconSize + gap;

                            const cols = Math.ceil(CARD_WIDTH / step);
                            const rows = Math.ceil(CARD_HEIGHT / step);

                            const gridWidth = (cols * step) - gap;
                            const gridHeight = (rows * step) - gap;
                            const startX = -(gridWidth / 2) + (iconSize / 2);
                            const startY = -(gridHeight / 2) + (iconSize / 2);

                            for (let r = 0; r < rows; r++) {
                                for (let c = 0; c < cols; c++) {
                                    let idx = 0;
                                    if (prototypes.length > 1) {
                                        if (values.order == 2) idx = Math.floor(Math.random() * prototypes.length);
                                        else if (values.order == 1) idx = (c * rows + r) % prototypes.length;
                                        else idx = (r * cols + c) % prototypes.length;
                                    }

                                    if (prototypes[idx]) {
                                        prototypes[idx].clone((cloned) => {
                                            cloned.left = startX + (c * step);
                                            cloned.top = startY + (r * step);
                                            group.add(cloned);
                                        });
                                    }
                                }
                            }

                            group.addWithUpdate();
                            if (typeof canvas !== 'undefined' && canvas) canvas.requestRenderAll();
                            if (group.canvas) group.canvas.requestRenderAll();
                        };

                        svgStrings.forEach((str) => {
                            fabric.loadSVGFromString(str, (objs, opts) => {
                                if (!objs || objs.length === 0) {
                                    loadedCount++;
                                    if (loadedCount === svgStrings.length && prototypes.length > 0) updateGrid();
                                    return;
                                }

                                const loadedObj = fabric.util.groupSVGElements(objs, opts);

                                const sz = parseInt(values.scale);
                                if (loadedObj.width > loadedObj.height) {
                                    loadedObj.scaleToWidth(sz);
                                } else {
                                    loadedObj.scaleToHeight(sz);
                                }

                                loadedObj.set({ originX:'center', originY:'center' });

                                const process = (o) => {
                                    o.objectCaching = false;
                                    if (o.fill && typeof o.fill === 'string') {
                                        const r = findBestRole(o.fill);
                                        if (r !== -99) {
                                            o.roleFill = r;
                                            o.fill = state.palette[r];
                                        }
                                    }
                                    if (o.stroke && typeof o.stroke === 'string') {
                                        const r = findBestRole(o.stroke);
                                        if (r !== -99) {
                                            o.roleStroke = r;
                                            o.stroke = state.palette[r];
                                        }
                                    }
                                    if (o.getObjects) o.getObjects().forEach(process);
                                };
                                process(loadedObj);

                                prototypes.push(loadedObj);
                                loadedCount++;

                                if (loadedCount === svgStrings.length) updateGrid();
                            });
                        });

                        return group;
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
                                type:'linear',
                                gradientUnits:'percentage',
                                coords:{ x1:0, y1:0, x2:0, y2:1 },
                                colorStops:[
                                    { offset:0, color:values.col1 },
                                    { offset:1, color:values.col2 }
                                ]
                            });

                            const shape = new fabric.Path(pathData, {
                                fill:grad,
                                stroke:null,
                                objectCaching:false,
                                roleGradientStart:state.palette.indexOf(values.col1) > -1 ? state.palette.indexOf(values.col1) :2,
                                roleGradientEnd:state.palette.indexOf(values.col2) > -1 ? state.palette.indexOf(values.col2) :3
                            });

                            group.push(shape);
                        }

                        return new fabric.Group(group, {
                            left:CARD_WIDTH / 2,
                            top:CARD_HEIGHT,
                            originX:'center',
                            originY:'bottom',
                            isParticleGroup:true,
                            generativeType:'fill'
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
        { id: 'style', type: 'range', label: 'Tech Style', min: 0, max: 2, def: 0, half: true } // 0=Round, 1=45deg, 2=90deg
    ],
    generate: (values) => {
        const gridSize = parseInt(values.grid);
        const density = parseInt(values.density);
        const width = parseInt(values.width);
        const style = parseInt(values.style); // 0: Round cap, 1: Square/45, 2: Square/90
        
        const cols = Math.ceil(CARD_WIDTH / gridSize);
        const rows = Math.ceil(CARD_HEIGHT / gridSize);
        const groupObjects = [];

        // Helper to snap to grid
        const getGridPoint = () => {
            return {
                x: Math.floor(Math.random() * cols) * gridSize,
                y: Math.floor(Math.random() * rows) * gridSize
            };
        };

        for (let i = 0; i < density; i++) {
            const start = getGridPoint();
            // Define a max length so traces don't span the whole card (messy)
            // Move 1 to 4 grid units away
            const xDir = Math.random() > 0.5 ? 1 : -1;
            const yDir = Math.random() > 0.5 ? 1 : -1;
            const xLen = (Math.floor(Math.random() * 3) + 1) * gridSize * xDir;
            const yLen = (Math.floor(Math.random() * 3) + 1) * gridSize * yDir;
            
            const end = { x: start.x + xLen, y: start.y + yLen };

            // Construct Path based on style
            let d = "";
            
            // Logic for "Tech" routing: Move X, then turn, then move Y
            if (style === 2) { 
                // 90 Degree turns (Classic)
                const midX = start.x + xLen;
                d = `M ${start.x} ${start.y} L ${midX} ${start.y} L ${midX} ${end.y}`;
            } else {
                // 45 Degree Chamfer (Sci-Fi / Modern)
                // We move horizontal, chamfer, then vertical
                const chamfer = Math.min(Math.abs(xLen), Math.abs(yLen)) / 2;
                const midX = start.x + xLen - (chamfer * xDir);
                
                // M Start -> Line to turn start -> Line to turn end (45deg) -> Line to End
                d = `M ${start.x} ${start.y} 
                     L ${midX} ${start.y} 
                     L ${start.x + xLen} ${start.y + (chamfer * yDir)} 
                     L ${end.x} ${end.y}`;
            }

            // Calculate Gradient Color based on Y position
            const t = Math.max(0, Math.min(1, start.y / CARD_HEIGHT));
            const color = Utils.getInterpColor(values.col1, values.col2, t);

            // 1. The Trace Line
            const path = new fabric.Path(d, {
                fill: null,
                stroke: color,
                strokeWidth: width,
                strokeLineCap: style === 0 ? 'round' : 'square',
                strokeLineJoin: style === 0 ? 'round' : 'miter',
                objectCaching: false
            });
            groupObjects.push(path);

            // 2. The Solder Pad (Start Circle)
            // Style 0 = Circle, Style 1/2 = Hex or Square pad
            if (style === 0) {
                groupObjects.push(new fabric.Circle({
                    left: start.x, top: start.y,
                    radius: width * 1.5,
                    fill: color,
                    originX: 'center', originY: 'center'
                }));
            } else {
                // Hexagon pad for sci-fi look
                const hexSize = width * 2;
                // Simple square for now to keep code light, rotated 45 for diamond pad
                groupObjects.push(new fabric.Rect({
                    left: start.x, top: start.y,
                    width: hexSize, height: hexSize,
                    fill: color,
                    originX: 'center', originY: 'center',
                    angle: 45
                }));
            }

            // 3. Optional: End Pad (Small via)
            groupObjects.push(new fabric.Circle({
                left: end.x, top: end.y,
                radius: width,
                fill: color,
                originX: 'center', originY: 'center'
            }));
        }

        const idx1 = state.palette.indexOf(values.col1);
        const idx2 = state.palette.indexOf(values.col2);

        return new fabric.Group(groupObjects, {
            left: CARD_WIDTH / 2,
            top: CARD_HEIGHT / 2,
            originX: 'center',
            originY: 'center',
            isParticleGroup: true,
            generativeType: 'fill', 
            // Note: We use 'fill' type for the group, but inside we apply stroke/fill manually
            // This ensures the theme engine overwrites them correctly.
            roleGradientStart: idx1 > -1 ? idx1 : 2,
            roleGradientEnd: idx2 > -1 ? idx2 : 3
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
        
        // Calculate gradient direction vector
        const cos = Math.cos(angleRad);
        const sin = Math.sin(angleRad);

        // Calculate the maximum possible projection distance for normalization
        // This ensures the gradient stretches correctly across the card diagonal
        const diag = Math.hypot(CARD_WIDTH, CARD_HEIGHT);

        for (let x = 0; x <= CARD_WIDTH; x += gap) {
            for (let y = 0; y <= CARD_HEIGHT; y += gap) {
                
                // Project current point onto the gradient vector
                // We center the coordinate system relative to the card center for rotation
                const cx = x - CARD_WIDTH / 2;
                const cy = y - CARD_HEIGHT / 2;
                
                // Projection logic
                const projection = (cx * cos + cy * sin);
                
                // Normalize projection to 0-1 range based on diagonal
                // +0.5 centers the gradient
                let norm = (projection / diag) + 0.5;
                norm = Math.max(0, Math.min(1, norm)); 
                
                // 1. Calculate Radius based on gradient position
                const r = maxR * norm;
                
                // 2. Calculate Color based on gradient position
                const dotColor = Utils.getInterpColor(values.col1, values.col2, norm);
                
                // Only render visible dots
                if (r > 0.5) {
                    dots.push(new fabric.Circle({
                        left: x,
                        top: y,
                        radius: r,
                        fill: dotColor, // Apply the interpolated color
                        originX: 'center',
                        originY: 'center'
                    }));
                }
            }
        }
        
        const idx1 = state.palette.indexOf(values.col1);
        const idx2 = state.palette.indexOf(values.col2);

        return new fabric.Group(dots, {
            left: CARD_WIDTH / 2,
            top: CARD_HEIGHT / 2,
            originX: 'center',
            originY: 'center',
            isParticleGroup: true,
            generativeType: 'fill',
            // Define both start and end roles so the Theme engine can update it
            roleGradientStart: idx1 > -1 ? idx1 : 2,
            roleGradientEnd: idx2 > -1 ? idx2 : 3
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
            
            // Calculate Gradient Color based on ring index
            // i=0 is Center, i=rings-1 is Edge
            const t = i / (rings - 1 || 1); 
            const color = Utils.getInterpColor(values.col1, values.col2, t);

            // 1. The main ring
            group.push(new fabric.Circle({
                radius: currentRadius,
                left: center.x, top: center.y,
                originX: 'center', originY: 'center',
                fill: null,
                stroke: color, // Apply gradient color
                strokeWidth: width
            }));

            // 2. Inner Decorations (Polygons)
            if (Math.random() > 0.3) {
                const sides = Math.floor(Math.random() * 3) + 3; // 3 to 5 sides
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
                    fill: null,
                    stroke: color, // Apply gradient color
                    strokeWidth: width / 2,
                    selectable: false
                }));
            }

            // 3. Glyphs/Runes on the ring
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
                            radius: glyphSize,
                            left: gx, top: gy,
                            originX: 'center', originY: 'center',
                            fill: color // Apply gradient color
                        }));
                    } else {
                         group.push(new fabric.Rect({
                            width: glyphSize*1.5, height: glyphSize*1.5,
                            left: gx, top: gy,
                            originX: 'center', originY: 'center',
                            fill: null, 
                            stroke: color, // Apply gradient color
                            strokeWidth: 1,
                            angle: 45
                        }));
                    }
                }
            }
        }

        const idx1 = state.palette.indexOf(values.col1);
        const idx2 = state.palette.indexOf(values.col2);

        return new fabric.Group(group, {
            left: CARD_WIDTH / 2,
            top: CARD_HEIGHT / 2,
            originX: 'center',
            originY: 'center',
            isParticleGroup: true,
            generativeType: 'stroke', 
            roleGradientStart: idx1 > -1 ? idx1 : 2,
            roleGradientEnd: idx2 > -1 ? idx2 : 3
        });
    }
}
            }
        };
