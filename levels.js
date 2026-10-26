// levels.js - Definición de las 9 Dimensiones y generación de los 8 Sectores por dimensión
const WORLDS_CONFIG = [
    {
        id: 1,
        name: "Planeta Flora",
        skyColor: "#1e3c72",
        groundColor: "#2a9d8f",
        blockColor: "#264653",
        cloudColor: "#a8dadc",
        description: "Mundo de vegetación alienígena luminosa y módulos de exploración.",
        bossName: "Guardián Mecha-Titán",
        bossHp: 3,
        bossColor: "#e76f51",
        bossType: "jumper"
    },
    {
        id: 2,
        name: "Planeta Solaris",
        skyColor: "#f4a261",
        groundColor: "#e9c46a",
        blockColor: "#d4a373",
        cloudColor: "#ffe8d6",
        description: "Dunas energéticas y ruinas de una civilización cósmica ancestral.",
        bossName: "Centinela Solar",
        bossHp: 4,
        bossColor: "#e63946",
        bossType: "shooter"
    },
    {
        id: 3,
        name: "Cavernas de Neón",
        skyColor: "#130f40",
        groundColor: "#30336b",
        blockColor: "#686de0",
        cloudColor: "#4834d4",
        description: "Túneles subterráneos repletos de cristales cuánticos de alta energía.",
        bossName: "Gólem Cuántico",
        bossHp: 5,
        bossColor: "#9b59b6",
        bossType: "slammer"
    },
    {
        id: 4,
        name: "Océano Cibernético",
        skyColor: "#005c97",
        groundColor: "#00b4db",
        blockColor: "#0083b0",
        cloudColor: "#dff9fb",
        description: "Plataformas flotantes sobre un mar de fluido refrigerante planetario.",
        bossName: "Leviatán Abisal",
        bossHp: 5,
        bossColor: "#16a085",
        bossType: "shooter"
    },
    {
        id: 5,
        name: "Cráter Glacial",
        skyColor: "#6190e8",
        groundColor: "#e3eaf7",
        blockColor: "#a7bfe8",
        cloudColor: "#ffffff",
        description: "Permafrost extraterrestre con plataformas de hielo donde deslizarse a gran velocidad.",
        bossName: "Androide Criogénico",
        bossHp: 6,
        bossColor: "#2980b9",
        bossType: "charger"
    },
    {
        id: 6,
        name: "Biosfera Umbría",
        skyColor: "#0b132b",
        groundColor: "#1c2541",
        blockColor: "#3a506b",
        cloudColor: "#5bc0be",
        description: "Selva bioluminiscente con esporas electromagnéticas flotantes.",
        bossName: "Reina Insectoide",
        bossHp: 6,
        bossColor: "#8e44ad",
        bossType: "teleporter"
    },
    {
        id: 7,
        name: "Estación Orbital",
        skyColor: "#1f1c2c",
        groundColor: "#4a4e69",
        blockColor: "#22223b",
        cloudColor: "#9a8c98",
        description: "Plataformas tecnológicas de acero ingrávido y propulsores de salto.",
        bossName: "Dron Matriz Nodriza",
        bossHp: 7,
        bossColor: "#c0392b",
        bossType: "shooter"
    },
    {
        id: 8,
        name: "Fundición Magmática",
        skyColor: "#1a0000",
        groundColor: "#3d0c02",
        blockColor: "#611200",
        cloudColor: "#ff4d4d",
        description: "El núcleo volcánico del planeta con ríos de plasma fundido.",
        bossName: "Señor de la Fundición",
        bossHp: 8,
        bossColor: "#ff3838",
        bossType: "bowser"
    },
    {
        id: 9,
        name: "El Vórtice Supremo",
        skyColor: "#050014",
        groundColor: "#00f2fe",
        blockColor: "#4facfe",
        cloudColor: "#220066",
        description: "La dimensión final del hiperespacio. La batalla definitiva.",
        bossName: "Núcleo de la Singularidad",
        bossHp: 10,
        bossColor: "#00ffff",
        bossType: "emperor"
    }
];

class LevelBuilder {
    static generateLevel(worldIndex, levelIndex) {
        const world = WORLDS_CONFIG[worldIndex - 1] || WORLDS_CONFIG[0];
        const isBossLevel = (levelIndex === 8);
        const mapWidth = isBossLevel ? 75 : (70 + levelIndex * 10);
        const mapHeight = 15;

        // Cuadrícula de casillas:
        // 0: Vacío
        // 1: Suelo tecno-alienígena
        // 2: Contenedor blindado rompible
        // 3: Cápsula misteriosa con Cristal de Energía (?)
        // 4: Cápsula misteriosa con Núcleo de Batería / Cañón de Plasma
        // 5: Conducto de refrigeración superior izquierdo
        // 6: Conducto de refrigeración superior derecho
        // 7: Conducto de refrigeración cuerpo izquierdo
        // 8: Conducto de refrigeración cuerpo derecho
        // 9: Río de plasma mortal
        // 10: Baliza de teleportación / Meta
        // 11: Puerta de descompresión
        // 12: Bloque de titanio indestructible

        const grid = Array.from({ length: mapHeight }, () => Array(mapWidth).fill(0));
        const enemies = [];
        const coins = []; // Cristales de energía
        let boss = null;

        const groundLevel = mapHeight - 3;

        // Suelo y fosas
        for (let col = 0; col < mapWidth; col++) {
            let isPit = false;

            if (!isBossLevel && col > 15 && col < mapWidth - 15) {
                if ((col % 18 === 0 || (col % 23 === 0 && levelIndex > 2)) && (col % 25 !== 0)) {
                    isPit = true;
                }
            }

            if (isBossLevel && col >= 20 && col <= 50) {
                if (col === 28 || col === 29 || col === 40 || col === 41) {
                    isPit = true;
                }
            }

            if (!isPit) {
                grid[groundLevel][col] = 1;
                grid[groundLevel + 1][col] = 1;
                grid[groundLevel + 2][col] = 1;
            } else if (isBossLevel) {
                grid[mapHeight - 1][col] = 9; // Plasma
            }
        }

        if (isBossLevel) {
            // === NIVEL 8: SALA DE CONTENCIÓN DEL JEFE ===
            for (let c = 12; c < 18; c++) grid[groundLevel - 3][c] = 12;
            for (let c = 22; c < 26; c++) grid[groundLevel - 4][c] = 12;
            for (let c = 32; c < 38; c++) grid[groundLevel - 3][c] = 12;
            for (let c = 44; c < 48; c++) grid[groundLevel - 4][c] = 12;

            // Cápsula de soporte antes del combate
            grid[groundLevel - 4][8] = 4; // Núcleo de Batería garantizado
            grid[groundLevel - 4][10] = 3;

            // Paredes de la cámara del Boss
            grid[groundLevel - 1][52] = 12;
            grid[groundLevel - 2][52] = 12;
            grid[groundLevel - 3][52] = 12;

            for (let r = 0; r < groundLevel; r++) {
                grid[r][mapWidth - 1] = 12;
            }

            for (let c = 58; c <= 62; c++) grid[groundLevel - 4][c] = 12;
            for (let c = 66; c <= 69; c++) grid[groundLevel - 4][c] = 12;

            // El Boss
            boss = {
                x: 64 * 32,
                y: (groundLevel - 2) * 32,
                w: 48,
                h: 56,
                name: world.bossName,
                hp: world.bossHp,
                maxHp: world.bossHp,
                color: world.bossColor,
                type: world.bossType,
                vx: -1.2,
                vy: 0,
                isGrounded: false,
                attackTimer: 0,
                isBoss: true,
                alive: true,
                worldNumber: worldIndex
            };

            // Drones centinela de guardia
            enemies.push({ x: 15 * 32, y: (groundLevel - 1) * 32, type: 'drone', vx: -1, alive: true });
            enemies.push({ x: 34 * 32, y: (groundLevel - 4) * 32, type: 'beetle', vx: -1, alive: true });

        } else {
            // === NIVELES 1 AL 7: EXPLORACIÓN PLANETARIA ===
            // Conductos de ventilación tecno
            const pipePositions = [14, 30, 48, 62].filter(p => p < mapWidth - 12);
            pipePositions.forEach((pipeCol, idx) => {
                const pipeHeight = (idx % 2 === 0) ? 2 : 3;
                const topRow = groundLevel - pipeHeight;

                grid[topRow][pipeCol] = 5;
                grid[topRow][pipeCol + 1] = 6;
                for (let r = topRow + 1; r < groundLevel; r++) {
                    grid[r][pipeCol] = 7;
                    grid[r][pipeCol + 1] = 8;
                }
            });

            // Bloques tecnológicos y cápsulas
            for (let col = 18; col < mapWidth - 16; col += 7) {
                const blockRow = groundLevel - 4;
                if (col % 2 === 0) {
                    grid[blockRow][col] = 2; // Contenedor blindado
                    grid[blockRow][col + 1] = (col % 14 === 0) ? 4 : 3; // Cápsula '?'
                    grid[blockRow][col + 2] = 2;
                    coins.push({ x: (col + 1) * 32, y: (blockRow - 1) * 32 });
                } else if (levelIndex > 2) {
                    for (let step = 0; step < 3; step++) {
                        if (col + step < mapWidth - 10) {
                            grid[groundLevel - 1 - step][col + step] = 1;
                        }
                    }
                }
            }

            // Cristales de energía flotantes
            for (let col = 8; col < mapWidth - 15; col += 12) {
                coins.push({ x: col * 32, y: (groundLevel - 2) * 32 });
                coins.push({ x: (col + 1) * 32, y: (groundLevel - 2) * 32 });
            }

            // Enemigos alienígenas y robóticos (Cyber-Drones y Nano-Escarabajos)
            const numEnemies = 4 + levelIndex + worldIndex;
            for (let i = 0; i < numEnemies; i++) {
                const spawnCol = 16 + Math.floor(i * ((mapWidth - 30) / numEnemies));
                if (spawnCol < mapWidth - 12 && grid[groundLevel][spawnCol] === 1) {
                    const eType = (i % 3 === 0 && levelIndex >= 2) ? 'beetle' : 'drone';
                    enemies.push({
                        x: spawnCol * 32,
                        y: (groundLevel - 1) * 32,
                        type: eType,
                        vx: -1,
                        vy: 0,
                        alive: true
                    });
                }
            }

            // Baliza de teletransporte / Meta del sector
            const flagCol = mapWidth - 8;
            for (let r = groundLevel - 8; r < groundLevel; r++) {
                grid[r][flagCol] = 10;
            }
            grid[groundLevel - 1][flagCol] = 1;

            // Portal de evacuación
            const castleCol = mapWidth - 4;
            for (let r = groundLevel - 4; r < groundLevel; r++) {
                for (let c = castleCol; c < castleCol + 3; c++) {
                    grid[r][c] = 12;
                }
            }
            grid[groundLevel - 1][castleCol + 1] = 11;
        }

        return {
            world,
            worldIndex,
            levelIndex,
            isBossLevel,
            mapWidth,
            mapHeight,
            grid,
            enemies,
            coins,
            boss,
            spawnX: 3 * 32,
            spawnY: (groundLevel - 2) * 32,
            flagX: (mapWidth - 8) * 32
        };
    }
}

window.WORLDS_CONFIG = WORLDS_CONFIG;
window.LevelBuilder = LevelBuilder;
