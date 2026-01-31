// ========================================
// MASK & CROP TOOL
// ========================================

(function() {
    'use strict';

    let targetImage = null;
    let maskRect = null;

    DeckForge.MaskTool = {
        // Start the cropping session
        start: function() {
            const obj = DeckForge.canvas.getActiveObject();
            if (!obj || obj.type !== 'image') {
                alert("Select an image to crop.");
                return;
            }

            targetImage = obj;
            
            // 1. Lock the image so we don't move it while cropping
            targetImage.set({
                selectable: false,
                evented: false,
                opacity: 0.5 // Dim it slightly
            });

            // 2. Create the "Crop Box" (The mask)
            maskRect = new fabric.Rect({
                left: targetImage.left,
                top: targetImage.top,
                width: targetImage.width * targetImage.scaleX,
                height: targetImage.height * targetImage.scaleY,
                fill: 'rgba(0,0,0,0.3)',
                stroke: '#fff',
                strokeDashArray: [5, 5],
                strokeWidth: 2,
                cornerColor: 'white',
                cornerStrokeColor: 'black',
                transparentCorners: false,
                originX: targetImage.originX,
                originY: targetImage.originY
            });

            DeckForge.canvas.add(maskRect);
            DeckForge.canvas.setActiveObject(maskRect);
            DeckForge.canvas.requestRenderAll();

            // 3. Show the UI buttons
            const controls = document.getElementById('mask-controls');
            if (controls) controls.classList.remove('hidden');
            
            // Hide main properties bar
            DeckForge.UI.minimizeMenu();
        },

        // === NEW FUNCTION ADDED HERE ===
        handleTap: function(opt) {
            // Only act if the tool is active (maskRect exists)
            if (maskRect) {
                // If user clicked/tapped somewhere that is NOT the crop box
                if (!opt.target || opt.target !== maskRect) {
                    this.finish(); // Commit the crop
                }
            }
        },
        // ===============================

        finish: function() {
            if (!targetImage || !maskRect) return;

            // 1. Create the clip path based on the rect's relative position
            maskRect.clone((cloned) => {
                // FabricJS ClipPath positioning is tricky. 
                // It needs to be relative to the center of the object being clipped.
                
                // Calculate offset between Image Center and Mask Center
                const dx = maskRect.left - targetImage.left;
                const dy = maskRect.top - targetImage.top;

                cloned.set({
                    left: -dx, // Invert for clipPath relative positioning logic
                    top: -dy,
                    originX: 'center',
                    originY: 'center',
                    scaleX: maskRect.scaleX,
                    scaleY: maskRect.scaleY,
                    angle: maskRect.angle - targetImage.angle // Adjust for rotation
                });
                
                // 2. Apply the clip
                targetImage.set({
                    clipPath: cloned,
                    selectable: true,
                    evented: true,
                    opacity: 1
                });

                this.cleanup();
                DeckForge.History.save();
            });
        },

        cancel: function() {
            if (targetImage) {
                targetImage.set({
                    selectable: true,
                    evented: true,
                    opacity: 1
                });
            }
            this.cleanup();
        },

        cleanup: function() {
            if (maskRect) DeckForge.canvas.remove(maskRect);
            maskRect = null;
            targetImage = null;

            const controls = document.getElementById('mask-controls');
            if (controls) controls.classList.add('hidden');
            
            DeckForge.canvas.requestRenderAll();
        }
    };
})();
