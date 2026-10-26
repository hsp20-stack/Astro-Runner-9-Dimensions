// levels.js - Configuración Temática de Mundos y Generador de Niveles Elaborados
const WORLDS_CONFIG = [
    {
        id: 1,
        name: "Reino de las Colinas Verdes",
        theme: "grassland",
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
        name: "Dunas Doradas del Faraón",
        theme: "desert",
        skyTop: "#fb923c",
        skyBottom: "#fed7aa",
        grassColor: "#eab308",
        grassHighlight: "#fef08a",
        dirtColor: "#a16207",
        dirtPattern: "#854d0e",
        blockColor: "#ca8a04",
        cloudColor: "#fff7ed",
        description: "Pirámides ancestrales bajo el sol ardiente del desierto.",
        bossName: "Faraón Escorpión",
        bossHp: 4,
        bossColor: "#d97706"
    },
    {
        id: 3,
        name: "Caverna de Cristales Cuánticos",
        theme: "neon_cave",
        skyTop: "#0f172a",
        skyBottom: "#1e1b4b",
        grassColor: "#a855f7",
        grassHighlight: "#d8b4fe",
        dirtColor: "#312e81",
        dirtPattern: "#1e1b4b",
        blockColor: "#7c3aed",
        cloudColor: "#6366f1",
        description: "Túneles subterráneos con estalagmitas y cristales de neón luminiscentes.",
        bossName: "Gólem Cuántico",
        bossHp: 5,
        bossColor: "#9333ea"
    },
    {
        id: 4,
        name: "Archipiélago Costa Esmeralda",
        theme: "ocean",
        skyTop: "#0284c7",
        skyBottom: "#7dd3fc",
        grassColor: "#10b981",
        grassHighlight: "#6ee7b7",
        dirtColor: "#92400e",
        dirtPattern: "#78350f",
        blockColor: "#d97706",
        cloudColor: "#f0fdfa",
        description: "Océano cristalino con islas tropicales y arrecifes de coral.",
        bossName: "Capitán Kraken",
        bossHp: 5,
        bossColor: "#059669"
    },
    {
        id: 5,
        name: "Glaciar de las Cumbres Heladas",
        theme: "ice",
        skyTop: "#60a5fa",
        skyBottom: "#e0f2fe",
        grassColor: "#f8fafc",
        grassHighlight: "#ffffff",
        dirtColor: "#38bdf8",
        dirtPattern: "#0284c7",
        blockColor: "#0ea5e9",
        cloudColor: "#ffffff",
        description: "Montañas nevadas con picos de hielo y ventisca helada.",
        bossName: "Yeti Criogénico",
        bossHp: 6,
        bossColor: "#2563eb"
    },
    {
        id: 6,
        name: "Bosque de Sombras Umbrío",
        theme: "spooky_forest",
        skyTop: "#020617",
        skyBottom: "#0f172a",
        grassColor: "#15803d",
        grassHighlight: "#4ade80",
        dirtColor: "#3f2b1d",
        dirtPattern: "#291c13",
        blockColor: "#475569",
        cloudColor: "#334155",
        description: "Setas gigantes y niebla nocturna bajo una luna misteriosa.",
        bossName: "Espectro del Bosque",
        bossHp: 6,
        bossColor: "#7e22ce"
    },
    {
        id: 7,
        name: "Flota Celestial en las Nubes",
        theme: "airship",
        skyTop: "#ea580c",
        skyBottom: "#ffedd5",
        grassColor: "#78350f",
        grassHighlight: "#b45309",
        dirtColor: "#451a03",
        dirtPattern: "#291002",
        blockColor: "#c2410c",
        cloudColor: "#fdba74",
        description: "Naves voladoras entre nubes doradas al atardecer.",
        bossName: "Meca-Dragón Volador",
        bossHp: 7,
        bossColor: "#b91c1c"
    },
    {
        id: 8,
        name: "Fortaleza Volcánica de Magma",
        theme: "lava_castle",
        skyTop: "#180202",
        skyBottom: "#450a0a",
        grassColor: "#7f1d1d",
        grassHighlight: "#ef4444",
        dirtColor: "#2a0404",
        dirtPattern: "#170202",
        blockColor: "#991b1b",
        cloudColor: "#b91c1c",
        description: "Volcanes en erupción, ríos de lava y columnas de fuego ardiente.",
        bossName: "Bowser de Lava Supremo",
        bossHp: 8,
        bossColor: "#dc2626"
    },
    {
        id: 9,
        name: "Reino de las Estrellas Cósmicas",
        theme: "space",
        skyTop: "#030712",
        skyBottom: "#1e1b4b",
        grassColor: "#fbbf24",
        grassHighlight: "#fef08a",
        dirtColor: "#312e81",
        dirtPattern: "#1e1b4b",
        blockColor: "#8b5cf6",
        cloudColor: "#c084fc",
        description: "Nebulosas, constelaciones y planetas flotantes en el espacio exterior.",
        bossName: "Emperador de la Singularidad",
        bossHp: 10,
        bossColor: "#00ffff"
    }
];

class LevelBuilder {
    static generateLevel(worldIndex, levelIndex) {
        const world = WORLDS_CONFIG[worldIndex - 1] || WORLDS_CONFIG[0];
        const isBossLevel = (levelIndex === 8);
        const mapWidth = isBossLevel ? 75 : (75 + levelIndex * 12);
        const mapHeight = 9; // 9 filas de 32px = 288px

        const grid = Array.from({ length: mapHeight }, () => Array(mapWidth).fill(0));
        const enemies = [];
        const coins = [];
        let boss = null;

        const groundRow = 6; // Fila 6 (Y = 192px)

        // Definir fosos bien colocados (nunca debajo de las plataformas iniciales)
        const pitColumns = new Set();
        if (!isBossLevel) {
            // Fosos a partir de la columna 38 para dar espacio seguro al principio
            if (mapWidth > 50) pitColumns.add(36);
            if (mapWidth > 65 && levelIndex >= 2) { pitColumns.add(52); pitColumns.add(53); }
            if (mapWidth > 85 && levelIndex >= 3) { pitColumns.add(70); }
        } else {
            // En el nivel del boss: fosos de lava en la zona de desafío previo
            pitColumns.add(26);
            pitColumns.add(27);
            pitColumns.add(38);
            pitColumns.add(39);
        }

        // 1. Generar suelo base continuo
        for (let col = 0; col < mapWidth; col++) {
            if (pitColumns.has(col)) {
                if (isBossLevel) {
                    grid[mapHeight - 1][col] = 9; // Foso de lava
                }
            } else {
                grid[groundRow][col] = 1;     // Césped
                grid[groundRow + 1][col] = 13; // Tierra
                grid[groundRow + 2][col] = 13; // Fondo
            }
        }

        if (isBossLevel) {
            // ==========================================
            // NIVEL 8: CASTILLO DEL JEFE FINAL ELABORADO
            // ==========================================
            // Plataformas flotantes sobre los fosos de lava
            grid[groundRow - 2][26] = 12; // Piedra de paso
            grid[groundRow - 2][38] = 12;

            // Sala del castillo con dos niveles de altura
            for (let c = 8; c <= 15; c++) grid[groundRow - 3][c] = 12;
            for (let c = 18; c <= 24; c++) grid[groundRow - 4][c] = 12;
            for (let c = 30; c <= 35; c++) grid[groundRow - 3][c] = 12;
            for (let c = 42; c <= 48; c++) grid[groundRow - 4][c] = 12;

            // Cápsulas de poder antes de la arena
            grid[groundRow - 4][10] = 4; // Champiñón / Super Núcleo
            grid[groundRow - 4][12] = 3; // Moneda
            grid[groundRow - 5][21] = 4; // Flor de Fuego

            // Muro de contención de la arena del Boss
            grid[groundRow - 1][52] = 12;
            grid[groundRow - 2][52] = 12;

            for (let r = 0; r < groundRow; r++) {
                grid[r][mapWidth - 1] = 12;
            }

            // Plataformas elevadas dentro de la arena del Boss para maniobrar
            for (let c = 57; c <= 61; c++) grid[groundRow - 3][c] = 12;
            for (let c = 65; c <= 69; c++) grid[groundRow - 3][c] = 12;

            // El Boss
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

            enemies.push({ x: 12 * 32, y: (groundRow - 4) * 32, type: 'goomba', vx: -1, alive: true });
            enemies.push({ x: 32 * 32, y: (groundRow - 4) * 32, type: 'koopa', vx: -1, alive: true });

        } else {
            // ==========================================
            // NIVELES 1 AL 7: DISEÑO RICO Y ELABORADO
            // ==========================================
            // 1. Tuberías verdes de varias alturas
            const pipes = [
                { col: 12, h: 2 },
                { col: 26, h: 2 },
                { col: 44, h: 3 },
                { col: 60, h: 2 }
            ].filter(p => p.col < mapWidth - 14);

            pipes.forEach(p => {
                const pipeTop = groundRow - p.h;
                grid[pipeTop][p.col] = 5;
                grid[pipeTop][p.col + 1] = 6;
                for (let r = pipeTop + 1; r < groundRow; r++) {
                    grid[r][p.col] = 7;
                    grid[r][p.col + 1] = 8;
                }
            });

            // 2. Formaciones de bloques suspendidos a media altura (Fila 3)
            // Ladrillo - '?' - Ladrillo - '?' - Ladrillo
            const blockFormations = [16, 30, 48, 64].filter(c => c < mapWidth - 16);
            blockFormations.forEach((col, idx) => {
                const bRow = groundRow - 3;
                grid[bRow][col] = 2;                     // Ladrillo
                grid[bRow][col + 1] = (idx % 2 === 0) ? 4 : 3; // '?' Champiñón o Moneda
                grid[bRow][col + 2] = 2;                 // Ladrillo
                grid[bRow][col + 3] = 3;                 // '?' Moneda
                grid[bRow][col + 4] = 2;                 // Ladrillo

                coins.push({ x: (col + 1) * 32, y: (bRow - 1) * 32 });
                coins.push({ x: (col + 3) * 32, y: (bRow - 1) * 32 });
            });

            // 3. Escaleras / Pirámides de bloques estilo Mario clásico
            if (mapWidth > 40) {
                // Escalera que sube
                const stairCol = 20;
                grid[groundRow - 1][stairCol] = 1;
                grid[groundRow - 1][stairCol + 1] = 1;
                grid[groundRow - 2][stairCol + 1] = 1;
                grid[groundRow - 1][stairCol + 2] = 1;
                grid[groundRow - 2][stairCol + 2] = 1;
                grid[groundRow - 3][stairCol + 2] = 1;

                // Escalera que baja
                grid[groundRow - 1][stairCol + 4] = 1;
                grid[groundRow - 2][stairCol + 4] = 1;
                grid[groundRow - 1][stairCol + 5] = 1;
            }

            // 4. Ruta secreta superior flotante en niveles más avanzados
            if (levelIndex >= 2 && mapWidth > 60) {
                const skyRow = groundRow - 5;
                for (let c = 34; c <= 40; c++) {
                    grid[skyRow][c] = 12; // Bloques flotantes altos
                    coins.push({ x: c * 32, y: (skyRow - 1) * 32 });
                }
            }

            // 5. Monedas flotantes a lo largo del mapa
            for (let c = 8; c < mapWidth - 14; c += 8) {
                if (grid[groundRow][c] === 1) {
                    coins.push({ x: c * 32, y: (groundRow - 2) * 32 });
                }
            }

            // 6. Enemigos colocados estratégicamente
            const numEnemies = 4 + levelIndex + worldIndex;
            for (let i = 0; i < numEnemies; i++) {
                const eCol = 15 + Math.floor(i * ((mapWidth - 30) / numEnemies));
                if (eCol < mapWidth - 12 && grid[groundRow][eCol] === 1 && !pitColumns.has(eCol)) {
                    const eType = (i % 3 === 0 && levelIndex >= 2) ? 'koopa' : 'goomba';
                    enemies.push({
                        x: eCol * 32,
                        y: (groundRow - 1) * 32,
                        type: eType,
                        vx: -1,
                        vy: 0,
                        alive: true
                    });
                }
            }

            // 7. Mástil de meta y castillo final
            const flagCol = mapWidth - 8;
            for (let r = groundRow - 5; r < groundRow; r++) {
                grid[r][flagCol] = 10;
            }
            grid[groundRow - 1][flagCol] = 1;

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
            spawnY: (groundRow - 1) * 32,
            flagX: (mapWidth - 8) * 32
        };
    }
}

window.WORLDS_CONFIG = WORLDS_CONFIG;
window.LevelBuilder = LevelBuilder;
