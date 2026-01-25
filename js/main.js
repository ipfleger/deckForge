const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d', { alpha: false });

let width, height;
let time = 0;
let gameActive = false; // Title screen state

// GAME STATE
const foods = [];
let player;
let rivals = [];
let nextLevelRivals = [];
let camera;
let currentDepth = 0;
let mapSize = 2000;

// TRANSITION STATE
const levelTransition = { active: false, type: 'none', timer: 0, nextDepth: 0 };

// AUDIO
const musicTracks = ['song1.mp3', 'song2.mp3', 'song3.mp3'];
let currentTrackIndex = 0;
let audioPlayer = new Audio();

function initAudio() {
    audioPlayer.src = musicTracks[currentTrackIndex];
    audioPlayer.volume = 0.5;
    audioPlayer.addEventListener('ended', () => {
        currentTrackIndex = (currentTrackIndex + 1) % musicTracks.length;
        audioPlayer.src = musicTracks[currentTrackIndex];
        audioPlayer.play().catch(e => console.log("Audio play blocked", e));
    });
}

window.activeTypes = ['length'];

// DOM ELEMENTS
const titleScreen = document.getElementById('title-screen');
const btnStart = document.getElementById('btn-start');
const btnMotion = document.getElementById('btn-motion');
const calibrationOverlay = document.getElementById('calibration-overlay');
const btnCalibrate = document.getElementById('btn-calibrate');
const liquidFill = document.getElementById('liquid-fill');

// BUTTON LISTENERS

// 1. Request Motion Access
btnMotion.addEventListener('click', () => {
    if (typeof DeviceMotionEvent !== 'undefined' && typeof DeviceMotionEvent.requestPermission === 'function') {
        DeviceMotionEvent.requestPermission()
            .then(response => {
                if (response === 'granted') {
                    Input.motionActive = true;
                    btnMotion.innerText = "Motion Active";
                    btnMotion.style.color = "#00ffff";
                } else {
                    alert("Motion access denied.");
                }
            })
            .catch(console.error);
    } else {
        alert("Device does not support motion.");
    }
});

// 2. Start Game (Triggers Calibration if needed)
btnStart.addEventListener('click', () => {
    if(audioPlayer.paused) audioPlayer.play().catch(e => console.log(e));

    if (Input.motionActive) {
        // Show Calibration Sequence
        titleScreen.classList.add('hidden');
        calibrationOverlay.style.display = 'flex';
    } else {
        // Normal Start
        titleScreen.classList.add('hidden');
        gameActive = true;
    }
});

// 3. Liquid Calibration Button
btnCalibrate.addEventListener('pointerdown', () => {
    liquidFill.style.height = '100%'; // Start filling animation

    // After 1 second (fill complete), calibrate and start
    setTimeout(() => {
        Input.calibrate();
        calibrationOverlay.style.opacity = '0';
        setTimeout(() => {
            calibrationOverlay.style.display = 'none';
            gameActive = true;
        }, 500);
    }, 1000);
});

// Reset fill if they let go early (Optional polish)
btnCalibrate.addEventListener('pointerup', () => {
    if (!gameActive) liquidFill.style.height = '0%';
});


function resize() {
    width = canvas.width = window.innerWidth;
    height = canvas.height = window.innerHeight;
    if (Visuals.init) Visuals.init(width, height);
}
window.addEventListener('resize', resize);

function spawnLoot(data) {
    if (!data || !data.segments) return;
    let isDeath = data.type === 'DEATH';
    for (let s of data.segments) {
        const loot = new Plankton(0, 0, width, height, 'length');
        loot.x = s.x; loot.y = s.y;
        if (isDeath) {
            loot.type = 'evolution'; loot.speed = 0;
        } else {
            loot.type = 'length'; loot.hue = 190; loot.speed = 0;
            loot.x += (Math.random() - 0.5) * 40; loot.y += (Math.random() - 0.5) * 40;
        }
        foods.push(loot);
        if (isDeath) isDeath = false;
    }
    if (data.segments.length > 0 && Visuals.addShockwave) Visuals.addShockwave(data.segments[0].x, data.segments[0].y);
}

function loadLevel(depthIndex) {
    if (depthIndex >= CONFIG.LEVELS.length) depthIndex = CONFIG.LEVELS.length - 1;
    if (depthIndex < 0) depthIndex = 0;

    currentDepth = depthIndex;
    const levelData = CONFIG.LEVELS[currentDepth];
    mapSize = levelData.size;
    window.activeTypes = levelData.types;

    rivals = [];
    nextLevelRivals = [];
    foods.length = 0;

    // SPAWN RELATIVE TO PLAYER
    let centerX = 0;
    let centerY = 0;
    if (player && player.head) {
        centerX = player.head.x;
        centerY = player.head.y;
    }

    // Spawn CURRENT Rivals
    for(let i=0; i<levelData.rivals; i++) {
        const enemy = new Organism(false, 30);

        const angle = Math.random() * Math.PI * 2;
        const dist = 800 + Math.random() * (mapSize/2);

        const spawnX = centerX + Math.cos(angle) * dist;
        const spawnY = centerY + Math.sin(angle) * dist;

        // --- FIX: Teleport Head AND Segments together ---
        enemy.head.x = enemy.head.oldX = spawnX;
        enemy.head.y = enemy.head.oldY = spawnY;

        for (let s of enemy.segments) {
            s.x = s.oldX = spawnX;
            s.y = s.oldY = spawnY;
        }

        enemy.territory = { x: spawnX, y: spawnY, radius: 1000 };

        if (player && player.segments.length > 0) {
            const targetLen = Math.ceil(player.segments.length * 1.05);
            while (enemy.segments.length < targetLen) {
                const tail = enemy.segments[enemy.segments.length-1];
                // New segments spawn at tail position, so they are safe
                enemy.segments.push(new Segment(tail.x + 1, tail.y + 1, enemy.segments.length));
            }
        }
        rivals.push(enemy);
    }

    // Spawn SHADOW Rivals (Level Below)
    if (currentDepth + 1 < CONFIG.LEVELS.length) {
        const nextData = CONFIG.LEVELS[currentDepth + 1];
        const shadowCount = Math.min(nextData.rivals, 2);
        for(let i=0; i<shadowCount; i++) {
            const shadow = new Organism(false, 0);

            const angle = Math.random() * Math.PI * 2;
            const dist = 500 + Math.random() * (mapSize/2);
            const shadowX = centerX + Math.cos(angle) * dist;
            const shadowY = centerY + Math.sin(angle) * dist;

            // --- FIX: Teleport Shadow Head AND Segments ---
            shadow.head.x = shadow.head.oldX = shadowX;
            shadow.head.y = shadow.head.oldY = shadowY;
            for (let s of shadow.segments) {
                s.x = s.oldX = shadowX;
                s.y = s.oldY = shadowY;
            }

            for(let j=0; j<25; j++) shadow.segments.push(new Segment(shadow.head.x, shadow.head.y, j));
            nextLevelRivals.push(shadow);
        }
    }

    // Navigation
    if (currentDepth < CONFIG.LEVELS.length - 1) {
        foods.push(new Plankton(centerX, centerY, width, height, 'void'));
    }
    if (currentDepth > 0) {
        foods.push(new Plankton(centerX, centerY, width, height, 'angel'));
    }

    // Food
    const startFood = levelData.maxFood ? levelData.maxFood : 40;
    for (let i = 0; i < startFood; i++) {
        const f = new Plankton(centerX, centerY, width, height);
        foods.push(f);
    }

    if (player && Visuals.addShockwave) Visuals.addShockwave(player.head.x, player.head.y);
}

function triggerTransition(type, nextDepth) {
    levelTransition.active = true;
    levelTransition.type = type;
    levelTransition.nextDepth = nextDepth;
    levelTransition.timer = 0;
}

function initGame() {
    if (typeof initInput === 'function') initInput(canvas);
    resize();
    initAudio();
    Visuals.init(width, height);
    camera = new Camera();
    player = new Organism(true, 190);
    loadLevel(0);
}

function loop() {
    requestAnimationFrame(loop);

    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, width, height);

    // TRANSITION LOGIC
    if (levelTransition.active) {
        levelTransition.timer += 0.02;
        if (levelTransition.timer > 1.5) {
            loadLevel(levelTransition.nextDepth);
            levelTransition.active = false;
            levelTransition.timer = 0;
        }
    }

    time += 0.015;

    // 1. DRAW BACKGROUND
    const levelColors = CONFIG.LEVELS[currentDepth].colors;
    Visuals.drawBackground(ctx, width, height, levelColors[0], levelColors[1]);

    // 2. WORLD DRAWING
    ctx.save();
    ctx.translate(width/2 - camera.x, height/2 - camera.y);

    // Shadows (Level Below)
    if (nextLevelRivals.length > 0) {
        ctx.save();
        ctx.scale(0.8, 0.8);
        ctx.translate(camera.x * 0.2, camera.y * 0.2);
        for (let shadow of nextLevelRivals) {
            if (!shadow.head.wanderDir) shadow.head.wanderDir = 1;
            if (Math.random() < 0.01) shadow.head.wanderDir *= -1;
            shadow.head.angle += 0.02 * shadow.head.wanderDir;
            shadow.head.x += Math.cos(shadow.head.angle) * 1.0;
            shadow.head.y += Math.sin(shadow.head.angle) * 1.0;

            for(let s of shadow.segments) s.integrate(shadow.segments.length);
            for (let k=0; k<CONFIG.solverIterations; k++) {
                let tx = shadow.head.x; let ty = shadow.head.y;
                for (let s of shadow.segments) { s.constrain(tx, ty, CONFIG.elasticity); tx = s.x; ty = s.y; }
            }
            shadow.drawShadow(ctx, time);
        }
        ctx.restore();
    }

    // MAIN GAME LOOP
    if (gameActive) {
        player.update(foods, time, null);
        camera.update(player.head);

        for(let r of rivals) {
            r.update(foods, time, player.head);
        }

        // Spawning & Navigation
        const currentLevelMax = CONFIG.LEVELS[currentDepth].maxFood || 30;
        if (foods.length < currentLevelMax && Math.random() < 0.05) {
            foods.push(new Plankton(camera.x, camera.y, width, height));
        }

        for (let f of foods) {
            if (!f.eaten && (f.type === 'void' || f.type === 'angel')) {
                const pickup = player.head.radius * player.bodyWidth + 20;
                const dx = player.head.x - f.x;
                const dy = player.head.y - f.y;
                if (dx*dx + dy*dy < pickup*pickup) {
                    f.eaten = true;
                    if (!levelTransition.active) {
                        if (f.type === 'void') triggerTransition('void', currentDepth + 1);
                        else if (f.type === 'angel') triggerTransition('angel', currentDepth - 1);
                    }
                }
            }
        }

        for (let i = foods.length - 1; i >= 0; i--) {
            if(foods[i].eaten) foods.splice(i, 1);
            else {
                foods[i].update(camera.x, camera.y, width, height, time);
            }
        }

        for (let i = rivals.length - 1; i >= 0; i--) {
            const r = rivals[i];

            // Player hits Rival
            const rivalLoot = player.checkCombat(r);
            if (rivalLoot) {
                spawnLoot(rivalLoot);
                if (rivalLoot.type === 'DEATH') { rivals.splice(i, 1); continue; }
            }

            // Rival hits Player
            const playerLoot = r.checkCombat(player);
            if (playerLoot) {
                // Mercy Mechanic: Warp up instead of game over
                if (playerLoot.type === 'DEATH' || player.segments.length <= 3) {
                    player.loseSegments(0.5); // Keep half
                    triggerTransition('angel', currentDepth - 1); // Warp up
                } else {
                    spawnLoot(playerLoot);
                }
            }
        }
    }

    if(player) player.draw(ctx, time);
    for (let f of foods) f.draw(ctx, time);
    for (let r of rivals) r.draw(ctx, time);

    if (Visuals.updateShockwaves) {
        for (let w of Visuals.shockwaves) {
            if(!w.active) continue;
            ctx.strokeStyle = `rgba(255,255,255,${1 - (w.pos / 100)})`;
            ctx.lineWidth = 2;
            ctx.beginPath(); ctx.arc(w.x, w.y, w.pos, 0, Math.PI*2); ctx.stroke();
        }
        Visuals.updateShockwaves(ctx, player ? player.segments.length : 15);
    }

    ctx.restore();

    // 3. DRAW SNOW
    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    Visuals.updateAndDrawParticles(ctx, width, height, camera.x, camera.y);
    ctx.restore();

    // 4. UI OVERLAYS
    Visuals.drawVignette(ctx, width, height);

    if (levelTransition.active) {
        ctx.save();
        const t = Math.min(1, levelTransition.timer);
        if (levelTransition.type === 'void') ctx.fillStyle = `rgba(0, 0, 0, ${t})`;
        else ctx.fillStyle = `rgba(255, 255, 255, ${t})`;
        ctx.fillRect(0, 0, width, height);
        ctx.restore();
    }

    // Hide Joystick if Motion Active
    if (Input.joystick.active && !Input.motionActive) {
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)'; ctx.lineWidth = 2; ctx.beginPath();
        ctx.arc(Input.joystick.originX, Input.joystick.originY, 50, 0, Math.PI*2); ctx.stroke();
        ctx.fillStyle = 'rgba(255, 255, 255, 0.5)'; ctx.beginPath();
        ctx.arc(Input.joystick.x, Input.joystick.y, 20, 0, Math.PI*2); ctx.fill();
    }
}

initGame();
loop();
