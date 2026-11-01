// story.js - Prólogo Cinemático Animado: La Leyenda del Cristal Cósmico (2026)
// Cinemática de alta calidad con animaciones avanzadas, voces retro, efectos de sonido y diálogos

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

    // Variables de animación
    stars: [],
    shards: [],
    particles: [],
    lightningArcs: [],
    shockwaveRadius: 0,
    shockwaveAlpha: 0,
    cinemaFlash: 0,
    redAlertPulse: 0,
    vortexAngle: 0,
    crystalAngle: 0,
    shipY: 0,
    shipX: 0,
    shipVx: 0,
    shipVy: 0,
    astroLandY: 0,
    astroSquash: 1,
    fairyFlap: 0,
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
        // Campo estelar profundo con diferentes capas de velocidad y color
        this.stars = [];
        for (let i = 0; i < 85; i++) {
            this.stars.push({
                x: Math.random() * 480,
                y: Math.random() * 270,
                size: Math.random() * 2.4 + 0.5,
                speed: Math.random() * 0.9 + 0.15,
                twinkle: Math.random() * Math.PI * 2,
                color: (i % 6 === 0) ? '#38bdf8' : ((i % 7 === 0) ? '#c084fc' : ((i % 9 === 0) ? '#fef08a' : '#ffffff'))
            });
        }
    },

    startIntroStory: function(callback) {
        this.init();
        this.active = true;
        this.currentScene = 0;
        this.sceneTimer = 0;
        this.ignoreInputTimer = 35; // Protección para que el toque del botón JUGAR no salte la escena
        this.onComplete = callback;
        this.loadScene(0);

        // Ocultar controles táctiles durante la cinemática
        const touch = document.getElementById('touchControls');
        if (touch) touch.style.display = 'none';

        // Detener música previa para dar paso al sonido cinemático
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

            // Generar rayos de distorsión dimensional
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
            
            this.cinemaFlash = 1.0; // Flash blanco cegador
            this.shockwaveRadius = 5;
            this.shockwaveAlpha = 1.0;

            if (window.sounds && window.sounds.playStoryShockwave) {
                window.sounds.playStoryShockwave();
            }
            if (window.sounds && window.sounds.playStoryShatter) {
                window.sounds.playStoryShatter();
            }
            if (typeof triggerScreenShake === 'function') triggerScreenShake(8);

            // Generar los 9 fragmentos de los 9 mundos oficiales
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
                    size: 9
                });
            }
        } else if (sceneIdx === 3) {
            // Escena 3: Astro se prepara para la misión
            this.currentSpeaker = 'astro';
            this.speakerName = 'ASTRO (EL GUARDIÁN)';
            this.speakerRole = '[MISIÓN DE RESCATE CÓSMICO]';
            this.speakerBadgeColor = '#38bdf8';
            this.currentFullText = "«¡No permitiré que destruyan la galaxia! Ajustando reactores y nave estelar... ¡Rumbo fijado hacia la Aldea Kokiri del Bosque para recuperar el primer fragmento!»";
            
            if (window.sounds && window.sounds.playStoryHeroReady) {
                window.sounds.playStoryHeroReady();
            }
            if (window.sounds && window.sounds.playShoot) {
                setTimeout(() => { if (window.sounds) window.sounds.playShoot(); }, 600);
            }
        } else if (sceneIdx === 4) {
            // Escena 4: Entrada y aterrizaje en Aldea Kokiri del Bosque
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
                setTimeout(() => { if (window.sounds) window.sounds.playFairySparkle(); }, 1200);
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
            
            // Cada 2-3 caracteres reproducir el pitido de voz del personaje que habla
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
        this.vortexAngle += 0.05;
        this.redAlertPulse = Math.sin(this.sceneTimer * 0.14) * 0.5 + 0.5;
        this.fairyFlap = Math.sin(this.sceneTimer * 0.45);

        // Atenuación de flash cinematográfico y onda expansiva
        if (this.cinemaFlash > 0) {
            this.cinemaFlash = Math.max(0, this.cinemaFlash - 0.035);
        }
        if (this.shockwaveAlpha > 0) {
            this.shockwaveRadius += 5.5;
            this.shockwaveAlpha = Math.max(0, this.shockwaveAlpha - 0.022);
        }

        // Escena 1: Rayos de distorsión
        if (this.currentScene === 1) {
            if (this.sceneTimer % 6 === 0) {
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
        }

        // Escena 2: Mover los 9 fragmentos
        if (this.currentScene === 2) {
            for (let sh of this.shards) {
                sh.x += sh.vx;
                sh.y += sh.vy;
                sh.angle += 0.08;
                // Dejar estelas brillantes
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

        // Escena 4: Descenso de la nave y aterrizaje heroico de Astro
        if (this.currentScene === 4) {
            if (this.sceneTimer < 80) {
                this.shipY += (105 - this.shipY) * 0.08;
            } else if (this.sceneTimer >= 80 && this.sceneTimer < 140) {
                // Astro salta desde la nave
                if (this.astroLandY < 185) {
                    this.astroLandY += 4.5;
                } else {
                    if (this.astroSquash === 1) {
                        this.astroSquash = 1.45;
                        if (typeof triggerScreenShake === 'function') triggerScreenShake(3.5);
                        if (window.sounds && window.sounds.playSuperheroThud) {
                            window.sounds.playSuperheroThud();
                        }
                        // Anillo de polvo de aterrizaje heroico
                        for (let i = 0; i < 22; i++) {
                            const ang = (i / 22) * Math.PI * 2;
                            this.particles.push({
                                x: 240,
                                y: 196,
                                vx: Math.cos(ang) * (2.0 + Math.random() * 2.5),
                                vy: Math.sin(ang) * 0.8 - 0.6,
                                color: (i % 2 === 0) ? '#4ade80' : '#e2e8f0',
                                life: 22,
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

            // Auto-finalizar la historia y comenzar el juego
            if (this.sceneTimer >= 220) {
                this.finishStory();
            }
        } else {
            // Auto-avanzar al leer si pasa suficiente tiempo (aprox 7 segundos por escena)
            if (this.sceneTimer > 310) {
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

        // 3. Partículas
        for (let p of this.particles) {
            ctx.fillStyle = p.color;
            ctx.beginPath();
            ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
            ctx.fill();
        }

        // 4. Flash blanco cinematográfico de explosión
        if (this.cinemaFlash > 0) {
            ctx.fillStyle = `rgba(255, 255, 255, ${this.cinemaFlash})`;
            ctx.fillRect(0, 0, 480, 270);
        }

        // 5. Barras negras cinematográficas (Cinemascope 2.39:1)
        this.renderCinematicBorders(ctx);

        // 6. Cuadro de diálogo RPG con avatar animado del personaje
        this.renderDialogueBoxWithAvatar(ctx);

        // 7. Botón de saltar cinemática y pista de toque
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
            bgGrad.addColorStop(0, `rgba(90, 10, 30, ${0.45 + this.redAlertPulse * 0.35})`);
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

    // ESCENA 0: EL GRAN CRISTAL SOLAR Y BASE NOVA PRIME
    renderScene0: function(ctx) {
        const cx = 240;
        const cy = 105;

        // Estación Nova Prime en el fondo con ventanales iluminados
        ctx.fillStyle = '#1e293b';
        ctx.strokeStyle = '#38bdf8';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.roundRect(130, 172, 220, 22, 6);
        ctx.fill();
        ctx.stroke();

        // Luces de navegación de la base
        for (let b = 0; b < 6; b++) {
            ctx.fillStyle = (this.sceneTimer % 20 < 10) ? '#38bdf8' : '#0284c7';
            ctx.fillRect(145 + b * 32, 178, 4, 4);
        }

        // Anillos orbitales holográficos de contención de energía
        ctx.save();
        ctx.translate(cx, cy);
        ctx.strokeStyle = 'rgba(56, 189, 248, 0.5)';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.ellipse(0, 0, 88, 28, this.crystalAngle * 0.7, 0, Math.PI * 2);
        ctx.stroke();

        ctx.strokeStyle = 'rgba(251, 191, 36, 0.45)';
        ctx.beginPath();
        ctx.ellipse(0, 0, 78, 24, -this.crystalAngle * 0.9, 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();

        // Gran resplandor aureal del Cristal Solar
        const glow = ctx.createRadialGradient(cx, cy, 5, cx, cy, 70);
        glow.addColorStop(0, 'rgba(254, 240, 138, 0.95)');
        glow.addColorStop(0.35, 'rgba(56, 189, 248, 0.65)');
        glow.addColorStop(1, 'rgba(0, 0, 0, 0)');
        ctx.fillStyle = glow;
        ctx.beginPath();
        ctx.arc(cx, cy, 70, 0, Math.PI * 2);
        ctx.fill();

        // Gran Cristal Octaédrico 3D
        ctx.save();
        ctx.translate(cx, cy);
        ctx.rotate(Math.sin(this.crystalAngle) * 0.16);

        // Faceta izquierda
        ctx.fillStyle = '#fde047';
        ctx.beginPath();
        ctx.moveTo(0, -40);
        ctx.lineTo(-25, 0);
        ctx.lineTo(0, 40);
        ctx.closePath();
        ctx.fill();

        // Faceta derecha
        ctx.fillStyle = '#f59e0b';
        ctx.beginPath();
        ctx.moveTo(0, -40);
        ctx.lineTo(25, 0);
        ctx.lineTo(0, 40);
        ctx.closePath();
        ctx.fill();

        // Núcleo resplandeciente blanco
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.moveTo(0, -40);
        ctx.lineTo(5, 0);
        ctx.lineTo(0, 40);
        ctx.lineTo(-5, 0);
        ctx.closePath();
        ctx.fill();

        ctx.strokeStyle = '#fef08a';
        ctx.lineWidth = 2;
        ctx.stroke();
        ctx.restore();

        // Astro de pie contemplando el cristal a la izquierda
        this.drawAstroMini(ctx, 155, 148, 'right');
    },

    // ESCENA 1: LA INVASIÓN DE DARK VORTEX
    renderScene1: function(ctx) {
        const cx = 240;
        const cy = 95;

        // Vórtice dimensional negro y carmesí giratorio
        ctx.save();
        ctx.translate(cx, cy - 10);
        ctx.rotate(this.vortexAngle);

        for (let i = 0; i < 6; i++) {
            ctx.fillStyle = (i % 2 === 0) ? 'rgba(220, 38, 38, 0.45)' : 'rgba(147, 51, 234, 0.45)';
            ctx.beginPath();
            ctx.ellipse(0, 0, 115, 42, (i * Math.PI) / 3, 0, Math.PI * 2);
            ctx.fill();
        }
        ctx.restore();

        // Centro negro del agujero de gusano
        ctx.fillStyle = '#05000a';
        ctx.beginPath();
        ctx.arc(cx, cy - 10, 34, 0, Math.PI * 2);
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
        ctx.moveTo(0, -32);
        ctx.lineTo(70, 15);
        ctx.lineTo(32, 26);
        ctx.lineTo(0, 18);
        ctx.lineTo(-32, 26);
        ctx.lineTo(-70, 15);
        ctx.closePath();
        ctx.fill();
        ctx.strokeStyle = '#dc2626';
        ctx.lineWidth = 2;
        ctx.stroke();

        // Ojos mecánicos rojos amenazantes del emperador
        ctx.fillStyle = '#ef4444';
        ctx.shadowColor = '#ef4444';
        ctx.shadowBlur = 10;
        ctx.beginPath();
        ctx.ellipse(-14, 0, 7, 3, -0.2, 0, Math.PI * 2);
        ctx.ellipse(14, 0, 7, 3, 0.2, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;
        ctx.restore();

        // Rayo tractor de plasma oscuro
        const tractor = ctx.createLinearGradient(cx, cy - 5, cx, 175);
        tractor.addColorStop(0, 'rgba(239, 68, 68, 0.75)');
        tractor.addColorStop(1, 'rgba(147, 51, 234, 0.2)');
        ctx.fillStyle = tractor;
        ctx.beginPath();
        ctx.moveTo(cx - 15, cy + 10);
        ctx.lineTo(cx + 15, cy + 10);
        ctx.lineTo(cx + 45, 175);
        ctx.lineTo(cx - 45, 175);
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

        // Onda expansiva de impacto
        if (this.shockwaveAlpha > 0) {
            ctx.save();
            ctx.strokeStyle = `rgba(255, 255, 255, ${this.shockwaveAlpha})`;
            ctx.lineWidth = 4;
            ctx.beginPath();
            ctx.arc(cx, cy, this.shockwaveRadius, 0, Math.PI * 2);
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

            // Centro blanco brillante
            ctx.fillStyle = '#ffffff';
            ctx.beginPath();
            ctx.arc(0, 0, sh.size * 0.35, 0, Math.PI * 2);
            ctx.fill();

            ctx.shadowBlur = 0;
            ctx.restore();
        }
    },

    // ESCENA 3: ASTRO DETERMINADO CON SU NAVE
    renderScene3: function(ctx) {
        // Nave de Asalto Estelar a la derecha
        this.drawHeroSpaceship(ctx, 335, 90);

        // Primer plano heroico de Astro a la izquierda
        this.drawAstroHeroCloseUp(ctx, 145, 130);

        // HUD Holográfico táctico
        ctx.save();
        ctx.strokeStyle = 'rgba(56, 189, 248, 0.7)';
        ctx.lineWidth = 1.2;
        ctx.beginPath();
        ctx.roundRect(185, 48, 96, 58, 6);
        ctx.stroke();

        ctx.fillStyle = 'rgba(15, 23, 42, 0.85)';
        ctx.fill();

        ctx.fillStyle = '#38bdf8';
        ctx.font = '800 8px monospace';
        ctx.textAlign = 'left';
        ctx.fillText('MISIÓN: 9 MUNDOS', 193, 62);
        ctx.fillText('DESTINO: ALDEA KOKIRI', 193, 74);
        ctx.fillText('BOSS: MECHA-KOOPA', 193, 86);
        ctx.fillText('ESTADO: EN RUTA ▶', 193, 98);
        ctx.restore();
    },

    // ESCENA 4: ALDEA KOKIRI DEL BOSQUE
    renderScene4: function(ctx) {
        // 1. Siluetas lejanas del bosque Kokiri
        ctx.fillStyle = '#0f4024';
        for (let i = 0; i < 7; i++) {
            const bx = i * 75 - 20;
            ctx.beginPath();
            ctx.arc(bx + 40, 160, 52, 0, Math.PI * 2);
            ctx.fill();
        }

        // 2. Bruma y niebla mística del bosque
        const mist = ctx.createLinearGradient(0, 135, 0, 205);
        mist.addColorStop(0, 'rgba(147, 197, 253, 0.08)');
        mist.addColorStop(0.5, 'rgba(219, 234, 254, 0.28)');
        mist.addColorStop(1, 'rgba(22, 101, 52, 0.45)');
        ctx.fillStyle = mist;
        ctx.fillRect(0, 125, 480, 80);

        // 3. Gran Árbol Kokiri Ancestral
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

        // Ventana en el árbol con luz
        ctx.fillStyle = '#1c0d02';
        ctx.beginPath();
        ctx.ellipse(35, 145, 10, 15, 0.1, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#fef08a';
        ctx.beginPath();
        ctx.ellipse(35, 145, 6, 9, 0.1, 0, Math.PI * 2);
        ctx.fill();

        // Copas de follaje verde del árbol Kokiri
        ctx.fillStyle = '#14532d';
        ctx.beginPath();
        ctx.arc(30, 35, 55, 0, Math.PI * 2);
        ctx.arc(95, 40, 45, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = '#15803d';
        ctx.beginPath();
        ctx.arc(40, 30, 42, 0, Math.PI * 2);
        ctx.arc(90, 35, 35, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = '#4ade80';
        ctx.beginPath();
        ctx.arc(45, 25, 25, 0, Math.PI * 2);
        ctx.arc(85, 28, 20, 0, Math.PI * 2);
        ctx.fill();

        // 4. Árbol Kokiri secundario
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

        // 5. Hadas del Bosque Kokiri flotantes
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

        // 6. Suelo de la Aldea Kokiri (colores Mundo 1)
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

        // Cartel Kokiri
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

        // 7. Nave descendiendo
        if (this.shipY > -45) {
            this.drawHeroSpaceship(ctx, this.shipX, this.shipY);
        }

        // 8. Astro aterrizando heroicamente
        if (this.sceneTimer >= 80) {
            ctx.save();
            ctx.translate(240, this.astroLandY);
            ctx.scale(1 / this.astroSquash, this.astroSquash);
            this.drawAstroMini(ctx, 0, 0, 'right');
            ctx.restore();
        }
    },

    // DIBUJAR NAVE ESPACIAL HEROICA DE ASTRO
    drawHeroSpaceship: function(ctx, x, y) {
        ctx.save();
        ctx.translate(x, y);

        // Fuego del reactor propulsor
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

        // Fondo estilizado glassmorphism
        ctx.fillStyle = 'rgba(15, 23, 42, 0.92)';
        ctx.beginPath();
        ctx.roundRect(boxX, boxY, boxW, boxH, 8);
        ctx.fill();

        ctx.strokeStyle = this.speakerBadgeColor;
        ctx.lineWidth = 1.6;
        ctx.stroke();

        // 1. Marco del Avatar del personaje
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

        // Dibujar el rostro/avatar animado según el personaje
        this.drawCharacterAvatar(ctx, avX + avSize / 2, avY + avSize / 2, this.currentSpeaker);

        // 2. Nombre y Rol del personaje
        const textX = avX + avSize + 10;
        ctx.font = '900 9.5px system-ui, sans-serif';
        ctx.fillStyle = this.speakerBadgeColor;
        ctx.textAlign = 'left';
        ctx.fillText(this.speakerName, textX, boxY + 14);

        ctx.font = '700 7.5px system-ui, sans-serif';
        ctx.fillStyle = '#94a3b8';
        ctx.fillText(this.speakerRole, textX + ctx.measureText(this.speakerName).width + 8, boxY + 14);

        // 3. Texto del diálogo tecleado
        const visibleText = this.currentFullText.substring(0, Math.floor(this.textCharIndex));
        ctx.font = '500 9px system-ui, sans-serif';
        ctx.fillStyle = '#f8fafc';
        this.wrapText(ctx, visibleText, textX, boxY + 27, boxW - avSize - 22, 11);
    },

    // DIBUJAR AVATAR ANIMADO DEL PERSONAJE
    drawCharacterAvatar: function(ctx, cx, cy, speaker) {
        ctx.save();
        if (speaker === 'vortex') {
            // Avatar de Dark Vortex: casco cibernético negro con ojos rojos incandescentes
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

            // Ojos rojos que parpadean malévolamente
            const eyeGlow = Math.sin(this.sceneTimer * 0.2) * 0.4 + 0.6;
            ctx.fillStyle = `rgba(239, 68, 68, ${eyeGlow})`;
            ctx.beginPath();
            ctx.ellipse(cx - 7, cy - 3, 5, 2.5, -0.2, 0, Math.PI * 2);
            ctx.ellipse(cx + 7, cy - 3, 5, 2.5, 0.2, 0, Math.PI * 2);
            ctx.fill();
        } else if (speaker === 'astro') {
            // Avatar de Astro: casco de titanio con visor azul cian animado
            ctx.fillStyle = '#f8fafc';
            ctx.beginPath();
            ctx.arc(cx, cy, 15, 0, Math.PI * 2);
            ctx.fill();
            ctx.strokeStyle = '#0284c7';
            ctx.lineWidth = 1.2;
            ctx.stroke();

            // Visor panorámico cian
            ctx.fillStyle = '#0284c7';
            ctx.beginPath();
            ctx.ellipse(cx, cy - 1, 11, 7, 0, 0, Math.PI * 2);
            ctx.fill();

            ctx.fillStyle = '#38bdf8';
            ctx.beginPath();
            ctx.ellipse(cx, cy - 2, 8, 4.5, 0, 0, Math.PI * 2);
            ctx.fill();

            // Reflejo animado de la luz
            const rX = Math.sin(this.sceneTimer * 0.08) * 3;
            ctx.fillStyle = '#ffffff';
            ctx.beginPath();
            ctx.ellipse(cx + rX, cy - 3, 3, 1.5, -0.3, 0, Math.PI * 2);
            ctx.fill();
        } else if (speaker === 'navi') {
            // Avatar del Hada Navi: esfera de luz verde con alas aleteando
            const wingFlap = Math.sin(this.sceneTimer * 0.5) * 6;
            ctx.fillStyle = 'rgba(255, 255, 255, 0.85)';
            ctx.beginPath();
            ctx.ellipse(cx - 7, cy - 4, 6, 3 + Math.abs(wingFlap), -0.5, 0, Math.PI * 2);
            ctx.ellipse(cx + 7, cy - 4, 6, 3 + Math.abs(wingFlap), 0.5, 0, Math.PI * 2);
            ctx.fill();

            // Núcleo resplandeciente esmeralda
            const fGlow = ctx.createRadialGradient(cx, cy, 1, cx, cy, 12);
            fGlow.addColorStop(0, '#ffffff');
            fGlow.addColorStop(0.45, '#4ade80');
            fGlow.addColorStop(1, 'rgba(74, 222, 128, 0)');
            ctx.fillStyle = fGlow;
            ctx.beginPath();
            ctx.arc(cx, cy, 12, 0, Math.PI * 2);
            ctx.fill();
        } else if (speaker === 'alert') {
            // Icono de Alerta de Emergencia: triángulo parpadeante
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
            // Avatar de la IA Nova Prime: radar atómico giratorio
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
        // Botón elegante "SALTAR HISTORIA ▶"
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

        // Pista de toque inferior
        ctx.font = '600 7.5px system-ui, sans-serif';
        ctx.fillStyle = '#94a3b8';
        ctx.fillText('TOCA O PULSA CUALQUIER TECLA PARA AVANZAR ▶', 240, 258);
        ctx.restore();
    }
};

// Escuchador de clics y toques para avanzar o saltar la historia
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

        // Si hace clic en la esquina superior derecha (botón saltar)
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
