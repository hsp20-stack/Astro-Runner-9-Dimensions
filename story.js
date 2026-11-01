// story.js - Prólogo Cinemático Animado: La Leyenda del Cristal Cósmico (2026)
// Cinemática AAA con múltiples animaciones, efectos de sonido y diálogos con voces retro

if (typeof CanvasRenderingContext2D !== 'undefined' && !CanvasRenderingContext2D.prototype.roundRect) {
    CanvasRenderingContext2D.prototype.roundRect = function(x, y, w, h, r) {
        if (!r) r = 0;
        this.rect(x, y, w, h);
        return this;
    };
}

window.StoryManager = {
    active: false,
    currentScene: 0,
    sceneTimer: 0,
    maxScenes: 5,
    onComplete: null,

    // Variables de animación avanzadas
    stars: [],
    shards: [],
    particles: [],
    lightningArcs: [],
    smokePuffs: [],
    warpLines: [],
    shockwaveRadius: 0,
    shockwaveAlpha: 0,
    cinemaFlash: 0,
    redAlertPulse: 0,
    vortexAngle: 0,
    crystalAngle: 0,
    shipY: 0,
    shipX: 0,
    astroLandY: 0,
    astroSquash: 1,
    cockpitShake: 0,
    waterfallOffset: 0,
    ignoreInputTimer: 0,

    // Diálogos y personajes
    textCharIndex: 0,
    lastBeepChar: 0,
    currentFullText: '',
    currentSpeaker: 'narrator', // 'narrator', 'vortex', 'alert', 'astro', 'navi'
    speakerName: '',
    speakerRole: '',
    speakerBadgeColor: '#38bdf8',

    init: function() {
        // Campo estelar profundo multicapa
        this.stars = [];
        for (let i = 0; i < 90; i++) {
            this.stars.push({
                x: Math.random() * 480,
                y: Math.random() * 270,
                size: Math.random() * 2.5 + 0.5,
                speed: Math.random() * 0.9 + 0.15,
                twinkle: Math.random() * Math.PI * 2,
                color: (i % 6 === 0) ? '#38bdf8' : ((i % 7 === 0) ? '#c084fc' : ((i % 9 === 0) ? '#fef08a' : '#ffffff'))
            });
        }

        // Líneas de velocidad para el salto al hiperespacio
        this.warpLines = [];
        for (let i = 0; i < 45; i++) {
            const angle = Math.random() * Math.PI * 2;
            const dist = 30 + Math.random() * 200;
            this.warpLines.push({
                angle: angle,
                dist: dist,
                speed: 4 + Math.random() * 8,
                len: 12 + Math.random() * 28,
                color: (i % 3 === 0) ? '#38bdf8' : '#818cf8'
            });
        }
    },

    startIntroStory: function(callback) {
        this.init();
        this.active = true;
        this.currentScene = 0;
        this.sceneTimer = 0;
        this.ignoreInputTimer = 35; // Previene que el toque al botón JUGAR salte la escena
        this.onComplete = callback;
        this.loadScene(0);

        // Ocultar controles táctiles durante la cinemática
        const touch = document.getElementById('touchControls');
        if (touch) touch.style.display = 'none';

        // Detener música previa para que solo suenen los efectos de la historia
        if (window.sounds && window.sounds.stopMusic) {
            window.sounds.stopMusic();
        }
    },

    skipStory: function() {
        if (!this.active) return;
        this.finishStory();
    },

    finishStory: function() {
        this.active = false;
        const touch = document.getElementById('touchControls');
        if (touch) touch.style.display = '';

        if (typeof this.onComplete === 'function') {
            this.onComplete();
        }
    },

    nextScene: function() {
        if (this.ignoreInputTimer > 0) return;
        this.ignoreInputTimer = 16;
        if (this.currentScene < this.maxScenes - 1) {
            this.currentScene++;
            this.loadScene(this.currentScene);
        } else {
            this.finishStory();
        }
    },

    loadScene: function(sceneIdx) {
        this.currentScene = sceneIdx;
        this.sceneTimer = 0;
        this.textCharIndex = 0;
        this.lastBeepChar = 0;
        this.particles = [];
        this.lightningArcs = [];
        this.smokePuffs = [];

        if (sceneIdx === 0) {
            // Escena 0: Estación Nova Prime y el Gran Cristal Cósmico
            this.currentSpeaker = 'narrator';
            this.speakerName = 'IA NOVA PRIME';
            this.speakerRole = '[SISTEMA ORBITAL CENTRAL]';
            this.speakerBadgeColor = '#38bdf8';
            this.currentFullText = "Año 2026. Durante eones, el Gran Cristal Solar mantuvo el equilibrio vital en las 9 dimensiones. Astro, guardián de élite de Hugo SP Studios, vigilaba el núcleo en paz.";
        } else if (sceneIdx === 1) {
            // Escena 1: La Brecha Dimensional y el Emperador Vórtice
            this.currentSpeaker = 'vortex';
            this.speakerName = 'EMPERADOR VÓRTICE';
            this.speakerRole = '[AMENAZA DE OTRA DIMENSIÓN]';
            this.speakerBadgeColor = '#ef4444';
            this.currentFullText = "«¡JA, JA, JA! ¡Pobres ilusos! Vuestro pacífico cosmos se arrodillará ante mi armada oscura... ¡El poder de las 9 dimensiones es ahora mío!»";
            
            if (window.sounds && window.sounds.playStoryAlarm) {
                window.sounds.playStoryAlarm();
            }
            if (window.sounds && window.sounds.playLaserCharge) {
                setTimeout(() => { if (window.sounds) window.sounds.playLaserCharge(); }, 700);
            }
            if (typeof triggerScreenShake === 'function') triggerScreenShake(5);

            for (let i = 0; i < 8; i++) {
                this.lightningArcs.push({
                    x1: 240 + (Math.random() - 0.5) * 80,
                    y1: 30 + Math.random() * 40,
                    x2: 240 + (Math.random() - 0.5) * 160,
                    y2: 120 + Math.random() * 60,
                    life: 25 + Math.random() * 20
                });
            }
        } else if (sceneIdx === 2) {
            // Escena 2: El Gran Cristal estalla en 9 fragmentos
            this.currentSpeaker = 'alert';
            this.speakerName = 'ALERTA GALÁCTICA';
            this.speakerRole = '[COLAPSO DEL SISTEMA]';
            this.speakerBadgeColor = '#f59e0b';
            this.currentFullText = "¡ALERTA CRÍTICA! El Núcleo Solar no resistió y estalló. Sus 9 Fragmentos Sagrados cayeron en las 9 dimensiones: ¡desde la Aldea Kokiri hasta el Castillo de Magma!";
            
            this.cinemaFlash = 1.0;
            this.shockwaveRadius = 6;
            this.shockwaveAlpha = 1.0;

            if (window.sounds && window.sounds.playStoryShockwave) {
                window.sounds.playStoryShockwave();
            }
            if (window.sounds && window.sounds.playStoryShatter) {
                window.sounds.playStoryShatter();
            }
            if (typeof triggerScreenShake === 'function') triggerScreenShake(8);

            // Generar 9 fragmentos con dirección hacia sus portales planetarios
            this.shards = [];
            const shardColors = ['#15803d', '#ca8a04', '#9333ea', '#059669', '#2563eb', '#15803d', '#ea580c', '#b91c1c', '#38bdf8'];
            for (let i = 0; i < 9; i++) {
                const angle = (i / 9) * Math.PI * 2 + (Math.random() * 0.15);
                const spd = 2.6 + Math.random() * 2.8;
                this.shards.push({
                    x: 240,
                    y: 110,
                    vx: Math.cos(angle) * spd,
                    vy: Math.sin(angle) * spd,
                    color: shardColors[i],
                    angle: 0,
                    size: 9,
                    portalX: 240 + Math.cos(angle) * 180,
                    portalY: 110 + Math.sin(angle) * 95
                });
            }
        } else if (sceneIdx === 3) {
            // Escena 3: Astro en la cabina y salto al hiperespacio
            this.currentSpeaker = 'astro';
            this.speakerName = 'ASTRO (EL GUARDIÁN)';
            this.speakerRole = '[MISIÓN DE RESCATE CÓSMICO]';
            this.speakerBadgeColor = '#38bdf8';
            this.currentFullText = "«¡No permitiré que destruyan la galaxia! Reactores encendidos... ¡Salto al hiperespacio fijado hacia la Aldea Kokiri del Bosque!»";
            
            if (window.sounds && window.sounds.playStoryHeroReady) {
                window.sounds.playStoryHeroReady();
            }
            if (window.sounds && window.sounds.playStoryWarp) {
                setTimeout(() => { if (window.sounds) window.sounds.playStoryWarp(); }, 1200);
            }
        } else if (sceneIdx === 4) {
            // Escena 4: Entrada atmosférica y aterrizaje en Aldea Kokiri del Bosque
            this.currentSpeaker = 'navi';
            this.speakerName = 'HADA NAVI';
            this.speakerRole = '[GUÍA DEL BOSQUE KOKIRI]';
            this.speakerBadgeColor = '#4ade80';
            this.currentFullText = "«¡Hey, Astro! ¡Bienvenido a la ancestral Aldea Kokiri del Bosque! El primer fragmento está oculto en el templo, custodiado por Mecha-Koopa Prime. ¡Adelante!»";
            
            this.shipY = -55;
            this.shipX = 240;
            this.astroLandY = -30;
            this.astroSquash = 1;
            
            if (window.sounds && window.sounds.playSpaceshipLaunch) {
                window.sounds.playSpaceshipLaunch();
            }
            if (window.sounds && window.sounds.playFairySparkle) {
                setTimeout(() => { if (window.sounds) window.sounds.playFairySparkle(); }, 1100);
            }
        }
    },

    update: function(dt) {
        if (!this.active) return;

        this.sceneTimer++;
        if (this.ignoreInputTimer > 0) this.ignoreInputTimer--;

        // Efecto máquina de escribir con sincronización de voces retro
        if (this.textCharIndex < this.currentFullText.length) {
            this.textCharIndex += 0.85;
            const currentIntChar = Math.floor(this.textCharIndex);
            
            // Cada 2 caracteres reproducir el pitido de voz del personaje que habla
            if (currentIntChar > this.lastBeepChar && (currentIntChar % 2 === 0)) {
                this.lastBeepChar = currentIntChar;
                const charAt = this.currentFullText.charAt(currentIntChar);
                if (charAt !== ' ' && charAt !== '.' && charAt !== ',') {
                    if (window.sounds && window.sounds.playTextBeep) {
                        window.sounds.playTextBeep(this.currentSpeaker);
                    }
                }
            }
        }

        // Animación de estrellas de fondo
        for (let s of this.stars) {
            s.x -= s.speed;
            if (s.x < 0) s.x = 480;
            s.twinkle += 0.05;
        }

        // Animaciones cíclicas de elementos
        this.crystalAngle += 0.035;
        this.vortexAngle += 0.055;
        this.redAlertPulse = Math.sin(this.sceneTimer * 0.14) * 0.5 + 0.5;
        this.waterfallOffset = (this.waterfallOffset + 2.5) % 18;

        // Atenuación de flash cinematográfico y onda expansiva
        if (this.cinemaFlash > 0) {
            this.cinemaFlash = Math.max(0, this.cinemaFlash - 0.035);
        }
        if (this.shockwaveAlpha > 0) {
            this.shockwaveRadius += 5.5;
            this.shockwaveAlpha = Math.max(0, this.shockwaveAlpha - 0.022);
        }

        // Escena 1: Rayos de distorsión y humo de la nave de Vortex
        if (this.currentScene === 1) {
            if (this.sceneTimer % 5 === 0) {
                this.lightningArcs.push({
                    x1: 240 + (Math.random() - 0.5) * 60,
                    y1: 40 + Math.random() * 30,
                    x2: 240 + (Math.random() - 0.5) * 180,
                    y2: 100 + Math.random() * 80,
                    life: 12
                });
            }
            for (let i = this.lightningArcs.length - 1; i >= 0; i--) {
                this.lightningArcs[i].life--;
                if (this.lightningArcs[i].life <= 0) this.lightningArcs.splice(i, 1);
            }

            // Humo de propulsión oscura
            if (this.sceneTimer % 3 === 0) {
                this.smokePuffs.push({
                    x: 240 + (Math.random() - 0.5) * 70,
                    y: 75,
                    vx: (Math.random() - 0.5) * 1.5,
                    vy: -1.2 - Math.random() * 1.2,
                    size: 3 + Math.random() * 5,
                    alpha: 0.7,
                    color: '#9333ea'
                });
            }
        }

        // Escena 2: Mover los 9 fragmentos hacia los portales
        if (this.currentScene === 2) {
            for (let sh of this.shards) {
                sh.x += sh.vx;
                sh.y += sh.vy;
                sh.angle += 0.08;
                if (this.sceneTimer % 2 === 0) {
                    this.particles.push({
                        x: sh.x,
                        y: sh.y,
                        vx: (Math.random() - 0.5) * 0.6,
                        vy: (Math.random() - 0.5) * 0.6,
                        color: sh.color,
                        life: 16,
                        size: 3
                    });
                }
            }
        }

        // Escena 3: Animación de hiperespacio y propulsores
        if (this.currentScene === 3) {
            this.cockpitShake = Math.sin(this.sceneTimer * 0.3) * 1.5;
            for (let w of this.warpLines) {
                w.dist += w.speed;
                if (w.dist > 260) w.dist = 20;
            }
        }

        // Escena 4: Descenso de la nave y aterrizaje heroico de Astro
        if (this.currentScene === 4) {
            if (this.sceneTimer < 80) {
                this.shipY += (105 - this.shipY) * 0.08;
            } else if (this.sceneTimer >= 80 && this.sceneTimer < 140) {
                // Astro salta desde la nave
                if (this.astroLandY < 185) {
                    this.astroLandY += 4.6;
                } else {
                    if (this.astroSquash === 1) {
                        this.astroSquash = 1.45;
                        if (typeof triggerScreenShake === 'function') triggerScreenShake(3.5);
                        if (window.sounds && window.sounds.playSuperheroThud) {
                            window.sounds.playSuperheroThud();
                        }
                        // Anillo de polvo de aterrizaje heroico
                        for (let i = 0; i < 24; i++) {
                            const ang = (i / 24) * Math.PI * 2;
                            this.particles.push({
                                x: 240,
                                y: 196,
                                vx: Math.cos(ang) * (2.2 + Math.random() * 2.5),
                                vy: Math.sin(ang) * 0.8 - 0.6,
                                color: (i % 2 === 0) ? '#4ade80' : '#e2e8f0',
                                life: 24,
                                size: 3.5
                            });
                        }
                    }
                }
                this.astroSquash += (1.0 - this.astroSquash) * 0.12;
            } else if (this.sceneTimer >= 140) {
                // Nave despega al horizonte
                this.shipY -= 5.5;
                this.shipX += 3.2;
            }

            // Humo de la chimenea de la casa en el árbol Kokiri
            if (this.sceneTimer % 6 === 0) {
                this.smokePuffs.push({
                    x: 35,
                    y: 135,
                    vx: 0.4 + Math.random() * 0.3,
                    vy: -1.0 - Math.random() * 0.6,
                    size: 2.5 + Math.random() * 3.5,
                    alpha: 0.65,
                    color: '#e2e8f0'
                });
            }

            // Finalizar cinemática tras completar la animación
            if (this.sceneTimer >= 225) {
                this.finishStory();
            }
        } else {
            // Auto-avanzar al leer si pasa suficiente tiempo (aprox 7.5 segundos por escena)
            if (this.sceneTimer > 320) {
                this.nextScene();
            }
        }

        // Actualizar partículas
        for (let i = this.particles.length - 1; i >= 0; i--) {
            const p = this.particles[i];
            p.x += p.vx;
            p.y += p.vy;
            p.life--;
            if (p.life <= 0) this.particles.splice(i, 1);
        }

        // Actualizar humo
        for (let i = this.smokePuffs.length - 1; i >= 0; i--) {
            const sm = this.smokePuffs[i];
            sm.x += sm.vx;
            sm.y += sm.vy;
            sm.alpha -= 0.02;
            sm.size += 0.15;
            if (sm.alpha <= 0) this.smokePuffs.splice(i, 1);
        }
    },

    render: function(ctx) {
        if (!this.active) return;

        ctx.save();

        // 1. Fondo espacial o atmosférico
        this.renderSpaceBackground(ctx);

        // 2. Renderizar contenido específico de la escena
        if (this.currentScene === 0) {
            this.renderScene0(ctx);
        } else if (this.currentScene === 1) {
            this.renderScene1(ctx);
        } else if (this.currentScene === 2) {
            this.renderScene2(ctx);
        } else if (this.currentScene === 3) {
            this.renderScene3(ctx);
        } else if (this.currentScene === 4) {
            this.renderScene4(ctx);
        }

        // 3. Humo
        for (let sm of this.smokePuffs) {
            ctx.fillStyle = sm.color;
            ctx.globalAlpha = Math.max(0, sm.alpha);
            ctx.beginPath();
            ctx.arc(sm.x, sm.y, sm.size, 0, Math.PI * 2);
            ctx.fill();
        }
        ctx.globalAlpha = 1.0;

        // 4. Partículas
        for (let p of this.particles) {
            ctx.fillStyle = p.color;
            ctx.beginPath();
            ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
            ctx.fill();
        }

        // 5. Flash blanco cinematográfico de explosión
        if (this.cinemaFlash > 0) {
            ctx.fillStyle = `rgba(255, 255, 255, ${this.cinemaFlash})`;
            ctx.fillRect(0, 0, 480, 270);
        }

        // 5b. Banner cinematográfico de Título de Capítulo (2026 AAA Style)
        const chapterTitles = [
            'CAPÍTULO I: EL NÚCLEO SOLAR DE NOVA PRIME',
            'CAPÍTULO II: LA INVASIÓN DEL EMPERADOR VÓRTICE',
            'CAPÍTULO III: CATACLISMO EN LAS 9 DIMENSIONES',
            'CAPÍTULO IV: RUMBO AL HIPERESPACIO',
            'CAPÍTULO V: DESTINO: ALDEA KOKIRI DEL BOSQUE'
        ];
        if (this.sceneTimer < 120) {
            const chapProgress = Math.sin((this.sceneTimer / 120) * Math.PI);
            ctx.save();
            ctx.font = '900 8.5px system-ui, sans-serif';
            ctx.fillStyle = `rgba(56, 189, 248, ${chapProgress * 0.95})`;
            ctx.textAlign = 'center';
            ctx.shadowColor = '#38bdf8';
            ctx.shadowBlur = 10;
            ctx.fillText(chapterTitles[this.currentScene] || '', 240, 36);
            ctx.restore();
        }

        // 6. Barras negras cinematográficas (Cinemascope 2.39:1)
        this.renderCinematicBorders(ctx);

        // 7. Cuadro de diálogo RPG con avatar animado del personaje
        this.renderDialogueBoxWithAvatar(ctx);

        // 8. Botón de saltar cinemática y pista de toque
        this.renderSkipHint(ctx);

        ctx.restore();
    },

    renderSpaceBackground: function(ctx) {
        if (this.currentScene === 4) {
            // Cielo de la Aldea Kokiri del Bosque (Mundo 1: #1e3a8a a #60a5fa)
            const forestSky = ctx.createLinearGradient(0, 0, 0, 270);
            forestSky.addColorStop(0, '#1e3a8a');
            forestSky.addColorStop(0.55, '#3b82f6');
            forestSky.addColorStop(1, '#93c5fd');
            ctx.fillStyle = forestSky;
            ctx.fillRect(0, 0, 480, 270);
            return;
        }

        const bgGrad = ctx.createRadialGradient(240, 110, 10, 240, 135, 270);
        if (this.currentScene === 1) {
            // Invasión: Alarma carmesí pulsante
            bgGrad.addColorStop(0, `rgba(95, 10, 32, ${0.45 + this.redAlertPulse * 0.35})`);
            bgGrad.addColorStop(0.6, '#0f051d');
            bgGrad.addColorStop(1, '#020005');
        } else {
            // Cosmos púrpura y azul
            bgGrad.addColorStop(0, '#1e1145');
            bgGrad.addColorStop(0.5, '#09071c');
            bgGrad.addColorStop(1, '#02020a');
        }
        ctx.fillStyle = bgGrad;
        ctx.fillRect(0, 0, 480, 270);

        // Estrellas
        for (let s of this.stars) {
            const alpha = 0.4 + Math.sin(s.twinkle) * 0.55;
            ctx.fillStyle = s.color;
            ctx.globalAlpha = Math.max(0.1, Math.min(1, alpha));
            ctx.beginPath();
            ctx.arc(s.x, s.y, s.size, 0, Math.PI * 2);
            ctx.fill();
        }
        ctx.globalAlpha = 1.0;
    },

    // ESCENA 0: ESTACIÓN NOVA PRIME Y GRAN CRISTAL SOLAR
    renderScene0: function(ctx) {
        const cx = 240;
        const cy = 105;

        // Estación Nova Prime en el fondo con ventanales iluminados
        ctx.fillStyle = '#1e293b';
        ctx.strokeStyle = '#38bdf8';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.roundRect(120, 170, 240, 24, 6);
        ctx.fill();
        ctx.stroke();

        // Panel solar izquierdo
        ctx.fillStyle = '#0f172a';
        ctx.fillRect(50, 174, 65, 16);
        ctx.strokeStyle = '#0284c7';
        ctx.lineWidth = 1;
        ctx.strokeRect(50, 174, 65, 16);
        // Celdas solares hexagonales
        ctx.fillStyle = '#0284c7';
        for (let px = 54; px < 110; px += 10) {
            ctx.fillRect(px, 177, 7, 10);
        }

        // Panel solar derecho
        ctx.fillStyle = '#0f172a';
        ctx.fillRect(365, 174, 65, 16);
        ctx.strokeStyle = '#0284c7';
        ctx.strokeRect(365, 174, 65, 16);
        ctx.fillStyle = '#0284c7';
        for (let px = 369; px < 425; px += 10) {
            ctx.fillRect(px, 177, 7, 10);
        }

        // Antena de radar giratoria en la torre superior
        const radarAngle = this.sceneTimer * 0.06;
        ctx.strokeStyle = '#38bdf8';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(240, 170);
        ctx.lineTo(240, 155);
        ctx.stroke();
        ctx.beginPath();
        ctx.ellipse(240, 153, 10, 4, radarAngle, 0, Math.PI * 2);
        ctx.stroke();

        // Luces de navegación de la pista de la estación
        for (let b = 0; b < 7; b++) {
            const lit = (Math.floor(this.sceneTimer / 6) % 7 === b);
            ctx.fillStyle = lit ? '#38bdf8' : '#0369a1';
            ctx.fillRect(135 + b * 32, 179, 5, 5);
        }

        // Dron de carga espacial cruzando al fondo
        const droneX = ((this.sceneTimer * 0.8) % 520) - 20;
        ctx.fillStyle = '#475569';
        ctx.beginPath();
        ctx.roundRect(droneX, 55, 16, 7, 2);
        ctx.fill();
        ctx.fillStyle = '#38bdf8';
        ctx.fillRect(droneX - 3, 57, 3, 3); // Propulsor

        // Anillos orbitales giratorios de contención de energía
        ctx.save();
        ctx.translate(cx, cy);
        ctx.strokeStyle = 'rgba(56, 189, 248, 0.55)';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.ellipse(0, 0, 92, 28, this.crystalAngle * 0.7, 0, Math.PI * 2);
        ctx.stroke();

        // 8 esferas de plasma orbitales que giran
        for (let o = 0; o < 8; o++) {
            const orbAng = this.crystalAngle * 0.7 + (o * Math.PI) / 4;
            const ox = Math.cos(orbAng) * 92;
            const oy = Math.sin(orbAng) * 28;
            ctx.fillStyle = '#fef08a';
            ctx.beginPath();
            ctx.arc(ox, oy, 2.5, 0, Math.PI * 2);
            ctx.fill();
        }

        ctx.strokeStyle = 'rgba(251, 191, 36, 0.5)';
        ctx.beginPath();
        ctx.ellipse(0, 0, 80, 24, -this.crystalAngle * 0.9, 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();

        // Haz vertical de contención desde la base
        const beam = ctx.createLinearGradient(cx, 170, cx, cy);
        beam.addColorStop(0, 'rgba(56, 189, 248, 0.8)');
        beam.addColorStop(1, 'rgba(254, 240, 138, 0.2)');
        ctx.fillStyle = beam;
        ctx.fillRect(cx - 8, cy + 20, 16, 150 - cy);

        // Gran resplandor aureal del Cristal Solar
        const glow = ctx.createRadialGradient(cx, cy, 5, cx, cy, 75);
        glow.addColorStop(0, 'rgba(254, 240, 138, 0.95)');
        glow.addColorStop(0.35, 'rgba(56, 189, 248, 0.65)');
        glow.addColorStop(1, 'rgba(0, 0, 0, 0)');
        ctx.fillStyle = glow;
        ctx.beginPath();
        ctx.arc(cx, cy, 75, 0, Math.PI * 2);
        ctx.fill();

        // Gran Cristal Octaédrico 3D
        ctx.save();
        ctx.translate(cx, cy);
        ctx.rotate(Math.sin(this.crystalAngle) * 0.16);

        // Faceta izquierda
        ctx.fillStyle = '#fde047';
        ctx.beginPath();
        ctx.moveTo(0, -42);
        ctx.lineTo(-26, 0);
        ctx.lineTo(0, 42);
        ctx.closePath();
        ctx.fill();

        // Faceta derecha
        ctx.fillStyle = '#f59e0b';
        ctx.beginPath();
        ctx.moveTo(0, -42);
        ctx.lineTo(26, 0);
        ctx.lineTo(0, 42);
        ctx.closePath();
        ctx.fill();

        // Centro blanco brillante
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.moveTo(0, -42);
        ctx.lineTo(5, 0);
        ctx.lineTo(0, 42);
        ctx.lineTo(-5, 0);
        ctx.closePath();
        ctx.fill();

        ctx.strokeStyle = '#fef08a';
        ctx.lineWidth = 2;
        ctx.stroke();
        ctx.restore();

        // Astro flotando en gravedad cero vigilando el cristal
        const astroFloatY = 146 + Math.sin(this.sceneTimer * 0.05) * 4;
        this.drawAstroMini(ctx, 150, astroFloatY, 'right');
    },

    // ESCENA 1: LA INVASIÓN DE DARK VORTEX
    renderScene1: function(ctx) {
        const cx = 240;
        const cy = 95;

        // Vórtice dimensional negro y carmesí giratorio
        ctx.save();
        ctx.translate(cx, cy - 10);
        ctx.rotate(this.vortexAngle);

        for (let i = 0; i < 7; i++) {
            ctx.fillStyle = (i % 2 === 0) ? 'rgba(220, 38, 38, 0.45)' : 'rgba(147, 51, 234, 0.45)';
            ctx.beginPath();
            ctx.ellipse(0, 0, 120, 44, (i * Math.PI) / 3.5, 0, Math.PI * 2);
            ctx.fill();
        }
        ctx.restore();

        // Centro negro del agujero de gusano
        ctx.fillStyle = '#05000a';
        ctx.beginPath();
        ctx.arc(cx, cy - 10, 36, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#ef4444';
        ctx.lineWidth = 2.5;
        ctx.stroke();

        // Rayos de distorsión
        ctx.strokeStyle = '#f43f5e';
        ctx.lineWidth = 1.8;
        for (let l of this.lightningArcs) {
            ctx.beginPath();
            ctx.moveTo(l.x1, l.y1);
            const midX = (l.x1 + l.x2) / 2 + (Math.random() - 0.5) * 15;
            const midY = (l.y1 + l.y2) / 2 + (Math.random() - 0.5) * 15;
            ctx.lineTo(midX, midY);
            ctx.lineTo(l.x2, l.y2);
            ctx.stroke();
        }

        // Nave Acorazada de Dark Vortex
        ctx.save();
        ctx.translate(cx, cy - 15);

        ctx.fillStyle = '#1e1b4b';
        ctx.beginPath();
        ctx.moveTo(0, -34);
        ctx.lineTo(75, 16);
        ctx.lineTo(34, 28);
        ctx.lineTo(0, 18);
        ctx.lineTo(-34, 28);
        ctx.lineTo(-75, 16);
        ctx.closePath();
        ctx.fill();
        ctx.strokeStyle = '#dc2626';
        ctx.lineWidth = 2;
        ctx.stroke();

        // Ojos mecánicos rojos amenazantes
        ctx.fillStyle = '#ef4444';
        ctx.shadowColor = '#ef4444';
        ctx.shadowBlur = 12;
        ctx.beginPath();
        ctx.ellipse(-14, 0, 7, 3, -0.2, 0, Math.PI * 2);
        ctx.ellipse(14, 0, 7, 3, 0.2, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;
        ctx.restore();

        // Rayos láser de fijación de blanco
        ctx.strokeStyle = 'rgba(239, 68, 68, 0.8)';
        ctx.lineWidth = 1.5;
        ctx.setLineDash([4, 4]);
        ctx.beginPath();
        ctx.moveTo(cx - 25, cy + 5);
        ctx.lineTo(cx - 10, 160);
        ctx.moveTo(cx + 25, cy + 5);
        ctx.lineTo(cx + 10, 160);
        ctx.stroke();
        ctx.setLineDash([]);

        // Rayo tractor de plasma oscuro
        const tractor = ctx.createLinearGradient(cx, cy - 5, cx, 175);
        tractor.addColorStop(0, 'rgba(239, 68, 68, 0.8)');
        tractor.addColorStop(1, 'rgba(147, 51, 234, 0.25)');
        ctx.fillStyle = tractor;
        ctx.beginPath();
        ctx.moveTo(cx - 18, cy + 10);
        ctx.lineTo(cx + 18, cy + 10);
        ctx.lineTo(cx + 48, 175);
        ctx.lineTo(cx - 48, 175);
        ctx.closePath();
        ctx.fill();

        // Marco de alerta roja pulsante
        ctx.fillStyle = `rgba(239, 68, 68, ${this.redAlertPulse * 0.28})`;
        ctx.fillRect(0, 0, 480, 270);
    },

    // ESCENA 2: LA DISPERSIÓN DE LOS 9 FRAGMENTOS
    renderScene2: function(ctx) {
        const cx = 240;
        const cy = 105;

        // Doble onda expansiva
        if (this.shockwaveAlpha > 0) {
            ctx.save();
            ctx.strokeStyle = `rgba(255, 255, 255, ${this.shockwaveAlpha})`;
            ctx.lineWidth = 4;
            ctx.beginPath();
            ctx.arc(cx, cy, this.shockwaveRadius, 0, Math.PI * 2);
            ctx.stroke();

            ctx.strokeStyle = `rgba(244, 63, 94, ${this.shockwaveAlpha * 0.7})`;
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.arc(cx, cy, this.shockwaveRadius * 0.75, 0, Math.PI * 2);
            ctx.stroke();
            ctx.restore();
        }

        // Resplandor del estallido
        const blast = ctx.createRadialGradient(cx, cy, 2, cx, cy, 95);
        blast.addColorStop(0, 'rgba(255, 255, 255, 0.95)');
        blast.addColorStop(0.35, 'rgba(254, 240, 138, 0.75)');
        blast.addColorStop(1, 'rgba(0, 0, 0, 0)');
        ctx.fillStyle = blast;
        ctx.beginPath();
        ctx.arc(cx, cy, 95, 0, Math.PI * 2);
        ctx.fill();

        // Mini portales planetarios en la periferia con etiquetas de los 9 mundos
        const portalThemes = ['#15803d', '#ca8a04', '#9333ea', '#059669', '#2563eb', '#15803d', '#ea580c', '#b91c1c', '#38bdf8'];
        const portalNames = ['1.KOKIRI', '2.GERUDO', '3.CAVERNA', '4.NEÓN', '5.ATLÁNTIDA', '6.SETAS', '7.NUBES', '8.MAGMA', '9.ASTRAL'];
        for (let i = 0; i < 9; i++) {
            const ang = (i / 9) * Math.PI * 2;
            const px = cx + Math.cos(ang) * 180;
            const py = cy + Math.sin(ang) * 92;

            ctx.save();
            ctx.shadowColor = portalThemes[i];
            ctx.shadowBlur = 10;
            ctx.fillStyle = portalThemes[i];
            ctx.beginPath();
            ctx.ellipse(px, py, 15, 9, ang, 0, Math.PI * 2);
            ctx.fill();
            ctx.strokeStyle = '#ffffff';
            ctx.lineWidth = 1.2;
            ctx.stroke();
            ctx.shadowBlur = 0;

            // Etiqueta del mundo
            ctx.font = '800 6px system-ui, sans-serif';
            ctx.fillStyle = '#f8fafc';
            ctx.textAlign = 'center';
            ctx.fillText(portalNames[i], px, py + 14);
            ctx.restore();
        }

        // Los 9 Fragmentos Sagrados de colores
        for (let sh of this.shards) {
            ctx.save();
            ctx.translate(sh.x, sh.y);
            ctx.rotate(sh.angle);

            ctx.fillStyle = sh.color;
            ctx.shadowColor = sh.color;
            ctx.shadowBlur = 9;
            ctx.beginPath();
            ctx.moveTo(0, -sh.size);
            ctx.lineTo(sh.size * 0.6, 0);
            ctx.lineTo(0, sh.size);
            ctx.lineTo(-sh.size * 0.6, 0);
            ctx.closePath();
            ctx.fill();

            // Centro blanco
            ctx.fillStyle = '#ffffff';
            ctx.beginPath();
            ctx.arc(0, 0, sh.size * 0.35, 0, Math.PI * 2);
            ctx.fill();

            ctx.shadowBlur = 0;
            ctx.restore();
        }
    },

    // ESCENA 3: CABINA DE COMBATE Y SALTO AL HIPERESPACIO
    renderScene3: function(ctx) {
        // Líneas de hiperespacio pasando a alta velocidad
        ctx.save();
        ctx.translate(240, 110);
        ctx.lineWidth = 2;
        for (let w of this.warpLines) {
            const x1 = Math.cos(w.angle) * w.dist;
            const y1 = Math.sin(w.angle) * w.dist;
            const x2 = Math.cos(w.angle) * (w.dist + w.len);
            const y2 = Math.sin(w.angle) * (w.dist + w.len);
            ctx.strokeStyle = w.color;
            ctx.beginPath();
            ctx.moveTo(x1, y1);
            ctx.lineTo(x2, y2);
            ctx.stroke();
        }
        ctx.restore();

        // Nave de Astro en primer plano en vuelo
        const shipFlightY = 95 + this.cockpitShake;
        this.drawHeroSpaceship(ctx, 330, shipFlightY);

        // Primer plano de Astro con casco heroico
        this.drawAstroHeroCloseUp(ctx, 145, 130 + this.cockpitShake * 0.5);

        // HUD Holográfico táctico con gráficos animados
        ctx.save();
        ctx.translate(185, 45);
        ctx.strokeStyle = 'rgba(56, 189, 248, 0.75)';
        ctx.lineWidth = 1.4;
        ctx.beginPath();
        ctx.roundRect(0, 0, 105, 62, 6);
        ctx.stroke();

        ctx.fillStyle = 'rgba(15, 23, 42, 0.88)';
        ctx.fill();

        // Visualizador de onda de audio del comunicador
        ctx.strokeStyle = '#4ade80';
        ctx.lineWidth = 1;
        ctx.beginPath();
        for (let wx = 8; wx < 95; wx += 4) {
            const wy = 15 + Math.sin(this.sceneTimer * 0.3 + wx) * 3;
            if (wx === 8) ctx.moveTo(wx, wy);
            else ctx.lineTo(wx, wy);
        }
        ctx.stroke();

        ctx.fillStyle = '#38bdf8';
        ctx.font = '800 7.5px monospace';
        ctx.textAlign = 'left';
        ctx.fillText('HIPERIMPULSO: ACTIVO', 8, 28);
        ctx.fillText('DESTINO: ALDEA KOKIRI', 8, 39);
        ctx.fillText('DISTANCIA: EN REENTRADA', 8, 50);

        // Radar giratorio
        ctx.strokeStyle = '#38bdf8';
        ctx.beginPath();
        ctx.arc(92, 48, 6, 0, Math.PI * 2);
        ctx.stroke();
        const radSweep = this.sceneTimer * 0.1;
        ctx.beginPath();
        ctx.moveTo(92, 48);
        ctx.lineTo(92 + Math.cos(radSweep) * 6, 48 + Math.sin(radSweep) * 6);
        ctx.stroke();

        ctx.restore();
    },

    // ESCENA 4: REENTRADA ATMOSFÉRICA Y ALDEA KOKIRI DEL BOSQUE
    renderScene4: function(ctx) {
        // 1. Siluetas de montañas lejanas
        ctx.fillStyle = '#0f4024';
        for (let i = 0; i < 7; i++) {
            const bx = i * 75 - 20;
            ctx.beginPath();
            ctx.arc(bx + 40, 160, 52, 0, Math.PI * 2);
            ctx.fill();
        }

        // 2. Cascada de agua en el acantilado del fondo
        ctx.fillStyle = '#38bdf8';
        ctx.fillRect(350, 120, 18, 76);
        ctx.fillStyle = '#ffffff';
        // Líneas de espuma de la cascada que caen
        for (let wy = 122 + this.waterfallOffset; wy < 192; wy += 9) {
            ctx.fillRect(352, wy, 14, 2);
        }
        // Bruma en la base de la cascada
        ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
        ctx.beginPath();
        ctx.ellipse(359, 194, 18, 5, 0, 0, Math.PI * 2);
        ctx.fill();

        // 3. Bruma mística del bosque
        const mist = ctx.createLinearGradient(0, 135, 0, 205);
        mist.addColorStop(0, 'rgba(147, 197, 253, 0.08)');
        mist.addColorStop(0.5, 'rgba(219, 234, 254, 0.28)');
        mist.addColorStop(1, 'rgba(22, 101, 52, 0.45)');
        ctx.fillStyle = mist;
        ctx.fillRect(0, 125, 480, 80);

        // 4. Gran Árbol Kokiri Ancestral
        ctx.fillStyle = '#3f2108';
        ctx.beginPath();
        ctx.moveTo(0, 50);
        ctx.quadraticCurveTo(55, 120, 75, 225);
        ctx.lineTo(0, 225);
        ctx.closePath();
        ctx.fill();

        ctx.fillStyle = '#582f0e';
        ctx.beginPath();
        ctx.moveTo(10, 50);
        ctx.quadraticCurveTo(60, 120, 70, 225);
        ctx.lineTo(10, 225);
        ctx.closePath();
        ctx.fill();

        // Chimenea en la casa del árbol
        ctx.fillStyle = '#78350f';
        ctx.fillRect(32, 128, 6, 10);

        // Ventana en el árbol con luz cálida
        ctx.fillStyle = '#1c0d02';
        ctx.beginPath();
        ctx.ellipse(35, 148, 10, 15, 0.1, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#fef08a';
        ctx.beginPath();
        ctx.ellipse(35, 148, 6, 9, 0.1, 0, Math.PI * 2);
        ctx.fill();

        // Farolillo colgando de una rama que se balancea
        const lanternSwing = Math.sin(this.sceneTimer * 0.05) * 4;
        ctx.strokeStyle = '#78350f';
        ctx.lineWidth = 1.2;
        ctx.beginPath();
        ctx.moveTo(65, 100);
        ctx.lineTo(65 + lanternSwing, 118);
        ctx.stroke();
        ctx.fillStyle = '#f59e0b';
        ctx.beginPath();
        ctx.arc(65 + lanternSwing, 121, 4, 0, Math.PI * 2);
        ctx.fill();

        // Copas de hojas del gran árbol que ondean
        const leafWind = Math.sin(this.sceneTimer * 0.04) * 2;
        ctx.fillStyle = '#14532d';
        ctx.beginPath();
        ctx.arc(30 + leafWind, 35, 55, 0, Math.PI * 2);
        ctx.arc(95 - leafWind, 40, 45, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = '#15803d';
        ctx.beginPath();
        ctx.arc(40 + leafWind, 30, 42, 0, Math.PI * 2);
        ctx.arc(90 - leafWind, 35, 35, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = '#4ade80';
        ctx.beginPath();
        ctx.arc(45 + leafWind, 25, 25, 0, Math.PI * 2);
        ctx.arc(85 - leafWind, 28, 20, 0, Math.PI * 2);
        ctx.fill();

        // 5. Árbol Kokiri secundario derecho
        ctx.fillStyle = '#3f2108';
        ctx.beginPath();
        ctx.moveTo(480, 75);
        ctx.quadraticCurveTo(425, 135, 410, 225);
        ctx.lineTo(480, 225);
        ctx.closePath();
        ctx.fill();

        ctx.fillStyle = '#15803d';
        ctx.beginPath();
        ctx.arc(440, 55, 48, 0, Math.PI * 2);
        ctx.fill();

        // 6. 4 Hadas del Bosque Kokiri flotantes (Navi y amigas)
        for (let f = 0; f < 4; f++) {
            const fx = 120 + f * 75 + Math.sin(this.sceneTimer * 0.06 + f * 1.5) * 14;
            const fy = 95 + (f % 2) * 35 + Math.cos(this.sceneTimer * 0.08 + f * 1.8) * 10;
            const fairyColor = (f % 2 === 0) ? '#4ade80' : '#fef08a';

            const fglow = ctx.createRadialGradient(fx, fy, 1, fx, fy, 12);
            fglow.addColorStop(0, '#ffffff');
            fglow.addColorStop(0.4, fairyColor);
            fglow.addColorStop(1, 'rgba(0, 0, 0, 0)');
            ctx.fillStyle = fglow;
            ctx.beginPath();
            ctx.arc(fx, fy, 12, 0, Math.PI * 2);
            ctx.fill();

            const wingFlap = Math.sin(this.sceneTimer * 0.45 + f) * 4;
            ctx.fillStyle = 'rgba(255, 255, 255, 0.75)';
            ctx.beginPath();
            ctx.ellipse(fx - 4, fy - 3, 4, 2 + Math.abs(wingFlap), -0.4, 0, Math.PI * 2);
            ctx.ellipse(fx + 4, fy - 3, 4, 2 + Math.abs(wingFlap), 0.4, 0, Math.PI * 2);
            ctx.fill();

            ctx.fillStyle = '#ffffff';
            ctx.beginPath();
            ctx.arc(fx, fy, 2, 0, Math.PI * 2);
            ctx.fill();
        }

        // 7. Suelo de la Aldea Kokiri
        ctx.fillStyle = '#582f0e';
        ctx.fillRect(0, 210, 480, 60);

        ctx.fillStyle = '#3d1f05';
        for (let dx = 10; dx < 470; dx += 28) {
            ctx.fillRect(dx, 222, 14, 8);
            ctx.fillRect(dx + 12, 236, 12, 6);
        }

        ctx.fillStyle = '#15803d';
        ctx.fillRect(0, 196, 480, 14);

        ctx.fillStyle = '#4ade80';
        ctx.fillRect(0, 194, 480, 3);
        for (let gx = 4; gx < 480; gx += 10) {
            ctx.fillRect(gx, 191, 2, 3);
            ctx.fillRect(gx + 3, 192, 2, 2);
        }

        // Cartel de madera Kokiri
        ctx.fillStyle = '#78350f';
        ctx.fillRect(145, 178, 6, 18);
        ctx.fillStyle = '#b45309';
        ctx.beginPath();
        ctx.roundRect(105, 160, 86, 18, 4);
        ctx.fill();
        ctx.strokeStyle = '#fef08a';
        ctx.lineWidth = 1;
        ctx.stroke();
        ctx.fillStyle = '#ffffff';
        ctx.font = '800 7.5px system-ui, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('🌳 ALDEA KOKIRI 1-1', 148, 172);

        // 8. Nave descendiendo con calor de reentrada
        if (this.shipY > -45) {
            this.drawHeroSpaceship(ctx, this.shipX, this.shipY);
            // Llamaradas de reentrada en la punta de la nave
            if (this.sceneTimer < 80) {
                ctx.fillStyle = 'rgba(251, 146, 60, 0.55)';
                ctx.beginPath();
                ctx.arc(this.shipX + 38, this.shipY, 12, 0, Math.PI * 2);
                ctx.fill();
            }
        }

        // 9. Astro aterrizando heroicamente
        if (this.sceneTimer >= 80) {
            ctx.save();
            ctx.translate(240, this.astroLandY);
            ctx.scale(1 / this.astroSquash, this.astroSquash);
            this.drawAstroLandingHero(ctx, 0, 0, this.sceneTimer);
            ctx.restore();
        }
    },

    // DIBUJAR NAVE ESPACIAL HEROICA DE ASTRO
    drawHeroSpaceship: function(ctx, x, y) {
        ctx.save();
        ctx.translate(x, y);

        // Fuego del reactor propulsor con destello
        const flameLen = 14 + Math.random() * 8;
        const flameGrad = ctx.createLinearGradient(-35, 0, -35 - flameLen, 0);
        flameGrad.addColorStop(0, '#ffffff');
        flameGrad.addColorStop(0.3, '#38bdf8');
        flameGrad.addColorStop(1, 'rgba(2, 132, 199, 0)');
        ctx.fillStyle = flameGrad;
        ctx.beginPath();
        ctx.moveTo(-25, -6);
        ctx.lineTo(-30 - flameLen, 0);
        ctx.lineTo(-25, 6);
        ctx.closePath();
        ctx.fill();

        // Fuselaje blanco de titanio
        const bodyGrad = ctx.createLinearGradient(0, -18, 0, 18);
        bodyGrad.addColorStop(0, '#ffffff');
        bodyGrad.addColorStop(0.6, '#e2e8f0');
        bodyGrad.addColorStop(1, '#94a3b8');
        ctx.fillStyle = bodyGrad;
        ctx.beginPath();
        ctx.moveTo(35, 0);
        ctx.lineTo(8, -14);
        ctx.lineTo(-25, -12);
        ctx.lineTo(-28, 12);
        ctx.lineTo(8, 14);
        ctx.closePath();
        ctx.fill();
        ctx.strokeStyle = '#0284c7';
        ctx.lineWidth = 1.5;
        ctx.stroke();

        // Cabina azul cian
        ctx.fillStyle = '#0284c7';
        ctx.beginPath();
        ctx.ellipse(4, -4, 14, 7, -0.1, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#38bdf8';
        ctx.beginPath();
        ctx.ellipse(5, -5, 10, 4, -0.1, 0, Math.PI * 2);
        ctx.fill();

        // Alerón dorado
        ctx.fillStyle = '#f59e0b';
        ctx.beginPath();
        ctx.moveTo(-15, -12);
        ctx.lineTo(-24, -24);
        ctx.lineTo(-12, -24);
        ctx.lineTo(-8, -12);
        ctx.closePath();
        ctx.fill();

        ctx.restore();
    },

    // DIBUJAR A ASTRO EN PRIMER PLANO HEROICO
    drawAstroHeroCloseUp: function(ctx, x, y) {
        ctx.save();
        ctx.translate(x, y);

        // Reactor jetpack encendido
        const jetGlow = ctx.createRadialGradient(-16, 6, 2, -16, 6, 20);
        jetGlow.addColorStop(0, '#ffffff');
        jetGlow.addColorStop(0.4, '#38bdf8');
        jetGlow.addColorStop(1, 'rgba(0, 0, 0, 0)');
        ctx.fillStyle = jetGlow;
        ctx.beginPath();
        ctx.arc(-16, 6, 20, 0, Math.PI * 2);
        ctx.fill();

        // Torso / Armadura de titanio
        ctx.fillStyle = '#f8fafc';
        ctx.beginPath();
        ctx.roundRect(-14, 0, 28, 34, 6);
        ctx.fill();
        ctx.strokeStyle = '#0284c7';
        ctx.lineWidth = 1.8;
        ctx.stroke();

        // Reactor central
        ctx.fillStyle = '#38bdf8';
        ctx.beginPath();
        ctx.arc(0, 10, 5, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(0, 10, 2.5, 0, Math.PI * 2);
        ctx.fill();

        // Casco esférico
        const helmGrad = ctx.createRadialGradient(-4, -18, 2, 0, -16, 18);
        helmGrad.addColorStop(0, '#ffffff');
        helmGrad.addColorStop(0.5, '#e2e8f0');
        helmGrad.addColorStop(1, '#64748b');
        ctx.fillStyle = helmGrad;
        ctx.beginPath();
        ctx.arc(0, -16, 18, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#0284c7';
        ctx.lineWidth = 1.8;
        ctx.stroke();

        // Visor azul cian
        ctx.fillStyle = '#0369a1';
        ctx.beginPath();
        ctx.ellipse(3, -16, 12, 9, 0, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = '#38bdf8';
        ctx.beginPath();
        ctx.ellipse(4, -17, 9, 6, 0, 0, Math.PI * 2);
        ctx.fill();

        // Destello en el visor
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.ellipse(6, -19, 4, 2, -0.4, 0, Math.PI * 2);
        ctx.fill();

        ctx.restore();
    },

    // DIBUJAR MINI ASTRO DE CUERPO ENTERO
    drawAstroMini: function(ctx, x, y, facing) {
        ctx.save();
        ctx.translate(x, y);
        if (facing === 'left') ctx.scale(-1, 1);

        ctx.fillStyle = 'rgba(0, 0, 0, 0.35)';
        ctx.beginPath();
        ctx.ellipse(0, 18, 10, 4, 0, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = '#0284c7';
        ctx.fillRect(-6, 8, 5, 10);
        ctx.fillRect(2, 8, 5, 10);

        ctx.fillStyle = '#f8fafc';
        ctx.beginPath();
        ctx.roundRect(-8, -4, 16, 14, 3);
        ctx.fill();

        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(0, -10, 9, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#0284c7';
        ctx.lineWidth = 1;
        ctx.stroke();

        ctx.fillStyle = '#38bdf8';
        ctx.beginPath();
        ctx.ellipse(2, -10, 6, 4, 0, 0, Math.PI * 2);
        ctx.fill();

        ctx.restore();
    },

    // DIBUJAR ATERRIZAJE HEROICO Y THUMBS UP 👍 (2026 AAA Animation)
    drawAstroLandingHero: function(ctx, x, y, timer) {
        ctx.save();
        ctx.translate(x, y);

        if (timer < 125) {
            // FASE 1 (Frames 80-124): Impacto 3 Puntos Superheroico
            ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
            ctx.beginPath();
            ctx.ellipse(0, 16, 14, 5, 0, 0, Math.PI * 2);
            ctx.fill();

            // Pierna izquierda en rodilla
            ctx.fillStyle = '#0284c7';
            ctx.fillRect(-8, 8, 8, 8);
            // Pierna derecha plantada
            ctx.fillRect(2, 4, 7, 12);

            // Torso arqueado hacia el suelo
            ctx.fillStyle = '#f8fafc';
            ctx.beginPath();
            ctx.roundRect(-7, -4, 14, 13, 3);
            ctx.fill();
            ctx.strokeStyle = '#0284c7';
            ctx.lineWidth = 1.2;
            ctx.stroke();

            // Puño izquierdo chocando contra la tierra
            ctx.fillStyle = '#38bdf8';
            ctx.beginPath();
            ctx.arc(-8, 14, 3, 0, Math.PI * 2);
            ctx.fill();

            // Casco orientado hacia el impacto
            ctx.fillStyle = '#ffffff';
            ctx.beginPath();
            ctx.arc(0, -9, 8, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillStyle = '#38bdf8';
            ctx.beginPath();
            ctx.ellipse(2, -8, 5, 3.5, 0.1, 0, Math.PI * 2);
            ctx.fill();
        } else {
            // FASE 2 (Frames 125+): Astro de pie erguido, respirando, visor con destello y PULGAR ARRIBA 👍
            const breath = Math.sin(timer * 0.12) * 0.8;

            ctx.fillStyle = 'rgba(0, 0, 0, 0.35)';
            ctx.beginPath();
            ctx.ellipse(0, 18, 12, 4, 0, 0, Math.PI * 2);
            ctx.fill();

            // Piernas
            ctx.fillStyle = '#0284c7';
            ctx.fillRect(-6, 8, 5, 10);
            ctx.fillRect(2, 8, 5, 10);

            // Botas con suela reforzada
            ctx.fillStyle = '#0369a1';
            ctx.fillRect(-7, 16, 6, 3);
            ctx.fillRect(2, 16, 6, 3);

            // Torso con armadura blanca
            ctx.fillStyle = '#f8fafc';
            ctx.beginPath();
            ctx.roundRect(-8, -4 + breath, 16, 13, 3);
            ctx.fill();
            ctx.strokeStyle = '#0284c7';
            ctx.lineWidth = 1.2;
            ctx.stroke();

            // Reactor central del pecho pulsando
            ctx.fillStyle = '#38bdf8';
            ctx.beginPath();
            ctx.arc(0, 1 + breath, 2.5, 0, Math.PI * 2);
            ctx.fill();

            // Casco
            ctx.fillStyle = '#ffffff';
            ctx.beginPath();
            ctx.arc(0, -11 + breath, 9, 0, Math.PI * 2);
            ctx.fill();
            ctx.strokeStyle = '#0284c7';
            ctx.lineWidth = 1.2;
            ctx.stroke();

            // Visor cian brillante
            ctx.fillStyle = '#0284c7';
            ctx.beginPath();
            ctx.ellipse(2, -11 + breath, 6.5, 4.5, 0, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillStyle = '#38bdf8';
            ctx.beginPath();
            ctx.ellipse(3, -11 + breath, 4.5, 3, 0, 0, Math.PI * 2);
            ctx.fill();

            // Destello de estrella en el visor
            const starFlash = (Math.sin(timer * 0.18) > 0.3);
            if (starFlash) {
                ctx.fillStyle = '#ffffff';
                ctx.beginPath();
                ctx.arc(5, -12 + breath, 1.8, 0, Math.PI * 2);
                ctx.fill();
            }

            // Brazo derecho levantado haciendo THUMBS UP 👍
            ctx.strokeStyle = '#0284c7';
            ctx.lineWidth = 3;
            ctx.lineCap = 'round';
            ctx.beginPath();
            ctx.moveTo(7, 0 + breath);
            ctx.lineTo(13, -4 + breath);
            ctx.lineTo(13, -9 + breath);
            ctx.stroke();

            // Mano con pulgar alzado
            ctx.fillStyle = '#ffffff';
            ctx.beginPath();
            ctx.arc(13, -10 + breath, 2.5, 0, Math.PI * 2);
            ctx.fill();
            // Pulgar
            ctx.fillStyle = '#38bdf8';
            ctx.beginPath();
            ctx.roundRect(12, -14 + breath, 2.2, 4.5, 1);
            ctx.fill();
        }
        ctx.restore();
    },

    // BARRAS NEGRAS CINEMATOGRÁFICAS
    renderCinematicBorders: function(ctx) {
        ctx.fillStyle = '#000000';
        ctx.fillRect(0, 0, 480, 20);
        ctx.fillRect(0, 250, 480, 20);
    },

    // CUADRO DE DIÁLOGO RPG CON AVATAR ANIMADO
    renderDialogueBoxWithAvatar: function(ctx) {
        const boxX = 20;
        const boxY = 190;
        const boxW = 440;
        const boxH = 54;

        ctx.fillStyle = 'rgba(15, 23, 42, 0.92)';
        ctx.beginPath();
        ctx.roundRect(boxX, boxY, boxW, boxH, 8);
        ctx.fill();

        ctx.strokeStyle = this.speakerBadgeColor;
        ctx.lineWidth = 1.6;
        ctx.stroke();

        // Marco del Avatar del personaje
        const avX = boxX + 6;
        const avY = boxY + 6;
        const avSize = 42;

        ctx.fillStyle = '#090d16';
        ctx.beginPath();
        ctx.roundRect(avX, avY, avSize, avSize, 6);
        ctx.fill();
        ctx.strokeStyle = this.speakerBadgeColor;
        ctx.lineWidth = 1.2;
        ctx.stroke();

        // Dibujar el rostro animado según el personaje
        this.drawCharacterAvatar(ctx, avX + avSize / 2, avY + avSize / 2, this.currentSpeaker);

        // Nombre y Rol del personaje
        const textX = avX + avSize + 10;
        ctx.font = '900 9.5px system-ui, sans-serif';
        ctx.fillStyle = this.speakerBadgeColor;
        ctx.textAlign = 'left';
        ctx.fillText(this.speakerName, textX, boxY + 14);

        ctx.font = '700 7.5px system-ui, sans-serif';
        ctx.fillStyle = '#94a3b8';
        ctx.fillText(this.speakerRole, textX + ctx.measureText(this.speakerName).width + 8, boxY + 14);

        // Texto del diálogo
        const visibleText = this.currentFullText.substring(0, Math.floor(this.textCharIndex));
        ctx.font = '500 9px system-ui, sans-serif';
        ctx.fillStyle = '#f8fafc';
        this.wrapText(ctx, visibleText, textX, boxY + 27, boxW - avSize - 22, 11);
    },

    // DIBUJAR AVATAR ANIMADO DEL PERSONAJE
    drawCharacterAvatar: function(ctx, cx, cy, speaker) {
        ctx.save();
        if (speaker === 'vortex') {
            ctx.fillStyle = '#0f0b1e';
            ctx.beginPath();
            ctx.roundRect(cx - 15, cy - 15, 30, 30, 4);
            ctx.fill();
            ctx.strokeStyle = '#ef4444';
            ctx.lineWidth = 1;
            ctx.stroke();

            // Cuernos mecánicos
            ctx.fillStyle = '#991b1b';
            ctx.beginPath();
            ctx.moveTo(cx - 12, cy - 14);
            ctx.lineTo(cx - 18, cy - 20);
            ctx.lineTo(cx - 8, cy - 14);
            ctx.fill();
            ctx.beginPath();
            ctx.moveTo(cx + 12, cy - 14);
            ctx.lineTo(cx + 18, cy - 20);
            ctx.lineTo(cx + 8, cy - 14);
            ctx.fill();

            // Ojos rojos parpadeantes
            const eyeGlow = Math.sin(this.sceneTimer * 0.2) * 0.4 + 0.6;
            ctx.fillStyle = `rgba(239, 68, 68, ${eyeGlow})`;
            ctx.beginPath();
            ctx.ellipse(cx - 7, cy - 3, 5, 2.5, -0.2, 0, Math.PI * 2);
            ctx.ellipse(cx + 7, cy - 3, 5, 2.5, 0.2, 0, Math.PI * 2);
            ctx.fill();
        } else if (speaker === 'astro') {
            ctx.fillStyle = '#f8fafc';
            ctx.beginPath();
            ctx.arc(cx, cy, 15, 0, Math.PI * 2);
            ctx.fill();
            ctx.strokeStyle = '#0284c7';
            ctx.lineWidth = 1.2;
            ctx.stroke();

            // Visor cian animado
            ctx.fillStyle = '#0284c7';
            ctx.beginPath();
            ctx.ellipse(cx, cy - 1, 11, 7, 0, 0, Math.PI * 2);
            ctx.fill();

            ctx.fillStyle = '#38bdf8';
            ctx.beginPath();
            ctx.ellipse(cx, cy - 2, 8, 4.5, 0, 0, Math.PI * 2);
            ctx.fill();

            // Reflejo animado
            const rX = Math.sin(this.sceneTimer * 0.08) * 3;
            ctx.fillStyle = '#ffffff';
            ctx.beginPath();
            ctx.ellipse(cx + rX, cy - 3, 3, 1.5, -0.3, 0, Math.PI * 2);
            ctx.fill();
        } else if (speaker === 'navi') {
            const wingFlap = Math.sin(this.sceneTimer * 0.5) * 6;
            ctx.fillStyle = 'rgba(255, 255, 255, 0.85)';
            ctx.beginPath();
            ctx.ellipse(cx - 7, cy - 4, 6, 3 + Math.abs(wingFlap), -0.5, 0, Math.PI * 2);
            ctx.ellipse(cx + 7, cy - 4, 6, 3 + Math.abs(wingFlap), 0.5, 0, Math.PI * 2);
            ctx.fill();

            const fGlow = ctx.createRadialGradient(cx, cy, 1, cx, cy, 12);
            fGlow.addColorStop(0, '#ffffff');
            fGlow.addColorStop(0.45, '#4ade80');
            fGlow.addColorStop(1, 'rgba(74, 222, 128, 0)');
            ctx.fillStyle = fGlow;
            ctx.beginPath();
            ctx.arc(cx, cy, 12, 0, Math.PI * 2);
            ctx.fill();
        } else if (speaker === 'alert') {
            const aPulse = (this.sceneTimer % 16 < 8);
            ctx.fillStyle = aPulse ? '#ef4444' : '#b91c1c';
            ctx.beginPath();
            ctx.moveTo(cx, cy - 14);
            ctx.lineTo(cx + 14, cy + 12);
            ctx.lineTo(cx - 14, cy + 12);
            ctx.closePath();
            ctx.fill();

            ctx.fillStyle = '#ffffff';
            ctx.font = '900 13px system-ui, sans-serif';
            ctx.textAlign = 'center';
            ctx.fillText('!', cx, cy + 8);
        } else {
            ctx.strokeStyle = '#38bdf8';
            ctx.lineWidth = 1.4;
            ctx.beginPath();
            ctx.arc(cx, cy, 12, 0, Math.PI * 2);
            ctx.stroke();

            ctx.strokeStyle = '#fef08a';
            ctx.beginPath();
            ctx.ellipse(cx, cy, 12, 5, this.sceneTimer * 0.08, 0, Math.PI * 2);
            ctx.stroke();

            ctx.fillStyle = '#38bdf8';
            ctx.beginPath();
            ctx.arc(cx, cy, 3, 0, Math.PI * 2);
            ctx.fill();
        }
        ctx.restore();
    },

    wrapText: function(ctx, text, x, y, maxWidth, lineHeight) {
        const words = text.split(' ');
        let line = '';
        let currentY = y;

        for (let n = 0; n < words.length; n++) {
            const testLine = line + words[n] + ' ';
            const metrics = ctx.measureText(testLine);
            const testWidth = metrics.width;
            if (testWidth > maxWidth && n > 0) {
                ctx.fillText(line, x, currentY);
                line = words[n] + ' ';
                currentY += lineHeight;
            } else {
                line = testLine;
            }
        }
        ctx.fillText(line, x, currentY);
    },

    renderSkipHint: function(ctx) {
        ctx.save();
        ctx.fillStyle = 'rgba(15, 23, 42, 0.8)';
        ctx.beginPath();
        ctx.roundRect(355, 6, 115, 18, 9);
        ctx.fill();
        ctx.strokeStyle = '#38bdf8';
        ctx.lineWidth = 1;
        ctx.stroke();

        ctx.font = '800 8px system-ui, sans-serif';
        ctx.fillStyle = '#38bdf8';
        ctx.textAlign = 'center';
        ctx.fillText('SALTAR HISTORIA ▶', 412, 18);

        ctx.font = '600 7.5px system-ui, sans-serif';
        ctx.fillStyle = '#94a3b8';
        ctx.fillText('TOCA O PULSA CUALQUIER TECLA PARA AVANZAR ▶', 240, 258);
        ctx.restore();
    }
};

window.addEventListener('keydown', (e) => {
    if (window.StoryManager && window.StoryManager.active) {
        if (e.key === 'Escape') {
            window.StoryManager.skipStory();
        } else if (e.key === ' ' || e.key === 'Enter' || e.key === 'ArrowRight') {
            window.StoryManager.nextScene();
        }
    }
});

window.addEventListener('pointerdown', (e) => {
    if (window.StoryManager && window.StoryManager.active) {
        if (window.StoryManager.ignoreInputTimer > 0) return;

        const canvas = document.getElementById('gameCanvas');
        if (canvas) {
            const rect = canvas.getBoundingClientRect();
            const clickX = ((e.clientX - rect.left) / rect.width) * 480;
            const clickY = ((e.clientY - rect.top) / rect.height) * 270;
            if (clickX > 340 && clickY < 38) {
                window.StoryManager.skipStory();
                return;
            }
        }
        window.StoryManager.nextScene();
    }
}, { passive: true });
