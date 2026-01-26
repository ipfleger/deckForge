// ========================================
// LAYERS MANAGEMENT
// ========================================

(function() {
    'use strict';

    DeckForge.Layers = {
        isOpen: false,
        _hooked: false,
        _idCounter: 1,

        toggle: function() {
            const drawer = DeckForge.Utils.getElement('layers-drawer');
            if (!drawer) return;

            const wasOpen = this.isOpen;
            DeckForge.UI.closeAllDrawers();

            if (!wasOpen) {
                this.isOpen = true;
                drawer.classList.remove('translate-x-full');
                drawer.setAttribute('aria-hidden', 'false');
                DeckForge.Utils.showOverlay();
                this.render();
                
                if (!this._hooked) {
                    DeckForge.canvas.on('object:added', () => this.isOpen && this.render());
                    DeckForge.canvas.on('object:removed', () => this.isOpen && this.render());
                    DeckForge.canvas.on('object:modified', () => this.isOpen && this.render());
                    this._hooked = true;
                }
            }
        },

        getLabel: function(obj) {
            if (!obj._uiId) obj._uiId = this._idCounter++;
            let name = DeckForge.Utils.capitalize(obj.type);
            if (obj.type === 'i-text') name = `"${obj.text.substring(0, 15)}${obj.text.length>15?'...':''}"`;
            if (obj.type === 'rect') name = 'Rectangle';
            if (obj.type === 'path') name = 'Vector';
            if (obj.type === 'group') name = 'Group';
            return `${name} #${obj._uiId}`;
        },

        render: function() {
            const list = DeckForge.Utils.getElement('layers-list');
            if (!list) return;

            list.innerHTML = '';
            const objects = DeckForge.canvas.getObjects(); 
            const activeObj = DeckForge.canvas.getActiveObject();

            [...objects].reverse().forEach((obj, i) => {
                const trueIndex = objects.length - 1 - i;
                const isActive = activeObj === obj;
                const isTop = (trueIndex === objects.length - 1);
                const isBottom = (trueIndex === 0);
                
                const div = document.createElement('div');
                div.className = `flex items-center gap-2 p-2 rounded-lg border transition group ${
                    isActive ? 'bg-blue-50 border-blue-200 shadow-sm' : 'bg-white border-transparent hover:border-gray-200'
                }`;
                
                let icon = 'ph-square';
                if (obj.type === 'i-text') icon = 'ph-text-t';
                if (obj.type === 'image') icon = 'ph-image';
                if (obj.type === 'group') icon = 'ph-selection-all';
                
                div.innerHTML = `
                    <div class="cursor-pointer flex-1 flex items-center gap-3 overflow-hidden" onclick="DeckForge.Layers.select(${trueIndex})">
                        <i class="ph-bold ${icon} ${isActive ? 'text-blue-600' : 'text-gray-400'}"></i>
                        <span class="text-xs font-bold ${isActive ? 'text-blue-700' : 'text-gray-600'} truncate select-none">
                            ${this.getLabel(obj)}
                        </span>
                    </div>
                    <div class="flex items-center gap-1">
                        <button onclick="event.stopPropagation(); DeckForge.Layers.toggleVis(${trueIndex})" class="p-1 rounded hover:bg-gray-100 text-gray-400 hover:text-gray-700">
                            <i class="ph-bold ${obj.visible ? 'ph-eye' : 'ph-eye-slash text-red-400'}"></i>
                        </button>
                        <button onclick="event.stopPropagation(); DeckForge.Layers.toggleLock(${trueIndex})" class="p-1 rounded hover:bg-gray-100 text-gray-400 hover:text-gray-700">
                            <i class="ph-bold ${obj.locked ? 'ph-lock-key text-orange-400' : 'ph-lock-open'}"></i>
                        </button>
                        <button onclick="event.stopPropagation(); DeckForge.Layers.move(${trueIndex}, 1)" class="p-1 rounded transition ${isTop ? 'opacity-20 cursor-not-allowed' : 'hover:bg-gray-100 text-gray-400 hover:text-blue-600'}" ${isTop ? 'disabled' : ''}>
                            <i class="ph-bold ph-caret-up"></i>
                        </button>
                        <button onclick="event.stopPropagation(); DeckForge.Layers.move(${trueIndex}, -1)" class="p-1 rounded transition ${isBottom ? 'opacity-20 cursor-not-allowed' : 'hover:bg-gray-100 text-gray-400 hover:text-blue-600'}" ${isBottom ? 'disabled' : ''}>
                            <i class="ph-bold ph-caret-down"></i>
                        </button>
                    </div>
                `;
                list.appendChild(div);
            });
        },

        select: function(index) {
            const obj = DeckForge.canvas.item(index);
            if (obj && obj.visible) { 
                DeckForge.canvas.setActiveObject(obj);
                DeckForge.canvas.requestRenderAll();
                this.render(); 
            }
        },

        toggleVis: function(index) {
            const obj = DeckForge.canvas.item(index);
            if (obj) {
                obj.set('visible', !obj.visible);
                if (!obj.visible) DeckForge.canvas.discardActiveObject();
                DeckForge.canvas.requestRenderAll();
                this.render();
                DeckForge.History.save();
            }
        },

        toggleLock: function(index) {
            const obj = DeckForge.canvas.item(index);
            if (obj) {
                obj.set('locked', !obj.locked);
                if (DeckForge.canvas.getActiveObject() === obj) DeckForge.UI.updateLockUI(obj.locked);
                DeckForge.canvas.requestRenderAll();
                this.render();
                DeckForge.History.save();
            }
        },

        move: function(index, dir) {
            const objects = DeckForge.canvas.getObjects();
            const obj = objects[index];
            if (!obj) return;
            const newIndex = index + dir;
            if (newIndex < 0 || newIndex >= objects.length) return;
            obj.moveTo(newIndex);
            DeckForge.canvas.setActiveObject(obj);
            DeckForge.canvas.requestRenderAll();
            this.render();
            DeckForge.History.save();
        }
    };
})();
