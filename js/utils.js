// ========================================
// UTILITIES & MATH
// ========================================

(function() {
    'use strict';

    DeckForge.Utils = {
        debounce: function(func, wait) {
            let timeout;
            return function executedFunction(...args) {
                const later = () => {
                    clearTimeout(timeout);
                    func(...args);
                };
                clearTimeout(timeout);
                timeout = setTimeout(later, wait);
            };
        },

        getElement: function(id) {
            const el = document.getElementById(id);
            if (!el) console.warn(`Element not found:${id}`);
            return el;
        },

        capitalize: function(str) {
            if (!str) return '';
            return str.charAt(0).toUpperCase() + str.slice(1);
        },

        setInputValue: function(id, value) {
            const el = this.getElement(id);
            if (el) el.value = value;
        },

        setText: function(id, text) {
            const el = this.getElement(id);
            if (el) el.innerText = text;
        },

        getInterpColor: function(c1, c2, factor) {
            try {
                const rgb1 = new fabric.Color(c1).getSource();
                const rgb2 = new fabric.Color(c2).getSource();
                
                const r = Math.round(rgb1[0] + factor * (rgb2[0] - rgb1[0]));
                const g = Math.round(rgb1[1] + factor * (rgb2[1] - rgb1[1]));
                const b = Math.round(rgb1[2] + factor * (rgb2[2] - rgb1[2]));
                
                return `rgb(${r},${g},${b})`;
            } catch (e) {
                console.warn('Color interpolation error:', e);
                return c1;
            }
        },

        getPaletteColor: function(idx) {
            if (idx === -1) return 'transparent';
            const effectiveIdx = DeckForge.state.darkMode ? (4 - idx) : idx;
            return DeckForge.state.palette[effectiveIdx] || DeckForge.state.palette[0];
        },

        showOverlay: function() {
            const overlay = this.getElement('overlay');
            if (overlay) {
                overlay.classList.remove('hidden');
                overlay.setAttribute('aria-hidden', 'false');
                requestAnimationFrame(() => {
                    overlay.classList.remove('opacity-0');
                });
            }
        },

        hideOverlay: function() {
            const overlay = this.getElement('overlay');
            if (overlay) {
                overlay.classList.add('opacity-0');
                overlay.setAttribute('aria-hidden', 'true');
                setTimeout(() => overlay.classList.add('hidden'), 200);
            }
        }
    };

    // Fast Simplex Noise Engine
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
            const permMod12 = this.permMod12;
            const perm = this.perm;
            const Grad3 = [
                [1,1,0], [-1,1,0], [1,-1,0], [-1,-1,0],
                [1,0,1], [-1,0,1], [1,0,-1], [-1,0,-1],
                [0,1,1], [0,-1,1], [0,1,-1], [0,-1,-1]
            ];
            
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
            if (x0 > y0) { i1 = 1; j1 = 0; }
            else { i1 = 0; j1 = 1; }
            
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

    DeckForge.simplex = new FastSimplex();
})();
