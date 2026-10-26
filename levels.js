// levels.js - Definición de Dimensiones y Generador de Niveles
const WORLDS_CONFIG = [
    {
        id: 1,
        name: "Reino Champiñón Verde",
        skyTop: "#38bdf8",
        skyBottom: "#bae6fd",
        grassColor: "#22c55e",
        grassHighlight: "#86efac",
        dirtColor: "#854d0e",
        dirtPattern: "#713f12",
        blockColor: "#ea580c",
        cloudColor: "#ffffff",
        description: "Colinas verdes y cielos soleados al estilo clásico de plataformas.",
        bossName: "Mecha-Bowser Jr.",
        bossHp: 3,
        bossColor: "#ef4444"
    },
    {
        id: 2,
        name: "Dunas Doradas del Sol",
        skyTop: "#fdba74",
        skyBottom: "#fed7aa",
        grassColor: "#eab308",
        grassHighlight: "#fef08a",
        dirtColor: "#a16207",
        dirtPattern: "#854d0e",
        blockColor: "#ca8a04",
        cloudColor: "#fff7ed",
        description: "Desierto ancestral con bloques de arenisca y oasis reflectantes.",
        bossName: "Faraón Escorpión",
        bossHp: 4,
        bossColor: "#d97706"
    },
    {
        id: 3,
        name: "Caverna de Neón Subterránea",
        skyTop: "#0f172a",
        skyBottom: "#1e1b4b",
        grassColor: "#a855f7",
        grassHighlight: "#d8b4fe",
        dirtColor: "#312e81",
        dirtPattern: "#1e1b4b",
        blockColor: "#7c3aed",
        cloudColor: "#6366f1",
        description: "Túneles de cristales bioluminiscentes y plataformas flotantes.",
        bossName: "Gólem Cuántico",
        bossHp: 5,
        bossColor: "#9333ea"
    },
    {
        id: 4,
        name: "Costa Tropical Esmeralda",
        skyTop: "#0284c7",
        skyBottom: "#7dd3fc",
        grassColor: "#10b981",
        grassHighlight: "#6ee7b7",
        dirtColor: "#92400e",
        dirtPattern: "#78350f",
        blockColor: "#d97706",
        cloudColor: "#f0fdfa",
        description: "Archipiélago paradisíaco con puentes de madera y agua cristalina.",
        bossName: "Capitán Kraken",
        bossHp: 5,
        bossColor: "#059669"
    },
    {
        id: 5,
        name: "Cumbres Glaciales",
        skyTop: "#60a5fa",
        skyBottom: "#e0f2fe",
        grassColor: "#f8fafc",
        grassHighlight: "#ffffff",
        dirtColor: "#38bdf8",
        dirtPattern: "#0284c7",
        blockColor: "#0ea5e9",
        cloudColor: "#ffffff",
        description: "Nieve perpetua y hielo súper resbaladizo para correr a gran velocidad.",
        bossName: "Yeti Criogénico",
        bossHp: 6,
        bossColor: "#2563eb"
    },
    {
        id: 6,
        name: "Bosque de Sombras Umbrío",
        skyTop: "#020617",
        skyBottom: "#0f172a",
        grassColor: "#15803d",
        grassHighlight: "#4ade80",
        dirtColor: "#3f2b1d",
        dirtPattern: "#291c13",
        blockColor: "#475569",
        cloudColor: "#334155",
        description: "Champiñones gigantes y esporas nocturnas que flotan en la niebla.",
        bossName: "Espectro del Bosque",
        bossHp: 6,
        bossColor: "#7e22ce"
    },
    {
        id: 7,
        name: "Flota Celestial de las Nubes",
        skyTop: "#f97316",
        skyBottom: "#ffedd5",
        grassColor: "#78350f",
        grassHighlight: "#b45309",
        dirtColor: "#451a03",
        dirtPattern: "#291002",
        blockColor: "#c2410c",
        cloudColor: "#fdba74",
        description: "Naves voladoras entre el atardecer con cañones de propulsión.",
        bossName: "Meca-Dragón Volador",
        bossHp: 7,
        bossColor: "#b91c1c"
    },
    {
        id: 8,
        name: "Fortaleza de Magma Ardiente",
        skyTop: "#180202",
        skyBottom: "#450a0a",
        grassColor: "#7f1d1d",
        grassHighlight: "#ef4444",
        dirtColor: "#2a0404",
        dirtPattern: "#170202",
        blockColor: "#991b1b",
        cloudColor: "#b91c1c",
        description: "El temible castillo de piedra volcánica con fosos de lava.",
        bossName: "Bowser de Lava Supremo",
        bossHp: 8,
        bossColor: "#dc2626"
    },
    {
        id: 9,
        name: "Reino Cósmico Estelar",
        skyTop: "#030712",
        skyBottom: "#1e1b4b",
        grassColor: "#fbbf24",
        grassHighlight: "#fef08a",
        dirtColor: "#312e81",
        dirtPattern: "#1e1b4b",
        blockColor: "#8b5cf6",
        cloudColor: "#c084fc",
        description: "La dimensión secreta entre galaxias. La cúspide de la aventura.",
        bossName: "Emperador de la Singularidad",
        bossHp: 10,
        bossColor: "#00ffff"
    }
];

class LevelBuilder {
    static generateLevel(worldIndex, levelIndex) {
        const world = WORLDS_CONFIG[worldIndex - 1] || WORLDS_CONFIG[0];
        const isBossLevel = (levelIndex === 8);
        const mapWidth = isBossLevel ? 75 : (70 + levelIndex * 10);
        const mapHeight = 9; // 9 filas x 32px = 288px (ideal para canvas de 270px)

        // Cuadrícula:
        // 0: Vacío / Aire
        // 1: Suelo con hierba verde estilo Mario
        // 2: Bloque de ladrillo rompible
        // 3: Bloque misterioso '?' con moneda/cristal
        // 4: Bloque misterioso '?' con potenciador
        // 5: Tubería parte superior izquierda
        // 6: Tubería parte superior derecha
        // 7: Tubería cuerpo izquierdo
        // 8: Tubería cuerpo derecho
        // 9: Lava / Foso mortal
        // 10: Mástil de meta con bandera
        // 11: Puerta del castillo
        // 12: Bloque de piedra dura / gastado
        // 13: Tierra profunda debajo del suelo

        const grid = Array.from({ length: mapHeight }, () => Array(mapWidth).fill(0));
        const enemies = [];
        const coins = [];
        let boss = null;

        const groundRow = 6; // Fila 6 (Y = 192px). El suelo mide 2 filas (6 y 7).

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
                grid[groundRow][col] = 1;      // Superficie con césped
                grid[groundRow + 1][col] = 13;  // Tierra interior
                grid[groundRow + 2][col] = 13;  // Fondo
            } else if (isBossLevel) {
                grid[mapHeight - 1][col] = 9;   // Foso de lava
            }
        }

        if (isBossLevel) {
            // === NIVEL 8: CASTILLO DEL BOSS ===
            // Plataformas elevadas
            for (let c = 12; c < 18; c++) grid[groundRow - 3][c] = 12;
            for (let c = 22; c < 26; c++) grid[groundRow - 3][c] = 12;
            for (let c = 32; c < 38; c++) grid[groundRow - 3][c] = 12;
            for (let c = 44; c < 48; c++) grid[groundRow - 3][c] = 12;

            // Bloques de poder antes del jefe
            grid[groundRow - 3][8] = 4; // Champiñón / Batería
            grid[groundRow - 3][10] = 3;

            // Muro de entrada al combate
            grid[groundRow - 1][52] = 12;
            grid[groundRow - 2][52] = 12;

            // Muro final derecho
            for (let r = 0; r < groundRow; r++) {
                grid[r][mapWidth - 1] = 12;
            }

            // Plataformas dentro de la arena del boss
            for (let c = 58; c <= 62; c++) grid[groundRow - 3][c] = 12;
            for (let c = 66; c <= 69; c++) grid[groundRow - 3][c] = 12;

            // Boss
            boss = {
                x: 64 * 32,
                y: (groundRow - 2) * 32,
                w: 48,
                h: 56,
                name: world.bossName,
                hp: world.bossHp,
                maxHp: world.bossHp,
                color: world.bossColor,
                vx: -1.2,
                vy: 0,
                isGrounded: false,
                attackTimer: 0,
                alive: true,
                worldNumber: worldIndex
            };

            enemies.push({ x: 16 * 32, y: (groundRow - 1) * 32, type: 'goomba', vx: -1, alive: true });
            enemies.push({ x: 34 * 32, y: (groundRow - 4) * 32, type: 'koopa', vx: -1, alive: true });

        } else {
            // === NIVELES 1 AL 7 ===
            // Tuberías verdes
            const pipePositions = [14, 28, 44, 58].filter(p => p < mapWidth - 12);
            pipePositions.forEach((pipeCol) => {
                const pipeTopRow = groundRow - 2; // Altura de 2 bloques
                grid[pipeTopRow][pipeCol] = 5;
                grid[pipeTopRow][pipeCol + 1] = 6;
                grid[pipeTopRow + 1][pipeCol] = 7;
                grid[pipeTopRow + 1][pipeCol + 1] = 8;
            });

            // Bloques '?' y ladrillos suspendidos en fila 3
            for (let col = 18; col < mapWidth - 16; col += 6) {
                const blockRow = groundRow - 3;
                if (col % 2 === 0) {
                    grid[blockRow][col] = 2; // Ladrillo
                    grid[blockRow][col + 1] = (col % 12 === 0) ? 4 : 3; // '?'
                    grid[blockRow][col + 2] = 2; // Ladrillo
                    coins.push({ x: (col + 1) * 32, y: (blockRow - 1) * 32 });
                } else if (levelIndex > 2) {
                    // Pequeña pirámide de escalones
                    for (let step = 0; step < 2; step++) {
                        if (col + step < mapWidth - 10) {
                            grid[groundRow - 1 - step][col + step] = 1;
                        }
                    }
                }
            }

            // Monedas flotantes
            for (let col = 8; col < mapWidth - 15; col += 10) {
                coins.push({ x: col * 32, y: (groundRow - 2) * 32 });
                coins.push({ x: (col + 1) * 32, y: (groundRow - 2) * 32 });
            }

            // Enemigos
            const numEnemies = 4 + levelIndex + worldIndex;
            for (let i = 0; i < numEnemies; i++) {
                const spawnCol = 16 + Math.floor(i * ((mapWidth - 30) / numEnemies));
                if (spawnCol < mapWidth - 12 && grid[groundRow][spawnCol] === 1) {
                    const eType = (i % 3 === 0 && levelIndex >= 2) ? 'koopa' : 'goomba';
                    enemies.push({
                        x: spawnCol * 32,
                        y: (groundRow - 1) * 32,
                        type: eType,
                        vx: -1,
                        vy: 0,
                        alive: true
                    });
                }
            }

            // Mástil de meta con bandera
            const flagCol = mapWidth - 8;
            for (let r = groundRow - 5; r < groundRow; r++) {
                grid[r][flagCol] = 10;
            }
            grid[groundRow - 1][flagCol] = 1;

            // Castillo de final de nivel
            const castleCol = mapWidth - 4;
            for (let r = groundRow - 3; r < groundRow; r++) {
                for (let c = castleCol; c < castleCol + 3; c++) {
                    grid[r][c] = 12;
                }
            }
            grid[groundRow - 1][castleCol + 1] = 11;
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
            spawnY: (groundRow - 1) * 32, // En el suelo, 100% visible
            flagX: (mapWidth - 8) * 32
        };
    }
}

window.WORLDS_CONFIG = WORLDS_CONFIG;
window.LevelBuilder = LevelBuilder;
