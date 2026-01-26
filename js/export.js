// ========================================
// EXPORT MODULE (SMART GRID + iOS-friendly batch)
// ========================================
(function() {
    'use strict';

    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);

    const getQuality = () => {
        const el = DeckForge.Utils.getElement('export-quality');
        const val = el ? parseInt(el.value || '2', 10) : 2;
        return Math.min(3, Math.max(1, val));
    };

    const getOpenLimit = () => {
        const el = DeckForge.Utils.getElement('export-open-limit');
        const val = el ? parseInt(el.value || '12', 10) : 12;
        return Math.min(30, Math.max(1, val)); // safety cap
    };

    DeckForge.Export = {
        open: function(deckIndex = -1) {
            const modal = DeckForge.Utils.getElement('export-modal');
            const title = DeckForge.Utils.getElement('export-title');
            const subtitle = DeckForge.Utils.getElement('export-subtitle');
            
            const optsSingle = DeckForge.Utils.getElement('opts-single');
            const optsDeck = DeckForge.Utils.getElement('opts-deck');
            const settings = DeckForge.Utils.getElement('export-settings');

            const modeInput = DeckForge.Utils.getElement('export-mode');
            const targetInput = DeckForge.Utils.getElement('export-target-idx');

            if (!modal) return;

            if (deckIndex === -1) {
                // Single-card export
                if (title) title.innerText = "Export Card";
                if (subtitle) subtitle.innerText = "Save current canvas.";
                if (optsSingle) optsSingle.classList.remove('hidden');
                if (optsDeck) optsDeck.classList.add('hidden');
                if (settings) settings.classList.add('hidden');
                if (modeInput) modeInput.value = 'single';
            } else {
                // Deck export
                const deckName = DeckForge.DeckCollection?.decks?.[deckIndex]?.name || 'Deck';
                if (title) title.innerText = "Export Deck";
                if (subtitle) subtitle.innerText = `${deckName} (${DeckForge.DeckCollection?.decks?.[deckIndex]?.cards?.length || 0} cards)`;
                if (optsSingle) optsSingle.classList.add('hidden');
                if (optsDeck) optsDeck.classList.remove('hidden');
                if (settings) settings.classList.remove('hidden');
                if (modeInput) modeInput.value = 'deck';
                if (targetInput) targetInput.value = deckIndex;
            }
            modal.classList.remove('hidden');
        },

        // For compatibility with existing buttons
        handleExport: function() { this.open(-1); },

        process: async function(format) {
            const modal = DeckForge.Utils.getElement('export-modal');
            if (modal) modal.classList.add('hidden');

            const mode = DeckForge.Utils.getElement('export-mode')?.value || 'single';
            const targetIdx = parseInt(DeckForge.Utils.getElement('export-target-idx')?.value || '-1', 10);
            const includeBleed = DeckForge.Utils.getElement('export-bleed')?.checked;
            
            const formatSelect = DeckForge.Utils.getElement('export-format');
            const paperType = formatSelect ? formatSelect.value : 'a4';
            
            let customDim = null;
            if (paperType === 'custom') {
                const cw = parseFloat(DeckForge.Utils.getElement('custom-w')?.value || '210');
                const ch = parseFloat(DeckForge.Utils.getElement('custom-h')?.value || '297');
                customDim = [cw, ch];
            }

            // iOS guidance for ZIP
            if (isIOS && format === 'zip') {
                alert("On iOS, ZIP downloads may not save directly. Consider PDF or the 'Open images' batch option.");
            }

            DeckForge.state.isProcessing = true;

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
                DeckForge.state.isProcessing = false;
            }
        },

        exportSingle: async function(format) {
            const canvas = DeckForge.canvas;
            if (!canvas) return;
            const quality = getQuality();
            const fileName = `card-${Date.now()}.${format}`;
            let blob;

            if (format === 'json') {
                const json = JSON.stringify(canvas.toJSON(DeckForge.SAVE_PROPS), null, 2);
                blob = new Blob([json], { type: 'application/json' });
            } else if (format === 'svg') {
                const svg = canvas.toSVG();
                blob = new Blob([svg], { type: 'image/svg+xml' });
            } else {
                const dataUrl = canvas.toDataURL({
                    format: format === 'jpg' ? 'jpeg' : 'png',
                    multiplier: quality,
                    quality: 0.92
                });
                blob = await (await fetch(dataUrl)).blob();
            }

            const link = document.createElement('a');
            link.download = fileName;
            link.href = URL.createObjectURL(blob);
            link.click();
        },

        exportDeck: async function(deckIdx, format, includeBleed, paperType, customDim) {
            const deck = DeckForge.DeckCollection?.decks?.[deckIdx];
            if (!deck || !deck.cards || deck.cards.length === 0) {
                alert("Deck is empty.");
                return;
            }

            const quality = getQuality();

            // PDF sheet export (imposition)
            if (format === 'pdf-sheet') {
                if (!window.jspdf) return alert("jsPDF library missing");
                const { jsPDF } = window.jspdf;

                let pW = 210, pH = 297; // default A4 (mm)
                if (paperType === 'custom' && customDim) {
                    pW = customDim[0]; pH = customDim[1];
                } else if (paperType === 'letter') { pW = 215.9; pH = 279.4; }
                else if (paperType === 'legal') { pW = 215.9; pH = 355.6; }
                else if (paperType === 'tabloid') { pW = 279.4; pH = 431.8; }
                else if (paperType === 'a3') { pW = 297; pH = 420; }

                const doc = new jsPDF({
                    orientation: pW > pH ? 'l' : 'p',
                    unit: 'mm',
                    format: paperType === 'custom' ? [pW, pH] : paperType
                });

                const cardW = 63.5; // mm
                const cardH = 88.9; // mm
                const bleed = includeBleed ? 3 : 0;

                const cellW = cardW + (bleed * 2);
                const cellH = cardH + (bleed * 2);
                const margin = 10;
                const availW = pW - (margin * 2);
                const availH = pH - (margin * 2);

                const cols = Math.floor(availW / cellW);
                const rows = Math.floor(availH / cellH);
                if (cols < 1 || rows < 1) return alert("Page too small for cards!");

                const startX = (pW - (cols * cellW)) / 2;
                const startY = (pH - (rows * cellH)) / 2;

                let col = 0, row = 0;

                for (let i = 0; i < deck.cards.length; i++) {
                    await new Promise(resolve => DeckForge.canvas.loadFromJSON(deck.cards[i], resolve));
                    DeckForge.Theme.updateCanvasColors();
                    DeckForge.canvas.renderAll();

                    const imgData = DeckForge.canvas.toDataURL({ format: 'png', multiplier: quality });

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

                        // Simple crop marks
                        doc.line(cx, y - mLen, cx, y);
                        doc.line(x - mLen, cy, x, cy);
                        doc.line(cx + cw, y - mLen, cx + cw, y);
                        doc.line(x + cellW, cy, x + cellW + mLen, cy);
                        doc.line(cx, y + cellH, cx, y + cellH + mLen);
                        doc.line(x - mLen, cy + ch, x, cy + ch);
                        doc.line(cx + cw, y + cellH, cx + cw, y + cellH + mLen);
                        doc.line(x + cellW, cy + ch, x + cellW + mLen, cy + ch);
                    }

                    col++;
                    if (col >= cols) { col = 0; row++; }
                }

                doc.save(`${deck.name.replace(/\s+/g, '_')}_${paperType}.pdf`);
            }
            // ZIP of PNGs
            else if (format === 'zip') {
                if (!window.JSZip) return alert("JSZip missing");
                const zip = new JSZip();
                const folder = zip.folder("images");

                for (let i = 0; i < deck.cards.length; i++) {
                    await new Promise(resolve => DeckForge.canvas.loadFromJSON(deck.cards[i], resolve));
                    DeckForge.Theme.updateCanvasColors();
                    const dataUrl = DeckForge.canvas.toDataURL({ format: 'png', multiplier: quality });
                    const blob = await (await fetch(dataUrl)).blob();
                    folder.file(`card_${i+1}.png`, blob);
                }

                const content = await zip.generateAsync({ type: "blob" });
                const link = document.createElement('a');
                link.download = `${deck.name}_Images.zip`;
                link.href = URL.createObjectURL(content);
                link.click();
            }
            // PDF Digital (one card per page)
            else if (format === 'pdf-single') {
                if (!window.jspdf) return alert("jsPDF library missing");
                const { jsPDF } = window.jspdf;
                const doc = new jsPDF({ orientation: 'p', unit: 'mm', format: [63.5, 88.9] });

                for (let i = 0; i < deck.cards.length; i++) {
                    if (i > 0) doc.addPage();
                    await new Promise(resolve => DeckForge.canvas.loadFromJSON(deck.cards[i], resolve));
                    DeckForge.Theme.updateCanvasColors();
                    const imgData = DeckForge.canvas.toDataURL({ format: 'png', multiplier: quality });
                    doc.addImage(imgData, 'PNG', 0, 0, 63.5, 88.9);
                }
                doc.save(`${deck.name}_Digital.pdf`);
            }
            // iOS-friendly: open images in new tabs instead of ZIP
            else if (format === 'open-images') {
                const limit = getOpenLimit();
                if (deck.cards.length > limit) {
                    alert(`Opening more than ${limit} images at once may be blocked. Please reduce selection or raise the limit cautiously.`);
                }
                const count = Math.min(deck.cards.length, limit);
                for (let i = 0; i < count; i++) {
                    await new Promise(resolve => DeckForge.canvas.loadFromJSON(deck.cards[i], resolve));
                    DeckForge.Theme.updateCanvasColors();
                    const dataUrl = DeckForge.canvas.toDataURL({ format: 'png', multiplier: quality });
                    window.open(dataUrl, '_blank');
                }
            }
        }
    };
})();
