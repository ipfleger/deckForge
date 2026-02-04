DeckForge.Textures = {
    none: null,
    // Ensure these file paths exist in your project folder!
    paper: 'assets/textures/paper_grain.png',
    paper_dark: 'assets/textures/paper_grain.png',
    linen: 'assets/textures/linen_texture.png',
    halftone: 'assets/textures/halftone_texture.png'
};
// ---------------------------------------

// ========================================
// ASSET LIBRARY (persistent, localforage)
// ========================================
(function() {
    'use strict';

    const STORAGE_KEY = 'deckforge_assets';

    const makeId = () => 'a-' + Date.now() + '-' + Math.random().toString(16).slice(2);

    async function imageToThumb(dataUrl, maxSize = 256) {
        return new Promise(resolve => {
            const img = new Image();
            img.onload = () => {
                const scale = Math.min(1, maxSize / Math.max(img.width, img.height));
                const w = Math.max(1, Math.round(img.width * scale));
                const h = Math.max(1, Math.round(img.height * scale));
                const c = document.createElement('canvas');
                c.width = w; c.height = h;
                const ctx = c.getContext('2d');
                ctx.drawImage(img, 0, 0, w, h);
                resolve(c.toDataURL('image/png'));
            };
            img.onerror = () => resolve(null);
            img.src = dataUrl;
        });
    }

    DeckForge.Assets = {
        items: [],
        filterText: '',

        init: async function() {
            try {
                const saved = await localforage.getItem(STORAGE_KEY);
                this.items = saved || [];
                this.render();
            } catch (e) {
                console.error('Asset load error:', e);
            }
        },

        triggerUpload: function() {
            const input = DeckForge.Utils.getElement('asset-upload');
            if (input) input.click();
        },

        handleUpload: async function(file) {
            if (!file) return;
            const maxWarnSize = 10 * 1024 * 1024; // 10MB warn threshold
            if (file.size > maxWarnSize && !confirm("Large file. Continue?")) return;

            const reader = new FileReader();
            reader.onload = async (ev) => {
                const dataUrl = ev.target.result;
                const thumb = await imageToThumb(dataUrl, 256);
                const asset = {
                    id: makeId(),
                    name: file.name || 'Asset',
                    mime: file.type || 'image/png',
                    size: file.size || 0,
                    addedAt: Date.now(),
                    dataUrl,
                    thumb
                };
                this.items.unshift(asset);
                await localforage.setItem(STORAGE_KEY, this.items);
                this.render();
            };
            reader.readAsDataURL(file);
        },

        setFilter: function(val) {
            this.filterText = (val || '').toLowerCase();
            this.render();
        },

        addToCanvas: function(id) {
            const asset = this.items.find(a => a.id === id);
            if (!asset) return;
            fabric.Image.fromURL(asset.dataUrl, (img) => {
                img.set({
                    originX: 'center',
                    originY: 'center',
                    left: DeckForge.CARD_WIDTH / 2,
                    top: DeckForge.CARD_HEIGHT / 2,
                    perPixelTargetFind: true
                });
                // Scale to fit card
                const maxW = DeckForge.CARD_WIDTH * 0.8;
                const maxH = DeckForge.CARD_HEIGHT * 0.8;
                if (img.width > maxW) img.scaleToWidth(maxW);
                if (img.getScaledHeight() > maxH) img.scaleToHeight(maxH);

                // Default: keep original colors (no role fill/stroke)
                img.roleFill = -1;
                img.roleStroke = -1;

                DeckForge.canvas.add(img);
                DeckForge.canvas.setActiveObject(img);
                DeckForge.canvas.requestRenderAll();
                DeckForge.History.save();
            });
        },

        delete: async function(id) {
            this.items = this.items.filter(a => a.id !== id);
            await localforage.setItem(STORAGE_KEY, this.items);
            this.render();
        },

        render: function() {
            const list = DeckForge.Utils.getElement('asset-list-ui');
            if (!list) return;
            list.innerHTML = '';

            const ft = this.filterText;
            const filtered = this.items.filter(a => {
                if (!ft) return true;
                return (a.name || '').toLowerCase().includes(ft);
            });

            if (filtered.length === 0) {
                list.innerHTML = '<div class="p-3 text-[10px] text-gray-400 italic bg-gray-50 rounded border">No assets yet.</div>';
                return;
            }

            filtered.forEach(asset => {
                const div = document.createElement('div');
                div.className = "flex items-center justify-between p-2 bg-white border border-gray-200 rounded-xl shadow-sm";
                div.innerHTML = `
                    <div class="flex items-center gap-3">
                        <img src="${asset.thumb || asset.dataUrl}" class="w-10 h-12 object-cover rounded border border-gray-100 bg-gray-50">
                        <div class="flex flex-col">
                            <span class="text-xs font-bold text-gray-700 truncate max-w-[140px]">${asset.name}</span>
                            <span class="text-[10px] text-gray-400">${Math.round(asset.size/1024)} KB</span>
                        </div>
                    </div>
                    <div class="flex gap-2">
                        <button class="px-2 py-1 text-[10px] font-bold bg-blue-50 text-blue-600 rounded hover:bg-blue-100"
                                onclick="DeckForge.Assets.addToCanvas('${asset.id}')">Add</button>
                        <button class="w-7 h-7 flex items-center justify-center rounded-full hover:bg-red-50 text-gray-300 hover:text-red-500"
                                onclick="DeckForge.Assets.delete('${asset.id}')"><i class="ph-bold ph-trash"></i></button>
                    </div>
                `;
                list.appendChild(div);
            });
        }
    };
})();
