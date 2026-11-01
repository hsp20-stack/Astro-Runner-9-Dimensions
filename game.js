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
const RENDER_SCALE = 4; // Renderizado Ultra-HD Calidad Dios 4K/1080p (1920x1080 nativo con suavizado subpíxel)
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

// Nave Espacial de Astro (Viaje entre niveles y mundos 2026)
let spaceshipSequence = {
    active: false,
    x: 0,
    y: 0,
    w: 56,
    h: 38,
    vx: 0,
    vy: 0,
    angle: 0,
    state: 'waiting', // 'waiting', 'boarding', 'takeoff', 'boss_descend'
    timer: 0,
    astroBoarded: false
};

// Animación cinematográfica de la bandera de meta
let flagPoleAnimation = {
    active: false,
    timer: 0,
    flagY: 0,
    targetFlagY: 0,
    astroSliding: false,
    astroWalkingToShip: false
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

    // Sincronizar cambio de nivel en modo online (si soy anfitrión)
    if (window.OnlineManager && window.OnlineManager.isOnline && window.OnlineManager.isHost) {
        window.OnlineManager.sendLevelSync(worldNum, levelNum);
    }

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
    flagPoleAnimation.astroWalkingToShip = false;
    victorySequence.active = false;

    // Configuración de la Nave Espacial de Astro
    spaceshipSequence.active = true;
    spaceshipSequence.x = (levelData.castleX || (levelData.mapWidth - 5) * 32) - 10;
    spaceshipSequence.y = (6 - 1) * 32 - 41;
    spaceshipSequence.vx = 0;
    spaceshipSequence.vy = 0;
    spaceshipSequence.angle = 0;
    spaceshipSequence.state = 'waiting';
    spaceshipSequence.timer = 0;
    spaceshipSequence.astroBoarded = false;

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
    // 1. Prólogo Cinemático / Historia Animada (2026 Animated Story)
    if (window.StoryManager && window.StoryManager.active) {
        window.StoryManager.update(dt);
        return;
    }

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

    // Si la secuencia triunfal de Nivel Completado está activa (animación festiva y despegue de la nave 2026)
    if (victorySequence.active) {
        victorySequence.timer++;
        victorySequence.fireworkTimer++;

        updateSpaceshipSequence();

        // Explosiones festivas periódicas de fuegos artificiales
        if (victorySequence.fireworkTimer % 18 === 0) {
            const fx = cameraX + 40 + Math.random() * (VIEW_WIDTH - 80);
            const fy = 35 + Math.random() * 80;
            triggerCelebrationFireworks(fx, fy);
        }

        updateParticles();

        if (victorySequence.timer >= 95 || spaceshipSequence.y < -80) {
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

    // Foso / Abismo con animación de caída clásica
    if (astro.y > levelData.mapHeight * TILE_SIZE + 10) {
        killPlayer(true);
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

    // Sincronización Online Multijugador (60 FPS)
    if (window.OnlineManager && window.OnlineManager.isOnline) {
        window.OnlineManager.update(dt);
    }

    updateParticles();
}

// ==========================================
// SECUENCIA CINEMATOGRÁFICA DE META (ESTILO SUPER MARIO BROS & NAVE ESPACIAL)
// ==========================================
function startFlagPoleSequence() {
    flagPoleAnimation.active = true;
    flagPoleAnimation.timer = 0;
    flagPoleAnimation.astroSliding = true;
    flagPoleAnimation.astroWalkingToShip = false;
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
            flagPoleAnimation.astroWalkingToShip = true;
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
    } else if (flagPoleAnimation.astroWalkingToShip) {
        // Astro camina triunfalmente hacia su nave espacial
        astro.x += 1.8;
        astro.facing = 'right';
        astro.animTimer++;
        if (astro.animTimer % 5 === 0) {
            astro.animFrame = (astro.animFrame + 1) % 4;
        }

        // Al llegar a la cabina de su nave espacial
        const shipBoardX = spaceshipSequence.x + 10;
        if (astro.x >= shipBoardX) {
            flagPoleAnimation.active = false;
            flagPoleAnimation.astroWalkingToShip = false;
            spaceshipSequence.astroBoarded = true;
            spaceshipSequence.state = 'takeoff';
            spaceshipSequence.timer = 0;
            spaceshipSequence.vx = 0.6;
            spaceshipSequence.vy = -0.6;

            try {
                if (window.sounds && window.sounds.playSpaceshipLaunch) {
                    window.sounds.playSpaceshipLaunch();
                } else if (window.sounds && window.sounds.playPowerUp) {
                    window.sounds.playPowerUp();
                }
            } catch (e) {}

            // Estallido de propulsión de plasma al abordar
            for (let i = 0; i < 25; i++) {
                particles.push({
                    x: spaceshipSequence.x + 6,
                    y: spaceshipSequence.y + 24,
                    vx: (Math.random() - 0.5) * 4,
                    vy: Math.random() * 3 + 1,
                    color: ['#38bdf8', '#0ea5e9', '#f59e0b', '#ffffff'][i % 4],
                    life: 30,
                    size: 3.5
                });
            }

            triggerStageClear(false);
        }
    }
}

function updateSpaceshipSequence() {
    if (!spaceshipSequence.active) return;

    if (spaceshipSequence.state === 'boss_descend') {
        // En los niveles de jefe, la nave espacial desciende suavemente a recoger a Astro
        spaceshipSequence.timer++;
        const targetY = spaceshipSequence.targetY || (astro ? astro.y - 12 : 120);
        spaceshipSequence.y += (targetY - spaceshipSequence.y) * 0.08;
        if (astro) {
            spaceshipSequence.x += (astro.x + 10 - spaceshipSequence.x) * 0.08;
        }

        // Estela azulada de posicionamiento
        if (spaceshipSequence.timer % 3 === 0) {
            particles.push({
                x: spaceshipSequence.x + 10,
                y: spaceshipSequence.y + 20,
                vx: (Math.random() - 0.5) * 2,
                vy: Math.random() * 2 + 1,
                color: '#38bdf8',
                life: 16,
                size: 2.5
            });
        }

        if (Math.abs(spaceshipSequence.y - targetY) < 5 || spaceshipSequence.timer > 40) {
            spaceshipSequence.astroBoarded = true;
            spaceshipSequence.state = 'takeoff';
            spaceshipSequence.timer = 0;
            spaceshipSequence.vx = 0.8;
            spaceshipSequence.vy = -1.2;
            try {
                if (window.sounds && window.sounds.playSpaceshipLaunch) {
                    window.sounds.playSpaceshipLaunch();
                }
            } catch (e) {}
        }
    } else if (spaceshipSequence.state === 'takeoff') {
        spaceshipSequence.timer++;
        // Aceleración aerodinámica hacia las estrellas
        spaceshipSequence.vy -= 0.16;
        spaceshipSequence.vx += 0.13;
        spaceshipSequence.x += spaceshipSequence.vx;
        spaceshipSequence.y += spaceshipSequence.vy;
        spaceshipSequence.angle = Math.min(0.40, spaceshipSequence.angle + 0.012);

        // Chorro continuo de plasma y fuego de los propulsores gemelos
        const rearX = spaceshipSequence.x - 4;
        const rearY = spaceshipSequence.y + 22;
        for (let i = 0; i < 3; i++) {
            particles.push({
                x: rearX + (Math.random() - 0.5) * 4,
                y: rearY + (Math.random() - 0.5) * 4,
                vx: -spaceshipSequence.vx * 0.6 - Math.random() * 2,
                vy: -spaceshipSequence.vy * 0.3 + Math.random() * 2 - 1,
                color: ['#ffffff', '#38bdf8', '#0284c7', '#f97316', '#fbbf24'][Math.floor(Math.random() * 5)],
                life: 20 + Math.random() * 10,
                size: 2.5 + Math.random() * 2.5
            });
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
                if (ent === astro) killPlayer(true);
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
    const shotX = astro.x + (dir > 0 ? astro.w : -8);
    const shotY = astro.y + astro.h / 2;
    const shotVx = dir * 5.8;
    activePlasmaShots.push({
        x: shotX,
        y: shotY,
        w: 10,
        h: 10,
        vx: shotVx,
        vy: 0.5,
        bounces: 0
    });
    if (window.OnlineManager && window.OnlineManager.isOnline) {
        window.OnlineManager.sendPlasmaShot(shotX, shotY, shotVx);
    }
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
            const enemyBox = { x: e.x, y: e.y, w: e.w || 22, h: e.h || 24 };
            if (e.alive && checkAABB(ps, enemyBox)) {
                e.alive = false;
                score += 200;
                addFloatingText('+200', e.x + 10, e.y, '#38bdf8');
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
                    if (window.OnlineManager && window.OnlineManager.isOnline) {
                        window.OnlineManager.sendEnemyDefeat(i);
                    }
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
    const arenaLeft = (levelData.bossArenaCol || 53) * TILE_SIZE;
    b.vy += 0.35;
    b.x += b.vx;

    if (b.x < arenaLeft) {
        b.x = arenaLeft;
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

    if (b.hitTimer > 0) b.hitTimer--;
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
        if (bp.x < (arenaLeft - 3 * TILE_SIZE) || bp.x > levelData.mapWidth * TILE_SIZE) {
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
    bossEntity.hitTimer = 18; // Flash de impacto AAA
    triggerScreenShake(7);
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

function killPlayer(fromPit = false) {
    if (astro.isDying) return;
    astro.isDying = true;
    astro.deathTimer = 0;
    astro.vx = 0;
    astro.fromPit = fromPit;

    if (fromPit) {
        // Salto visible y cómico desde el foso estilo Super Mario
        astro.y = VIEW_HEIGHT - 6;
        astro.vy = -10.5;
    } else {
        astro.vy = -8.5;
    }

    lives--;
    updateUI();
    triggerScreenShake(6);
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
        // En niveles de Boss, la nave espacial de Astro desciende desde el espacio para recogerlo
        spaceshipSequence.active = true;
        spaceshipSequence.x = Math.max(cameraX + 50, (astro ? astro.x + 36 : cameraX + 140));
        spaceshipSequence.y = -60;
        spaceshipSequence.targetY = (astro ? astro.y - 12 : 120);
        spaceshipSequence.state = 'boss_descend';
        spaceshipSequence.timer = 0;
        spaceshipSequence.astroBoarded = false;
        spaceshipSequence.angle = 0.12;

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
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    ctx.scale(RENDER_SCALE, RENDER_SCALE);

    // Renderizado del Prólogo Cinemático / Historia Animada (2026 Animated Story)
    if (window.StoryManager && window.StoryManager.active) {
        window.StoryManager.render(ctx);
        ctx.restore();
        return;
    }

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

    // Nave Espacial de Astro (Viaje interplanetario entre niveles 2026)
    if (spaceshipSequence.active) {
        drawAstroSpaceship(spaceshipSequence.x - cameraX, spaceshipSequence.y, spaceshipSequence.angle);
    }

    // El Jugador: Astro (con alta visibilidad y animaciones)
    if (!spaceshipSequence.astroBoarded) {
        if (!astro.isDying || astro.deathTimer < 110) {
            drawAstroModern();
        }
    }

    // Jugador Remoto Online (Amigo / Familiar jugando a distancia)
    if (window.OnlineManager && window.OnlineManager.isOnline) {
        window.OnlineManager.drawRemotePlayer(ctx, cameraX);
    }

    // Partículas con Bloom, suavizado y desvanecimiento dinámico
    ctx.save();
    for (let p of particles) {
        if (p.isCoin) {
            drawGoldCoin(p.x - cameraX, p.y);
        } else {
            const alpha = Math.min(1, Math.max(0, (p.life !== undefined ? p.life / 22 : 1)));
            ctx.globalAlpha = alpha;
            ctx.fillStyle = p.color;
            const px = p.x - cameraX;
            const py = p.y;
            const sz = p.size || 3.5;
            ctx.beginPath();
            ctx.arc(px + sz / 2, py + sz / 2, sz / 2, 0, Math.PI * 2);
            ctx.fill();
        }
    }
    ctx.restore();

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
    const weatherTheme = (levelData && levelData.world) ? (levelData.world.theme || "grassland") : "grassland";
    const now = Date.now();

    // 1. RAYOS VOLUMÉTRICOS DE LUZ TEMÁTICOS (RTX VOLUMETRIC GOD RAYS)
    ctx.save();
    let godRayColor1 = 'rgba(255, 255, 255, ';
    let godRayColor2 = 'rgba(254, 240, 138, ';
    if (weatherTheme === 'desert' || weatherTheme === 'ocean') {
        godRayColor1 = 'rgba(254, 240, 138, ';
        godRayColor2 = 'rgba(251, 191, 36, ';
    } else if (weatherTheme === 'neon_cave') {
        godRayColor1 = 'rgba(0, 242, 254, ';
        godRayColor2 = 'rgba(192, 132, 252, ';
    } else if (weatherTheme === 'ice') {
        godRayColor1 = 'rgba(224, 242, 254, ';
        godRayColor2 = 'rgba(56, 189, 248, ';
    } else if (weatherTheme === 'spooky_forest') {
        godRayColor1 = 'rgba(168, 85, 247, ';
        godRayColor2 = 'rgba(244, 63, 94, ';
    } else if (weatherTheme === 'airship') {
        godRayColor1 = 'rgba(253, 186, 116, ';
        godRayColor2 = 'rgba(249, 115, 22, ';
    } else if (weatherTheme === 'lava_castle') {
        godRayColor1 = 'rgba(249, 115, 22, ';
        godRayColor2 = 'rgba(239, 68, 68, ';
    } else if (weatherTheme === 'space') {
        godRayColor1 = 'rgba(129, 140, 248, ';
        godRayColor2 = 'rgba(192, 132, 252, ';
    }

    const rayBreath = Math.sin(now * 0.0016) * 0.02 + 0.055;
    const rayGrad = ctx.createLinearGradient(0, 0, VIEW_WIDTH, VIEW_HEIGHT);
    rayGrad.addColorStop(0, godRayColor1 + (rayBreath + 0.05) + ')');
    rayGrad.addColorStop(0.35, godRayColor2 + rayBreath + ')');
    rayGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = rayGrad;
    for (let r = 0; r < 5; r++) {
        const rx = ((r * 110 + 20) - (cameraX * 0.15)) % (VIEW_WIDTH + 120);
        ctx.beginPath();
        ctx.moveTo(rx, 0);
        ctx.lineTo(rx + 45, 0);
        ctx.lineTo(rx + 155, VIEW_HEIGHT);
        ctx.lineTo(rx + 90, VIEW_HEIGHT);
        ctx.closePath();
        ctx.fill();
    }
    ctx.restore();

    // 2. ILUMINACIÓN DINÁMICA DE PUNTOS DE LUZ EN TIEMPO REAL (RTX POINT LIGHTS & SCREEN PASS)
    ctx.save();
    ctx.globalCompositeOperation = 'screen'; // Iluminación aditiva realista

    // Luz de Astro: halo envolvente con destellos según estado
    const plx = Math.floor(astro.x - cameraX + astro.w / 2);
    const ply = Math.floor(astro.y + astro.h / 2);
    if (plx > -50 && plx < VIEW_WIDTH + 50) {
        let playerRadius = 58;
        let pColorCore = 'rgba(255, 255, 255, 0.45)';
        let pColorOuter = 'rgba(56, 189, 248, 0.28)';

        if (astro.state === 'plasma') {
            playerRadius = 72;
            pColorCore = 'rgba(254, 202, 202, 0.55)';
            pColorOuter = 'rgba(56, 189, 248, 0.38)';
        } else if (astro.state === 'super') {
            playerRadius = 80;
            pColorCore = 'rgba(254, 240, 138, 0.6)';
            pColorOuter = 'rgba(245, 158, 11, 0.35)';
        }

        const playerLight = ctx.createRadialGradient(plx, ply, 2, plx, ply, playerRadius);
        playerLight.addColorStop(0, pColorCore);
        playerLight.addColorStop(0.4, pColorOuter);
        playerLight.addColorStop(1, 'rgba(0, 0, 0, 0)');
        ctx.fillStyle = playerLight;
        ctx.beginPath();
        ctx.arc(plx, ply, playerRadius, 0, Math.PI * 2);
        ctx.fill();

        // Destello de propulsión inferior del jetpack
        if (Math.abs(astro.vx) > 1.8 || !astro.isGrounded) {
            const jpLight = ctx.createRadialGradient(plx, ply + 16, 1, plx, ply + 16, 32);
            jpLight.addColorStop(0, astro.state === 'plasma' ? 'rgba(249, 115, 22, 0.5)' : 'rgba(56, 189, 248, 0.5)');
            jpLight.addColorStop(1, 'rgba(0, 0, 0, 0)');
            ctx.fillStyle = jpLight;
            ctx.beginPath();
            ctx.arc(plx, ply + 16, 32, 0, Math.PI * 2);
            ctx.fill();
        }
    }

    // Luces de los disparos de plasma en vuelo (iluminan el mapa a su paso)
    for (let ps of activePlasmaShots) {
        const psx = ps.x - cameraX;
        if (psx > -40 && psx < VIEW_WIDTH + 40) {
            const shotLight = ctx.createRadialGradient(psx + 6, ps.y + 6, 1, psx + 6, ps.y + 6, 36);
            shotLight.addColorStop(0, 'rgba(255, 255, 255, 0.7)');
            shotLight.addColorStop(0.3, 'rgba(56, 189, 248, 0.5)');
            shotLight.addColorStop(1, 'rgba(0, 0, 0, 0)');
            ctx.fillStyle = shotLight;
            ctx.beginPath();
            ctx.arc(psx + 6, ps.y + 6, 36, 0, Math.PI * 2);
            ctx.fill();
        }
    }

    // Luces de las monedas y potenciadores en pantalla
    for (let c of activeCrystals) {
        const cx = c.x - cameraX + 8;
        if (cx > -20 && cx < VIEW_WIDTH + 20) {
            const coinLight = ctx.createRadialGradient(cx, c.y + 8, 1, cx, c.y + 8, 24);
            coinLight.addColorStop(0, 'rgba(254, 240, 138, 0.45)');
            coinLight.addColorStop(0.5, 'rgba(245, 158, 11, 0.22)');
            coinLight.addColorStop(1, 'rgba(0, 0, 0, 0)');
            ctx.fillStyle = coinLight;
            ctx.beginPath();
            ctx.arc(cx, c.y + 8, 24, 0, Math.PI * 2);
            ctx.fill();
        }
    }

    for (let p of activePowerUps) {
        const px = p.x - cameraX + 10;
        if (px > -25 && px < VIEW_WIDTH + 25) {
            const pLight = ctx.createRadialGradient(px, p.y + 10, 2, px, p.y + 10, 32);
            pLight.addColorStop(0, p.type === 'battery' ? 'rgba(239, 68, 68, 0.45)' : 'rgba(249, 115, 22, 0.5)');
            pLight.addColorStop(1, 'rgba(0, 0, 0, 0)');
            ctx.fillStyle = pLight;
            ctx.beginPath();
            ctx.arc(px, p.y + 10, 32, 0, Math.PI * 2);
            ctx.fill();
        }
    }

    // Luz cinematográfica del Boss
    if (bossEntity && bossEntity.alive) {
        const bx = bossEntity.x - cameraX + bossEntity.w / 2;
        const by = bossEntity.y + bossEntity.h / 2;
        const bossPulse = Math.sin(now * 0.007) * 16 + 85;
        const bossLight = ctx.createRadialGradient(bx, by, 10, bx, by, bossPulse);
        bossLight.addColorStop(0, 'rgba(254, 202, 202, 0.5)');
        bossLight.addColorStop(0.45, 'rgba(239, 68, 68, 0.3)');
        bossLight.addColorStop(1, 'rgba(0, 0, 0, 0)');
        ctx.fillStyle = bossLight;
        ctx.beginPath();
        ctx.arc(bx, by, bossPulse, 0, Math.PI * 2);
        ctx.fill();
    }
    ctx.restore();

    // 3. PARTÍCULAS AMBIENTALES DINÁMICAS SEGÚN EL MUNDO (HIGH-DENSITY WEATHER FX)
    ctx.save();
    if (weatherTheme === "grassland") {
        for (let i = 0; i < 14; i++) {
            const time = (now * 0.0006 + i * 0.28) % 1;
            const wx = ((i * 42) - cameraX * 0.35 + Math.sin(time * 6 + i) * 16) % VIEW_WIDTH;
            const wy = (time * VIEW_HEIGHT);
            const drawX = wx < 0 ? wx + VIEW_WIDTH : wx;
            ctx.fillStyle = (i % 3 === 0) ? 'rgba(74, 222, 128, 0.6)' : ((i % 2 === 0) ? 'rgba(254, 240, 138, 0.55)' : 'rgba(56, 189, 248, 0.5)');
            ctx.beginPath();
            ctx.arc(drawX, wy, 2.2, 0, Math.PI * 2);
            ctx.fill();
        }
    } else if (weatherTheme === "desert") {
        for (let i = 0; i < 24; i++) {
            const time = (now * 0.0014 + i * 0.18) % 1;
            const wx = ((i * 28) - cameraX * 0.55 + time * 85) % VIEW_WIDTH;
            const wy = 20 + (i * 10) + Math.sin(time * 8 + i) * 12;
            const drawX = wx < 0 ? wx + VIEW_WIDTH : wx;
            ctx.fillStyle = (i % 2 === 0) ? 'rgba(251, 191, 36, 0.55)' : 'rgba(245, 158, 11, 0.45)';
            ctx.beginPath();
            ctx.arc(drawX, wy, (i % 3 === 0) ? 2.5 : 1.6, 0, Math.PI * 2);
            ctx.fill();
        }
    } else if (weatherTheme === "neon_cave") {
        for (let i = 0; i < 20; i++) {
            const time = (now * 0.0008 + i * 0.2) % 1;
            const wx = ((i * 30) - cameraX * 0.3 + Math.sin(time * 5 + i) * 14) % VIEW_WIDTH;
            const wy = (1 - time) * VIEW_HEIGHT;
            const drawX = wx < 0 ? wx + VIEW_WIDTH : wx;
            ctx.fillStyle = (i % 2 === 0) ? 'rgba(0, 242, 254, 0.65)' : 'rgba(192, 132, 252, 0.65)';
            ctx.beginPath();
            ctx.arc(drawX, wy, (i % 3 === 0) ? 2.4 : 1.6, 0, Math.PI * 2);
            ctx.fill();
        }
    } else if (weatherTheme === "ocean") {
        for (let i = 0; i < 18; i++) {
            const time = (now * 0.001 + i * 0.22) % 1;
            const wx = ((i * 36) - cameraX * 0.4 + time * 50) % VIEW_WIDTH;
            const wy = 60 + Math.sin(time * 6 + i) * 25 + (i * 8);
            const drawX = wx < 0 ? wx + VIEW_WIDTH : wx;
            ctx.fillStyle = (i % 2 === 0) ? 'rgba(255, 255, 255, 0.65)' : 'rgba(56, 189, 248, 0.45)';
            ctx.beginPath();
            ctx.arc(drawX, wy, 2, 0, Math.PI * 2);
            ctx.fill();
        }
    } else if (weatherTheme === "ice") {
        for (let i = 0; i < 28; i++) {
            const time = (now * 0.001 + i * 0.16) % 1;
            const wx = ((i * 24) - cameraX * 0.35 + Math.sin(time * 5 + i) * 18 + time * 30) % VIEW_WIDTH;
            const wy = (time * VIEW_HEIGHT);
            const drawX = wx < 0 ? wx + VIEW_WIDTH : wx;
            ctx.fillStyle = (i % 3 === 0) ? 'rgba(255, 255, 255, 0.9)' : 'rgba(224, 242, 254, 0.7)';
            ctx.beginPath();
            ctx.arc(drawX, wy, (i % 4 === 0) ? 2.4 : 1.5, 0, Math.PI * 2);
            ctx.fill();
        }
    } else if (weatherTheme === "spooky_forest") {
        for (let i = 0; i < 18; i++) {
            const time = (now * 0.0006 + i * 0.26) % 1;
            const wx = ((i * 34) - cameraX * 0.35 + Math.sin(time * 7 + i) * 22) % VIEW_WIDTH;
            const wy = 30 + Math.cos(time * 5 + i) * 35 + (i * 12);
            const drawX = wx < 0 ? wx + VIEW_WIDTH : wx;
            ctx.fillStyle = (i % 2 === 0) ? 'rgba(168, 85, 247, 0.55)' : 'rgba(45, 212, 191, 0.55)';
            ctx.beginPath();
            ctx.arc(drawX, wy, (i % 3 === 0) ? 2.8 : 1.8, 0, Math.PI * 2);
            ctx.fill();
        }
    } else if (weatherTheme === "airship") {
        for (let i = 0; i < 20; i++) {
            const time = (now * 0.0012 + i * 0.2) % 1;
            const wx = ((i * 30) - cameraX * 0.5 + time * 65) % VIEW_WIDTH;
            const wy = 40 + (i * 10) + Math.sin(time * 6) * 14;
            const drawX = wx < 0 ? wx + VIEW_WIDTH : wx;
            ctx.fillStyle = (i % 2 === 0) ? 'rgba(253, 186, 116, 0.5)' : 'rgba(251, 146, 60, 0.42)';
            ctx.beginPath();
            ctx.arc(drawX, wy, (i % 3 === 0) ? 2.6 : 1.7, 0, Math.PI * 2);
            ctx.fill();
        }
    } else if (weatherTheme === "lava_castle") {
        for (let i = 0; i < 30; i++) {
            const time = (now * 0.0016 + i * 0.17) % 1;
            const wx = ((i * 22) - cameraX * 0.4 + Math.sin(time * 7 + i) * 20) % VIEW_WIDTH;
            const wy = (1 - time) * VIEW_HEIGHT;
            const drawX = wx < 0 ? wx + VIEW_WIDTH : wx;
            ctx.fillStyle = (i % 3 === 0) ? 'rgba(254, 240, 138, 0.8)' : ((i % 2 === 0) ? 'rgba(249, 115, 22, 0.7)' : 'rgba(239, 68, 68, 0.6)');
            ctx.beginPath();
            ctx.arc(drawX, wy, (i % 4 === 0) ? 2.8 : 1.9, 0, Math.PI * 2);
            ctx.fill();
        }
    } else if (weatherTheme === "space") {
        for (let i = 0; i < 22; i++) {
            const twinkle = Math.sin(now * 0.006 + i * 1.3) * 0.5 + 0.5;
            const sx = (i * 34 + 6) % VIEW_WIDTH;
            const sy = (i * 18 + 10) % VIEW_HEIGHT;
            ctx.fillStyle = (i % 2 === 0) ? `rgba(192, 132, 252, ${twinkle * 0.85})` : `rgba(56, 189, 248, ${twinkle * 0.85})`;
            ctx.beginPath();
            ctx.arc(sx, sy, (i % 3 === 0) ? 2.4 : 1.5, 0, Math.PI * 2);
            ctx.fill();
        }
    }
    ctx.restore();

    // 4. CAPA DE NIEBLA DE PROFUNDIDAD PARALLAX (ATMOSPHERIC DEPTH HAZE)
    ctx.save();
    const fogGrad = ctx.createLinearGradient(0, VIEW_HEIGHT - 60, 0, VIEW_HEIGHT);
    fogGrad.addColorStop(0, 'rgba(0, 0, 0, 0)');
    let fogColor = 'rgba(15, 23, 42, 0.18)';
    if (weatherTheme === 'ice') fogColor = 'rgba(224, 242, 254, 0.14)';
    else if (weatherTheme === 'lava_castle') fogColor = 'rgba(69, 10, 10, 0.22)';
    else if (weatherTheme === 'desert') fogColor = 'rgba(120, 53, 15, 0.16)';
    else if (weatherTheme === 'neon_cave') fogColor = 'rgba(59, 7, 100, 0.2)';
    fogGrad.addColorStop(1, fogColor);
    ctx.fillStyle = fogGrad;
    ctx.fillRect(0, VIEW_HEIGHT - 60, VIEW_WIDTH, 60);
    ctx.restore();

    // 5. COLOR GRADING CINEMATOGRÁFICO Y CORRECCIÓN DE COLOR (LUT TINT)
    ctx.save();
    let lutTint = 'rgba(255, 255, 255, 0.0)';
    if (weatherTheme === 'desert') lutTint = 'rgba(245, 158, 11, 0.04)';
    else if (weatherTheme === 'neon_cave') lutTint = 'rgba(168, 85, 247, 0.05)';
    else if (weatherTheme === 'ice') lutTint = 'rgba(56, 189, 248, 0.04)';
    else if (weatherTheme === 'spooky_forest') lutTint = 'rgba(76, 29, 149, 0.06)';
    else if (weatherTheme === 'airship') lutTint = 'rgba(249, 115, 22, 0.05)';
    else if (weatherTheme === 'lava_castle') lutTint = 'rgba(220, 38, 38, 0.06)';
    else if (weatherTheme === 'space') lutTint = 'rgba(99, 102, 241, 0.05)';
    if (lutTint !== 'rgba(255, 255, 255, 0.0)') {
        ctx.fillStyle = lutTint;
        ctx.fillRect(0, 0, VIEW_WIDTH, VIEW_HEIGHT);
    }
    ctx.restore();

    // 6. VIÑETA CINEMATOGRÁFICA DE ALTA DEFINICIÓN (RTX LENS VIGNETTE)
    ctx.save();
    const vignette = ctx.createRadialGradient(
        VIEW_WIDTH / 2, VIEW_HEIGHT / 2, VIEW_WIDTH * 0.38,
        VIEW_WIDTH / 2, VIEW_HEIGHT / 2, VIEW_WIDTH * 0.74
    );
    vignette.addColorStop(0, 'rgba(0, 0, 0, 0)');
    vignette.addColorStop(0.7, 'rgba(2, 6, 23, 0.22)');
    vignette.addColorStop(1, 'rgba(2, 6, 23, 0.52)');
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
        // ==========================================
        // === MUNDO 8: FORTALEZA DE FUEGO, LAVA Y MAGMA (AAA VOLCANIC APOCALYPSE) ===
        // ==========================================
        // 1. Cielo ardiente con resplandor volcánico profundo y ceniza
        const lavaSky = ctx.createLinearGradient(0, 0, 0, 192);
        lavaSky.addColorStop(0, '#150202');
        lavaSky.addColorStop(0.45, '#450a0a');
        lavaSky.addColorStop(0.8, '#7f1d1d');
        lavaSky.addColorStop(1, '#dc2626');
        ctx.fillStyle = lavaSky;
        ctx.fillRect(0, 0, VIEW_WIDTH, 192);

        // 2. Volcanes colosales lejanos con ríos de magma y nubes de piroclastos
        for (let i = 0; i < 4; i++) {
            const vx = ((i * 180 + 30) - bgOffset * 0.3) % (VIEW_WIDTH * 2.2);
            ctx.fillStyle = '#1e0505';
            ctx.beginPath();
            ctx.moveTo(vx - 95, 192);
            ctx.lineTo(vx, 45 + (i % 2) * 18);
            ctx.lineTo(vx + 95, 192);
            ctx.fill();

            // Cráter ardiente con lava hirviente
            const craterY = 45 + (i % 2) * 18;
            ctx.fillStyle = '#ef4444';
            ctx.beginPath();
            ctx.ellipse(vx, craterY, 20, 6, 0, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillStyle = '#fef08a';
            ctx.beginPath();
            ctx.ellipse(vx, craterY, 12, 3.5, 0, 0, Math.PI * 2);
            ctx.fill();

            // Penacho de humo y ceniza volcánica
            const smokeTime = Date.now() * 0.002;
            for (let s = 0; s < 3; s++) {
                const sOffset = (smokeTime + s * 0.33) % 1;
                const smX = vx + Math.sin(smokeTime * 4 + s) * 8;
                const smY = craterY - sOffset * 35;
                ctx.fillStyle = 'rgba(69, 10, 10, 0.45)';
                ctx.beginPath();
                ctx.arc(smX, smY, 8 + sOffset * 10, 0, Math.PI * 2);
                ctx.fill();
            }

            // Cascada de lava bajando por la ladera del volcán
            ctx.strokeStyle = '#f97316';
            ctx.lineWidth = 3;
            ctx.beginPath();
            ctx.moveTo(vx, craterY + 3);
            ctx.quadraticCurveTo(vx + 16, 115, vx + 26, 192);
            ctx.stroke();
            ctx.strokeStyle = '#fef08a';
            ctx.lineWidth = 1.2;
            ctx.stroke();
        }

        // 3. Volcanes cercanos y riscos de basalto negro
        for (let i = 0; i < 3; i++) {
            const vx = ((i * 230 + 80) - bgOffset * 0.65) % (VIEW_WIDTH * 2.2);
            ctx.fillStyle = '#300808';
            ctx.beginPath();
            ctx.moveTo(vx - 75, 192);
            ctx.lineTo(vx, 70);
            ctx.lineTo(vx + 75, 192);
            ctx.fill();

            ctx.fillStyle = '#f97316';
            ctx.beginPath();
            ctx.ellipse(vx, 70, 18, 4.5, 0, 0, Math.PI * 2);
            ctx.fill();
        }

        // 4. Lago de lava ardiente en el horizonte
        const lavaGrad = ctx.createLinearGradient(0, 182, 0, 192);
        lavaGrad.addColorStop(0, '#fef08a');
        lavaGrad.addColorStop(0.35, '#f97316');
        lavaGrad.addColorStop(0.7, '#ea580c');
        lavaGrad.addColorStop(1, '#7f1d1d');
        ctx.fillStyle = lavaGrad;
        ctx.fillRect(0, 182, VIEW_WIDTH, 10);

        // 5. Chispas de fuego y brasas incandescentes flotando en el aire
        const now = Date.now();
        for (let i = 0; i < 28; i++) {
            const sx = ((i * 37 + Math.sin(now / 500 + i) * 15) - bgOffset * 1.5) % VIEW_WIDTH;
            const drawSx = (sx < 0) ? sx + VIEW_WIDTH : sx;
            const sy = (VIEW_HEIGHT - 55) - ((now / 16 + i * 26) % (VIEW_HEIGHT - 35));
            ctx.fillStyle = (i % 3 === 0) ? '#fef08a' : ((i % 2 === 0) ? '#f97316' : '#ef4444');
            const sparkSize = (i % 4 === 0) ? 3 : 2;
            ctx.fillRect(drawSx, sy, sparkSize, sparkSize);
        }

    } else if (theme === "desert") {
        // ==========================================
        // === MUNDO 2: PIRÁMIDES Y DUNAS DORADAS (EGIPTO RETRO-FUTURISTA 2026) ===
        // ==========================================
        ctx.save();

        // 1. Sol ardiente del desierto con halo y rayos solares
        const sunX = VIEW_WIDTH - 65;
        const sunY = 42;
        const sunPulse = Math.sin(Date.now() * 0.002) * 2;
        const sunGrad = ctx.createRadialGradient(sunX, sunY, 5, sunX, sunY, 38 + sunPulse);
        sunGrad.addColorStop(0, '#ffffff');
        sunGrad.addColorStop(0.3, '#fef08a');
        sunGrad.addColorStop(0.65, '#f59e0b');
        sunGrad.addColorStop(1, 'rgba(234, 88, 12, 0)');
        ctx.fillStyle = sunGrad;
        ctx.beginPath();
        ctx.arc(sunX, sunY, 38 + sunPulse, 0, Math.PI * 2);
        ctx.fill();

        // 2. Capa 1: Pirámides Colosales Lejanas con Piramidión Dorado Brillante
        for (let i = 0; i < 4; i++) {
            const px = ((i * 220 + 20) - bgOffset * 0.25) % (VIEW_WIDTH * 2.2);
            const pyrH = 80 + (i % 2) * 22;
            const pyrW = 105;

            // Cara iluminada por el sol (dorado ardiente)
            const lightGrad = ctx.createLinearGradient(px - pyrW, 192, px, 192 - pyrH);
            lightGrad.addColorStop(0, '#b45309');
            lightGrad.addColorStop(0.5, '#d97706');
            lightGrad.addColorStop(1, '#f59e0b');
            ctx.fillStyle = lightGrad;
            ctx.beginPath();
            ctx.moveTo(px - pyrW, 192);
            ctx.lineTo(px, 192 - pyrH);
            ctx.lineTo(px, 192);
            ctx.closePath();
            ctx.fill();

            // Cara en sombra (ocre profundo)
            const shadowGrad = ctx.createLinearGradient(px, 192 - pyrH, px + pyrW, 192);
            shadowGrad.addColorStop(0, '#78350f');
            shadowGrad.addColorStop(1, '#451a03');
            ctx.fillStyle = shadowGrad;
            ctx.beginPath();
            ctx.moveTo(px, 192 - pyrH);
            ctx.lineTo(px + pyrW, 192);
            ctx.lineTo(px, 192);
            ctx.closePath();
            ctx.fill();

            // Piramidión de oro puro en la cúspide con destello
            ctx.fillStyle = '#fef08a';
            ctx.beginPath();
            ctx.moveTo(px - 14, 192 - pyrH + 14);
            ctx.lineTo(px, 192 - pyrH);
            ctx.lineTo(px + 14, 192 - pyrH + 14);
            ctx.closePath();
            ctx.fill();

            // Destello brillante en la punta del piramidión
            const gleam = Math.sin(Date.now() * 0.004 + i) > 0.6;
            if (gleam) {
                ctx.fillStyle = '#ffffff';
                ctx.beginPath();
                ctx.arc(px, 192 - pyrH, 3, 0, Math.PI * 2);
                ctx.fill();
            }
        }

        // 3. Capa 2: Silueta de la Gran Esfinge y Obeliscos con Glifos Neón
        const sphinxX = ((310) - bgOffset * 0.45) % (VIEW_WIDTH * 2.2);
        if (sphinxX > -80 && sphinxX < VIEW_WIDTH + 80) {
            ctx.fillStyle = '#92400e';
            // Cuerpo de león
            ctx.beginPath();
            ctx.ellipse(sphinxX, 178, 38, 14, 0, 0, Math.PI * 2);
            ctx.fill();
            // Pata delantera extendida
            ctx.fillRect(sphinxX + 22, 182, 24, 8);
            // Cabeza y tocado Nemes faraónico
            ctx.beginPath();
            ctx.arc(sphinxX + 30, 160, 12, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillRect(sphinxX + 24, 162, 14, 12);
        }

        // Obeliscos grabados
        for (let i = 0; i < 3; i++) {
            const ox = ((i * 260 + 130) - bgOffset * 0.5) % (VIEW_WIDTH * 2.2);
            ctx.fillStyle = '#78350f';
            ctx.beginPath();
            ctx.moveTo(ox - 5, 192);
            ctx.lineTo(ox - 3, 135);
            ctx.lineTo(ox, 128); // Punta afilada
            ctx.lineTo(ox + 3, 135);
            ctx.lineTo(ox + 5, 192);
            ctx.closePath();
            ctx.fill();

            // Glifos misteriosos con tenue resplandor azul celeste
            ctx.fillStyle = '#38bdf8';
            ctx.fillRect(ox - 1, 142, 2, 4);
            ctx.fillRect(ox - 1, 154, 2, 5);
            ctx.fillRect(ox - 1, 168, 2, 6);
        }

        // 4. Capa 3: Caravana de camellos en la cresta de la duna
        const caravanX = ((200) - bgOffset * 0.35) % (VIEW_WIDTH * 2.2);
        ctx.fillStyle = '#78350f';
        for (let c = 0; c < 3; c++) {
            const cx = caravanX + c * 22;
            const cy = 166;
            // Cuerpo y joroba
            ctx.beginPath();
            ctx.ellipse(cx, cy, 6, 4, 0, 0, Math.PI * 2);
            ctx.arc(cx - 1, cy - 4, 3, 0, Math.PI * 2);
            ctx.fill();
            // Cuello y cabeza
            ctx.fillRect(cx + 4, cy - 7, 2.5, 6);
            ctx.fillRect(cx + 4, cy - 8, 4, 2.5);
            // Patas
            ctx.fillRect(cx - 4, cy + 3, 1.5, 6);
            ctx.fillRect(cx + 3, cy + 3, 1.5, 6);
        }

        // 5. Capa 4: Dunas de arena dorada ondulantes en primer plano
        for (let i = 0; i < 5; i++) {
            const dx = ((i * 155) - bgOffset * 0.8) % (VIEW_WIDTH * 2.1);
            const duneGrad = ctx.createLinearGradient(dx - 80, 160, dx + 80, 192);
            duneGrad.addColorStop(0, '#f59e0b');
            duneGrad.addColorStop(0.5, '#d97706');
            duneGrad.addColorStop(1, '#92400e');
            ctx.fillStyle = duneGrad;
            ctx.beginPath();
            ctx.moveTo(dx - 90, 192);
            ctx.quadraticCurveTo(dx, 165 + (i % 2) * 8, dx + 90, 192);
            ctx.closePath();
            ctx.fill();
        }

        // 6. Oasis en el desierto con palmeras y agua turquesa
        const oasisX = ((140) - bgOffset * 0.75) % (VIEW_WIDTH * 2.2);
        if (oasisX > -60 && oasisX < VIEW_WIDTH + 60) {
            // Estanque de agua turquesa
            ctx.fillStyle = '#06b6d4';
            ctx.beginPath();
            ctx.ellipse(oasisX, 188, 28, 6, 0, 0, Math.PI * 2);
            ctx.fill();
            ctx.strokeStyle = '#22d3ee';
            ctx.lineWidth = 1;
            ctx.stroke();

            // Palmera del oasis
            ctx.strokeStyle = '#78350f';
            ctx.lineWidth = 3;
            ctx.beginPath();
            ctx.moveTo(oasisX - 10, 188);
            ctx.quadraticCurveTo(oasisX - 18, 160, oasisX - 8, 138);
            ctx.stroke();

            // Hojas verdes de palmera
            ctx.fillStyle = '#16a34a';
            for (let a = -1.2; a <= 1.2; a += 0.5) {
                const lx = oasisX - 8 + Math.cos(a) * 16;
                const ly = 138 + Math.sin(a) * 12;
                ctx.beginPath();
                ctx.moveTo(oasisX - 8, 138);
                ctx.quadraticCurveTo(oasisX - 8, 130, lx, ly);
                ctx.stroke();
            }
        }

        ctx.restore();

    } else if (theme === "neon_cave") {
        // ==========================================
        // === MUNDO 3: CAVERNA DE CRISTALES NEÓN Y BIOLUMINISCENCIA (2026 AAA) ===
        // ==========================================
        ctx.save();

        // 1. Techo rocoso de caverna con estalactitas afiladas y gotas de agua
        for (let i = 0; i < 15; i++) {
            const sx = ((i * 44) - bgOffset * 0.4) % (VIEW_WIDTH * 2);
            const sLen = 28 + (i % 4) * 12;

            // Degradado de roca sombría a punta de cristal fluorescente
            const stGrad = ctx.createLinearGradient(sx, 0, sx, sLen);
            stGrad.addColorStop(0, '#0f172a');
            stGrad.addColorStop(0.7, '#1e1b4b');
            stGrad.addColorStop(1, (i % 2 === 0) ? '#00f2fe' : '#c084fc');
            ctx.fillStyle = stGrad;
            ctx.beginPath();
            ctx.moveTo(sx, 0);
            ctx.lineTo(sx + 12, sLen);
            ctx.lineTo(sx + 24, 0);
            ctx.closePath();
            ctx.fill();

            // Gota de agua brillante goteando de la punta de la estalactita
            if (i % 3 === 0) {
                const dropTime = (Date.now() * 0.002 + i) % 1;
                ctx.fillStyle = '#38bdf8';
                ctx.beginPath();
                ctx.arc(sx + 12, sLen + dropTime * 45, 1.8, 0, Math.PI * 2);
                ctx.fill();
            }
        }

        // 2. Cascada subterránea violeta etérea en la pared del fondo
        const fallX = ((240) - bgOffset * 0.3) % (VIEW_WIDTH * 2.2);
        if (fallX > -40 && fallX < VIEW_WIDTH + 40) {
            const fallGrad = ctx.createLinearGradient(fallX, 30, fallX + 26, 192);
            fallGrad.addColorStop(0, 'rgba(192, 132, 252, 0.45)');
            fallGrad.addColorStop(0.5, 'rgba(147, 51, 234, 0.6)');
            fallGrad.addColorStop(1, 'rgba(0, 242, 254, 0.5)');
            ctx.fillStyle = fallGrad;
            ctx.fillRect(fallX, 30, 24, 162);

            // Resplandor y bruma mágica en la base
            ctx.fillStyle = 'rgba(192, 132, 252, 0.35)';
            ctx.beginPath();
            ctx.ellipse(fallX + 12, 185, 35, 12, 0, 0, Math.PI * 2);
            ctx.fill();
        }

        // 3. Formaciones colosales de cristales de cuarzo y amatista neón (Geodas AAA)
        for (let i = 0; i < 9; i++) {
            const cx = ((i * 85 + 20) - bgOffset * 0.7) % (VIEW_WIDTH * 2.2);
            const cy = 192;
            const cColor = (i % 3 === 0) ? '#00f2fe' : ((i % 2 === 0) ? '#c084fc' : '#f43f5e');
            const cLight = (i % 3 === 0) ? '#e0f2fe' : ((i % 2 === 0) ? '#f3e8ff' : '#ffe4e6');

            // Cristal central gigante
            ctx.fillStyle = cColor;
            ctx.beginPath();
            ctx.moveTo(cx - 8, cy);
            ctx.lineTo(cx - 6, cy - 36 - (i % 3) * 12);
            ctx.lineTo(cx, cy - 48 - (i % 3) * 14); // Cúspide
            ctx.lineTo(cx + 6, cy - 36 - (i % 3) * 12);
            ctx.lineTo(cx + 8, cy);
            ctx.closePath();
            ctx.fill();

            // Faceta biselada brillante
            ctx.fillStyle = cLight;
            ctx.beginPath();
            ctx.moveTo(cx, cy);
            ctx.lineTo(cx, cy - 48 - (i % 3) * 14);
            ctx.lineTo(cx + 6, cy - 36 - (i % 3) * 12);
            ctx.lineTo(cx + 8, cy);
            ctx.closePath();
            ctx.fill();

            // Cristal lateral oblicuo
            ctx.fillStyle = cColor;
            ctx.beginPath();
            ctx.moveTo(cx + 4, cy);
            ctx.lineTo(cx + 16, cy - 26);
            ctx.lineTo(cx + 14, cy);
            ctx.closePath();
            ctx.fill();

            // Halo lumínico neón del cristal
            const glowPulse = Math.sin(Date.now() * 0.004 + i) * 3 + 12;
            const glowGrad = ctx.createRadialGradient(cx, cy - 25, 2, cx, cy - 25, glowPulse);
            glowGrad.addColorStop(0, (i % 2 === 0) ? 'rgba(0, 242, 254, 0.45)' : 'rgba(192, 132, 252, 0.45)');
            glowGrad.addColorStop(1, 'rgba(0,0,0,0)');
            ctx.fillStyle = glowGrad;
            ctx.beginPath();
            ctx.arc(cx, cy - 25, glowPulse, 0, Math.PI * 2);
            ctx.fill();
        }

        // 4. Setas cavernícolas bioluminiscentes en el suelo
        for (let i = 0; i < 7; i++) {
            const mx = ((i * 110 + 60) - bgOffset * 0.85) % (VIEW_WIDTH * 2.2);
            // Tallo
            ctx.fillStyle = '#e2e8f0';
            ctx.fillRect(mx + 6, 184, 3, 8);
            // Sombrero fluorescente
            ctx.fillStyle = (i % 2 === 0) ? '#38bdf8' : '#ec4899';
            ctx.beginPath();
            ctx.arc(mx + 7.5, 184, 6.5, Math.PI, 0);
            ctx.fill();
        }

        ctx.restore();

    } else if (theme === "ice") {
        // ==========================================
        // === MUNDO 5: CUMBRES GLACIALES, AURORA BOREAL Y PALACIO HELADO (2026 AAA) ===
        // ==========================================
        ctx.save();

        // 1. Espectacular Aurora Boreal (Luces del Norte dinámicas y ondulantes)
        const auroraTime = Date.now() * 0.0012;
        for (let a = 0; a < 3; a++) {
            const aGrad = ctx.createLinearGradient(0, 10, 0, 110);
            if (a === 0) {
                aGrad.addColorStop(0, 'rgba(74, 222, 128, 0)');
                aGrad.addColorStop(0.5, 'rgba(74, 222, 128, 0.38)');
                aGrad.addColorStop(1, 'rgba(56, 189, 248, 0)');
            } else if (a === 1) {
                aGrad.addColorStop(0, 'rgba(56, 189, 248, 0)');
                aGrad.addColorStop(0.5, 'rgba(56, 189, 248, 0.32)');
                aGrad.addColorStop(1, 'rgba(168, 85, 247, 0)');
            } else {
                aGrad.addColorStop(0, 'rgba(236, 72, 153, 0)');
                aGrad.addColorStop(0.5, 'rgba(236, 72, 153, 0.25)');
                aGrad.addColorStop(1, 'rgba(74, 222, 128, 0)');
            }
            ctx.fillStyle = aGrad;
            ctx.beginPath();
            ctx.moveTo(0, 80);
            for (let x = 0; x <= VIEW_WIDTH; x += 18) {
                const ay = 45 + Math.sin(auroraTime + x * 0.015 + a * 1.5) * 22 + Math.cos(auroraTime * 0.7 + x * 0.02) * 12;
                ctx.lineTo(x, ay);
            }
            ctx.lineTo(VIEW_WIDTH, 120);
            ctx.lineTo(0, 120);
            ctx.closePath();
            ctx.fill();
        }

        // 2. Capa 1: Cordillera de montañas de hielo escarpadas y glaciares
        for (let i = 0; i < 4; i++) {
            const mx = ((i * 190 + 30) - bgOffset * 0.25) % (VIEW_WIDTH * 2.2);
            const mH = 95 + (i % 2) * 25;
            const mW = 90;

            // Cara sombría azul glaciar
            const iceShadow = ctx.createLinearGradient(mx - mW, 192, mx, 192 - mH);
            iceShadow.addColorStop(0, '#1e3a8a');
            iceShadow.addColorStop(0.6, '#2563eb');
            iceShadow.addColorStop(1, '#93c5fd');
            ctx.fillStyle = iceShadow;
            ctx.beginPath();
            ctx.moveTo(mx - mW, 192);
            ctx.lineTo(mx, 192 - mH);
            ctx.lineTo(mx, 192);
            ctx.closePath();
            ctx.fill();

            // Cara iluminada por el resplandor polar
            const iceLight = ctx.createLinearGradient(mx, 192 - mH, mx + mW, 192);
            iceLight.addColorStop(0, '#ffffff');
            iceLight.addColorStop(0.5, '#dbeafe');
            iceLight.addColorStop(1, '#60a5fa');
            ctx.fillStyle = iceLight;
            ctx.beginPath();
            ctx.moveTo(mx, 192 - mH);
            ctx.lineTo(mx + mW, 192);
            ctx.lineTo(mx, 192);
            ctx.closePath();
            ctx.fill();

            // Nieve perpetua en la cima
            ctx.fillStyle = '#ffffff';
            ctx.beginPath();
            ctx.moveTo(mx - 24, 192 - mH + 34);
            ctx.lineTo(mx, 192 - mH);
            ctx.lineTo(mx + 24, 192 - mH + 34);
            ctx.lineTo(mx, 192 - mH + 26);
            ctx.closePath();
            ctx.fill();
        }

        // 3. Capa 2: Palacio de Hielo de fantasía en la distancia
        const castleIceX = ((280) - bgOffset * 0.45) % (VIEW_WIDTH * 2.2);
        if (castleIceX > -50 && castleIceX < VIEW_WIDTH + 50) {
            ctx.fillStyle = 'rgba(224, 242, 254, 0.85)';
            // Torre central
            ctx.fillRect(castleIceX - 8, 120, 16, 72);
            ctx.beginPath();
            ctx.moveTo(castleIceX - 12, 120);
            ctx.lineTo(castleIceX, 90);
            ctx.lineTo(castleIceX + 12, 120);
            ctx.fill();
            // Torres laterales
            ctx.fillRect(castleIceX - 22, 135, 10, 57);
            ctx.beginPath();
            ctx.moveTo(castleIceX - 25, 135);
            ctx.lineTo(castleIceX - 17, 110);
            ctx.lineTo(castleIceX - 9, 135);
            ctx.fill();
            ctx.fillRect(castleIceX + 12, 135, 10, 57);
            ctx.beginPath();
            ctx.moveTo(castleIceX + 9, 135);
            ctx.lineTo(castleIceX + 17, 110);
            ctx.lineTo(castleIceX + 25, 135);
            ctx.fill();
        }

        // 4. Capa 3: Pinos cubiertos de nieve densa
        for (let i = 0; i < 6; i++) {
            const px = ((i * 125 + 40) - bgOffset * 0.75) % (VIEW_WIDTH * 2.2);
            // Tronco
            ctx.fillStyle = '#1e293b';
            ctx.fillRect(px + 8, 140, 6, 52);

            // Capas de ramas nevadas
            for (let c = 0; c < 3; c++) {
                const bY = 150 - c * 18;
                const bW = 22 - c * 5;
                ctx.fillStyle = '#0284c7';
                ctx.beginPath();
                ctx.moveTo(px + 11 - bW, bY);
                ctx.lineTo(px + 11, bY - 18);
                ctx.lineTo(px + 11 + bW, bY);
                ctx.fill();
                // Nieve blanca acumulada
                ctx.fillStyle = '#ffffff';
                ctx.beginPath();
                ctx.moveTo(px + 11 - bW, bY);
                ctx.lineTo(px + 11, bY - 18);
                ctx.lineTo(px + 11 + bW, bY);
                ctx.lineTo(px + 11, bY - 10);
                ctx.fill();
            }
        }

        // 5. Carámbanos de hielo cristalinos colgando del cielo
        ctx.fillStyle = 'rgba(255, 255, 255, 0.75)';
        for (let ic = 0; ic < 16; ic++) {
            const icX = (ic * 30 - bgOffset * 0.2) % VIEW_WIDTH;
            const icLen = 10 + (ic % 4) * 8;
            ctx.beginPath();
            ctx.moveTo(icX, 0);
            ctx.lineTo(icX + 3, icLen);
            ctx.lineTo(icX + 6, 0);
            ctx.fill();
        }

        ctx.restore();

    } else if (theme === "spooky_forest") {
        // ==========================================
        // === MUNDO 6: BOSQUE SOMBRÍO, LUNA ROJA Y ESPÍRITUS (2026 AAA) ===
        // ==========================================
        ctx.save();

        // 1. Colosal Luna Llena Encantada (Blood/Harvest Moon misteriosa con cráteres)
        const moonX = 75;
        const moonY = 48;
        const moonRadius = 26;

        // Halo místico de la luna
        const moonHalo = ctx.createRadialGradient(moonX, moonY, moonRadius * 0.6, moonX, moonY, moonRadius * 2.2);
        moonHalo.addColorStop(0, 'rgba(254, 215, 170, 0.45)');
        moonHalo.addColorStop(0.5, 'rgba(249, 115, 22, 0.2)');
        moonHalo.addColorStop(1, 'rgba(0, 0, 0, 0)');
        ctx.fillStyle = moonHalo;
        ctx.beginPath();
        ctx.arc(moonX, moonY, moonRadius * 2.2, 0, Math.PI * 2);
        ctx.fill();

        // Disco de la luna
        const moonGrad = ctx.createRadialGradient(moonX - 6, moonY - 6, 4, moonX, moonY, moonRadius);
        moonGrad.addColorStop(0, '#ffffff');
        moonGrad.addColorStop(0.4, '#fed7aa');
        moonGrad.addColorStop(0.85, '#fdba74');
        moonGrad.addColorStop(1, '#ea580c');
        ctx.fillStyle = moonGrad;
        ctx.beginPath();
        ctx.arc(moonX, moonY, moonRadius, 0, Math.PI * 2);
        ctx.fill();

        // Cráteres lunares oscuros
        ctx.fillStyle = 'rgba(124, 45, 18, 0.28)';
        ctx.beginPath();
        ctx.arc(moonX - 8, moonY - 5, 5, 0, Math.PI * 2);
        ctx.arc(moonX + 6, moonY - 10, 4, 0, Math.PI * 2);
        ctx.arc(moonX + 8, moonY + 7, 6, 0, Math.PI * 2);
        ctx.arc(moonX - 4, moonY + 12, 3.5, 0, Math.PI * 2);
        ctx.fill();

        // Volutas de niebla gótica pasando por delante de la luna
        ctx.fillStyle = 'rgba(15, 23, 42, 0.6)';
        ctx.beginPath();
        ctx.ellipse(moonX + 10, moonY + 4, 38, 7, -0.15, 0, Math.PI * 2);
        ctx.fill();

        // 2. Castillo gótico siniestro de vampiros en un risco distante
        const vampCastleX = ((260) - bgOffset * 0.3) % (VIEW_WIDTH * 2.2);
        if (vampCastleX > -60 && vampCastleX < VIEW_WIDTH + 60) {
            ctx.fillStyle = '#020617';
            // Risco de roca
            ctx.beginPath();
            ctx.moveTo(vampCastleX - 40, 192);
            ctx.lineTo(vampCastleX - 10, 115);
            ctx.lineTo(vampCastleX + 35, 115);
            ctx.lineTo(vampCastleX + 60, 192);
            ctx.fill();

            // Torres del castillo
            ctx.fillRect(vampCastleX - 5, 95, 12, 22);
            ctx.beginPath();
            ctx.moveTo(vampCastleX - 8, 95);
            ctx.lineTo(vampCastleX + 1, 75);
            ctx.lineTo(vampCastleX + 10, 95);
            ctx.fill();
            ctx.fillRect(vampCastleX + 12, 102, 10, 15);
            ctx.beginPath();
            ctx.moveTo(vampCastleX + 10, 102);
            ctx.lineTo(vampCastleX + 17, 85);
            ctx.lineTo(vampCastleX + 24, 102);
            ctx.fill();

            // Ventana iluminada en sangre
            ctx.fillStyle = '#ef4444';
            ctx.fillRect(vampCastleX - 1, 100, 3, 5);
        }

        // 3. Árboles retorcidos y nudosos con ramas de espino
        for (let i = 0; i < 5; i++) {
            const tx = ((i * 155 + 30) - bgOffset * 0.7) % (VIEW_WIDTH * 2.2);
            // Tronco retorcido de roble espectral
            ctx.fillStyle = '#0f172a';
            ctx.beginPath();
            ctx.moveTo(tx + 6, 192);
            ctx.quadraticCurveTo(tx + 18, 145, tx + 12, 110);
            ctx.lineTo(tx + 22, 110);
            ctx.quadraticCurveTo(tx + 28, 145, tx + 34, 192);
            ctx.closePath();
            ctx.fill();

            // Ramas afiladas sin hojas
            ctx.strokeStyle = '#0f172a';
            ctx.lineWidth = 3.5;
            ctx.beginPath();
            ctx.moveTo(tx + 14, 125);
            ctx.quadraticCurveTo(tx - 10, 105, tx - 18, 85);
            ctx.moveTo(tx + 20, 120);
            ctx.quadraticCurveTo(tx + 40, 100, tx + 48, 80);
            ctx.moveTo(tx + 17, 110);
            ctx.lineTo(tx + 17, 72);
            ctx.stroke();

            // OJOS BRILLANTES en los huecos de los árboles que parpadean
            const eyeBlink = Math.sin(Date.now() * 0.003 + i * 2) > 0.1;
            if (eyeBlink) {
                ctx.fillStyle = (i % 2 === 0) ? '#fde047' : '#ef4444';
                ctx.beginPath();
                ctx.ellipse(tx + 16, 142, 2.2, 1.4, 0.2, 0, Math.PI * 2);
                ctx.ellipse(tx + 22, 143, 2.2, 1.4, -0.2, 0, Math.PI * 2);
                ctx.fill();
            }
        }

        // 4. Setas fantasma fluorescentes y lápidas con musgo
        for (let i = 0; i < 6; i++) {
            const sx = ((i * 120 + 75) - bgOffset * 0.9) % (VIEW_WIDTH * 2.2);
            // Sombrero fluorescente cian/morado
            ctx.fillStyle = (i % 2 === 0) ? '#2dd4bf' : '#a855f7';
            ctx.beginPath();
            ctx.arc(sx, 185, 7, Math.PI, 0);
            ctx.fill();
            // Tallo
            ctx.fillStyle = '#1e1b4b';
            ctx.fillRect(sx - 1.5, 185, 3, 7);

            // Lápidas góticas
            if (i % 2 === 0) {
                ctx.fillStyle = '#334155';
                ctx.beginPath();
                ctx.arc(sx + 24, 180, 5, Math.PI, 0);
                ctx.rect(sx + 19, 180, 10, 12);
                ctx.fill();
                ctx.strokeStyle = '#1e293b';
                ctx.lineWidth = 1;
                ctx.stroke();
            }
        }

        // 5. Fuegos Fatuos (Will-o'-the-wisps) flotantes con estela
        for (let w = 0; w < 4; w++) {
            const wTime = Date.now() * 0.002 + w * 1.6;
            const wX = ((w * 130 + 50) - bgOffset * 0.5 + Math.sin(wTime * 2) * 16) % VIEW_WIDTH;
            const wY = 120 + Math.cos(wTime) * 18;
            const wGrad = ctx.createRadialGradient(wX, wY, 1, wX, wY, 8);
            wGrad.addColorStop(0, '#ffffff');
            wGrad.addColorStop(0.4, '#2dd4bf');
            wGrad.addColorStop(1, 'rgba(45, 212, 191, 0)');
            ctx.fillStyle = wGrad;
            ctx.beginPath();
            ctx.arc(wX, wY, 8, 0, Math.PI * 2);
            ctx.fill();
        }

        ctx.restore();

    } else if (theme === "ocean") {
        // ==========================================
        // === MUNDO 4: COSTA TROPICAL DELFINO PLAZA (SUPER MARIO SUNSHINE PARALLAX 2026) ===
        // ==========================================
        ctx.save();

        // 1. Sol tropical radiante con rayos dorados animados
        const sunX = VIEW_WIDTH - 65;
        const sunY = 40;
        const sunPulse = Math.sin(Date.now() * 0.003) * 2;
        const sunGrad = ctx.createRadialGradient(sunX, sunY, 4, sunX, sunY, 32 + sunPulse);
        sunGrad.addColorStop(0, '#ffffff');
        sunGrad.addColorStop(0.3, '#fde047');
        sunGrad.addColorStop(0.7, '#f59e0b');
        sunGrad.addColorStop(1, 'rgba(245, 158, 11, 0)');
        ctx.fillStyle = sunGrad;
        ctx.beginPath();
        ctx.arc(sunX, sunY, 32 + sunPulse, 0, Math.PI * 2);
        ctx.fill();

        // 2. Colinas lejanas de la Isla Delfino en el horizonte marino
        ctx.fillStyle = '#0284c7';
        for (let i = 0; i < 4; i++) {
            const hx = ((i * 260) - bgOffset * 0.2) % (VIEW_WIDTH * 2.2);
            ctx.beginPath();
            ctx.moveTo(hx - 60, 192);
            ctx.quadraticCurveTo(hx + 40, 105, hx + 140, 192);
            ctx.fill();
        }

        // 3. Océano turquesa profundo con olas y oleaje multicapa
        const oceanTime = Date.now() * 0.004;
        const seaGrad = ctx.createLinearGradient(0, 135, 0, 192);
        seaGrad.addColorStop(0, '#0284c7');
        seaGrad.addColorStop(0.5, '#0ea5e9');
        seaGrad.addColorStop(1, '#06b6d4');
        ctx.fillStyle = seaGrad;
        ctx.fillRect(0, 145, VIEW_WIDTH, 47);

        // Olas ondulantes animadas
        ctx.fillStyle = '#38bdf8';
        ctx.beginPath();
        ctx.moveTo(0, 192);
        for (let x = 0; x <= VIEW_WIDTH; x += 15) {
            const waveY = 145 + Math.sin(oceanTime * 2 + x * 0.04) * 3;
            ctx.lineTo(x, waveY);
        }
        ctx.lineTo(VIEW_WIDTH, 192);
        ctx.closePath();
        ctx.fill();

        // Espuma marina brillante en las crestas
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.65)';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        for (let x = 0; x <= VIEW_WIDTH; x += 20) {
            const waveY = 144 + Math.sin(oceanTime * 2 + x * 0.04) * 3;
            if (x === 0) ctx.moveTo(x, waveY);
            else ctx.lineTo(x, waveY);
        }
        ctx.stroke();

        // 4. Barcos veleros y delfín saltando en el mar
        const boatX = ((200) - bgOffset * 0.35) % (VIEW_WIDTH * 1.8);
        if (boatX > -40 && boatX < VIEW_WIDTH + 40) {
            // Casco del barco
            ctx.fillStyle = '#78350f';
            ctx.beginPath();
            ctx.moveTo(boatX, 146);
            ctx.lineTo(boatX + 22, 146);
            ctx.lineTo(boatX + 18, 153);
            ctx.lineTo(boatX + 3, 153);
            ctx.closePath();
            ctx.fill();
            // Vela blanca triangular
            ctx.fillStyle = '#ffffff';
            ctx.beginPath();
            ctx.moveTo(boatX + 11, 146);
            ctx.lineTo(boatX + 11, 132);
            ctx.lineTo(boatX + 20, 142);
            ctx.closePath();
            ctx.fill();
        }

        // Delfín saltando sobre las olas (homenaje a Super Mario Sunshine)
        const dolphinCycle = (oceanTime * 0.7) % (Math.PI * 2);
        const dolphinX = ((320) - bgOffset * 0.45) % (VIEW_WIDTH * 1.9);
        if (dolphinCycle < Math.PI && dolphinX > -30 && dolphinX < VIEW_WIDTH + 30) {
            const dY = 148 - Math.sin(dolphinCycle) * 12;
            ctx.fillStyle = '#0284c7';
            ctx.beginPath();
            ctx.ellipse(dolphinX, dY, 8, 3.5, (dolphinCycle - Math.PI / 2) * 0.5, 0, Math.PI * 2);
            ctx.fill();
        }

        // 5. Islas de arena dorada con Palmeras tropicales detalladas
        for (let i = 0; i < 4; i++) {
            const ix = ((i * 220 + 50) - bgOffset * 0.75) % (VIEW_WIDTH * 2.2);

            // Montículo de playa / arena dorada
            const sandGrad = ctx.createRadialGradient(ix + 20, 192, 5, ix + 20, 192, 45);
            sandGrad.addColorStop(0, '#fef08a');
            sandGrad.addColorStop(0.5, '#facc15');
            sandGrad.addColorStop(1, '#ca8a04');
            ctx.fillStyle = sandGrad;
            ctx.beginPath();
            ctx.ellipse(ix + 20, 186, 44, 12, 0, 0, Math.PI * 2);
            ctx.fill();

            // Palmera tropical: Tronco curvado con segmentos
            ctx.strokeStyle = '#854d0e';
            ctx.lineWidth = 3.5;
            ctx.beginPath();
            ctx.moveTo(ix + 20, 184);
            ctx.quadraticCurveTo(ix + 14, 155, ix + 22, 130);
            ctx.stroke();

            // Segmentos/anillos del tronco
            ctx.strokeStyle = '#a16207';
            ctx.lineWidth = 1.2;
            for (let seg = 0; seg < 4; seg++) {
                ctx.beginPath();
                ctx.arc(ix + 18 + seg, 172 - seg * 11, 3, 0, Math.PI);
                ctx.stroke();
            }

            // Cocos bajo las hojas
            ctx.fillStyle = '#713f12';
            ctx.beginPath();
            ctx.arc(ix + 20, 131, 2.8, 0, Math.PI * 2);
            ctx.arc(ix + 24, 132, 2.5, 0, Math.PI * 2);
            ctx.fill();

            // Hojas de palmera esmeralda extendidas en abanico
            const palmLeaves = [
                { angle: -0.85, len: 22 },
                { angle: -0.35, len: 25 },
                { angle: 0.25,  len: 26 },
                { angle: 0.75,  len: 22 },
                { angle: 1.15,  len: 18 }
            ];

            palmLeaves.forEach(leaf => {
                const lx = ix + 22;
                const ly = 130;
                const tipX = lx + Math.cos(leaf.angle) * leaf.len;
                const tipY = ly + Math.sin(leaf.angle) * leaf.len;

                // Hoja con gradiente verde tropical
                const leafGrad = ctx.createLinearGradient(lx, ly, tipX, tipY);
                leafGrad.addColorStop(0, '#4ade80');
                leafGrad.addColorStop(0.6, '#16a34a');
                leafGrad.addColorStop(1, '#14532d');
                ctx.fillStyle = leafGrad;

                ctx.beginPath();
                ctx.moveTo(lx, ly);
                ctx.quadraticCurveTo((lx + tipX) / 2, ly - 6, tipX, tipY);
                ctx.quadraticCurveTo((lx + tipX) / 2, ly + 4, lx, ly);
                ctx.fill();
            });
        }

        // 6. Gaviotas blancas volando en el cielo
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 1.4;
        for (let g = 0; g < 3; g++) {
            const gx = ((g * 140 + 80) - bgOffset * 1.5) % (VIEW_WIDTH * 1.8);
            const gy = 45 + (g * 16) + Math.sin(Date.now() * 0.005 + g) * 4;
            ctx.beginPath();
            ctx.moveTo(gx - 6, gy + 2);
            ctx.quadraticCurveTo(gx - 3, gy - 3, gx, gy);
            ctx.quadraticCurveTo(gx + 3, gy - 3, gx + 6, gy + 2);
            ctx.stroke();
        }

        ctx.restore();

    } else if (theme === "airship") {
        // ==========================================
        // === MUNDO 7: FLOTA CELESTIAL STEAMPUNK EN LAS NUBES (2026 AAA) ===
        // ==========================================
        ctx.save();

        // 1. Sol poniente cálido al atardecer
        const sunX = VIEW_WIDTH - 70;
        const sunY = 55;
        const sunGrad = ctx.createRadialGradient(sunX, sunY, 5, sunX, sunY, 45);
        sunGrad.addColorStop(0, '#fef08a');
        sunGrad.addColorStop(0.4, '#f97316');
        sunGrad.addColorStop(0.8, '#c2410c');
        sunGrad.addColorStop(1, 'rgba(194, 65, 12, 0)');
        ctx.fillStyle = sunGrad;
        ctx.beginPath();
        ctx.arc(sunX, sunY, 45, 0, Math.PI * 2);
        ctx.fill();

        // 2. Islas flotantes míticas con ruinas y cascadas hacia el vacío
        for (let i = 0; i < 3; i++) {
            const isX = ((i * 240 + 60) - bgOffset * 0.3) % (VIEW_WIDTH * 2.2);
            const isY = 90 + (i % 2) * 25;

            // Bloque de roca flotante
            ctx.fillStyle = '#451a03';
            ctx.beginPath();
            ctx.moveTo(isX - 35, isY);
            ctx.lineTo(isX + 35, isY);
            ctx.lineTo(isX + 15, isY + 28);
            ctx.lineTo(isX, isY + 38);
            ctx.lineTo(isX - 20, isY + 26);
            ctx.closePath();
            ctx.fill();

            // Césped dorado superior
            ctx.fillStyle = '#b45309';
            ctx.fillRect(isX - 35, isY, 70, 5);

            // Cascada de agua cayendo hacia el vacío
            ctx.fillStyle = 'rgba(56, 189, 248, 0.7)';
            ctx.fillRect(isX - 8, isY + 4, 6, 42);
        }

        // 3. Gran Armada de Barcos Voladores Steampunk (Airships con hélices)
        for (let i = 0; i < 4; i++) {
            const ax = ((i * 180 + 20) - bgOffset * 0.55) % (VIEW_WIDTH * 2.2);
            const ay = 60 + (i % 3) * 26;

            // Casco de barco de madera con quilla de bronce
            const hullGrad = ctx.createLinearGradient(ax - 28, ay, ax + 28, ay);
            hullGrad.addColorStop(0, '#451a03');
            hullGrad.addColorStop(0.5, '#78350f');
            hullGrad.addColorStop(1, '#92400e');
            ctx.fillStyle = hullGrad;
            ctx.beginPath();
            ctx.moveTo(ax - 28, ay);
            ctx.lineTo(ax + 32, ay);
            ctx.lineTo(ax + 24, ay + 14);
            ctx.lineTo(ax - 18, ay + 14);
            ctx.closePath();
            ctx.fill();

            // Ojo de buey iluminado
            ctx.fillStyle = '#fef08a';
            ctx.beginPath();
            ctx.arc(ax - 6, ay + 6, 2.5, 0, Math.PI * 2);
            ctx.arc(ax + 8, ay + 6, 2.5, 0, Math.PI * 2);
            ctx.fill();

            // Mástil y velas infladas al viento
            ctx.fillStyle = '#451a03';
            ctx.fillRect(ax - 2, ay - 24, 3, 24);
            ctx.fillStyle = '#ffedd5';
            ctx.beginPath();
            ctx.moveTo(ax - 2, ay - 22);
            ctx.quadraticCurveTo(ax + 12, ay - 14, ax + 18, ay - 4);
            ctx.lineTo(ax - 2, ay - 4);
            ctx.closePath();
            ctx.fill();

            // Hélice de bronce trasera girando animada
            const propAngle = Date.now() * 0.02 + i;
            ctx.save();
            ctx.translate(ax - 30, ay + 6);
            ctx.rotate(propAngle);
            ctx.fillStyle = '#f59e0b';
            ctx.fillRect(-1.5, -8, 3, 16);
            ctx.restore();

            // Humo de caldera de vapor
            const smokeTime = (Date.now() * 0.002 + i * 0.5) % 1;
            ctx.fillStyle = 'rgba(255, 237, 213, 0.4)';
            ctx.beginPath();
            ctx.arc(ax - 26 - smokeTime * 20, ay - 2 - smokeTime * 8, 3 + smokeTime * 5, 0, Math.PI * 2);
            ctx.fill();
        }

        // 4. Dirigible / Zepelín gigante con luces de posición
        const zepX = ((160) - bgOffset * 0.35) % (VIEW_WIDTH * 2.2);
        if (zepX > -60 && zepX < VIEW_WIDTH + 60) {
            ctx.fillStyle = '#ea580c';
            ctx.beginPath();
            ctx.ellipse(zepX, 42, 38, 14, 0, 0, Math.PI * 2);
            ctx.fill();
            ctx.strokeStyle = '#fed7aa';
            ctx.lineWidth = 1.5;
            ctx.stroke();

            // Góndola inferior
            ctx.fillStyle = '#7c2d12';
            ctx.fillRect(zepX - 12, 56, 24, 6);
        }

        // 5. Mar interminable de nubes doradas ondulantes en la base
        for (let i = 0; i < 7; i++) {
            const cx = ((i * 120) - bgOffset * 0.8) % (VIEW_WIDTH * 2.1);
            const cloudGrad = ctx.createRadialGradient(cx, 185, 10, cx, 185, 45);
            cloudGrad.addColorStop(0, '#fef08a');
            cloudGrad.addColorStop(0.4, '#fdba74');
            cloudGrad.addColorStop(1, '#c2410c');
            ctx.fillStyle = cloudGrad;
            ctx.beginPath();
            ctx.arc(cx, 185, 42, 0, Math.PI * 2);
            ctx.arc(cx - 22, 192, 32, 0, Math.PI * 2);
            ctx.arc(cx + 22, 192, 32, 0, Math.PI * 2);
            ctx.fill();
        }

        ctx.restore();

    } else if (theme === "space") {
        // ==========================================
        // === MUNDO 9: REINO CÓSMICO, NEBULOSAS, ANILLOS Y QUASAR (2026 AAA COSMOS) ===
        // ==========================================
        ctx.save();

        // 1. Nebulosas interestelares radiantes en el abismo profundo
        const nebGrad1 = ctx.createRadialGradient(80, 70, 10, 80, 70, 90);
        nebGrad1.addColorStop(0, 'rgba(168, 85, 247, 0.45)');
        nebGrad1.addColorStop(0.5, 'rgba(56, 189, 248, 0.25)');
        nebGrad1.addColorStop(1, 'rgba(0, 0, 0, 0)');
        ctx.fillStyle = nebGrad1;
        ctx.beginPath();
        ctx.arc(80, 70, 90, 0, Math.PI * 2);
        ctx.fill();

        const nebGrad2 = ctx.createRadialGradient(VIEW_WIDTH - 90, 110, 15, VIEW_WIDTH - 90, 110, 100);
        nebGrad2.addColorStop(0, 'rgba(236, 72, 153, 0.35)');
        nebGrad2.addColorStop(0.6, 'rgba(124, 58, 237, 0.2)');
        nebGrad2.addColorStop(1, 'rgba(0, 0, 0, 0)');
        ctx.fillStyle = nebGrad2;
        ctx.beginPath();
        ctx.arc(VIEW_WIDTH - 90, 110, 100, 0, Math.PI * 2);
        ctx.fill();

        // 2. Colosal Planeta Gigante Gaseoso con Anillos (Estilo Saturno/Neptuno)
        const planetX = VIEW_WIDTH - 75;
        const planetY = 58;
        const planetR = 24;

        // Anillos traseros del planeta
        ctx.strokeStyle = 'rgba(192, 132, 252, 0.75)';
        ctx.lineWidth = 3.5;
        ctx.beginPath();
        ctx.ellipse(planetX, planetY, 46, 10, -0.35, Math.PI, 0); // Mitad trasera
        ctx.stroke();

        // Globo planetario con bandas atmosféricas tridimensionales
        const pGrad = ctx.createRadialGradient(planetX - 7, planetY - 7, 3, planetX, planetY, planetR);
        pGrad.addColorStop(0, '#c084fc');
        pGrad.addColorStop(0.4, '#8b5cf6');
        pGrad.addColorStop(0.8, '#4c1d95');
        pGrad.addColorStop(1, '#1e1b4b');
        ctx.fillStyle = pGrad;
        ctx.beginPath();
        ctx.arc(planetX, planetY, planetR, 0, Math.PI * 2);
        ctx.fill();

        // Bandas nubosas del planeta
        ctx.strokeStyle = 'rgba(233, 213, 255, 0.35)';
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.ellipse(planetX, planetY - 4, planetR - 2, 4, -0.35, 0, Math.PI * 2);
        ctx.ellipse(planetX, planetY + 5, planetR - 3, 4, -0.35, 0, Math.PI * 2);
        ctx.stroke();

        // Anillos delanteros (pasan sobre el planeta)
        ctx.strokeStyle = '#e9d5ff';
        ctx.lineWidth = 3.5;
        ctx.beginPath();
        ctx.ellipse(planetX, planetY, 46, 10, -0.35, 0, Math.PI); // Mitad delantera
        ctx.stroke();

        // 3. Exoplaneta Tierra / Luna Terraforamada orbitando a la izquierda
        const moonX = 55;
        const moonY = 85;
        const mGrad = ctx.createRadialGradient(moonX - 3, moonY - 3, 2, moonX, moonY, 13);
        mGrad.addColorStop(0, '#67e8f9');
        mGrad.addColorStop(0.5, '#0284c7');
        mGrad.addColorStop(1, '#0c4a6e');
        ctx.fillStyle = mGrad;
        ctx.beginPath();
        ctx.arc(moonX, moonY, 13, 0, Math.PI * 2);
        ctx.fill();
        // Atmósfera azul brillante
        ctx.strokeStyle = '#a5f3fc';
        ctx.lineWidth = 1.2;
        ctx.stroke();

        // 4. Quásar / Agujero Negro con Disco de Acreción ardiente
        const qX = ((VIEW_WIDTH / 2 + 10) - bgOffset * 0.15) % VIEW_WIDTH;
        const qY = 48;
        const qGlow = ctx.createRadialGradient(qX, qY, 3, qX, qY, 26);
        qGlow.addColorStop(0, '#ffffff');
        qGlow.addColorStop(0.3, '#f59e0b');
        qGlow.addColorStop(0.7, '#ea580c');
        qGlow.addColorStop(1, 'rgba(234, 88, 12, 0)');
        ctx.fillStyle = qGlow;
        ctx.beginPath();
        ctx.arc(qX, qY, 26, 0, Math.PI * 2);
        ctx.fill();

        // Disco de acreción brillante
        ctx.strokeStyle = '#fef08a';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.ellipse(qX, qY, 22, 5, 0.3, 0, Math.PI * 2);
        ctx.stroke();

        // Núcleo del agujero negro
        ctx.fillStyle = '#000000';
        ctx.beginPath();
        ctx.arc(qX, qY, 5.5, 0, Math.PI * 2);
        ctx.fill();

        // 5. Estrellas fugaces / Cometas cruzando el cosmos
        const meteorTime = (Date.now() * 0.001) % 4;
        if (meteorTime < 1.2) {
            const metX = ((meteorTime * 320) % (VIEW_WIDTH + 80)) - 40;
            const metY = meteorTime * 140;
            const metGrad = ctx.createLinearGradient(metX, metY, metX - 35, metY - 20);
            metGrad.addColorStop(0, '#ffffff');
            metGrad.addColorStop(0.4, '#38bdf8');
            metGrad.addColorStop(1, 'rgba(56, 189, 248, 0)');
            ctx.strokeStyle = metGrad;
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.moveTo(metX, metY);
            ctx.lineTo(metX - 35, metY - 20);
            ctx.stroke();
        }

        // 6. Campo denso de estrellas brillantes
        const now = Date.now();
        for (let i = 0; i < 42; i++) {
            const sx = ((i * 38) - bgOffset * 0.3) % VIEW_WIDTH;
            const sy = (i * 22) % (VIEW_HEIGHT - 40);
            const drawX = sx < 0 ? sx + VIEW_WIDTH : sx;
            const twinkle = Math.sin(now * 0.004 + i * 1.7) * 0.5 + 0.5;

            ctx.fillStyle = (i % 3 === 0) ? '#38bdf8' : ((i % 2 === 0) ? '#fef08a' : '#ffffff');
            const sSize = (i % 5 === 0) ? 2.5 : ((i % 3 === 0) ? 1.8 : 1.2);
            ctx.globalAlpha = 0.4 + twinkle * 0.6;
            ctx.fillRect(drawX, sy, sSize, sSize);
        }
        ctx.globalAlpha = 1.0;

        ctx.restore();

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

        // 2. Capa 2: Molino de viento lejano en la colina
        const millX = ((190) - bgOffset * 0.35) % (VIEW_WIDTH * 2.2);
        if (millX > -40 && millX < VIEW_WIDTH + 40) {
            ctx.fillStyle = '#1e293b';
            ctx.beginPath();
            ctx.moveTo(millX - 8, 150);
            ctx.lineTo(millX - 5, 120);
            ctx.lineTo(millX + 5, 120);
            ctx.lineTo(millX + 8, 150);
            ctx.closePath();
            ctx.fill();
            // Aspas giratorias del molino
            const millRot = Date.now() * 0.002;
            ctx.save();
            ctx.translate(millX, 122);
            ctx.rotate(millRot);
            ctx.strokeStyle = '#f8fafc';
            ctx.lineWidth = 1.5;
            for (let b = 0; b < 4; b++) {
                ctx.rotate(Math.PI / 2);
                ctx.beginPath();
                ctx.moveTo(0, 0);
                ctx.lineTo(0, 14);
                ctx.stroke();
            }
            ctx.restore();
        }

        // 3. Capa 3: Bosque lejano con pinos altos y robles en la distancia
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

        // 4. Capa 4: PEQUEÑO PUEBLO EN EL BOSQUE (Casitas con chimenea + Fuente de agua viva)
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

        // 5. Capa 5: Árboles frondosos en plano medio envolviendo el pueblo
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

        // 6. Hadas de Kokiri (estilo Navi) flotando y brillando en el bosque
        for (let f = 0; f < 3; f++) {
            const fTime = Date.now() * 0.003 + f * 2.1;
            const fX = ((f * 135 + 90) - bgOffset * 0.5 + Math.sin(fTime * 2) * 18) % VIEW_WIDTH;
            const fY = 85 + Math.cos(fTime) * 15;

            // Halo mágico de la hada
            const fairyGlow = ctx.createRadialGradient(fX, fY, 1, fX, fY, 9);
            fairyGlow.addColorStop(0, '#ffffff');
            fairyGlow.addColorStop(0.4, (f % 2 === 0) ? '#4ade80' : '#38bdf8');
            fairyGlow.addColorStop(1, 'rgba(0,0,0,0)');
            ctx.fillStyle = fairyGlow;
            ctx.beginPath();
            ctx.arc(fX, fY, 9, 0, Math.PI * 2);
            ctx.fill();

            // Alas transparentes de la hada batiendo
            const wingFlap = Math.sin(Date.now() * 0.03 + f) * 3;
            ctx.fillStyle = 'rgba(255, 255, 255, 0.75)';
            ctx.beginPath();
            ctx.ellipse(fX - 4, fY - 3, 2, 4 + wingFlap, -0.4, 0, Math.PI * 2);
            ctx.ellipse(fX + 4, fY - 3, 2, 4 + wingFlap, 0.4, 0, Math.PI * 2);
            ctx.fill();
        }

        // 7. Nubes suaves de bosque con viento
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
// DIBUJO DE TILES ESTILO 2026 ADAPTATIVO A LOS 9 MUNDOS (AAA 2.5D PLATFORMS)
// ==========================================
function drawMarioTile(tile, x, y, c, r) {
    const theme = (levelData && levelData.world) ? (levelData.world.theme || "grassland") : "grassland";

    if (tile === 1) {
        // === 1. SUPERFICIE SUPERIOR (ADAPTATIVA A CADA MUNDO) ===
        // Sombra de oclusión ambiental bajo el bloque
        ctx.fillStyle = 'rgba(0, 0, 0, 0.24)';
        ctx.fillRect(x + 2, y + TILE_SIZE, TILE_SIZE - 4, 5);

        if (theme === 'desert') {
            // --- MUNDO 2: DUNAS DE ARENA DORADA Y ARENISCA EGIPCIA ---
            // Base de arenisca chiseled
            const sandGrad = ctx.createLinearGradient(x, y + 10, x, y + TILE_SIZE);
            sandGrad.addColorStop(0, '#d97706');
            sandGrad.addColorStop(0.5, '#b45309');
            sandGrad.addColorStop(1, '#78350f');
            ctx.fillStyle = sandGrad;
            ctx.fillRect(x, y + 10, TILE_SIZE, TILE_SIZE - 10);

            // Capa superior de arena ondulante por el viento
            const topSand = ctx.createLinearGradient(x, y, x, y + 12);
            topSand.addColorStop(0, '#fef08a');
            topSand.addColorStop(0.4, '#f59e0b');
            topSand.addColorStop(1, '#d97706');
            ctx.fillStyle = topSand;
            ctx.fillRect(x, y, TILE_SIZE, 11);

            // Ondulaciones de duna en el borde
            ctx.beginPath();
            ctx.arc(x + 6, y + 11, 4.5, 0, Math.PI);
            ctx.arc(x + 16, y + 11, 4.5, 0, Math.PI);
            ctx.arc(x + 26, y + 11, 4.5, 0, Math.PI);
            ctx.fill();

            // Destello de arena brillante
            ctx.fillStyle = '#fef08a';
            ctx.fillRect(x, y, TILE_SIZE, 2);
            ctx.fillRect(x + 6, y + 5, 2, 2);
            ctx.fillRect(x + 20, y + 4, 2, 2);

        } else if (theme === 'neon_cave') {
            // --- MUNDO 3: ROCA OBSIDIANA CON COSTRA DE CRISTAL NEÓN VIOLETA Y CIAN ---
            const caveGrad = ctx.createLinearGradient(x, y + 10, x, y + TILE_SIZE);
            caveGrad.addColorStop(0, '#1e1b4b');
            caveGrad.addColorStop(1, '#090518');
            ctx.fillStyle = caveGrad;
            ctx.fillRect(x, y + 10, TILE_SIZE, TILE_SIZE - 10);

            // Costra de cristales fluorescentes
            const crystalGrad = ctx.createLinearGradient(x, y, x, y + 12);
            crystalGrad.addColorStop(0, '#00f2fe');
            crystalGrad.addColorStop(0.5, '#a855f7');
            crystalGrad.addColorStop(1, '#581c87');
            ctx.fillStyle = crystalGrad;
            ctx.fillRect(x, y, TILE_SIZE, 10);

            // Espuelas afiladas de cristal neón
            ctx.fillStyle = '#00f2fe';
            ctx.beginPath();
            ctx.moveTo(x + 4, y); ctx.lineTo(x + 7, y - 4); ctx.lineTo(x + 10, y);
            ctx.moveTo(x + 14, y); ctx.lineTo(x + 17, y - 5); ctx.lineTo(x + 20, y);
            ctx.moveTo(x + 22, y); ctx.lineTo(x + 26, y - 4); ctx.lineTo(x + 29, y);
            ctx.fill();

            // Borde neón pulsante
            ctx.fillStyle = '#e0f2fe';
            ctx.fillRect(x, y, TILE_SIZE, 2);

        } else if (theme === 'ocean') {
            // --- MUNDO 4: ARENA DE PLAYA TROPICAL CON CONCHAS Y BALDOSAS MARINAS ---
            const beachGrad = ctx.createLinearGradient(x, y + 10, x, y + TILE_SIZE);
            beachGrad.addColorStop(0, '#ca8a04');
            beachGrad.addColorStop(1, '#854d0e');
            ctx.fillStyle = beachGrad;
            ctx.fillRect(x, y + 10, TILE_SIZE, TILE_SIZE - 10);

            // Borde superior de arena blanca y césped tropical esmeralda
            const coastGrad = ctx.createLinearGradient(x, y, x, y + 12);
            coastGrad.addColorStop(0, '#6ee7b7');
            coastGrad.addColorStop(0.4, '#10b981');
            coastGrad.addColorStop(1, '#047857');
            ctx.fillStyle = coastGrad;
            ctx.fillRect(x, y, TILE_SIZE, 11);

            ctx.beginPath();
            ctx.arc(x + 6, y + 11, 4.5, 0, Math.PI);
            ctx.arc(x + 16, y + 11, 4.5, 0, Math.PI);
            ctx.arc(x + 26, y + 11, 4.5, 0, Math.PI);
            ctx.fill();

            ctx.fillStyle = '#a7f3d0';
            ctx.fillRect(x, y, TILE_SIZE, 2.5);

            // Pequeña concha marina en el borde
            ctx.fillStyle = '#fbcfe8';
            ctx.beginPath();
            ctx.arc(x + 14, y + 5, 2.5, 0, Math.PI * 2);
            ctx.fill();

        } else if (theme === 'ice') {
            // --- MUNDO 5: NIEVE PRÍSTINA Y HIELO GLACIAR CRISTALINO ---
            const glacierGrad = ctx.createLinearGradient(x, y + 10, x, y + TILE_SIZE);
            glacierGrad.addColorStop(0, '#38bdf8');
            glacierGrad.addColorStop(0.5, '#0284c7');
            glacierGrad.addColorStop(1, '#0c4a6e');
            ctx.fillStyle = glacierGrad;
            ctx.fillRect(x, y + 10, TILE_SIZE, TILE_SIZE - 10);

            // Manto de nieve pura superior
            const snowGrad = ctx.createLinearGradient(x, y, x, y + 12);
            snowGrad.addColorStop(0, '#ffffff');
            snowGrad.addColorStop(0.6, '#e0f2fe');
            snowGrad.addColorStop(1, '#bae6fd');
            ctx.fillStyle = snowGrad;
            ctx.fillRect(x, y, TILE_SIZE, 11);

            // Carámbanos de hielo colgando
            ctx.fillStyle = '#e0f2fe';
            ctx.beginPath();
            ctx.moveTo(x + 3, y + 11); ctx.lineTo(x + 6, y + 16); ctx.lineTo(x + 9, y + 11);
            ctx.moveTo(x + 13, y + 11); ctx.lineTo(x + 16, y + 17); ctx.lineTo(x + 19, y + 11);
            ctx.moveTo(x + 23, y + 11); ctx.lineTo(x + 26, y + 16); ctx.lineTo(x + 29, y + 11);
            ctx.fill();

            // Resplandor de nieve brillante
            ctx.fillStyle = '#ffffff';
            ctx.fillRect(x, y, TILE_SIZE, 3);
            ctx.fillRect(x + 4, y + 5, 2, 2);
            ctx.fillRect(x + 18, y + 4, 2, 2);

        } else if (theme === 'spooky_forest') {
            // --- MUNDO 6: TIERRA DE CEMENTERIO MALDITO CON MUSGO VIOLETA ---
            const cryptGrad = ctx.createLinearGradient(x, y + 10, x, y + TILE_SIZE);
            cryptGrad.addColorStop(0, '#1e293b');
            cryptGrad.addColorStop(1, '#020617');
            ctx.fillStyle = cryptGrad;
            ctx.fillRect(x, y + 10, TILE_SIZE, TILE_SIZE - 10);

            // Musgo púrpura fantasmal
            const mossGrad = ctx.createLinearGradient(x, y, x, y + 12);
            mossGrad.addColorStop(0, '#c084fc');
            mossGrad.addColorStop(0.4, '#7e22ce');
            mossGrad.addColorStop(1, '#3b0764');
            ctx.fillStyle = mossGrad;
            ctx.fillRect(x, y, TILE_SIZE, 11);

            ctx.beginPath();
            ctx.arc(x + 6, y + 11, 4.5, 0, Math.PI);
            ctx.arc(x + 16, y + 11, 4.5, 0, Math.PI);
            ctx.arc(x + 26, y + 11, 4.5, 0, Math.PI);
            ctx.fill();

            // Esporas luminosas verdosas
            ctx.fillStyle = '#2dd4bf';
            ctx.fillRect(x + 8, y + 4, 2, 2);
            ctx.fillRect(x + 22, y + 5, 2, 2);

        } else if (theme === 'airship') {
            // --- MUNDO 7: TABLONES DE MADERA DE GALEÓN VOLADOR Y REMACHES DE BRONCE ---
            const woodGrad = ctx.createLinearGradient(x, y, x, y + TILE_SIZE);
            woodGrad.addColorStop(0, '#b45309');
            woodGrad.addColorStop(0.5, '#78350f');
            woodGrad.addColorStop(1, '#451a03');
            ctx.fillStyle = woodGrad;
            ctx.fillRect(x, y, TILE_SIZE, TILE_SIZE);

            // Líneas de tablón náutico
            ctx.strokeStyle = '#291002';
            ctx.lineWidth = 1.5;
            ctx.beginPath();
            ctx.moveTo(x, y + 10); ctx.lineTo(x + TILE_SIZE, y + 10);
            ctx.moveTo(x, y + 21); ctx.lineTo(x + TILE_SIZE, y + 21);
            ctx.stroke();

            // Borde superior de latón pulido
            ctx.fillStyle = '#f59e0b';
            ctx.fillRect(x, y, TILE_SIZE, 3);

            // Clavos / remaches dorados de barco
            ctx.fillStyle = '#fef08a';
            ctx.fillRect(x + 4, y + 5, 2, 2);
            ctx.fillRect(x + TILE_SIZE - 6, y + 5, 2, 2);
            ctx.fillRect(x + 12, y + 15, 2, 2);

        } else if (theme === 'lava_castle') {
            // --- MUNDO 8: ROCA BASÁLTICA VOLCÁNICA CON GRIETAS DE MAGMA ARDIENTE ---
            const basaltGrad = ctx.createLinearGradient(x, y + 10, x, y + TILE_SIZE);
            basaltGrad.addColorStop(0, '#260404');
            basaltGrad.addColorStop(1, '#0f0202');
            ctx.fillStyle = basaltGrad;
            ctx.fillRect(x, y + 10, TILE_SIZE, TILE_SIZE - 10);

            // Costra de roca ardiente superior
            const lavaRockGrad = ctx.createLinearGradient(x, y, x, y + 12);
            lavaRockGrad.addColorStop(0, '#f97316');
            lavaRockGrad.addColorStop(0.35, '#dc2626');
            lavaRockGrad.addColorStop(1, '#450a0a');
            ctx.fillStyle = lavaRockGrad;
            ctx.fillRect(x, y, TILE_SIZE, 11);

            // Borde quebrado de roca volcánica
            ctx.beginPath();
            ctx.arc(x + 6, y + 11, 4.5, 0, Math.PI);
            ctx.arc(x + 16, y + 11, 4.5, 0, Math.PI);
            ctx.arc(x + 26, y + 11, 4.5, 0, Math.PI);
            ctx.fill();

            // Grietas de lava viva incandescente
            ctx.strokeStyle = '#fef08a';
            ctx.lineWidth = 1.4;
            ctx.beginPath();
            ctx.moveTo(x + 3, y + 3); ctx.lineTo(x + 8, y + 8); ctx.lineTo(x + 14, y + 4); ctx.lineTo(x + 22, y + 9); ctx.lineTo(x + 29, y + 2);
            ctx.stroke();

        } else if (theme === 'space') {
            // --- MUNDO 9: ALEACIÓN METÁLICA CÓSMICA CON CIRCUITOS DE ENERGÍA ---
            const alloyGrad = ctx.createLinearGradient(x, y, x + TILE_SIZE, y + TILE_SIZE);
            alloyGrad.addColorStop(0, '#312e81');
            alloyGrad.addColorStop(0.5, '#1e1b4b');
            alloyGrad.addColorStop(1, '#020617');
            ctx.fillStyle = alloyGrad;
            ctx.fillRect(x, y, TILE_SIZE, TILE_SIZE);

            // Placa superior metálica con bisel dorado
            ctx.fillStyle = '#fbbf24';
            ctx.fillRect(x, y, TILE_SIZE, 3);

            // Líneas de circuito de energía cian pulsantes
            const circuitPulse = Math.sin(Date.now() * 0.006 + x) * 0.3 + 0.7;
            ctx.strokeStyle = `rgba(56, 189, 248, ${circuitPulse})`;
            ctx.lineWidth = 1.2;
            ctx.beginPath();
            ctx.moveTo(x + 4, y + 8); ctx.lineTo(x + 14, y + 8); ctx.lineTo(x + 18, y + 16); ctx.lineTo(x + 28, y + 16);
            ctx.stroke();
            ctx.fillStyle = '#38bdf8';
            ctx.fillRect(x + 13, y + 7, 3, 3);
            ctx.fillRect(x + 27, y + 15, 3, 3);

        } else {
            // --- MUNDO 1: TIERRA ORGÁNICA ESTRATIFICADA CON CÉSPED 2.5D CALIDAD DIOS (KOKIRI) ---
            const dirtGrad = ctx.createLinearGradient(x, y + 10, x, y + TILE_SIZE);
            dirtGrad.addColorStop(0, '#582f0e');
            dirtGrad.addColorStop(0.5, '#3d1f05');
            dirtGrad.addColorStop(1, '#1b0802');
            ctx.fillStyle = dirtGrad;
            ctx.fillRect(x, y + 10, TILE_SIZE, TILE_SIZE - 10);

            // Minerales de cuarzo y vetas de raíces orgánicas
            ctx.fillStyle = '#2b0c03';
            ctx.fillRect(x + 3, y + 15, 8, 3);
            ctx.fillRect(x + 18, y + 21, 10, 4);
            ctx.fillStyle = '#fed7aa'; // Cuarzo brillante
            ctx.fillRect(x + 8, y + 18, 2, 2);
            ctx.fillRect(x + 24, y + 26, 2, 2);

            // Césped verde esmeralda exuberante multicapa
            const grassGrad = ctx.createLinearGradient(x, y, x, y + 12);
            grassGrad.addColorStop(0, '#86efac');
            grassGrad.addColorStop(0.3, '#22c55e');
            grassGrad.addColorStop(0.7, '#15803d');
            grassGrad.addColorStop(1, '#052e16');
            ctx.fillStyle = grassGrad;
            ctx.fillRect(x, y, TILE_SIZE, 11);

            // Festoneado ondulante 3D del césped
            ctx.beginPath();
            ctx.arc(x + 5, y + 11, 4.5, 0, Math.PI);
            ctx.arc(x + 15, y + 11, 4.5, 0, Math.PI);
            ctx.arc(x + 25, y + 11, 4.5, 0, Math.PI);
            ctx.arc(x + 31, y + 11, 2.5, 0, Math.PI);
            ctx.fill();

            // Ribete de luz solar superior en el césped
            ctx.fillStyle = '#bbf7d0';
            ctx.fillRect(x, y, TILE_SIZE, 2.5);

            // Briznas de hierba orgánicas ondeando activamente al viento
            const wind = Math.sin(Date.now() * 0.0035 + c * 0.8) * 2.5;
            ctx.strokeStyle = '#86efac';
            ctx.lineWidth = 1.6;
            ctx.beginPath();
            ctx.moveTo(x + 3, y); ctx.lineTo(x + 5 + wind, y - 5);
            ctx.moveTo(x + 10, y); ctx.lineTo(x + 12 + wind, y - 6);
            ctx.moveTo(x + 18, y); ctx.lineTo(x + 20 + wind, y - 5);
            ctx.moveTo(x + 26, y); ctx.lineTo(x + 28 + wind, y - 6);
            ctx.stroke();

            // Pequeñas flores silvestres mágicas que florecen en el césped
            if ((c * 7 + r) % 3 === 0) {
                ctx.fillStyle = '#ffffff';
                ctx.beginPath();
                ctx.arc(x + 14, y - 2, 2, 0, Math.PI * 2);
                ctx.fill();
                ctx.fillStyle = '#fde047';
                ctx.fillRect(x + 13.5, y - 2.5, 1, 1);
            }
        }

    } else if (tile === 13) {
        // === 2. TIERRA SUBTERRÁNEA PROFUNDA CALIDAD DIOS (100% PERSONALIZADA POR MUNDO) ===
        if (theme === 'desert') {
            // --- MUNDO 2: LADRILLOS DE CRIPTA EGIPCIA CON JEROGLÍFICOS Y ORO ---
            const stoneGrad = ctx.createLinearGradient(x, y, x + TILE_SIZE, y + TILE_SIZE);
            stoneGrad.addColorStop(0, '#b45309');
            stoneGrad.addColorStop(0.5, '#78350f');
            stoneGrad.addColorStop(1, '#451a03');
            ctx.fillStyle = stoneGrad;
            ctx.fillRect(x, y, TILE_SIZE, TILE_SIZE);

            // Junta de mortero de arenisca
            ctx.strokeStyle = '#291002';
            ctx.lineWidth = 1.5;
            ctx.strokeRect(x + 1, y + 1, TILE_SIZE - 2, TILE_SIZE - 2);

            // Jeroglífico sagrado de oro / turquesa tallado
            ctx.strokeStyle = '#06b6d4';
            ctx.lineWidth = 1.2;
            ctx.beginPath();
            ctx.arc(x + 16, y + 12, 4, 0, Math.PI * 2);
            ctx.moveTo(x + 16, y + 16); ctx.lineTo(x + 16, y + 26);
            ctx.moveTo(x + 11, y + 19); ctx.lineTo(x + 21, y + 19);
            ctx.stroke();
            ctx.fillStyle = '#fde047';
            ctx.fillRect(x + 15, y + 11, 2, 2);

        } else if (theme === 'neon_cave') {
            // --- MUNDO 3: GEODA SUBTERRÁNEA DE CRISTALES NEÓN PÚRPURA Y CIAN ---
            const caveGrad = ctx.createLinearGradient(x, y, x + TILE_SIZE, y + TILE_SIZE);
            caveGrad.addColorStop(0, '#1e1b4b');
            caveGrad.addColorStop(1, '#090518');
            ctx.fillStyle = caveGrad;
            ctx.fillRect(x, y, TILE_SIZE, TILE_SIZE);

            // Cristales de amatista y cian incrustados en la roca
            ctx.fillStyle = '#a855f7';
            ctx.beginPath();
            ctx.moveTo(x + 6, y + 18); ctx.lineTo(x + 10, y + 8); ctx.lineTo(x + 14, y + 18);
            ctx.fill();
            ctx.fillStyle = '#00f0ff';
            ctx.beginPath();
            ctx.moveTo(x + 18, y + 24); ctx.lineTo(x + 23, y + 12); ctx.lineTo(x + 28, y + 24);
            ctx.fill();

            // Veta de energía neón
            ctx.strokeStyle = 'rgba(0, 240, 255, 0.5)';
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(x + 2, y + 15); ctx.lineTo(x + 12, y + 20); ctx.lineTo(x + 30, y + 14);
            ctx.stroke();

        } else if (theme === 'ocean') {
            // --- MUNDO 4: PIEDRA CORALINA MARINA CON FÓSILES Y NÁCAR ---
            const coralGrad = ctx.createLinearGradient(x, y, x, y + TILE_SIZE);
            coralGrad.addColorStop(0, '#0f766e');
            coralGrad.addColorStop(1, '#042f2e');
            ctx.fillStyle = coralGrad;
            ctx.fillRect(x, y, TILE_SIZE, TILE_SIZE);

            // Fósil de concha espiral
            ctx.strokeStyle = '#99f6e4';
            ctx.lineWidth = 1.4;
            ctx.beginPath();
            ctx.arc(x + 16, y + 16, 7, 0, Math.PI * 1.5);
            ctx.stroke();
            ctx.fillStyle = '#fde047';
            ctx.fillRect(x + 7, y + 8, 2, 2);
            ctx.fillRect(x + 23, y + 22, 2, 2);

        } else if (theme === 'ice') {
            // --- MUNDO 5: PERMAFROST GLACIAL CON GRIETAS DE HIELO Y BURBUJAS ---
            const frostGrad = ctx.createLinearGradient(x, y, x, y + TILE_SIZE);
            frostGrad.addColorStop(0, '#0369a1');
            frostGrad.addColorStop(1, '#082f49');
            ctx.fillStyle = frostGrad;
            ctx.fillRect(x, y, TILE_SIZE, TILE_SIZE);

            // Fracturas de hielo cristalino blanco
            ctx.strokeStyle = 'rgba(255, 255, 255, 0.7)';
            ctx.lineWidth = 1.2;
            ctx.beginPath();
            ctx.moveTo(x + 4, y + 6); ctx.lineTo(x + 14, y + 16); ctx.lineTo(x + 10, y + 26);
            ctx.moveTo(x + 14, y + 16); ctx.lineTo(x + 28, y + 12);
            ctx.stroke();

            // Burbujas de aire congeladas
            ctx.fillStyle = 'rgba(224, 242, 254, 0.6)';
            ctx.beginPath();
            ctx.arc(x + 8, y + 22, 2.5, 0, Math.PI * 2);
            ctx.arc(x + 24, y + 24, 3, 0, Math.PI * 2);
            ctx.fill();

        } else if (theme === 'spooky_forest') {
            // --- MUNDO 6: CRIPTA EMBRUJADA CON RUNAS Y MUSGO ESPECTRAL ---
            const cryptGrad = ctx.createLinearGradient(x, y, x, y + TILE_SIZE);
            cryptGrad.addColorStop(0, '#1e1b4b');
            cryptGrad.addColorStop(1, '#020617');
            ctx.fillStyle = cryptGrad;
            ctx.fillRect(x, y, TILE_SIZE, TILE_SIZE);

            // Adoquines antiguos
            ctx.strokeStyle = '#334155';
            ctx.lineWidth = 1.5;
            ctx.strokeRect(x + 2, y + 2, TILE_SIZE - 4, TILE_SIZE - 4);

            // Runa misteriosa con resplandor púrpura
            ctx.strokeStyle = '#c084fc';
            ctx.lineWidth = 1.2;
            ctx.beginPath();
            ctx.moveTo(x + 11, y + 10); ctx.lineTo(x + 21, y + 22);
            ctx.moveTo(x + 21, y + 10); ctx.lineTo(x + 11, y + 22);
            ctx.stroke();

        } else if (theme === 'airship') {
            // --- MUNDO 7: MAQUINARIA PESADA DE VAPOR, ENGRANAJES Y BRONCE ---
            const ironGrad = ctx.createLinearGradient(x, y, x, y + TILE_SIZE);
            ironGrad.addColorStop(0, '#44403c');
            ironGrad.addColorStop(1, '#1c1917');
            ctx.fillStyle = ironGrad;
            ctx.fillRect(x, y, TILE_SIZE, TILE_SIZE);

            // Placas de acero con remaches
            ctx.strokeStyle = '#78716c';
            ctx.lineWidth = 1.5;
            ctx.strokeRect(x + 2, y + 2, TILE_SIZE - 4, TILE_SIZE - 4);

            // Tubería de cobre interna con válvula
            ctx.fillStyle = '#b45309';
            ctx.fillRect(x + 6, y + 14, 20, 5);
            ctx.fillStyle = '#f59e0b';
            ctx.fillRect(x + 14, y + 12, 4, 9);

        } else if (theme === 'lava_castle') {
            // --- MUNDO 8: BASALTO VOLCÁNICO CON MAGMA LÍQUIDO INCANDESCENTE ---
            const lavaRock = ctx.createLinearGradient(x, y, x, y + TILE_SIZE);
            lavaRock.addColorStop(0, '#18181b');
            lavaRock.addColorStop(1, '#09090b');
            ctx.fillStyle = lavaRock;
            ctx.fillRect(x, y, TILE_SIZE, TILE_SIZE);

            // Grietas ardientes de lava viva
            ctx.strokeStyle = '#ef4444';
            ctx.lineWidth = 1.8;
            ctx.shadowColor = '#f59e0b';
            ctx.shadowBlur = 6;
            ctx.beginPath();
            ctx.moveTo(x + 3, y + 10); ctx.lineTo(x + 15, y + 18); ctx.lineTo(x + 29, y + 12);
            ctx.moveTo(x + 15, y + 18); ctx.lineTo(x + 18, y + 29);
            ctx.stroke();
            ctx.shadowBlur = 0;

            ctx.fillStyle = '#fef08a';
            ctx.fillRect(x + 14, y + 17, 3, 3);

        } else if (theme === 'space') {
            // --- MUNDO 9: BLINDAJE DE NAVE ESPACIAL Y CONDUCTOS CUÁNTICOS ---
            const hullGrad = ctx.createLinearGradient(x, y, x, y + TILE_SIZE);
            hullGrad.addColorStop(0, '#0f172a');
            hullGrad.addColorStop(1, '#020617');
            ctx.fillStyle = hullGrad;
            ctx.fillRect(x, y, TILE_SIZE, TILE_SIZE);

            // Panel hexagonal de aleación
            ctx.strokeStyle = '#334155';
            ctx.lineWidth = 1.5;
            ctx.strokeRect(x + 2, y + 2, TILE_SIZE - 4, TILE_SIZE - 4);

            // Circuito cuántico cian pulsante
            const p = Math.sin(Date.now() * 0.007 + x) * 0.3 + 0.7;
            ctx.strokeStyle = `rgba(56, 189, 248, ${p})`;
            ctx.lineWidth = 1.4;
            ctx.beginPath();
            ctx.moveTo(x + 8, y + 8); ctx.lineTo(x + 24, y + 8);
            ctx.lineTo(x + 24, y + 24); ctx.lineTo(x + 8, y + 24);
            ctx.closePath();
            ctx.stroke();
            ctx.fillStyle = '#38bdf8';
            ctx.fillRect(x + 14, y + 14, 4, 4);

        } else {
            // --- MUNDO 1 (KOKIRI): TIERRA PROFUNDA ORGÁNICA CON RAÍCES Y MINERALES ---
            const deepGrad = ctx.createLinearGradient(x, y, x, y + TILE_SIZE);
            deepGrad.addColorStop(0, '#3d1f05');
            deepGrad.addColorStop(1, '#1b0802');
            ctx.fillStyle = deepGrad;
            ctx.fillRect(x, y, TILE_SIZE, TILE_SIZE);

            // Raíces retorcidas de roble milenario
            ctx.strokeStyle = '#582f0e';
            ctx.lineWidth = 2.2;
            ctx.beginPath();
            ctx.moveTo(x + 8, y); ctx.quadraticCurveTo(x + 14, y + 16, x + 24, y + TILE_SIZE);
            ctx.stroke();

            // Gemas de cuarzo y minerales brillantes
            ctx.fillStyle = '#fed7aa';
            ctx.fillRect(x + 5, y + 12, 3, 3);
            ctx.fillRect(x + 22, y + 20, 3, 3);
            ctx.fillStyle = '#4ade80';
            ctx.fillRect(x + 16, y + 24, 2, 2); // Musgo de hada
        }

        // Bisel de profundidad 3D suave en cada bloque
        ctx.strokeStyle = 'rgba(0, 0, 0, 0.45)';
        ctx.lineWidth = 1;
        ctx.strokeRect(x, y, TILE_SIZE, TILE_SIZE);

    } else if (tile === 2) {
        // === 3. BLOQUE DE LADRILLO 3D ADAPTATIVO A CADA MUNDO ===
        ctx.fillStyle = 'rgba(0, 0, 0, 0.26)';
        ctx.fillRect(x + 1, y + TILE_SIZE, TILE_SIZE - 2, 5);

        let bTop = '#ea580c', bMid = '#c2410c', bBot = '#7c2d12', mortColor = '#450a0a';
        if (theme === 'desert') {
            bTop = '#fde047'; bMid = '#d97706'; bBot = '#78350f'; mortColor = '#451a03';
        } else if (theme === 'neon_cave') {
            bTop = '#c084fc'; bMid = '#7c3aed'; bBot = '#3b0764'; mortColor = '#1e1b4b';
        } else if (theme === 'ocean') {
            bTop = '#fde68a'; bMid = '#f59e0b'; bBot = '#92400e'; mortColor = '#451a03';
        } else if (theme === 'ice') {
            bTop = '#ffffff'; bMid = '#38bdf8'; bBot = '#0284c7'; mortColor = '#0c4a6e';
        } else if (theme === 'spooky_forest') {
            bTop = '#64748b'; bMid = '#334155'; bBot = '#0f172a'; mortColor = '#020617';
        } else if (theme === 'airship') {
            bTop = '#fb923c'; bMid = '#c2410c'; bBot = '#431407'; mortColor = '#291002';
        } else if (theme === 'lava_castle') {
            bTop = '#f87171'; bMid = '#b91c1c'; bBot = '#450a0a'; mortColor = '#190202';
        } else if (theme === 'space') {
            bTop = '#a78bfa'; bMid = '#6366f1'; bBot = '#312e81'; mortColor = '#0f172a';
        }

        const blockGrad = ctx.createLinearGradient(x, y, x + TILE_SIZE, y + TILE_SIZE);
        blockGrad.addColorStop(0, bTop);
        blockGrad.addColorStop(0.5, bMid);
        blockGrad.addColorStop(1, bBot);
        ctx.fillStyle = blockGrad;
        ctx.fillRect(x, y, TILE_SIZE, TILE_SIZE);

        // Bisel de luz superior e izquierdo
        ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
        ctx.fillRect(x, y, TILE_SIZE, 2.5);
        ctx.fillRect(x, y, 2.5, TILE_SIZE);

        // Bisel de sombra inferior y derecho
        ctx.fillStyle = 'rgba(0, 0, 0, 0.45)';
        ctx.fillRect(x, y + TILE_SIZE - 2.5, TILE_SIZE, 2.5);
        ctx.fillRect(x + TILE_SIZE - 2.5, y, 2.5, TILE_SIZE);

        // Líneas de mortero o junta
        ctx.strokeStyle = mortColor;
        ctx.lineWidth = 1.8;
        ctx.beginPath();
        ctx.moveTo(x + 2, y + 16); ctx.lineTo(x + TILE_SIZE - 2, y + 16);
        ctx.moveTo(x + 16, y + 2); ctx.lineTo(x + 16, y + 15);
        ctx.moveTo(x + 8, y + 17); ctx.lineTo(x + 8, y + TILE_SIZE - 2);
        ctx.moveTo(x + 24, y + 17); ctx.lineTo(x + 24, y + TILE_SIZE - 2);
        ctx.stroke();

    } else if (tile === 3 || tile === 4) {
        // === 4. BLOQUE '?' HOLOGRÁFICO CON SHIMMER ANIMADO ===
        ctx.fillStyle = 'rgba(0, 0, 0, 0.28)';
        ctx.fillRect(x + 2, y + TILE_SIZE, TILE_SIZE - 4, 5);

        let q1 = '#fef08a', q2 = '#f59e0b', q3 = '#b45309';
        if (theme === 'neon_cave') { q1 = '#e0f2fe'; q2 = '#00f2fe'; q3 = '#0369a1'; }
        else if (theme === 'ice') { q1 = '#ffffff'; q2 = '#38bdf8'; q3 = '#0284c7'; }
        else if (theme === 'lava_castle') { q1 = '#fef08a'; q2 = '#f97316'; q3 = '#dc2626'; }
        else if (theme === 'space') { q1 = '#f3e8ff'; q2 = '#a855f7'; q3 = '#6b21a8'; }

        const qGrad = ctx.createLinearGradient(x, y, x + TILE_SIZE, y + TILE_SIZE);
        qGrad.addColorStop(0, q1);
        qGrad.addColorStop(0.35, q2);
        qGrad.addColorStop(1, q3);
        ctx.fillStyle = qGrad;
        ctx.fillRect(x, y, TILE_SIZE, TILE_SIZE);

        // Shimmer diagonal de alta tecnología
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

        ctx.strokeStyle = 'rgba(0,0,0,0.4)';
        ctx.lineWidth = 1.5;
        ctx.strokeRect(x + 1, y + 1, TILE_SIZE - 2, TILE_SIZE - 2);

        // Remaches en las esquinas
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(x + 3, y + 3, 2, 2);
        ctx.fillRect(x + TILE_SIZE - 5, y + 3, 2, 2);
        ctx.fillRect(x + 3, y + TILE_SIZE - 5, 2, 2);
        ctx.fillRect(x + TILE_SIZE - 5, y + TILE_SIZE - 5, 2, 2);

        // Símbolo '?'
        ctx.save();
        ctx.fillStyle = '#ffffff';
        ctx.font = '900 20px monospace';
        ctx.shadowColor = q1;
        ctx.shadowBlur = 8;
        ctx.fillText('?', x + 9, y + 23);
        ctx.restore();

    } else if (tile >= 5 && tile <= 8) {
        // === 5. TUBERÍA METÁLICA TEMÁTICA SEGÚN EL MUNDO ===
        const pipeY = y + 6;
        const pipeH = TILE_SIZE - 6;

        let p1 = '#14532d', p2 = '#16a34a', p3 = '#86efac', p4 = '#052e16', ringColor = '#38bdf8';
        if (theme === 'desert') {
            p1 = '#78350f'; p2 = '#d97706'; p3 = '#fde047'; p4 = '#451a03'; ringColor = '#06b6d4';
        } else if (theme === 'neon_cave') {
            p1 = '#3b0764'; p2 = '#7c3aed'; p3 = '#c084fc'; p4 = '#1e1b4b'; ringColor = '#00f2fe';
        } else if (theme === 'ocean') {
            p1 = '#065f46'; p2 = '#0d9488'; p3 = '#5eead4'; p4 = '#042f2e'; ringColor = '#fbbf24';
        } else if (theme === 'ice') {
            p1 = '#0369a1'; p2 = '#0284c7'; p3 = '#bae6fd'; p4 = '#082f49'; ringColor = '#ffffff';
        } else if (theme === 'spooky_forest') {
            p1 = '#1e293b'; p2 = '#475569'; p3 = '#94a3b8'; p4 = '#020617'; ringColor = '#22c55e';
        } else if (theme === 'airship') {
            p1 = '#7c2d12'; p2 = '#c2410c'; p3 = '#fed7aa'; p4 = '#431407'; ringColor = '#f59e0b';
        } else if (theme === 'lava_castle') {
            p1 = '#450a0a'; p2 = '#991b1b'; p3 = '#f87171'; p4 = '#1c0202'; ringColor = '#f59e0b';
        } else if (theme === 'space') {
            p1 = '#1e1b4b'; p2 = '#4338ca'; p3 = '#a5b4fc'; p4 = '#020617'; ringColor = '#38bdf8';
        }

        const pipeGrad = ctx.createLinearGradient(x, 0, x + TILE_SIZE, 0);
        pipeGrad.addColorStop(0, p1);
        pipeGrad.addColorStop(0.18, p2);
        pipeGrad.addColorStop(0.35, p3);
        pipeGrad.addColorStop(0.65, p2);
        pipeGrad.addColorStop(1, p4);
        ctx.fillStyle = pipeGrad;
        ctx.fillRect(x, pipeY, TILE_SIZE, pipeH);

        // Collarín ensanchado
        ctx.fillRect(x - 1, pipeY, TILE_SIZE + 2, 7);

        // Anillo de luz en el collarín
        ctx.fillStyle = ringColor;
        ctx.fillRect(x + 2, pipeY + 7, TILE_SIZE - 4, 1.5);

        ctx.strokeStyle = p4;
        ctx.lineWidth = 1.2;
        ctx.strokeRect(x - 1, pipeY, TILE_SIZE + 2, 7);
        ctx.strokeRect(x, pipeY + 7, TILE_SIZE, pipeH - 7);

    } else if (tile === 9) {
        // === 6. LAVA FLUIDA ONDULANTE CON NÚCLEO INCANDESCENTE ===
        ctx.fillStyle = '#450a0a';
        ctx.fillRect(x, y, TILE_SIZE, TILE_SIZE);

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

        ctx.strokeStyle = '#fff7ed';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(x, y + 4 + wave1);
        ctx.quadraticCurveTo(x + 16, y + 2 + wave2, x + TILE_SIZE, y + 4 + wave1);
        ctx.stroke();

        const bubbleRise = (Date.now() * 0.003 + c) % 2;
        if (bubbleRise < 1) {
            ctx.fillStyle = '#fef08a';
            ctx.beginPath();
            ctx.arc(x + 14, y + 16 - bubbleRise * 8, 3 - bubbleRise * 1.5, 0, Math.PI * 2);
            ctx.fill();
        }

    } else if (tile === 12) {
        // === 7. BASE DE PISTA O PLATAFORMA DE LANZAMIENTO ===
        const stoneGrad = ctx.createLinearGradient(x, y, x + TILE_SIZE, y + TILE_SIZE);
        stoneGrad.addColorStop(0, '#334155');
        stoneGrad.addColorStop(0.5, '#1e293b');
        stoneGrad.addColorStop(1, '#0f172a');
        ctx.fillStyle = stoneGrad;
        ctx.fillRect(x, y, TILE_SIZE, TILE_SIZE);

        ctx.fillStyle = 'rgba(255, 255, 255, 0.2)';
        ctx.fillRect(x, y, TILE_SIZE, 2);
        ctx.fillRect(x, y, 2, TILE_SIZE);
        ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
        ctx.fillRect(x, y + TILE_SIZE - 2, TILE_SIZE, 2);
        ctx.fillRect(x + TILE_SIZE - 2, y, 2, TILE_SIZE);

        // Luz de guía en la pista
        ctx.fillStyle = '#38bdf8';
        ctx.fillRect(x + 12, y + 14, 8, 4);

    } else if (tile === 10) {
        // === 8. MÁSTIL DE META CROMADO ELEGANTE ===
        const mastGrad = ctx.createLinearGradient(x + 13, 0, x + 19, 0);
        mastGrad.addColorStop(0, '#334155');
        mastGrad.addColorStop(0.4, '#ffffff');
        mastGrad.addColorStop(0.7, '#94a3b8');
        mastGrad.addColorStop(1, '#1e293b');
        ctx.fillStyle = mastGrad;
        ctx.fillRect(x + 13, y, 6, TILE_SIZE);

        // Bola dorada superior con brillo
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

        // Pedestal en la base
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
// DIBUJO DE LA NAVE ESPACIAL DE ASTRO (SP-1 HUGO SP STUDIOS)
// ==========================================
function drawAstroSpaceship(sx, sy, angle = 0) {
    ctx.save();
    ctx.translate(Math.floor(sx + 28), Math.floor(sy + 18));
    ctx.rotate(angle);

    const isTakeoff = (spaceshipSequence.state === 'takeoff');
    const isWaiting = (spaceshipSequence.state === 'waiting');

    // 1. Chorro de Plasma de los Propulsores Gemelos
    if (isTakeoff) {
        const flamePulse = 18 + Math.random() * 14;

        // Propulsor superior
        const flameGradTop = ctx.createLinearGradient(-22, -5, -22 - flamePulse, -5);
        flameGradTop.addColorStop(0, '#ffffff');
        flameGradTop.addColorStop(0.25, '#38bdf8');
        flameGradTop.addColorStop(0.65, '#f97316');
        flameGradTop.addColorStop(1, 'rgba(239, 68, 68, 0)');
        ctx.fillStyle = flameGradTop;
        ctx.beginPath();
        ctx.moveTo(-20, -9);
        ctx.lineTo(-22 - flamePulse, -5);
        ctx.lineTo(-20, -1);
        ctx.closePath();
        ctx.fill();

        // Propulsor inferior
        const flameGradBot = ctx.createLinearGradient(-22, 7, -22 - flamePulse, 7);
        flameGradBot.addColorStop(0, '#ffffff');
        flameGradBot.addColorStop(0.25, '#38bdf8');
        flameGradBot.addColorStop(0.65, '#f97316');
        flameGradBot.addColorStop(1, 'rgba(239, 68, 68, 0)');
        ctx.fillStyle = flameGradBot;
        ctx.beginPath();
        ctx.moveTo(-20, 3);
        ctx.lineTo(-22 - flamePulse, 7);
        ctx.lineTo(-20, 11);
        ctx.closePath();
        ctx.fill();
    } else if (isWaiting) {
        // Tren de aterrizaje de titanio
        ctx.fillStyle = '#475569';
        ctx.fillRect(-14, 12, 4, 10);
        ctx.fillRect(8, 12, 4, 10);
        // Patines de apoyo magnéticos
        ctx.fillStyle = '#0ea5e9';
        ctx.fillRect(-18, 20, 12, 3);
        ctx.fillRect(4, 20, 12, 3);
    }

    // 2. Alas delta estabilizadoras
    ctx.fillStyle = '#0f172a';
    ctx.beginPath();
    ctx.moveTo(-16, -14);
    ctx.lineTo(8, -14);
    ctx.lineTo(14, 0);
    ctx.lineTo(8, 14);
    ctx.lineTo(-16, 14);
    ctx.lineTo(-8, 0);
    ctx.closePath();
    ctx.fill();

    // Luces LED de navegación
    const blink = Math.sin(Date.now() * 0.01) > 0;
    ctx.fillStyle = blink ? '#38bdf8' : '#0284c7';
    ctx.beginPath();
    ctx.arc(8, -14, 2, 0, Math.PI * 2);
    ctx.arc(8, 14, 2, 0, Math.PI * 2);
    ctx.fill();

    // 3. Toberas de propulsión cromadas
    ctx.fillStyle = '#334155';
    ctx.fillRect(-22, -9, 6, 7);
    ctx.fillRect(-22, 3, 6, 7);
    ctx.fillStyle = '#0ea5e9';
    ctx.fillRect(-18, -8, 2, 5);
    ctx.fillRect(-18, 4, 2, 5);

    // 4. Fuselaje aerodinámico de Titanio
    const bodyGrad = ctx.createLinearGradient(0, -12, 0, 12);
    bodyGrad.addColorStop(0, '#ffffff');
    bodyGrad.addColorStop(0.3, '#f1f5f9');
    bodyGrad.addColorStop(0.7, '#0284c7');
    bodyGrad.addColorStop(1, '#0c4a6e');

    ctx.fillStyle = bodyGrad;
    ctx.beginPath();
    ctx.moveTo(-18, -8);
    ctx.lineTo(10, -8);
    ctx.lineTo(26, 0);   // Morro aerodinámico
    ctx.lineTo(10, 8);
    ctx.lineTo(-18, 8);
    ctx.lineTo(-14, 0);
    ctx.closePath();
    ctx.fill();

    ctx.strokeStyle = '#38bdf8';
    ctx.lineWidth = 1.2;
    ctx.stroke();

    // Franja dorada de carreras estelar Hugo SP Studios
    ctx.fillStyle = '#f59e0b';
    ctx.fillRect(-8, -1, 18, 2);

    // 5. Cúpula de Cristal de la Cabina (Cockpit)
    const canopyGrad = ctx.createLinearGradient(-4, -8, 12, 2);
    canopyGrad.addColorStop(0, 'rgba(56, 189, 248, 0.85)');
    canopyGrad.addColorStop(0.6, 'rgba(14, 165, 233, 0.6)');
    canopyGrad.addColorStop(1, 'rgba(2, 132, 199, 0.35)');

    ctx.fillStyle = canopyGrad;
    ctx.beginPath();
    ctx.moveTo(-4, -6);
    ctx.lineTo(12, -6);
    ctx.lineTo(16, 0);
    ctx.lineTo(12, 3);
    ctx.lineTo(-4, 3);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 1;
    ctx.stroke();

    // Reflejo blanco en la carlinga
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.9)';
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.moveTo(-2, -5);
    ctx.lineTo(8, -5);
    ctx.stroke();

    // 6. Astro dentro de la cabina (cuando está a bordo)
    if (spaceshipSequence.astroBoarded) {
        // Casco de Astro pilotando visible tras el cristal
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(3, -2, 4.5, 0, Math.PI * 2);
        ctx.fill();
        // Visor holográfico azul/cian de Astro
        ctx.fillStyle = '#0ea5e9';
        ctx.beginPath();
        ctx.ellipse(4.5, -2, 2.5, 1.8, 0, 0, Math.PI * 2);
        ctx.fill();
        // Brillo del visor
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(4, -3, 2, 0.8);
    }

    // 7. Insignia "SP-1" estilizada
    ctx.save();
    ctx.font = 'bold 5px system-ui, sans-serif';
    ctx.fillStyle = '#fef08a';
    ctx.textAlign = 'center';
    ctx.fillText('SP-1', -4, 6);
    ctx.restore();

    ctx.restore();
}

// ==========================================
// DIBUJO DE ASTRO 2026 (AAA 2.5D CON ANATOMÍA ARTICULADA Y EFECTOS)
// ==========================================
function drawAstroModern() {
    const px = Math.floor(astro.x - cameraX);
    const py = Math.floor(astro.y);

    ctx.save();

    // 1. Parpadeo de invulnerabilidad tras recibir daño
    if (astro.invulnerableTimer > 0) {
        if (Math.floor(astro.invulnerableTimer / 3) % 2 === 0) {
            ctx.globalAlpha = 0.35;
        }
    }

    // 2. Squash, Stretch y Orientación
    const cx = px + astro.w / 2;
    const cy = py + astro.h / 2;

    if (astro.isDying) {
        ctx.translate(cx, cy);
        const spin = astro.deathTimer * 0.22;
        ctx.rotate(spin);
        ctx.translate(-cx, -cy);
    } else {
        ctx.translate(cx, py + astro.h);
        ctx.scale(astro.squash, astro.stretch);
        if (Math.abs(astro.vx) > 0.5) {
            const lean = (astro.vx > 0 ? 0.08 : -0.08);
            ctx.rotate(lean);
        }
        ctx.translate(-cx, -(py + astro.h));
    }

    if (astro.facing === 'left') {
        ctx.scale(-1, 1);
        ctx.translate(-px * 2 - astro.w, 0);
    }

    // Estados y paleta de colores de armadura de nueva generación
    const isSuper = (astro.state === 'super');
    const isPlasma = (astro.state === 'plasma');
    const isTransforming = (astro.transformationTimer > 0);
    const isMoving = Math.abs(astro.vx) > 0.3 && astro.isGrounded;
    const isJumping = !astro.isGrounded;
    const runCycle = isMoving ? (Date.now() * 0.016) : 0;
    const legSwing = Math.sin(runCycle) * 4.5;
    const armSwing = Math.cos(runCycle) * 4.5;

    let suitColor = '#f8fafc';       // Titanio blanco perlado
    let armorColor = '#0284c7';      // Azul espacial profundo
    let highlightColor = '#38bdf8';  // Cian neón
    let visorColor = '#0ea5e9';      // Visor cian holográfico
    let reactorColor = '#38bdf8';    // Reactor cian de serie

    if (isTransforming && Math.floor(astro.transformationTimer / 3) % 2 === 0) {
        suitColor = '#ffffff';
        armorColor = '#fde047';
        highlightColor = '#f59e0b';
        visorColor = '#fbbf24';
        reactorColor = '#fef08a';
    } else if (isSuper) {
        suitColor = '#fef08a';       // Oro estelar resplandeciente
        armorColor = '#eab308';      // Oro bruñido
        highlightColor = '#fbbf24';  // Amarillo solar
        visorColor = '#f59e0b';      // Ámbar reflectante
        reactorColor = '#fde047';
    } else if (isPlasma) {
        suitColor = '#ef4444';       // Exo-armadura carmesí
        armorColor = '#991b1b';      // Granate de combate
        highlightColor = '#f87171';  // Bermellón
        visorColor = '#38bdf8';      // Visor plasma cian
        reactorColor = '#f97316';    // Reactor fuego plasma
    }

    // 3. Estela holográfica ultranítida al esprintar a velocidad punta
    if (Math.abs(astro.vx) > 2.6) {
        ctx.save();
        ctx.globalAlpha = 0.22;
        ctx.fillStyle = highlightColor;
        ctx.beginPath();
        ctx.roundRect(px - (astro.vx > 0 ? 8 : -8), py + 2, astro.w, astro.h - 2, 6);
        ctx.fill();
        ctx.restore();
    }

    // 4. Aura de Poder & Partículas Orbitales (Super / Plasma)
    if (isSuper || isPlasma || isTransforming) {
        ctx.save();
        const auraPulse = Math.sin(Date.now() * 0.01) * 3 + (isSuper ? 8 : 6);
        ctx.strokeStyle = isSuper ? 'rgba(251, 191, 36, 0.75)' : 'rgba(56, 189, 248, 0.75)';
        ctx.lineWidth = 2.2;
        ctx.shadowColor = isSuper ? '#fbbf24' : '#38bdf8';
        ctx.shadowBlur = 10;
        ctx.beginPath();
        ctx.ellipse(px + astro.w / 2, py + astro.h / 2, astro.w / 2 + auraPulse, astro.h / 2 + auraPulse, 0, 0, Math.PI * 2);
        ctx.stroke();

        // Destellos de energía orbitando
        for (let s = 0; s < 3; s++) {
            const starAng = Date.now() * 0.005 + s * (Math.PI * 2 / 3);
            const sx = px + astro.w / 2 + Math.cos(starAng) * (astro.w / 2 + auraPulse + 2);
            const sy = py + astro.h / 2 + Math.sin(starAng) * (astro.h / 2 + auraPulse + 2);
            ctx.fillStyle = isSuper ? '#fef08a' : '#e0f2fe';
            ctx.fillRect(sx - 1.5, sy - 1.5, 3, 3);
        }
        ctx.restore();
    }

    // 5. JETPACK DUAL TRASERO CON BOQUILLAS CROMADAS Y LLAMA ANIMADA
    const jpX = px - 6;
    const jpY = py + 7;
    // Carcasa del cilindro del jetpack
    const jpGrad = ctx.createLinearGradient(jpX, jpY, jpX + 6, jpY);
    jpGrad.addColorStop(0, '#1e293b');
    jpGrad.addColorStop(0.5, '#475569');
    jpGrad.addColorStop(1, '#0f172a');
    ctx.fillStyle = jpGrad;
    ctx.beginPath();
    ctx.roundRect(jpX, jpY, 6, astro.h - 13, 2);
    ctx.fill();
    ctx.strokeStyle = '#64748b';
    ctx.lineWidth = 1;
    ctx.stroke();

    // Anillo de luz en el jetpack
    ctx.fillStyle = highlightColor;
    ctx.fillRect(jpX + 1, jpY + 4, 4, 1.5);

    // Boquilla inferior del propulsor
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(jpX + 1, jpY + astro.h - 13, 4, 3);

    // Llamas de propulsión activas (en el aire o corriendo)
    if (isJumping || Math.abs(astro.vx) > 2.0) {
        const flameFlicker = Math.sin(Date.now() * 0.035) * 3;
        const flameLen = (isJumping ? 12 : 7) + flameFlicker;
        const flameGrad = ctx.createLinearGradient(jpX + 3, jpY + astro.h - 10, jpX + 3, jpY + astro.h - 10 + flameLen);
        flameGrad.addColorStop(0, '#ffffff');
        flameGrad.addColorStop(0.25, isPlasma ? '#f97316' : '#38bdf8');
        flameGrad.addColorStop(0.7, isPlasma ? '#ef4444' : '#0284c7');
        flameGrad.addColorStop(1, 'rgba(2, 132, 199, 0)');
        ctx.fillStyle = flameGrad;
        ctx.beginPath();
        ctx.moveTo(jpX + 1, jpY + astro.h - 10);
        ctx.lineTo(jpX + 5, jpY + astro.h - 10);
        ctx.lineTo(jpX + 3, jpY + astro.h - 10 + flameLen);
        ctx.closePath();
        ctx.fill();

        // Emisión de micro-chispas de propulsión estilo RTX
        if (particles.length < 120 && Math.random() < 0.4) {
            particles.push({
                x: jpX + cameraX + 3,
                y: jpY + astro.h - 10 + flameLen,
                vx: (Math.random() - 0.5) * 1.6 - (astro.vx * 0.2),
                vy: Math.random() * 2 + 1.2,
                color: isPlasma ? '#f97316' : '#38bdf8',
                life: 14,
                size: 2.4
            });
        }
    }

    // Polvo cinemático en las botas al correr a gran velocidad
    if (isMoving && Math.random() < 0.25 && particles.length < 120) {
        particles.push({
            x: px + cameraX + (astro.facing === 'left' ? astro.w : 0),
            y: py + astro.h - 2,
            vx: (astro.facing === 'left' ? 1 : -1) * (Math.random() * 1.6 + 0.4),
            vy: -Math.random() * 1.2,
            color: 'rgba(255, 255, 255, 0.6)',
            life: 14,
            size: 3
        });
    }

    // 6. PIERNAS Y BOTAS CIBERNÉTICAS ARTICULADAS (PASO NATURAL)
    const legY = py + astro.h - 9;
    // Pierna trasera (izquierda en perspectiva)
    ctx.fillStyle = armorColor;
    ctx.fillRect(px + 2, legY - (isMoving ? legSwing * 0.6 : 0), 6, 6);
    // Bota trasera con suela amortiguadora
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(px + 1, legY + 5 - (isMoving ? legSwing : 0), 7, 4);
    ctx.fillStyle = highlightColor;
    ctx.fillRect(px + 1, legY + 8 - (isMoving ? legSwing : 0), 7, 1.2); // Tira de neón en la suela

    // Pierna delantera (derecha en perspectiva)
    ctx.fillStyle = suitColor;
    ctx.fillRect(px + astro.w - 8, legY + (isMoving ? legSwing * 0.6 : 0), 6, 6);
    // Bota delantera reforzada
    ctx.fillStyle = armorColor;
    ctx.fillRect(px + astro.w - 9, legY + 5 + (isMoving ? legSwing : 0), 8, 4);
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(px + astro.w - 9, legY + 8 + (isMoving ? legSwing : 0), 8, 2);
    ctx.fillStyle = highlightColor;
    ctx.fillRect(px + astro.w - 9, legY + 9 + (isMoving ? legSwing : 0), 8, 1.2); // Tira neón delantera

    // 7. TORSO CON CORAZA DE VOLUMEN 2.5D Y HOMBRERAS METÁLICAS
    const chestX = px + 1;
    const chestY = py + 11;
    const chestW = astro.w - 2;
    const chestH = astro.h - 18;

    const chestGrad = ctx.createLinearGradient(chestX, chestY, chestX + chestW, chestY + chestH);
    chestGrad.addColorStop(0, suitColor);
    chestGrad.addColorStop(0.55, suitColor);
    chestGrad.addColorStop(1, armorColor);
    ctx.fillStyle = chestGrad;
    ctx.beginPath();
    ctx.roundRect(chestX, chestY, chestW, chestH, 5);
    ctx.fill();
    ctx.strokeStyle = armorColor;
    ctx.lineWidth = 1.2;
    ctx.stroke();

    // Hombrera aerodinámica
    ctx.fillStyle = armorColor;
    ctx.beginPath();
    ctx.ellipse(chestX + 3, chestY + 2, 4.5, 3.5, -0.2, 0, Math.PI * 2);
    ctx.ellipse(chestX + chestW - 3, chestY + 2, 4.5, 3.5, 0.2, 0, Math.PI * 2);
    ctx.fill();

    // Cinturón táctico con módulo de batería
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(chestX, chestY + chestH - 3, chestW, 3);
    ctx.fillStyle = highlightColor;
    ctx.fillRect(chestX + chestW / 2 - 2, chestY + chestH - 3, 4, 3); // Hebilla iluminada

    // REACTOR DE PECHO ARC-CORE RESPLANDECIENTE Y EMBLEMA DE ESTRELLA
    const rcX = chestX + chestW / 2;
    const rcY = chestY + chestH / 2 - 1;
    const rcPulse = Math.sin(Date.now() * 0.008) * 0.5 + 2.8;
    const rcGrad = ctx.createRadialGradient(rcX, rcY, 0.5, rcX, rcY, rcPulse + 2);
    rcGrad.addColorStop(0, '#ffffff');
    rcGrad.addColorStop(0.4, reactorColor);
    rcGrad.addColorStop(1, 'rgba(56, 189, 248, 0)');
    ctx.fillStyle = rcGrad;
    ctx.beginPath();
    ctx.arc(rcX, rcY, rcPulse + 1.5, 0, Math.PI * 2);
    ctx.fill();

    // Emblema Hugo SP Star en el pecho
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(rcX - 1, rcY - 1, 2, 2);

    // 8. BRAZOS Y MANOS CON ARMAS O GUANTES
    if (isPlasma) {
        // CAÑÓN DE PLASMA MONTADO EN EL BRAZO
        const cannonX = px + astro.w - 2;
        const cannonY = py + 12;
        // Chasis del cañón con bisel metálico
        ctx.fillStyle = '#0f172a';
        ctx.beginPath();
        ctx.roundRect(cannonX, cannonY, 12, 7.5, 2.5);
        ctx.fill();
        ctx.strokeStyle = '#38bdf8';
        ctx.lineWidth = 1.2;
        ctx.stroke();

        // Bobinas de aceleración de plasma luminiscentes
        const coilGlow = Math.sin(Date.now() * 0.02) * 0.3 + 0.7;
        ctx.fillStyle = `rgba(56, 189, 248, ${coilGlow})`;
        ctx.fillRect(cannonX + 2, cannonY + 1.5, 2.5, 4.5);
        ctx.fillRect(cannonX + 6, cannonY + 1.5, 2.5, 4.5);

        // Boca del cañón con chispa de carga lista y arco voltaico
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(cannonX + 10, cannonY + 2, 2, 3.5);
        const sparkPulse = Math.sin(Date.now() * 0.025) * 1.8 + 2.5;
        ctx.fillStyle = '#38bdf8';
        ctx.shadowColor = '#00f0ff';
        ctx.shadowBlur = 6;
        ctx.beginPath();
        ctx.arc(cannonX + 12, cannonY + 3.8, sparkPulse, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;
    } else {
        // Brazo y guantelete espacial clásico oscilante
        const armX = px + astro.w - 4;
        const armY = py + 13 + (isMoving ? armSwing : 0);
        ctx.fillStyle = suitColor;
        ctx.beginPath();
        ctx.roundRect(armX, armY, 5, 7, 2);
        ctx.fill();
        // Guantelete astronauta con nudillos protegidos
        ctx.fillStyle = armorColor;
        ctx.fillRect(armX, armY + 5, 5, 4);
        ctx.fillStyle = highlightColor;
        ctx.fillRect(armX + 1, armY + 6, 3, 1.5);
    }

    // 9. CASCO ESPACIAL REDONDEADO Y VISOR NANO-CRISTAL 3D
    const headCX = px + astro.w / 2;
    const headCY = py + 7;
    const headR = 8.5;

    // Escudo esférico del casco con degradado de luz superior
    const helmetGrad = ctx.createRadialGradient(headCX - 2.5, headCY - 3, 1, headCX, headCY, headR);
    helmetGrad.addColorStop(0, '#ffffff');
    helmetGrad.addColorStop(0.4, suitColor);
    helmetGrad.addColorStop(0.85, armorColor);
    helmetGrad.addColorStop(1, '#0f172a');
    ctx.fillStyle = helmetGrad;
    ctx.beginPath();
    ctx.arc(headCX, headCY, headR, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = armorColor;
    ctx.lineWidth = 1.2;
    ctx.stroke();

    // Antena lateral de telecomunicaciones con luz LED parpadeante
    ctx.fillStyle = '#475569';
    ctx.fillRect(headCX - headR + 1, headCY - 7, 2, 6);
    const ledBlink = Math.sin(Date.now() * 0.007) > 0;
    ctx.fillStyle = ledBlink ? highlightColor : '#0f172a';
    ctx.fillRect(headCX - headR, headCY - 8, 3, 2);

    // VISOR DE CRISTAL REFLECTANTE Y PANTALLA HUD INTERNA
    const visorW = 6.8;
    const visorH = 5.2;
    const visorCX = headCX + 1.2;
    const visorCY = headCY;

    // Fondo oscuro del visor
    ctx.fillStyle = '#020617';
    ctx.beginPath();
    ctx.ellipse(visorCX, visorCY, visorW, visorH, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = armorColor;
    ctx.lineWidth = 1;
    ctx.stroke();

    if (astro.isDying) {
        // Ojos de derrota cómica "X X" en el visor
        ctx.fillStyle = '#f87171';
        ctx.font = 'bold 6px monospace';
        ctx.textAlign = 'center';
        ctx.fillText('X', visorCX - 2, visorCY + 2);
        ctx.fillText('X', visorCX + 2.5, visorCY + 2);
    } else if (astro.invulnerableTimer > 0) {
        // Ojos mareados en espiral "@ @" tras recibir impacto
        ctx.fillStyle = '#fde047';
        ctx.font = 'bold 5px monospace';
        ctx.textAlign = 'center';
        ctx.fillText('@', visorCX - 2, visorCY + 2);
        ctx.fillText('@', visorCX + 2.5, visorCY + 2);
    } else {
        // OJOS EXPRESIVOS DIGITALES CON VIDA (PARPADEO Y EMOCIÓN)
        const isBlinking = ((Date.now() % 3600) < 140);
        if (isBlinking) {
            // Ojos parpadeando (líneas cian dormilonas)
            ctx.fillStyle = visorColor;
            ctx.fillRect(visorCX - 3, visorCY, 3, 1);
            ctx.fillRect(visorCX + 1, visorCY, 3, 1);
        } else if (Math.abs(astro.vx) > 2.2) {
            // Ojos entusiastas y alegres en velocidad punta (^ ^)
            ctx.strokeStyle = visorColor;
            ctx.lineWidth = 1.3;
            ctx.beginPath();
            ctx.moveTo(visorCX - 3, visorCY + 1); ctx.lineTo(visorCX - 1.5, visorCY - 1); ctx.lineTo(visorCX, visorCY + 1);
            ctx.moveTo(visorCX + 1, visorCY + 1); ctx.lineTo(visorCX + 2.5, visorCY - 1); ctx.lineTo(visorCX + 4, visorCY + 1);
            ctx.stroke();
        } else {
            // Ojos grandes adorables de robot / anime con destello de luz
            ctx.fillStyle = visorColor;
            ctx.beginPath();
            ctx.ellipse(visorCX - 1.8, visorCY, 1.8, 2.6, 0, 0, Math.PI * 2);
            ctx.ellipse(visorCX + 2.4, visorCY, 1.8, 2.6, 0, 0, Math.PI * 2);
            ctx.fill();

            // Reflejo blanco en las pupilas
            ctx.fillStyle = '#ffffff';
            ctx.fillRect(visorCX - 2.5, visorCY - 1.8, 1.2, 1.2);
            ctx.fillRect(visorCX + 1.7, visorCY - 1.8, 1.2, 1.2);

            // Línea de escaneo HUD dinámica sutil
            const scanY = visorCY - 1.5 + Math.sin(Date.now() * 0.008) * 1.5;
            ctx.fillStyle = 'rgba(255, 255, 255, 0.45)';
            ctx.fillRect(visorCX - 2, scanY, 5, 0.6);
        }
    }

    // Reflejo especular blanco curvado de cristal en la esquina superior del visor
    ctx.fillStyle = 'rgba(255, 255, 255, 0.75)';
    ctx.beginPath();
    ctx.ellipse(visorCX - 2, visorCY - 2, 2.5, 1.2, -0.4, 0, Math.PI * 2);
    ctx.fill();

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

    // Emblema central de estrella cuando está de frente y destello
    if (coinW > 4) {
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(x + 7, y + 6, 2, 4);
        const glint = (Date.now() * 0.008 + x) % (Math.PI * 2);
        if (glint < 1.2) {
            ctx.fillStyle = '#ffffff';
            ctx.fillRect(x + 12, y + 3, 3, 1);
            ctx.fillRect(x + 13, y + 2, 1, 3);
        }
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
        // GOOMBA SUPREMO (PERSONALIZADO AL 100% PARA CADA UNO DE LOS 9 MUNDOS)
        // ==========================================
        ctx.save();

        const leftFootY = y + 15 - (walkCycle > 0 ? walkCycle * 3.2 : 0);
        const rightFootY = y + 15 - (walkCycle < 0 ? -walkCycle * 3.2 : 0);

        if (theme === 'desert') {
            // --- MUNDO 2: GOOMBA MOMIA DEL DESIERTO (Vendajes antiguos, cinta de faraón y ojos de zafiro) ---
            ctx.fillStyle = '#78350f';
            ctx.beginPath();
            ctx.ellipse(x + 5, leftFootY + 3, 5, 3.5, -0.15, 0, Math.PI * 2);
            ctx.ellipse(x + 16, rightFootY + 3, 5, 3.5, 0.15, 0, Math.PI * 2);
            ctx.fill();

            // Tallo vendado
            ctx.fillStyle = '#fde68a';
            ctx.beginPath();
            ctx.ellipse(x + 11, y + 13, 7.5, 6.5, 0, 0, Math.PI * 2);
            ctx.fill();
            ctx.strokeStyle = '#b45309';
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(x + 5, y + 12); ctx.lineTo(x + 17, y + 14);
            ctx.stroke();

            // Cabeza momia
            ctx.fillStyle = '#d97706';
            ctx.beginPath();
            ctx.moveTo(x + 2, y + 10);
            ctx.quadraticCurveTo(x + 2, y - 2, x + 11, y - 1);
            ctx.quadraticCurveTo(x + 20, y - 2, x + 20, y + 10);
            ctx.quadraticCurveTo(x + 11, y + 12, x + 2, y + 10);
            ctx.fill();

            // Tiras de vendaje faraónico
            ctx.strokeStyle = '#fef3c7';
            ctx.lineWidth = 1.4;
            ctx.beginPath();
            ctx.moveTo(x + 3, y + 3); ctx.lineTo(x + 19, y + 5);
            ctx.moveTo(x + 2, y + 7); ctx.lineTo(x + 20, y + 8);
            ctx.stroke();

            // Diadema real egipcia oro y turquesa
            ctx.fillStyle = '#06b6d4';
            ctx.fillRect(x + 5, y - 1, 12, 2.5);
            ctx.fillStyle = '#fbbf24';
            ctx.fillRect(x + 9, y - 2, 4, 3.5);

            // Ojos de zafiro brillantes
            ctx.fillStyle = '#38bdf8';
            ctx.beginPath();
            ctx.ellipse(x + 7.5, y + 8.5, 2.5, 2.5, 0, 0, Math.PI * 2);
            ctx.ellipse(x + 14.5, y + 8.5, 2.5, 2.5, 0, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillStyle = '#ffffff';
            ctx.fillRect(x + 8, y + 7.5, 1.2, 1.2);
            ctx.fillRect(x + 15, y + 7.5, 1.2, 1.2);

        } else if (theme === 'neon_cave') {
            // --- MUNDO 3: CYBER GOOMBA CRISTALINO (Obsidiana con cuernos de cristal neón y visor cibernético) ---
            ctx.fillStyle = '#3b0764';
            ctx.beginPath();
            ctx.ellipse(x + 5, leftFootY + 3, 5, 3.5, -0.15, 0, Math.PI * 2);
            ctx.ellipse(x + 16, rightFootY + 3, 5, 3.5, 0.15, 0, Math.PI * 2);
            ctx.fill();

            // Tallo cibernético
            ctx.fillStyle = '#581c87';
            ctx.beginPath();
            ctx.ellipse(x + 11, y + 13, 7.5, 6.5, 0, 0, Math.PI * 2);
            ctx.fill();

            // Cabeza obsidiana
            const capGrad = ctx.createLinearGradient(x + 2, y, x + 20, y + 10);
            capGrad.addColorStop(0, '#701a75');
            capGrad.addColorStop(0.5, '#4a044e');
            capGrad.addColorStop(1, '#1e1b4b');
            ctx.fillStyle = capGrad;
            ctx.beginPath();
            ctx.moveTo(x + 2, y + 10);
            ctx.quadraticCurveTo(x + 2, y - 2, x + 11, y - 1);
            ctx.quadraticCurveTo(x + 20, y - 2, x + 20, y + 10);
            ctx.quadraticCurveTo(x + 11, y + 12, x + 2, y + 10);
            ctx.fill();

            // Cuernos de cristal neón cyan y magenta
            ctx.fillStyle = '#06b6d4';
            ctx.beginPath();
            ctx.moveTo(x + 5, y + 1); ctx.lineTo(x + 3, y - 5); ctx.lineTo(x + 8, y);
            ctx.fill();
            ctx.fillStyle = '#f43f5e';
            ctx.beginPath();
            ctx.moveTo(x + 14, y); ctx.lineTo(x + 19, y - 5); ctx.lineTo(x + 17, y + 1);
            ctx.fill();

            // Visor cibernético horizontal resplandeciente
            ctx.fillStyle = '#00f0ff';
            ctx.shadowColor = '#00f0ff';
            ctx.shadowBlur = 6;
            ctx.fillRect(x + 4, y + 7, 14, 3.5);
            ctx.shadowBlur = 0;
            ctx.fillStyle = '#ffffff';
            ctx.fillRect(x + 9, y + 8, 4, 1.5);

        } else if (theme === 'ocean') {
            // --- MUNDO 4: GOOMBA COCO TROPICAL PIRATA (Coco con bandana pirata y flor hawaiana) ---
            // Un pie normal y una pata de palo de madera
            ctx.fillStyle = '#713f12';
            ctx.beginPath();
            ctx.ellipse(x + 5, leftFootY + 3, 5, 3.5, -0.15, 0, Math.PI * 2);
            ctx.fill();
            // Pata de palo
            ctx.fillStyle = '#b45309';
            ctx.fillRect(x + 15, rightFootY + 1, 3, 6);
            ctx.fillStyle = '#fbbf24';
            ctx.fillRect(x + 14.5, rightFootY + 6, 4, 1.5);

            // Tallo coco
            ctx.fillStyle = '#fef3c7';
            ctx.beginPath();
            ctx.ellipse(x + 11, y + 13, 7.5, 6.5, 0, 0, Math.PI * 2);
            ctx.fill();

            // Sombrero con cáscara de coco
            const cocoGrad = ctx.createRadialGradient(x + 11, y + 4, 2, x + 11, y + 6, 11);
            cocoGrad.addColorStop(0, '#92400e');
            cocoGrad.addColorStop(1, '#451a03');
            ctx.fillStyle = cocoGrad;
            ctx.beginPath();
            ctx.moveTo(x + 2, y + 10);
            ctx.quadraticCurveTo(x + 2, y - 2, x + 11, y - 1);
            ctx.quadraticCurveTo(x + 20, y - 2, x + 20, y + 10);
            ctx.quadraticCurveTo(x + 11, y + 12, x + 2, y + 10);
            ctx.fill();

            // Bandana pirata roja y blanca
            ctx.fillStyle = '#dc2626';
            ctx.beginPath();
            ctx.moveTo(x + 2, y + 4); ctx.lineTo(x + 20, y + 4);
            ctx.lineTo(x + 19, y + 7); ctx.lineTo(x + 3, y + 7);
            ctx.fill();
            ctx.fillStyle = '#ffffff';
            ctx.fillRect(x + 6, y + 5, 2, 2);
            ctx.fillRect(x + 14, y + 5, 2, 2);

            // Parche en el ojo izquierdo y ojo derecho alegre
            ctx.fillStyle = '#18181b';
            ctx.beginPath();
            ctx.arc(x + 7.5, y + 9.5, 2.5, 0, Math.PI * 2);
            ctx.fill();
            ctx.strokeStyle = '#18181b';
            ctx.lineWidth = 1;
            ctx.beginPath(); ctx.moveTo(x + 4, y + 7); ctx.lineTo(x + 10, y + 12); ctx.stroke();

            // Ojo derecho con brillo azul marino
            ctx.fillStyle = '#ffffff';
            ctx.beginPath();
            ctx.arc(x + 14.5, y + 9.5, 2.5, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillStyle = '#0284c7';
            ctx.beginPath();
            ctx.arc(x + 14.5, y + 9.5, 1.5, 0, Math.PI * 2);
            ctx.fill();

        } else if (theme === 'ice') {
            // --- MUNDO 5: YETI GOOMBA GLACIAL (Pelaje blanco ártico, orejeras de nieve y escarcha) ---
            ctx.fillStyle = '#0369a1';
            ctx.beginPath();
            ctx.ellipse(x + 5, leftFootY + 3, 5, 3.5, -0.15, 0, Math.PI * 2);
            ctx.ellipse(x + 16, rightFootY + 3, 5, 3.5, 0.15, 0, Math.PI * 2);
            ctx.fill();

            // Tallo nevado
            ctx.fillStyle = '#e0f2fe';
            ctx.beginPath();
            ctx.ellipse(x + 11, y + 13, 7.5, 6.5, 0, 0, Math.PI * 2);
            ctx.fill();

            // Sombrero azul hielo
            const iceGrad = ctx.createLinearGradient(x + 11, y - 2, x + 11, y + 10);
            iceGrad.addColorStop(0, '#7dd3fc');
            iceGrad.addColorStop(1, '#0284c7');
            ctx.fillStyle = iceGrad;
            ctx.beginPath();
            ctx.moveTo(x + 2, y + 10);
            ctx.quadraticCurveTo(x + 2, y - 2, x + 11, y - 1);
            ctx.quadraticCurveTo(x + 20, y - 2, x + 20, y + 10);
            ctx.quadraticCurveTo(x + 11, y + 12, x + 2, y + 10);
            ctx.fill();

            // Borde de pelaje blanco esponjoso de yeti
            ctx.fillStyle = '#ffffff';
            ctx.beginPath();
            for (let fx = x + 2; fx <= x + 20; fx += 3) {
                ctx.arc(fx, y + 10, 2, 0, Math.PI * 2);
            }
            ctx.fill();

            // Orejeras de invierno en los laterales
            ctx.fillStyle = '#38bdf8';
            ctx.beginPath();
            ctx.arc(x + 2, y + 4, 3, 0, Math.PI * 2);
            ctx.arc(x + 20, y + 4, 3, 0, Math.PI * 2);
            ctx.fill();
            ctx.strokeStyle = '#bae6fd';
            ctx.lineWidth = 1.5;
            ctx.beginPath();
            ctx.arc(x + 11, y + 2, 8, Math.PI, 0);
            ctx.stroke();

            // Ojos con brillo de hielo
            ctx.fillStyle = '#ffffff';
            ctx.fillRect(x + 6, y + 7, 3, 4);
            ctx.fillRect(x + 13, y + 7, 3, 4);
            ctx.fillStyle = '#0c4a6e';
            ctx.fillRect(x + 7, y + 8, 2, 3);
            ctx.fillRect(x + 14, y + 8, 2, 3);

        } else if (theme === 'spooky_forest') {
            // --- MUNDO 6: JACK-O'-GOOMBA FANTASMAL (Calabaza espectral púrpura con rostro tallado ardiente) ---
            ctx.fillStyle = '#1e1b4b';
            ctx.beginPath();
            ctx.ellipse(x + 5, leftFootY + 3, 5, 3.5, -0.15, 0, Math.PI * 2);
            ctx.ellipse(x + 16, rightFootY + 3, 5, 3.5, 0.15, 0, Math.PI * 2);
            ctx.fill();

            // Tallo oscuro espectral
            ctx.fillStyle = '#475569';
            ctx.beginPath();
            ctx.ellipse(x + 11, y + 13, 7.5, 6.5, 0, 0, Math.PI * 2);
            ctx.fill();

            // Cabeza calabaza sombría púrpura
            ctx.fillStyle = '#3b0764';
            ctx.beginPath();
            ctx.moveTo(x + 2, y + 10);
            ctx.quadraticCurveTo(x + 2, y - 2, x + 11, y - 1);
            ctx.quadraticCurveTo(x + 20, y - 2, x + 20, y + 10);
            ctx.quadraticCurveTo(x + 11, y + 12, x + 2, y + 10);
            ctx.fill();

            // Tallo retorcido de calabaza
            ctx.fillStyle = '#84cc16';
            ctx.fillRect(x + 10, y - 4, 2.5, 4);

            // Ojos tallados triangulares resplandecientes en fuego ámbar
            ctx.fillStyle = '#fbbf24';
            ctx.shadowColor = '#f97316';
            ctx.shadowBlur = 5;
            ctx.beginPath();
            ctx.moveTo(x + 6, y + 6); ctx.lineTo(x + 9, y + 8); ctx.lineTo(x + 5, y + 9); ctx.fill();
            ctx.beginPath();
            ctx.moveTo(x + 16, y + 6); ctx.lineTo(x + 13, y + 8); ctx.lineTo(x + 17, y + 9); ctx.fill();

            // Boca siniestra tallada en zigzag con luz interior
            ctx.beginPath();
            ctx.moveTo(x + 6, y + 12);
            ctx.lineTo(x + 8, y + 14); ctx.lineTo(x + 11, y + 12);
            ctx.lineTo(x + 14, y + 14); ctx.lineTo(x + 16, y + 12);
            ctx.stroke();
            ctx.shadowBlur = 0;

        } else if (theme === 'airship') {
            // --- MUNDO 7: AVIADOR STEAMPUNK GOOMBA (Casco de cuero, gafas de aviador y tubo de vapor) ---
            ctx.fillStyle = '#292524';
            ctx.beginPath();
            ctx.ellipse(x + 5, leftFootY + 3, 5, 3.5, -0.15, 0, Math.PI * 2);
            ctx.ellipse(x + 16, rightFootY + 3, 5, 3.5, 0.15, 0, Math.PI * 2);
            ctx.fill();

            ctx.fillStyle = '#fed7aa';
            ctx.beginPath();
            ctx.ellipse(x + 11, y + 13, 7.5, 6.5, 0, 0, Math.PI * 2);
            ctx.fill();

            // Casco de cuero de piloto
            ctx.fillStyle = '#44403c';
            ctx.beginPath();
            ctx.moveTo(x + 2, y + 10);
            ctx.quadraticCurveTo(x + 2, y - 2, x + 11, y - 1);
            ctx.quadraticCurveTo(x + 20, y - 2, x + 20, y + 10);
            ctx.quadraticCurveTo(x + 11, y + 12, x + 2, y + 10);
            ctx.fill();

            // Tubo de escape de latón con humo
            ctx.fillStyle = '#b45309';
            ctx.fillRect(x + 14, y - 4, 3, 5);
            ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
            ctx.beginPath();
            ctx.arc(x + 15.5, y - 6, 2, 0, Math.PI * 2);
            ctx.fill();

            // Gafas de aviador de latón y lentes brillantes
            ctx.fillStyle = '#d97706';
            ctx.fillRect(x + 3, y + 4, 16, 5);
            ctx.fillStyle = '#38bdf8';
            ctx.beginPath();
            ctx.ellipse(x + 7, y + 6.5, 3, 2.5, 0, 0, Math.PI * 2);
            ctx.ellipse(x + 15, y + 6.5, 3, 2.5, 0, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillStyle = '#ffffff';
            ctx.fillRect(x + 6, y + 5.5, 2, 1);
            ctx.fillRect(x + 14, y + 5.5, 2, 1);

        } else if (theme === 'lava_castle') {
            // --- MUNDO 8: GOOMBA DE MAGMA VOLCÁNICO (Roca ígnea negra con grietas de lava incandescente) ---
            ctx.fillStyle = '#09090b';
            ctx.beginPath();
            ctx.ellipse(x + 5, leftFootY + 3, 5, 3.5, -0.15, 0, Math.PI * 2);
            ctx.ellipse(x + 16, rightFootY + 3, 5, 3.5, 0.15, 0, Math.PI * 2);
            ctx.fill();

            ctx.fillStyle = '#450a0a';
            ctx.beginPath();
            ctx.ellipse(x + 11, y + 13, 7.5, 6.5, 0, 0, Math.PI * 2);
            ctx.fill();

            // Sombrero roca de basalto negro
            ctx.fillStyle = '#18181b';
            ctx.beginPath();
            ctx.moveTo(x + 2, y + 10);
            ctx.quadraticCurveTo(x + 2, y - 2, x + 11, y - 1);
            ctx.quadraticCurveTo(x + 20, y - 2, x + 20, y + 10);
            ctx.quadraticCurveTo(x + 11, y + 12, x + 2, y + 10);
            ctx.fill();

            // Grietas de lava fundida al rojo vivo
            ctx.strokeStyle = '#ef4444';
            ctx.lineWidth = 1.6;
            ctx.shadowColor = '#f59e0b';
            ctx.shadowBlur = 6;
            ctx.beginPath();
            ctx.moveTo(x + 4, y + 2); ctx.lineTo(x + 8, y + 5); ctx.lineTo(x + 11, y + 3);
            ctx.moveTo(x + 14, y + 2); ctx.lineTo(x + 12, y + 6); ctx.lineTo(x + 18, y + 5);
            ctx.stroke();
            ctx.shadowBlur = 0;

            // Ojos de fuego amarillo ardiente
            ctx.fillStyle = '#fef08a';
            ctx.beginPath();
            ctx.arc(x + 7.5, y + 9.5, 2.5, 0, Math.PI * 2);
            ctx.arc(x + 14.5, y + 9.5, 2.5, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillStyle = '#dc2626';
            ctx.fillRect(x + 7, y + 8.5, 1.5, 2);
            ctx.fillRect(x + 14, y + 8.5, 1.5, 2);

        } else if (theme === 'space') {
            // --- MUNDO 9: ALIEN ASTRONAUTA GOOMBA (Casco espacial de cristal y antena cósmica) ---
            ctx.fillStyle = '#312e81';
            ctx.beginPath();
            ctx.ellipse(x + 5, leftFootY + 3, 5, 3.5, -0.15, 0, Math.PI * 2);
            ctx.ellipse(x + 16, rightFootY + 3, 5, 3.5, 0.15, 0, Math.PI * 2);
            ctx.fill();

            ctx.fillStyle = '#581c87';
            ctx.beginPath();
            ctx.ellipse(x + 11, y + 13, 7.5, 6.5, 0, 0, Math.PI * 2);
            ctx.fill();

            // Cabeza alienígena violeta
            ctx.fillStyle = '#7c3aed';
            ctx.beginPath();
            ctx.moveTo(x + 2, y + 10);
            ctx.quadraticCurveTo(x + 2, y - 2, x + 11, y - 1);
            ctx.quadraticCurveTo(x + 20, y - 2, x + 20, y + 10);
            ctx.quadraticCurveTo(x + 11, y + 12, x + 2, y + 10);
            ctx.fill();

            // Antena plateada con sensor rojo
            ctx.strokeStyle = '#94a3b8';
            ctx.lineWidth = 1.5;
            ctx.beginPath();
            ctx.moveTo(x + 11, y - 1); ctx.lineTo(x + 11, y - 6);
            ctx.stroke();
            ctx.fillStyle = '#ef4444';
            ctx.beginPath();
            ctx.arc(x + 11, y - 7, 2, 0, Math.PI * 2);
            ctx.fill();

            // Cúpula esférica de escafandra de cristal espacial
            ctx.strokeStyle = 'rgba(147, 197, 253, 0.8)';
            ctx.lineWidth = 1.4;
            ctx.fillStyle = 'rgba(147, 197, 253, 0.22)';
            ctx.beginPath();
            ctx.ellipse(x + 11, y + 5, 10, 8, 0, 0, Math.PI * 2);
            ctx.fill();
            ctx.stroke();

            // Tres ojos alienígenas verdes fluorescentes
            ctx.fillStyle = '#84cc16';
            ctx.beginPath();
            ctx.arc(x + 6.5, y + 8, 1.8, 0, Math.PI * 2);
            ctx.arc(x + 11, y + 6.5, 2.2, 0, Math.PI * 2);
            ctx.arc(x + 15.5, y + 8, 1.8, 0, Math.PI * 2);
            ctx.fill();

        } else {
            // --- MUNDO 1: KOKIRI FOREST GOOMBA (Madera de roble, hoja verde natural y expresión vivaz) ---
            ctx.fillStyle = '#1e1b4b';
            ctx.beginPath();
            ctx.ellipse(x + 5, leftFootY + 3, 5, 3.5, -0.15, 0, Math.PI * 2);
            ctx.ellipse(x + 16, rightFootY + 3, 5, 3.5, 0.15, 0, Math.PI * 2);
            ctx.fill();

            // Tallo cremoso
            const stemGrad = ctx.createRadialGradient(x + 11, y + 12, 2, x + 11, y + 14, 9);
            stemGrad.addColorStop(0, '#ffedd5');
            stemGrad.addColorStop(1, '#fed7aa');
            ctx.fillStyle = stemGrad;
            ctx.beginPath();
            ctx.ellipse(x + 11, y + 13, 7.5, 6.5, 0, 0, Math.PI * 2);
            ctx.fill();

            // Sombrero clásico marrón bellota con degradado
            const capGrad = ctx.createRadialGradient(x + 9, y + 4, 2, x + 11, y + 8, 12);
            capGrad.addColorStop(0, '#f97316');
            capGrad.addColorStop(0.35, '#c2410c');
            capGrad.addColorStop(0.75, '#9a3412');
            capGrad.addColorStop(1, '#431407');
            ctx.fillStyle = capGrad;
            ctx.beginPath();
            ctx.moveTo(x + 2, y + 10);
            ctx.quadraticCurveTo(x + 2, y - 2, x + 11, y - 1);
            ctx.quadraticCurveTo(x + 20, y - 2, x + 20, y + 10);
            ctx.quadraticCurveTo(x + 11, y + 12, x + 2, y + 10);
            ctx.closePath();
            ctx.fill();

            // Hoja de Kokiri verde esmeralda prendida en la parte superior
            ctx.fillStyle = '#22c55e';
            ctx.beginPath();
            ctx.ellipse(x + 11, y - 2, 4.5, 2.2, 0.4, 0, Math.PI * 2);
            ctx.fill();
            ctx.strokeStyle = '#15803d';
            ctx.lineWidth = 0.8;
            ctx.stroke();

            // Cejas amenazantes
            ctx.strokeStyle = '#020617';
            ctx.lineWidth = 2.4;
            ctx.lineCap = 'round';
            ctx.beginPath();
            ctx.moveTo(x + 4, y + 5); ctx.lineTo(x + 10, y + 8);
            ctx.moveTo(x + 18, y + 5); ctx.lineTo(x + 12, y + 8);
            ctx.stroke();

            // Ojos expresivos con brillo
            ctx.fillStyle = '#ffffff';
            ctx.beginPath();
            ctx.ellipse(x + 7.5, y + 9.5, 2.5, 3.8, 0.1, 0, Math.PI * 2);
            ctx.ellipse(x + 14.5, y + 9.5, 2.5, 3.8, -0.1, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillStyle = '#020617';
            ctx.beginPath();
            ctx.arc(x + 8.5, y + 9.5, 1.7, 0, Math.PI * 2);
            ctx.arc(x + 13.5, y + 9.5, 1.7, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillStyle = '#ffffff';
            ctx.fillRect(x + 8, y + 8.5, 1, 1);
            ctx.fillRect(x + 13, y + 8.5, 1, 1);

            // Colmillos afilados
            ctx.fillStyle = '#ffffff';
            ctx.beginPath();
            ctx.moveTo(x + 6, y + 15); ctx.lineTo(x + 7.5, y + 12); ctx.lineTo(x + 9, y + 15);
            ctx.moveTo(x + 13, y + 15); ctx.lineTo(x + 14.5, y + 12); ctx.lineTo(x + 16, y + 15);
            ctx.fill();
        }

        ctx.restore();

    } else {
        // ==========================================
        // KOOPA TROOPA SUPREMO (PERSONALIZADO AL 100% PARA CADA UNO DE LOS 9 MUNDOS)
        // ==========================================
        ctx.save();

        const legFrontY = y + 14 - (walkCycle > 0 ? walkCycle * 2.8 : 0);
        const legBackY = y + 14 - (walkCycle < 0 ? -walkCycle * 2.8 : 0);

        // Pies y cabeza con colores específicos por mundo
        let skinColor = '#eab308';
        let skinTop = '#fef08a';
        let beakColor = '#f97316';
        let shellColor1 = '#4ade80';
        let shellColor2 = '#16a34a';
        let shellRim = '#ffffff';
        let eyeIris = '#0284c7';

        if (theme === 'desert') {
            skinColor = '#d97706'; skinTop = '#fde68a'; beakColor = '#b45309';
            shellColor1 = '#fbbf24'; shellColor2 = '#92400e'; shellRim = '#06b6d4'; eyeIris = '#0891b2';
        } else if (theme === 'neon_cave') {
            skinColor = '#475569'; skinTop = '#94a3b8'; beakColor = '#ec4899';
            shellColor1 = '#06b6d4'; shellColor2 = '#3b0764'; shellRim = '#d946ef'; eyeIris = '#00f0ff';
        } else if (theme === 'ocean') {
            skinColor = '#38bdf8'; skinTop = '#bae6fd'; beakColor = '#0284c7';
            shellColor1 = '#2dd4bf'; shellColor2 = '#0f766e'; shellRim = '#ccfbf1'; eyeIris = '#0e7490';
        } else if (theme === 'ice') {
            skinColor = '#7dd3fc'; skinTop = '#e0f2fe'; beakColor = '#0284c7';
            shellColor1 = '#bae6fd'; shellColor2 = '#0284c7'; shellRim = '#ffffff'; eyeIris = '#0369a1';
        } else if (theme === 'spooky_forest') {
            skinColor = '#cbd5e1'; skinTop = '#f1f5f9'; beakColor = '#64748b';
            shellColor1 = '#94a3b8'; shellColor2 = '#334155'; shellRim = '#f8fafc'; eyeIris = '#ef4444';
        } else if (theme === 'airship') {
            skinColor = '#b45309'; skinTop = '#fde047'; beakColor = '#78350f';
            shellColor1 = '#ea580c'; shellColor2 = '#78350f'; shellRim = '#fbbf24'; eyeIris = '#f59e0b';
        } else if (theme === 'lava_castle') {
            skinColor = '#7f1d1d'; skinTop = '#fca5a5'; beakColor = '#450a0a';
            shellColor1 = '#ef4444'; shellColor2 = '#18181b'; shellRim = '#f59e0b'; eyeIris = '#fbbf24';
        } else if (theme === 'space') {
            skinColor = '#6366f1'; skinTop = '#c7d2fe'; beakColor = '#4338ca';
            shellColor1 = '#a855f7'; shellColor2 = '#1e1b4b'; shellRim = '#38bdf8'; eyeIris = '#22c55e';
        }

        // Patas reptilianas
        ctx.fillStyle = skinColor;
        ctx.beginPath();
        ctx.ellipse(x + 4, legFrontY + 3, 4.5, 3.2, 0, 0, Math.PI * 2);
        ctx.ellipse(x + 16, legBackY + 3, 4.5, 3.2, 0, 0, Math.PI * 2);
        ctx.fill();

        // Uñas
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(x + 1, legFrontY + 2, 2, 2);
        ctx.fillRect(x + 13, legBackY + 2, 2, 2);

        // Caparazón esférico 3D
        const shellGrad = ctx.createRadialGradient(x + 9, y + 6, 2, x + 11, y + 9, 11);
        shellGrad.addColorStop(0, shellColor1);
        shellGrad.addColorStop(1, shellColor2);
        ctx.fillStyle = shellGrad;
        ctx.beginPath();
        ctx.ellipse(x + 10, y + 8.5, 9, 8, -0.1, 0, Math.PI * 2);
        ctx.fill();

        // Reborde acolchado / gema
        ctx.strokeStyle = shellRim;
        ctx.lineWidth = 2.2;
        ctx.stroke();

        // Detalles decorativos del caparazón por mundo
        if (theme === 'desert') {
            // Escarabajo alado / jeroglífico solar
            ctx.fillStyle = '#fbbf24';
            ctx.beginPath();
            ctx.arc(x + 10, y + 8.5, 3, 0, Math.PI * 2);
            ctx.fill();
        } else if (theme === 'neon_cave') {
            // Circuito neón
            ctx.strokeStyle = '#00f0ff';
            ctx.lineWidth = 1.2;
            ctx.beginPath();
            ctx.moveTo(x + 7, y + 6); ctx.lineTo(x + 10, y + 9); ctx.lineTo(x + 13, y + 6);
            ctx.stroke();
        } else if (theme === 'airship') {
            // Llave de cuerda giratoria steampunk en la espalda
            ctx.fillStyle = '#fbbf24';
            ctx.fillRect(x + 3, y + 2, 2, 4);
            ctx.beginPath();
            ctx.arc(x + 4, y + 1, 2.5, 0, Math.PI * 2);
            ctx.fill();
        } else if (theme === 'ice') {
            // Picos de hielo sobre el caparazón
            ctx.fillStyle = '#ffffff';
            ctx.beginPath();
            ctx.moveTo(x + 8, y + 2); ctx.lineTo(x + 10, y - 2); ctx.lineTo(x + 12, y + 2);
            ctx.fill();
        } else if (theme === 'lava_castle') {
            // Púas de obsidiana ardiente
            ctx.fillStyle = '#f59e0b';
            ctx.beginPath();
            ctx.moveTo(x + 9, y + 2); ctx.lineTo(x + 11, y - 2); ctx.lineTo(x + 13, y + 2);
            ctx.fill();
        } else {
            // Placa central de caparazón clásica
            ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)';
            ctx.lineWidth = 1.2;
            ctx.beginPath();
            ctx.ellipse(x + 10, y + 8.5, 5, 4.5, 0, 0, Math.PI * 2);
            ctx.stroke();
        }

        // Cabeza con volumen
        const headGrad = ctx.createRadialGradient(x + 16, y + 2, 2, x + 17, y + 5, 6);
        headGrad.addColorStop(0, skinTop);
        headGrad.addColorStop(1, skinColor);
        ctx.fillStyle = headGrad;
        ctx.beginPath();
        ctx.arc(x + 16, y + 4.5, 5.5, 0, Math.PI * 2);
        ctx.fill();

        // Pico característico
        ctx.fillStyle = beakColor;
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
        ctx.fillStyle = eyeIris;
        ctx.beginPath();
        ctx.arc(x + 16.5, y + 3.5, 1.6, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(x + 16, y + 2.5, 1, 1);

        // Cola puntiaguda
        ctx.fillStyle = skinColor;
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
// RENDERIZADO DE LOS 9 JEFES FINALES ÚNICOS (AAA 2026 VISUAL OVERHAUL)
// ==========================================
function drawBossModern(x, y) {
    const b = bossEntity;
    if (!b) return;
    const facingLeft = (b.vx <= 0);
    const theme = (levelData && levelData.world) ? levelData.world.theme : 'lava_castle';
    const breath = Math.sin(Date.now() * 0.005) * 2;
    const isHit = (b.hitTimer && b.hitTimer > 0);

    ctx.save();

    // Sombra de contacto suave en el suelo
    ctx.fillStyle = 'rgba(0, 0, 0, 0.35)';
    ctx.beginPath();
    ctx.ellipse(x + b.w / 2, y + b.h - 2, b.w / 2 + 6, 7, 0, 0, Math.PI * 2);
    ctx.fill();

    // Renderizado del jefe temático correspondiente
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

    // Shader FX de Impacto al recibir daño (Damage Flash blanco-dorado)
    if (isHit) {
        ctx.save();
        ctx.globalAlpha = 0.65;
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.roundRect(x - 2, y - 2, b.w + 4, b.h + 4, 10);
        ctx.fill();
        ctx.strokeStyle = '#fde047';
        ctx.lineWidth = 3;
        ctx.stroke();

        // Chispas de impacto
        for (let sp = 0; sp < 4; sp++) {
            ctx.fillStyle = '#fde047';
            const spX = x + Math.random() * b.w;
            const spY = y + Math.random() * b.h;
            ctx.fillRect(spX, spY, 3, 3);
        }
        ctx.restore();
    }

    ctx.restore();
}

// 1. MUNDO 1: MECHA-KOOPA PRIME (TORTUGA TITÁN CIBERNÉTICA CON CHIMENEAS Y LÁSER)
function drawMechaKoopaPrime(x, y, b, facingLeft, breath) {
    // Chimeneas de escape dobles de bronce con vapor y llamaradas de turbo
    const stackX = facingLeft ? x + 34 : x + 8;
    ctx.fillStyle = '#78350f';
    ctx.fillRect(stackX, y + 2, 7, 14);
    ctx.fillStyle = '#b45309';
    ctx.fillRect(stackX - 1, y, 9, 3); // Borde superior

    // Vapor blanco y llamaradas cian del turbo
    for (let i = 0; i < 3; i++) {
        const puff = (Date.now() * 0.003 + i * 0.33) % 1;
        const px = stackX + 4 + Math.sin(puff * 6) * 4;
        const py = y - puff * 26;
        ctx.fillStyle = `rgba(56, 189, 248, ${0.9 - puff * 0.8})`;
        ctx.beginPath();
        ctx.arc(px, py, 2.5 + puff * 3.5, 0, Math.PI * 2);
        ctx.fill();
    }

    // Caparazón acorazado esmeralda masivo con placas hexagonales y remaches
    const shellX = facingLeft ? x + 16 : x + 4;
    const shellY = y + 10 + breath;
    const shellW = 28;
    const shellH = 34;

    const shellGrad = ctx.createRadialGradient(shellX + shellW / 2, shellY + shellH / 2, 4, shellX + shellW / 2, shellY + shellH / 2, 20);
    shellGrad.addColorStop(0, '#10b981');
    shellGrad.addColorStop(0.5, '#059669');
    shellGrad.addColorStop(1, '#064e3b');
    ctx.fillStyle = shellGrad;
    ctx.beginPath();
    ctx.ellipse(shellX + shellW / 2, shellY + shellH / 2, shellW / 2, shellH / 2, 0, 0, Math.PI * 2);
    ctx.fill();

    // Reborde de titanio acolchado
    ctx.strokeStyle = '#e2e8f0';
    ctx.lineWidth = 3;
    ctx.stroke();

    // Placas cibernéticas y remaches dorados
    ctx.fillStyle = '#facc15';
    ctx.beginPath();
    ctx.arc(shellX + 8, shellY + 12, 2.2, 0, Math.PI * 2);
    ctx.arc(shellX + 20, shellY + 12, 2.2, 0, Math.PI * 2);
    ctx.arc(shellX + 14, shellY + 24, 2.5, 0, Math.PI * 2);
    ctx.fill();

    // Bandas de advertencia amarillas y negras
    ctx.fillStyle = '#fde047';
    ctx.fillRect(shellX + 6, shellY + 16, shellW - 12, 3);

    // Patas mecánicas hidráulicas tipo oruga / pistón
    const legLeftY = y + b.h - 14 - (facingLeft ? breath * 0.5 : 0);
    const legRightY = y + b.h - 14 + (facingLeft ? breath * 0.5 : 0);
    ctx.fillStyle = '#1e293b';
    ctx.fillRect(x + 4, legLeftY, 14, 14);
    ctx.fillRect(x + b.w - 18, legRightY, 14, 14);

    // Garras de acero reforzadas con amortiguadores
    ctx.fillStyle = '#059669';
    ctx.fillRect(x + 2, legLeftY + 10, 18, 4);
    ctx.fillRect(x + b.w - 20, legRightY + 10, 18, 4);
    ctx.fillStyle = '#f8fafc';
    ctx.fillRect(x + 2, legLeftY + 12, 4, 3);
    ctx.fillRect(x + 16, legLeftY + 12, 4, 3);

    // Cabeza de tiranosaurio mecatrónico blindada
    const headX = facingLeft ? x + 2 : x + 22;
    const headY = y + 8 + breath;
    const headGrad = ctx.createLinearGradient(headX, headY, headX + 24, headY + 22);
    headGrad.addColorStop(0, '#334155');
    headGrad.addColorStop(0.6, '#0f172a');
    headGrad.addColorStop(1, '#020617');
    ctx.fillStyle = headGrad;
    ctx.beginPath();
    ctx.roundRect(headX, headY, 24, 20, 5);
    ctx.fill();
    ctx.strokeStyle = '#059669';
    ctx.lineWidth = 1.8;
    ctx.stroke();

    // Mandíbula mecánica articulada con dientes de titanio
    ctx.fillStyle = '#f59e0b';
    const jawX = facingLeft ? headX - 4 : headX + 16;
    ctx.fillRect(jawX, headY + 14, 12, 6);
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(jawX + 2, headY + 14, 3, 2);
    ctx.fillRect(jawX + 7, headY + 14, 3, 2);

    // Ojo visor cíclope láser rojo con haz proyector
    const laserScan = (Math.sin(Date.now() * 0.012) + 1) * 4.5;
    ctx.fillStyle = '#090d16';
    ctx.fillRect(headX + (facingLeft ? 2 : 8), headY + 6, 14, 6);
    ctx.fillStyle = '#ef4444';
    ctx.fillRect(headX + (facingLeft ? 2 : 8), headY + 6, 14, 6);
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(headX + (facingLeft ? 2 : 8) + laserScan, headY + 7, 3, 4);

    // Haz de escaneo láser rojo hacia adelante
    ctx.strokeStyle = 'rgba(239, 68, 68, 0.4)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(headX + (facingLeft ? 0 : 24), headY + 9);
    ctx.lineTo(headX + (facingLeft ? -35 : 59), headY + 9 + (Math.sin(Date.now() * 0.01) * 6));
    ctx.stroke();
}

// 2. MUNDO 2: FARAÓN ESCORPIÓN (TITÁN BIOMECÁNICO DE ORO, LAPISLÁZULI Y AGUIJÓN SOLAR)
function drawFaraonEscorpion(x, y, b, facingLeft, breath) {
    // Cola articulada robótica dorada que se eleva sobre el jefe
    const tailBaseX = facingLeft ? x + 36 : x + 12;
    const tailTipX = facingLeft ? x + 12 : x + 36;
    const tailTipY = y - 14 + breath;

    ctx.strokeStyle = '#ca8a04';
    ctx.lineWidth = 6;
    ctx.beginPath();
    ctx.moveTo(tailBaseX, y + 32);
    ctx.quadraticCurveTo(facingLeft ? x + 48 : x, y - 4, tailTipX, tailTipY);
    ctx.stroke();
    // Segmentos acorazados de la cola
    ctx.strokeStyle = '#1e3a8a'; // Inserciones de lapislázuli
    ctx.lineWidth = 2.5;
    ctx.stroke();

    // AGUIJÓN SOLAR DE PLASMA INCANDESCENTE
    const stingerPulse = Math.sin(Date.now() * 0.015) * 3 + 7;
    const stingerGrad = ctx.createRadialGradient(tailTipX, tailTipY, 1, tailTipX, tailTipY, stingerPulse);
    stingerGrad.addColorStop(0, '#ffffff');
    stingerGrad.addColorStop(0.3, '#fde047');
    stingerGrad.addColorStop(0.7, '#f97316');
    stingerGrad.addColorStop(1, 'rgba(239, 68, 68, 0)');
    ctx.fillStyle = stingerGrad;
    ctx.beginPath();
    ctx.arc(tailTipX, tailTipY, stingerPulse, 0, Math.PI * 2);
    ctx.fill();

    // Punta del aguijón de oro afilado
    ctx.fillStyle = '#dc2626';
    ctx.beginPath();
    ctx.moveTo(tailTipX, tailTipY - 8);
    ctx.lineTo(tailTipX - 7, tailTipY + 4);
    ctx.lineTo(tailTipX + 7, tailTipY + 4);
    ctx.closePath();
    ctx.fill();

    // Rayos y chispas de plasma solar
    for (let c = 0; c < 3; c++) {
        const sparkAng = Date.now() * 0.01 + c * 2;
        ctx.fillStyle = '#fef08a';
        ctx.fillRect(tailTipX + Math.cos(sparkAng) * 9, tailTipY + Math.sin(sparkAng) * 9, 2.5, 2.5);
    }

    // Carapacho de oro del faraón con cartelas jeroglíficas
    const bodyX = x + 8;
    const bodyY = y + 16 + breath;
    const goldGrad = ctx.createLinearGradient(bodyX, bodyY, bodyX + 32, bodyY + 26);
    goldGrad.addColorStop(0, '#fef08a');
    goldGrad.addColorStop(0.5, '#eab308');
    goldGrad.addColorStop(1, '#a16207');
    ctx.fillStyle = goldGrad;
    ctx.beginPath();
    ctx.roundRect(bodyX, bodyY, 32, 26, 7);
    ctx.fill();
    ctx.strokeStyle = '#1e3a8a';
    ctx.lineWidth = 2.5;
    ctx.stroke();

    // Corona Nemes faraónica con franjas azules y doradas
    ctx.fillStyle = '#1e3a8a';
    ctx.fillRect(bodyX + 4, bodyY + 2, 24, 4);
    ctx.fillRect(bodyX + 8, bodyY + 6, 16, 3);

    // Ojos de rubí sagrados resplandecientes
    ctx.fillStyle = '#ef4444';
    ctx.fillRect(facingLeft ? bodyX + 4 : bodyX + 22, bodyY + 11, 7, 5);
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(facingLeft ? bodyX + 6 : bodyX + 24, bodyY + 12, 2, 2);

    // PINZAS MECÁNICAS ARTICULADAS DE ORO QUE CHASQUEAN
    const snap = Math.sin(Date.now() * 0.01) * 5;
    const pincerX = facingLeft ? x - 6 : x + 34;
    ctx.fillStyle = '#eab308';
    ctx.fillRect(pincerX, bodyY + 8, 18, 7);
    ctx.strokeStyle = '#78350f';
    ctx.lineWidth = 1.5;
    ctx.strokeRect(pincerX, bodyY + 8, 18, 7);

    // Dientes de obsidiana en las pinzas
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(facingLeft ? pincerX - 5 : pincerX + 14, bodyY + 4 - snap, 7, 6);
    ctx.fillRect(facingLeft ? pincerX - 5 : pincerX + 14, bodyY + 11 + snap, 7, 6);

    // Patas biomecánicas doradas
    ctx.strokeStyle = '#ca8a04';
    ctx.lineWidth = 2.5;
    for (let p = 0; p < 4; p++) {
        const footStep = Math.sin(Date.now() * 0.01 + p) * 3;
        ctx.beginPath();
        ctx.moveTo(bodyX + p * 8 + 3, bodyY + 24);
        ctx.lineTo(bodyX + p * 8, y + b.h - footStep);
        ctx.stroke();
    }
}

// 3. MUNDO 3: GÓLEM CUÁNTICO (MONOLITO DE CRISTAL OBSIDIANA Y NÚCLEO SINGULARIDAD VIOLETA)
function drawGolemCuantico(x, y, b, facingLeft, breath) {
    const hoverY = Math.sin(Date.now() * 0.005) * 5;
    const corePulse = Math.sin(Date.now() * 0.01) * 4 + 11;

    // Fragmentos de cristal neón flotando y orbitando en 3D
    for (let i = 0; i < 5; i++) {
        const ang = (Date.now() * 0.0035 + i * (Math.PI * 2 / 5));
        const cx = x + b.w / 2 + Math.cos(ang) * 28;
        const cy = y + b.h / 2 + Math.sin(ang) * 22;

        ctx.fillStyle = (i % 2 === 0) ? '#c084fc' : '#38bdf8';
        ctx.beginPath();
        ctx.moveTo(cx, cy - 6);
        ctx.lineTo(cx + 5, cy);
        ctx.lineTo(cx, cy + 6);
        ctx.lineTo(cx - 5, cy);
        ctx.closePath();
        ctx.fill();

        // Relámpagos de energía cuántica entre los fragmentos
        ctx.strokeStyle = 'rgba(192, 132, 252, 0.4)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(x + b.w / 2, y + b.h / 2 + hoverY);
        ctx.lineTo(cx, cy);
        ctx.stroke();
    }

    // Torso monolítico de cristal obsidiana y amatista
    const cx = x + 10;
    const cy = y + 8 + hoverY;
    const golemGrad = ctx.createLinearGradient(cx, cy, cx + 28, cy + 36);
    golemGrad.addColorStop(0, '#581c87');
    golemGrad.addColorStop(0.5, '#2e1065');
    golemGrad.addColorStop(1, '#0f051d');
    ctx.fillStyle = golemGrad;
    ctx.beginPath();
    ctx.moveTo(cx + 14, cy);
    ctx.lineTo(cx + 28, cy + 12);
    ctx.lineTo(cx + 24, cy + 36);
    ctx.lineTo(cx + 4, cy + 36);
    ctx.lineTo(cx, cy + 12);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = '#c084fc';
    ctx.lineWidth = 2.5;
    ctx.stroke();

    // NÚCLEO SINGULARIDAD CUÁNTICA EN EL PECHO
    const coreGrad = ctx.createRadialGradient(cx + 14, cy + 20, 1, cx + 14, cy + 20, corePulse);
    coreGrad.addColorStop(0, '#ffffff');
    coreGrad.addColorStop(0.35, '#e879f9');
    coreGrad.addColorStop(0.7, '#9333ea');
    coreGrad.addColorStop(1, 'rgba(147, 51, 234, 0)');
    ctx.fillStyle = coreGrad;
    ctx.beginPath();
    ctx.arc(cx + 14, cy + 20, corePulse, 0, Math.PI * 2);
    ctx.fill();

    // Ojo horizontal luminoso de análisis cuántico
    ctx.fillStyle = '#38bdf8';
    ctx.fillRect(cx + 7, cy + 9, 14, 4);
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(cx + 12 + Math.sin(Date.now() * 0.01) * 4, cy + 9, 3, 4);

    // PUÑOS FLOTANTES DE CRISTAL CUÁNTICO CON NUDILLOS DE NEÓN
    const fistY = y + 22 + hoverY + Math.sin(Date.now() * 0.008) * 4;
    const fistX = facingLeft ? x - 8 : x + b.w - 6;

    ctx.fillStyle = '#7e22ce';
    ctx.beginPath();
    ctx.roundRect(fistX, fistY, 15, 15, 3);
    ctx.fill();
    ctx.strokeStyle = '#38bdf8';
    ctx.lineWidth = 1.8;
    ctx.stroke();
    // Nudillos iluminados
    ctx.fillStyle = '#c084fc';
    ctx.fillRect(fistX + 2, fistY + 2, 3, 3);
    ctx.fillRect(fistX + 6, fistY + 2, 3, 3);
    ctx.fillRect(fistX + 10, fistY + 2, 3, 3);
}

// 4. MUNDO 4: CAPITÁN KRAKEN (DREADNOUGHT PIRATA DE LAS PROFUNDIDADES OCEÁNICAS)
function drawCapitanKraken(x, y, b, facingLeft, breath) {
    // Burbujas ascendentes continuas
    for (let i = 0; i < 4; i++) {
        const bubbleTime = (Date.now() * 0.002 + i * 0.3) % 1;
        const bx = x + 8 + i * 11;
        const by = y + b.h - bubbleTime * 50;
        ctx.strokeStyle = 'rgba(125, 211, 252, 0.8)';
        ctx.lineWidth = 1.2;
        ctx.beginPath();
        ctx.arc(bx, by, 3 + (i % 2), 0, Math.PI * 2);
        ctx.stroke();
    }

    // 6 TENTÁCULOS ONDULANTES CON CINEMÁTICA FLUIDA Y VENTOSAS BIOLUMINISCENTES
    for (let t = 0; t < 6; t++) {
        const wave = Math.sin(Date.now() * 0.006 + t * 0.8) * 10;
        const tx = x + 5 + t * 7;
        const tentGrad = ctx.createLinearGradient(tx, y + 30, tx + wave, y + b.h + 8);
        tentGrad.addColorStop(0, '#0f766e');
        tentGrad.addColorStop(1, '#14b8a6');
        ctx.strokeStyle = tentGrad;
        ctx.lineWidth = 4.5;
        ctx.beginPath();
        ctx.moveTo(tx, y + 30);
        ctx.quadraticCurveTo(tx + wave, y + 42, tx - wave * 0.6, y + b.h + 6);
        ctx.stroke();

        // Ventosas bioluminiscentes verde esmeralda
        ctx.fillStyle = '#6ee7b7';
        ctx.beginPath();
        ctx.arc(tx + wave * 0.5, y + 42, 2.2, 0, Math.PI * 2);
        ctx.arc(tx - wave * 0.3, y + b.h + 2, 2.0, 0, Math.PI * 2);
        ctx.fill();
    }

    // Manto cibernético del kraken con chaleco de almirante
    const headX = x + 8;
    const headY = y + 6 + breath;
    const bodyGrad = ctx.createRadialGradient(headX + 16, headY + 16, 4, headX + 16, headY + 16, 20);
    bodyGrad.addColorStop(0, '#14b8a6');
    bodyGrad.addColorStop(0.6, '#0f766e');
    bodyGrad.addColorStop(1, '#042f2e');
    ctx.fillStyle = bodyGrad;
    ctx.beginPath();
    ctx.ellipse(headX + 16, headY + 16, 17, 19, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#2dd4bf';
    ctx.lineWidth = 2;
    ctx.stroke();

    // SOMBRERO BICORNIO PIRATA CON CALAVERA DE ORO Y PLUMA
    ctx.fillStyle = '#0f172a';
    ctx.beginPath();
    ctx.moveTo(headX - 2, headY + 4);
    ctx.lineTo(headX + 16, headY - 14);
    ctx.lineTo(headX + 34, headY + 4);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = '#ca8a04';
    ctx.lineWidth = 1.8;
    ctx.stroke();

    // Calavera y tibias cruzadas doradas
    ctx.fillStyle = '#facc15';
    ctx.beginPath();
    ctx.arc(headX + 16, headY - 5, 3.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillRect(headX + 14, headY - 1, 4, 2);

    // Pluma pirata roja ondeando
    ctx.strokeStyle = '#ef4444';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(headX + 22, headY - 10);
    ctx.quadraticCurveTo(headX + 32, headY - 16, headX + 38, headY - 12);
    ctx.stroke();

    // Ojo biónico con parche pirata y retícula roja
    const eyeX = facingLeft ? headX + 6 : headX + 18;
    ctx.fillStyle = '#020617';
    ctx.fillRect(eyeX, headY + 11, 9, 9);
    ctx.fillStyle = '#ef4444';
    ctx.fillRect(eyeX + 2, headY + 13, 5, 5);
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(eyeX + 3, headY + 14, 2, 2);

    // Ojo extraterrestre verde esmeralda
    const otherEyeX = facingLeft ? headX + 18 : headX + 7;
    ctx.fillStyle = '#10b981';
    ctx.beginPath();
    ctx.arc(otherEyeX + 3, headY + 15, 3.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#064e3b';
    ctx.fillRect(otherEyeX + 2, headY + 14, 2, 3);
}

// 5. MUNDO 5: YETI CRIOGÉNICO (TITÁN ÁRTICO DE HIELO PERPÉTUO Y CUERNOS DE ZAFIRO)
function drawYetiCriogenico(x, y, b, facingLeft, breath) {
    // Vaho glacial helado y copos de nieve flotando
    for (let i = 0; i < 5; i++) {
        const mist = (Date.now() * 0.003 + i * 0.35) % 1;
        const mx = (facingLeft ? x + 2 : x + 36) + Math.sin(mist * 5) * 8;
        const my = y + 14 + mist * 22;
        ctx.fillStyle = `rgba(224, 242, 254, ${0.9 - mist * 0.8})`;
        ctx.beginPath();
        ctx.arc(mx, my, 4 + mist * 4, 0, Math.PI * 2);
        ctx.fill();
    }

    // CUERPO MACIZO CUBIERTO DE PELAJE ÁRTICO Y ARMADURA GLACIAL
    const bodyX = x + 4;
    const bodyY = y + 12 + breath;
    const furGrad = ctx.createLinearGradient(bodyX, bodyY, bodyX + 40, bodyY + 36);
    furGrad.addColorStop(0, '#ffffff');
    furGrad.addColorStop(0.5, '#e0f2fe');
    furGrad.addColorStop(1, '#93c5fd');
    ctx.fillStyle = furGrad;
    ctx.beginPath();
    ctx.roundRect(bodyX, bodyY, 40, 36, 12);
    ctx.fill();
    ctx.strokeStyle = '#38bdf8';
    ctx.lineWidth = 2.5;
    ctx.stroke();

    // CUERNOS MASIVOS DE HIELO CRISTALINO ZAFIRO CON CARÁMBANOS
    ctx.fillStyle = '#0284c7';
    // Cuerno Izquierdo
    ctx.beginPath();
    ctx.moveTo(bodyX + 6, bodyY + 2);
    ctx.lineTo(bodyX - 8, bodyY - 16);
    ctx.lineTo(bodyX + 14, bodyY + 4);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = '#e0f2fe';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    // Cuerno Derecho
    ctx.fillStyle = '#0284c7';
    ctx.beginPath();
    ctx.moveTo(bodyX + 34, bodyY + 2);
    ctx.lineTo(bodyX + 48, bodyY - 16);
    ctx.lineTo(bodyX + 26, bodyY + 4);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Ojos glaciales azul cian puro resplandecientes
    ctx.fillStyle = '#00ffff';
    ctx.fillRect(facingLeft ? bodyX + 8 : bodyX + 24, bodyY + 10, 8, 5);
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(facingLeft ? bodyX + 10 : bodyX + 26, bodyY + 11, 2, 3);

    // Boca amenazante con colmillos de hielo afilados
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(bodyX + 12, bodyY + 20, 16, 6);
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(bodyX + 14, bodyY + 20, 3, 4);
    ctx.fillRect(bodyX + 23, bodyY + 20, 3, 4);

    // PUÑOS TITÁNICOS DE ROCA DE HIELO CON RUNAS GLACIALES
    ctx.fillStyle = '#0ea5e9';
    ctx.fillRect(x + 2, y + b.h - 14, 16, 14);
    ctx.fillRect(x + b.w - 18, y + b.h - 14, 16, 14);
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 1.5;
    ctx.strokeRect(x + 2, y + b.h - 14, 16, 14);
    ctx.strokeRect(x + b.w - 18, y + b.h - 14, 16, 14);
}

// 6. MUNDO 6: ESPECTRO DE LAS SOMBRAS (WRAITH ESPECTRAL CON LLAMAS DEMONÍACAS Y FUEGOS FATUOS)
function drawEspectroSombras(x, y, b, facingLeft, breath) {
    const floatY = Math.sin(Date.now() * 0.005) * 6;

    // FUEGOS FATUOS Y ALMAS ESPECTRALES ORBITANDO
    for (let i = 0; i < 4; i++) {
        const soul = (Date.now() * 0.0025 + i * 0.4) % 1;
        const sx = x + 10 + i * 10 + Math.sin(soul * 6) * 8;
        const sy = y + b.h - soul * 48;
        ctx.fillStyle = (i % 2 === 0) ? 'rgba(168, 85, 247, 0.85)' : 'rgba(74, 222, 128, 0.85)';
        ctx.beginPath();
        ctx.arc(sx, sy, 3.5, 0, Math.PI * 2);
        ctx.fill();
    }

    // TOGA FANTASMAL ONDULANTE OSCURA (DISOLVIÉNDOSE EN EL VACÍO)
    const bodyX = x + 8;
    const bodyY = y + 6 + floatY;
    const robeGrad = ctx.createLinearGradient(bodyX + 16, bodyY, bodyX + 16, bodyY + 44);
    robeGrad.addColorStop(0, '#3b0764');
    robeGrad.addColorStop(0.5, '#1e1b4b');
    robeGrad.addColorStop(1, 'rgba(15, 23, 42, 0)');
    ctx.fillStyle = robeGrad;
    ctx.beginPath();
    ctx.moveTo(bodyX + 16, bodyY);
    ctx.lineTo(bodyX + 34, bodyY + 22);
    ctx.lineTo(bodyX + 28, bodyY + 44);
    ctx.lineTo(bodyX + 4, bodyY + 44);
    ctx.lineTo(bodyX - 2, bodyY + 22);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = '#a855f7';
    ctx.lineWidth = 2;
    ctx.stroke();

    // CALAVERA FANTASMAL SUSPENDIDA EN EL CENTRO
    ctx.fillStyle = '#f8fafc';
    ctx.beginPath();
    ctx.arc(bodyX + 16, bodyY + 12, 11, 0, Math.PI * 2);
    ctx.fill();

    // Cuencas oculares con fuego demoníaco lila y verde
    ctx.fillStyle = '#1e1b4b';
    ctx.fillRect(bodyX + 10, bodyY + 9, 5, 6);
    ctx.fillRect(bodyX + 17, bodyY + 9, 5, 6);
    ctx.fillStyle = '#4ade80'; // Pupilas de fuego espectral verde
    ctx.fillRect(bodyX + 11, bodyY + 10, 3, 3);
    ctx.fillRect(bodyX + 18, bodyY + 10, 3, 3);

    // GARRAS ESPECTRALES TRAZANDO ESTELAS LILAS
    const clawX = facingLeft ? x - 4 : x + b.w - 8;
    ctx.fillStyle = '#c084fc';
    ctx.beginPath();
    ctx.roundRect(clawX, bodyY + 20, 12, 5, 2);
    ctx.fill();
    // Dedos alargados
    ctx.fillStyle = '#f8fafc';
    ctx.fillRect(clawX + (facingLeft ? -4 : 10), bodyY + 18, 4, 9);
}

// 7. MUNDO 7: MECA-DRAGÓN SUPREMO (WYVERN ROJO CON TURBINAS DE REACCIÓN Y LLAMARADA SUPERSONICA)
function drawMecaDragon(x, y, b, facingLeft, breath) {
    const wingFlap = Math.sin(Date.now() * 0.012) * 12;

    // TURBINAS DE REACCIÓN CON POSTQUEMADORES INCANDESCENTES
    const turbineX = x + (facingLeft ? 32 : 6);
    ctx.fillStyle = '#1c1917';
    ctx.fillRect(turbineX, y + 16, 10, 8);
    // Lenguas de fuego del reactor
    const jetFlameLen = 14 + Math.sin(Date.now() * 0.03) * 5;
    const jetGrad = ctx.createLinearGradient(turbineX, y + 20, turbineX + (facingLeft ? jetFlameLen : -jetFlameLen), y + 20);
    jetGrad.addColorStop(0, '#ffffff');
    jetGrad.addColorStop(0.3, '#fde047');
    jetGrad.addColorStop(0.7, '#ea580c');
    jetGrad.addColorStop(1, 'rgba(234, 88, 12, 0)');
    ctx.fillStyle = jetGrad;
    ctx.beginPath();
    ctx.moveTo(turbineX + (facingLeft ? 10 : 0), y + 16);
    ctx.lineTo(turbineX + (facingLeft ? 10 + jetFlameLen : -jetFlameLen), y + 20);
    ctx.lineTo(turbineX + (facingLeft ? 10 : 0), y + 24);
    ctx.closePath();
    ctx.fill();

    // ALAS MECÁNICAS ARTICULADAS TIPO CAZA SUPERSÓNICO
    const wingGrad = ctx.createLinearGradient(x + 20, y + 16, x + 40, y + 36);
    wingGrad.addColorStop(0, '#ef4444');
    wingGrad.addColorStop(0.6, '#b91c1c');
    wingGrad.addColorStop(1, '#450a0a');
    ctx.fillStyle = wingGrad;
    ctx.beginPath();
    ctx.moveTo(x + 20, y + 16);
    ctx.lineTo(facingLeft ? x + 48 : x - 8, y - 8 + wingFlap);
    ctx.lineTo(facingLeft ? x + 40 : x, y + 28);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = '#f87171';
    ctx.lineWidth = 2;
    ctx.stroke();

    // TORSO BLINDADO AERODINÁMICO DE DRAGÓN
    const bodyX = x + 10;
    const bodyY = y + 14 + breath;
    ctx.fillStyle = '#991b1b';
    ctx.beginPath();
    ctx.roundRect(bodyX, bodyY, 28, 28, 8);
    ctx.fill();
    ctx.strokeStyle = '#facc15'; // Ribete dorado
    ctx.lineWidth = 1.5;
    ctx.stroke();

    // CABEZA DE DRAGÓN ACORAZADA Y CUERNOS DE ORO
    const headX = facingLeft ? x : x + 24;
    const headY = y + 4 + breath;
    ctx.fillStyle = '#7f1d1d';
    ctx.beginPath();
    ctx.roundRect(headX, headY, 24, 18, 5);
    ctx.fill();

    // Gran cuerno dorado afilado
    ctx.fillStyle = '#fbbf24';
    ctx.beginPath();
    ctx.moveTo(headX + 14, headY);
    ctx.lineTo(headX + (facingLeft ? 26 : 2), headY - 14);
    ctx.lineTo(headX + 18, headY + 4);
    ctx.closePath();
    ctx.fill();

    // Ojo reptiliano dorado con pupila vertical
    ctx.fillStyle = '#facc15';
    ctx.fillRect(headX + (facingLeft ? 4 : 14), headY + 5, 6, 5);
    ctx.fillStyle = '#000000';
    ctx.fillRect(headX + (facingLeft ? 7 : 17), headY + 5, 2, 5);

    // Garras de acero reforzadas
    ctx.fillStyle = '#1c1917';
    ctx.fillRect(x + 6, y + b.h - 12, 14, 12);
    ctx.fillRect(x + b.w - 20, y + b.h - 12, 14, 12);
    ctx.fillStyle = '#fbbf24';
    ctx.fillRect(x + 6, y + b.h - 3, 5, 3);
    ctx.fillRect(x + b.w - 12, y + b.h - 3, 5, 3);
}

// 8. MUNDO 8: LORD DE LAVA SUPREMO (BOWSER TITÁN VOLCÁNICO CON ESPINAS Y CRÁTERES DE FUEGO)
function drawLordLavaSupremo(x, y, b, facingLeft, breath) {
    // Chispas de magma y ascuas ardientes que ascienden
    for (let i = 0; i < 6; i++) {
        const emberTime = (Date.now() * 0.0025 + i * 0.4) % 1;
        const ex = x + 8 + (i * 7) + Math.sin(emberTime * 6 + i) * 8;
        const ey = y + b.h - 6 - emberTime * 56;
        ctx.fillStyle = (i % 2 === 0) ? '#f97316' : '#fde047';
        ctx.fillRect(ex, ey, 3, 3);
    }

    // CAPARAZÓN OBSIDIANA GIGANTE CON ESPINAS CRÁTER VOLCÁNICAS
    const shellX = facingLeft ? x + 18 : x + 2;
    const shellY = y + 8 + breath;
    const shellW = 28;
    const shellH = 36;

    const shellGrad = ctx.createRadialGradient(shellX + shellW / 2, shellY + shellH / 2, 4, shellX + shellW / 2, shellY + shellH / 2, 22);
    shellGrad.addColorStop(0, '#450a0a');
    shellGrad.addColorStop(0.6, '#1c1917');
    shellGrad.addColorStop(1, '#0c0a09');
    ctx.fillStyle = shellGrad;
    ctx.beginPath();
    ctx.ellipse(shellX + shellW / 2, shellY + shellH / 2, shellW / 2, shellH / 2, 0, 0, Math.PI * 2);
    ctx.fill();

    // Vetas de magma ardiente que agrietan el caparazón
    ctx.strokeStyle = '#ef4444';
    ctx.lineWidth = 2.2;
    ctx.stroke();

    // 6 Espinas de volcán con puntas ardientes
    const spikes = [
        { sx: shellX + 4, sy: shellY + 6 },
        { sx: shellX + shellW - 6, sy: shellY + 6 },
        { sx: shellX + shellW / 2, sy: shellY + 2 },
        { sx: shellX + shellW / 2, sy: shellY + shellH - 6 },
        { sx: shellX + 3, sy: shellY + shellH / 2 },
        { sx: shellX + shellW - 5, sy: shellY + shellH / 2 }
    ];
    spikes.forEach(sp => {
        ctx.fillStyle = '#ea580c';
        ctx.beginPath();
        ctx.moveTo(sp.sx - 2, sp.sy + 2);
        ctx.lineTo(sp.sx, sp.sy - 5);
        ctx.lineTo(sp.sx + 2, sp.sy + 2);
        ctx.closePath();
        ctx.fill();
        ctx.fillStyle = '#fef08a';
        ctx.fillRect(sp.sx - 1, sp.sy - 5, 2, 2);
    });

    // CORAZÓN DE MAGMA ARDIENTE EN EL PECHO
    const bodyX = facingLeft ? x + 8 : x + 16;
    const bodyY = y + 16 + breath;
    const lavaPulse = (Math.sin(Date.now() * 0.008) + 1) * 0.5;
    const coreGrad = ctx.createRadialGradient(bodyX + 12, bodyY + 14, 1, bodyX + 12, bodyY + 14, 11 + lavaPulse * 4);
    coreGrad.addColorStop(0, '#fef08a');
    coreGrad.addColorStop(0.4, '#f97316');
    coreGrad.addColorStop(0.8, '#dc2626');
    coreGrad.addColorStop(1, 'rgba(153, 27, 27, 0)');
    ctx.fillStyle = coreGrad;
    ctx.beginPath();
    ctx.arc(bodyX + 12, bodyY + 14, 10 + lavaPulse * 3, 0, Math.PI * 2);
    ctx.fill();

    // CABEZA DE DRAGÓN DE LAVA CON MELENA DE FUEGO VIVO
    const headX = facingLeft ? x + 2 : x + 22;
    const headY = y + 2 + breath;

    // Melena de fuego vivo ondeante
    for (let m = 0; m < 3; m++) {
        const maneWave = Math.sin(Date.now() * 0.01 + m) * 4;
        ctx.fillStyle = (m % 2 === 0) ? '#f97316' : '#fde047';
        ctx.beginPath();
        ctx.moveTo(headX + 12, headY);
        ctx.lineTo(headX + (facingLeft ? 26 : -2) + maneWave, headY - 10 - m * 3);
        ctx.lineTo(headX + 18, headY + 6);
        ctx.closePath();
        ctx.fill();
    }

    // Cráneo volcánico negro
    ctx.fillStyle = '#1c1917';
    ctx.beginPath();
    ctx.roundRect(headX, headY, 24, 20, 5);
    ctx.fill();
    ctx.strokeStyle = '#ea580c';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    // Ojos ardientes con pupilas de fuego
    ctx.fillStyle = '#fef08a';
    ctx.fillRect(headX + (facingLeft ? 4 : 14), headY + 6, 6, 5);
    ctx.fillStyle = '#dc2626';
    ctx.fillRect(headX + (facingLeft ? 7 : 17), headY + 7, 2, 4);

    // Garras de magma pesadas
    ctx.fillStyle = '#1c1917';
    ctx.fillRect(x + 6, y + b.h - 12, 14, 12);
    ctx.fillRect(x + b.w - 20, y + b.h - 12, 14, 12);
    ctx.fillStyle = '#ea580c';
    ctx.fillRect(x + 6, y + b.h - 3, 6, 3);
    ctx.fillRect(x + b.w - 14, y + b.h - 3, 6, 3);
}

// 9. MUNDO 9: EMPERADOR DE LA SINGULARIDAD (OVERLORD CÓSMICO DE MATERIA OSCURA Y ESTRELLAS)
function drawEmperadorSingularidad(x, y, b, facingLeft, breath) {
    const floatY = Math.sin(Date.now() * 0.004) * 5;
    const ringAngle = Date.now() * 0.002;

    // ANILLOS DE ACRECIÓN CÓSMICA 3D ORBITANDO ALREDEDOR DEL JEFE
    ctx.save();
    ctx.translate(x + b.w / 2, y + b.h / 2 + floatY);
    ctx.rotate(ringAngle);
    ctx.strokeStyle = 'rgba(6, 182, 212, 0.7)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.ellipse(0, 0, 34, 14, 0, 0, Math.PI * 2);
    ctx.stroke();

    // Satélite / planeta enano orbitando
    ctx.fillStyle = '#facc15';
    ctx.beginPath();
    ctx.arc(34, 0, 4, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#38bdf8';
    ctx.beginPath();
    ctx.arc(-34, 0, 3, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    // MANTO ESTELAR DE NEBULOSA OSCURA CON CONSTELACIONES
    const bodyX = x + 8;
    const bodyY = y + 8 + floatY;
    const nebulaGrad = ctx.createLinearGradient(bodyX, bodyY, bodyX + 32, bodyY + 36);
    nebulaGrad.addColorStop(0, '#0f172a');
    nebulaGrad.addColorStop(0.5, '#1e1b4b');
    nebulaGrad.addColorStop(1, '#020617');
    ctx.fillStyle = nebulaGrad;
    ctx.beginPath();
    ctx.roundRect(bodyX, bodyY, 32, 36, 10);
    ctx.fill();
    ctx.strokeStyle = '#6366f1';
    ctx.lineWidth = 2.5;
    ctx.stroke();

    // SINGULARIDAD DEL AGUJERO NEGRO EN EL PECHO CON LENTE GRAVITACIONAL
    const singRadius = Math.sin(Date.now() * 0.009) * 3 + 9;
    const singGrad = ctx.createRadialGradient(bodyX + 16, bodyY + 18, 2, bodyX + 16, bodyY + 18, singRadius + 6);
    singGrad.addColorStop(0, '#000000');
    singGrad.addColorStop(0.6, '#06b6d4');
    singGrad.addColorStop(1, 'rgba(99, 102, 241, 0)');
    ctx.fillStyle = singGrad;
    ctx.beginPath();
    ctx.arc(bodyX + 16, bodyY + 18, singRadius + 6, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#000000';
    ctx.beginPath();
    ctx.arc(bodyX + 16, bodyY + 18, singRadius, 0, Math.PI * 2);
    ctx.fill();

    // CORONA CÓSMICA DE ESTRELLAS DE ORO PURO
    ctx.fillStyle = '#fbbf24';
    for (let c = 0; c < 3; c++) {
        const cx = bodyX + 6 + c * 10;
        ctx.beginPath();
        ctx.moveTo(cx, bodyY);
        ctx.lineTo(cx + 4, bodyY - 12);
        ctx.lineTo(cx + 8, bodyY);
        ctx.closePath();
        ctx.fill();
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(cx + 3, bodyY - 13, 2, 2);
        ctx.fillStyle = '#fbbf24';
    }

    // Ojos cósmicos de energía estelar pura
    ctx.fillStyle = '#00ffff';
    ctx.fillRect(bodyX + (facingLeft ? 6 : 18), bodyY + 8, 8, 4);
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(bodyX + (facingLeft ? 8 : 20), bodyY + 9, 3, 2);
}

// ==========================================
// BARRA DE VIDA DEL JEFE DE ALTA DEFINICIÓN (AAA HUD)
// ==========================================
function drawBossHealthBarModern() {
    const b = bossEntity;
    const barW = 200;
    const barH = 14;
    const barX = (VIEW_WIDTH - barW) / 2;
    const barY = 22;

    ctx.save();
    // Placa de fondo con relieve metálico oscuro
    ctx.fillStyle = 'rgba(15, 23, 42, 0.92)';
    ctx.beginPath();
    ctx.roundRect(barX - 8, barY - 16, barW + 16, barH + 24, 8);
    ctx.fill();
    ctx.strokeStyle = '#f59e0b';
    ctx.lineWidth = 1.8;
    ctx.stroke();

    // Icono calavera del jefe a la izquierda
    ctx.fillStyle = '#ef4444';
    ctx.font = 'bold 11px sans-serif';
    ctx.fillText('💀', barX - 4, barY + 9);

    // Título y Nombre del Jefe
    ctx.fillStyle = '#fde047';
    ctx.font = '900 10px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(`${b.name.toUpperCase()} ★ MUNDO ${currentWorldNum}`, VIEW_WIDTH / 2, barY - 4);

    // Ranura de la barra
    ctx.fillStyle = '#1e293b';
    ctx.beginPath();
    ctx.roundRect(barX + 10, barY, barW - 14, barH, 4);
    ctx.fill();

    // Relleno de la barra de salud con degradado y segmentos
    const healthPercent = Math.max(0, b.hp / b.maxHp);
    const hpGrad = ctx.createLinearGradient(barX + 10, barY, barX + 10 + (barW - 14) * healthPercent, barY);
    if (healthPercent > 0.4) {
        hpGrad.addColorStop(0, '#ef4444');
        hpGrad.addColorStop(1, '#f97316');
    } else {
        hpGrad.addColorStop(0, '#dc2626');
        hpGrad.addColorStop(1, '#fbbf24');
    }
    ctx.fillStyle = hpGrad;
    ctx.beginPath();
    ctx.roundRect(barX + 10, barY, (barW - 14) * healthPercent, barH, 4);
    ctx.fill();

    // Segmentos de división de golpes
    ctx.fillStyle = 'rgba(0, 0, 0, 0.35)';
    for (let s = 1; s < b.maxHp; s++) {
        const segX = (barX + 10) + ((barW - 14) / b.maxHp) * s;
        ctx.fillRect(segX, barY, 1.5, barH);
    }

    // Borde brillante
    ctx.strokeStyle = '#f8fafc';
    ctx.lineWidth = 1.2;
    ctx.strokeRect(barX + 10, barY, barW - 14, barH);
    ctx.textAlign = 'left';
    ctx.restore();
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
        const capGrad = ctx.createRadialGradient(x + 8, py + 5, 2, x + 10, py + 9, 10);
        capGrad.addColorStop(0, '#fca5a5');
        capGrad.addColorStop(0.35, '#ef4444');
        capGrad.addColorStop(0.8, '#b91c1c');
        capGrad.addColorStop(1, '#7f1d1d');
        ctx.fillStyle = capGrad;
        ctx.beginPath();
        ctx.arc(x + 10, py + 9, 9.5, Math.PI, 0, false);
        ctx.fill();

        // Brillo superior curvo en el sombrero (Glossy shine)
        ctx.fillStyle = 'rgba(255, 255, 255, 0.65)';
        ctx.beginPath();
        ctx.ellipse(x + 8, py + 3.5, 4.5, 1.8, -0.2, 0, Math.PI * 2);
        ctx.fill();

        // Lunares blancos con relieve esférico
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(x + 10, py + 4.5, 3.2, 0, Math.PI * 2);
        ctx.arc(x + 3, py + 8.5, 2.6, 0, Math.PI * 2);
        ctx.arc(x + 17, py + 8.5, 2.6, 0, Math.PI * 2);
        ctx.fill();

        // Destello de estrella flotante mágica
        const sparkleTime = (Date.now() * 0.005) % (Math.PI * 2);
        ctx.fillStyle = '#fde047';
        ctx.fillRect(x + 10 + Math.cos(sparkleTime) * 11, py + 8 + Math.sin(sparkleTime) * 8, 2, 2);
    } else {
        // === FLOR DE PLASMA VÓRTICE (2026 SCI-FI POWER) ===
        const coreRot = Date.now() * 0.006;
        // Pétalos de fuego de plasma rotativos con halo incandescente
        ctx.save();
        ctx.translate(x + 10, py + 10);
        ctx.rotate(coreRot);
        for (let p = 0; p < 4; p++) {
            ctx.rotate(Math.PI / 2);
            const petalGrad = ctx.createLinearGradient(0, 0, 0, 8);
            petalGrad.addColorStop(0, '#fde047');
            petalGrad.addColorStop(0.5, '#f97316');
            petalGrad.addColorStop(1, '#ef4444');
            ctx.fillStyle = petalGrad;
            ctx.beginPath();
            ctx.ellipse(0, 6, 3.5, 5.8, 0, 0, Math.PI * 2);
            ctx.fill();
        }
        ctx.restore();

        // Núcleo brillante incandescente con pulsación
        const pulse = Math.sin(Date.now() * 0.01) * 1.2 + 5.5;
        const flowerCore = ctx.createRadialGradient(x + 10, py + 10, 1, x + 10, py + 10, pulse);
        flowerCore.addColorStop(0, '#ffffff');
        flowerCore.addColorStop(0.4, '#fde047');
        flowerCore.addColorStop(0.85, '#f97316');
        flowerCore.addColorStop(1, 'rgba(239, 68, 68, 0)');
        ctx.fillStyle = flowerCore;
        ctx.beginPath();
        ctx.arc(x + 10, py + 10, pulse + 1, 0, Math.PI * 2);
        ctx.fill();
    }
    ctx.restore();
}

// ==========================================
// DISPARO DE PLASMA CON BLOOM Y ESTELA
// ==========================================
function drawPlasmaBall(x, y) {
    ctx.save();
    // Halo de plasma cian volumétrico con resplandor neón
    const plasmaGrad = ctx.createRadialGradient(x + 5, y + 5, 1, x + 5, y + 5, 10);
    plasmaGrad.addColorStop(0, '#ffffff');
    plasmaGrad.addColorStop(0.25, '#67e8f9');
    plasmaGrad.addColorStop(0.65, '#0284c7');
    plasmaGrad.addColorStop(1, 'rgba(2, 132, 199, 0)');
    ctx.fillStyle = plasmaGrad;
    ctx.shadowColor = '#00f0ff';
    ctx.shadowBlur = 8;
    ctx.beginPath();
    ctx.arc(x + 5, y + 5, 10, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;

    // Núcleo ultrabrillante
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(x + 5, y + 5, 3.2, 0, Math.PI * 2);
    ctx.fill();

    // Estela de microchispas de plasma que se disipan
    ctx.fillStyle = '#a5f3fc';
    for (let sp = 0; sp < 3; sp++) {
        const sx = x - (sp * 3) + (Math.random() - 0.5) * 3;
        const sy = y + 5 + (Math.random() - 0.5) * 3;
        ctx.fillRect(sx, sy, 2, 2);
    }
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
            if (desc) desc.innerText = `¡Has obtenido el Hiper-Núcleo de Poder! Astro aborda su nave espacial SP-1 y despega a velocidad luz rumbo al MUNDO ${currentWorldNum + 1}: ${WORLDS_CONFIG[currentWorldNum].name}.`;
            if (nextBtn) {
                nextBtn.innerText = `Despegar al Mundo ${currentWorldNum + 1} 🚀`;
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
        if (desc) desc.innerText = `¡Misión cumplida! Astro ha abordado su nave espacial SP-1 rumbo a las estrellas hacia el siguiente nivel.`;
        if (nextBtn) {
            nextBtn.innerText = `Despegar al Siguiente Nivel (${currentWorldNum}-${currentLevelNum + 1}) 🚀`;
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
    if (isPaused) {
        if (window.sounds && window.sounds.stopMusic) {
            window.sounds.stopMusic();
        }
    } else {
        if (window.sounds && window.sounds.startMusic && !window.sounds.muted) {
            window.sounds.startMusic(currentWorldNum, levelData ? levelData.isBossLevel : false);
        }
    }
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

function startGameDirectly(forceSkipStory = false) {
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

    // DETENER CUALQUIER MÚSICA INMEDIATAMENTE AL ENTRAR EN LA HISTORIA
    if (window.sounds && window.sounds.stopMusic) {
        window.sounds.stopMusic();
    }

    try {
        window.sounds.init();
        if (window.sounds.ctx && window.sounds.ctx.state === 'suspended') {
            window.sounds.ctx.resume();
        }
    } catch (err) {}

    // Cinemática animada de historia antes de comenzar la partida
    const shouldSkip = (forceSkipStory === true);
    if (!shouldSkip && window.StoryManager) {
        window.StoryManager.startIntroStory(() => {
            // La música arranca ÚNICAMENTE cuando Astro ya aterriza en el Mundo 1
            try {
                if (window.sounds && window.sounds.startMusic) {
                    window.sounds.startMusic(currentWorldNum, levelData ? levelData.isBossLevel : false);
                }
            } catch (e) {}
        });
        return;
    }

    try {
        window.sounds.startMusic(currentWorldNum, levelData ? levelData.isBossLevel : false);
    } catch (err) {
        console.error("Audio error on start:", err);
    }
}

function playStoryPrologue() {
    const menu = document.getElementById('mainMenuScreen');
    if (menu) menu.classList.add('hidden');
    gameStartedFromMenu = true;
    isPaused = false;
    if (window.sounds && window.sounds.stopMusic) {
        window.sounds.stopMusic();
    }
    if (window.StoryManager) {
        window.StoryManager.startIntroStory(() => {
            try {
                if (window.sounds && window.sounds.startMusic) {
                    window.sounds.startMusic(currentWorldNum, levelData ? levelData.isBossLevel : false);
                }
            } catch (e) {}
        });
    }
}
window.playStoryPrologue = playStoryPrologue;
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
        btnPlay.addEventListener('click', () => startGameDirectly(false));
        btnPlay.addEventListener('pointerdown', () => startGameDirectly(false), { passive: true });
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
