// levels.js - Configuración Temática de 9 Mundos y Generador de Niveles Profesionales
// Astro Runner: 9 Dimensions - Hugo SP Studios

const WORLDS_CONFIG = [
    {
        id: 1,
        name: "Colinas Verdes Clásicas",
        theme: "grassland",
        skyTop: "#38bdf8",
        skyBottom: "#bae6fd",
        grassColor: "#22c55e",
        grassHighlight: "#86efac",
        dirtColor: "#854d0e",
        dirtPattern: "#713f12",
        blockColor: "#ea580c",
        cloudColor: "#ffffff",
        description: "Colinas verdes y praderas floridas bajo cielos azules radiantes.",
        bossName: "Mecha-Koopa Prime",
        bossHp: 3,
        bossColor: "#ef4444"
    },
    {
        id: 2,
        name: "Dunas Doradas del Desierto",
        theme: "desert",
        skyTop: "#ea580c",
        skyBottom: "#fed7aa",
        grassColor: "#eab308",
        grassHighlight: "#fef08a",
        dirtColor: "#a16207",
        dirtPattern: "#854d0e",
        blockColor: "#ca8a04",
        cloudColor: "#fff7ed",
        description: "Pirámides colosales bajo el sol abrasador y dunas de arena dorada.",
        bossName: "Faraón Escorpión",
        bossHp: 4,
        bossColor: "#d97706"
    },
    {
        id: 3,
        name: "Caverna de Cristales Neón",
        theme: "neon_cave",
        skyTop: "#0f172a",
        skyBottom: "#1e1b4b",
        grassColor: "#a855f7",
        grassHighlight: "#d8b4fe",
        dirtColor: "#312e81",
        dirtPattern: "#1e1b4b",
        blockColor: "#7c3aed",
        cloudColor: "#6366f1",
        description: "Túneles subterráneos con estalagmitas y cristales luminiscentes violetas.",
        bossName: "Gólem Cuántico",
        bossHp: 5,
        bossColor: "#9333ea"
    },
    {
        id: 4,
        name: "Costa Caribeña Esmeralda",
        theme: "ocean",
        skyTop: "#0284c7",
        skyBottom: "#7dd3fc",
        grassColor: "#10b981",
        grassHighlight: "#6ee7b7",
        dirtColor: "#92400e",
        dirtPattern: "#78350f",
        blockColor: "#d97706",
        cloudColor: "#f0fdfa",
        description: "Océano tropical con aguas esmeralda, palmeras e islas de coral.",
        bossName: "Capitán Kraken",
        bossHp: 5,
        bossColor: "#059669"
    },
    {
        id: 5,
        name: "Cumbres Glaciales Nevadas",
        theme: "ice",
        skyTop: "#60a5fa",
        skyBottom: "#e0f2fe",
        grassColor: "#f8fafc",
        grassHighlight: "#ffffff",
        dirtColor: "#38bdf8",
        dirtPattern: "#0284c7",
        blockColor: "#0ea5e9",
        cloudColor: "#ffffff",
        description: "Picos escarpados de hielo perpétuo y ventisca helada.",
        bossName: "Yeti Criogénico",
        bossHp: 6,
        bossColor: "#2563eb"
    },
    {
        id: 6,
        name: "Bosque Sombrío Encantado",
        theme: "spooky_forest",
        skyTop: "#020617",
        skyBottom: "#0f172a",
        grassColor: "#15803d",
        grassHighlight: "#4ade80",
        dirtColor: "#3f2b1d",
        dirtPattern: "#291c13",
        blockColor: "#475569",
        cloudColor: "#334155",
        description: "Bosque misterioso con setas fluorescentes bajo la luz de la luna llena.",
        bossName: "Espectro de las Sombras",
        bossHp: 6,
        bossColor: "#7e22ce"
    },
    {
        id: 7,
        name: "Flota Celestial en las Nubes",
        theme: "airship",
        skyTop: "#c2410c",
        skyBottom: "#fed7aa",
        grassColor: "#78350f",
        grassHighlight: "#b45309",
        dirtColor: "#451a03",
        dirtPattern: "#291002",
        blockColor: "#c2410c",
        cloudColor: "#fdba74",
        description: "Armadas de barcos voladores surcando nubes doradas al atardecer.",
        bossName: "Meca-Dragón Supremo",
        bossHp: 7,
        bossColor: "#b91c1c"
    },
    {
        id: 8,
        name: "Fortaleza de Fuego y Magma",
        theme: "lava_castle",
        skyTop: "#1a0202",
        skyBottom: "#580a0a",
        grassColor: "#dc2626",
        grassHighlight: "#f87171",
        dirtColor: "#2a0505",
        dirtPattern: "#190202",
        blockColor: "#991b1b",
        cloudColor: "#ef4444",
        description: "Volcanes gigantes en erupción, ríos de lava ardiente y lluvia de fuego.",
        bossName: "Lord de Lava Supremo",
        bossHp: 8,
        bossColor: "#ef4444"
    },
    {
        id: 9,
        name: "Reino Cósmico del Espacio",
        theme: "space",
        skyTop: "#020617",
        skyBottom: "#1e1b4b",
        grassColor: "#fbbf24",
        grassHighlight: "#fef08a",
        dirtColor: "#312e81",
        dirtPattern: "#1e1b4b",
        blockColor: "#8b5cf6",
        cloudColor: "#c084fc",
        description: "Planetas con anillos, nebulosas intergalácticas y singularidades cósmicas.",
        bossName: "Emperador de la Singularidad",
        bossHp: 10,
        bossColor: "#00ffff"
    }
];

class LevelBuilder {
    static generateLevel(worldIndex, levelIndex) {
        const world = WORLDS_CONFIG[worldIndex - 1] || WORLDS_CONFIG[0];
        const isBossLevel = (levelIndex === 8);
        const mapWidth = isBossLevel ? 75 : 85;
        const mapHeight = 9;

        const grid = Array.from({ length: mapHeight }, () => Array(mapWidth).fill(0));
        const enemies = [];
        const coins = [];
        let boss = null;

        const groundRow = 6; // Fila 6 (Y = 192px)

        // Suelo continuo 100% transitable (sin fosos injustos al inicio)
        for (let col = 0; col < mapWidth; col++) {
            let isPit = false;
            // Solo en niveles avanzados (nivel 5+) hay algún foso pequeño
            if (!isBossLevel && levelIndex >= 5) {
                if (col === 46 || col === 47) isPit = true;
            } else if (isBossLevel) {
                if (col === 32 || col === 33) isPit = true;
            }

            if (!isPit) {
                grid[groundRow][col] = 1;      // Césped / Roca superior
                grid[groundRow + 1][col] = 13; // Tierra intermedia
                grid[groundRow + 2][col] = 13; // Tierra base
            } else if (isBossLevel) {
                grid[mapHeight - 1][col] = 9;  // Foso de lava
            }
        }

        if (isBossLevel) {
            // ==========================================
            // NIVEL 8: CASTILLO DEL JEFE FINAL
            // ==========================================
            // Plataformas flotantes amplias y transitables
            for (let c = 10; c <= 14; c++) grid[groundRow - 3][c] = 12;
            for (let c = 20; c <= 25; c++) grid[groundRow - 4][c] = 12;
            for (let c = 38; c <= 44; c++) grid[groundRow - 3][c] = 12;

            // Bloques de poder de ayuda antes del combate
            grid[groundRow - 3][11] = 4; // Champiñón
            grid[groundRow - 4][22] = 4; // Flor de fuego / Batería de plasma

            // Entrada y pared límite de la arena del boss
            grid[groundRow - 1][50] = 12;
            grid[groundRow - 2][50] = 12;

            for (let r = 0; r < groundRow; r++) {
                grid[r][mapWidth - 1] = 12;
            }

            // Plataformas dentro de la arena del boss para saltarle encima
            for (let c = 56; c <= 60; c++) grid[groundRow - 3][c] = 12;
            for (let c = 64; c <= 68; c++) grid[groundRow - 3][c] = 12;

            boss = {
                x: 63 * 32,
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

            // Esbirro en zona abierta antes de la arena
            enemies.push({ x: 18 * 32, y: (groundRow - 1) * 32, type: 'goomba', vx: -1, alive: true });

        } else {
            // ==========================================
            // NIVELES 1 AL 7: DISEÑO FLUIDO, EQUILIBRADO Y 100% PASABLE
            // ==========================================

            // 1. Tuberías verdes compactas (1 solo bloque de altura para saltar limpiamente)
            const pipeCols = [15, 33, 51, 65];
            pipeCols.forEach(col => {
                if (col < mapWidth - 16) {
                    grid[groundRow - 1][col] = 5;
                    grid[groundRow - 1][col + 1] = 6;
                }
            });

            // Bloque '?' inicial con Super Poder para transformarse desde el principio
            grid[groundRow - 2][10] = 4; // Batería / Champiñón de transformación al inicio

            // 2. Formaciones de bloques elevadas para saltar sobre ellas con emoción
            // Cada formación tiene un bloque de poder central para transformarse
            const blockCols = [20, 38, 55];
            blockCols.forEach(col => {
                const bRow = groundRow - 3; // Fila 3: altura clásica para saltar sobre ellos

                grid[bRow][col] = 2;     // Ladrillo rompible
                grid[bRow][col + 1] = 3; // '?' Moneda dorada
                grid[bRow][col + 2] = 4; // '?' SUPER PODER DE TRANSFORMACIÓN (Batería / Flor de Plasma)
                grid[bRow][col + 3] = 3; // '?' Moneda dorada
                grid[bRow][col + 4] = 2; // Ladrillo rompible

                coins.push({ x: (col + 1) * 32, y: (bRow - 1) * 32 });
                coins.push({ x: (col + 3) * 32, y: (bRow - 1) * 32 });
            });

            // 3. Monedas flotantes en arcos sobre las llanuras
            for (let c = 7; c < mapWidth - 18; c += 8) {
                if (grid[groundRow][c] === 1 && grid[groundRow - 1][c] === 0) {
                    coins.push({ x: c * 32, y: (groundRow - 2) * 32 });
                }
            }

            // 4. Escalera clásica suave antes de la meta (nunca más de 2 bloques para que sea 100% pasable)
            const stairCol = 68;
            if (stairCol < mapWidth - 14) {
                grid[groundRow - 1][stairCol] = 1;     // Paso 1 (1 bloque)
                grid[groundRow - 1][stairCol + 1] = 1; // Paso 2
                grid[groundRow - 2][stairCol + 1] = 1;
                grid[groundRow - 1][stairCol + 2] = 1; // Descanso
                grid[groundRow - 2][stairCol + 2] = 1;
                grid[groundRow - 1][stairCol + 3] = 1; // Bajada suave
            }

            // 5. ENEMIGOS CON DIFICULTAD ESCALONADA Y DINÁMICA POR MUNDO
            const baseEnemySpeed = -(0.9 + (worldIndex - 1) * 0.12 + (levelIndex - 1) * 0.04);
            
            // Cantidad y distribución de enemigos según el progreso del jugador
            const enemyConfigs = [];
            
            // Patrullas terrestres principales
            enemyConfigs.push({ col: 24, type: 'goomba' });
            enemyConfigs.push({ col: 42, type: 'koopa' });
            enemyConfigs.push({ col: 60, type: (worldIndex % 2 === 0) ? 'koopa' : 'goomba' });

            if (worldIndex >= 2) {
                enemyConfigs.push({ col: 34, type: 'goomba' });
            }
            if (worldIndex >= 4) {
                enemyConfigs.push({ col: 50, type: 'koopa' });
                // Enemigo volador (Paratroopa) en mundos avanzados
                enemyConfigs.push({ col: 28, type: 'koopa', fly: true });
            }
            if (worldIndex >= 6) {
                enemyConfigs.push({ col: 18, type: 'goomba' });
                enemyConfigs.push({ col: 46, type: 'koopa', fly: true });
            }
            if (worldIndex >= 8) {
                enemyConfigs.push({ col: 64, type: 'koopa' });
            }

            enemyConfigs.forEach(cfg => {
                if (cfg.col < mapWidth - 16) {
                    enemies.push({
                        x: cfg.col * 32,
                        y: cfg.fly ? (groundRow - 3.5) * 32 : (groundRow - 1) * 32,
                        type: cfg.type,
                        fly: !!cfg.fly,
                        baseY: cfg.fly ? (groundRow - 3.5) * 32 : (groundRow - 1) * 32,
                        sinOffset: Math.random() * Math.PI * 2,
                        vx: cfg.fly ? baseEnemySpeed * 0.85 : baseEnemySpeed,
                        vy: 0,
                        alive: true
                    });
                }
            });

            // 6. BANDERA DE META Y CASTILLO FINAL (100% TRANSITABLE SIN BLOQUES INVISIBLES)
            const flagCol = mapWidth - 9; // Columna 76
            // Mástil de meta: Tile 10 desde fila 1 hasta fila 5 (NO es bloque sólido para que Astro lo toque suavemente)
            for (let r = groundRow - 5; r < groundRow; r++) {
                grid[r][flagCol] = 10;
            }

            // Castillo de llegada clásico con puerta abierta
            const castleCol = mapWidth - 5; // Columna 80
            for (let r = groundRow - 3; r < groundRow; r++) {
                for (let c = castleCol; c < castleCol + 3; c++) {
                    grid[r][c] = 12; // Muro del castillo
                }
            }
            // Almenas del castillo
            grid[groundRow - 4][castleCol] = 12;
            grid[groundRow - 4][castleCol + 2] = 12;
            // Puerta del castillo (Tile 11: arco abierto transitable)
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
            flagCol: mapWidth - 9,
            flagX: (mapWidth - 9) * 32,
            castleX: (mapWidth - 5) * 32
        };
    }
}

window.WORLDS_CONFIG = WORLDS_CONFIG;
window.LevelBuilder = LevelBuilder;
