// game.js - Astro Runner: Motor con Gráficos Modernos y Estilo Mario Bros
if (typeof CanvasRenderingContext2D !== 'undefined' && !CanvasRenderingContext2D.prototype.roundRect) {
    CanvasRenderingContext2D.prototype.roundRect = function(x, y, w, h, r) {
        if (!r) r = 0;
        this.rect(x, y, w, h);
        return this;
    };
}

const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

const TILE_SIZE = 32;
const VIEW_WIDTH = 480;
const VIEW_HEIGHT = 270;
const RENDER_SCALE = 2; // Renderizado Ultra-HD 2026 (960x540 supersampled con suavizado subpíxel)
canvas.width = VIEW_WIDTH * RENDER_SCALE;
canvas.height = VIEW_HEIGHT * RENDER_SCALE;

// Efectos de pantalla modernos 2026 (Juice, Screen Shake, Textos flotantes)
let screenShake = 0;
let floatingTexts = [];

function triggerScreenShake(intensity = 3) {
    screenShake = Math.max(screenShake, intensity);
}

function addFloatingText(text, x, y, color = '#facc15') {
    floatingTexts.push({
        text,
        x,
        y,
        vy: -1.3,
        alpha: 1.0,
        color
    });
}

const SAVE_KEY = 'astro_runner_save_modern_v2';
function loadProgress() {
    try {
        const data = localStorage.getItem(SAVE_KEY);
        if (data) return JSON.parse(data);
    } catch (e) {
        console.error("Error al cargar partida", e);
    }
    return {
        unlockedWorld: 1,
        unlockedLevel: 1,
        currentWorld: 1,
        currentLevel: 1,
        highScore: 0,
        totalCrystals: 0
    };
}

function saveProgress(state) {
    try {
        localStorage.setItem(SAVE_KEY, JSON.stringify(state));
    } catch (e) {
        console.error("Error al guardar partida", e);
    }
}

let saveState = loadProgress();

// Estado del juego
let currentWorldNum = saveState.currentWorld || 1;
let currentLevelNum = saveState.currentLevel || 1;
let levelData = null;
let cameraX = 0;
let score = 0;
let crystals = 0;
let lives = 3;
let energyTime = 300;
let timeAccumulator = 0;
let isPaused = false;
let isGameOver = false;
let isStageClear = false;
let victoryCoreDropped = null;

// Animación cinematográfica de la bandera de meta
let flagPoleAnimation = {
    active: false,
    timer: 0,
    flagY: 0,
    targetFlagY: 0,
    astroSliding: false,
    astroWalkingToCastle: false
};

// Secuencia y animación triunfal de Nivel Completado (Victory Celebration 2026)
let victorySequence = {
    active: false,
    timer: 0,
    isBossVictory: false,
    bannerScale: 0,
    fireworkTimer: 0
};

// Protagonista: Astro (Explorador Galáctico)
const astro = {
    x: 64,
    y: 150,
    w: 20,
    h: 28,
    vx: 0,
    vy: 0,
    speed: 3.0,
    jumpForce: -8.0, // Salto ágil, equilibrado y justo estilo clásico Mario (sin saltarse medio nivel volando)
    isGrounded: false,
    facing: 'right',
    state: 'normal', // 'normal', 'super', 'plasma'
    transformationTimer: 0, // Destellos épicos de transformación
    invulnerableTimer: 0,
    isDying: false,
    deathTimer: 0,
    animFrame: 0,
    animTimer: 0,
    squash: 1.0,
    stretch: 1.0
};

// Entidades activas
let activeEnemies = [];
let activeCrystals = [];
let activePowerUps = [];
let activePlasmaShots = [];
let particles = [];
let bossEntity = null;

// Controles y sistema de salto suave
let jumpBuffer = 0;
let coyoteTimer = 0;
const keys = {
    left: false,
    right: false,
    up: false,
    down: false,
    actionB: false,
    actionPressedOnce: false
};

// ==========================================
// CARGAR NIVEL
// ==========================================
function loadLevel(worldNum, levelNum) {
    currentWorldNum = worldNum;
    currentLevelNum = levelNum;
    saveState.currentWorld = worldNum;
    saveState.currentLevel = levelNum;
    saveProgress(saveState);

    levelData = LevelBuilder.generateLevel(worldNum, levelNum);

    // Colocar a Astro justo sobre el césped
    astro.x = levelData.spawnX;
    astro.y = levelData.spawnY;
    astro.vx = 0;
    astro.vy = 0;
    astro.isDying = false;
    astro.deathTimer = 0;
    astro.invulnerableTimer = 0;
    cameraX = 0;
    energyTime = 300;
    timeAccumulator = 0;
    isStageClear = false;
    victoryCoreDropped = null;
    flagPoleAnimation.active = false;
    flagPoleAnimation.astroSliding = false;
    flagPoleAnimation.astroWalkingToCastle = false;
    victorySequence.active = false;

    activeEnemies = JSON.parse(JSON.stringify(levelData.enemies));
    activeCrystals = JSON.parse(JSON.stringify(levelData.coins));
    activePowerUps = [];
    activePlasmaShots = [];
    particles = [];
    bossEntity = levelData.boss ? Object.assign({}, levelData.boss) : null;

    // La música suena SIEMPRE de forma continua
    try {
        window.sounds.startMusic(worldNum, levelData.isBossLevel);
    } catch (e) {
        console.error("startMusic error in loadLevel:", e);
    }
    updateUI();
}

function updateUI() {
    const worldEl = document.getElementById('uiWorld');
    const scoreEl = document.getElementById('uiScore');
    const coinsEl = document.getElementById('uiCoins');
    const livesEl = document.getElementById('uiLives');
    const timeEl = document.getElementById('uiTime');

    if (worldEl) worldEl.innerText = `${currentWorldNum}-${currentLevelNum}`;
    if (scoreEl) scoreEl.innerText = String(score).padStart(6, '0');
    if (coinsEl) coinsEl.innerText = `x${String(crystals).padStart(2, '0')}`;
    if (livesEl) livesEl.innerText = `x${lives}`;
    if (timeEl) timeEl.innerText = String(Math.max(0, Math.floor(energyTime))).padStart(3, '0');
}

// ==========================================
// FÍSICAS Y ACTUALIZACIÓN
// ==========================================
function updateGame(dt) {
    const menu = document.getElementById('mainMenuScreen');
    if (menu && (menu.classList.contains('hidden') || menu.style.display === 'none')) {
        gameStartedFromMenu = true;
    }
    if (isPaused || isGameOver || !gameStartedFromMenu) return;

    // Si la música aún no está sonando y el juego está activo, arrancar tema del mundo
    if (window.sounds && !window.sounds.musicPlaying && !window.sounds.muted && gameStartedFromMenu) {
        try {
            window.sounds.init();
            window.sounds.startMusic(currentWorldNum, levelData ? levelData.isBossLevel : false);
        } catch (e) {}
    }

    // Actualizar screen shake moderno 2026
    if (screenShake > 0) {
        screenShake = Math.max(0, screenShake - 0.25);
    }

    // Actualizar textos flotantes modernos
    for (let i = floatingTexts.length - 1; i >= 0; i--) {
        const ft = floatingTexts[i];
        ft.y += ft.vy;
        ft.alpha -= 0.024;
        if (ft.alpha <= 0) {
            floatingTexts.splice(i, 1);
        }
    }

    // Si la secuencia triunfal de Nivel Completado está activa (animación festiva 2026)
    if (victorySequence.active) {
        victorySequence.timer++;
        victorySequence.fireworkTimer++;

        // Explosiones festivas periódicas de fuegos artificiales
        if (victorySequence.fireworkTimer % 18 === 0) {
            const fx = cameraX + 40 + Math.random() * (VIEW_WIDTH - 80);
            const fy = 35 + Math.random() * 80;
            triggerCelebrationFireworks(fx, fy);
        }

        updateParticles();

        if (victorySequence.timer === 70) {
            showVictoryModal(victorySequence.isBossVictory);
        }
        return;
    }

    if (isStageClear) return;

    // Si la secuencia de la bandera de meta está en marcha
    if (flagPoleAnimation.active) {
        updateFlagPoleSequence();
        updateParticles();
        return;
    }

    timeAccumulator += dt;
    if (timeAccumulator >= 1.0) {
        energyTime--;
        timeAccumulator = 0;
        updateUI();
        if (energyTime <= 0) {
            killPlayer();
        }
    }

    if (astro.isDying) {
        astro.deathTimer++;
        astro.y += astro.vy;
        astro.vy += 0.35;
        if (astro.deathTimer > 110) {
            handleRespawn();
        }
        return;
    }

    // Efecto squash & stretch suave
    astro.squash += (1.0 - astro.squash) * 0.15;
    astro.stretch += (1.0 - astro.stretch) * 0.15;

    // Movimiento horizontal
    const currentSpeed = keys.actionB ? astro.speed * 1.35 : astro.speed;
    if (keys.left) {
        astro.vx = -currentSpeed;
        astro.facing = 'left';
    } else if (keys.right) {
        astro.vx = currentSpeed;
        astro.facing = 'right';
    } else {
        astro.vx *= 0.72;
        if (Math.abs(astro.vx) < 0.1) astro.vx = 0;
    }

    // Gestión de Salto con Jump Buffering y Coyote Time
    if (keys.up) {
        jumpBuffer = 10;
    }

    if (astro.isGrounded) {
        coyoteTimer = 8;
    } else if (coyoteTimer > 0) {
        coyoteTimer--;
    }

    if (jumpBuffer > 0) {
        jumpBuffer--;
        if (astro.isGrounded || coyoteTimer > 0) {
            astro.vy = astro.jumpForce;
            astro.isGrounded = false;
            coyoteTimer = 0;
            jumpBuffer = 0;
            astro.stretch = 1.35;
            astro.squash = 0.75;
            window.sounds.playJump(astro.state !== 'normal');
            createJetpackParticles(astro.x + astro.w / 2, astro.y + astro.h);
        }
    }

    // Gravedad clásica y firme de plataformas (evita flotabilidad excesiva en el aire)
    if (astro.vy < 0 && !keys.up) {
        // Salto variable: si se suelta el botón de salto, la gravedad frena la subida (control exacto)
        astro.vy += 0.58;
    } else {
        astro.vy += 0.44;
    }
    if (astro.vy > 9.0) astro.vy = 9.0;

    // Techo de pantalla (para no perderse fuera por arriba)
    if (astro.y < 4) {
        astro.y = 4;
        if (astro.vy < 0) astro.vy = 0;
    }

    // Movimiento y colisión X
    astro.x += astro.vx;
    checkHorizontalCollision(astro);

    if (astro.x < cameraX) {
        astro.x = cameraX;
        astro.vx = 0;
    }

    // Movimiento y colisión Y
    astro.y += astro.vy;
    const wasGrounded = astro.isGrounded;
    astro.isGrounded = false;
    checkVerticalCollision(astro);

    // Efecto al aterrizar
    if (!wasGrounded && astro.isGrounded) {
        astro.squash = 1.3;
        astro.stretch = 0.75;
        createDustPuffs(astro.x + astro.w / 2, astro.y + astro.h);
    }

    // Animación de carrera
    if (Math.abs(astro.vx) > 0.2 && astro.isGrounded) {
        astro.animTimer++;
        if (astro.animTimer % 5 === 0) {
            astro.animFrame = (astro.animFrame + 1) % 4;
        }
    } else {
        astro.animFrame = 0;
    }

    if (astro.invulnerableTimer > 0) {
        astro.invulnerableTimer--;
    }

    if (astro.transformationTimer > 0) {
        astro.transformationTimer--;
    }

    // Foso
    if (astro.y > levelData.mapHeight * TILE_SIZE + 40) {
        killPlayer();
    }

    // Disparar
    if (keys.actionB && keys.actionPressedOnce && astro.state === 'plasma') {
        keys.actionPressedOnce = false;
        spawnPlasmaShot();
    }

    // Scroll de la cámara
    const targetCamX = astro.x - VIEW_WIDTH * 0.38;
    const maxCamX = levelData.mapWidth * TILE_SIZE - VIEW_WIDTH;
    cameraX = Math.max(0, Math.min(targetCamX, maxCamX));

    updatePlasmaShots();
    updatePowerUps();
    updateEnemies();

    if (bossEntity && bossEntity.alive) {
        updateBoss();
    }

    checkCrystalCollisions();

    // Mástil de meta: comprobación fluida y generosa (al tocar el mástil o la base)
    if (!levelData.isBossLevel && !flagPoleAnimation.active && !isStageClear) {
        const flagReachX = levelData.flagX - 12;
        if (astro.x + astro.w >= flagReachX) {
            startFlagPoleSequence();
        }
    }

    // Llave / Hiper-Núcleo del Boss
    if (victoryCoreDropped) {
        updateVictoryCore();
    }

    updateParticles();
}

// ==========================================
// SECUENCIA CINEMATOGRÁFICA DE META (ESTILO SUPER MARIO BROS)
// ==========================================
function startFlagPoleSequence() {
    flagPoleAnimation.active = true;
    flagPoleAnimation.timer = 0;
    flagPoleAnimation.astroSliding = true;
    flagPoleAnimation.astroWalkingToCastle = false;
    flagPoleAnimation.flagY = (6 - 5) * 32 + 4; // Inicio en la cima del mástil
    flagPoleAnimation.targetFlagY = (6 - 1) * 32 - 12; // Base del mástil

    astro.vx = 0;
    astro.vy = 0;
    astro.x = levelData.flagX - 10; // Abrazado al mástil
    score += 5000;
    updateUI();

    window.sounds.playPowerUp();
}

function updateFlagPoleSequence() {
    flagPoleAnimation.timer++;

    if (flagPoleAnimation.astroSliding) {
        // Astro se desliza suavemente por el mástil
        astro.y += 2.2;
        if (flagPoleAnimation.flagY < flagPoleAnimation.targetFlagY) {
            flagPoleAnimation.flagY += 2.2;
        }

        // Chispas resplandecientes al deslizarse por el mástil
        if (flagPoleAnimation.timer % 3 === 0) {
            particles.push({
                x: levelData.flagX + 8,
                y: astro.y + astro.h,
                vx: (Math.random() - 0.5) * 2,
                vy: -Math.random() * 2,
                color: '#fbbf24',
                life: 18,
                size: 3
            });
        }

        const groundLevelY = (6 - 1) * 32;
        if (astro.y >= groundLevelY) {
            astro.y = groundLevelY;
            flagPoleAnimation.astroSliding = false;
            flagPoleAnimation.astroWalkingToCastle = true;
            // Salto triunfal hacia la derecha
            astro.x = levelData.flagX + 16;
            astro.vy = -3.2;
            astro.stretch = 1.25;

            // Gran estallido de fuegos artificiales de Hugo SP Studios
            for (let i = 0; i < 30; i++) {
                particles.push({
                    x: levelData.flagX + 16,
                    y: astro.y,
                    vx: (Math.random() - 0.5) * 5,
                    vy: -Math.random() * 4 - 1.5,
                    color: ['#f59e0b', '#22c55e', '#38bdf8', '#ef4444', '#ec4899', '#fef08a'][i % 6],
                    life: 40,
                    size: 4
                });
            }
        }
    } else if (flagPoleAnimation.astroWalkingToCastle) {
        // Astro camina triunfalmente hacia la puerta del castillo
        astro.x += 1.8;
        astro.facing = 'right';
        astro.animTimer++;
        if (astro.animTimer % 5 === 0) {
            astro.animFrame = (astro.animFrame + 1) % 4;
        }

        // Al entrar en la puerta del castillo
        const castleDoorX = (levelData.castleX || (levelData.mapWidth - 5) * 32) + 16;
        if (astro.x >= castleDoorX) {
            flagPoleAnimation.active = false;
            flagPoleAnimation.astroWalkingToCastle = false;
            triggerStageClear(false);
        }
    }
}

function getTileAt(col, row) {
    if (row < 0 || row >= levelData.mapHeight || col < 0 || col >= levelData.mapWidth) {
        return 0;
    }
    return levelData.grid[row][col];
}

function setTileAt(col, row, val) {
    if (row >= 0 && row < levelData.mapHeight && col >= 0 && col < levelData.mapWidth) {
        levelData.grid[row][col] = val;
    }
}

function isSolidTile(tile) {
    return tile === 1 || tile === 2 || tile === 3 || tile === 4 ||
           tile === 5 || tile === 6 || tile === 7 || tile === 8 ||
           tile === 12 || tile === 13;
}

function checkHorizontalCollision(ent) {
    const leftCol = Math.floor(ent.x / TILE_SIZE);
    const rightCol = Math.floor((ent.x + ent.w) / TILE_SIZE);
    const topRow = Math.floor(ent.y / TILE_SIZE);
    const bottomRow = Math.floor((ent.y + ent.h - 1) / TILE_SIZE);

    for (let r = topRow; r <= bottomRow; r++) {
        if (ent.vx > 0) {
            const tile = getTileAt(rightCol, r);
            if (isSolidTile(tile)) {
                ent.x = rightCol * TILE_SIZE - ent.w;
                ent.vx = 0;
                break;
            }
        } else if (ent.vx < 0) {
            const tile = getTileAt(leftCol, r);
            if (isSolidTile(tile)) {
                ent.x = (leftCol + 1) * TILE_SIZE;
                ent.vx = 0;
                break;
            }
        }
    }
}

function checkVerticalCollision(ent) {
    const leftCol = Math.floor((ent.x + 3) / TILE_SIZE);
    const rightCol = Math.floor((ent.x + ent.w - 3) / TILE_SIZE);
    const topRow = Math.floor(ent.y / TILE_SIZE);
    const bottomRow = Math.floor((ent.y + ent.h) / TILE_SIZE);

    if (ent.vy >= 0) {
        for (let c = leftCol; c <= rightCol; c++) {
            const tile = getTileAt(c, bottomRow);
            if (isSolidTile(tile)) {
                ent.y = bottomRow * TILE_SIZE - ent.h;
                ent.vy = 0;
                ent.isGrounded = true;
                coyoteTimer = 8;
                break;
            } else if (tile === 9) {
                if (ent === astro) killPlayer();
            }
        }
    } else if (ent.vy < 0) {
        for (let c = leftCol; c <= rightCol; c++) {
            const tile = getTileAt(c, topRow);
            if (isSolidTile(tile)) {
                ent.y = (topRow + 1) * TILE_SIZE;
                ent.vy = 0;

                if (ent === astro) {
                    handleBlockHit(c, topRow, tile);
                }
                break;
            }
        }
    }
}

function handleBlockHit(c, r, tile) {
    if (tile === 3) {
        setTileAt(c, r, 12);
        score += 200;
        crystals++;
        window.sounds.playCoin();
        createCoinBurst(c * TILE_SIZE + 16, r * TILE_SIZE);
        updateUI();
    } else if (tile === 4) {
        setTileAt(c, r, 12);
        const pType = (astro.state === 'normal') ? 'battery' : 'plasma';
        activePowerUps.push({
            x: c * TILE_SIZE + 6,
            y: (r - 1) * TILE_SIZE,
            w: 20,
            h: 20,
            vx: 1.3,
            vy: -2.5,
            type: pType,
            isGrounded: false
        });
        window.sounds.playPowerUp();
    } else if (tile === 2) {
        if (astro.state !== 'normal') {
            setTileAt(c, r, 0);
            score += 50;
            createDebrisParticles(c * TILE_SIZE + 16, r * TILE_SIZE + 16);
            window.sounds.playStomp();
        } else {
            createDustPuffs(c * TILE_SIZE + 16, (r + 1) * TILE_SIZE);
        }
    }
}

// ==========================================
// DISPAROS Y ENEMIGOS
// ==========================================
function spawnPlasmaShot() {
    if (activePlasmaShots.length >= 3) return;
    window.sounds.playFireball();
    const dir = astro.facing === 'right' ? 1 : -1;
    activePlasmaShots.push({
        x: astro.x + (dir > 0 ? astro.w : -8),
        y: astro.y + astro.h / 2,
        w: 10,
        h: 10,
        vx: dir * 5.8,
        vy: 0.5,
        bounces: 0
    });
}

function updatePlasmaShots() {
    for (let i = activePlasmaShots.length - 1; i >= 0; i--) {
        const ps = activePlasmaShots[i];
        ps.x += ps.vx;
        ps.y += ps.vy;
        ps.vy += 0.35;

        const col = Math.floor((ps.x + 5) / TILE_SIZE);
        const row = Math.floor((ps.y + 10) / TILE_SIZE);
        if (isSolidTile(getTileAt(col, row))) {
            ps.y = row * TILE_SIZE - ps.h;
            ps.vy = -3.8;
            ps.bounces++;
            if (ps.bounces > 4) {
                activePlasmaShots.splice(i, 1);
                continue;
            }
        }

        let hit = false;
        for (let e of activeEnemies) {
            if (e.alive && checkAABB(ps, e)) {
                e.alive = false;
                score += 150;
                window.sounds.playStomp();
                createExplosion(e.x + 10, e.y + 10, '#38bdf8');
                hit = true;
                break;
            }
        }

        if (!hit && bossEntity && bossEntity.alive && checkAABB(ps, bossEntity)) {
            damageBoss(1);
            hit = true;
        }

        if (hit || ps.x < cameraX - 50 || ps.x > cameraX + VIEW_WIDTH + 50) {
            createExplosion(ps.x, ps.y, '#38bdf8');
            activePlasmaShots.splice(i, 1);
        }
    }
}

function updatePowerUps() {
    for (let i = activePowerUps.length - 1; i >= 0; i--) {
        const p = activePowerUps[i];
        p.vy += 0.35;
        p.x += p.vx;
        checkHorizontalCollision(p);
        p.y += p.vy;
        checkVerticalCollision(p);

        if (checkAABB(astro, p)) {
            astro.transformationTimer = 45; // Animación de destellos y transformación
            if (p.type === 'battery') {
                astro.state = 'super';
                astro.h = 36;
                astro.y -= 10;
                score += 1000;
            } else if (p.type === 'plasma') {
                astro.state = 'plasma';
                astro.h = 36;
                score += 1000;
            }
            window.sounds.playPowerUp();

            // Estallido de partículas resplandecientes al transformarse
            const pColor = (p.type === 'battery') ? '#fbbf24' : '#38bdf8';
            for (let k = 0; k < 24; k++) {
                particles.push({
                    x: astro.x + astro.w / 2,
                    y: astro.y + astro.h / 2,
                    vx: (Math.random() - 0.5) * 5,
                    vy: (Math.random() - 0.5) * 5,
                    color: pColor,
                    life: 30,
                    size: 3.5
                });
            }

            updateUI();
            activePowerUps.splice(i, 1);
        }
    }
}

function updateEnemies() {
    for (let i = activeEnemies.length - 1; i >= 0; i--) {
        const e = activeEnemies[i];
        if (!e.alive) {
            activeEnemies.splice(i, 1);
            continue;
        }

        if (e.x > cameraX - 64 && e.x < cameraX + VIEW_WIDTH + 64) {
            if (e.fly) {
                // Enemigo volador (Paratroopa) con oscilación sinusoidal suave
                e.x += e.vx;
                e.y = e.baseY + Math.sin(Date.now() * 0.005 + (e.sinOffset || 0)) * 22;
                if (e.x < 10 * TILE_SIZE || e.x > (levelData.mapWidth - 10) * TILE_SIZE) {
                    e.vx = -e.vx;
                }
            } else {
                e.vy = (e.vy || 0) + 0.35;
                e.x += e.vx;

                const colAhead = Math.floor((e.vx > 0 ? e.x + 22 : e.x) / TILE_SIZE);
                const rowAt = Math.floor((e.y + 10) / TILE_SIZE);
                if (isSolidTile(getTileAt(colAhead, rowAt))) {
                    e.vx = -e.vx;
                }

                e.y += e.vy;
                const bottomRow = Math.floor((e.y + 20) / TILE_SIZE);
                const col = Math.floor((e.x + 10) / TILE_SIZE);
                if (isSolidTile(getTileAt(col, bottomRow))) {
                    e.y = bottomRow * TILE_SIZE - 20;
                    e.vy = 0;
                }
            }

            if (!astro.isDying && checkAABB(astro, { x: e.x, y: e.y, w: 22, h: 20 })) {
                if (astro.vy > 0 && (astro.y + astro.h - astro.vy) <= e.y + 12) {
                    e.alive = false;
                    astro.vy = -6.0;
                    score += 200;
                    triggerScreenShake(3.5);
                    addFloatingText('+200', e.x + 10, e.y, '#facc15');
                    window.sounds.playStomp();
                    createDustPuffs(e.x + 10, e.y + 10);
                    updateUI();
                } else if (astro.invulnerableTimer === 0) {
                    damagePlayer();
                }
            }
        }
    }
}

// ==========================================
// BOSS DE NIVEL 8
// ==========================================
let bossAttackTimer = 0;
let bossProjectiles = [];

function updateBoss() {
    const b = bossEntity;
    b.vy += 0.35;
    b.x += b.vx;

    if (b.x < 53 * TILE_SIZE) {
        b.x = 53 * TILE_SIZE;
        b.vx = Math.abs(b.vx);
    }
    if (b.x > (levelData.mapWidth - 3) * TILE_SIZE) {
        b.x = (levelData.mapWidth - 3) * TILE_SIZE;
        b.vx = -Math.abs(b.vx);
    }

    b.y += b.vy;
    const bottomRow = Math.floor((b.y + b.h) / TILE_SIZE);
    const col = Math.floor((b.x + b.w / 2) / TILE_SIZE);
    if (isSolidTile(getTileAt(col, bottomRow))) {
        b.y = bottomRow * TILE_SIZE - b.h;
        b.vy = 0;
        b.isGrounded = true;
    }

    bossAttackTimer++;
    if (bossAttackTimer % 75 === 0 && b.isGrounded) {
        b.vy = -8.0;
        b.isGrounded = false;
    }

    if (bossAttackTimer % 90 === 0) {
        const dir = (astro.x < b.x) ? -1 : 1;
        b.vx = dir * 2.5;
        bossProjectiles.push({
            x: b.x + (dir < 0 ? 0 : b.w),
            y: b.y + b.h / 3,
            w: 12,
            h: 12,
            vx: dir * 4.2,
            color: b.color
        });
        window.sounds.playFireball();
    }

    for (let i = bossProjectiles.length - 1; i >= 0; i--) {
        const bp = bossProjectiles[i];
        bp.x += bp.vx;
        if (checkAABB(astro, bp) && astro.invulnerableTimer === 0) {
            damagePlayer();
            bossProjectiles.splice(i, 1);
            continue;
        }
        if (bp.x < 50 * TILE_SIZE || bp.x > levelData.mapWidth * TILE_SIZE) {
            bossProjectiles.splice(i, 1);
        }
    }

    if (!astro.isDying && checkAABB(astro, b)) {
        if (astro.vy > 0 && (astro.y + astro.h - astro.vy) <= b.y + 16) {
            damageBoss(1);
            astro.vy = -7.8;
        } else if (astro.invulnerableTimer === 0) {
            damagePlayer();
        }
    }
}

function damageBoss(amount) {
    if (!bossEntity || !bossEntity.alive) return;
    bossEntity.hp -= amount;
    triggerScreenShake(6);
    addFloatingText('HIT!', bossEntity.x + bossEntity.w / 2, bossEntity.y, '#ef4444');
    window.sounds.playBossHurt();
    createExplosion(bossEntity.x + bossEntity.w / 2, bossEntity.y + bossEntity.h / 2, '#fbbf24');

    if (bossEntity.hp <= 0) {
        bossEntity.alive = false;
        score += 5000;
        updateUI();

        victoryCoreDropped = {
            x: bossEntity.x + bossEntity.w / 2 - 12,
            y: bossEntity.y,
            w: 24,
            h: 24,
            vy: -4,
            animTimer: 0
        };
        createExplosion(bossEntity.x, bossEntity.y, '#f59e0b');
    }
}

function updateVictoryCore() {
    const k = victoryCoreDropped;
    k.animTimer += 0.1;
    k.y += k.vy;
    k.vy += 0.2;
    if (k.y > (levelData.mapHeight - 4) * TILE_SIZE) {
        k.y = (levelData.mapHeight - 4) * TILE_SIZE;
        k.vy = 0;
    }

    if (checkAABB(astro, k)) {
        victoryCoreDropped = null;
        triggerStageClear(true);
    }
}

function damagePlayer() {
    if (astro.state === 'plasma') {
        astro.state = 'super';
        astro.invulnerableTimer = 90;
        window.sounds.playBossHurt();
    } else if (astro.state === 'super') {
        astro.state = 'normal';
        astro.h = 28;
        astro.invulnerableTimer = 90;
        window.sounds.playBossHurt();
    } else {
        killPlayer();
    }
}

function killPlayer() {
    if (astro.isDying) return;
    astro.isDying = true;
    astro.vy = -8.2;
    astro.vx = 0;
    astro.deathTimer = 0;
    lives--;
    updateUI();
    if (lives > 0) {
        try { window.sounds.playPlayerDie(); } catch (e) {}
    } else {
        try { window.sounds.playGameOver(); } catch (e) {}
    }
}

function handleRespawn() {
    astro.isDying = false;
    astro.deathTimer = 0;
    if (lives <= 0) {
        isGameOver = true;
        showGameOverModal();
    } else {
        loadLevel(currentWorldNum, currentLevelNum);
    }
}

function triggerStageClear(isWorldVictory) {
    if (isStageClear) return;
    isStageClear = true;
    try {
        window.sounds.playStageClear();
    } catch (e) {
        console.error("playStageClear note:", e);
    }

    // Iniciar secuencia festiva de victoria 2026
    victorySequence.active = true;
    victorySequence.timer = 0;
    victorySequence.isBossVictory = isWorldVictory;
    victorySequence.bannerScale = 0;
    victorySequence.fireworkTimer = 0;

    // Lanzar primera salva de fuegos artificiales festivos
    try {
        triggerCelebrationFireworks(cameraX + VIEW_WIDTH / 2, 65);
    } catch (e) {}

    if (isWorldVictory) {
        if (currentWorldNum < 9) {
            saveState.unlockedWorld = Math.max(saveState.unlockedWorld, currentWorldNum + 1);
            saveState.unlockedLevel = 1;
        } else {
            saveState.unlockedWorld = 9;
            saveState.unlockedLevel = 8;
        }
    } else {
        if (currentLevelNum < 8) {
            if (saveState.unlockedWorld === currentWorldNum) {
                saveState.unlockedLevel = Math.max(saveState.unlockedLevel, currentLevelNum + 1);
            }
        }
    }
    saveProgress(saveState);
    // Nota: El modal de victoria se mostrará automáticamente tras la animación festiva
}

function checkCrystalCollisions() {
    for (let i = activeCrystals.length - 1; i >= 0; i--) {
        const c = activeCrystals[i];
        if (checkAABB(astro, { x: c.x, y: c.y, w: 18, h: 18 })) {
            activeCrystals.splice(i, 1);
            crystals++;
            score += 100;
            addFloatingText('+100', c.x + 8, c.y, '#fde047');
            window.sounds.playCoin();
            createCoinBurst(c.x + 8, c.y + 8);
            updateUI();
        }
    }
}

function checkAABB(a, b) {
    return a.x < b.x + b.w &&
           a.x + a.w > b.x &&
           a.y < b.y + b.h &&
           a.y + a.h > b.y;
}

// ==========================================
// PARTÍCULAS
// ==========================================
function createDustPuffs(x, y) {
    for (let i = 0; i < 4; i++) {
        particles.push({
            x, y,
            vx: (Math.random() - 0.5) * 2,
            vy: -Math.random() * 1.5,
            color: 'rgba(255,255,255,0.7)',
            life: 14,
            size: 4
        });
    }
}

function createJetpackParticles(x, y) {
    for (let i = 0; i < 6; i++) {
        particles.push({
            x: x + (Math.random() - 0.5) * 6,
            y,
            vx: (Math.random() - 0.5) * 2,
            vy: Math.random() * 2 + 1,
            color: Math.random() > 0.4 ? '#38bdf8' : '#fbbf24',
            life: 16,
            size: 3
        });
    }
}

function createExplosion(x, y, color) {
    for (let i = 0; i < 14; i++) {
        particles.push({
            x, y,
            vx: (Math.random() - 0.5) * 5,
            vy: (Math.random() - 0.5) * 5,
            color: color || '#fbbf24',
            life: 24,
            size: 4
        });
    }
}

function createCoinBurst(x, y) {
    particles.push({
        x, y,
        vx: 0,
        vy: -3.6,
        color: '#fbbf24',
        life: 22,
        isCoin: true
    });
}

function createDebrisParticles(x, y) {
    for (let i = 0; i < 6; i++) {
        particles.push({
            x, y,
            vx: (Math.random() - 0.5) * 4,
            vy: -Math.random() * 3 - 2,
            color: levelData.world.blockColor,
            life: 25,
            size: 5
        });
    }
}

function updateParticles() {
    for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i];
        p.x += p.vx;
        p.y += p.vy;
        p.life--;
        if (p.isCoin) p.vy += 0.16;
        if (p.life <= 0) particles.splice(i, 1);
    }
}

// ==========================================
// RENDERIZADO VISUAL MODERNO 2026 (AAA 2.5D ENGINE)
// ==========================================
function render() {
    ctx.save();
    ctx.scale(RENDER_SCALE, RENDER_SCALE);

    // Fondo base infalible para asegurar que la pantalla NUNCA quede en negro
    const defaultSkyTop = (levelData && levelData.world && levelData.world.skyTop) ? levelData.world.skyTop : '#38bdf8';
    const defaultSkyBottom = (levelData && levelData.world && levelData.world.skyBottom) ? levelData.world.skyBottom : '#bae6fd';
    const skyGrad = ctx.createLinearGradient(0, 0, 0, VIEW_HEIGHT);
    skyGrad.addColorStop(0, defaultSkyTop);
    skyGrad.addColorStop(1, defaultSkyBottom);
    ctx.fillStyle = skyGrad;
    ctx.fillRect(0, 0, VIEW_WIDTH, VIEW_HEIGHT);

    if (!levelData) {
        ctx.restore();
        return;
    }

    // Efecto Screen Shake moderno (Impact Feel 2026)
    if (screenShake > 0) {
        const shakeMag = screenShake * 1.5;
        const sx = (Math.random() - 0.5) * shakeMag;
        const sy = (Math.random() - 0.5) * shakeMag;
        ctx.translate(sx, sy);
    }

    // Fondo temático dinámico según el mundo
    renderThemedBackdrop();

    // Dibujar tiles
    const startCol = Math.floor(cameraX / TILE_SIZE);
    const endCol = Math.min(levelData.mapWidth - 1, Math.floor((cameraX + VIEW_WIDTH) / TILE_SIZE) + 1);

    for (let r = 0; r < levelData.mapHeight; r++) {
        for (let c = startCol; c <= endCol; c++) {
            const tile = levelData.grid[r][c];
            if (tile === 0) continue;

            const drawX = Math.floor(c * TILE_SIZE - cameraX);
            const drawY = r * TILE_SIZE;
            drawMarioTile(tile, drawX, drawY, c, r);
        }
    }

    // Bandera ondeando al viento con la estrella de Hugo SP Studios
    renderWavingFlag();

    // Monedas
    for (let coin of activeCrystals) {
        if (coin.x > cameraX - 20 && coin.x < cameraX + VIEW_WIDTH + 20) {
            drawGoldCoin(coin.x - cameraX, coin.y);
        }
    }

    // Potenciadores
    for (let p of activePowerUps) {
        drawPowerUpItem(p.x - cameraX, p.y, p.type);
    }

    // Disparos
    for (let ps of activePlasmaShots) {
        drawPlasmaBall(ps.x - cameraX, ps.y);
    }

    // Enemigos
    for (let e of activeEnemies) {
        if (e.alive && e.x > cameraX - 32 && e.x < cameraX + VIEW_WIDTH + 32) {
            drawCuteEnemy(e.x - cameraX, e.y, e.type, e.fly);
        }
    }

    // Boss
    if (bossEntity && bossEntity.alive) {
        drawBossModern(bossEntity.x - cameraX, bossEntity.y);
        drawBossHealthBarModern();
    }

    // Proyectiles boss (Bolas de fuego y magma del jefe)
    for (let bp of bossProjectiles) {
        const pbx = bp.x - cameraX + 6;
        const pby = bp.y + 6;
        const fireGrad = ctx.createRadialGradient(pbx, pby, 1, pbx, pby, 7);
        fireGrad.addColorStop(0, '#fef08a');
        fireGrad.addColorStop(0.5, '#f97316');
        fireGrad.addColorStop(1, '#dc2626');
        ctx.fillStyle = fireGrad;
        ctx.beginPath();
        ctx.arc(pbx, pby, 7, 0, Math.PI * 2);
        ctx.fill();

        // Estela ardiente dinámica
        ctx.fillStyle = 'rgba(239, 68, 68, 0.6)';
        ctx.beginPath();
        ctx.arc(pbx - (bp.vx > 0 ? 6 : -6), pby, 4, 0, Math.PI * 2);
        ctx.fill();
    }

    // Llave / Núcleo
    if (victoryCoreDropped) {
        drawGoldenStar(victoryCoreDropped.x - cameraX, victoryCoreDropped.y);
    }

    // El Jugador: Astro (con alta visibilidad y animaciones)
    if (!astro.isDying || astro.deathTimer < 90) {
        if (!isStageClear || (levelData && levelData.isBossLevel)) {
            drawAstroModern();
        }
    }

    // Partículas
    for (let p of particles) {
        if (p.isCoin) {
            drawGoldCoin(p.x - cameraX, p.y);
        } else {
            ctx.fillStyle = p.color;
            ctx.fillRect(p.x - cameraX, p.y, p.size, p.size);
        }
    }

    // Textos flotantes modernos (Juice 2026)
    for (let i = floatingTexts.length - 1; i >= 0; i--) {
        const ft = floatingTexts[i];
        ctx.save();
        ctx.font = '900 12px system-ui, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillStyle = ft.color;
        ctx.shadowColor = '#000000';
        ctx.shadowBlur = 5;
        ctx.globalAlpha = Math.max(0, ft.alpha);
        ctx.fillText(ft.text, ft.x - cameraX, ft.y);
        ctx.restore();
    }

    // Animación y banner triunfal de victoria en pantalla (si la secuencia de victoria está activa)
    if (victorySequence.active) {
        renderVictoryAnimation();
    }

    // Iluminación ambiental volumétrica, God Rays y Viñeta cinematográfica 2026
    renderModernLightingAndPostProcess();

    ctx.restore();
}

function renderModernLightingAndPostProcess() {
    // 1. RAYOS DE SOL / LUZ VOLUMÉTRICOS (GOD RAYS 2026)
    ctx.save();
    const rayBreath = Math.sin(Date.now() * 0.0015) * 0.025 + 0.055;
    const rayGrad = ctx.createLinearGradient(0, 0, VIEW_WIDTH, VIEW_HEIGHT);
    rayGrad.addColorStop(0, `rgba(255, 255, 255, ${rayBreath + 0.04})`);
    rayGrad.addColorStop(0.35, `rgba(255, 255, 255, ${rayBreath})`);
    rayGrad.addColorStop(1, 'rgba(255, 255, 255, 0)');
    ctx.fillStyle = rayGrad;
    for (let r = 0; r < 4; r++) {
        const rx = ((r * 130 + 30) - (cameraX * 0.15)) % (VIEW_WIDTH + 100);
        ctx.beginPath();
        ctx.moveTo(rx, 0);
        ctx.lineTo(rx + 50, 0);
        ctx.lineTo(rx + 150, VIEW_HEIGHT);
        ctx.lineTo(rx + 80, VIEW_HEIGHT);
        ctx.closePath();
        ctx.fill();
    }
    ctx.restore();

    // 2. ILUMINACIÓN DINÁMICA DE PUNTOS DE LUZ (POINT LIGHTS CON BLOOM)
    ctx.save();
    ctx.globalCompositeOperation = 'screen'; // Mezcla lumínica vibrante

    // Luz del jugador (Astro emite una suave aura lumínica moderna)
    const playerLightRadius = 50;
    const plx = Math.floor(astro.x - cameraX + astro.w / 2);
    const ply = Math.floor(astro.y + astro.h / 2);
    const playerLight = ctx.createRadialGradient(plx, ply, 3, plx, ply, playerLightRadius);
    const auraColor = (astro.state === 'plasma') ? 'rgba(56, 189, 248, 0.32)' : (astro.state === 'super' ? 'rgba(251, 191, 36, 0.32)' : 'rgba(255, 255, 255, 0.22)');
    playerLight.addColorStop(0, auraColor);
    playerLight.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = playerLight;
    ctx.beginPath();
    ctx.arc(plx, ply, playerLightRadius, 0, Math.PI * 2);
    ctx.fill();

    // Luces de los cristales/monedas en pantalla
    for (let c of activeCrystals) {
        const cx = c.x - cameraX + 8;
        if (cx > -20 && cx < VIEW_WIDTH + 20) {
            const coinLight = ctx.createRadialGradient(cx, c.y + 8, 2, cx, c.y + 8, 22);
            coinLight.addColorStop(0, 'rgba(253, 224, 71, 0.28)');
            coinLight.addColorStop(1, 'rgba(0, 0, 0, 0)');
            ctx.fillStyle = coinLight;
            ctx.beginPath();
            ctx.arc(cx, c.y + 8, 22, 0, Math.PI * 2);
            ctx.fill();
        }
    }

    // Luz térmica ardiente del Boss si está activo
    if (bossEntity && bossEntity.alive) {
        const bx = bossEntity.x - cameraX + bossEntity.w / 2;
        const by = bossEntity.y + bossEntity.h / 2;
        const bossPulse = Math.sin(Date.now() * 0.006) * 12 + 70;
        const bossLight = ctx.createRadialGradient(bx, by, 10, bx, by, bossPulse);
        bossLight.addColorStop(0, 'rgba(239, 68, 68, 0.38)');
        bossLight.addColorStop(0.5, 'rgba(249, 115, 22, 0.2)');
        bossLight.addColorStop(1, 'rgba(0, 0, 0, 0)');
        ctx.fillStyle = bossLight;
        ctx.beginPath();
        ctx.arc(bx, by, bossPulse, 0, Math.PI * 2);
        ctx.fill();
    }
    ctx.restore();

    // 3. PARTÍCULAS AMBIENTALES SEGÚN EL MUNDO
    ctx.save();
    const weatherTheme = (levelData && levelData.world) ? (levelData.world.theme || "grassland") : "grassland";
    const now = Date.now();

    if (weatherTheme === "grassland") {
        for (let i = 0; i < 10; i++) {
            const time = (now * 0.0006 + i * 0.3) % 1;
            const wx = ((i * 48) - cameraX * 0.35 + Math.sin(time * 6 + i) * 15) % VIEW_WIDTH;
            const wy = (time * VIEW_HEIGHT);
            ctx.fillStyle = (i % 2 === 0) ? 'rgba(74, 222, 128, 0.45)' : 'rgba(254, 240, 138, 0.4)';
            ctx.beginPath();
            ctx.ellipse(wx < 0 ? wx + VIEW_WIDTH : wx, wy, 2.5, 1.5, Math.sin(time * 4), 0, Math.PI * 2);
            ctx.fill();
        }
    } else if (weatherTheme === "desert") {
        for (let i = 0; i < 14; i++) {
            const time = (now * 0.001 + i * 0.25) % 1;
            const wx = ((i * 36) - cameraX * 0.5 + time * 60) % VIEW_WIDTH;
            const wy = 40 + (i * 14) + Math.sin(time * 8) * 8;
            ctx.fillStyle = 'rgba(251, 191, 36, 0.35)';
            ctx.fillRect(wx < 0 ? wx + VIEW_WIDTH : wx, wy, 2, 2);
        }
    } else if (weatherTheme === "ice") {
        for (let i = 0; i < 16; i++) {
            const time = (now * 0.0008 + i * 0.2) % 1;
            const wx = ((i * 32) - cameraX * 0.3 + Math.sin(time * 5 + i) * 12) % VIEW_WIDTH;
            const wy = (time * VIEW_HEIGHT);
            ctx.fillStyle = 'rgba(255, 255, 255, 0.65)';
            ctx.beginPath();
            ctx.arc(wx < 0 ? wx + VIEW_WIDTH : wx, wy, 1.8, 0, Math.PI * 2);
            ctx.fill();
        }
    } else if (weatherTheme === "space") {
        for (let i = 0; i < 12; i++) {
            const twinkle = Math.sin(now * 0.004 + i) * 0.5 + 0.5;
            const sx = (i * 42 + 10) % VIEW_WIDTH;
            const sy = (i * 24 + 15) % VIEW_HEIGHT;
            ctx.fillStyle = `rgba(192, 132, 252, ${twinkle * 0.55})`;
            ctx.fillRect(sx, sy, 2.2, 2.2);
        }
    }
    ctx.restore();

    // 4. VIÑETA CINEMATOGRÁFICA Y GRADIENTE DE PROFUNDIDAD
    ctx.save();
    const vignette = ctx.createRadialGradient(
        VIEW_WIDTH / 2, VIEW_HEIGHT / 2, VIEW_WIDTH * 0.36,
        VIEW_WIDTH / 2, VIEW_HEIGHT / 2, VIEW_WIDTH * 0.72
    );
    vignette.addColorStop(0, 'rgba(0, 0, 0, 0)');
    vignette.addColorStop(1, 'rgba(2, 6, 23, 0.45)');
    ctx.fillStyle = vignette;
    ctx.fillRect(0, 0, VIEW_WIDTH, VIEW_HEIGHT);
    ctx.restore();
}

// ==========================================
// ANIMACIÓN FESTIVA Y FUEGOS ARTIFICIALES DE VICTORIA (2026 CELEBRATION)
// ==========================================
function triggerCelebrationFireworks(x, y) {
    triggerScreenShake(2.5);
    const colors = ['#fde047', '#38bdf8', '#f43f5e', '#22c55e', '#a855f7', '#fb923c', '#ffffff'];
    for (let i = 0; i < 28; i++) {
        const angle = (i / 28) * Math.PI * 2 + (Math.random() * 0.25);
        const speed = 1.4 + Math.random() * 3.8;
        particles.push({
            x: x,
            y: y,
            vx: Math.cos(angle) * speed,
            vy: Math.sin(angle) * speed - 0.7,
            color: colors[i % colors.length],
            life: 38 + Math.floor(Math.random() * 22),
            size: 3.5
        });
    }
}

function renderVictoryAnimation() {
    ctx.save();
    victorySequence.bannerScale += (1.0 - victorySequence.bannerScale) * 0.12;
    const scale = victorySequence.bannerScale;

    // Centro fijo de la pantalla en coordenadas lógicas
    const cx = VIEW_WIDTH / 2;
    const cy = VIEW_HEIGHT / 2 - 24;

    ctx.translate(cx, cy);
    ctx.scale(scale, scale);

    const bannerW = 290;
    const bannerH = 78;

    // Placa translúcida con fondo elegante
    ctx.fillStyle = 'rgba(15, 23, 42, 0.92)';
    ctx.beginPath();
    ctx.roundRect(-bannerW / 2, -bannerH / 2, bannerW, bannerH, 16);
    ctx.fill();

    // Borde dorado con resplandor neón
    ctx.strokeStyle = '#f59e0b';
    ctx.lineWidth = 2.5;
    ctx.shadowColor = '#fde047';
    ctx.shadowBlur = 14;
    ctx.stroke();

    // Texto superior de la insignia
    ctx.shadowBlur = 0;
    ctx.fillStyle = '#38bdf8';
    ctx.font = '900 11px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(victorySequence.isBossVictory ? '★ ¡LORD DE LAVA DERROTADO! ★' : '★ ¡MISIÓN ESPACIAL CUMPLIDA! ★', 0, -14);

    // Título principal triunfal
    ctx.fillStyle = '#fef08a';
    ctx.font = '900 22px Impact, system-ui, sans-serif';
    ctx.shadowColor = '#000000';
    ctx.shadowBlur = 6;
    ctx.fillText(victorySequence.isBossVictory ? '¡MUNDO SUPERADO!' : '¡NIVEL COMPLETADO!', 0, 10);

    // Subtítulo con bonificación
    ctx.fillStyle = '#4ade80';
    ctx.font = 'bold 11px system-ui, sans-serif';
    ctx.fillText('+5000 PUNTOS DE BONIFICACIÓN', 0, 27);

    ctx.restore();
}

function renderThemedBackdrop() {
    const theme = (levelData && levelData.world) ? (levelData.world.theme || "grassland") : "grassland";
    const bgOffset = cameraX * 0.25;

    // === CASTILLO CON LAVA (NIVEL FINAL CONTRA EL BOSS) ===
    if (levelData && levelData.isBossLevel) {
        // Cielo de tormenta volcánica y tinieblas del castillo
        const bossSky = ctx.createLinearGradient(0, 0, 0, VIEW_HEIGHT);
        bossSky.addColorStop(0, '#0a0204');
        bossSky.addColorStop(0.35, '#1e0508');
        bossSky.addColorStop(0.7, '#450a0a');
        bossSky.addColorStop(1, '#7f1d1d');
        ctx.fillStyle = bossSky;
        ctx.fillRect(0, 0, VIEW_WIDTH, VIEW_HEIGHT);

        // Muros de piedra gótica con almenas y aspilleras
        ctx.fillStyle = '#140407';
        for (let i = 0; i < 6; i++) {
            const bx = ((i * 105) - bgOffset * 0.3) % (VIEW_WIDTH + 110);
            ctx.fillRect(bx, 36, 64, 156);
            // Almenas superiores del castillo
            ctx.fillRect(bx - 4, 26, 20, 16);
            ctx.fillRect(bx + 24, 26, 20, 16);
            ctx.fillRect(bx + 48, 26, 20, 16);
            // Ventanas góticas estrechas con resplandor carmesí
            ctx.fillStyle = '#ef4444';
            ctx.fillRect(bx + 16, 56, 8, 24);
            ctx.fillRect(bx + 38, 56, 8, 24);
            ctx.fillStyle = '#140407';
        }

        // Gran rosetón / vitral gótico central de Bowser con calavera y fuego
        const portalX = (VIEW_WIDTH / 2 - bgOffset * 0.15) % VIEW_WIDTH;
        ctx.fillStyle = '#260408';
        ctx.beginPath();
        ctx.arc(portalX, 68, 30, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#991b1b';
        ctx.lineWidth = 3;
        ctx.stroke();

        // Ojos ardientes en el vitral
        const eyeGlow = Math.sin(Date.now() * 0.005) * 0.3 + 0.7;
        ctx.fillStyle = `rgba(249, 115, 22, ${eyeGlow})`;
        ctx.beginPath();
        ctx.ellipse(portalX - 11, 66, 6, 9, -0.2, 0, Math.PI * 2);
        ctx.ellipse(portalX + 11, 66, 6, 9, 0.2, 0, Math.PI * 2);
        ctx.fill();

        // Columnas góticas de piedra en el salón del jefe
        for (let i = 0; i < 4; i++) {
            const cx = ((i * 135 + 20) - bgOffset * 0.55) % (VIEW_WIDTH + 140);
            ctx.fillStyle = '#1b0609';
            ctx.fillRect(cx, 0, 24, VIEW_HEIGHT);
            // Capiteles de piedra
            ctx.fillStyle = '#2b090e';
            ctx.fillRect(cx - 4, 16, 32, 10);
            ctx.fillRect(cx - 2, 26, 28, 6);

            // Antorchas con fuego animado montadas en las columnas
            const torchY = 72;
            ctx.fillStyle = '#475569';
            ctx.fillRect(cx + 8, torchY + 8, 8, 12);
            ctx.fillRect(cx + 4, torchY + 16, 16, 4);

            // Llamas de la antorcha (flicker realista con Math.sin)
            const flameW = 8 + Math.sin(Date.now() * 0.02 + i) * 2;
            const flameH = 15 + Math.cos(Date.now() * 0.025 + i) * 3;
            const torchGrad = ctx.createRadialGradient(cx + 12, torchY, 2, cx + 12, torchY, 14);
            torchGrad.addColorStop(0, '#fef08a');
            torchGrad.addColorStop(0.4, '#f97316');
            torchGrad.addColorStop(1, 'rgba(220, 38, 38, 0)');
            ctx.fillStyle = torchGrad;
            ctx.beginPath();
            ctx.ellipse(cx + 12, torchY, flameW, flameH, 0, 0, Math.PI * 2);
            ctx.fill();
        }

        // Cadenas de hierro colgando del techo con oscilación
        ctx.strokeStyle = '#475569';
        ctx.lineWidth = 2;
        for (let i = 0; i < 6; i++) {
            const chainX = ((i * 85 + 35) - bgOffset * 0.45) % (VIEW_WIDTH + 80);
            const sway = Math.sin(Date.now() * 0.002 + i * 1.5) * 5;
            ctx.beginPath();
            ctx.moveTo(chainX, 0);
            ctx.quadraticCurveTo(chainX + sway * 0.5, 45, chainX + sway, 90);
            ctx.stroke();

            // Eslabones metálicos
            for (let linkY = 8; linkY <= 88; linkY += 12) {
                const linkX = chainX + (sway * (linkY / 90));
                ctx.fillStyle = '#64748b';
                ctx.fillRect(linkX - 2, linkY, 4, 6);
            }
        }

        // Foso de lava hirviente en la base del castillo
        const lavaLakeGrad = ctx.createLinearGradient(0, 184, 0, VIEW_HEIGHT);
        lavaLakeGrad.addColorStop(0, '#fbbf24');
        lavaLakeGrad.addColorStop(0.3, '#f97316');
        lavaLakeGrad.addColorStop(0.7, '#dc2626');
        lavaLakeGrad.addColorStop(1, '#450a0a');
        ctx.fillStyle = lavaLakeGrad;
        ctx.fillRect(0, 184, VIEW_WIDTH, VIEW_HEIGHT - 184);

        // Burbujas de lava hirviendo
        for (let b = 0; b < 6; b++) {
            const bubbleTime = (Date.now() * 0.003 + b * 1.7) % 3;
            const bx = ((b * 68 + 25) - bgOffset * 0.8) % VIEW_WIDTH;
            const by = 186 - bubbleTime * 4;
            const bRadius = Math.max(1, 4 - bubbleTime);
            ctx.fillStyle = '#fef08a';
            ctx.beginPath();
            ctx.arc(bx, by, bRadius, 0, Math.PI * 2);
            ctx.fill();
        }

        // Chispas y ascuas flotantes que ascienden
        for (let s = 0; s < 14; s++) {
            const sparkTime = (Date.now() * 0.0015 + s * 0.45) % 1;
            const sx = ((s * 42 + 10) - bgOffset * 0.4 + Math.sin(sparkTime * 6 + s) * 12) % VIEW_WIDTH;
            const sy = 188 - sparkTime * 140;
            ctx.fillStyle = (s % 2 === 0) ? '#fbbf24' : '#ef4444';
            ctx.fillRect(sx, sy, 2, 2);
        }

        return;
    }

    if (theme === "lava_castle") {
        // === MUNDO 8: FORTALEZA DE FUEGO, LAVA Y MAGMA ===
        // Cielo ardiente con resplandor volcánico profundo
        const lavaSky = ctx.createLinearGradient(0, 0, 0, 192);
        lavaSky.addColorStop(0, '#150202');
        lavaSky.addColorStop(0.5, '#450a0a');
        lavaSky.addColorStop(1, '#7f1d1d');
        ctx.fillStyle = lavaSky;
        ctx.fillRect(0, 0, VIEW_WIDTH, 192);

        // Volcanes colosales lejanos con ríos de magma
        for (let i = 0; i < 4; i++) {
            const vx = ((i * 170) - bgOffset * 0.5) % (VIEW_WIDTH * 2.2);
            ctx.fillStyle = '#260404';
            ctx.beginPath();
            ctx.moveTo(vx - 85, 192);
            ctx.lineTo(vx, 55 + (i % 2) * 20);
            ctx.lineTo(vx + 85, 192);
            ctx.fill();

            // Cráter ardiente con lava hirviente
            ctx.fillStyle = '#dc2626';
            ctx.beginPath();
            ctx.ellipse(vx, 55 + (i % 2) * 20, 18, 5, 0, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillStyle = '#fef08a';
            ctx.beginPath();
            ctx.ellipse(vx, 55 + (i % 2) * 20, 10, 3, 0, 0, Math.PI * 2);
            ctx.fill();

            // Cascada de lava bajando por la ladera del volcán
            ctx.strokeStyle = '#ef4444';
            ctx.lineWidth = 2.5;
            ctx.beginPath();
            ctx.moveTo(vx, 58 + (i % 2) * 20);
            ctx.quadraticCurveTo(vx + 14, 115, vx + 22, 192);
            ctx.stroke();
        }

        // Volcanes cercanos de relieve
        for (let i = 0; i < 3; i++) {
            const vx = ((i * 220 + 70) - bgOffset * 0.85) % (VIEW_WIDTH * 2.2);
            ctx.fillStyle = '#3f0707';
            ctx.beginPath();
            ctx.moveTo(vx - 70, 192);
            ctx.lineTo(vx, 75);
            ctx.lineTo(vx + 70, 192);
            ctx.fill();

            ctx.fillStyle = '#f97316';
            ctx.beginPath();
            ctx.ellipse(vx, 75, 16, 4, 0, 0, Math.PI * 2);
            ctx.fill();
        }

        // Lago de lava ardiente en el horizonte
        const lavaGrad = ctx.createLinearGradient(0, 184, 0, 192);
        lavaGrad.addColorStop(0, '#fbbf24');
        lavaGrad.addColorStop(0.35, '#ea580c');
        lavaGrad.addColorStop(1, '#7f1d1d');
        ctx.fillStyle = lavaGrad;
        ctx.fillRect(0, 184, VIEW_WIDTH, 8);

        // Chispas de fuego y brasas incandescentes flotando en el aire
        const now = Date.now();
        for (let i = 0; i < 26; i++) {
            const sx = ((i * 37 + Math.sin(now / 500 + i) * 15) - bgOffset * 1.5) % VIEW_WIDTH;
            const drawSx = (sx < 0) ? sx + VIEW_WIDTH : sx;
            const sy = (VIEW_HEIGHT - 60) - ((now / 18 + i * 26) % (VIEW_HEIGHT - 40));
            ctx.fillStyle = (i % 3 === 0) ? '#fef08a' : ((i % 2 === 0) ? '#f97316' : '#ef4444');
            const sparkSize = (i % 4 === 0) ? 3 : 2;
            ctx.fillRect(drawSx, sy, sparkSize, sparkSize);
        }

    } else if (theme === "desert") {
        // === MUNDO 2: PIRÁMIDES Y DUNAS DORADAS ===
        ctx.fillStyle = '#fef08a';
        ctx.beginPath();
        ctx.arc(VIEW_WIDTH - 60, 45, 22, 0, Math.PI * 2);
        ctx.fill();

        for (let i = 0; i < 4; i++) {
            const px = ((i * 200) - bgOffset) % (VIEW_WIDTH * 2.2);
            ctx.fillStyle = '#b45309';
            ctx.beginPath();
            ctx.moveTo(px - 70, 192);
            ctx.lineTo(px, 85 + (i % 2) * 15);
            ctx.lineTo(px + 70, 192);
            ctx.fill();

            ctx.fillStyle = '#d97706';
            ctx.beginPath();
            ctx.moveTo(px, 85 + (i % 2) * 15);
            ctx.lineTo(px + 70, 192);
            ctx.lineTo(px, 192);
            ctx.fill();
        }

        ctx.fillStyle = '#f59e0b';
        for (let i = 0; i < 5; i++) {
            const dx = ((i * 150) - bgOffset * 1.4) % (VIEW_WIDTH * 2);
            ctx.beginPath();
            ctx.arc(dx, 200, 60, Math.PI, 0, false);
            ctx.fill();
        }

    } else if (theme === "neon_cave") {
        // === MUNDO 3: CAVERNA DE CRISTALES NEÓN ===
        ctx.fillStyle = '#1e1b4b';
        for (let i = 0; i < 12; i++) {
            const sx = ((i * 50) - bgOffset * 0.8) % (VIEW_WIDTH * 2);
            ctx.beginPath();
            ctx.moveTo(sx, 0);
            ctx.lineTo(sx + 15, 35 + (i % 4) * 10);
            ctx.lineTo(sx + 30, 0);
            ctx.fill();
        }
        for (let i = 0; i < 10; i++) {
            const cx = ((i * 75) - bgOffset * 1.2) % (VIEW_WIDTH * 2);
            const cy = 130 + (i % 3) * 15;
            ctx.fillStyle = (i % 2 === 0) ? '#00f2fe' : '#c084fc';
            ctx.beginPath();
            ctx.moveTo(cx, cy);
            ctx.lineTo(cx + 6, cy - 18);
            ctx.lineTo(cx + 12, cy);
            ctx.fill();
        }

    } else if (theme === "ice") {
        // === MUNDO 5: PICOS NEVADOS Y VENTISCA ===
        for (let i = 0; i < 5; i++) {
            const mx = ((i * 170) - bgOffset) % (VIEW_WIDTH * 2.2);
            ctx.fillStyle = '#93c5fd';
            ctx.beginPath();
            ctx.moveTo(mx - 65, 192);
            ctx.lineTo(mx, 75);
            ctx.lineTo(mx + 65, 192);
            ctx.fill();

            ctx.fillStyle = '#ffffff';
            ctx.beginPath();
            ctx.moveTo(mx - 25, 120);
            ctx.lineTo(mx, 75);
            ctx.lineTo(mx + 25, 120);
            ctx.lineTo(mx, 110);
            ctx.fill();
        }
        ctx.fillStyle = '#ffffff';
        for (let i = 0; i < 20; i++) {
            const sx = ((i * 35) - bgOffset * 1.5) % (VIEW_WIDTH * 2);
            const sy = (Date.now() / 20 + i * 25) % VIEW_HEIGHT;
            ctx.fillRect(sx, sy, 2, 2);
        }

    } else if (theme === "spooky_forest") {
        // === MUNDO 6: BOSQUE NOCTURNO Y LUNA ===
        ctx.fillStyle = '#f8fafc';
        ctx.beginPath();
        ctx.arc(80, 50, 22, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = '#0f172a';
        for (let i = 0; i < 7; i++) {
            const tx = ((i * 130) - bgOffset) % (VIEW_WIDTH * 2);
            ctx.fillRect(tx + 20, 120, 10, 72);
            ctx.beginPath();
            ctx.arc(tx + 25, 120, 28, 0, Math.PI * 2);
            ctx.fill();
        }

    } else if (theme === "ocean") {
        // === MUNDO 4: OCÉANO TROPICAL Y PALMERAS ===
        ctx.fillStyle = '#0284c7';
        for (let i = 0; i < 8; i++) {
            const ox = ((i * 90) - bgOffset * 1.2) % (VIEW_WIDTH * 2);
            ctx.beginPath();
            ctx.arc(ox, 185, 30, Math.PI, 0, false);
            ctx.fill();
        }
        for (let i = 0; i < 3; i++) {
            const ix = ((i * 250) - bgOffset * 0.8) % (VIEW_WIDTH * 2);
            ctx.fillStyle = '#d97706';
            ctx.beginPath();
            ctx.ellipse(ix, 185, 35, 10, 0, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillStyle = '#15803d';
            ctx.beginPath();
            ctx.arc(ix, 155, 16, 0, Math.PI * 2);
            ctx.fill();
        }

    } else if (theme === "airship") {
        // === MUNDO 7: FLOTA CELESTIAL Y NAVES ===
        ctx.fillStyle = '#ea580c';
        for (let i = 0; i < 6; i++) {
            const cx = ((i * 160) - bgOffset * 1.2) % (VIEW_WIDTH * 2);
            ctx.beginPath();
            ctx.arc(cx, 160, 45, 0, Math.PI * 2);
            ctx.fill();
        }
        ctx.fillStyle = '#7c2d12';
        for (let i = 0; i < 3; i++) {
            const ax = ((i * 240) - bgOffset * 0.6) % (VIEW_WIDTH * 2);
            ctx.beginPath();
            ctx.ellipse(ax, 70 + i * 25, 32, 10, 0, 0, Math.PI * 2);
            ctx.fill();
        }

    } else if (theme === "space") {
        // === MUNDO 9: REINO CÓSMICO ESTELAR ===
        ctx.fillStyle = '#8b5cf6';
        ctx.beginPath();
        ctx.arc(VIEW_WIDTH - 70, 60, 22, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#c084fc';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.ellipse(VIEW_WIDTH - 70, 60, 36, 8, -0.4, 0, Math.PI * 2);
        ctx.stroke();

        ctx.fillStyle = '#ffffff';
        for (let i = 0; i < 35; i++) {
            const sx = ((i * 37) - bgOffset * 0.4) % (VIEW_WIDTH * 2);
            const sy = (i * 23) % (VIEW_HEIGHT - 60);
            ctx.fillRect(sx, sy, (i % 3 === 0) ? 2 : 1, (i % 3 === 0) ? 2 : 1);
        }

    } else {
        // ==========================================
        // === MUNDO 1: BOSQUE CON PUEBLO MEDIEVAL Y FUENTE DE AGUA (2026 AAA PARALLAX) ===
        // ==========================================
        ctx.save();

        // 1. Capa 1: Cordillera lejana de montañas boscosas azules y bruma mística
        ctx.fillStyle = '#1e3a8a';
        for (let i = 0; i < 4; i++) {
            const mx = ((i * 260) - bgOffset * 0.2) % (VIEW_WIDTH * 2.2);
            ctx.beginPath();
            ctx.moveTo(mx - 80, 192);
            ctx.lineTo(mx + 50, 75);
            ctx.lineTo(mx + 180, 192);
            ctx.closePath();
            ctx.fill();
        }

        // 2. Capa 2: Bosque lejano con pinos altos y robles en la distancia
        ctx.fillStyle = '#14532d';
        for (let i = 0; i < 7; i++) {
            const tx = ((i * 120 + 30) - bgOffset * 0.45) % (VIEW_WIDTH * 2.2);
            // Tronco lejano
            ctx.fillStyle = '#1c1917';
            ctx.fillRect(tx + 18, 120, 12, 72);
            // Follaje piramidal denso
            ctx.fillStyle = '#14532d';
            ctx.beginPath();
            ctx.moveTo(tx - 10, 140);
            ctx.lineTo(tx + 24, 70);
            ctx.lineTo(tx + 58, 140);
            ctx.closePath();
            ctx.fill();
            ctx.beginPath();
            ctx.moveTo(tx - 5, 120);
            ctx.lineTo(tx + 24, 55);
            ctx.lineTo(tx + 53, 120);
            ctx.closePath();
            ctx.fill();
        }

        // 3. Capa 3: PEQUEÑO PUEBLO EN EL BOSQUE (Casitas con chimenea + Fuente de agua viva)
        // Se dibuja en un plano de profundidad suave (paralaje bgOffset * 0.6)
        const villageXBase = ((280) - bgOffset * 0.6) % (VIEW_WIDTH * 2.5);

        // --- Casas del Pueblo ---
        const housePositions = [
            { x: villageXBase - 140, w: 38, h: 28, roofH: 18, chimney: true },
            { x: villageXBase - 60,  w: 46, h: 32, roofH: 22, chimney: true },
            { x: villageXBase + 80,  w: 42, h: 30, roofH: 20, chimney: false },
            { x: villageXBase + 160, w: 36, h: 26, roofH: 16, chimney: true }
        ];

        housePositions.forEach(house => {
            const hx = house.x;
            const hy = 192 - house.h;

            // Humo de la chimenea animado
            if (house.chimney) {
                const smokeTime = Date.now() * 0.003;
                ctx.fillStyle = '#78350f';
                ctx.fillRect(hx + 8, hy - house.roofH - 6, 6, 8); // Chimenea de ladrillo
                ctx.fillStyle = 'rgba(255, 255, 255, 0.35)';
                for (let s = 0; s < 3; s++) {
                    const sOffset = (smokeTime + s * 0.35) % 1;
                    const smX = hx + 11 + Math.sin(smokeTime * 3 + s) * 4;
                    const smY = (hy - house.roofH - 8) - sOffset * 22;
                    ctx.beginPath();
                    ctx.arc(smX, smY, 2.5 + sOffset * 3, 0, Math.PI * 2);
                    ctx.fill();
                }
            }

            // Fachada de madera y piedra de la casa
            const wallGrad = ctx.createLinearGradient(hx, hy, hx + house.w, hy);
            wallGrad.addColorStop(0, '#78350f');
            wallGrad.addColorStop(0.5, '#b45309');
            wallGrad.addColorStop(1, '#451a03');
            ctx.fillStyle = wallGrad;
            ctx.fillRect(hx, hy, house.w, house.h);

            // Vigas de madera cruzadas rústicas
            ctx.fillStyle = '#451a03';
            ctx.fillRect(hx, hy, 3, house.h);
            ctx.fillRect(hx + house.w - 3, hy, 3, house.h);
            ctx.fillRect(hx, hy + house.h / 2, house.w, 2);

            // Tejado a dos aguas rojo teja o paja alpina
            const roofGrad = ctx.createLinearGradient(hx, hy - house.roofH, hx + house.w, hy);
            roofGrad.addColorStop(0, '#dc2626');
            roofGrad.addColorStop(1, '#991b1b');
            ctx.fillStyle = roofGrad;
            ctx.beginPath();
            ctx.moveTo(hx - 5, hy);
            ctx.lineTo(hx + house.w / 2, hy - house.roofH);
            ctx.lineTo(hx + house.w + 5, hy);
            ctx.closePath();
            ctx.fill();
            ctx.strokeStyle = '#450a0a';
            ctx.lineWidth = 1.2;
            ctx.stroke();

            // Ventana iluminada con luz cálida dorada
            ctx.fillStyle = '#fde047';
            ctx.fillRect(hx + 8, hy + 6, 8, 8);
            ctx.fillStyle = '#451a03';
            ctx.fillRect(hx + 11, hy + 6, 2, 8);
            ctx.fillRect(hx + 8, hy + 9, 8, 2);

            // Puerta de madera con arco
            ctx.fillStyle = '#3f1d0b';
            ctx.fillRect(hx + house.w - 14, hy + 10, 10, house.h - 10);
            ctx.fillStyle = '#fde047';
            ctx.fillRect(hx + house.w - 7, hy + 17, 2, 2); // Pomo dorado
        });

        // --- LA FUENTE DE AGUA DEL PUEBLO ---
        // Situada en la plaza central del pueblo
        const fX = villageXBase + 10;
        const fY = 192;

        // Base redonda de piedra de la fuente
        const basinGrad = ctx.createLinearGradient(fX - 22, fY - 14, fX + 22, fY);
        basinGrad.addColorStop(0, '#94a3b8');
        basinGrad.addColorStop(0.5, '#64748b');
        basinGrad.addColorStop(1, '#334155');
        ctx.fillStyle = basinGrad;
        ctx.beginPath();
        ctx.ellipse(fX, fY - 6, 22, 9, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#1e293b';
        ctx.lineWidth = 1.5;
        ctx.stroke();

        // Agua brillante en el estanque de la fuente
        ctx.fillStyle = '#38bdf8';
        ctx.beginPath();
        ctx.ellipse(fX, fY - 7, 18, 6.5, 0, 0, Math.PI * 2);
        ctx.fill();

        // Pilar central tallado de piedra
        ctx.fillStyle = '#64748b';
        ctx.fillRect(fX - 4, fY - 26, 8, 20);
        // Plato superior de la fuente
        ctx.fillStyle = '#94a3b8';
        ctx.beginPath();
        ctx.ellipse(fX, fY - 26, 11, 4.5, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();

        // Chorro de agua vivo y animado saliendo hacia arriba
        const waterPulse = Math.sin(Date.now() * 0.008) * 2;
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(fX, fY - 32 + waterPulse, 3.5, 0, Math.PI * 2);
        ctx.fill();

        // Cascadas de agua cayendo a los lados
        ctx.strokeStyle = 'rgba(224, 242, 254, 0.85)';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(fX, fY - 30);
        ctx.quadraticCurveTo(fX - 10, fY - 24, fX - 12, fY - 8);
        ctx.moveTo(fX, fY - 30);
        ctx.quadraticCurveTo(fX + 10, fY - 24, fX + 12, fY - 8);
        ctx.stroke();

        // Salpicaduras animadas en el agua
        ctx.fillStyle = '#ffffff';
        for (let sp = 0; sp < 4; sp++) {
            const spOffset = (Date.now() * 0.01 + sp * 1.5) % (Math.PI * 2);
            ctx.fillRect(fX - 8 + Math.cos(spOffset) * 6, fY - 7 + Math.sin(spOffset) * 2, 1.8, 1.8);
        }

        // Farol de piedra rústico junto a la fuente con luz cálida
        ctx.fillStyle = '#1e293b';
        ctx.fillRect(fX - 32, fY - 22, 3, 22);
        ctx.fillStyle = '#fde047';
        ctx.beginPath();
        ctx.arc(fX - 30.5, fY - 22, 4.5, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(fX - 31.5, fY - 23, 2, 2);

        // 4. Capa 4: Árboles frondosos en plano medio envolviendo el pueblo
        for (let i = 0; i < 5; i++) {
            const fx = ((i * 170 + 70) - bgOffset * 0.85) % (VIEW_WIDTH * 2.2);
            // Tronco de madera con textura
            const trunkGrad = ctx.createLinearGradient(fx + 16, 0, fx + 32, 0);
            trunkGrad.addColorStop(0, '#451a03');
            trunkGrad.addColorStop(0.5, '#78350f');
            trunkGrad.addColorStop(1, '#291003');
            ctx.fillStyle = trunkGrad;
            ctx.fillRect(fx + 16, 110, 16, 82);

            // Ramas
            ctx.fillStyle = '#451a03';
            ctx.fillRect(fx + 28, 130, 14, 5);
            ctx.fillRect(fx + 6, 140, 12, 5);

            // Copas de follaje verde esmeralda exuberante
            const foliageGrad = ctx.createRadialGradient(fx + 24, 85, 8, fx + 24, 85, 38);
            foliageGrad.addColorStop(0, '#4ade80');
            foliageGrad.addColorStop(0.5, '#16a34a');
            foliageGrad.addColorStop(1, '#064e3b');
            ctx.fillStyle = foliageGrad;

            ctx.beginPath();
            ctx.arc(fx + 24, 90, 32, 0, Math.PI * 2);
            ctx.arc(fx + 6, 80, 24, 0, Math.PI * 2);
            ctx.arc(fx + 42, 80, 24, 0, Math.PI * 2);
            ctx.arc(fx + 24, 60, 26, 0, Math.PI * 2);
            ctx.fill();

            // Destello de sol filtrado en las hojas superiores
            ctx.fillStyle = 'rgba(254, 240, 138, 0.25)';
            ctx.beginPath();
            ctx.ellipse(fx + 24, 55, 14, 8, 0, 0, Math.PI * 2);
            ctx.fill();
        }

        // 5. Nubes suaves de bosque con viento
        ctx.fillStyle = 'rgba(255, 255, 255, 0.75)';
        for (let i = 0; i < 4; i++) {
            const cx = ((i * 210 + 40) - bgOffset * 1.3) % (VIEW_WIDTH * 2.1);
            const cy = 28 + (i % 2) * 22;
            ctx.beginPath();
            ctx.arc(cx, cy, 14, 0, Math.PI * 2);
            ctx.arc(cx + 14, cy - 6, 13, 0, Math.PI * 2);
            ctx.arc(cx + 28, cy, 14, 0, Math.PI * 2);
            ctx.fill();
        }

        ctx.restore();
    }
}

// ==========================================
// BANDERA DE META ONDEANDO AL VIENTO (HUGO SP STUDIOS)
// ==========================================
function renderWavingFlag() {
    if (!levelData || levelData.isBossLevel) return;
    const flagPoleX = levelData.flagX - cameraX;
    if (flagPoleX < -60 || flagPoleX > VIEW_WIDTH + 60) return;

    const currentY = flagPoleAnimation.active ? flagPoleAnimation.flagY : ((6 - 5) * 32 + 4);
    const poleRight = flagPoleX + 16;

    const time = Date.now();
    const wave1 = Math.sin(time / 140) * 3.5;
    const wave2 = Math.cos(time / 120) * 2.5;

    ctx.save();
    // Tela verde ondeante de la bandera
    ctx.fillStyle = '#22c55e';
    ctx.beginPath();
    ctx.moveTo(poleRight, currentY);
    ctx.lineTo(poleRight + 26, currentY + 10 + wave1);
    ctx.lineTo(poleRight, currentY + 20 + wave2);
    ctx.closePath();
    ctx.fill();

    // Ribete dorado resplandeciente
    ctx.strokeStyle = '#fef08a';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    // Estrella dorada de Hugo SP Studios en el centro
    ctx.fillStyle = '#fbbf24';
    ctx.beginPath();
    ctx.arc(poleRight + 9, currentY + 10 + wave1 * 0.4, 3.5, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
}

// ==========================================
// DIBUJO DE TILES ESTILO 2026 (AAA 2.5D PLATFORMS)
// ==========================================
function drawMarioTile(tile, x, y, c, r) {
    if (tile === 1) {
        // === 1. TIERRA ORGÁNICA ESTRATIFICADA CON CÉSPED 2.5D (2026 AAA GRAPHICS) ===
        // Sombra de oclusión ambiental proyectada bajo el bloque si flota
        ctx.fillStyle = 'rgba(0, 0, 0, 0.22)';
        ctx.fillRect(x + 2, y + TILE_SIZE, TILE_SIZE - 4, 5);

        // Bloque de tierra con degradado vertical de profundidad
        const dirtGrad = ctx.createLinearGradient(x, y + 10, x, y + TILE_SIZE);
        dirtGrad.addColorStop(0, levelData.world.dirtColor);
        dirtGrad.addColorStop(1, '#2b0c03');
        ctx.fillStyle = dirtGrad;
        ctx.fillRect(x, y + 10, TILE_SIZE, TILE_SIZE - 10);

        // Minerales y guijarros incrustados con relieve y luz especular
        ctx.fillStyle = levelData.world.dirtPattern;
        ctx.beginPath();
        ctx.ellipse(x + 7, y + 20, 4, 3, 0.2, 0, Math.PI * 2);
        ctx.ellipse(x + 22, y + 24, 5, 3.5, -0.3, 0, Math.PI * 2);
        ctx.fill();

        // Destello especular en los minerales
        ctx.fillStyle = 'rgba(255, 255, 255, 0.25)';
        ctx.fillRect(x + 6, y + 19, 2, 1);
        ctx.fillRect(x + 21, y + 23, 2, 1);

        // Sombra suave proyectada bajo el faldón de hierba
        ctx.fillStyle = 'rgba(0, 0, 0, 0.38)';
        ctx.beginPath();
        ctx.arc(x + 6, y + 13, 5, 0, Math.PI);
        ctx.arc(x + 16, y + 13, 5, 0, Math.PI);
        ctx.arc(x + 26, y + 13, 5, 0, Math.PI);
        ctx.fill();

        // Capa de césped superior con degradado tridimensional
        const grassGrad = ctx.createLinearGradient(x, y, x, y + 12);
        grassGrad.addColorStop(0, levelData.world.grassHighlight);
        grassGrad.addColorStop(0.35, levelData.world.grassColor);
        grassGrad.addColorStop(1, '#14532d');
        ctx.fillStyle = grassGrad;
        ctx.fillRect(x, y, TILE_SIZE, 11);

        // Lóbulos redondeados colgantes de hierba
        ctx.beginPath();
        ctx.arc(x + 6, y + 11, 4.5, 0, Math.PI);
        ctx.arc(x + 16, y + 11, 4.5, 0, Math.PI);
        ctx.arc(x + 26, y + 11, 4.5, 0, Math.PI);
        ctx.fill();

        // Borde superior biselado brillante (Rim Light 2026)
        ctx.fillStyle = levelData.world.grassHighlight;
        ctx.fillRect(x, y, TILE_SIZE, 2.5);

        // Briznas de hierba animadas que ondean suavemente con el viento
        const wind = Math.sin(Date.now() * 0.003 + c * 0.7) * 2;
        ctx.strokeStyle = levelData.world.grassHighlight;
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(x + 4, y);
        ctx.lineTo(x + 6 + wind, y - 4);
        ctx.moveTo(x + 14, y);
        ctx.lineTo(x + 16 + wind, y - 5);
        ctx.moveTo(x + 24, y);
        ctx.lineTo(x + 26 + wind, y - 4);
        ctx.stroke();

    } else if (tile === 13) {
        // === 2. TIERRA SUBTERRÁNEA PROFUNDA CON VETAS CRISTALINAS ===
        const deepGrad = ctx.createLinearGradient(x, y, x, y + TILE_SIZE);
        deepGrad.addColorStop(0, levelData.world.dirtColor);
        deepGrad.addColorStop(1, '#1a0502');
        ctx.fillStyle = deepGrad;
        ctx.fillRect(x, y, TILE_SIZE, TILE_SIZE);

        // Estratos geológicos y vetas minerales
        ctx.fillStyle = levelData.world.dirtPattern;
        ctx.fillRect(x + 2, y + 8, 10, 5);
        ctx.fillRect(x + 16, y + 18, 12, 6);

        // Cristal mineral brillante incrustado
        ctx.fillStyle = '#38bdf8';
        ctx.beginPath();
        ctx.moveTo(x + 18, y + 7);
        ctx.lineTo(x + 21, y + 4);
        ctx.lineTo(x + 24, y + 7);
        ctx.lineTo(x + 21, y + 10);
        ctx.fill();

        // Oclusión ambiental sutil en las esquinas
        ctx.strokeStyle = 'rgba(0, 0, 0, 0.28)';
        ctx.lineWidth = 1;
        ctx.strokeRect(x, y, TILE_SIZE, TILE_SIZE);

    } else if (tile === 2) {
        // === 3. BLOQUE DE LADRILLO 3D BISELADO (MODERN BEVELED BLOCK) ===
        // Sombra de oclusión ambiental bajo el ladrillo
        ctx.fillStyle = 'rgba(0, 0, 0, 0.26)';
        ctx.fillRect(x + 1, y + TILE_SIZE, TILE_SIZE - 2, 5);

        // Superficie con degradado del ladrillo
        const blockGrad = ctx.createLinearGradient(x, y, x + TILE_SIZE, y + TILE_SIZE);
        blockGrad.addColorStop(0, '#ea580c');
        blockGrad.addColorStop(0.5, levelData.world.blockColor);
        blockGrad.addColorStop(1, '#7c2d12');
        ctx.fillStyle = blockGrad;
        ctx.fillRect(x, y, TILE_SIZE, TILE_SIZE);

        // Bisel de luz superior e izquierdo (Specular Highlight)
        ctx.fillStyle = 'rgba(255, 255, 255, 0.38)';
        ctx.fillRect(x, y, TILE_SIZE, 2.5);
        ctx.fillRect(x, y, 2.5, TILE_SIZE);

        // Bisel de sombra inferior y derecho (Ambient Shadow)
        ctx.fillStyle = 'rgba(0, 0, 0, 0.45)';
        ctx.fillRect(x, y + TILE_SIZE - 2.5, TILE_SIZE, 2.5);
        ctx.fillRect(x + TILE_SIZE - 2.5, y, 2.5, TILE_SIZE);

        // Mortero interior con profundidad
        ctx.strokeStyle = '#450a0a';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(x + 2, y + 16);
        ctx.lineTo(x + TILE_SIZE - 2, y + 16);
        ctx.moveTo(x + 16, y + 2);
        ctx.lineTo(x + 16, y + 15);
        ctx.moveTo(x + 8, y + 17);
        ctx.lineTo(x + 8, y + TILE_SIZE - 2);
        ctx.moveTo(x + 24, y + 17);
        ctx.lineTo(x + 24, y + TILE_SIZE - 2);
        ctx.stroke();

    } else if (tile === 3 || tile === 4) {
        // === 4. BLOQUE '?' HOLOGRÁFICO METÁLICO CON SHIMMER ANIMADO ===
        // Sombra de oclusión ambiental
        ctx.fillStyle = 'rgba(0, 0, 0, 0.28)';
        ctx.fillRect(x + 2, y + TILE_SIZE, TILE_SIZE - 4, 5);

        // Cuerpo dorado metálico con degradado
        const goldGrad = ctx.createLinearGradient(x, y, x + TILE_SIZE, y + TILE_SIZE);
        goldGrad.addColorStop(0, '#fef08a');
        goldGrad.addColorStop(0.35, '#f59e0b');
        goldGrad.addColorStop(1, '#b45309');
        ctx.fillStyle = goldGrad;
        ctx.fillRect(x, y, TILE_SIZE, TILE_SIZE);

        // Brillo diagonal animado (Shimmer de alta tecnología)
        const shimmerPos = ((Date.now() * 0.05 + x * 2) % (TILE_SIZE * 3)) - TILE_SIZE;
        ctx.save();
        ctx.beginPath();
        ctx.rect(x + 2, y + 2, TILE_SIZE - 4, TILE_SIZE - 4);
        ctx.clip();
        ctx.fillStyle = 'rgba(255, 255, 255, 0.45)';
        ctx.beginPath();
        ctx.moveTo(x + shimmerPos, y);
        ctx.lineTo(x + shimmerPos + 10, y);
        ctx.lineTo(x + shimmerPos + 22, y + TILE_SIZE);
        ctx.lineTo(x + shimmerPos + 12, y + TILE_SIZE);
        ctx.fill();
        ctx.restore();

        // Borde biselado metálico
        ctx.strokeStyle = '#78350f';
        ctx.lineWidth = 1.5;
        ctx.strokeRect(x + 1, y + 1, TILE_SIZE - 2, TILE_SIZE - 2);

        // Remaches 3D esféricos en las 4 esquinas
        const rivets = [
            { rx: x + 4, ry: y + 4 },
            { rx: x + TILE_SIZE - 6, ry: y + 4 },
            { rx: x + 4, ry: y + TILE_SIZE - 6 },
            { rx: x + TILE_SIZE - 6, ry: y + TILE_SIZE - 6 }
        ];
        rivets.forEach(rv => {
            ctx.fillStyle = '#78350f';
            ctx.fillRect(rv.rx, rv.ry, 3, 3);
            ctx.fillStyle = '#fef08a';
            ctx.fillRect(rv.rx, rv.ry, 1.5, 1.5);
        });

        // Símbolo '?' blanco con resplandor neón
        ctx.save();
        ctx.fillStyle = '#ffffff';
        ctx.font = '900 20px monospace';
        ctx.shadowColor = '#fef08a';
        ctx.shadowBlur = 8;
        ctx.fillText('?', x + 9, y + 23);
        ctx.restore();

    } else if (tile >= 5 && tile <= 8) {
        // === 5. TUBERÍA METÁLICA MODERNA CON REFLEJO CILÍNDRICO ===
        const pipeY = y + 6;
        const pipeH = TILE_SIZE - 6;

        // Cuerpo cilíndrico de la tubería con degradado realista
        const pipeGrad = ctx.createLinearGradient(x, 0, x + TILE_SIZE, 0);
        pipeGrad.addColorStop(0, '#14532d');
        pipeGrad.addColorStop(0.18, '#16a34a');
        pipeGrad.addColorStop(0.35, '#86efac'); // Franja de brillo especular
        pipeGrad.addColorStop(0.65, '#22c55e');
        pipeGrad.addColorStop(1, '#052e16');
        ctx.fillStyle = pipeGrad;
        ctx.fillRect(x, pipeY, TILE_SIZE, pipeH);

        // Collarín o borde superior ensanchado
        ctx.fillRect(x - 1, pipeY, TILE_SIZE + 2, 7);

        // Tira de luz de neón cian en el collarín (Estilo Sci-Fi 2026)
        ctx.fillStyle = '#38bdf8';
        ctx.fillRect(x + 2, pipeY + 7, TILE_SIZE - 4, 1.5);

        // Contorno de alta definición
        ctx.strokeStyle = '#052e16';
        ctx.lineWidth = 1.2;
        ctx.strokeRect(x - 1, pipeY, TILE_SIZE + 2, 7);
        ctx.strokeRect(x, pipeY + 7, TILE_SIZE, pipeH - 7);

    } else if (tile === 9) {
        // === 6. LAVA FLUIDA ONDULANTE CON NÚCLEO INCANDESCENTE (NO MÁS CUADRADOS ROJOS) ===
        // Fondo volcánico profundo
        ctx.fillStyle = '#450a0a';
        ctx.fillRect(x, y, TILE_SIZE, TILE_SIZE);

        // Capa de lava media con ondas sinusoidales
        const lavaTime = Date.now() * 0.005 + x * 0.1;
        const wave1 = Math.sin(lavaTime) * 3;
        const wave2 = Math.cos(lavaTime * 1.3) * 2;

        const lavaGrad = ctx.createLinearGradient(x, y, x, y + TILE_SIZE);
        lavaGrad.addColorStop(0, '#fef08a');
        lavaGrad.addColorStop(0.2, '#f97316');
        lavaGrad.addColorStop(0.6, '#dc2626');
        lavaGrad.addColorStop(1, '#7f1d1d');
        ctx.fillStyle = lavaGrad;

        ctx.beginPath();
        ctx.moveTo(x, y + 4 + wave1);
        ctx.quadraticCurveTo(x + 16, y + 2 + wave2, x + TILE_SIZE, y + 4 + wave1);
        ctx.lineTo(x + TILE_SIZE, y + TILE_SIZE);
        ctx.lineTo(x, y + TILE_SIZE);
        ctx.closePath();
        ctx.fill();

        // Cresta viva incandescente de la lava
        ctx.strokeStyle = '#fff7ed';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(x, y + 4 + wave1);
        ctx.quadraticCurveTo(x + 16, y + 2 + wave2, x + TILE_SIZE, y + 4 + wave1);
        ctx.stroke();

        // Burbuja de magma animada
        const bubbleRise = (Date.now() * 0.003 + c) % 2;
        if (bubbleRise < 1) {
            ctx.fillStyle = '#fef08a';
            ctx.beginPath();
            ctx.arc(x + 14, y + 16 - bubbleRise * 8, 3 - bubbleRise * 1.5, 0, Math.PI * 2);
            ctx.fill();
        }

    } else if (tile === 12) {
        // === 7. PIEDRA OBSIDIANA DE FORTALEZA CON BISEL Y VETAS ===
        const stoneGrad = ctx.createLinearGradient(x, y, x + TILE_SIZE, y + TILE_SIZE);
        stoneGrad.addColorStop(0, '#334155');
        stoneGrad.addColorStop(0.5, '#1e293b');
        stoneGrad.addColorStop(1, '#0f172a');
        ctx.fillStyle = stoneGrad;
        ctx.fillRect(x, y, TILE_SIZE, TILE_SIZE);

        // Bisel de luz y sombra
        ctx.fillStyle = 'rgba(255, 255, 255, 0.2)';
        ctx.fillRect(x, y, TILE_SIZE, 2);
        ctx.fillRect(x, y, 2, TILE_SIZE);
        ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
        ctx.fillRect(x, y + TILE_SIZE - 2, TILE_SIZE, 2);
        ctx.fillRect(x + TILE_SIZE - 2, y, 2, TILE_SIZE);

        // Línea rúnica o junta de mortero con leve brillo carmesí
        ctx.strokeStyle = 'rgba(239, 68, 68, 0.35)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(x + 4, y + 16);
        ctx.lineTo(x + TILE_SIZE - 4, y + 16);
        ctx.stroke();

    } else if (tile === 10) {
        // === 8. MÁSTIL DE META CROMADO ELEGANTE ===
        const mastGrad = ctx.createLinearGradient(x + 13, 0, x + 19, 0);
        mastGrad.addColorStop(0, '#334155');
        mastGrad.addColorStop(0.4, '#ffffff');
        mastGrad.addColorStop(0.7, '#94a3b8');
        mastGrad.addColorStop(1, '#1e293b');
        ctx.fillStyle = mastGrad;
        ctx.fillRect(x + 13, y, 6, TILE_SIZE);

        // Bola dorada superior con brillo (solo en fila r === 1)
        if (r === 1) {
            ctx.save();
            ctx.fillStyle = '#fbbf24';
            ctx.shadowColor = '#fef08a';
            ctx.shadowBlur = 10;
            ctx.beginPath();
            ctx.arc(x + 16, y + 4, 8, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillStyle = '#ffffff';
            ctx.beginPath();
            ctx.arc(x + 14, y + 2, 2.5, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();
        }

        // Pedestal de piedra esculpida en la base (r === 5)
        if (r === 5) {
            ctx.fillStyle = '#1e293b';
            ctx.fillRect(x + 4, y + 12, 24, 20);
            ctx.fillStyle = '#475569';
            ctx.fillRect(x + 6, y + 12, 20, 3);
            ctx.strokeStyle = '#0f172a';
            ctx.lineWidth = 1.5;
            ctx.strokeRect(x + 4, y + 12, 24, 20);
        }

    } else if (tile === 11) {
        // === 9. PUERTA DEL CASTILLO GÓTICO ===
        ctx.fillStyle = '#020617';
        ctx.beginPath();
        ctx.arc(x + 16, y + 16, 14, Math.PI, 0, false);
        ctx.lineTo(x + 30, y + 32);
        ctx.lineTo(x + 2, y + 32);
        ctx.closePath();
        ctx.fill();
        ctx.strokeStyle = '#475569';
        ctx.lineWidth = 2;
        ctx.stroke();
    }
}

// ==========================================
// DIBUJO DE ASTRO 2026 (VOLUMÉTRICO Y ULTRA DETALLADO)
// ==========================================
function drawAstroModern() {
    const px = Math.floor(astro.x - cameraX);
    const py = Math.floor(astro.y);

    ctx.save();
    ctx.translate(px + astro.w / 2, py + astro.h);
    ctx.scale(astro.squash, astro.stretch);
    ctx.translate(-(px + astro.w / 2), -(py + astro.h));

    if (astro.facing === 'left') {
        ctx.scale(-1, 1);
        ctx.translate(-px * 2 - astro.w, 0);
    }

    // Traje y colores de alta fidelidad
    const isSuper = astro.state === 'super';
    const isPlasma = astro.state === 'plasma';
    const isTransforming = astro.transformationTimer > 0;

    let suitColor = '#f8fafc';
    let armorColor = '#0284c7';
    let visorColor = '#38bdf8';

    if (isTransforming && Math.floor(astro.transformationTimer / 3) % 2 === 0) {
        suitColor = '#ffffff';
        armorColor = '#fef08a';
        visorColor = '#f59e0b';
    } else if (isSuper) {
        suitColor = '#fbbf24'; // Armadura dorada resplandeciente
        armorColor = '#b45309';
        visorColor = '#fef08a';
    } else if (isPlasma) {
        suitColor = '#ef4444'; // Exo-traje carmesí de combate
        armorColor = '#991b1b';
        visorColor = '#38bdf8';
    }

    // Estela de movimiento translúcida si corre a gran velocidad
    if (Math.abs(astro.vx) > 2.5) {
        ctx.save();
        ctx.globalAlpha = 0.25;
        ctx.fillStyle = armorColor;
        ctx.fillRect(px - (astro.vx > 0 ? 6 : -6), py + 4, astro.w, astro.h);
        ctx.restore();
    }

    // Aura de poder si está transformado
    if (isSuper || isPlasma || isTransforming) {
        ctx.save();
        ctx.strokeStyle = isPlasma ? 'rgba(56, 189, 248, 0.8)' : 'rgba(251, 191, 36, 0.8)';
        ctx.lineWidth = 2.5;
        ctx.shadowColor = isPlasma ? '#38bdf8' : '#fbbf24';
        ctx.shadowBlur = 8;
        ctx.beginPath();
        ctx.ellipse(px + astro.w / 2, py + astro.h / 2, astro.w / 2 + 5, astro.h / 2 + 5, 0, 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();
    }

    // Micro-Jetpack trasero con llama de plasma animada
    ctx.fillStyle = '#334155';
    ctx.fillRect(px - 5, py + 8, 6, astro.h - 14);
    ctx.fillStyle = '#64748b';
    ctx.fillRect(px - 4, py + 9, 2, astro.h - 16); // Reflejo metálico del jetpack

    if (!astro.isGrounded) {
        // Llama activa del jetpack con degradado
        const flameLength = 8 + Math.sin(Date.now() * 0.03) * 3;
        const thrusterGrad = ctx.createLinearGradient(px - 2, py + astro.h - 6, px - 2, py + astro.h + flameLength);
        thrusterGrad.addColorStop(0, '#ffffff');
        thrusterGrad.addColorStop(0.3, isPlasma ? '#f97316' : '#38bdf8');
        thrusterGrad.addColorStop(1, 'rgba(239, 68, 68, 0)');
        ctx.fillStyle = thrusterGrad;
        ctx.beginPath();
        ctx.moveTo(px - 4, py + astro.h - 6);
        ctx.lineTo(px - 2, py + astro.h + flameLength);
        ctx.lineTo(px, py + astro.h - 6);
        ctx.fill();
    }

    // Torso con degradado de volumen
    const torsoGrad = ctx.createLinearGradient(px + 2, py + 12, px + astro.w - 2, py + 12);
    torsoGrad.addColorStop(0, suitColor);
    torsoGrad.addColorStop(0.7, suitColor);
    torsoGrad.addColorStop(1, '#94a3b8');
    ctx.fillStyle = torsoGrad;
    ctx.fillRect(px + 2, py + 12, astro.w - 4, astro.h - 14);

    // Cañón de Plasma montado en el brazo (solo en estado plasma)
    if (isPlasma) {
        ctx.fillStyle = '#0f172a';
        ctx.fillRect(px + astro.w - 3, py + 13, 10, 7);
        ctx.fillStyle = '#38bdf8';
        ctx.fillRect(px + astro.w + 4, py + 14, 4, 5);
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(px + astro.w + 6, py + 15, 2, 3);
    }

    // Cinturón de combate y emblema reactor
    ctx.fillStyle = armorColor;
    ctx.fillRect(px + 2, py + 18, astro.w - 4, 3);
    ctx.fillStyle = visorColor;
    ctx.beginPath();
    ctx.arc(px + astro.w / 2, py + 15, 2.5, 0, Math.PI * 2);
    ctx.fill();

    // Botas con suela reforzada
    ctx.fillStyle = armorColor;
    const footOffset = (astro.animFrame % 2 === 0) ? 0 : 3;
    ctx.fillRect(px + 1, py + astro.h - 4 + footOffset, 7, 4);
    ctx.fillRect(px + astro.w - 8, py + astro.h - 4 - footOffset, 7, 4);
    ctx.fillStyle = '#0f172a'; // Suela
    ctx.fillRect(px + 1, py + astro.h - 1 + footOffset, 7, 1.5);
    ctx.fillRect(px + astro.w - 8, py + astro.h - 1 - footOffset, 7, 1.5);

    // Casco espacial redondeado con volumen y brillo de cristal
    const helmetGrad = ctx.createRadialGradient(px + astro.w / 2 - 2, py + 6, 2, px + astro.w / 2, py + 8, 9);
    helmetGrad.addColorStop(0, '#ffffff');
    helmetGrad.addColorStop(0.6, suitColor);
    helmetGrad.addColorStop(1, '#64748b');
    ctx.fillStyle = helmetGrad;
    ctx.beginPath();
    ctx.arc(px + astro.w / 2, py + 8, 9, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = armorColor;
    ctx.lineWidth = 1.5;
    ctx.stroke();

    // Visor curvo de alta tecnología con reflejo digital
    ctx.fillStyle = '#090d16';
    ctx.beginPath();
    ctx.ellipse(px + astro.w / 2 + 1, py + 8, 6.5, 4.5, 0, 0, Math.PI * 2);
    ctx.fill();

    // Brillo del cristal del visor
    ctx.fillStyle = visorColor;
    ctx.fillRect(px + astro.w / 2, py + 7, 5, 2);
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(px + astro.w / 2 + 3, py + 6, 2, 1);

    ctx.restore();
}

// ==========================================
// MONEDA DE ORO 3D HOLOGRÁFICA (2026 SHINE)
// ==========================================
function drawGoldCoin(x, y) {
    const spinTime = Math.cos(Date.now() * 0.007 + x * 0.1);
    const coinW = Math.max(2, Math.abs(spinTime) * 7.5);

    ctx.save();
    // Halo de luz dorada suave
    ctx.fillStyle = 'rgba(251, 191, 36, 0.2)';
    ctx.beginPath();
    ctx.arc(x + 8, y + 8, 12, 0, Math.PI * 2);
    ctx.fill();

    // Medallón de oro con degradado 3D
    const goldGrad = ctx.createLinearGradient(x + 8 - coinW, y, x + 8 + coinW, y + 16);
    goldGrad.addColorStop(0, '#fef08a');
    goldGrad.addColorStop(0.5, '#f59e0b');
    goldGrad.addColorStop(1, '#b45309');
    ctx.fillStyle = goldGrad;
    ctx.beginPath();
    ctx.ellipse(x + 8, y + 8, coinW, 8.5, 0, 0, Math.PI * 2);
    ctx.fill();

    // Borde biselado reluciente
    ctx.strokeStyle = '#fef08a';
    ctx.lineWidth = 1.2;
    ctx.stroke();

    // Emblema central de estrella cuando está de frente
    if (coinW > 4) {
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(x + 7, y + 6, 2, 4);
    }
    ctx.restore();
}

function drawCuteEnemy(x, y, type, isFlying = false) {
    const walkCycle = Math.sin(Date.now() * 0.012 + x);
    const theme = (levelData && levelData.world) ? levelData.world.theme : 'grassland';

    // 1. Sombra suave bajo el enemigo en el suelo
    ctx.save();
    ctx.fillStyle = 'rgba(0, 0, 0, 0.28)';
    ctx.beginPath();
    ctx.ellipse(x + 11, y + 21, isFlying ? 8 : 10, isFlying ? 2.5 : 3.5, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    // 2. Alas animadas ultranítidas para enemigos voladores (Paratroopa)
    if (isFlying) {
        const wingFlap = Math.sin(Date.now() * 0.025) * 6;
        ctx.save();
        // Ala izquierda
        const wingGradL = ctx.createLinearGradient(x - 5, y + wingFlap, x + 2, y + 10 + wingFlap);
        wingGradL.addColorStop(0, '#ffffff');
        wingGradL.addColorStop(1, '#93c5fd');
        ctx.fillStyle = wingGradL;
        ctx.beginPath();
        ctx.ellipse(x - 2, y + 5 + wingFlap, 6, 9, -0.45, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#0284c7';
        ctx.lineWidth = 1.2;
        ctx.stroke();

        // Ala derecha
        const wingGradR = ctx.createLinearGradient(x + 18, y - wingFlap, x + 26, y + 10 - wingFlap);
        wingGradR.addColorStop(0, '#ffffff');
        wingGradR.addColorStop(1, '#93c5fd');
        ctx.fillStyle = wingGradR;
        ctx.beginPath();
        ctx.ellipse(x + 23, y + 5 - wingFlap, 6, 9, 0.45, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#0284c7';
        ctx.lineWidth = 1.2;
        ctx.stroke();
        ctx.restore();
    }

    if (type === 'goomba') {
        // ==========================================
        // GOOMBA SUPREMO (CHAMPIÑÓN RETRO CON VOLUMEN 3D Y EXPRESIÓN VIVA)
        // ==========================================
        ctx.save();

        // Color adaptativo por bioma para mayor variedad visual
        let capTop = '#c2410c';
        let capMid = '#9a3412';
        let capBottom = '#431407';
        let stemColor = '#ffedd5';
        let stemShadow = '#fed7aa';

        if (theme === 'ice') {
            capTop = '#0284c7'; capMid = '#0369a1'; capBottom = '#082f49';
            stemColor = '#e0f2fe'; stemShadow = '#bae6fd';
        } else if (theme === 'lava_castle') {
            capTop = '#dc2626'; capMid = '#991b1b'; capBottom = '#450a0a';
            stemColor = '#fecaca'; stemShadow = '#fca5a5';
        } else if (theme === 'space') {
            capTop = '#9333ea'; capMid = '#6b21a8'; capBottom = '#3b0764';
            stemColor = '#f3e8ff'; stemShadow = '#e9d5ff';
        }

        // Pies animados con paso elástico natural
        const leftFootY = y + 15 - (walkCycle > 0 ? walkCycle * 3.2 : 0);
        const rightFootY = y + 15 - (walkCycle < 0 ? -walkCycle * 3.2 : 0);

        // Pies marrones con bisel superior
        ctx.fillStyle = '#1e1b4b';
        ctx.beginPath();
        ctx.ellipse(x + 5, leftFootY + 3, 5, 3.5, -0.15, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.ellipse(x + 16, rightFootY + 3, 5, 3.5, 0.15, 0, Math.PI * 2);
        ctx.fill();

        // Tallo / Cuerpo carnoso redondeado con sombreado esférico
        const stemGrad = ctx.createRadialGradient(x + 11, y + 12, 2, x + 11, y + 14, 9);
        stemGrad.addColorStop(0, stemColor);
        stemGrad.addColorStop(0.75, stemShadow);
        stemGrad.addColorStop(1, '#9a3412');
        ctx.fillStyle = stemGrad;
        ctx.beginPath();
        ctx.ellipse(x + 11, y + 13, 7.5, 6.5, 0, 0, Math.PI * 2);
        ctx.fill();

        // Cabeza / Sombrero en forma de campana piramidal con degradado rico
        const capGrad = ctx.createRadialGradient(x + 9, y + 4, 2, x + 11, y + 8, 12);
        capGrad.addColorStop(0, '#f97316');
        capGrad.addColorStop(0.35, capTop);
        capGrad.addColorStop(0.75, capMid);
        capGrad.addColorStop(1, capBottom);
        ctx.fillStyle = capGrad;

        ctx.beginPath();
        ctx.moveTo(x + 2, y + 10);
        ctx.quadraticCurveTo(x + 2, y - 2, x + 11, y - 1);
        ctx.quadraticCurveTo(x + 20, y - 2, x + 20, y + 10);
        ctx.quadraticCurveTo(x + 11, y + 12, x + 2, y + 10);
        ctx.closePath();
        ctx.fill();

        // Brillo superior curvo en el sombrero (Specular highlight)
        ctx.fillStyle = 'rgba(255, 255, 255, 0.45)';
        ctx.beginPath();
        ctx.ellipse(x + 9, y + 2, 4, 1.8, -0.2, 0, Math.PI * 2);
        ctx.fill();

        // Cejas amenazantes anguladas y marcadas
        ctx.strokeStyle = '#020617';
        ctx.lineWidth = 2.4;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(x + 4, y + 5);
        ctx.lineTo(x + 10, y + 8);
        ctx.moveTo(x + 18, y + 5);
        ctx.lineTo(x + 12, y + 8);
        ctx.stroke();

        // Ojos expresivos con esclera blanca y pupilas con reflejo
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.ellipse(x + 7.5, y + 9.5, 2.5, 3.8, 0.1, 0, Math.PI * 2);
        ctx.ellipse(x + 14.5, y + 9.5, 2.5, 3.8, -0.1, 0, Math.PI * 2);
        ctx.fill();

        // Pupilas negras con destello de vida
        ctx.fillStyle = '#020617';
        ctx.beginPath();
        ctx.arc(x + 8.5, y + 9.5, 1.7, 0, Math.PI * 2);
        ctx.arc(x + 13.5, y + 9.5, 1.7, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(x + 8, y + 8.5, 1, 1);
        ctx.fillRect(x + 13, y + 8.5, 1, 1);

        // Colmillos afilados inferiores que sobresalen
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.moveTo(x + 6, y + 15);
        ctx.lineTo(x + 7.5, y + 12);
        ctx.lineTo(x + 9, y + 15);
        ctx.moveTo(x + 13, y + 15);
        ctx.lineTo(x + 14.5, y + 12);
        ctx.lineTo(x + 16, y + 15);
        ctx.fill();

        ctx.restore();

    } else {
        // ==========================================
        // KOOPA TROOPA SUPREMO (TORTUGA CON CAPARAZÓN 3D POLICROMADO Y ANIMACIÓN VIVA)
        // ==========================================
        ctx.save();

        // Patas reptilianas animadas con zancada dinámica
        const legFrontY = y + 14 - (walkCycle > 0 ? walkCycle * 2.8 : 0);
        const legBackY = y + 14 - (walkCycle < 0 ? -walkCycle * 2.8 : 0);

        // Pies anaranjados/amarillos con volumen
        ctx.fillStyle = '#f59e0b';
        ctx.beginPath();
        ctx.ellipse(x + 4, legFrontY + 3, 4.5, 3.2, 0, 0, Math.PI * 2);
        ctx.ellipse(x + 16, legBackY + 3, 4.5, 3.2, 0, 0, Math.PI * 2);
        ctx.fill();

        // Uñas blancas
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(x + 1, legFrontY + 2, 2, 2);
        ctx.fillRect(x + 13, legBackY + 2, 2, 2);

        // Caparazón esférico 3D con degradado esmeralda de alta definición
        let shellColor1 = '#4ade80';
        let shellColor2 = '#16a34a';
        let shellColor3 = '#064e3b';
        if (theme === 'lava_castle') {
            shellColor1 = '#f87171'; shellColor2 = '#dc2626'; shellColor3 = '#7f1d1d';
        } else if (theme === 'desert') {
            shellColor1 = '#fbbf24'; shellColor2 = '#d97706'; shellColor3 = '#78350f';
        }

        const shellGrad = ctx.createRadialGradient(x + 9, y + 6, 2, x + 11, y + 9, 11);
        shellGrad.addColorStop(0, shellColor1);
        shellGrad.addColorStop(0.5, shellColor2);
        shellGrad.addColorStop(1, shellColor3);
        ctx.fillStyle = shellGrad;

        ctx.beginPath();
        ctx.ellipse(x + 10, y + 8.5, 9, 8, -0.1, 0, Math.PI * 2);
        ctx.fill();

        // Reborde blanco acolchado del caparazón con relieve
        ctx.strokeStyle = '#f8fafc';
        ctx.lineWidth = 2.2;
        ctx.stroke();

        // Patrón de placas poligonales del caparazón con brillo
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)';
        ctx.lineWidth = 1.2;
        ctx.beginPath();
        ctx.ellipse(x + 10, y + 8.5, 5, 4.5, 0, 0, Math.PI * 2);
        ctx.stroke();

        // Cabeza con pico amarillo y cuello retráctil
        const headGrad = ctx.createRadialGradient(x + 16, y + 2, 2, x + 17, y + 5, 6);
        headGrad.addColorStop(0, '#fef08a');
        headGrad.addColorStop(1, '#eab308');
        ctx.fillStyle = headGrad;
        ctx.beginPath();
        ctx.arc(x + 16, y + 4.5, 5.5, 0, Math.PI * 2);
        ctx.fill();

        // Pico característico anaranjado
        ctx.fillStyle = '#f97316';
        ctx.beginPath();
        ctx.moveTo(x + 19, y + 4);
        ctx.lineTo(x + 23, y + 6);
        ctx.lineTo(x + 18, y + 8);
        ctx.closePath();
        ctx.fill();

        // Ojo grande expresivo
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.ellipse(x + 16, y + 3.5, 2.5, 3.5, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#0284c7';
        ctx.beginPath();
        ctx.arc(x + 16.5, y + 3.5, 1.6, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(x + 16, y + 2.5, 1, 1);

        // Cola puntiaguda animada
        ctx.fillStyle = '#eab308';
        ctx.beginPath();
        ctx.moveTo(x + 2, y + 9);
        ctx.lineTo(x - 2, y + 11);
        ctx.lineTo(x + 2, y + 12);
        ctx.closePath();
        ctx.fill();

        ctx.restore();
    }
}

// ==========================================
// RENDERIZADO DE LOS 9 JEFES FINALES ÚNICOS
// ==========================================
function drawBossModern(x, y) {
    const b = bossEntity;
    if (!b) return;
    const facingLeft = (b.vx <= 0);
    const theme = (levelData && levelData.world) ? levelData.world.theme : 'lava_castle';
    const breath = Math.sin(Date.now() * 0.005) * 1.5;

    switch (theme) {
        case 'grassland':
            drawMechaKoopaPrime(x, y, b, facingLeft, breath);
            break;
        case 'desert':
            drawFaraonEscorpion(x, y, b, facingLeft, breath);
            break;
        case 'neon_cave':
            drawGolemCuantico(x, y, b, facingLeft, breath);
            break;
        case 'ocean':
            drawCapitanKraken(x, y, b, facingLeft, breath);
            break;
        case 'ice':
            drawYetiCriogenico(x, y, b, facingLeft, breath);
            break;
        case 'spooky_forest':
            drawEspectroSombras(x, y, b, facingLeft, breath);
            break;
        case 'airship':
            drawMecaDragon(x, y, b, facingLeft, breath);
            break;
        case 'space':
            drawEmperadorSingularidad(x, y, b, facingLeft, breath);
            break;
        case 'lava_castle':
        default:
            drawLordLavaSupremo(x, y, b, facingLeft, breath);
            break;
    }
}

// 1. MUNDO 1: MECHA-KOOPA PRIME (TORTUGA CIBERNÉTICA CON TURBINAS)
function drawMechaKoopaPrime(x, y, b, facingLeft, breath) {
    // Turbinas y humo cian
    for (let i = 0; i < 3; i++) {
        const puff = (Date.now() * 0.003 + i * 0.3) % 1;
        const px = (facingLeft ? x + 34 : x + 10) + Math.sin(puff * 4) * 4;
        const py = y + 10 - puff * 24;
        ctx.fillStyle = `rgba(56, 189, 248, ${1 - puff})`;
        ctx.fillRect(px, py, 3, 3);
    }

    // Caparazón blindado esmeralda con remaches de titanio
    const shellX = facingLeft ? x + 18 : x + 6;
    const shellY = y + 10 + breath;
    ctx.fillStyle = '#064e3b';
    ctx.beginPath();
    ctx.ellipse(shellX + 12, shellY + 16, 14, 18, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#10b981';
    ctx.lineWidth = 2.5;
    ctx.stroke();

    // Remaches de oro
    ctx.fillStyle = '#facc15';
    ctx.fillRect(shellX + 6, shellY + 8, 3, 3);
    ctx.fillRect(shellX + 16, shellY + 8, 3, 3);
    ctx.fillRect(shellX + 11, shellY + 22, 3, 3);

    // Patas mecánicas hidráulicas con pistones
    ctx.fillStyle = '#1e293b';
    ctx.fillRect(x + 4, y + b.h - 12, 12, 12);
    ctx.fillRect(x + b.w - 16, y + b.h - 12, 12, 12);
    ctx.fillStyle = '#10b981';
    ctx.fillRect(x + 2, y + b.h - 4, 16, 4);
    ctx.fillRect(x + b.w - 18, y + b.h - 4, 16, 4);

    // Cabeza de titanio y visor láser rojo
    const headX = facingLeft ? x + 2 : x + 22;
    const headY = y + 6 + breath;
    ctx.fillStyle = '#0f172a';
    ctx.beginPath();
    ctx.roundRect(headX, headY, 22, 18, 4);
    ctx.fill();

    // Visor láser escaneador rojo
    const laserScan = (Math.sin(Date.now() * 0.01) + 1) * 4;
    ctx.fillStyle = '#ef4444';
    ctx.fillRect(headX + (facingLeft ? 2 : 6), headY + 5, 12, 5);
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(headX + (facingLeft ? 2 : 6) + laserScan, headY + 6, 2, 3);

    // Mandíbula mecánica
    ctx.fillStyle = '#f59e0b';
    ctx.fillRect(facingLeft ? headX - 4 : headX + 14, headY + 12, 12, 6);
}

// 2. MUNDO 2: FARAÓN ESCORPIÓN (TITÁN ESCORPIÓN DE ORO Y LAPISLÁZULI)
function drawFaraonEscorpion(x, y, b, facingLeft, breath) {
    // Cola curvada dorada con aguijón solar
    const tailBaseX = facingLeft ? x + 34 : x + 10;
    const tailTipX = facingLeft ? x + 10 : x + 34;
    const tailTipY = y - 10 + breath;

    ctx.strokeStyle = '#ca8a04';
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.moveTo(tailBaseX, y + 28);
    ctx.quadraticCurveTo(facingLeft ? x + 44 : x, y - 2, tailTipX, tailTipY);
    ctx.stroke();

    // Aguijón solar incandescente
    ctx.fillStyle = '#ef4444';
    ctx.beginPath();
    ctx.moveTo(tailTipX, tailTipY - 6);
    ctx.lineTo(tailTipX - 6, tailTipY + 4);
    ctx.lineTo(tailTipX + 6, tailTipY + 4);
    ctx.fill();
    ctx.fillStyle = '#fde047';
    ctx.fillRect(tailTipX - 2, tailTipY - 8, 4, 4);

    // Chispas del aguijón
    if (Math.random() > 0.4) {
        ctx.fillStyle = '#fde047';
        ctx.fillRect(tailTipX + (Math.random() - 0.5) * 12, tailTipY + (Math.random() - 0.5) * 12, 2, 2);
    }

    // Carapacho de oro del faraón
    const bodyX = x + 8;
    const bodyY = y + 16 + breath;
    ctx.fillStyle = '#eab308';
    ctx.beginPath();
    ctx.roundRect(bodyX, bodyY, 32, 24, 6);
    ctx.fill();
    ctx.strokeStyle = '#1e3a8a'; // Lapislázuli real
    ctx.lineWidth = 2;
    ctx.stroke();

    // Ojos de rubí
    ctx.fillStyle = '#dc2626';
    ctx.fillRect(facingLeft ? bodyX + 4 : bodyX + 22, bodyY + 4, 6, 4);

    // Pinzas mecánicas articuladas que chasquean
    const snap = Math.sin(Date.now() * 0.008) * 4;
    const pincerX = facingLeft ? x - 4 : x + 32;
    ctx.fillStyle = '#ca8a04';
    ctx.fillRect(pincerX, bodyY + 6, 16, 6);
    // Pinza superior e inferior
    ctx.fillRect(facingLeft ? pincerX - 4 : pincerX + 12, bodyY + 2 - snap, 6, 5);
    ctx.fillRect(facingLeft ? pincerX - 4 : pincerX + 12, bodyY + 9 + snap, 6, 5);

    // Patas doradas de escorpión
    ctx.strokeStyle = '#854d0e';
    ctx.lineWidth = 2;
    for (let p = 0; p < 3; p++) {
        ctx.beginPath();
        ctx.moveTo(bodyX + p * 10 + 4, bodyY + 22);
        ctx.lineTo(bodyX + p * 10, y + b.h);
        ctx.stroke();
    }
}

// 3. MUNDO 3: GÓLEM CUÁNTICO (MONOLITO DE CRISTAL NEÓN VIOLETA)
function drawGolemCuantico(x, y, b, facingLeft, breath) {
    const corePulse = Math.sin(Date.now() * 0.008) * 4 + 10;
    const hoverY = Math.sin(Date.now() * 0.004) * 4;

    // Fragmentos de cristal neón flotando alrededor en órbita
    for (let i = 0; i < 4; i++) {
        const ang = (Date.now() * 0.003 + i * (Math.PI / 2));
        const cx = x + b.w / 2 + Math.cos(ang) * 26;
        const cy = y + b.h / 2 + Math.sin(ang) * 20;
        ctx.fillStyle = (i % 2 === 0) ? '#c084fc' : '#38bdf8';
        ctx.beginPath();
        ctx.moveTo(cx, cy - 5);
        ctx.lineTo(cx + 4, cy);
        ctx.lineTo(cx, cy + 5);
        ctx.lineTo(cx - 4, cy);
        ctx.fill();
    }

    // Torso de cristal monolítico violeta oscuro
    const cx = x + 10;
    const cy = y + 8 + hoverY;
    ctx.fillStyle = '#3b0764';
    ctx.beginPath();
    ctx.moveTo(cx + 14, cy);
    ctx.lineTo(cx + 28, cy + 12);
    ctx.lineTo(cx + 22, cy + 34);
    ctx.lineTo(cx + 6, cy + 34);
    ctx.lineTo(cx, cy + 12);
    ctx.fill();
    ctx.strokeStyle = '#a855f7';
    ctx.lineWidth = 2;
    ctx.stroke();

    // Núcleo cuántico radiante en el pecho
    const grad = ctx.createRadialGradient(cx + 14, cy + 18, 1, cx + 14, cy + 18, corePulse);
    grad.addColorStop(0, '#ffffff');
    grad.addColorStop(0.4, '#c084fc');
    grad.addColorStop(1, 'rgba(147, 51, 234, 0)');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(cx + 14, cy + 18, corePulse, 0, Math.PI * 2);
    ctx.fill();

    // Ojo horizontal luminoso
    ctx.fillStyle = '#38bdf8';
    ctx.fillRect(cx + 8, cy + 8, 12, 3);

    // Puños flotantes de cristal suspendidos
    const fistY = y + 24 + hoverY + Math.sin(Date.now() * 0.006) * 3;
    ctx.fillStyle = '#7e22ce';
    ctx.fillRect(facingLeft ? x - 4 : x + b.w - 10, fistY, 12, 12);
    ctx.strokeStyle = '#c084fc';
    ctx.strokeRect(facingLeft ? x - 4 : x + b.w - 10, fistY, 12, 12);
}

// 4. MUNDO 4: CAPITÁN KRAKEN (DREADNOUGHT KRAKEN PIRATA)
function drawCapitanKraken(x, y, b, facingLeft, breath) {
    // Burbujas ascendentes
    for (let i = 0; i < 3; i++) {
        const bubbleTime = (Date.now() * 0.002 + i * 0.35) % 1;
        const bx = x + 12 + i * 12;
        const by = y + b.h - bubbleTime * 45;
        ctx.strokeStyle = 'rgba(125, 211, 252, 0.7)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.arc(bx, by, 3, 0, Math.PI * 2);
        ctx.stroke();
    }

    // Tentáculos ondulantes con cinemática sinusoidal
    for (let t = 0; t < 4; t++) {
        const wave = Math.sin(Date.now() * 0.006 + t * 0.9) * 8;
        const tx = x + 8 + t * 8;
        ctx.strokeStyle = '#0d9488';
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.moveTo(tx, y + 32);
        ctx.quadraticCurveTo(tx + wave, y + 44, tx - wave, y + b.h + 4);
        ctx.stroke();

        // Ventosas luminiscentes
        ctx.fillStyle = '#6ee7b7';
        ctx.fillRect(tx + (wave * 0.5) - 2, y + 42, 3, 3);
    }

    // Manto cibernético del kraken
    const headX = x + 8;
    const headY = y + 6 + breath;
    ctx.fillStyle = '#0f766e';
    ctx.beginPath();
    ctx.ellipse(headX + 16, headY + 14, 16, 18, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#14b8a6';
    ctx.lineWidth = 2;
    ctx.stroke();

    // Sombrero bicornio pirata
    ctx.fillStyle = '#0f172a';
    ctx.beginPath();
    ctx.moveTo(headX, headY + 4);
    ctx.lineTo(headX + 16, headY - 12);
    ctx.lineTo(headX + 32, headY + 4);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#facc15';
    ctx.fillRect(headX + 14, headY - 4, 4, 4); // Calavera de oro

    // Ojo biónico con parche pirata
    const eyeX = facingLeft ? headX + 6 : headX + 18;
    ctx.fillStyle = '#1e293b';
    ctx.fillRect(eyeX, headY + 10, 8, 8); // Parche
    ctx.fillStyle = '#ef4444';
    ctx.fillRect(eyeX + 2, headY + 12, 4, 4); // Visor ocular
}

// 5. MUNDO 5: YETI CRIOGÉNICO (TITÁN DE HIELO PERPÉTUO)
function drawYetiCriogenico(x, y, b, facingLeft, breath) {
    // Vaho glacial helado saliendo del yeti
    for (let i = 0; i < 4; i++) {
        const mist = (Date.now() * 0.003 + i * 0.4) % 1;
        const mx = (facingLeft ? x + 4 : x + 34) + Math.sin(mist * 5) * 6;
        const my = y + 16 + mist * 16;
        ctx.fillStyle = `rgba(224, 242, 254, ${0.8 - mist * 0.7})`;
        ctx.beginPath();
        ctx.arc(mx, my, 4 + mist * 4, 0, Math.PI * 2);
        ctx.fill();
    }

    // Cuerpo macizo cubierto de pelaje ártico cibernético
    const bodyX = x + 6;
    const bodyY = y + 12 + breath;
    ctx.fillStyle = '#f1f5f9';
    ctx.beginPath();
    ctx.roundRect(bodyX, bodyY, 36, 32, 10);
    ctx.fill();
    ctx.strokeStyle = '#38bdf8';
    ctx.lineWidth = 2;
    ctx.stroke();

    // Cuernos masivos de hielo cristalino azul zafiro
    ctx.fillStyle = '#0284c7';
    // Cuerno 1
    ctx.beginPath();
    ctx.moveTo(bodyX + 6, bodyY);
    ctx.lineTo(bodyX - 4, bodyY - 14);
    ctx.lineTo(bodyX + 12, bodyY + 2);
    ctx.fill();
    // Cuerno 2
    ctx.beginPath();
    ctx.moveTo(bodyX + 30, bodyY);
    ctx.lineTo(bodyX + 40, bodyY - 14);
    ctx.lineTo(bodyX + 24, bodyY + 2);
    ctx.fill();

    // Ojos glaciales luminosos
    ctx.fillStyle = '#00ffff';
    ctx.fillRect(facingLeft ? bodyX + 8 : bodyX + 22, bodyY + 8, 7, 5);

    // Puños titánicos de hielo escarpado
    ctx.fillStyle = '#0ea5e9';
    ctx.fillRect(x + 2, y + b.h - 12, 14, 12);
    ctx.fillRect(x + b.w - 16, y + b.h - 12, 14, 12);
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(x + 4, y + b.h - 6, 4, 6);
    ctx.fillRect(x + b.w - 14, y + b.h - 6, 4, 6);
}

// 6. MUNDO 6: ESPECTRO DE LAS SOMBRAS (WRAITH ESPECTRAL Y FANTASMA)
function drawEspectroSombras(x, y, b, facingLeft, breath) {
    const floatY = Math.sin(Date.now() * 0.005) * 5;

    // Fuego fatuo y almas espectrales flotando
    for (let i = 0; i < 3; i++) {
        const soul = (Date.now() * 0.002 + i * 0.5) % 1;
        const sx = x + 10 + i * 12 + Math.sin(soul * 6) * 6;
        const sy = y + b.h - soul * 40;
        ctx.fillStyle = `rgba(168, 85, 247, ${1 - soul})`;
        ctx.beginPath();
        ctx.arc(sx, sy, 3, 0, Math.PI * 2);
        ctx.fill();
    }

    // Toga fantasmal ondulante oscura
    const bodyX = x + 8;
    const bodyY = y + 8 + floatY;
    ctx.fillStyle = '#1e1b4b';
    ctx.beginPath();
    ctx.moveTo(bodyX + 16, bodyY);
    ctx.lineTo(bodyX + 32, bodyY + 20);
    ctx.lineTo(bodyX + 26, bodyY + 40);
    ctx.lineTo(bodyX + 6, bodyY + 40);
    ctx.lineTo(bodyX, bodyY + 20);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = '#7e22ce';
    ctx.lineWidth = 2;
    ctx.stroke();

    // Calavera fantasmal flotante
    ctx.fillStyle = '#f8fafc';
    ctx.beginPath();
    ctx.arc(bodyX + 16, bodyY + 12, 10, 0, Math.PI * 2);
    ctx.fill();

    // Cuencas oculares con fuego demoníaco lila
    ctx.fillStyle = '#9333ea';
    ctx.fillRect(bodyX + 11, bodyY + 9, 4, 5);
    ctx.fillRect(bodyX + 17, bodyY + 9, 4, 5);
    ctx.fillStyle = '#4ade80'; // Fuego espectral verde
    ctx.fillRect(bodyX + 12, bodyY + 10, 2, 2);
    ctx.fillRect(bodyX + 18, bodyY + 10, 2, 2);

    // Garras espectrales flotantes
    ctx.fillStyle = '#c084fc';
    const clawX = facingLeft ? x - 2 : x + b.w - 8;
    ctx.fillRect(clawX, bodyY + 20, 8, 4);
    ctx.fillRect(clawX + (facingLeft ? -3 : 7), bodyY + 18, 3, 8);
}

// 7. MUNDO 7: MECA-DRAGÓN SUPREMO (WYVERN ROJO CON PROPULSORES)
function drawMecaDragon(x, y, b, facingLeft, breath) {
    const wingFlap = Math.sin(Date.now() * 0.012) * 10;

    // Fuego de los postquemadores / reactores en las alas
    ctx.fillStyle = '#ea580c';
    ctx.fillRect(x + (facingLeft ? 32 : 8), y + 16, 8, 6);
    ctx.fillStyle = '#fde047';
    ctx.fillRect(x + (facingLeft ? 36 : 4), y + 17, 6, 4);

    // Alas mecánicas articuladas con placas de acero rojo
    ctx.fillStyle = '#991b1b';
    ctx.beginPath();
    ctx.moveTo(x + 20, y + 16);
    ctx.lineTo(facingLeft ? x + 44 : x - 4, y - 6 + wingFlap);
    ctx.lineTo(facingLeft ? x + 38 : x + 2, y + 26);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = '#f87171';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    // Torso blindado de dragón
    const bodyX = x + 10;
    const bodyY = y + 14 + breath;
    ctx.fillStyle = '#b91c1c';
    ctx.beginPath();
    ctx.roundRect(bodyX, bodyY, 28, 26, 6);
    ctx.fill();

    // Cabeza de dragón acorazada y cuernos de acero
    const headX = facingLeft ? x + 2 : x + 24;
    const headY = y + 4 + breath;
    ctx.fillStyle = '#7f1d1d';
    ctx.beginPath();
    ctx.roundRect(headX, headY, 22, 16, 4);
    ctx.fill();

    // Cuerno de dragón afilado
    ctx.fillStyle = '#fbbf24';
    ctx.beginPath();
    ctx.moveTo(headX + 12, headY);
    ctx.lineTo(headX + (facingLeft ? 22 : 2), headY - 12);
    ctx.lineTo(headX + 16, headY + 4);
    ctx.fill();

    // Ojo reptiliano amarillo brillante
    ctx.fillStyle = '#facc15';
    ctx.fillRect(headX + (facingLeft ? 4 : 14), headY + 5, 5, 4);
    ctx.fillStyle = '#000000';
    ctx.fillRect(headX + (facingLeft ? 6 : 16), headY + 5, 2, 4);

    // Patas con garras afiladas de acero
    ctx.fillStyle = '#450a0a';
    ctx.fillRect(x + 6, y + b.h - 10, 12, 10);
    ctx.fillRect(x + b.w - 18, y + b.h - 10, 12, 10);
}

// 8. MUNDO 8: LORD DE LAVA SUPREMO (BOWSER TITÁN DE MAGMA OBSIDIANA)
function drawLordLavaSupremo(x, y, b, facingLeft, breath) {
    // Partículas de ascuas y fuego flotando alrededor del boss
    for (let i = 0; i < 4; i++) {
        const emberTime = (Date.now() * 0.002 + i * 0.6) % 1;
        const ex = x + 10 + (i * 12) + Math.sin(emberTime * 5 + i) * 8;
        const ey = y + b.h - 8 - emberTime * 50;
        ctx.fillStyle = (i % 2 === 0) ? '#f97316' : '#fde047';
        ctx.fillRect(ex, ey, 2.5, 2.5);
    }

    // Caparazón volcánico con espinas de obsidiana
    const shellX = facingLeft ? x + 18 : x + 4;
    const shellY = y + 8 + breath;
    const shellW = 26;
    const shellH = 34;

    ctx.fillStyle = '#1c1917';
    ctx.beginPath();
    ctx.ellipse(shellX + shellW / 2, shellY + shellH / 2, shellW / 2, shellH / 2, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#b91c1c';
    ctx.lineWidth = 2;
    ctx.stroke();

    // Espinas volcánicas
    ctx.fillStyle = '#ea580c';
    const spikePositions = [
        { sx: shellX + 4, sy: shellY + 6 },
        { sx: shellX + shellW - 6, sy: shellY + 6 },
        { sx: shellX + shellW / 2, sy: shellY + 2 },
        { sx: shellX + shellW / 2, sy: shellY + shellH - 6 },
        { sx: shellX + 3, sy: shellY + shellH / 2 },
        { sx: shellX + shellW - 5, sy: shellY + shellH / 2 }
    ];
    spikePositions.forEach(sp => {
        ctx.fillRect(sp.sx - 1, sp.sy - 3, 3, 3);
    });

    // Torso y corazón de magma pulsante
    const bodyX = facingLeft ? x + 10 : x + 14;
    const bodyY = y + 16 + breath;
    ctx.fillStyle = '#292524';
    ctx.beginPath();
    ctx.ellipse(bodyX + 12, bodyY + 14, 14, 16, 0, 0, Math.PI * 2);
    ctx.fill();

    // Corazón ardiente de magma
    const lavaPulse = (Math.sin(Date.now() * 0.007) + 1) * 0.5;
    const coreGrad = ctx.createRadialGradient(bodyX + 12, bodyY + 14, 1, bodyX + 12, bodyY + 14, 10 + lavaPulse * 4);
    coreGrad.addColorStop(0, '#fef08a');
    coreGrad.addColorStop(0.5, '#ea580c');
    coreGrad.addColorStop(1, '#991b1b');
    ctx.fillStyle = coreGrad;
    ctx.beginPath();
    ctx.arc(bodyX + 12, bodyY + 14, 8 + lavaPulse * 3, 0, Math.PI * 2);
    ctx.fill();

    // Cabeza de dragón de magma
    const headX = facingLeft ? x + 4 : x + 20;
    const headY = y + 2 + breath;
    ctx.fillStyle = '#1c1917';
    ctx.beginPath();
    ctx.roundRect(headX, headY, 24, 18, 4);
    ctx.fill();

    // Ojos con pupilas de fuego
    ctx.fillStyle = '#fef08a';
    ctx.fillRect(headX + (facingLeft ? 4 : 14), headY + 5, 6, 5);
    ctx.fillStyle = '#dc2626';
    ctx.fillRect(headX + (facingLeft ? 6 : 16), headY + 6, 2, 3);

    // Cuernos y melena de fuego
    ctx.fillStyle = '#0f172a';
    ctx.beginPath();
    ctx.moveTo(headX + 14, headY);
    ctx.lineTo(headX + (facingLeft ? 22 : 6), headY - 12);
    ctx.lineTo(headX + 18, headY + 2);
    ctx.fill();
    ctx.fillStyle = '#f97316';
    ctx.fillRect(headX + (facingLeft ? 21 : 5), headY - 12, 3, 3);

    // Pies con garras de magma
    ctx.fillStyle = '#1c1917';
    ctx.fillRect(x + 6, y + b.h - 10, 14, 10);
    ctx.fillRect(x + b.w - 20, y + b.h - 10, 14, 10);
    ctx.fillStyle = '#f97316';
    ctx.fillRect(x + 4, y + b.h - 4, 4, 4);
    ctx.fillRect(x + b.w - 18, y + b.h - 4, 4, 4);
}

// 9. MUNDO 9: EMPERADOR DE LA SINGULARIDAD (OVERLORD CÓSMICO SUPREMO)
function drawEmperadorSingularidad(x, y, b, facingLeft, breath) {
    const floatY = Math.sin(Date.now() * 0.004) * 4;
    const ringAngle = Date.now() * 0.002;

    // Anillos de acreción cósmica orbitando alrededor del emperador
    ctx.save();
    ctx.translate(x + b.w / 2, y + b.h / 2 + floatY);
    ctx.rotate(ringAngle);
    ctx.strokeStyle = 'rgba(6, 182, 212, 0.6)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.ellipse(0, 0, 32, 12, 0, 0, Math.PI * 2);
    ctx.stroke();

    // Satélite / orbe estelar en órbita
    ctx.fillStyle = '#facc15';
    ctx.beginPath();
    ctx.arc(32, 0, 3.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    // Manto estelar de nebulosa oscura
    const bodyX = x + 8;
    const bodyY = y + 10 + floatY;
    ctx.fillStyle = '#020617';
    ctx.beginPath();
    ctx.roundRect(bodyX, bodyY, 32, 32, 8);
    ctx.fill();
    ctx.strokeStyle = '#6366f1';
    ctx.lineWidth = 2;
    ctx.stroke();

    // Singularidad del agujero negro en el pecho
    const singRadius = Math.sin(Date.now() * 0.009) * 3 + 8;
    ctx.fillStyle = '#000000';
    ctx.beginPath();
    ctx.arc(bodyX + 16, bodyY + 18, singRadius, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#06b6d4';
    ctx.lineWidth = 2;
    ctx.stroke();

    // Corona cósmica de estrellas
    ctx.fillStyle = '#fbbf24';
    for (let c = 0; c < 3; c++) {
        const cx = bodyX + 8 + c * 8;
        ctx.beginPath();
        ctx.moveTo(cx, bodyY);
        ctx.lineTo(cx + 3, bodyY - 10);
        ctx.lineTo(cx + 6, bodyY);
        ctx.fill();
    }

    // Ojos cósmicos de energía pura
    ctx.fillStyle = '#00ffff';
    ctx.fillRect(bodyX + (facingLeft ? 6 : 18), bodyY + 8, 8, 3);
}

function drawBossHealthBarModern() {
    const b = bossEntity;
    const barW = 180;
    const barH = 12;
    const barX = (VIEW_WIDTH - barW) / 2;
    const barY = 24;

    ctx.fillStyle = 'rgba(15, 23, 42, 0.85)';
    ctx.fillRect(barX - 4, barY - 14, barW + 8, barH + 20);

    ctx.fillStyle = '#fde047';
    ctx.font = 'bold 10px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(`${b.name.toUpperCase()} (MUNDO ${currentWorldNum})`, VIEW_WIDTH / 2, barY - 3);

    ctx.fillStyle = '#334155';
    ctx.fillRect(barX, barY, barW, barH);

    const healthPercent = Math.max(0, b.hp / b.maxHp);
    ctx.fillStyle = healthPercent > 0.4 ? '#ef4444' : '#f59e0b';
    ctx.fillRect(barX, barY, barW * healthPercent, barH);

    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 1.5;
    ctx.strokeRect(barX, barY, barW, barH);
    ctx.textAlign = 'left';
}

// ==========================================
// ESTRELLA DE VICTORIA HOLOGRÁFICA 2026
// ==========================================
function drawGoldenStar(x, y) {
    ctx.save();
    const pulse = Math.sin(Date.now() * 0.008) * 3 + 12;

    // Resplandor áureo con bloom
    const starGlow = ctx.createRadialGradient(x + 12, y + 12, 2, x + 12, y + 12, pulse + 8);
    starGlow.addColorStop(0, '#ffffff');
    starGlow.addColorStop(0.3, '#fde047');
    starGlow.addColorStop(0.7, '#f59e0b');
    starGlow.addColorStop(1, 'rgba(245, 158, 11, 0)');
    ctx.fillStyle = starGlow;
    ctx.beginPath();
    ctx.arc(x + 12, y + 12, pulse + 8, 0, Math.PI * 2);
    ctx.fill();

    // Estrella de 5 puntas de alta definición
    ctx.fillStyle = '#fef08a';
    ctx.beginPath();
    for (let i = 0; i < 5; i++) {
        const outerAngle = (i * 4 * Math.PI) / 5 - Math.PI / 2;
        const innerAngle = outerAngle + Math.PI / 5;
        const ox = x + 12 + Math.cos(outerAngle) * 11;
        const oy = y + 12 + Math.sin(outerAngle) * 11;
        const ix = x + 12 + Math.cos(innerAngle) * 5;
        const iy = y + 12 + Math.sin(innerAngle) * 5;
        if (i === 0) ctx.moveTo(ox, oy);
        else ctx.lineTo(ox, oy);
        ctx.lineTo(ix, iy);
    }
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = '#b45309';
    ctx.lineWidth = 1.2;
    ctx.stroke();

    // Destello blanco en el núcleo
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(x + 10, y + 10, 2.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
}

// ==========================================
// POTENCIADORES 3D (CHAMPIÑÓN SUPER Y FLOR DE PLASMA)
// ==========================================
function drawPowerUpItem(x, y, type) {
    ctx.save();
    const bob = Math.sin(Date.now() * 0.006 + x) * 2.5;
    const py = y + bob;

    // Resplandor de energía
    ctx.fillStyle = type === 'battery' ? 'rgba(239, 68, 68, 0.28)' : 'rgba(249, 115, 22, 0.28)';
    ctx.beginPath();
    ctx.arc(x + 10, py + 10, 15, 0, Math.PI * 2);
    ctx.fill();

    if (type === 'battery') {
        // === SUPER CHAMPIÑÓN 3D MODERNO ===
        // Tallo suave
        ctx.fillStyle = '#ffedd5';
        ctx.fillRect(x + 5, py + 9, 10, 9);
        // Ojos negros adorables con reflejo
        ctx.fillStyle = '#0f172a';
        ctx.fillRect(x + 7, py + 11, 2, 4);
        ctx.fillRect(x + 11, py + 11, 2, 4);
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(x + 7, py + 11, 1, 1.5);
        ctx.fillRect(x + 11, py + 11, 1, 1.5);

        // Sombrero redondeado rojo con degradado esférico y volumen 2026
        const capGrad = ctx.createRadialGradient(x + 8, py + 6, 2, x + 10, py + 9, 10);
        capGrad.addColorStop(0, '#f87171');
        capGrad.addColorStop(0.5, '#ef4444');
        capGrad.addColorStop(1, '#991b1b');
        ctx.fillStyle = capGrad;
        ctx.beginPath();
        ctx.arc(x + 10, py + 9, 9.5, Math.PI, 0, false);
        ctx.fill();

        // Lunares blancos con relieve esférico
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(x + 10, py + 4, 3, 0, Math.PI * 2);
        ctx.arc(x + 3, py + 8, 2.5, 0, Math.PI * 2);
        ctx.arc(x + 17, py + 8, 2.5, 0, Math.PI * 2);
        ctx.fill();
    } else {
        // === FLOR DE PLASMA VÓRTICE (2026 SCI-FI POWER) ===
        const coreRot = Date.now() * 0.005;
        // Pétalos de fuego rotativos
        ctx.save();
        ctx.translate(x + 10, py + 10);
        ctx.rotate(coreRot);
        for (let p = 0; p < 4; p++) {
            ctx.rotate(Math.PI / 2);
            ctx.fillStyle = '#f97316';
            ctx.beginPath();
            ctx.ellipse(0, 6, 3.2, 5.5, 0, 0, Math.PI * 2);
            ctx.fill();
        }
        ctx.restore();

        // Núcleo brillante incandescente
        const flowerCore = ctx.createRadialGradient(x + 10, py + 10, 1, x + 10, py + 10, 6);
        flowerCore.addColorStop(0, '#ffffff');
        flowerCore.addColorStop(0.4, '#fde047');
        flowerCore.addColorStop(1, '#ef4444');
        ctx.fillStyle = flowerCore;
        ctx.beginPath();
        ctx.arc(x + 10, py + 10, 5.5, 0, Math.PI * 2);
        ctx.fill();
    }
    ctx.restore();
}

// ==========================================
// DISPARO DE PLASMA CON BLOOM Y ESTELA
// ==========================================
function drawPlasmaBall(x, y) {
    ctx.save();
    // Halo de plasma cian volumétrico
    const plasmaGrad = ctx.createRadialGradient(x + 5, y + 5, 1, x + 5, y + 5, 9);
    plasmaGrad.addColorStop(0, '#ffffff');
    plasmaGrad.addColorStop(0.3, '#38bdf8');
    plasmaGrad.addColorStop(0.7, '#0284c7');
    plasmaGrad.addColorStop(1, 'rgba(2, 132, 199, 0)');
    ctx.fillStyle = plasmaGrad;
    ctx.beginPath();
    ctx.arc(x + 5, y + 5, 9, 0, Math.PI * 2);
    ctx.fill();

    // Estela de microchispas
    ctx.fillStyle = '#e0f2fe';
    ctx.fillRect(x + (Math.random() - 0.5) * 5, y + (Math.random() - 0.5) * 5, 2, 2);
    ctx.restore();
}

// ==========================================
// BUCLE PRINCIPAL
// ==========================================
let lastTime = 0;
function gameLoop(time) {
    const dt = Math.min((time - lastTime) / 1000, 0.1);
    lastTime = time;

    try {
        updateGame(dt);
    } catch (err) {
        console.error("updateGame error:", err);
    }

    try {
        render();
    } catch (err) {
        console.error("render error:", err);
    }

    requestAnimationFrame(gameLoop);
}

// ==========================================
// MODALES
// ==========================================
function goToNextLevel() {
    const modal = document.getElementById('modalVictory');
    if (modal) modal.classList.add('hidden');
    victorySequence.active = false;
    isStageClear = false;

    if (victorySequence.isBossVictory) {
        if (currentWorldNum === 9) {
            loadLevel(1, 1);
        } else {
            loadLevel(currentWorldNum + 1, 1);
        }
    } else {
        if (currentLevelNum < 8) {
            loadLevel(currentWorldNum, currentLevelNum + 1);
        } else {
            loadLevel(currentWorldNum, 8);
        }
    }
}
window.goToNextLevel = goToNextLevel;

function showVictoryModal(isBossDefeated) {
    const modal = document.getElementById('modalVictory');
    const title = document.getElementById('victoryTitle');
    const desc = document.getElementById('victoryDesc');
    const nextBtn = document.getElementById('btnNextLevel');

    if (!modal) return;

    if (isBossDefeated) {
        if (currentWorldNum === 9) {
            if (title) title.innerText = "¡CAMPEÓN DE LOS 9 MUNDOS!";
            if (desc) desc.innerText = "¡Has derrotado al Emperador Supremo y superado todos los 72 niveles del juego!";
            if (nextBtn) {
                nextBtn.innerText = "Reiniciar Aventura";
                nextBtn.onclick = () => {
                    modal.classList.add('hidden');
                    victorySequence.active = false;
                    isStageClear = false;
                    loadLevel(1, 1);
                };
            }
        } else {
            if (title) title.innerText = `¡JEFE DEL MUNDO ${currentWorldNum} DERROTADO!`;
            if (desc) desc.innerText = `¡Has obtenido la Estrella Mágica! El portal hacia el MUNDO ${currentWorldNum + 1}: ${WORLDS_CONFIG[currentWorldNum].name} se ha abierto.`;
            if (nextBtn) {
                nextBtn.innerText = `Viajar al Mundo ${currentWorldNum + 1}`;
                nextBtn.onclick = () => {
                    modal.classList.add('hidden');
                    victorySequence.active = false;
                    isStageClear = false;
                    loadLevel(currentWorldNum + 1, 1);
                };
            }
        }
    } else {
        if (title) title.innerText = `¡NIVEL ${currentWorldNum}-${currentLevelNum} COMPLETADO!`;
        if (desc) desc.innerText = `¡Excelente salto! Te acercas al castillo del Boss final.`;
        if (nextBtn) {
            nextBtn.innerText = `Siguiente Nivel (${currentWorldNum}-${currentLevelNum + 1})`;
            nextBtn.onclick = () => {
                modal.classList.add('hidden');
                victorySequence.active = false;
                isStageClear = false;
                loadLevel(currentWorldNum, currentLevelNum + 1);
            };
        }
    }

    modal.classList.remove('hidden');
}

function showGameOverModal() {
    const modal = document.getElementById('modalGameOver');
    if (modal) modal.classList.remove('hidden');
}

function restartFromBeginning() {
    lives = 3;
    score = 0;
    crystals = 0;
    isGameOver = false;
    astro.isDying = false;
    astro.deathTimer = 0;
    const modal = document.getElementById('modalGameOver');
    if (modal) modal.classList.add('hidden');
    loadLevel(currentWorldNum, 1);
}

window.showGameOverModal = showGameOverModal;
window.restartFromBeginning = restartFromBeginning;

function openWorldSelector() {
    isPaused = true;
    const modal = document.getElementById('modalWorldSelect');
    const list = document.getElementById('worldsList');
    list.innerHTML = '';

    const banner = document.createElement('div');
    banner.style.cssText = "background: rgba(30, 41, 59, 0.85); padding: 10px 14px; border-radius: 12px; margin-bottom: 14px; display: flex; justify-content: space-between; align-items: center; border: 1px solid #475569;";
    banner.innerHTML = `
        <span style="font-size: 13px; color: #cbd5e1;">🎮 Toca cualquier nivel para jugar inmediatamente a ese mundo.</span>
        <button id="btnCheatAll" class="retro-btn" style="padding: 6px 12px; font-size: 11px; background: linear-gradient(135deg, #f59e0b, #d97706); border: 1px solid #fef08a;" onclick="unlockAllWorldsCheat()">⭐ DESBLOQUEAR TODOS (1-9)</button>
    `;
    list.appendChild(banner);

    const worldEmojis = {
        1: "🌿",
        2: "🏜️",
        3: "🔮",
        4: "🏝️",
        5: "❄️",
        6: "🌲",
        7: "⚓",
        8: "🔥",
        9: "🚀"
    };

    WORLDS_CONFIG.forEach(w => {
        const item = document.createElement('div');
        item.className = 'world-card unlocked';
        item.style.borderLeft = `5px solid ${w.bossColor || '#38bdf8'}`;

        let levelsHtml = '';
        for (let lvl = 1; lvl <= 8; lvl++) {
            const isBoss = lvl === 8;
            levelsHtml += `
                <button class="lvl-btn active ${isBoss ? 'boss-btn' : ''}"
                        onclick="selectLevel(${w.id}, ${lvl})">
                    ${isBoss ? '👑 Boss' : lvl}
                </button>
            `;
        }

        const emoji = worldEmojis[w.id] || "⭐";
        item.innerHTML = `
            <div class="world-header">
                <h3 style="color: ${w.bossColor || '#f8fafc'}; font-size: 15px; margin: 0 0 4px 0;">${emoji} Mundo ${w.id}: ${w.name}</h3>
                <span class="world-desc" style="font-size: 12px; color: #cbd5e1; display: block; margin-bottom: 4px;">${w.description}</span>
                <span class="boss-tag" style="font-size: 11px; color: #fbbf24;">Boss del mundo: <strong>${w.bossName}</strong></span>
            </div>
            <div class="levels-row" style="margin-top: 8px;">
                ${levelsHtml}
            </div>
        `;
        list.appendChild(item);
    });

    modal.classList.remove('hidden');
}

function unlockAllWorldsCheat() {
    saveState.unlockedWorld = 9;
    saveState.unlockedLevel = 8;
    saveProgress(saveState);
    openWorldSelector();
}

function closeWorldSelector() {
    document.getElementById('modalWorldSelect').classList.add('hidden');
    isPaused = false;
}

function selectLevel(world, level) {
    closeWorldSelector();
    const mainMenu = document.getElementById('mainMenuScreen');
    if (mainMenu) mainMenu.classList.add('hidden');
    gameStartedFromMenu = true;
    isPaused = false;
    loadLevel(world, level);
    window.sounds.init();
    window.sounds.startMusic(world, level === 8);
}

// ==========================================
// CONTROLES TÁCTILES Y EVENTOS
// ==========================================
function setupControls() {
    window.addEventListener('keydown', (e) => {
        window.sounds.init();
        if (e.code === 'ArrowLeft' || e.code === 'KeyA') keys.left = true;
        if (e.code === 'ArrowRight' || e.code === 'KeyD') keys.right = true;
        if (e.code === 'ArrowUp' || e.code === 'Space' || e.code === 'KeyW') {
            keys.up = true;
            jumpBuffer = 10;
        }
        if (e.code === 'ArrowDown' || e.code === 'KeyS') keys.down = true;
        if (e.code === 'KeyZ' || e.code === 'ShiftLeft' || e.code === 'KeyJ') {
            keys.actionB = true;
            keys.actionPressedOnce = true;
        }
        if (e.code === 'KeyP' || e.code === 'Escape') togglePause();
    });

    window.addEventListener('keyup', (e) => {
        if (e.code === 'ArrowLeft' || e.code === 'KeyA') keys.left = false;
        if (e.code === 'ArrowRight' || e.code === 'KeyD') keys.right = false;
        if (e.code === 'ArrowUp' || e.code === 'Space' || e.code === 'KeyW') keys.up = false;
        if (e.code === 'ArrowDown' || e.code === 'KeyS') keys.down = false;
        if (e.code === 'KeyZ' || e.code === 'ShiftLeft' || e.code === 'KeyJ') {
            keys.actionB = false;
            keys.actionPressedOnce = false;
        }
    });

    const bindTouch = (elId, onDown, onUp) => {
        const el = document.getElementById(elId);
        if (!el) return;

        let isDown = false;

        const press = (e) => {
            if (e && e.cancelable) e.preventDefault();
            if (isDown) return;
            isDown = true;
            try {
                window.sounds.init();
                if (window.sounds.ctx && window.sounds.ctx.state === 'suspended') {
                    window.sounds.ctx.resume();
                }
                if (!window.sounds.musicPlaying && !window.sounds.muted && gameStartedFromMenu) {
                    window.sounds.startMusic(currentWorldNum, levelData ? levelData.isBossLevel : false);
                }
            } catch (err) {}
            if (navigator.vibrate && vibrationEnabled) navigator.vibrate(15);
            onDown();
        };

        const release = (e) => {
            if (e && e.cancelable) e.preventDefault();
            if (!isDown) return;
            isDown = false;
            onUp();
        };

        el.addEventListener('pointerdown', press);
        el.addEventListener('pointerup', release);
        el.addEventListener('pointercancel', release);
        el.addEventListener('pointerleave', release);

        el.addEventListener('touchstart', press, { passive: false });
        el.addEventListener('touchend', release, { passive: false });
        el.addEventListener('touchcancel', release, { passive: false });
    };

    window.addEventListener('touchend', (e) => {
        if (!e.touches || e.touches.length === 0) {
            keys.left = false;
            keys.right = false;
            keys.up = false;
            keys.down = false;
            keys.actionB = false;
        }
    });
    window.addEventListener('touchcancel', (e) => {
        if (!e.touches || e.touches.length === 0) {
            keys.left = false;
            keys.right = false;
            keys.up = false;
            keys.down = false;
            keys.actionB = false;
        }
    });

    bindTouch('btnLeft', () => keys.left = true, () => keys.left = false);
    bindTouch('btnRight', () => keys.right = true, () => keys.right = false);
    bindTouch('btnDown', () => keys.down = true, () => keys.down = false);
    bindTouch('btnA', () => {
        keys.up = true;
        jumpBuffer = 10;
    }, () => {
        keys.up = false;
    });
    bindTouch('btnB', () => {
        keys.actionB = true;
        keys.actionPressedOnce = true;
    }, () => {
        keys.actionB = false;
        keys.actionPressedOnce = false;
    });

    document.getElementById('btnMute').onclick = () => {
        const isMuted = window.sounds.toggleMute();
        document.getElementById('btnMute').innerText = isMuted ? '🔇' : '🔊';
    };

    document.getElementById('btnPause').onclick = togglePause;
    document.getElementById('btnMap').onclick = openWorldSelector;
    document.getElementById('btnFullscreen').onclick = toggleFullscreen;
}

function togglePause() {
    isPaused = !isPaused;
    document.getElementById('pauseOverlay').classList.toggle('hidden', !isPaused);
}

function toggleFullscreen() {
    if (!document.fullscreenElement) {
        document.documentElement.requestFullscreen().catch(() => {});
    } else {
        document.exitFullscreen().catch(() => {});
    }
}

// ==========================================
// FLUJO ESTILO UNITY: INTRO HUGO SP STUDIOS ➔ MENÚ PRINCIPAL
// ==========================================
let gameStartedFromMenu = false;
let vibrationEnabled = true;
let sfxEnabled = true;

function startGameDirectly() {
    const splash = document.getElementById('studioSplashScreen');
    if (splash) {
        splash.classList.add('fade-out');
        splash.style.display = 'none';
        splash.style.pointerEvents = 'none';
    }
    const menu = document.getElementById('mainMenuScreen');
    if (menu) {
        menu.classList.add('hidden');
        menu.style.pointerEvents = 'none';
    }
    gameStartedFromMenu = true;
    isPaused = false;

    try {
        window.sounds.init();
        if (window.sounds.ctx && window.sounds.ctx.state === 'suspended') {
            window.sounds.ctx.resume();
        }
        window.sounds.startMusic(currentWorldNum, levelData ? levelData.isBossLevel : false);
    } catch (err) {
        console.error("Audio error on start:", err);
    }
}
window.startGameDirectly = startGameDirectly;
window.startGameFromMenu = startGameDirectly;
window.playGameAction = startGameDirectly;

function setupGameFlow() {
    const splash = document.getElementById('studioSplashScreen');
    const mainMenu = document.getElementById('mainMenuScreen');

    if (splash) {
        let isDismissed = false;

        const dismissSplash = (instant = false) => {
            if (isDismissed) return;
            isDismissed = true;

            try {
                window.sounds.init();
                window.sounds.playStudioIntroChime();
            } catch (e) {}

            splash.classList.add('fade-out');
            splash.style.pointerEvents = 'none';

            const delay = instant ? 80 : 400;
            setTimeout(() => {
                splash.style.display = 'none';
                if (mainMenu) {
                    mainMenu.classList.remove('hidden');
                    mainMenu.style.pointerEvents = 'auto';
                }
            }, delay);
        };

        splash.addEventListener('pointerdown', () => dismissSplash(true), { passive: true });
        splash.addEventListener('touchstart', () => dismissSplash(true), { passive: true });
        splash.addEventListener('click', () => dismissSplash(true), { passive: true });

        setTimeout(() => {
            dismissSplash(false);
        }, 1400);
    }

    const btnPlay = document.getElementById('btnPlayGame');
    if (btnPlay) {
        btnPlay.addEventListener('click', startGameDirectly);
        btnPlay.addEventListener('pointerdown', startGameDirectly, { passive: true });
    }

    const btnWorldMenu = document.getElementById('btnOpenWorldSelectMenu');
    if (btnWorldMenu) {
        btnWorldMenu.addEventListener('click', () => {
            try { window.sounds.init(); } catch (err) {}
            openWorldSelector();
        });
        btnWorldMenu.addEventListener('pointerdown', () => {
            try { window.sounds.init(); } catch (err) {}
            openWorldSelector();
        }, { passive: true });
    }

    const btnCtrl = document.getElementById('btnOpenControls');
    if (btnCtrl) {
        btnCtrl.addEventListener('click', () => {
            try { window.sounds.init(); } catch (err) {}
            const modal = document.getElementById('modalControls');
            if (modal) modal.classList.remove('hidden');
        });
    }

    const btnSet = document.getElementById('btnOpenSettings');
    if (btnSet) {
        btnSet.addEventListener('click', () => {
            try { window.sounds.init(); } catch (err) {}
            const modal = document.getElementById('modalSettings');
            if (modal) modal.classList.remove('hidden');
        });
    }
}

function closeControlsModal() {
    document.getElementById('modalControls').classList.add('hidden');
}

function closeSettingsModal() {
    document.getElementById('modalSettings').classList.add('hidden');
}

function toggleMusicSetting() {
    const isMuted = window.sounds.toggleMute();
    const btn = document.getElementById('toggleMusicBtn');
    if (isMuted) {
        btn.innerText = 'DESACTIVADA';
        btn.classList.add('disabled');
    } else {
        btn.innerText = 'ACTIVADA';
        btn.classList.remove('disabled');
    }
}

function toggleSfxSetting() {
    sfxEnabled = !sfxEnabled;
    const btn = document.getElementById('toggleSfxBtn');
    btn.innerText = sfxEnabled ? 'ACTIVADOS' : 'DESACTIVADOS';
    btn.classList.toggle('disabled', !sfxEnabled);
}

function toggleVibSetting() {
    vibrationEnabled = !vibrationEnabled;
    const btn = document.getElementById('toggleVibBtn');
    btn.innerText = vibrationEnabled ? 'ACTIVADA' : 'DESACTIVADA';
    btn.classList.toggle('disabled', !vibrationEnabled);
}

function resetSaveData() {
    if (confirm("¿Estás seguro de que quieres borrar todo tu progreso y volver al Mundo 1-1?")) {
        localStorage.removeItem(SAVE_KEY);
        saveState = {
            unlockedWorld: 1,
            unlockedLevel: 1,
            currentWorld: 1,
            currentLevel: 1,
            highScore: 0,
            totalCrystals: 0
        };
        closeSettingsModal();
        loadLevel(1, 1);
        goToMainMenu();
    }
}

function goToMainMenu() {
    isPaused = true;
    document.getElementById('pauseOverlay').classList.add('hidden');
    document.getElementById('modalGameOver').classList.add('hidden');
    document.getElementById('modalVictory').classList.add('hidden');
    document.getElementById('mainMenuScreen').classList.remove('hidden');
    // La música suena SIEMPRE sin cortes
    window.sounds.startMusic(currentWorldNum, false);
}

let gameInitialized = false;
function initGame() {
    if (gameInitialized) return;
    gameInitialized = true;

    try { setupControls(); } catch (e) { console.error("setupControls note:", e); }
    try { loadLevel(saveState.currentWorld || 1, saveState.currentLevel || 1); } catch (e) { console.error("loadLevel note:", e); }
    try { setupGameFlow(); } catch (e) { console.error("setupGameFlow note:", e); }

    // La música suena SIEMPRE: se activa con cualquier interacción inicial y no para
    const ensureMusicAlways = () => {
        try {
            window.sounds.init();
            if (window.sounds.ctx && window.sounds.ctx.state === 'suspended') {
                window.sounds.ctx.resume();
            }
            if (!window.sounds.musicPlaying && !window.sounds.muted) {
                window.sounds.startMusic(currentWorldNum, levelData ? levelData.isBossLevel : false);
            }
        } catch (e) {}
    };
    window.addEventListener('pointerdown', ensureMusicAlways, { passive: true });
    window.addEventListener('touchstart', ensureMusicAlways, { passive: true });
    window.addEventListener('keydown', ensureMusicAlways, { passive: true });
    window.addEventListener('click', ensureMusicAlways, { passive: true });

    requestAnimationFrame(gameLoop);
}

window.goToMainMenu = goToMainMenu;
window.openWorldSelector = openWorldSelector;
window.closeWorldSelector = closeWorldSelector;
window.togglePause = togglePause;
window.toggleFullscreen = toggleFullscreen;
window.restartFromBeginning = restartFromBeginning;
window.showGameOverModal = showGameOverModal;
window.goToNextLevel = goToNextLevel;
window.startGameFromMenu = startGameFromMenu;

if (document.readyState === 'complete' || document.readyState === 'interactive') {
    initGame();
} else {
    window.addEventListener('DOMContentLoaded', initGame);
    window.addEventListener('load', initGame);
}
