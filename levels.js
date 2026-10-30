// levels.js - Configuración Temática de 9 Mundos y Generador de Niveles Profesionales
// Astro Runner: 9 Dimensions - Hugo SP Studios

const WORLDS_CONFIG = [
    {
        id: 1,
        name: "Aldea Kokiri del Bosque",
        theme: "grassland",
        skyTop: "#1e3a8a",
        skyBottom: "#60a5fa",
        grassColor: "#15803d",
        grassHighlight: "#4ade80",
        dirtColor: "#582f0e",
        dirtPattern: "#3d1f05",
        blockColor: "#ea580c",
        cloudColor: "#ffffff",
        description: "Frondoso bosque ancestral con árboles gigantescos y bruma mística bajo el cielo.",
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
        name: "Plaza Delfino Tropical",
        theme: "ocean",
        skyTop: "#0284c7",
        skyBottom: "#bae6fd",
        grassColor: "#10b981",
        grassHighlight: "#6ee7b7",
        dirtColor: "#b45309",
        dirtPattern: "#78350f",
        blockColor: "#f59e0b",
        cloudColor: "#ffffff",
        description: "Costa paradisíaca soleada inspirada en Delfino Plaza, con mar turquesa, palmeras, veleros y delfines.",
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
        // Niveles mucho más largos y completos (190 tiles normales, 140 tiles para fortaleza boss)
        const mapWidth = isBossLevel ? 140 : 190;
        const mapHeight = 9;

        const grid = Array.from({ length: mapHeight }, () => Array(mapWidth).fill(0));
        const enemies = [];
        const coins = [];
        let boss = null;

        const groundRow = 6; // Fila 6 (Y = 192px)

        // Fosos y abismos desafiantes distribuidos a lo largo del mapa
        for (let col = 0; col < mapWidth; col++) {
            let isPit = false;
            if (!isBossLevel) {
                // Fosos estratégicos espaciados en los niveles largos
                if (levelIndex >= 2 && (col === 38 || col === 39)) isPit = true;
                if ((worldIndex >= 2 || levelIndex >= 4) && (col === 74 || col === 75)) isPit = true;
                if (levelIndex >= 3 && (col === 112 || col === 113)) isPit = true;
                if (worldIndex >= 3 && (col === 148 || col === 149)) isPit = true;
            } else if (isBossLevel) {
                // Fosos de lava en el castillo antes de la arena del jefe
                if (col === 34 || col === 35) isPit = true;
                if (col === 58 || col === 59) isPit = true;
                if (col === 82 || col === 83) isPit = true;
            }

            if (!isPit) {
                grid[groundRow][col] = 1;      // Césped / Roca superior
                grid[groundRow + 1][col] = 13; // Tierra intermedia
                grid[groundRow + 2][col] = 13; // Tierra base
            } else {
                grid[mapHeight - 1][col] = (world.theme === 'lava_castle' || isBossLevel) ? 9 : 0;
            }
        }

        if (isBossLevel) {
            // ==========================================
            // NIVEL 8: GRAN FORTALEZA Y ARENA DEL JEFE FINAL (140 TILES)
            // ==========================================
            // 1. Recorrido de plataformas flotantes sobre fosos de lava
            for (let c = 12; c <= 18; c++) grid[groundRow - 3][c] = 12;
            for (let c = 28; c <= 33; c++) grid[groundRow - 4][c] = 12;
            for (let c = 44; c <= 50; c++) grid[groundRow - 3][c] = 12;
            for (let c = 68; c <= 74; c++) grid[groundRow - 4][c] = 12;
            for (let c = 88; c <= 94; c++) grid[groundRow - 3][c] = 12;

            // Bloques de poder ganados superando los desafíos de la fortaleza
            grid[groundRow - 4][30] = 4; // Champiñón Super a mitad de la fortaleza
            grid[groundRow - 4][71] = 4; // Flor de Plasma antes del tramo final

            // Monedas de fortaleza
            [14, 16, 46, 48, 90, 92].forEach(c => {
                coins.push({ x: c * 32, y: (groundRow - 4) * 32 });
            });

            // 2. Puerta y muro de entrada a la Arena del Boss (Columna 100)
            const arenaStartCol = 102;
            for (let r = 0; r < groundRow - 2; r++) {
                grid[r][arenaStartCol - 2] = 12; // Muro superior
            }
            grid[groundRow - 1][arenaStartCol - 2] = 12;
            grid[groundRow - 2][arenaStartCol - 2] = 12;

            // Pared límite derecha de la arena
            for (let r = 0; r < groundRow; r++) {
                grid[r][mapWidth - 1] = 12;
            }

            // Plataformas dentro de la arena del boss para saltarle encima
            for (let c = arenaStartCol + 8; c <= arenaStartCol + 13; c++) grid[groundRow - 3][c] = 12;
            for (let c = arenaStartCol + 20; c <= arenaStartCol + 25; c++) grid[groundRow - 3][c] = 12;

            boss = {
                x: (arenaStartCol + 16) * 32,
                y: (groundRow - 2) * 32,
                w: 48,
                h: 56,
                name: world.bossName,
                hp: world.bossHp,
                maxHp: world.bossHp,
                color: world.bossColor,
                vx: -1.3,
                vy: 0,
                isGrounded: false,
                attackTimer: 0,
                alive: true,
                worldNumber: worldIndex
            };

            // Esbirros guardianes de la fortaleza
            const bossEnemies = [
                { col: 20, type: 'goomba' },
                { col: 40, type: 'koopa' },
                { col: 64, type: 'goomba' },
                { col: 80, type: 'koopa' }
            ];
            if (worldIndex >= 3) {
                bossEnemies.push({ col: 52, type: 'koopa', fly: true });
                bossEnemies.push({ col: 86, type: 'koopa', fly: true });
            }

            bossEnemies.forEach(e => {
                enemies.push({
                    x: e.col * 32,
                    y: e.fly ? (groundRow - 3.5) * 32 : (groundRow - 1) * 32,
                    type: e.type,
                    fly: !!e.fly,
                    baseY: e.fly ? (groundRow - 3.5) * 32 : (groundRow - 1) * 32,
                    sinOffset: 0,
                    vx: -1.3,
                    vy: 0,
                    alive: true
                });
            });

            return {
                world,
                worldIndex,
                levelIndex,
                isBossLevel: true,
                mapWidth,
                mapHeight,
                grid,
                enemies,
                coins,
                boss,
                bossArenaCol: arenaStartCol,
                spawnX: 3 * 32,
                spawnY: (groundRow - 1) * 32
            };

        } else {
            // ==========================================
            // NIVELES 1 AL 7: RECORRIDO LARGO, ÉPICO Y VARIADO (190 TILES)
            // ==========================================

            // 1. Tuberías verdes clásicas repartidas a lo largo de los 190 bloques
            const pipeCols = [18, 48, 84, 122, 156];
            pipeCols.forEach(col => {
                if (col < mapWidth - 18) {
                    grid[groundRow - 1][col] = 5;
                    grid[groundRow - 1][col + 1] = 6;
                }
            });

            // NOTA: Se ha ELIMINADO por completo el bloque inicial de regalo con champiñón.
            // Astro empieza en estado normal como en el Super Mario clásico.

            // 2. Formaciones de bloques elevadas distribuidas a lo largo del nivel largo
            const blockCols = [26, 56, 94, 132, 164];
            blockCols.forEach((col, idx) => {
                const bRow = groundRow - 3;

                grid[bRow][col] = 2;         // Ladrillo rompible
                grid[bRow][col + 1] = 3;     // '?' Moneda dorada
                // Los potenciadores están ganados más adelante en el nivel (en la columna 56 y 132)
                if (idx === 1) {
                    grid[bRow][col + 2] = 4; // '?' Champiñón Super / Batería (a 1/3 del nivel)
                } else if (idx === 3) {
                    grid[bRow][col + 2] = 4; // '?' Flor de Plasma / Fuego (a 2/3 del nivel)
                } else {
                    grid[bRow][col + 2] = 2; // Ladrillo resistente
                }
                grid[bRow][col + 3] = 3;     // '?' Moneda dorada
                grid[bRow][col + 4] = 2;     // Ladrillo rompible

                coins.push({ x: (col + 1) * 32, y: (bRow - 1) * 32 });
                coins.push({ x: (col + 3) * 32, y: (bRow - 1) * 32 });
            });

            // 3. Plataformas altas aéreas intermedias para caminos alternativos
            const highPlatformCols = [66, 104, 142];
            highPlatformCols.forEach(col => {
                for (let c = col; c <= col + 5; c++) {
                    grid[groundRow - 4][c] = 2; // Plataforma aérea de ladrillos
                    if (c % 2 === 0) {
                        coins.push({ x: c * 32, y: (groundRow - 5) * 32 });
                    }
                }
            });

            // 4. Monedas doradas flotantes en arcos sobre las llanuras
            for (let c = 10; c < mapWidth - 22; c += 10) {
                if (grid[groundRow][c] === 1 && grid[groundRow - 1][c] === 0) {
                    coins.push({ x: c * 32, y: (groundRow - 2) * 32 });
                }
            }

            // 5. Escalera piramidal clásica antes de la meta final
            const stairCol = 172;
            if (stairCol < mapWidth - 14) {
                // Escalón 1
                grid[groundRow - 1][stairCol] = 1;
                // Escalón 2
                grid[groundRow - 1][stairCol + 1] = 1;
                grid[groundRow - 2][stairCol + 1] = 1;
                // Escalón 3
                grid[groundRow - 1][stairCol + 2] = 1;
                grid[groundRow - 2][stairCol + 2] = 1;
                grid[groundRow - 3][stairCol + 2] = 1;
                // Escalón 4 (Cima)
                grid[groundRow - 1][stairCol + 3] = 1;
                grid[groundRow - 2][stairCol + 3] = 1;
                grid[groundRow - 3][stairCol + 3] = 1;
                grid[groundRow - 4][stairCol + 3] = 1;
                // Bajada
                grid[groundRow - 1][stairCol + 4] = 1;
                grid[groundRow - 2][stairCol + 4] = 1;
                grid[groundRow - 1][stairCol + 5] = 1;
            }

            // 6. DISTRIBUCIÓN EXTENSA Y DESAFIANTE DE ENEMIGOS A LO LARGO DE LOS 190 BLOQUES
            const baseEnemySpeed = -(1.2 + (worldIndex - 1) * 0.15 + (levelIndex - 1) * 0.04);
            const enemyConfigs = [];

            // Patrullas terrestres y aéreas repartidas equidistantemente
            enemyConfigs.push({ col: 14, type: 'goomba' });
            enemyConfigs.push({ col: 24, type: 'goomba' });
            enemyConfigs.push({ col: 34, type: (levelIndex >= 2) ? 'koopa' : 'goomba' });
            enemyConfigs.push({ col: 44, type: 'goomba' });
            enemyConfigs.push({ col: 54, type: 'koopa' });
            enemyConfigs.push({ col: 64, type: 'goomba' });
            enemyConfigs.push({ col: 72, type: (worldIndex >= 2) ? 'koopa' : 'goomba' });
            enemyConfigs.push({ col: 82, type: 'goomba' });
            enemyConfigs.push({ col: 92, type: 'koopa' });
            enemyConfigs.push({ col: 102, type: 'goomba' });
            enemyConfigs.push({ col: 114, type: (levelIndex >= 3) ? 'koopa' : 'goomba' });
            enemyConfigs.push({ col: 124, type: 'goomba' });
            enemyConfigs.push({ col: 134, type: 'koopa' });
            enemyConfigs.push({ col: 144, type: 'goomba' });
            enemyConfigs.push({ col: 154, type: 'koopa' });
            enemyConfigs.push({ col: 162, type: 'goomba' });

            // Enemigos voladores (Paratroopas) en mundos/niveles más avanzados
            if (worldIndex >= 2 || levelIndex >= 4) {
                enemyConfigs.push({ col: 40, type: 'koopa', fly: true });
                enemyConfigs.push({ col: 98, type: 'koopa', fly: true });
            }
            if (worldIndex >= 3 || levelIndex >= 6) {
                enemyConfigs.push({ col: 68, type: 'koopa', fly: true });
                enemyConfigs.push({ col: 138, type: 'koopa', fly: true });
            }
            if (worldIndex >= 5) {
                enemyConfigs.push({ col: 110, type: 'koopa', fly: true });
                enemyConfigs.push({ col: 150, type: 'koopa', fly: true });
            }

            enemyConfigs.forEach(cfg => {
                if (cfg.col < mapWidth - 18) {
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

            // 7. BANDERA DE META Y CASTILLO AL FINAL DE LOS 190 BLOQUES
            const flagCol = mapWidth - 10;   // Columna 180
            const castleCol = mapWidth - 5;  // Columna 185

            // Mástil de meta: Tile 10 desde fila 1 hasta fila 5
            for (let r = groundRow - 5; r < groundRow; r++) {
                grid[r][flagCol] = 10;
            }

            // Castillo final con puerta abierta
            for (let r = groundRow - 3; r < groundRow; r++) {
                for (let c = castleCol; c < castleCol + 3; c++) {
                    grid[r][c] = 12;
                }
            }
            // Almenas
            grid[groundRow - 4][castleCol] = 12;
            grid[groundRow - 4][castleCol + 2] = 12;
            // Puerta
            grid[groundRow - 1][castleCol + 1] = 11;

            return {
                world,
                worldIndex,
                levelIndex,
                isBossLevel: false,
                mapWidth,
                mapHeight,
                grid,
                enemies,
                coins,
                boss: null,
                spawnX: 3 * 32,
                spawnY: (groundRow - 1) * 32,
                flagCol,
                flagX: flagCol * 32,
                castleX: castleCol * 32
            };
        }
    }
}

window.WORLDS_CONFIG = WORLDS_CONFIG;
window.LevelBuilder = LevelBuilder;
