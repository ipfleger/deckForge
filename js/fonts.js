// ========================================
// CUSTOM FONTS MANAGER
// ========================================
(function() {
    'use strict';

    const STORAGE_KEY = 'deckforge_fonts';

    DeckForge.Fonts = {
        customFonts: [],

        init: async function() {
            try {
                const saved = await localforage.getItem(STORAGE_KEY);
                if (saved) {
                    this.customFonts = saved;
                    // Re-register all saved fonts
                    for (const font of this.customFonts) {
                        await this.registerFont(font.name, font.dataUrl);
                    }
                }
                this.renderUI();
            } catch (e) {
                console.error('Error loading custom fonts:', e);
                this.renderUI();
            }
        },

        save: async function() {
            try {
                await localforage.setItem(STORAGE_KEY, this.customFonts);
            } catch (e) {
                console.error('Error saving fonts:', e);
                alert('Error saving font. Storage may be full.');
            }
        },

        registerFont: function(name, dataUrl) {
            return new Promise((resolve, reject) => {
                const fontFace = new FontFace(name, `url(${dataUrl})`);
                fontFace.load().then((loadedFace) => {
                    document.fonts.add(loadedFace);
                    resolve(loadedFace);
                }).catch((error) => {
                    console.error('Font load error:', error);
                    reject(error);
                });
            });
        },

        triggerUpload: function() {
            const input = document.createElement('input');
            input.type = 'file';
            input.accept = '.ttf,.otf,.woff,.woff2';
            input.onchange = (e) => this.handleUpload(e.target.files[0]);
            input.click();
        },

        handleUpload: async function(file) {
            if (!file) return;

            // Validate file type
            const validTypes = ['.ttf', '.otf', '.woff', '.woff2'];
            const ext = '.' + file.name.split('.').pop().toLowerCase();
            if (!validTypes.includes(ext)) {
                alert('Please upload a valid font file (.ttf, .otf, .woff, .woff2)');
                return;
            }

            // Generate font name from filename (remove extension, clean up)
            let fontName = file.name.replace(/\.[^/.]+$/, ''); // Remove extension
            fontName = fontName.replace(/[-_]/g, ' '); // Replace dashes/underscores with spaces
            
            // Check for duplicate names
            if (this.customFonts.some(f => f.name.toLowerCase() === fontName.toLowerCase())) {
                alert('A font with this name already exists. Please rename the file.');
                return;
            }

            const reader = new FileReader();
            reader.onload = async (ev) => {
                const dataUrl = ev.target.result;
                
                try {
                    // Register the font
                    await this.registerFont(fontName, dataUrl);
                    
                    // Save to storage
                    this.customFonts.push({
                        name: fontName,
                        dataUrl: dataUrl,
                        addedAt: Date.now()
                    });
                    await this.save();
                    
                    this.renderUI();
                    
                    // Update the font list in text editor if it exists
                    if (DeckForge.Text && DeckForge.Text.renderFontList) {
                        DeckForge.Text.renderFontList();
                    }
                } catch (e) {
                    alert('Failed to load font. The file may be corrupted.');
                }
            };
            reader.readAsDataURL(file);
        },

        delete: async function(index) {
            if (!confirm('Delete this font? Text using it will fall back to a default font.')) return;
            
            this.customFonts.splice(index, 1);
            await this.save();
            this.renderUI();
            
            // Update font list
            if (DeckForge.Text && DeckForge.Text.renderFontList) {
                DeckForge.Text.renderFontList();
            }
        },

        // Get all available fonts (built-in + custom)
        getAllFonts: function() {
            const builtIn = DeckForge.FONT_OPTIONS || [];
            const custom = this.customFonts.map(f => ({
                name: f.name + ' ★',
                val: f.name
            }));
            return [...custom, ...builtIn];
        },

        renderUI: function() {
            const container = DeckForge.Utils.getElement('custom-fonts-list');
            if (!container) return;

            container.innerHTML = '';

            if (this.customFonts.length === 0) {
                container.innerHTML = '<div class="text-[10px] text-gray-400 italic p-2">No custom fonts added yet.</div>';
                return;
            }

            this.customFonts.forEach((font, index) => {
                const div = document.createElement('div');
                div.className = "flex justify-between items-center p-2 bg-gray-50 border rounded group hover:border-blue-200 transition";
                div.innerHTML = `
                    <span class="text-xs font-medium text-gray-600 truncate" style="font-family: '${font.name}', sans-serif;">
                        ${font.name}
                    </span>
                    <button class="text-gray-300 hover:text-red-500 transition p-1" title="Delete font">
                        <i class="ph-bold ph-trash"></i>
                    </button>
                `;
                div.querySelector('button').onclick = () => this.delete(index);
                container.appendChild(div);
            });
        }
    };
})();
