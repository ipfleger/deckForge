
        // ========================================
        // ROULETTE ZOOM MODULE
        // ========================================
        
        const RouletteZoom = {
            scale:1,
            panX:0,
            panY:0,
            isGesturing:false,
            startDist:0,
            startScale:1,
            startX:0,
            startY:0,
            startPan:{ x:0, y:0 },

            init:function() {
                const el = Utils.getElement('deck-roulette');
                if (!el) return;

                el.addEventListener('touchstart', (e) => {
                    if (e.touches.length === 2) {
                        this.isGesturing = true;
                        this.startDist = Math.hypot(
                            e.touches[0].clientX - e.touches[1].clientX,
                            e.touches[0].clientY - e.touches[1].clientY
                        );
                        this.startScale = this.scale;
                    } else if (e.touches.length === 1 && this.scale > 1.05) {
                        this.isGesturing = true;
                        this.startX = e.touches[0].clientX;
                        this.startY = e.touches[0].clientY;
                        this.startPan = { x:this.panX, y:this.panY };
                    }
                }, { passive:false });

                el.addEventListener('touchmove', (e) => {
                    if (!this.isGesturing) return;
                    e.preventDefault();

                    if (e.touches.length === 2) {
                        const dist = Math.hypot(
                            e.touches[0].clientX - e.touches[1].clientX,
                            e.touches[0].clientY - e.touches[1].clientY
                        );
                        const zoom = dist / this.startDist;
                        this.scale = Math.min(Math.max(this.startScale * zoom, 1), 4);

                        if (this.scale === 1) {
                            this.panX = 0;
                            this.panY = 0;
                        }
                        this.update();
                    } else if (e.touches.length === 1 && this.scale > 1.05) {
                        const dx = e.touches[0].clientX - this.startX;
                        const dy = e.touches[0].clientY - this.startY;
                        this.panX = this.startPan.x + dx;
                        this.panY = this.startPan.y + dy;
                        this.update();
                    }
                }, { passive:false });

                el.addEventListener('touchend', (e) => {
                    if (e.touches.length < 2 && this.scale <= 1.05) {
                        this.reset();
                    }
                    if (e.touches.length === 0) {
                        this.isGesturing = false;
                    }
                });
            },

            update:function() {
                const target = Utils.getElement('roulette-viewport');
                if (target) {
                    target.style.transform = `translate(${this.panX}px, ${this.panY}px) scale(${this.scale})`;
                }
            },

            reset:function() {
                this.scale = 1;
                this.panX = 0;
                this.panY = 0;
                this.isGesturing = false;
                this.update();
            }
        };


