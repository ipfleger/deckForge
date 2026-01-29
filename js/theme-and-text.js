// ========================================
  // THEME MODULE
// ========================================
  
  const Theme = {
    // Inside Theme object...
    
    initColorEngine: function() {
      try {
        colorPickerInstance = new iro.ColorPicker("#iro-picker", {
          width: 220,
          color: builderPalette[activeBuilderSlot],
          layout: [
            { component: iro.ui.Wheel, options: {} },
            { component: iro.ui.Slider, options: { sliderType: 'value' } }
          ]
        });
        
        const hexInput = Utils.getElement('hex-input');
        
        // 1. Listen for Picker Changes (Drag)
        colorPickerInstance.on('color:change', (color) => {
          // Update the Data
          builderPalette[activeBuilderSlot] = color.hexString;
          
          // Update the UI Slots
          this.renderBuilderSlots();
          
          // Update the Hex Input (only if not currently focused to prevent fighting)
          if (hexInput && document.activeElement !== hexInput) {
            hexInput.value = color.hexString.toUpperCase();
          }
        });
        
        // 2. Listen for Input Changes (Typing)
        if (hexInput) {
          // Set initial value
          hexInput.value = builderPalette[activeBuilderSlot].toUpperCase();
          
          hexInput.addEventListener('input', (e) => {
            let val = e.target.value;
            
            // Add # if missing
            if (val.length > 0 && !val.startsWith('#')) {
              val = '#' + val;
            }
            
            // Validate Hex format
            if (/^#[0-9A-F]{6}$/i.test(val)) {
                // Valid Hex - Update Picker & Data
                colorPickerInstance.color.set(val);
                builderPalette[activeBuilderSlot] = val;
                this.renderBuilderSlots();
                }
          });
            
            // Force update on blur to ensure consistency
            hexInput.addEventListener('blur', () => {
              hexInput.value = colorPickerInstance.color.hexString.toUpperCase();
            });
        }
      
      this.renderBuilderSlots();
      } catch (e) {
        console.error('Color engine init error:', e);
      }
    },
  
  
  renderBuilderSlots:function() {
    const container = Utils.getElement('builder-slots');
    if (!container) return;
    
    container.innerHTML = '';
    
    builderPalette.forEach((color, index) => {
      const btn = document.createElement('button');
      btn.className = "w-9 h-9 rounded-lg cursor-pointer transition shadow-sm border relative";
      btn.style.backgroundColor = color;
      btn.setAttribute('aria-label', `Color slot ${index + 1}`);
      
      if (index === activeBuilderSlot) {
        btn.classList.add('ring-2', 'ring-blue-500', 'ring-offset-2');
        btn.innerHTML = `<div class="absolute -top-1 -right-1 w-2.5 h-2.5 bg-blue-500 rounded-full border border-white"></div>`;
      } else {
        btn.classList.add('border-gray-200');
      }
      
      btn.onclick = () => {
        activeBuilderSlot = index;
        colorPickerInstance.color.set(builderPalette[index]);
        this.renderBuilderSlots();
      };
      
      container.appendChild(btn);
    });
  },
  
  generateHarmony:function(mode) {
    if (typeof chroma === 'undefined') {
      console.warn('Chroma.js not loaded');
      return;
    }
    
    const base = colorPickerInstance.color.hexString;
    let newColors = [];
    
    if (mode === 'scale') {
      newColors = chroma.scale([
        chroma(base).brighten(2.5),
        base,
        chroma(base).darken(2.5)
      ]).mode('lch').colors(5);
    } else if (mode === 'contrast') {
      newColors = [
        '#ffffff',
        '#f3f4f6',
        base,
        chroma(base).darken(1.5).hex(),
        chroma(base).darken(3.5).hex()
      ];
    }
    
    builderPalette = newColors;
    activeBuilderSlot = 2;
    colorPickerInstance.color.set(builderPalette[2]);
    this.renderBuilderSlots();
  },
  
  saveCustomPalette:function() {
    const nameInput = Utils.getElement('new-palette-name');
    const name = nameInput ?  nameInput.value :'Custom Theme';
    
    const palette = {
      id:'c-' + Date.now(),
      name:name || 'Custom Theme',
      colors:[...builderPalette]
    };
    
    state.palettes.push(palette);
    
    // Save to localStorage
    const customPalettes = state.palettes.filter(p => p.id.startsWith('c-'));
    try {
      localStorage.setItem('deckforge_custom_palettes', JSON.stringify(customPalettes));
      this.renderSettingsUI();
      this.selectPalette(palette.colors);
    } catch (e) {
      alert("Storage Full:Cannot save theme.");
    }
  },
  
  loadCustomPalettes:function() {
    try {
      const saved = localStorage.getItem('deckforge_custom_palettes');
      if (saved) {
        const customPalettes = JSON.parse(saved);
        state.palettes = [
          ...DEFAULT_PALETTES,
          ...customPalettes
        ];
      }
    } catch (e) {
      console.error('Error loading custom palettes:', e);
    }
  },
  
  selectPalette:function(colors) {
    state.palette = colors;
    if (state.coordinatedColors) {
      this.updateCanvasColors();
    }
    this.renderPaletteUI();
    History.save();
  },
  
  renderSettingsUI:function() {
    const list = Utils.getElement('palette-list');
    if (!list) return;
    
    list.innerHTML = '';
    
    state.palettes.forEach(palette => {
      const btn = document.createElement('button');
      btn.className = "flex justify-between p-2 bg-white border rounded w-full hover:border-blue-300 transition";
      btn.setAttribute('aria-label', `Select ${palette.name} palette`);
      
      const swatches = palette.colors.map(c => 
                                            `<div class="w-3 h-3 rounded-full" style="background:${c}"></div>`
      ).join('');
      
      btn.innerHTML = `
      <span class="text-xs font-bold">${palette.name}</span>
        <div class="flex gap-0.5">${swatches}</div>
          `;
        
        btn.onclick = () => this.selectPalette(palette.colors);
        list.appendChild(btn);
    });
  },
  
  renderPaletteUI:function() {
    const row = Utils.getElement('active-palette-row');
    if (!row) return;
    
    row.innerHTML = '';
    
    const obj = canvas ?  canvas.getActiveObject() :null;
    const currentRole = obj ? (state.editMode === 'fill' ? obj.roleFill :obj.roleStroke) :-99;
    
    // Transparent swatch
    const transparentBtn = document.createElement('button');
    transparentBtn.className = `swatch bg-checkers ${currentRole === -1 ? 'active-role' :''}`;
    transparentBtn.setAttribute('aria-label', 'Transparent');
    transparentBtn.setAttribute('aria-pressed', currentRole === -1 ? 'true' :'false');
    transparentBtn.onclick = () => this.assignRole(-1);
    row.appendChild(transparentBtn);
    
    // Color swatches
    [0, 1, 2, 3, 4].forEach(i => {
      const swatch = document.createElement('button');
      swatch.className = `swatch ${currentRole === i ? 'active-role' :''}`;
      swatch.style.backgroundColor = Utils.getPaletteColor(i);
      swatch.setAttribute('aria-label', `Color ${i + 1}`);
      swatch.setAttribute('aria-pressed', currentRole === i ? 'true' :'false');
      swatch.onclick = () => this.assignRole(i);
      row.appendChild(swatch);
    });
  },
  
  assignRole:function(idx) {
    const obj = canvas.getActiveObject();
    if (!obj || obj.locked) return;
    
    // Gradient mode
    if (obj.roleGradientStart !== undefined && obj.roleGradientEnd !== undefined) {
      if (state.gradSlot === 'start') {
        obj.roleGradientStart = (idx === -1) ? 0 :idx;
      } else {
        obj.roleGradientEnd = (idx === -1) ? 0 :idx;
      }
      this.updateCanvasColors();
      this.updateGradientUI(obj);
      History.save();
      return;
    }
    
    // Standard mode
    const color = Utils.getPaletteColor(idx);
    
    const applyToItem = (o) => {
      o.set('objectCaching', false);
      const isLineArt = (o.type === 'line' || (o.stroke && (!o.fill || o.fill === 'none')));
      
      if (state.editMode === 'stroke' || isLineArt) {
        o.roleStroke = idx;
        o.roleFill = null;
        o.set('stroke', color);
        if (idx !== -1 && (!o.strokeWidth || o.strokeWidth === 0)) {
          o.set('strokeWidth', 2);
        }
      } else {
        o.roleFill = idx;
        o.roleStroke = null;
        o.set('fill', color);
        
      }
    };
    
    const traverse = (target) => {
      if (target.type === 'group' || target.type === 'activeSelection') {
        target.getObjects().forEach(child => traverse(child));
        target.set('dirty', true);
        target.set('objectCaching', false);
      } else {
        applyToItem(target);
      }
    };
    
    traverse(obj);
    canvas.requestRenderAll();
    this.renderPaletteUI();
    History.save();
  },
  
  toggleDarkMode:function() {
    state.darkMode = !state.darkMode;
    this.updateCanvasColors();
    this.renderPaletteUI();
    
    const btn = Utils.getElement('btn-dark-mode');
    const icon = Utils.getElement('icon-dark-mode');
    
    if (btn && icon) {
      if (state.darkMode) {
        btn.classList.replace('bg-gray-900', 'bg-white');
        btn.classList.replace('text-white', 'text-gray-900');
        btn.setAttribute('aria-pressed', 'true');
        icon.className = "ph-fill ph-sun text-lg";
      } else {
        btn.classList.replace('bg-white', 'bg-gray-900');
        btn.classList.replace('text-gray-900', 'text-white');
        btn.setAttribute('aria-pressed', 'false');
        icon.className = "ph-fill ph-moon text-lg";
      }
    }
  },
  
  toggleGradientMode:function() {
    const obj = canvas.getActiveObject();
    if (!obj || obj.locked) return;
    
    if (obj.roleGradientStart === undefined) {
      // Switch to gradient
      obj.roleGradientStart = 2;
      obj.roleGradientEnd = 3;
      obj.gradBalance = 0;
      
      if (obj.roleFill === -1 || obj.fill === 'transparent' || obj.fill === null) {
        obj.roleFill = -1;
      } else {
        delete obj.roleFill;
      }
    } else {
      // Switch to solid
      obj.roleFill = 2;
      delete obj.roleGradientStart;
      delete obj.roleGradientEnd;
      obj.set('fill', Utils.getPaletteColor(2));
    }
    
    this.updateCanvasColors();
    this.updateGradientUI(obj);
    this.renderPaletteUI();
    History.save();
  },
  
  setGradientSlot:function(slot) {
    state.gradSlot = slot;
    
    const btnStart = Utils.getElement('btn-grad-start');
    const btnEnd = Utils.getElement('btn-grad-end');
    
    if (slot === 'start') {
      if (btnStart) {
        btnStart.className = "flex-1 py-2 flex items-center justifycenter gap-2 rounded-lg bg-white shadow-sm ring-1 ring-black/5 text-blue-600 transition";
        btnStart.setAttribute('aria-pressed', 'true');
      }
      if (btnEnd) {
        btnEnd.className = "flex-1 py-2 flex items-center justifycenter gap-2 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-white/50 transition";
        btnEnd.setAttribute('aria-pressed', 'false');
      }
    } else {
      if (btnStart) {
        btnStart.className = "flex-1 py-2 flex itemscenter justify-center gap-2 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-white/50 transition";
        btnStart.setAttribute('aria-pressed', 'false');
      }
      if (btnEnd) {
        btnEnd.className = "flex-1 py-2 flex itemscenter justify-center gap-2 rounded-lg bg-white shadow-sm ring-1 ring-black/5 text-blue-600 transition";
        btnEnd.setAttribute('aria-pressed', 'true');
      }
    }
  },
  
  updateGradientUI:function(obj) {
    const controls = Utils.getElement('gradient-controls');
    if (!controls) return;
    
    if (obj && obj.roleGradientStart !== undefined) {
      controls.classList.remove('hidden');
      
      const startColor = Utils.getPaletteColor(obj.roleGradientStart);
      const endColor = Utils.getPaletteColor(obj.roleGradientEnd);
      
      const previewStart = Utils.getElement('preview-grad-start');
      const previewEnd = Utils.getElement('preview-grad-end');
      
      if (previewStart) previewStart.style.backgroundColor = startColor;
      if (previewEnd) previewEnd.style.backgroundColor = endColor;
      
      const currentBalance = (obj.gradBalance || 0) * 100;
      Utils.setInputValue('grad-balance', currentBalance);
    } else {
      controls.classList.add('hidden');
    }
  },
  
  updateGradientBalance:function(val) {
    const obj = canvas.getActiveObject();
    if (!obj || obj.locked || obj.roleGradientStart === undefined) return;
    
    obj.gradBalance = parseInt(val) / 100;
    this.updateCanvasColors();
    History.save();
  },
  
  updateCanvasColors:function() {
    const applyColor = (o) => {
      if (o.locked) return;
      
      // Handle particle groups
      if ((o.isParticleGroup || (o.type === 'group' && o.roleGradientStart !== undefined)) && 
          o.roleGradientStart !== undefined) {
        
        const startColor = Utils.getPaletteColor(o.roleGradientStart);
        const endColor = Utils.getPaletteColor(o.roleGradientEnd);
        const h = o.height;
        const objects = o.getObjects();
        
        objects.forEach(child => {
          const t = (child.top + (h / 2)) / h;
          const newCol = Utils.getInterpColor(startColor, endColor, Math.max(0, Math.min(1, t)));
          const type = o.generativeType || (child.strokeWidth > 0 && !child.fill ? 'stroke' :'fill');
          
          if (type === 'stroke') {
            child.set('stroke', newCol);
          } else {
            child.set('fill', newCol);
            if (child.strokeWidth > 0) child.set('stroke', newCol);
          }
        });
        o.set('dirty', true);
        return;
      }
      
      // Standard gradients
      if (o.roleGradientStart !== undefined && o.roleGradientEnd !== undefined) {
        const startColor = Utils.getPaletteColor(o.roleGradientStart);
        const endColor = Utils.getPaletteColor(o.roleGradientEnd);
        const shift = o.gradBalance || 0;
        
        const shiftedCoords = {
          x1:0 + shift,
          y1:0 + shift,
          x2:1 + shift,
          y2:1 + shift
        };
        
        if (o.type === 'path' && o.width > o.height * 1.5) {
          shiftedCoords.y1 = 0;
          shiftedCoords.y2 = 0;
        }
        
        const newGrad = new fabric.Gradient({
          type:'linear',
          gradientUnits:'percentage',
          coords:shiftedCoords,
          colorStops:[
            { offset:0, color:startColor },
            { offset:1, color:endColor }
          ]
        });
        
        if (o.strokeWidth > 0) o.set('stroke', newGrad);
        
        if (o.roleFill !== -1) {
          o.set('fill', newGrad);
          
        } else {
          o.set('fill', 'transparent');
          o.set('perPixelTargetFind', true);
        }
      }
      // Standard solid colors
      else {
        if (o.roleFill !== undefined && o.roleFill !== null && o.roleFill !== -99) {
          o.set('fill', Utils.getPaletteColor(o.roleFill));
          
        }
        if (o.roleStroke !== undefined && o.roleStroke !== null && o.roleStroke !== -99) {
          o.set('stroke', Utils.getPaletteColor(o.roleStroke));
        }
      }
      
      // Recursion for groups
      if (o.getObjects && !o.isParticleGroup) {
        o.getObjects().forEach(child => applyColor(child));
        o.set('dirty', true);
      }
    };
    
    canvas.setBackgroundColor(Utils.getPaletteColor(0), canvas.renderAll.bind(canvas));
    canvas.getObjects().forEach(obj => applyColor(obj));
    canvas.requestRenderAll();
  }
  };

// ========================================
  // TEXT MODULE
// ========================================
  
  const Text = {
    openEditor:function() {
      const obj = canvas.getActiveObject();
      if (!obj || obj.type !== 'i-text') return;
      
      const modal = Utils.getElement('text-editor');
      const input = Utils.getElement('text-input');
      
      if (modal && input) {
        input.value = obj.text;
        input.style.fontFamily = obj.fontFamily;
        input.style.textAlign = obj.textAlign;
        this.renderFontList(obj.fontFamily);
        
        const fontMenu = Utils.getElement('font-menu');
        if (fontMenu) fontMenu.classList.add('hidden');
        
        modal.classList.remove('hidden');
        input.focus();
      }
    },
    
    closeEditor:function(save) {
      const modal = Utils.getElement('text-editor');
      if (modal) modal.classList.add('hidden');
      
      if (save) {
        const obj = canvas.getActiveObject();
        const input = Utils.getElement('text-input');
        if (obj && obj.type === 'i-text' && input) {
          obj.set('text', input.value);
          canvas.requestRenderAll();
          History.save();
        }
      }
    },
    
    setProp:function(prop, value) {
      const obj = canvas.getActiveObject();
      if (obj && obj.type === 'i-text') {
        obj.set(prop, value);
        
        if (prop === 'textAlign') {
          const input = Utils.getElement('text-input');
          if (input) input.style.textAlign = value;
        }
        
        canvas.requestRenderAll();
        History.save();
      }
    },
    
    toggleFontMenu:function() {
      const menu = Utils.getElement('font-menu');
      const btn = document.querySelector('[aria-controls="font-menu"]');
      
      if (menu) {
        menu.classList.toggle('hidden');
        if (btn) {
          btn.setAttribute('aria-expanded', !menu.classList.contains('hidden'));
        }
      }
    },
    
    renderFontList:function(currentFont) {
      const container = Utils.getElement('font-list-container');
      if (!container) return;
      
      container.innerHTML = '';
      
      FONT_OPTIONS.forEach(font => {
        const btn = document.createElement('button');
        const isActive = font.val === currentFont;
        
        btn.className = `w-full text-left px-3 py-2 rounded border text-sm flex items-center justify-between ${
          isActive ?  'bg-blue-50 border-blue-500 text-blue-700' :'bg-white border-gray-200'
        }`;
        btn.style.fontFamily = font.val;
        btn.setAttribute('role', 'option');
        btn.setAttribute('aria-selected', isActive);
        btn.innerHTML = `<span>${font.name}</span>`;
        
        btn.onclick = () => {
          this.applyFont(font.val);
          this.renderFontList(font.val);
        };
        
        container.appendChild(btn);
      });
    },
    
    applyFont:function(fontFamily) {
      const obj = canvas.getActiveObject();
      const input = Utils.getElement('text-input');
      
      if (obj && obj.type === 'i-text') {
        obj.set('fontFamily', fontFamily);
        if (input) input.style.fontFamily = fontFamily;
        canvas.requestRenderAll();
        History.save();
      }
    }
  };
