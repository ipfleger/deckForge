// ========================================
  // CANVAS MODULE
// ========================================
  const Canvas = {
    init:function() {
      canvas = new fabric.Canvas('c', {
        width:CARD_WIDTH,
        height:CARD_HEIGHT,
        backgroundColor:state.palette[0],
        selection:false,
        preserveObjectStacking:true,
        enableRetinaScaling:true
      });
      
      // Configure default object properties
      fabric.Object.prototype.set({
        transparentCorners:false,
        cornerColor:'#2563eb',
        cornerSize:20,
        touchCornerSize:40,
        borderScaleFactor:2,
        borderColor:'#2563eb',
        padding:10,
        perPixelTargetFind: true 
      });
      
      // FIX 1: Allow clicking through transparent parts of Images
      fabric.Image.prototype.set({
        perPixelTargetFind: true
      });
      
      // FIX 2: Allow clicking through transparent parts of Groups
      // This globally fixes Arcane, Circuit, etc.
      fabric.Group.prototype.set({
        perPixelTargetFind: true
      });
      
      // Extend serialization
      fabric.Object.prototype.toObject = (function(toObject) {
        return function(propertiesToInclude) {
          return fabric.util.object.extend(toObject.call(this, propertiesToInclude), {
            roleFill:this.roleFill,
            roleStroke:this.roleStroke,
            locked:this.locked,
            roleGradientStart:this.roleGradientStart,
            roleGradientEnd:this.roleGradientEnd,
            gradBalance:this.gradBalance,
            isParticleGroup:this.isParticleGroup,
            generativeType:this.generativeType
          });
        };
      })(fabric.Object.prototype.toObject);
      
      // Event handlers
      canvas.on('selection:created', this.onSelect.bind(this));
      canvas.on('selection:updated', this.onSelect.bind(this));
      canvas.on('selection:cleared', this.onDeselect.bind(this));
      canvas.on('object:modified', () => History.save());
      canvas.on('object:added', () => History.save());
      
      this.loadDefaultTemplate();
    },
    
    onSelect:function(e) {
      if (!e.selected || e.selected.length === 0) return;
      const obj = e.selected[0];
      
      try {
        UI.minimizeMenu();
        UI.setPropTab('color');
        UI.updateContextualUI(obj);
        UI.updateLockUI(obj.locked);
        Theme.updateGradientUI(obj);
        
        Utils.setInputValue('inp-opacity', obj.opacity || 1);
        Utils.setText('lbl-opacity', Math.round((obj.opacity || 1) * 100) + '%');
        Utils.setInputValue('inp-stroke', obj.strokeWidth || 0);
        Utils.setText('lbl-stroke', obj.strokeWidth || 0);
        
        if (obj.type === 'i-text') {
          Utils.setInputValue('inp-size', obj.fontSize || 40);
          Utils.setText('lbl-size', obj.fontSize || 40);
        } else {
          const s = Math.round((obj.scaleX || 1) * 100);
          Utils.setInputValue('inp-size', s);
          Utils.setText('lbl-size', s + '%');
          
          if (obj.type === 'rect') {
            Utils.setInputValue('inp-radius', obj.rx || 0);
            Utils.setText('lbl-radius', obj.rx || 0);
          }
        }
        
        Theme.renderPaletteUI();
      } catch (err) {
        console.warn("Selection UI Warning:", err);
      }
      
      canvas.requestRenderAll();
    },
    
    onDeselect:function() {
      const fab = Utils.getElement('btn-open-props');
      const propBar = Utils.getElement('prop-bar');
      const mainControls = Utils.getElement('main-controls');
      
      if (fab) fab.classList.add('scale-0');
      if (propBar) {
        propBar.classList.add('translate-y-[120%]');
        propBar.style.transform = '';
      }
      if (mainControls) mainControls.classList.remove('translate-y-24');
    },
    
    loadDefaultTemplate:function() {
      canvas.clear();
      canvas.setBackgroundColor(state.palette[0], canvas.renderAll.bind(canvas));
      
      const centerNum = new fabric.IText('3', {
        left:CARD_WIDTH / 2,
        top:CARD_HEIGHT / 2,
        fontFamily:'Inter',
        fontSize:400,
        fontWeight:'bold',
        fill:state.palette[4],
        originX:'center',
        originY:'center',
        roleFill:4,
        roleStroke:-1
      });
      
      const topLeft = new fabric.IText('3', {
        left:145,
        top:145,
        fontFamily:'Inter',
        fontSize:100,
        fontWeight:'bold',
        fill:state.palette[4],
        originX:'center',
        originY:'center',
        roleFill:4,
        roleStroke:-1
      });
      
      const btmRight = new fabric.IText('3', {
        left:CARD_WIDTH - 145,
        top:CARD_HEIGHT - 145,
        fontFamily:'Inter',
        fontSize:100,
        fontWeight:'bold',
        fill:state.palette[4],
        originX:'center',
        originY:'center',
        angle:180,
        roleFill:4,
        roleStroke:-1
      });
      
      canvas.add(centerNum, topLeft, btmRight);
      canvas.requestRenderAll();
      History.save();
    },
    
    addShape:function(type) {
      UI.closeAllDrawers();
      
      const center = {
        left:CARD_WIDTH / 2,
        top:CARD_HEIGHT / 2,
        originX:'center',
        originY:'center'
      };
      
      let obj;
      
      if (type === 'safe') {
        obj = new fabric.Rect({
          ...center,
          width:600,
          height:900,
          rx:40,
          ry:40,
          fill:'transparent',
          stroke:Utils.getPaletteColor(2),
          strokeWidth:15,
          perPixelTargetFind:true
        });
        obj.roleStroke = 2;
        obj.roleFill = -1;
      } else {
        switch (type) {
          case 'rect':
            obj = new fabric.Rect({ ...center, width:250, height:250 });
            break;
            case 'circle':
              obj = new fabric.Circle({ ...center, radius:125 });
              break;
              case 'triangle':
                obj = new fabric.Triangle({ ...center, width:250, height:250 });
                break;
                case 'star':
                  const points = [
                    { x:0, y:-50 }, { x:14, y:-20 }, { x:47, y:-15 },
                    { x:23, y:7 }, { x:29, y:40 }, { x:0, y:25 },
                    { x:-29, y:40 }, { x:-23, y:7 }, { x:-47, y:-15 },
                    { x:-14, y:-20 }
                  ];
                  obj = new fabric.Polygon(points, { ...center, scaleX:4, scaleY:4 });
                  break;
                  case 'hexagon':
                    // Flat-topped Hexagon
                  const hexRadius = 125;
                  const hexPoints = [];
                  for (let i = 0; i < 6; i++) {
                    const angle_deg = 60 * i;
                    const angle_rad = Math.PI / 180 * angle_deg;
                    hexPoints.push({
                      x: hexRadius * Math.cos(angle_rad),
                      y: hexRadius * Math.sin(angle_rad)
                    });
                  }
                  obj = new fabric.Polygon(hexPoints, { ...center, scaleX: 1, scaleY: 1 });
                  break;
                  
                  case 'shield':
                    // Classic Defender Shield Path
                  const shieldPath = "M 0 0 C 0 -20 20 -40 100 -40 C 180 -40 200 -20 200 0 C 200 100 150 180 100 220 C 50 180 0 100 0 0 Z";
                  obj = new fabric.Path(shieldPath, { ...center });
                  // Center the shield logic
                  obj.set({ originX: 'center', originY: 'center' });
                  if(obj.width > 250) obj.scaleToWidth(250);
                  break;
                  
                  case 'diamond':
                    // Rarity Gem
                  obj = new fabric.Polygon([
                    {x: 0, y: -100}, // Top
                    {x: 70, y: 0},   // Right
                    {x: 0, y: 100},  // Bottom
                    {x: -70, y: 0}   // Left
                  ], { ...center });
                  break;
                  case 'placeholder':
                    const grp = [];
                  const boxSize = 600;
                  // Box
                  grp.push(new fabric.Rect({
                    width: boxSize, height: boxSize/1.5,
                    fill: '#f3f4f6', stroke: '#d1d5db', strokeWidth: 4
                  }));
                  // X lines
                  grp.push(new fabric.Line([0, 0, boxSize, boxSize/1.5], { stroke: '#e5e7eb', strokeWidth: 4 }));
                  grp.push(new fabric.Line([boxSize, 0, 0, boxSize/1.5], { stroke: '#e5e7eb', strokeWidth: 4 }));
                  
                  obj = new fabric.Group(grp, { ...center });
                  break;
                  default:
                    obj = new fabric.Rect({ ...center, width:250, height:250 });
        }
        
        obj.roleFill = 2;
        obj.roleStroke = -1;
        obj.set({
          fill:Utils.getPaletteColor(2),
          stroke:Utils.getPaletteColor(-1),
          strokeWidth:0
        });
      }
      
      canvas.add(obj);
      canvas.setActiveObject(obj);
      this.autoPanToSelection();
    },
    
    addText:function() {
      const text = new fabric.IText('New Text', {
        left:CARD_WIDTH / 2,
        top:CARD_HEIGHT / 2,
        originX:'center',
        originY:'center',
        fontFamily:'Inter',
        fontSize:60,
        editable:false
      });
      
      text.roleFill = 4;
      text.roleStroke = -1;
      text.set('fill', Utils.getPaletteColor(4));
      
      canvas.add(text);
      canvas.setActiveObject(text);
      this.autoPanToSelection();
    },
    
    autoPanToSelection:function() {
      state.panY -= 150 * state.scale;
      UI.renderTransform();
    },
    
    triggerImageUpload:function() {
      const input = Utils.getElement('img-upload');
      if (input) input.click();
    },
    
    handleImageUpload:function(file) {
      if (!file) return;
      
      const reader = new FileReader();
      reader.onload = (ev) => {
        fabric.Image.fromURL(ev.target.result, (img) => {
          img.set({
            left:CARD_WIDTH / 2,
            top:CARD_HEIGHT / 2,
            originX:'center',
            originY:'center'
          });
          
          if (img.width > CARD_WIDTH * 0.8) {
            img.scaleToWidth(CARD_WIDTH * 0.8);
          }
          
          canvas.add(img);
          canvas.setActiveObject(img);
          History.save();
        });
      };
      reader.readAsDataURL(file);
    },
    
    deleteActive:function() {
      const obj = canvas.getActiveObject();
      if (obj && !obj.locked) {
        canvas.remove(obj);
        canvas.discardActiveObject();
        canvas.requestRenderAll();
        History.save();
      }
    },
    
    adjustLayer:function(direction) {
      const obj = canvas.getActiveObject();
      if (obj && !obj.locked) {
        if (direction === 'up') {
          obj.bringForward();
        } else {
          obj.sendBackwards();
        }
        History.save();
      }
    },
    
    toggleLock:function() {
      const obj = canvas.getActiveObject();
      if (!obj) return;
      
      const isLocked = !obj.locked;
      obj.set({
        locked:isLocked,
        lockMovementX:isLocked,
        lockMovementY:isLocked,
        lockRotation:isLocked,
        lockScalingX:isLocked,
        lockScalingY:isLocked,
        hasControls:!isLocked
      });
      
      canvas.requestRenderAll();
      UI.updateLockUI(isLocked);
      History.save();
    },
    
    rotateActive:function() {
      const obj = canvas.getActiveObject();
      if (!obj || obj.locked) return;
      
      let angle = (obj.angle + 45) % 360;
      obj.set('angle', angle);
      obj.setCoords();
      canvas.requestRenderAll();
      History.save();
    },
    
    updateProp:function(key, value) {
      const obj = canvas.getActiveObject();
      if (!obj || obj.locked) return;
      
      obj.set(key, value);
      
      if (key === 'rx') obj.set('ry', value);
      
      canvas.requestRenderAll();
      
      if (key === 'opacity') {
        Utils.setText('lbl-opacity', Math.round(value * 100) + '%');
      }
      if (key === 'strokeWidth') {
        Utils.setText('lbl-stroke', value);
      }
      if (key === 'rx') {
        Utils.setText('lbl-radius', value);
      }
      
      History.debouncedSave();
    },
    
    updateSize:function(value) {
      const obj = canvas.getActiveObject();
      if (!obj || obj.locked) return;
      
      if (obj.type === 'i-text') {
        obj.set('fontSize', parseInt(value));
        Utils.setText('lbl-size', value);
      } else {
        obj.scaleToWidth(parseInt(value) * 2.5);
        Utils.setText('lbl-size', value + '%');
      }
      
      canvas.requestRenderAll();
      History.debouncedSave();
    },
    
    cycleBlendMode:function() {
      const obj = canvas.getActiveObject();
      if (!obj || obj.locked) return;
      
      const currentMode = obj.globalCompositeOperation || 'source-over';
      const currentIndex = BLEND_MODES.indexOf(currentMode);
      const nextIndex = (currentIndex + 1) % BLEND_MODES.length;
      
      obj.set('globalCompositeOperation', BLEND_MODES[nextIndex]);
      canvas.requestRenderAll();
      History.save();
    },
    
    applyFilter:function(type, value) {
      const obj = canvas.getActiveObject();
      if (!obj || obj.type !== 'image') return;
      
      const val = parseFloat(value);
      
      if (!obj.filters) obj.filters = [];
      
      if (type === 'pixelate') {
        obj.filters = obj.filters.filter(f => !(f instanceof fabric.Image.filters.Pixelate));
        if (val > 0) {
          obj.filters.push(new fabric.Image.filters.Pixelate({ blocksize:val }));
        }
        Utils.setText('lbl-pixelate', val > 0 ? val :'Off');
      } else if (type === 'blur') {
        obj.filters = obj.filters.filter(f => !(f instanceof fabric.Image.filters.Blur));
        if (val > 0) {
          obj.filters.push(new fabric.Image.filters.Blur({ blur:val }));
        }
        Utils.setText('lbl-blur', val > 0 ? val.toFixed(2) :'Off');
      }
      
      obj.applyFilters();
      canvas.requestRenderAll();
      History.debouncedSave();
    },
    
    toggleSelectionMode:function() {
      canvas.selection = !canvas.selection;
      
      const btn = Utils.getElement('btn-multiselect');
      if (btn) {
        if (canvas.selection) {
          btn.classList.add('text-blue-600', 'bg-blue-50');
          btn.setAttribute('aria-pressed', 'true');
          canvas.defaultCursor = 'crosshair';
        } else {
          btn.classList.remove('text-blue-600', 'bg-blue-50');
          btn.setAttribute('aria-pressed', 'false');
          canvas.defaultCursor = 'default';
        }
      }
    },
    
    createClippingMask:function() {
      const sel = canvas.getActiveObjects();
      
      if (sel.length !== 2) {
        alert("Please select exactly 2 objects:An Image (bottom) and a Shape (top).");
        return;
      }
      
      sel.sort((a, b) => canvas.getObjects().indexOf(a) - canvas.getObjects().indexOf(b));
      
      const content = sel[0];
      const maskSource = sel[1];
      
      maskSource.clone(function(clonedMask) {
        clonedMask.absolutePositioned = true;
        content.set('clipPath', clonedMask);
        canvas.remove(maskSource);
        canvas.discardActiveObject();
        canvas.setActiveObject(content);
        canvas.requestRenderAll();
        History.save();
      });
    },
    
    getCanvas:function() {
      return canvas;
    }
  };
  
  // ========================================
    // ALIGNMENT MODULE
  // ========================================
    const Align = {
      // direction: 'left', 'center', 'right', 'top', 'middle', 'bottom'
      align: function(direction) {
        const active = canvas.getActiveObject();
        const selection = canvas.getActiveObjects();
        
        if (!active) return;
        
        // 1. Single Object Selected -> Align to Canvas
        if (selection.length === 1) {
          const obj = selection[0];
          const bound = obj.getBoundingRect(true); // Absolute coords
          const canvasW = canvas.width;
          const canvasH = canvas.height;
          
          switch(direction) {
            case 'left': 
              obj.set('left', obj.left - bound.left); 
            break;
            case 'center': 
              obj.centerH(); 
            break;
            case 'right': 
              obj.set('left', canvasW - (bound.width / 2) - (bound.width/2 - (obj.left - bound.left))); 
            // Simpler: just adjust left based on width. 
            // For robust generic alignment, usually centerH/centerV is safest for single objects
            // But here is a generic manual calc:
              obj.set('left', canvasW - bound.width + (obj.left - bound.left));
            break;
            case 'top': 
              obj.set('top', obj.top - bound.top); 
            break;
            case 'middle': 
              obj.centerV(); 
            break;
            case 'bottom': 
              obj.set('top', canvasH - bound.height + (obj.top - bound.top)); 
            break;
          }
          obj.setCoords();
        } 
        // 2. Multiple Objects (Group) -> Align relative to Selection Box
        else if (selection.length > 1) {
          // The 'active' object in a multi-selection is the selection group wrapper
          const groupWidth = active.width;
          const groupHeight = active.height;
          const groupLeft = active.left;
          const groupTop = active.top;
          
          selection.forEach(obj => {
            // We must calculate position relative to the group center
            const objBounds = obj.getBoundingRect(true);
            
            // Fabric groups have origin at center. 
            // Coordinates are relative to group center.
            
            switch(direction) {
              case 'left':
                // Move to left edge of group (-width/2)
              obj.set('left', -(groupWidth / 2) + (obj.width * obj.scaleX / 2));
              break;
              case 'center':
                obj.set('left', 0);
              break;
              case 'right':
                obj.set('left', (groupWidth / 2) - (obj.width * obj.scaleX / 2));
              break;
              case 'top':
                obj.set('top', -(groupHeight / 2) + (obj.height * obj.scaleY / 2));
              break;
              case 'middle':
                obj.set('top', 0);
              break;
              case 'bottom':
                obj.set('top', (groupHeight / 2) - (obj.height * obj.scaleY / 2));
              break;
            }
            obj.setCoords();
          });
          
          // Force re-render of the group
          canvas.discardActiveObject();
          const sel = new fabric.ActiveSelection(selection, { canvas: canvas });
          canvas.setActiveObject(sel);
        }
        
        canvas.requestRenderAll();
        History.save();
      },
      
      distribute: function(axis) {
        const selection = canvas.getActiveObjects();
        if (selection.length < 3) return; // Need 3+ to distribute
        
        if (axis === 'horizontal') {
          // Sort by left position
          selection.sort((a, b) => a.left - b.left);
          const totalW = selection[selection.length - 1].left - selection[0].left;
          const step = totalW / (selection.length - 1);
          
          selection.forEach((obj, i) => {
            if (i === 0 || i === selection.length - 1) return; // Anchors stay put
            obj.set('left', selection[0].left + (step * i));
            obj.setCoords();
          });
        } else {
          // Sort by top position
          selection.sort((a, b) => a.top - b.top);
          const totalH = selection[selection.length - 1].top - selection[0].top;
          const step = totalH / (selection.length - 1);
          
          selection.forEach((obj, i) => {
            if (i === 0 || i === selection.length - 1) return;
            obj.set('top', selection[0].top + (step * i));
            obj.setCoords();
          });
        }
        canvas.requestRenderAll();
        History.save();
      }
    };
