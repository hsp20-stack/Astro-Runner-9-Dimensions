// game.js - Astro Runner: 9 Dimensions (Motor principal del juego de plataformas espacial)
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

// Configuración de pantalla retro-futurista
const TILE_SIZE = 32;
const VIEW_WIDTH = 480;
const VIEW_HEIGHT = 270;
canvas.width = VIEW_WIDTH;
canvas.height = VIEW_HEIGHT;

// Guardado de progreso en el dispositivo
const SAVE_KEY = 'astro_runner_mobile_save_v1';
function loadProgress() {
    try {
        const data = localStorage.getItem(SAVE_KEY);
        if (data) {
            return JSON.parse(data);
        }
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

// Protagonista: Astro (Explorador Robótico)
const astro = {
    x: 64,
    y: 180,
    w: 16,
    h: 24,
    vx: 0,
    vy: 0,
    speed: 2.8,
    jumpForce: -8.8,
    isGrounded: false,
    facing: 'right',
    state: 'normal', // 'normal', 'super' (Exo-Shield), 'plasma' (Plasma Blaster)
    invulnerableTimer: 0,
    isDying: false,
    deathTimer: 0,
    animFrame: 0,
    animTimer: 0,
    crouch: false
};

// Entidades activas
let activeEnemies = [];
let activeCrystals = [];
let activePowerUps = [];
let activePlasmaShots = [];
let particles = [];
let bossEntity = null;

// Controles
const keys = {
    left: false,
    right: false,
    up: false,
    down: false,
    actionB: false,
    actionPressedOnce: false
};

// ==========================================
// CARGAR NIVEL / SECTOR
// ==========================================
function loadLevel(worldNum, levelNum) {
    currentWorldNum = worldNum;
    currentLevelNum = levelNum;
    saveState.currentWorld = worldNum;
    saveState.currentLevel = levelNum;
    saveProgress(saveState);

    levelData = LevelBuilder.generateLevel(worldNum, levelNum);

    astro.x = levelData.spawnX;
    astro.y = levelData.spawnY;
    astro.vx = 0;
    astro.vy = 0;
    astro.isDying = false;
    astro.deathTimer = 0;
    astro.invulnerableTimer = 60;
    cameraX = 0;
    energyTime = 300;
    timeAccumulator = 0;
    isStageClear = false;
    victoryCoreDropped = null;

    activeEnemies = JSON.parse(JSON.stringify(levelData.enemies));
    activeCrystals = JSON.parse(JSON.stringify(levelData.coins));
    activePowerUps = [];
    activePlasmaShots = [];
    particles = [];
    bossEntity = levelData.boss ? Object.assign({}, levelData.boss) : null;

    window.sounds.startMusic(worldNum, levelData.isBossLevel);
    updateUI();
}

function updateUI() {
    const worldEl = document.getElementById('uiWorld');
    const scoreEl = document.getElementById('uiScore');
    const coinsEl = document.getElementById('uiCoins');
    const livesEl = document.getElementById('uiLives');
    const timeEl = document.getElementById('uiTime');

    if (worldEl) worldEl.innerText = `DIM ${currentWorldNum}-${currentLevelNum}`;
    if (scoreEl) scoreEl.innerText = String(score).padStart(6, '0');
    if (coinsEl) coinsEl.innerText = `x${String(crystals).padStart(2, '0')}`;
    if (livesEl) livesEl.innerText = `x${lives}`;
    if (timeEl) timeEl.innerText = String(Math.max(0, Math.floor(energyTime))).padStart(3, '0');
}

// ==========================================
// FÍSICAS Y ACTUALIZACIÓN
// ==========================================
function updateGame(dt) {
    if (isPaused || isGameOver || isStageClear) return;

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
        if (astro.deathTimer > 120) {
            handleRespawn();
        }
        return;
    }

    // Movimiento horizontal con propulsores
    const currentSpeed = keys.actionB ? astro.speed * 1.35 : astro.speed;
    if (keys.left) {
        astro.vx = -currentSpeed;
        astro.facing = 'left';
    } else if (keys.right) {
        astro.vx = currentSpeed;
        astro.facing = 'right';
    } else {
        astro.vx *= 0.7;
        if (Math.abs(astro.vx) < 0.1) astro.vx = 0;
    }

    // Propulsión / Salto con Jetpack
    if (keys.up && astro.isGrounded) {
        astro.vy = astro.jumpForce;
        astro.isGrounded = false;
        window.sounds.playJump(astro.state !== 'normal');
        createJetpackFlames(astro.x + astro.w / 2, astro.y + astro.h);
    }

    astro.vy += 0.45;
    if (astro.vy > 9) astro.vy = 9;

    // Colisiones
    astro.x += astro.vx;
    checkHorizontalCollision(astro);

    if (astro.x < cameraX) {
        astro.x = cameraX;
        astro.vx = 0;
    }

    astro.y += astro.vy;
    astro.isGrounded = false;
    checkVerticalCollision(astro);

    // Animación de zancada
    if (Math.abs(astro.vx) > 0.2 && astro.isGrounded) {
        astro.animTimer++;
        if (astro.animTimer % 6 === 0) {
            astro.animFrame = (astro.animFrame + 1) % 4;
        }
    } else {
        astro.animFrame = 0;
    }

    if (astro.invulnerableTimer > 0) {
        astro.invulnerableTimer--;
    }

    // Caída al abismo cósmico
    if (astro.y > levelData.mapHeight * TILE_SIZE + 40) {
        killPlayer();
    }

    // Disparar proyectil de Plasma (Modo Plasma Blaster)
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

    // Meta final del sector
    if (!levelData.isBossLevel && astro.x >= levelData.flagX) {
        triggerStageClear(false);
    }

    // Hiper-Núcleo del Boss
    if (victoryCoreDropped) {
        updateVictoryCore();
    }

    updateParticles();
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
           tile === 5 || tile === 6 || tile === 7 || tile === 8 || tile === 12;
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
    const leftCol = Math.floor((ent.x + 2) / TILE_SIZE);
    const rightCol = Math.floor((ent.x + ent.w - 2) / TILE_SIZE);
    const topRow = Math.floor(ent.y / TILE_SIZE);
    const bottomRow = Math.floor((ent.y + ent.h) / TILE_SIZE);

    if (ent.vy >= 0) {
        for (let c = leftCol; c <= rightCol; c++) {
            const tile = getTileAt(c, bottomRow);
            if (isSolidTile(tile)) {
                ent.y = bottomRow * TILE_SIZE - ent.h;
                ent.vy = 0;
                ent.isGrounded = true;
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
        createCrystalParticle(c * TILE_SIZE + 8, (r - 1) * TILE_SIZE);
        updateUI();
    } else if (tile === 4) {
        setTileAt(c, r, 12);
        const pType = (astro.state === 'normal') ? 'battery' : 'plasma';
        activePowerUps.push({
            x: c * TILE_SIZE,
            y: (r - 1) * TILE_SIZE,
            w: 16,
            h: 16,
            vx: 1.2,
            vy: -2,
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
            createJetpackFlames(c * TILE_SIZE + 16, (r + 1) * TILE_SIZE);
        }
    }
}

// ==========================================
// DISPAROS DE PLASMA Y PODERES
// ==========================================
function spawnPlasmaShot() {
    if (activePlasmaShots.length >= 3) return;
    window.sounds.playFireball();
    const dir = astro.facing === 'right' ? 1 : -1;
    activePlasmaShots.push({
        x: astro.x + (dir > 0 ? astro.w : -8),
        y: astro.y + astro.h / 2,
        w: 8,
        h: 8,
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
        ps.vy += 0.3;

        const col = Math.floor((ps.x + 4) / TILE_SIZE);
        const row = Math.floor((ps.y + 8) / TILE_SIZE);
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
                createExplosionParticles(e.x + e.w / 2, e.y + e.h / 2, '#00ffff');
                hit = true;
                break;
            }
        }

        if (!hit && bossEntity && bossEntity.alive && checkAABB(ps, bossEntity)) {
            damageBoss(1);
            hit = true;
        }

        if (hit || ps.x < cameraX - 50 || ps.x > cameraX + VIEW_WIDTH + 50) {
            createExplosionParticles(ps.x, ps.y, '#00f2fe');
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
            if (p.type === 'battery') {
                astro.state = 'super';
                astro.h = 32;
                astro.y -= 8;
                score += 1000;
            } else if (p.type === 'plasma') {
                astro.state = 'plasma';
                score += 1000;
            }
            window.sounds.playPowerUp();
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

            const colAhead = Math.floor((e.vx > 0 ? e.x + 20 : e.x) / TILE_SIZE);
            const rowAt = Math.floor((e.y + 10) / TILE_SIZE);
            if (isSolidTile(getTileAt(colAhead, rowAt))) {
                e.vx = -e.vx;
            }

            e.y += e.vy;
            const bottomRow = Math.floor((e.y + 20) / TILE_SIZE);
            const col = Math.floor((e.x + 8) / TILE_SIZE);
            if (isSolidTile(getTileAt(col, bottomRow))) {
                e.y = bottomRow * TILE_SIZE - 16;
                e.vy = 0;
            }

            if (!astro.isDying && checkAABB(astro, { x: e.x, y: e.y, w: 18, h: 18 })) {
                if (astro.vy > 0 && (astro.y + astro.h - astro.vy) <= e.y + 10) {
                    e.alive = false;
                    astro.vy = -6.5;
                    score += 200;
                    window.sounds.playStomp();
                    createJetpackFlames(e.x + 8, e.y + 8);
                    updateUI();
                } else if (astro.invulnerableTimer === 0) {
                    damagePlayer();
                }
            }
        }
    }
}

// ==========================================
// BOSS DE LA DIMENSIÓN (NIVEL 8)
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
    if (bossAttackTimer % 100 === 0 && b.isGrounded) {
        b.vy = -7.5;
        b.isGrounded = false;
    }

    if (bossAttackTimer % 125 === 0) {
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
            astro.vy = -7.5;
        } else if (astro.invulnerableTimer === 0) {
            damagePlayer();
        }
    }
}

function damageBoss(amount) {
    if (!bossEntity || !bossEntity.alive) return;
    bossEntity.hp -= amount;
    window.sounds.playBossHurt();
    createExplosionParticles(bossEntity.x + bossEntity.w / 2, bossEntity.y + bossEntity.h / 2, '#00ffff');

    if (bossEntity.hp <= 0) {
        bossEntity.alive = false;
        score += 5000;
        updateUI();

        // ¡Aparece el Hiper-Núcleo Cuántico!
        victoryCoreDropped = {
            x: bossEntity.x + bossEntity.w / 2 - 12,
            y: bossEntity.y,
            w: 24,
            h: 24,
            vy: -4,
            animTimer: 0
        };
        createExplosionParticles(bossEntity.x, bossEntity.y, '#ff00ff');
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
        astro.h = 24;
        astro.invulnerableTimer = 90;
        window.sounds.playBossHurt();
    } else {
        killPlayer();
    }
}

function killPlayer() {
    if (astro.isDying) return;
    astro.isDying = true;
    astro.vy = -8;
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
        if (checkAABB(astro, { x: c.x, y: c.y, w: 16, h: 16 })) {
            activeCrystals.splice(i, 1);
            crystals++;
            score += 100;
            window.sounds.playCoin();
            createCrystalParticle(c.x, c.y);
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

function createJetpackFlames(x, y) {
    for (let i = 0; i < 5; i++) {
        particles.push({
            x, y,
            vx: (Math.random() - 0.5) * 2.5,
            vy: Math.random() * 2 + 1,
            color: Math.random() > 0.5 ? '#00f2fe' : '#4facfe',
            life: 14,
            maxLife: 14,
            size: 3
        });
    }
}

function createExplosionParticles(x, y, color) {
    for (let i = 0; i < 14; i++) {
        particles.push({
            x, y,
            vx: (Math.random() - 0.5) * 5,
            vy: (Math.random() - 0.5) * 5,
            color: color || '#00f2fe',
            life: 25,
            maxLife: 25,
            size: 4
        });
    }
}

function createDebrisParticles(x, y) {
    for (let i = 0; i < 6; i++) {
        particles.push({
            x, y,
            vx: (Math.random() - 0.5) * 4,
            vy: -Math.random() * 4 - 2,
            color: levelData.world.blockColor,
            life: 30,
            maxLife: 30,
            size: 5
        });
    }
}

function createCrystalParticle(x, y) {
    particles.push({
        x: x + 4,
        y: y,
        vx: 0,
        vy: -3.5,
        color: '#00ffff',
        life: 20,
        maxLife: 20,
        size: 8,
        isCrystal: true
    });
}

function updateParticles() {
    for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i];
        p.x += p.vx;
        p.y += p.vy;
        p.life--;
        if (p.isCrystal) p.vy += 0.15;
        if (p.life <= 0) {
            particles.splice(i, 1);
        }
    }
}

// ==========================================
// RENDERIZADO VISUAL
// ==========================================
function render() {
    if (!levelData) return;

    ctx.fillStyle = levelData.world.skyColor;
    ctx.fillRect(0, 0, VIEW_WIDTH, VIEW_HEIGHT);

    renderSpaceParallax();

    const startCol = Math.floor(cameraX / TILE_SIZE);
    const endCol = Math.min(levelData.mapWidth - 1, Math.floor((cameraX + VIEW_WIDTH) / TILE_SIZE) + 1);

    for (let r = 0; r < levelData.mapHeight; r++) {
        for (let c = startCol; c <= endCol; c++) {
            const tile = levelData.grid[r][c];
            if (tile === 0) continue;

            const drawX = Math.floor(c * TILE_SIZE - cameraX);
            const drawY = r * TILE_SIZE;
            drawTile(tile, drawX, drawY);
        }
    }

    for (let crystal of activeCrystals) {
        if (crystal.x > cameraX - 16 && crystal.x < cameraX + VIEW_WIDTH + 16) {
            drawCrystal(crystal.x - cameraX, crystal.y);
        }
    }

    for (let p of activePowerUps) {
        drawPowerUp(p.x - cameraX, p.y, p.type);
    }

    for (let ps of activePlasmaShots) {
        drawPlasmaShot(ps.x - cameraX, ps.y);
    }

    for (let e of activeEnemies) {
        if (e.alive && e.x > cameraX - 32 && e.x < cameraX + VIEW_WIDTH + 32) {
            drawEnemy(e.x - cameraX, e.y, e.type);
        }
    }

    if (bossEntity && bossEntity.alive) {
        drawBoss(bossEntity.x - cameraX, bossEntity.y);
        drawBossHealthBar();
    }

    for (let bp of bossProjectiles) {
        ctx.fillStyle = bp.color;
        ctx.beginPath();
        ctx.arc(bp.x - cameraX + 6, bp.y + 6, 6, 0, Math.PI * 2);
        ctx.fill();
    }

    if (victoryCoreDropped) {
        drawQuantumCore(victoryCoreDropped.x - cameraX, victoryCoreDropped.y);
    }

    if (!astro.isDying || astro.deathTimer < 100) {
        drawAstro();
    }

    for (let p of particles) {
        ctx.fillStyle = p.color;
        if (p.isCrystal) {
            drawCrystal(p.x - cameraX, p.y);
        } else {
            ctx.fillRect(p.x - cameraX, p.y, p.size, p.size);
        }
    }
}

function renderSpaceParallax() {
    const bgOffset = cameraX * 0.25;
    ctx.fillStyle = '#ffffff';

    // Estrellas titilantes en el cosmos
    for (let i = 0; i < 40; i++) {
        const sx = ((i * 37) - bgOffset) % (VIEW_WIDTH * 2);
        const sy = (i * 17) % (VIEW_HEIGHT - 40);
        ctx.globalAlpha = 0.4 + ((i % 5) * 0.12);
        ctx.fillRect(sx, sy, (i % 3 === 0) ? 2 : 1, (i % 3 === 0) ? 2 : 1);
    }

    // Nebulosas lejanas
    ctx.fillStyle = levelData.world.cloudColor;
    ctx.globalAlpha = 0.35;
    for (let i = 0; i < 6; i++) {
        const cx = ((i * 180) - bgOffset * 1.5) % (VIEW_WIDTH * 2);
        const cy = 20 + (i % 3) * 25;
        ctx.beginPath();
        ctx.arc(cx, cy, 26, 0, Math.PI * 2);
        ctx.arc(cx + 20, cy - 8, 20, 0, Math.PI * 2);
        ctx.arc(cx + 40, cy, 22, 0, Math.PI * 2);
        ctx.fill();
    }
    ctx.globalAlpha = 1.0;
}

function drawTile(tile, x, y) {
    if (tile === 1) { // Plataforma tecno-alienígena
        ctx.fillStyle = levelData.world.groundColor;
        ctx.fillRect(x, y, TILE_SIZE, TILE_SIZE);
        ctx.fillStyle = '#00f2fe';
        ctx.fillRect(x, y, TILE_SIZE, 2); // Borde de neón superior
        ctx.fillStyle = 'rgba(0,0,0,0.2)';
        ctx.fillRect(x + 4, y + 6, TILE_SIZE - 8, TILE_SIZE - 8);
    } else if (tile === 2) { // Contenedor blindado rompible
        ctx.fillStyle = levelData.world.blockColor;
        ctx.fillRect(x, y, TILE_SIZE, TILE_SIZE);
        ctx.strokeStyle = '#00f2fe';
        ctx.lineWidth = 1.5;
        ctx.strokeRect(x + 2, y + 2, TILE_SIZE - 4, TILE_SIZE - 4);
        ctx.fillStyle = '#00f2fe';
        ctx.fillRect(x + 12, y + 12, 8, 8);
    } else if (tile === 3 || tile === 4) { // Cápsula energética '?'
        ctx.fillStyle = '#1e293b';
        ctx.fillRect(x, y, TILE_SIZE, TILE_SIZE);
        ctx.strokeStyle = '#38bdf8';
        ctx.lineWidth = 2;
        ctx.strokeRect(x + 1, y + 1, TILE_SIZE - 2, TILE_SIZE - 2);
        ctx.fillStyle = '#38bdf8';
        ctx.font = 'bold 18px monospace';
        ctx.fillText('⚡', x + 6, y + 23);
    } else if (tile === 12) { // Bloque de titanio indestructible
        ctx.fillStyle = '#334155';
        ctx.fillRect(x, y, TILE_SIZE, TILE_SIZE);
        ctx.strokeStyle = '#64748b';
        ctx.strokeRect(x, y, TILE_SIZE, TILE_SIZE);
    } else if (tile >= 5 && tile <= 8) { // Conductos de refrigeración
        ctx.fillStyle = '#0284c7';
        ctx.fillRect(x, y, TILE_SIZE, TILE_SIZE);
        ctx.fillStyle = '#38bdf8';
        ctx.fillRect(x + 4, y, TILE_SIZE - 8, TILE_SIZE);
        ctx.strokeStyle = '#0369a1';
        ctx.strokeRect(x, y, TILE_SIZE, TILE_SIZE);
    } else if (tile === 9) { // Río de plasma
        ctx.fillStyle = '#ff007f';
        ctx.fillRect(x, y, TILE_SIZE, TILE_SIZE);
        ctx.fillStyle = '#00ffff';
        ctx.fillRect(x, y + 3, TILE_SIZE, 3);
    } else if (tile === 10) { // Baliza de teletransporte
        ctx.fillStyle = '#00f2fe';
        ctx.fillRect(x + 14, y, 4, TILE_SIZE);
        ctx.fillStyle = '#38bdf8';
        ctx.beginPath();
        ctx.arc(x + 16, y + 6, 8, 0, Math.PI * 2);
        ctx.fill();
    } else if (tile === 11) { // Portal de evacuación
        ctx.fillStyle = '#0f172a';
        ctx.fillRect(x + 4, y, TILE_SIZE - 8, TILE_SIZE);
        ctx.strokeStyle = '#00f2fe';
        ctx.strokeRect(x + 4, y, TILE_SIZE - 8, TILE_SIZE);
    }
}

// ==========================================
// DIBUJAR AL PROTAGONISTA: ASTRO
// ==========================================
function drawAstro() {
    if (astro.invulnerableTimer > 0 && Math.floor(astro.invulnerableTimer / 4) % 2 === 0) {
        return;
    }

    const px = Math.floor(astro.x - cameraX);
    const py = Math.floor(astro.y);

    const isSuper = astro.state === 'super';
    const isPlasma = astro.state === 'plasma';

    // Colores del traje según potenciador
    let suitColor = '#f1f5f9';    // Blanco espacial
    let armorColor = '#0284c7';   // Azul tecno
    let visorColor = '#00f2fe';   // Cian brillante

    if (isSuper) {
        suitColor = '#fbbf24';    // Exo-Armadura dorada
        armorColor = '#b45309';
        visorColor = '#67e8f9';
    } else if (isPlasma) {
        suitColor = '#a855f7';    // Púrpura plasma
        armorColor = '#6b21a8';
        visorColor = '#22d3ee';
    }

    ctx.save();
    if (astro.facing === 'left') {
        ctx.scale(-1, 1);
        ctx.translate(-px * 2 - astro.w, 0);
    }

    // Micro-Jetpack en la espalda
    ctx.fillStyle = '#475569';
    ctx.fillRect(px - 3, py + 8, 5, astro.h - 12);
    // Propulsor
    ctx.fillStyle = '#38bdf8';
    ctx.fillRect(px - 2, py + astro.h - 4, 3, 2);

    // Casco espacial robótico
    ctx.fillStyle = suitColor;
    ctx.beginPath();
    ctx.arc(px + 8, py + 8, 8, 0, Math.PI * 2);
    ctx.fill();

    // Antena superior
    ctx.fillStyle = armorColor;
    ctx.fillRect(px + 7, py - 3, 2, 4);
    ctx.fillStyle = visorColor;
    ctx.fillRect(px + 6, py - 5, 4, 2);

    // Visor futurista con línea de escaneo
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(px + 5, py + 5, 8, 5);
    ctx.fillStyle = visorColor;
    ctx.fillRect(px + 6, py + 6, 6, 2);

    // Torso y armadura
    ctx.fillStyle = suitColor;
    ctx.fillRect(px + 2, py + 14, 12, astro.h - 14);

    // Núcleo energético en el pecho
    ctx.fillStyle = visorColor;
    ctx.fillRect(px + 6, py + 16, 4, 4);

    // Botas propulsoras magnéticas
    ctx.fillStyle = armorColor;
    const footOffset = (astro.animFrame % 2 === 0) ? 0 : 2;
    ctx.fillRect(px + 1, py + astro.h - 4 + footOffset, 5, 4);
    ctx.fillRect(px + 8, py + astro.h - 4 - footOffset, 5, 4);

    ctx.restore();
}

function drawEnemy(x, y, type) {
    if (type === 'drone') {
        // Drone centinela flotante / caminante
        ctx.fillStyle = '#334155';
        ctx.beginPath();
        ctx.arc(x + 10, y + 8, 8, 0, Math.PI * 2);
        ctx.fill();

        // Ojo sensor rojo
        ctx.fillStyle = '#ef4444';
        ctx.fillRect(x + 7, y + 6, 6, 4);
        ctx.fillStyle = '#fca5a5';
        ctx.fillRect(x + 9, y + 7, 2, 2);

        // Patas mecánicas
        ctx.fillStyle = '#64748b';
        ctx.fillRect(x + 3, y + 14, 4, 4);
        ctx.fillRect(x + 13, y + 14, 4, 4);
    } else {
        // Nano-Escarabajo acorazado
        ctx.fillStyle = '#10b981';
        ctx.fillRect(x + 2, y + 4, 14, 12);
        ctx.strokeStyle = '#059669';
        ctx.strokeRect(x + 2, y + 4, 14, 12);
        // Luz de antena
        ctx.fillStyle = '#34d399';
        ctx.fillRect(x + 12, y + 6, 4, 4);
    }
}

function drawBoss(x, y) {
    const b = bossEntity;
    ctx.fillStyle = b.color;
    ctx.fillRect(x, y, b.w, b.h);

    // Blindaje y orbes de poder
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(x + 4, y + 4, b.w - 8, 12);

    ctx.fillStyle = '#00ffff';
    ctx.fillRect(x + 8, y + 6, 8, 8);
    ctx.fillRect(x + b.w - 16, y + 6, 8, 8);

    // Reactor central de energía
    ctx.fillStyle = '#ff0055';
    ctx.beginPath();
    ctx.arc(x + b.w / 2, y + b.h / 2 + 6, 10, 0, Math.PI * 2);
    ctx.fill();

    // Cañones laterales
    ctx.fillStyle = '#334155';
    ctx.fillRect(x - 4, y + 20, 6, 14);
    ctx.fillRect(x + b.w - 2, y + 20, 6, 14);
}

function drawBossHealthBar() {
    const b = bossEntity;
    const barW = 160;
    const barH = 12;
    const barX = (VIEW_WIDTH - barW) / 2;
    const barY = 24;

    ctx.fillStyle = 'rgba(15, 23, 42, 0.85)';
    ctx.fillRect(barX - 4, barY - 14, barW + 8, barH + 20);

    ctx.fillStyle = '#38bdf8';
    ctx.font = 'bold 9px monospace';
    ctx.textAlign = 'center';
    ctx.fillText(`${b.name.toUpperCase()} (DIMENSIÓN ${currentWorldNum})`, VIEW_WIDTH / 2, barY - 3);

    ctx.fillStyle = '#1e293b';
    ctx.fillRect(barX, barY, barW, barH);

    const healthPercent = Math.max(0, b.hp / b.maxHp);
    ctx.fillStyle = healthPercent > 0.4 ? '#00f2fe' : '#f43f5e';
    ctx.fillRect(barX, barY, barW * healthPercent, barH);

    ctx.strokeStyle = '#38bdf8';
    ctx.lineWidth = 1;
    ctx.strokeRect(barX, barY, barW, barH);
    ctx.textAlign = 'left';
}

function drawQuantumCore(x, y) {
    ctx.fillStyle = '#00f2fe';
    ctx.beginPath();
    ctx.arc(x + 12, y + 12, 9, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = '#f43f5e';
    ctx.lineWidth = 2;
    ctx.strokeRect(x + 3, y + 3, 18, 18);
}

function drawCrystal(x, y) {
    ctx.fillStyle = '#00ffff';
    ctx.beginPath();
    ctx.moveTo(x + 8, y + 2);
    ctx.lineTo(x + 14, y + 8);
    ctx.lineTo(x + 8, y + 14);
    ctx.lineTo(x + 2, y + 8);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = '#ffffff';
    ctx.fillRect(x + 7, y + 6, 3, 4);
}

function drawPowerUp(x, y, type) {
    if (type === 'battery') {
        // Batería cuántica
        ctx.fillStyle = '#38bdf8';
        ctx.fillRect(x + 3, y + 3, 10, 12);
        ctx.fillStyle = '#0284c7';
        ctx.fillRect(x + 5, y + 1, 6, 2);
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(x + 6, y + 6, 4, 6);
    } else {
        // Cañón de Plasma
        ctx.fillStyle = '#a855f7';
        ctx.beginPath();
        ctx.arc(x + 8, y + 8, 7, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#22d3ee';
        ctx.beginPath();
        ctx.arc(x + 8, y + 8, 3, 0, Math.PI * 2);
        ctx.fill();
    }
}

function drawPlasmaShot(x, y) {
    ctx.fillStyle = '#00f2fe';
    ctx.beginPath();
    ctx.arc(x + 4, y + 4, 5, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(x + 4, y + 4, 2, 0, Math.PI * 2);
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
// MODALES Y MENÚS
// ==========================================
function showVictoryModal(isBossDefeated) {
    const modal = document.getElementById('modalVictory');
    const title = document.getElementById('victoryTitle');
    const desc = document.getElementById('victoryDesc');
    const nextBtn = document.getElementById('btnNextLevel');

    if (isBossDefeated) {
        if (currentWorldNum === 9) {
            title.innerText = "¡CAMPEÓN DE LAS 9 DIMENSIONES!";
            desc.innerText = "¡Has derrotado al Núcleo de la Singularidad y salvado el multiverso cósmico! ¡Misión cumplida, Astro Runner!";
            nextBtn.innerText = "Reiniciar Odisea";
            nextBtn.onclick = () => {
                modal.classList.add('hidden');
                loadLevel(1, 1);
            };
        } else {
            title.innerText = `¡JEFE DE LA DIMENSIÓN ${currentWorldNum} DESTRUIDO!`;
            desc.innerText = `¡Has obtenido el Hiper-Núcleo Cuántico! El portal hacia la DIMENSIÓN ${currentWorldNum + 1}: ${WORLDS_CONFIG[currentWorldNum].name} se ha abierto.`;
            nextBtn.innerText = `Saltar a Dimensión ${currentWorldNum + 1}`;
            nextBtn.onclick = () => {
                modal.classList.add('hidden');
                loadLevel(currentWorldNum + 1, 1);
            };
        }
    } else {
        title.innerText = `¡SECTOR ${currentWorldNum}-${currentLevelNum} ASEGURADO!`;
        desc.innerText = `¡Gran maniobra! Avanzas con éxito hacia la cámara del Boss de esta dimensión.`;
        nextBtn.innerText = `Siguiente Sector (${currentWorldNum}-${currentLevelNum + 1})`;
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

    WORLDS_CONFIG.forEach(w => {
        const isUnlocked = w.id <= saveState.unlockedWorld;
        const item = document.createElement('div');
        item.className = `world-card ${isUnlocked ? 'unlocked' : 'locked'}`;

        let levelsHtml = '';
        for (let lvl = 1; lvl <= 8; lvl++) {
            const isLvlUnlocked = (w.id < saveState.unlockedWorld) ||
                                  (w.id === saveState.unlockedWorld && lvl <= saveState.unlockedLevel);
            const isBoss = lvl === 8;
            levelsHtml += `
                <button class="lvl-btn ${isLvlUnlocked ? 'active' : 'disabled'} ${isBoss ? 'boss-btn' : ''}"
                        ${isLvlUnlocked ? `onclick="selectLevel(${w.id}, ${lvl})"` : 'disabled'}>
                    ${isBoss ? '👑' : lvl}
                </button>
            `;
        }

        item.innerHTML = `
            <div class="world-header">
                <h3>Dimensión ${w.id}: ${w.name} ${isUnlocked ? '' : '🔒'}</h3>
                <span class="world-desc">${w.description}</span>
                <span class="boss-tag">Jefe de sector: <strong>${w.bossName}</strong></span>
            </div>
            <div class="levels-row">
                ${levelsHtml}
            </div>
        `;
        list.appendChild(item);
    });

    modal.classList.remove('hidden');
}

function closeWorldSelector() {
    document.getElementById('modalWorldSelect').classList.add('hidden');
    isPaused = false;
}

function selectLevel(world, level) {
    closeWorldSelector();
    loadLevel(world, level);
}

// ==========================================
// CONTROLES Y ENTRADA
// ==========================================
function setupControls() {
    window.addEventListener('keydown', (e) => {
        window.sounds.init();
        if (e.code === 'ArrowLeft' || e.code === 'KeyA') keys.left = true;
        if (e.code === 'ArrowRight' || e.code === 'KeyD') keys.right = true;
        if (e.code === 'ArrowUp' || e.code === 'Space' || e.code === 'KeyW') {
            keys.up = true;
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

        const handleStart = (e) => {
            e.preventDefault();
            window.sounds.init();
            if (navigator.vibrate) navigator.vibrate(15);
            onDown();
        };

        const handleEnd = (e) => {
            e.preventDefault();
            onUp();
        };

        el.addEventListener('touchstart', handleStart, { passive: false });
        el.addEventListener('touchend', handleEnd, { passive: false });
        el.addEventListener('mousedown', handleStart);
        el.addEventListener('mouseup', handleEnd);
        el.addEventListener('mouseleave', handleEnd);
    };

    bindTouch('btnLeft', () => keys.left = true, () => keys.left = false);
    bindTouch('btnRight', () => keys.right = true, () => keys.right = false);
    bindTouch('btnDown', () => keys.down = true, () => keys.down = false);
    bindTouch('btnA', () => keys.up = true, () => keys.up = false);
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

window.addEventListener('load', () => {
    setupControls();
    loadLevel(saveState.currentWorld || 1, saveState.currentLevel || 1);
    requestAnimationFrame(gameLoop);
});
