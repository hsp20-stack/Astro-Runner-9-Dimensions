// game.js - Astro Runner: Motor con Gráficos Modernos y Estilo Mario Bros
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

const TILE_SIZE = 32;
const VIEW_WIDTH = 480;
const VIEW_HEIGHT = 270;
canvas.width = VIEW_WIDTH;
canvas.height = VIEW_HEIGHT;

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

// Protagonista: Astro (Explorador Galáctico)
const astro = {
    x: 64,
    y: 150,
    w: 20,
    h: 28,
    vx: 0,
    vy: 0,
    speed: 3.0,
    jumpForce: -9.8, // Salto súper ágil y alto para subir fácilmente a cualquier bloque o tubería
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

    activeEnemies = JSON.parse(JSON.stringify(levelData.enemies));
    activeCrystals = JSON.parse(JSON.stringify(levelData.coins));
    activePowerUps = [];
    activePlasmaShots = [];
    particles = [];
    bossEntity = levelData.boss ? Object.assign({}, levelData.boss) : null;

    // Música de Zelda (solo si ya se pulsó JUGAR en el menú)
    if (gameStartedFromMenu) {
        window.sounds.startMusic(worldNum, levelData.isBossLevel);
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
    if (isPaused || isGameOver || isStageClear || !gameStartedFromMenu) return;

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
        jumpBuffer = 14;
    }

    if (astro.isGrounded) {
        coyoteTimer = 10;
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

    // Gravedad ágil y ligera estilo Mario 64 / Galaxy
    astro.vy += 0.40;
    if (astro.vy > 8.5) astro.vy = 8.5;

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

    window.sounds.playStageClear();
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

            if (!astro.isDying && checkAABB(astro, { x: e.x, y: e.y, w: 22, h: 20 })) {
                if (astro.vy > 0 && (astro.y + astro.h - astro.vy) <= e.y + 10) {
                    e.alive = false;
                    astro.vy = -6.8;
                    score += 200;
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
    if (bossAttackTimer % 95 === 0 && b.isGrounded) {
        b.vy = -7.6;
        b.isGrounded = false;
    }

    if (bossAttackTimer % 120 === 0) {
        const dir = (astro.x < b.x) ? -1 : 1;
        b.vx = dir * 2.2;
        bossProjectiles.push({
            x: b.x + (dir < 0 ? 0 : b.w),
            y: b.y + b.h / 3,
            w: 12,
            h: 12,
            vx: dir * 3.6,
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
    window.sounds.playGameOver();
}

function handleRespawn() {
    if (lives <= 0) {
        isGameOver = true;
        showGameOverModal();
    } else {
        loadLevel(currentWorldNum, currentLevelNum);
    }
}

function triggerStageClear(isWorldVictory) {
    isStageClear = true;
    window.sounds.playStageClear();

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
    showVictoryModal(isWorldVictory);
}

function checkCrystalCollisions() {
    for (let i = activeCrystals.length - 1; i >= 0; i--) {
        const c = activeCrystals[i];
        if (checkAABB(astro, { x: c.x, y: c.y, w: 18, h: 18 })) {
            activeCrystals.splice(i, 1);
            crystals++;
            score += 100;
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
// RENDERIZADO VISUAL MODERNO ESTILO NINTENDO
// ==========================================
function render() {
    if (!levelData) return;

    // Cielo con degradado vertical moderno
    const skyGrad = ctx.createLinearGradient(0, 0, 0, VIEW_HEIGHT);
    skyGrad.addColorStop(0, levelData.world.skyTop);
    skyGrad.addColorStop(1, levelData.world.skyBottom);
    ctx.fillStyle = skyGrad;
    ctx.fillRect(0, 0, VIEW_WIDTH, VIEW_HEIGHT);

    // Fondo temático dinámico según el mundo (Fuego en Mundo 8, Desierto en Mundo 2, etc.)
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
            drawCuteEnemy(e.x - cameraX, e.y, e.type);
        }
    }

    // Boss
    if (bossEntity && bossEntity.alive) {
        drawBossModern(bossEntity.x - cameraX, bossEntity.y);
        drawBossHealthBarModern();
    }

    // Proyectiles boss
    for (let bp of bossProjectiles) {
        ctx.fillStyle = bp.color;
        ctx.beginPath();
        ctx.arc(bp.x - cameraX + 6, bp.y + 6, 6, 0, Math.PI * 2);
        ctx.fill();
    }

    // Llave / Núcleo
    if (victoryCoreDropped) {
        drawGoldenStar(victoryCoreDropped.x - cameraX, victoryCoreDropped.y);
    }

    // El Jugador: Astro (con alta visibilidad y animaciones)
    if (!astro.isDying || astro.deathTimer < 90) {
        drawAstroModern();
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
}

function renderThemedBackdrop() {
    const theme = (levelData && levelData.world) ? (levelData.world.theme || "grassland") : "grassland";
    const bgOffset = cameraX * 0.25;

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
        // === MUNDO 1: COLINAS VERDES SUPER MARIO ===
        ctx.fillStyle = '#86efac';
        for (let i = 0; i < 4; i++) {
            const hx = ((i * 240) - bgOffset * 0.4) % (VIEW_WIDTH * 2.2);
            ctx.beginPath();
            ctx.arc(hx, 192, 85, Math.PI, 0, false);
            ctx.fill();
        }

        ctx.fillStyle = '#22c55e';
        for (let i = 0; i < 5; i++) {
            const hx = ((i * 180 + 60) - bgOffset * 0.8) % (VIEW_WIDTH * 2.2);
            ctx.beginPath();
            ctx.arc(hx, 192, 55, Math.PI, 0, false);
            ctx.fill();

            // Ojos negros de las colinas (sello inconfundible de Mario)
            ctx.fillStyle = '#0f172a';
            ctx.fillRect(hx - 12, 155, 3, 9);
            ctx.fillRect(hx + 9, 155, 3, 9);
            ctx.fillStyle = '#22c55e';
        }

        ctx.fillStyle = '#ffffff';
        for (let i = 0; i < 5; i++) {
            const cx = ((i * 180) - bgOffset * 1.6) % (VIEW_WIDTH * 2);
            const cy = 35 + (i % 2) * 25;
            ctx.beginPath();
            ctx.arc(cx, cy, 14, 0, Math.PI * 2);
            ctx.arc(cx + 14, cy - 6, 12, 0, Math.PI * 2);
            ctx.arc(cx + 28, cy, 14, 0, Math.PI * 2);
            ctx.fill();

            ctx.fillStyle = '#0f172a';
            ctx.fillRect(cx + 10, cy - 2, 2, 5);
            ctx.fillRect(cx + 16, cy - 2, 2, 5);
            ctx.fillStyle = '#ffffff';
        }
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
// DIBUJO DE TILES ESTILO MARIO BROS
// ==========================================
function drawMarioTile(tile, x, y, c, r) {
    if (tile === 1) {
        // SUELO CON HIERBA VERDE VIBRANTE Y TIERRA (ESTILO SUPER MARIO BROS)
        // Fondo de tierra marrón rica
        ctx.fillStyle = levelData.world.dirtColor;
        ctx.fillRect(x, y, TILE_SIZE, TILE_SIZE);

        // Textura de guijarros en la tierra
        ctx.fillStyle = levelData.world.dirtPattern;
        ctx.fillRect(x + 4, y + 16, 6, 5);
        ctx.fillRect(x + 18, y + 22, 7, 5);

        // Capa de césped superior verde
        ctx.fillStyle = levelData.world.grassColor;
        ctx.fillRect(x, y, TILE_SIZE, 11);

        // Brillo superior del césped
        ctx.fillStyle = levelData.world.grassHighlight;
        ctx.fillRect(x, y, TILE_SIZE, 3);

        // Borde ondulado de césped cayendo
        ctx.fillStyle = levelData.world.grassColor;
        ctx.beginPath();
        ctx.arc(x + 6, y + 11, 4, 0, Math.PI);
        ctx.arc(x + 16, y + 11, 4, 0, Math.PI);
        ctx.arc(x + 26, y + 11, 4, 0, Math.PI);
        ctx.fill();

    } else if (tile === 13) {
        // TIERRA PROFUNDA DEBAJO DEL SUELO
        ctx.fillStyle = levelData.world.dirtColor;
        ctx.fillRect(x, y, TILE_SIZE, TILE_SIZE);
        ctx.fillStyle = levelData.world.dirtPattern;
        ctx.fillRect(x + 2, y + 6, 8, 6);
        ctx.fillRect(x + 16, y + 18, 9, 7);

    } else if (tile === 2) {
        // BLOQUE DE LADRILLO MARIO 3D
        ctx.fillStyle = levelData.world.blockColor;
        ctx.fillRect(x, y, TILE_SIZE, TILE_SIZE);

        // Borde 3D con relieve
        ctx.strokeStyle = '#7c2d12';
        ctx.lineWidth = 2;
        ctx.strokeRect(x + 1, y + 1, TILE_SIZE - 2, TILE_SIZE - 2);

        // Líneas de mortero de ladrillo
        ctx.beginPath();
        ctx.moveTo(x, y + 16);
        ctx.lineTo(x + TILE_SIZE, y + 16);
        ctx.moveTo(x + 16, y);
        ctx.lineTo(x + 16, y + 16);
        ctx.moveTo(x + 8, y + 16);
        ctx.lineTo(x + 8, y + TILE_SIZE);
        ctx.moveTo(x + 24, y + 16);
        ctx.lineTo(x + 24, y + TILE_SIZE);
        ctx.stroke();

    } else if (tile === 3 || tile === 4) {
        // BLOQUE '?' DORADO METÁLICO MODERNO
        ctx.fillStyle = '#f59e0b';
        ctx.fillRect(x, y, TILE_SIZE, TILE_SIZE);

        // Brillo superior
        ctx.fillStyle = '#fde68a';
        ctx.fillRect(x + 2, y + 2, TILE_SIZE - 4, 4);

        ctx.strokeStyle = '#b45309';
        ctx.lineWidth = 2;
        ctx.strokeRect(x + 1, y + 1, TILE_SIZE - 2, TILE_SIZE - 2);

        // Tornillos en las 4 esquinas
        ctx.fillStyle = '#78350f';
        ctx.fillRect(x + 3, y + 3, 3, 3);
        ctx.fillRect(x + TILE_SIZE - 6, y + 3, 3, 3);
        ctx.fillRect(x + 3, y + TILE_SIZE - 6, 3, 3);
        ctx.fillRect(x + TILE_SIZE - 6, y + TILE_SIZE - 6, 3, 3);

        // Símbolo '?' blanco con relieve
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 20px monospace';
        ctx.fillText('?', x + 9, y + 24);

    } else if (tile >= 5 && tile <= 8) {
        // TUBERÍAS VERDES COMPACTAS Y BAJAS (FÁCILES DE SALTAR)
        const pipeY = y + 6; // Altura reducida y compacta (26px) para saltar comodísimo
        const pipeH = TILE_SIZE - 6;
        ctx.fillStyle = '#16a34a';
        ctx.fillRect(x, pipeY, TILE_SIZE, pipeH);

        // Borde superior o collar de la tubería
        ctx.fillStyle = '#22c55e';
        ctx.fillRect(x, pipeY, TILE_SIZE, 6);

        // Brillo reflectante blanco vertical
        ctx.fillStyle = '#86efac';
        ctx.fillRect(x + 5, pipeY, 4, pipeH);

        // Sombra lateral
        ctx.fillStyle = '#14532d';
        ctx.fillRect(x + TILE_SIZE - 5, pipeY, 5, pipeH);

        ctx.strokeStyle = '#052e16';
        ctx.lineWidth = 1.5;
        ctx.strokeRect(x, pipeY, TILE_SIZE, pipeH);

    } else if (tile === 10) {
        // MÁSTIL DE META (TILE 10)
        // Poste metálico plateado elegante con reflejo
        ctx.fillStyle = '#64748b';
        ctx.fillRect(x + 13, y, 6, TILE_SIZE);
        ctx.fillStyle = '#f8fafc';
        ctx.fillRect(x + 15, y, 2, TILE_SIZE);

        // Bola dorada superior (solo en la cima del mástil, fila r === 1)
        if (r === 1) {
            ctx.fillStyle = '#fbbf24';
            ctx.beginPath();
            ctx.arc(x + 16, y + 4, 7, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillStyle = '#ffffff';
            ctx.beginPath();
            ctx.arc(x + 14, y + 2, 2.5, 0, Math.PI * 2);
            ctx.fill();
        }

        // Pedestal de piedra esculpida en la base (solo en fila r === 5)
        if (r === 5) {
            ctx.fillStyle = '#475569';
            ctx.fillRect(x + 5, y + 14, 22, 18);
            ctx.fillStyle = '#94a3b8';
            ctx.fillRect(x + 6, y + 14, 20, 3);
            ctx.strokeStyle = '#1e293b';
            ctx.lineWidth = 1.5;
            ctx.strokeRect(x + 5, y + 14, 22, 18);
        }

    } else if (tile === 11) {
        // PUERTA DEL CASTILLO (ARCO ABIERTO PARA ENTRAR A LA META)
        ctx.fillStyle = '#020617';
        ctx.beginPath();
        ctx.arc(x + 16, y + 16, 14, Math.PI, 0, false);
        ctx.lineTo(x + 30, y + 32);
        ctx.lineTo(x + 2, y + 32);
        ctx.closePath();
        ctx.fill();

    } else if (tile === 12) {
        // BLOQUE GASTADO / PIEDRA DURA DE CASTILLO
        ctx.fillStyle = '#64748b';
        ctx.fillRect(x, y, TILE_SIZE, TILE_SIZE);
        ctx.strokeStyle = '#334155';
        ctx.strokeRect(x + 1, y + 1, TILE_SIZE - 2, TILE_SIZE - 2);

    } else if (tile === 9) {
        // LAVA
        ctx.fillStyle = '#ef4444';
        ctx.fillRect(x, y, TILE_SIZE, TILE_SIZE);
        ctx.fillStyle = '#fde047';
        ctx.fillRect(x, y, TILE_SIZE, 4);
    }
}

// ==========================================
// DIBUJO DE ASTRO (SUPER VISIBLE Y ELEGANTE)
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

    // Traje y colores
    const isSuper = astro.state === 'super';
    const isPlasma = astro.state === 'plasma';
    const isTransforming = astro.transformationTimer > 0;

    let suitColor = '#ffffff';
    let armorColor = '#0284c7';
    let visorColor = '#38bdf8';

    if (isTransforming && Math.floor(astro.transformationTimer / 3) % 2 === 0) {
        // Destello visual de transformación estilo Super Mario
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

    // Aura de poder si está transformado
    if (isSuper || isPlasma || isTransforming) {
        ctx.strokeStyle = isPlasma ? 'rgba(56, 189, 248, 0.7)' : 'rgba(251, 191, 36, 0.7)';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.ellipse(px + astro.w / 2, py + astro.h / 2, astro.w / 2 + 5, astro.h / 2 + 5, 0, 0, Math.PI * 2);
        ctx.stroke();
    }

    // Micro-Jetpack trasero con llama
    ctx.fillStyle = '#475569';
    ctx.fillRect(px - 4, py + 8, 6, astro.h - 14);

    if (!astro.isGrounded) {
        // Llama activa del jetpack
        ctx.fillStyle = isPlasma ? '#ef4444' : '#38bdf8';
        ctx.beginPath();
        ctx.moveTo(px - 3, py + astro.h - 6);
        ctx.lineTo(px - 1, py + astro.h + 7);
        ctx.lineTo(px + 1, py + astro.h - 6);
        ctx.fill();
    }

    // Cuerpo / Torso
    ctx.fillStyle = suitColor;
    ctx.fillRect(px + 2, py + 12, astro.w - 4, astro.h - 14);

    // Cañón de Plasma montado en el brazo (solo en estado plasma)
    if (isPlasma) {
        ctx.fillStyle = '#1e293b';
        ctx.fillRect(px + astro.w - 3, py + 14, 9, 6);
        ctx.fillStyle = '#38bdf8';
        ctx.fillRect(px + astro.w + 3, py + 15, 4, 4);
    }

    // Cinturón y emblema
    ctx.fillStyle = armorColor;
    ctx.fillRect(px + 2, py + 18, astro.w - 4, 3);
    ctx.fillStyle = visorColor;
    ctx.fillRect(px + astro.w / 2 - 2, py + 14, 4, 4);

    // Botas
    ctx.fillStyle = armorColor;
    const footOffset = (astro.animFrame % 2 === 0) ? 0 : 3;
    ctx.fillRect(px + 1, py + astro.h - 4 + footOffset, 7, 4);
    ctx.fillRect(px + astro.w - 8, py + astro.h - 4 - footOffset, 7, 4);

    // Casco espacial redondeado con brillo de cristal
    ctx.fillStyle = suitColor;
    ctx.beginPath();
    ctx.arc(px + astro.w / 2, py + 8, 9, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = armorColor;
    ctx.lineWidth = 1.5;
    ctx.stroke();

    // Visor brillante con ojos expresivos
    ctx.fillStyle = '#0f172a';
    ctx.beginPath();
    ctx.ellipse(px + astro.w / 2 + 1, py + 8, 6, 4, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = visorColor;
    ctx.fillRect(px + astro.w / 2, py + 7, 5, 2); // Línea de visión

    ctx.restore();
}

function drawGoldCoin(x, y) {
    ctx.fillStyle = '#fbbf24';
    ctx.beginPath();
    ctx.ellipse(x + 8, y + 8, 7, 9, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#fef08a';
    ctx.beginPath();
    ctx.ellipse(x + 7, y + 8, 4, 6, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = '#b45309';
    ctx.lineWidth = 1;
    ctx.stroke();
}

function drawCuteEnemy(x, y, type) {
    if (type === 'goomba') {
        // Champiñón marrón estilo Goomba
        ctx.fillStyle = '#b45309';
        ctx.beginPath();
        ctx.arc(x + 11, y + 10, 10, Math.PI, 0, false);
        ctx.fill();

        ctx.fillStyle = '#fde68a';
        ctx.fillRect(x + 4, y + 10, 14, 7);

        // Ojos negros enojados
        ctx.fillStyle = '#0f172a';
        ctx.fillRect(x + 6, y + 10, 2, 5);
        ctx.fillRect(x + 14, y + 10, 2, 5);

        // Pies negros
        ctx.fillRect(x + 2, y + 17, 6, 3);
        ctx.fillRect(x + 14, y + 17, 6, 3);
    } else {
        // Tortuga Koopa verde
        ctx.fillStyle = '#22c55e';
        ctx.fillRect(x + 3, y + 4, 16, 14);
        ctx.strokeStyle = '#ffffff';
        ctx.strokeRect(x + 5, y + 6, 12, 10);
        ctx.fillStyle = '#fef08a';
        ctx.fillRect(x + 14, y + 4, 6, 6);
    }
}

function drawBossModern(x, y) {
    const b = bossEntity;
    ctx.fillStyle = b.color;
    ctx.fillRect(x, y, b.w, b.h);

    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2;
    ctx.strokeRect(x, y, b.w, b.h);

    // Ojos feroces
    ctx.fillStyle = '#fde047';
    ctx.fillRect(x + 8, y + 12, 10, 10);
    ctx.fillRect(x + b.w - 18, y + 12, 10, 10);

    ctx.fillStyle = '#dc2626';
    ctx.fillRect(x + 12, y + 14, 5, 5);
    ctx.fillRect(x + b.w - 14, y + 14, 5, 5);

    // Cuernos
    ctx.fillStyle = '#1e293b';
    ctx.beginPath();
    ctx.moveTo(x + 6, y);
    ctx.lineTo(x + 12, y - 10);
    ctx.lineTo(x + 18, y);
    ctx.moveTo(x + b.w - 18, y);
    ctx.lineTo(x + b.w - 12, y - 10);
    ctx.lineTo(x + b.w - 6, y);
    ctx.fill();
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

function drawGoldenStar(x, y) {
    ctx.fillStyle = '#fde047';
    ctx.beginPath();
    ctx.arc(x + 12, y + 12, 10, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#f59e0b';
    ctx.lineWidth = 2;
    ctx.stroke();
}

function drawPowerUpItem(x, y, type) {
    if (type === 'battery') {
        // Champiñón rojo estilo Mario
        ctx.fillStyle = '#ef4444';
        ctx.beginPath();
        ctx.arc(x + 10, y + 9, 9, Math.PI, 0, false);
        ctx.fill();
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(x + 6, y + 9, 8, 8);
        ctx.fillRect(x + 8, y + 4, 4, 4);
    } else {
        // Flor de fuego
        ctx.fillStyle = '#f97316';
        ctx.beginPath();
        ctx.arc(x + 10, y + 10, 8, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#fde047';
        ctx.beginPath();
        ctx.arc(x + 10, y + 10, 4, 0, Math.PI * 2);
        ctx.fill();
    }
}

function drawPlasmaBall(x, y) {
    ctx.fillStyle = '#38bdf8';
    ctx.beginPath();
    ctx.arc(x + 5, y + 5, 5, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(x + 5, y + 5, 2, 0, Math.PI * 2);
    ctx.fill();
}

// ==========================================
// BUCLE PRINCIPAL
// ==========================================
let lastTime = 0;
function gameLoop(time) {
    const dt = Math.min((time - lastTime) / 1000, 0.1);
    lastTime = time;

    updateGame(dt);
    render();

    requestAnimationFrame(gameLoop);
}

// ==========================================
// MODALES
// ==========================================
function showVictoryModal(isBossDefeated) {
    const modal = document.getElementById('modalVictory');
    const title = document.getElementById('victoryTitle');
    const desc = document.getElementById('victoryDesc');
    const nextBtn = document.getElementById('btnNextLevel');

    if (isBossDefeated) {
        if (currentWorldNum === 9) {
            title.innerText = "¡CAMPEÓN DE LOS 9 MUNDOS!";
            desc.innerText = "¡Has derrotado al Emperador Supremo y superado todos los 72 niveles del juego!";
            nextBtn.innerText = "Reiniciar Aventura";
            nextBtn.onclick = () => {
                modal.classList.add('hidden');
                loadLevel(1, 1);
            };
        } else {
            title.innerText = `¡JEFE DEL MUNDO ${currentWorldNum} DERROTADO!`;
            desc.innerText = `¡Has obtenido la Estrella Mágica! El portal hacia el MUNDO ${currentWorldNum + 1}: ${WORLDS_CONFIG[currentWorldNum].name} se ha abierto.`;
            nextBtn.innerText = `Viajar al Mundo ${currentWorldNum + 1}`;
            nextBtn.onclick = () => {
                modal.classList.add('hidden');
                loadLevel(currentWorldNum + 1, 1);
            };
        }
    } else {
        title.innerText = `¡NIVEL ${currentWorldNum}-${currentLevelNum} COMPLETADO!`;
        desc.innerText = `¡Excelente salto! Te acercas al castillo del Boss final.`;
        nextBtn.innerText = `Siguiente Nivel (${currentWorldNum}-${currentLevelNum + 1})`;
        nextBtn.onclick = () => {
            modal.classList.add('hidden');
            loadLevel(currentWorldNum, currentLevelNum + 1);
        };
    }

    modal.classList.remove('hidden');
}

function showGameOverModal() {
    const modal = document.getElementById('modalGameOver');
    modal.classList.remove('hidden');
}

function restartFromBeginning() {
    lives = 3;
    score = 0;
    crystals = 0;
    isGameOver = false;
    document.getElementById('modalGameOver').classList.add('hidden');
    loadLevel(currentWorldNum, 1);
}

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
            jumpBuffer = 14;
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

        const press = (e) => {
            if (e) {
                if (e.cancelable) e.preventDefault();
                e.stopPropagation();
            }
            window.sounds.init();
            if (navigator.vibrate && vibrationEnabled) navigator.vibrate(15);
            onDown();
        };

        const release = (e) => {
            if (e) {
                if (e.cancelable) e.preventDefault();
                e.stopPropagation();
            }
            onUp();
        };

        el.addEventListener('pointerdown', press, { passive: false });
        el.addEventListener('pointerup', release, { passive: false });
        el.addEventListener('pointercancel', release, { passive: false });

        el.addEventListener('touchstart', press, { passive: false });
        el.addEventListener('touchend', release, { passive: false });
        el.addEventListener('touchcancel', release, { passive: false });

        el.addEventListener('mousedown', press);
        el.addEventListener('mouseup', release);
    };

    // Reseteo global para que NUNCA se quede pegado ningún botón
    window.addEventListener('pointerup', () => {
        keys.left = false;
        keys.right = false;
        keys.up = false;
        keys.down = false;
        keys.actionB = false;
    });
    window.addEventListener('touchend', () => {
        keys.left = false;
        keys.right = false;
        keys.up = false;
        keys.down = false;
        keys.actionB = false;
    });
    window.addEventListener('touchcancel', () => {
        keys.left = false;
        keys.right = false;
        keys.up = false;
        keys.down = false;
        keys.actionB = false;
    });

    bindTouch('btnLeft', () => keys.left = true, () => keys.left = false);
    bindTouch('btnRight', () => keys.right = true, () => keys.right = false);
    bindTouch('btnDown', () => keys.down = true, () => keys.down = false);
    bindTouch('btnA', () => {
        keys.up = true;
        jumpBuffer = 14;
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

function setupGameFlow() {
    const splash = document.getElementById('studioSplashScreen');
    const mainMenu = document.getElementById('mainMenuScreen');

    let splashFinished = false;

    const endSplashAndShowMenu = () => {
        if (splashFinished) return;
        splashFinished = true;

        window.sounds.init();
        window.sounds.playStudioIntroChime();

        setTimeout(() => {
            splash.classList.add('fade-out');
            setTimeout(() => {
                splash.style.display = 'none';
                mainMenu.classList.remove('hidden');
            }, 700);
        }, 2200);
    };

    // Toque para avanzar la intro de Hugo SP Studios
    splash.addEventListener('click', endSplashAndShowMenu);
    splash.addEventListener('touchstart', endSplashAndShowMenu, { passive: true });
    setTimeout(endSplashAndShowMenu, 600);

    // Botones del Menú Principal
    const playAction = (e) => {
        if (e) e.preventDefault();
        window.sounds.init();
        mainMenu.classList.add('hidden');
        gameStartedFromMenu = true;
        isPaused = false;
        window.sounds.startMusic(currentWorldNum, levelData ? levelData.isBossLevel : false);
    };

    const worldSelectAction = (e) => {
        if (e) e.preventDefault();
        window.sounds.init();
        openWorldSelector();
    };

    const controlsAction = (e) => {
        if (e) e.preventDefault();
        window.sounds.init();
        document.getElementById('modalControls').classList.remove('hidden');
    };

    const settingsAction = (e) => {
        if (e) e.preventDefault();
        window.sounds.init();
        document.getElementById('modalSettings').classList.remove('hidden');
    };

    const btnPlay = document.getElementById('btnPlayGame');
    btnPlay.addEventListener('click', playAction);
    btnPlay.addEventListener('touchstart', playAction, { passive: false });

    const btnWorldMenu = document.getElementById('btnOpenWorldSelectMenu');
    if (btnWorldMenu) {
        btnWorldMenu.addEventListener('click', worldSelectAction);
        btnWorldMenu.addEventListener('touchstart', worldSelectAction, { passive: false });
    }

    const btnCtrl = document.getElementById('btnOpenControls');
    btnCtrl.addEventListener('click', controlsAction);
    btnCtrl.addEventListener('touchstart', controlsAction, { passive: false });

    const btnSet = document.getElementById('btnOpenSettings');
    btnSet.addEventListener('click', settingsAction);
    btnSet.addEventListener('touchstart', settingsAction, { passive: false });
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
    window.sounds.stopMusic();
    document.getElementById('pauseOverlay').classList.add('hidden');
    document.getElementById('modalGameOver').classList.add('hidden');
    document.getElementById('modalVictory').classList.add('hidden');
    document.getElementById('mainMenuScreen').classList.remove('hidden');
}

window.addEventListener('load', () => {
    setupControls();
    loadLevel(saveState.currentWorld || 1, saveState.currentLevel || 1);
    setupGameFlow();
    requestAnimationFrame(gameLoop);
});
