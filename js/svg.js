// ========================================
// SMART SVG IMPORT (Palette-aware)
// ========================================

(function() {
    'use strict';

    DeckForge.SVG = {
        openModal: function() {
            const modal = DeckForge.Utils.getElement('svg-modal');
            if (modal) modal.classList.remove('hidden');
        },

        closeModal: function() {
            const modal = DeckForge.Utils.getElement('svg-modal');
            if (modal) modal.classList.add('hidden');
        },

        confirmAdd: function() {
            const input = DeckForge.Utils.getElement('svg-input');
            const modal = DeckForge.Utils.getElement('svg-modal');
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

                    const findBestRole = (colorString) => {
                        if (!colorString || colorString === 'none' || colorString === 'transparent') {
                            return -99;
                        }

                        let bestRole = -99;
                        let minDistance = Infinity;

                        DeckForge.state.palette.forEach((themeColor, index) => {
                            try {
                                const dist = chroma.distance(colorString, themeColor);
                                if (dist < minDistance) {
                                    minDistance = dist;
                                    bestRole = index;
                                }
                            } catch (e) {
                                // ignore
                            }
                        });

                        return bestRole;
                    };

                    const processObj = (o) => {
                        o.set('objectCaching', false);

                        // Handle fill (solid or gradient)
                        if (o.fill) {
                            if (typeof o.fill === 'string' && o.fill !== 'none') {
                                const role = findBestRole(o.fill);
                                if (role !== -99) {
                                    o.roleFill = role;
                                    o.set('fill', DeckForge.state.palette[role]);
                                }
                            } else if (typeof o.fill === 'object' && o.fill.colorStops) {
                                o.fill.colorStops.forEach(stop => {
                                    const role = findBestRole(stop.color);
                                    if (role !== -99) stop.color = DeckForge.state.palette[role];
                                });
                            }
                        }

                        // Handle stroke
                        if (o.stroke && typeof o.stroke === 'string' && o.stroke !== 'none') {
                            const role = findBestRole(o.stroke);
                            if (role !== -99) {
                                o.roleStroke = role;
                                o.set('stroke', DeckForge.state.palette[role]);
                            }
                        }

                        if (o.getObjects) o.getObjects().forEach(processObj);
                    };

                    // Group and center
                    const grouped = fabric.util.groupSVGElements(objects, options);
                    grouped.set({
                        left: 0,
                        top: 0,
                        originX: 'center',
                        originY: 'center'
                    });

                    // Optional fit-to-card: limit to ~80% of card bounds
                    const maxSize = Math.min(DeckForge.CARD_WIDTH, DeckForge.CARD_HEIGHT) * 0.8;
                    if (grouped.width > grouped.height) {
                        grouped.scaleToWidth(maxSize);
                    } else {
                        grouped.scaleToHeight(maxSize);
                    }

                    processObj(grouped);

                    grouped.set({
                        left: DeckForge.CARD_WIDTH / 2,
                        top: DeckForge.CARD_HEIGHT / 2
                    });

                    DeckForge.canvas.add(grouped);
                    DeckForge.canvas.setActiveObject(grouped);
                    DeckForge.canvas.requestRenderAll();
                    DeckForge.History.save();

                    if (modal) modal.classList.add('hidden');
                });
            } catch (e) {
                console.error(e);
                alert("Could not parse SVG. Please check the code.");
            }
        }
    };
})();