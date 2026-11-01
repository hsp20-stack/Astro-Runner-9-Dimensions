// story.js - Prólogo Cinemático Animado: La Leyenda del Cristal Cósmico (2026)
// Cuenta la historia del robo de las 9 Dimensiones antes de comenzar la partida

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
    redAlertPulse: 0,
    vortexAngle: 0,
    crystalAngle: 0,
    shipY: 0,
    shipX: 0,
    shipVx: 0,
    shipVy: 0,
    astroLandY: 0,
    astroSquash: 1,
    letterboxProgress: 1, // 1 = cine abierto, 0 = barras fuera
    textCharIndex: 0,
    lastCharTime: 0,
    currentFullText: '',
    currentTitle: '',

    init: function() {
        // Crear campo de 70 estrellas estelares con profundidad
        this.stars = [];
        for (let i = 0; i < 75; i++) {
            this.stars.push({
                x: Math.random() * 480,
                y: Math.random() * 270,
                size: Math.random() * 2.2 + 0.6,
                speed: Math.random() * 0.8 + 0.2,
                twinkle: Math.random() * Math.PI * 2,
                color: (i % 5 === 0) ? '#38bdf8' : ((i % 8 === 0) ? '#c084fc' : '#ffffff')
            });
        }
    },

    startIntroStory: function(callback) {
        this.init();
        this.active = true;
        this.currentScene = 0;
        this.sceneTimer = 0;
        this.onComplete = callback;
        this.letterboxProgress = 0;
        this.loadScene(0);

        // Ocultar controles táctiles durante la cinemática
        const touch = document.getElementById('touchControls');
        if (touch) touch.style.display = 'none';

        // Detener música previa para dar paso al ambiente cósmico
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
        this.particles = [];

        if (sceneIdx === 0) {
            // Escena 0: Estación Nova Prime y el Gran Cristal
            this.currentTitle = "AÑO 2026 · BASE ORBITAL NOVA PRIME";
            this.currentFullText = "Durante eones, el Gran Cristal Solar mantuvo la armonía y la vida en las 9 dimensiones. Astro, el guardián cósmico de Hugo SP Studios, protegía el núcleo en paz.";
        } else if (sceneIdx === 1) {
            // Escena 1: La Brecha Dimensional y el Emperador Vórtice
            this.currentTitle = "¡ALERTA MÁXIMA EN EL SECTOR 9!";
            this.currentFullText = "Una brecha dimensional desgarró el hiperespacio. El temible Emperador Vórtice y su armada oscura atacaron: «¡JA, JA, JA! ¡El poder cósmico es ahora mío!»";
            if (window.sounds && window.sounds.playStoryAlarm) {
                window.sounds.playStoryAlarm();
            }
            if (typeof triggerScreenShake === 'function') triggerScreenShake(4.5);
        } else if (sceneIdx === 2) {
            // Escena 2: El Gran Cristal estalla en 9 fragmentos
            this.currentTitle = "¡COLAPSO DEL NÚCLEO PRIMORDIAL!";
            this.currentFullText = "¡El cristal estalló! Sus 9 Fragmentos Sagrados se dispersaron por las 9 dimensiones: desde la Aldea Kokiri del Bosque hasta el Castillo de Magma. ¡Astro debe recuperarlos!";
            if (window.sounds && window.sounds.playStoryShatter) {
                window.sounds.playStoryShatter();
            }
            if (typeof triggerScreenShake === 'function') triggerScreenShake(7);

            // Generar 9 fragmentos de colores de los 9 mundos
            this.shards = [];
            const shardColors = ['#22c55e', '#f59e0b', '#06b6d4', '#a855f7', '#38bdf8', '#64748b', '#818cf8', '#ef4444', '#fbbf24'];
            for (let i = 0; i < 9; i++) {
                const angle = (i / 9) * Math.PI * 2 + (Math.random() * 0.2);
                const spd = 2.4 + Math.random() * 2.8;
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
            this.currentTitle = "LA MISIÓN DE ASTRO";
            this.currentFullText = "Astro ajusta su casco y enciende sus propulsores: «¡No en mi guardia! Viajaré a la Aldea Kokiri del Bosque, derrotaré a Mecha-Koopa Prime y recuperaré los 9 cristales.»";
            if (window.sounds && window.sounds.playStoryHeroReady) {
                window.sounds.playStoryHeroReady();
            }
        } else if (sceneIdx === 4) {
            // Escena 4: Entrada y aterrizaje en Aldea Kokiri del Bosque
            this.currentTitle = "MUNDO 1: ALDEA KOKIRI DEL BOSQUE";
            this.currentFullText = "¡Aterrizaje en el bosque ancestral! Astro desciende sobre la Aldea Kokiri del Bosque, donde se oculta el primer Fragmento Sagrado custodiado por Mecha-Koopa Prime...";
            this.shipY = -50;
            this.shipX = 240;
            this.astroLandY = -20;
            this.astroSquash = 1;
            if (window.sounds && window.sounds.playSpaceshipLaunch) {
                window.sounds.playSpaceshipLaunch();
            }
        }
    },

    update: function(dt) {
        if (!this.active) return;

        this.sceneTimer++;

        // Avance suave del efecto máquina de escribir para los textos
        if (this.textCharIndex < this.currentFullText.length) {
            this.textCharIndex += 0.85;
        }

        // Animación de estrellas
        for (let s of this.stars) {
            s.x -= s.speed;
            if (s.x < 0) s.x = 480;
            s.twinkle += 0.05;
        }

        // Animación de rotación cósmica
        this.crystalAngle += 0.035;
        this.vortexAngle += 0.045;
        this.redAlertPulse = Math.sin(this.sceneTimer * 0.12) * 0.5 + 0.5;

        // Escena 2: Mover fragmentos
        if (this.currentScene === 2) {
            for (let sh of this.shards) {
                sh.x += sh.vx;
                sh.y += sh.vy;
                sh.angle += 0.08;
                // Dejar estela de partículas
                if (this.sceneTimer % 2 === 0) {
                    this.particles.push({
                        x: sh.x,
                        y: sh.y,
                        vx: (Math.random() - 0.5) * 0.5,
                        vy: (Math.random() - 0.5) * 0.5,
                        color: sh.color,
                        life: 14,
                        size: 2.5
                    });
                }
            }
        }

        // Escena 4: Nave descendiendo y Astro aterrizando
        if (this.currentScene === 4) {
            if (this.sceneTimer < 80) {
                this.shipY += (105 - this.shipY) * 0.08;
            } else if (this.sceneTimer >= 80 && this.sceneTimer < 140) {
                // Astro salta desde la nave
                if (this.astroLandY < 185) {
                    this.astroLandY += 4.2;
                } else {
                    if (this.astroSquash === 1) {
                        this.astroSquash = 1.4;
                        if (typeof triggerScreenShake === 'function') triggerScreenShake(2.5);
                        if (window.sounds && window.sounds.playStomp) window.sounds.playStomp();
                        // Polvo de aterrizaje
                        for (let i = 0; i < 16; i++) {
                            this.particles.push({
                                x: 240,
                                y: 195,
                                vx: (Math.random() - 0.5) * 3,
                                vy: -Math.random() * 2,
                                color: '#e2e8f0',
                                life: 20,
                                size: 3.5
                            });
                        }
                    }
                }
                this.astroSquash += (1.0 - this.astroSquash) * 0.12;
            } else if (this.sceneTimer >= 140) {
                // Nave despega al fondo
                this.shipY -= 5.5;
                this.shipX += 3.2;
            }

            // Auto-finalizar la historia y comenzar el juego
            if (this.sceneTimer >= 195) {
                this.finishStory();
            }
        } else {
            // Auto-avanzar al leer si pasa suficiente tiempo (aprox 7 segundos por escena)
            if (this.sceneTimer > 280) {
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

        // 1. Fondo espacial profundo con nebulosa
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

        // 4. Barras cinematográficas (Cinemascope 2.39:1)
        this.renderCinematicBorders(ctx);

        // 5. Cuadro de diálogo y subtítulo retro
        this.renderSubtitleBox(ctx);

        // 6. Botón de saltar cinemática y toque para avanzar
        this.renderSkipHint(ctx);

        ctx.restore();
    },

    renderSpaceBackground: function(ctx) {
        // Fondo base espacial
        const bgGrad = ctx.createRadialGradient(240, 110, 10, 240, 135, 270);
        if (this.currentScene === 1) {
            // Tono de alarma carmesí en invasión
            bgGrad.addColorStop(0, `rgba(88, 12, 34, ${0.4 + this.redAlertPulse * 0.35})`);
            bgGrad.addColorStop(0.6, '#0f051d');
            bgGrad.addColorStop(1, '#020005');
        } else if (this.currentScene === 4) {
            // Cielo de la Aldea Kokiri del Bosque (Mundo 1)
            const forestSky = ctx.createLinearGradient(0, 0, 0, 270);
            forestSky.addColorStop(0, '#1e3a8a');
            forestSky.addColorStop(0.55, '#3b82f6');
            forestSky.addColorStop(1, '#93c5fd');
            ctx.fillStyle = forestSky;
            ctx.fillRect(0, 0, 480, 270);
            return;
        } else {
            // Espacio cósmico violeta/azul
            bgGrad.addColorStop(0, '#1e1145');
            bgGrad.addColorStop(0.5, '#09071c');
            bgGrad.addColorStop(1, '#02020a');
        }
        ctx.fillStyle = bgGrad;
        ctx.fillRect(0, 0, 480, 270);

        // Estrellas titilantes
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

        // Estructura de la Estación Nova Prime en el fondo
        ctx.fillStyle = '#1e293b';
        ctx.strokeStyle = '#38bdf8';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.roundRect(140, 175, 200, 20, 6);
        ctx.fill();
        ctx.stroke();

        // Anillos orbitales giratorios de contención de energía
        ctx.save();
        ctx.translate(cx, cy);
        ctx.strokeStyle = 'rgba(56, 189, 248, 0.4)';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.ellipse(0, 0, 85, 28, this.crystalAngle * 0.7, 0, Math.PI * 2);
        ctx.stroke();

        ctx.strokeStyle = 'rgba(251, 191, 36, 0.4)';
        ctx.beginPath();
        ctx.ellipse(0, 0, 75, 24, -this.crystalAngle * 0.9, 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();

        // Resplandor del Gran Cristal Cósmico
        const glow = ctx.createRadialGradient(cx, cy, 5, cx, cy, 65);
        glow.addColorStop(0, 'rgba(254, 240, 138, 0.95)');
        glow.addColorStop(0.3, 'rgba(56, 189, 248, 0.65)');
        glow.addColorStop(1, 'rgba(0, 0, 0, 0)');
        ctx.fillStyle = glow;
        ctx.beginPath();
        ctx.arc(cx, cy, 65, 0, Math.PI * 2);
        ctx.fill();

        // Gran Cristal Octaédrico 3D giratorio
        ctx.save();
        ctx.translate(cx, cy);
        ctx.rotate(Math.sin(this.crystalAngle) * 0.15);

        // Faceta izquierda
        ctx.fillStyle = '#fde047';
        ctx.beginPath();
        ctx.moveTo(0, -38);
        ctx.lineTo(-24, 0);
        ctx.lineTo(0, 38);
        ctx.closePath();
        ctx.fill();

        // Faceta derecha
        ctx.fillStyle = '#f59e0b';
        ctx.beginPath();
        ctx.moveTo(0, -38);
        ctx.lineTo(24, 0);
        ctx.lineTo(0, 38);
        ctx.closePath();
        ctx.fill();

        // Línea central resplandeciente
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.moveTo(0, -38);
        ctx.lineTo(4, 0);
        ctx.lineTo(0, 38);
        ctx.lineTo(-4, 0);
        ctx.closePath();
        ctx.fill();

        ctx.strokeStyle = '#fef08a';
        ctx.lineWidth = 2;
        ctx.stroke();
        ctx.restore();

        // Astro de pie contemplando el cristal a la izquierda
        this.drawAstroMini(ctx, 160, 150, 'right');
    },

    // ESCENA 1: LA BRECHA Y EL EMPERADOR VÓRTICE
    renderScene1: function(ctx) {
        const cx = 240;
        const cy = 100;

        // Vórtice dimensional negro y carmesí giratorio
        ctx.save();
        ctx.translate(cx, cy - 10);
        ctx.rotate(this.vortexAngle);

        for (let i = 0; i < 6; i++) {
            ctx.fillStyle = (i % 2 === 0) ? 'rgba(220, 38, 38, 0.45)' : 'rgba(147, 51, 234, 0.45)';
            ctx.beginPath();
            ctx.ellipse(0, 0, 110, 40, (i * Math.PI) / 3, 0, Math.PI * 2);
            ctx.fill();
        }
        ctx.restore();

        // Núcleo negro del agujero de gusano
        ctx.fillStyle = '#05000a';
        ctx.beginPath();
        ctx.arc(cx, cy - 10, 32, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#ef4444';
        ctx.lineWidth = 2.5;
        ctx.stroke();

        // Colosal Nave Acorazada de Dark Vortex emergiendo
        ctx.save();
        ctx.translate(cx, cy - 15);

        // Alas angulares de la nave nodriza
        ctx.fillStyle = '#1e1b4b';
        ctx.beginPath();
        ctx.moveTo(0, -30);
        ctx.lineTo(65, 15);
        ctx.lineTo(30, 25);
        ctx.lineTo(0, 18);
        ctx.lineTo(-30, 25);
        ctx.lineTo(-65, 15);
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

        // Rayo tractor de plasma oscuro descendiendo
        const tractor = ctx.createLinearGradient(cx, cy - 5, cx, 180);
        tractor.addColorStop(0, 'rgba(239, 68, 68, 0.7)');
        tractor.addColorStop(1, 'rgba(147, 51, 234, 0.2)');
        ctx.fillStyle = tractor;
        ctx.beginPath();
        ctx.moveTo(cx - 15, cy + 10);
        ctx.lineTo(cx + 15, cy + 10);
        ctx.lineTo(cx + 45, 175);
        ctx.lineTo(cx - 45, 175);
        ctx.closePath();
        ctx.fill();

        // Luces rojas de alarma en los bordes
        ctx.fillStyle = `rgba(239, 68, 68, ${this.redAlertPulse * 0.28})`;
        ctx.fillRect(0, 0, 480, 270);
    },

    // ESCENA 2: LA DISPERSIÓN DE LOS 9 FRAGMENTOS
    renderScene2: function(ctx) {
        const cx = 240;
        const cy = 110;

        // Gran estallido central de luz blanca
        const blast = ctx.createRadialGradient(cx, cy, 2, cx, cy, 90);
        blast.addColorStop(0, 'rgba(255, 255, 255, 0.95)');
        blast.addColorStop(0.3, 'rgba(254, 240, 138, 0.7)');
        blast.addColorStop(1, 'rgba(0, 0, 0, 0)');
        ctx.fillStyle = blast;
        ctx.beginPath();
        ctx.arc(cx, cy, 90, 0, Math.PI * 2);
        ctx.fill();

        // Dibujar los 9 fragmentos volando hacia los mundos
        for (let sh of this.shards) {
            ctx.save();
            ctx.translate(sh.x, sh.y);
            ctx.rotate(sh.angle);

            // Halo del fragmento
            ctx.fillStyle = sh.color;
            ctx.shadowColor = sh.color;
            ctx.shadowBlur = 8;
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
        const cx = 240;
        const cy = 100;

        // Dibujar la Nave de Asalto Estelar de Astro a la derecha
        this.drawHeroSpaceship(ctx, 330, 95);

        // Primer plano de Astro en actitud heroica a la izquierda
        this.drawAstroHeroCloseUp(ctx, 150, 135);

        // HUD Holográfico táctico proyectado frente a Astro
        ctx.save();
        ctx.strokeStyle = 'rgba(56, 189, 248, 0.65)';
        ctx.lineWidth = 1.2;
        ctx.beginPath();
        ctx.roundRect(190, 52, 90, 56, 6);
        ctx.stroke();

        ctx.fillStyle = 'rgba(15, 23, 42, 0.82)';
        ctx.fill();

        ctx.fillStyle = '#38bdf8';
        ctx.font = '800 8px monospace';
        ctx.textAlign = 'left';
        ctx.fillText('MISIÓN: 9 MUNDOS', 198, 66);
        ctx.fillText('DESTINO: ALDEA KOKIRI', 198, 78);
        ctx.fillText('BOSS: MECHA-KOOPA', 198, 90);
        ctx.fillText('ESTADO: EN RUTA', 198, 102);
        ctx.restore();
    },

    // ESCENA 4: ALDEA KOKIRI DEL BOSQUE (MUNDO 1)
    renderScene4: function(ctx) {
        // 1. Capa lejana de copas de árboles gigantes y bruma del bosque Kokiri
        ctx.fillStyle = '#0f4024';
        for (let i = 0; i < 7; i++) {
            const bx = i * 75 - 20;
            ctx.beginPath();
            ctx.arc(bx + 40, 160, 50, 0, Math.PI * 2);
            ctx.fill();
        }

        // 2. Bruma y niebla mística del bosque ancestral
        const mist = ctx.createLinearGradient(0, 135, 0, 205);
        mist.addColorStop(0, 'rgba(147, 197, 253, 0.08)');
        mist.addColorStop(0.5, 'rgba(219, 234, 254, 0.28)');
        mist.addColorStop(1, 'rgba(22, 101, 52, 0.45)');
        ctx.fillStyle = mist;
        ctx.fillRect(0, 125, 480, 80);

        // 3. Gran Árbol Kokiri Ancestral en el lateral izquierdo
        // Tronco colosal de madera antigua con corteza y nudos
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

        // Ventana / Hueco Kokiri en el árbol
        ctx.fillStyle = '#1c0d02';
        ctx.beginPath();
        ctx.ellipse(35, 145, 10, 15, 0.1, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#fef08a';
        ctx.beginPath();
        ctx.ellipse(35, 145, 6, 9, 0.1, 0, Math.PI * 2);
        ctx.fill();

        // Enredaderas y ramas que cruzan
        ctx.strokeStyle = '#15803d';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(45, 95);
        ctx.quadraticCurveTo(110, 105, 140, 80);
        ctx.stroke();

        // Follaje del Gran Árbol Kokiri arriba
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

        // 4. Árbol Kokiri secundario a la derecha
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
        ctx.fillStyle = '#4ade80';
        ctx.beginPath();
        ctx.arc(435, 45, 26, 0, Math.PI * 2);
        ctx.fill();

        // 5. Hadas del Bosque Kokiri flotantes (Navi-style)
        for (let f = 0; f < 4; f++) {
            const fx = 120 + f * 75 + Math.sin(this.sceneTimer * 0.06 + f * 1.5) * 14;
            const fy = 95 + (f % 2) * 35 + Math.cos(this.sceneTimer * 0.08 + f * 1.8) * 10;
            const fairyColor = (f % 2 === 0) ? '#4ade80' : '#fef08a';

            // Resplandor del hada
            const fglow = ctx.createRadialGradient(fx, fy, 1, fx, fy, 12);
            fglow.addColorStop(0, '#ffffff');
            fglow.addColorStop(0.4, fairyColor);
            fglow.addColorStop(1, 'rgba(0, 0, 0, 0)');
            ctx.fillStyle = fglow;
            ctx.beginPath();
            ctx.arc(fx, fy, 12, 0, Math.PI * 2);
            ctx.fill();

            // Alitas transparentes del hada batiendo rápido
            const wingFlap = Math.sin(this.sceneTimer * 0.4 + f) * 4;
            ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
            ctx.beginPath();
            ctx.ellipse(fx - 4, fy - 3, 4, 2 + Math.abs(wingFlap), -0.4, 0, Math.PI * 2);
            ctx.ellipse(fx + 4, fy - 3, 4, 2 + Math.abs(wingFlap), 0.4, 0, Math.PI * 2);
            ctx.fill();

            // Núcleo del hada
            ctx.fillStyle = '#ffffff';
            ctx.beginPath();
            ctx.arc(fx, fy, 2, 0, Math.PI * 2);
            ctx.fill();
        }

        // 6. Suelo de la Aldea Kokiri (colores de Mundo 1: #15803d, #4ade80, #582f0e, #3d1f05)
        // Capa de tierra base
        ctx.fillStyle = '#582f0e';
        ctx.fillRect(0, 210, 480, 60);

        // Patrón de tierra
        ctx.fillStyle = '#3d1f05';
        for (let dx = 10; dx < 470; dx += 28) {
            ctx.fillRect(dx, 222, 14, 8);
            ctx.fillRect(dx + 12, 236, 12, 6);
        }

        // Capa de césped verde frondoso
        ctx.fillStyle = '#15803d';
        ctx.fillRect(0, 196, 480, 14);

        // Borde superior de césped iluminado
        ctx.fillStyle = '#4ade80';
        ctx.fillRect(0, 194, 480, 3);
        for (let gx = 4; gx < 480; gx += 10) {
            ctx.fillRect(gx, 191, 2, 3);
            ctx.fillRect(gx + 3, 192, 2, 2);
        }

        // Cartel de madera Kokiri: "ALDEA KOKIRI · 1-1"
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

        // 7. Nave de Astro descendiendo en el centro
        if (this.shipY > -40) {
            this.drawHeroSpaceship(ctx, this.shipX, this.shipY);
        }

        // 8. Astro saltando y aterrizando en el césped de la Aldea Kokiri
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

        // Cúpula / Cabina de cristal azul cian
        ctx.fillStyle = '#0284c7';
        ctx.beginPath();
        ctx.ellipse(4, -4, 14, 7, -0.1, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#38bdf8';
        ctx.beginPath();
        ctx.ellipse(5, -5, 10, 4, -0.1, 0, Math.PI * 2);
        ctx.fill();

        // Alerón trasero dorado
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

        // Reactor jetpack encendido en la espalda
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

        // Reactor central de pecho
        ctx.fillStyle = '#38bdf8';
        ctx.beginPath();
        ctx.arc(0, 10, 5, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(0, 10, 2.5, 0, Math.PI * 2);
        ctx.fill();

        // Casco esférico reluciente
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

        // Visor panorámico de cristal cian con reflejo de galaxia
        ctx.fillStyle = '#0369a1';
        ctx.beginPath();
        ctx.ellipse(3, -16, 12, 9, 0, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = '#38bdf8';
        ctx.beginPath();
        ctx.ellipse(4, -17, 9, 6, 0, 0, Math.PI * 2);
        ctx.fill();

        // Destello de determinación en el visor
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

        // Sombra
        ctx.fillStyle = 'rgba(0, 0, 0, 0.35)';
        ctx.beginPath();
        ctx.ellipse(0, 18, 10, 4, 0, 0, Math.PI * 2);
        ctx.fill();

        // Piernas
        ctx.fillStyle = '#0284c7';
        ctx.fillRect(-6, 8, 5, 10);
        ctx.fillRect(2, 8, 5, 10);

        // Torso
        ctx.fillStyle = '#f8fafc';
        ctx.beginPath();
        ctx.roundRect(-8, -4, 16, 14, 3);
        ctx.fill();

        // Casco
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(0, -10, 9, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#0284c7';
        ctx.lineWidth = 1;
        ctx.stroke();

        // Visor
        ctx.fillStyle = '#38bdf8';
        ctx.beginPath();
        ctx.ellipse(2, -10, 6, 4, 0, 0, Math.PI * 2);
        ctx.fill();

        ctx.restore();
    },

    // BARRAS NEGRAS CINEMATOGRÁFICAS
    renderCinematicBorders: function(ctx) {
        ctx.fillStyle = '#000000';
        ctx.fillRect(0, 0, 480, 22);
        ctx.fillRect(0, 248, 480, 22);
    },

    // CAJA DE SUBTÍTULOS RETRO-FUTURISTA
    renderSubtitleBox: function(ctx) {
        const boxX = 24;
        const boxY = 192;
        const boxW = 432;
        const boxH = 50;

        // Fondo translúcido con efecto glassmorphism
        ctx.fillStyle = 'rgba(15, 23, 42, 0.88)';
        ctx.beginPath();
        ctx.roundRect(boxX, boxY, boxW, boxH, 8);
        ctx.fill();

        ctx.strokeStyle = '#38bdf8';
        ctx.lineWidth = 1.5;
        ctx.stroke();

        // Título de la escena
        ctx.font = '900 10px system-ui, sans-serif';
        ctx.fillStyle = '#fde047';
        ctx.textAlign = 'left';
        ctx.fillText(this.currentTitle, boxX + 12, boxY + 14);

        // Texto animado con efecto máquina de escribir
        const visibleText = this.currentFullText.substring(0, Math.floor(this.textCharIndex));
        ctx.font = '500 9.5px system-ui, sans-serif';
        ctx.fillStyle = '#f8fafc';

        // Dividir en 2 líneas si es largo
        this.wrapText(ctx, visibleText, boxX + 12, boxY + 28, boxW - 24, 12);
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
        } else {
            window.StoryManager.nextScene();
        }
    }
});

window.addEventListener('pointerdown', (e) => {
    if (window.StoryManager && window.StoryManager.active) {
        // Si hace clic en la esquina superior derecha (botón saltar)
        const canvas = document.getElementById('gameCanvas');
        if (canvas) {
            const rect = canvas.getBoundingClientRect();
            const clickX = ((e.clientX - rect.left) / rect.width) * 480;
            const clickY = ((e.clientY - rect.top) / rect.height) * 270;
            if (clickX > 340 && clickY < 32) {
                window.StoryManager.skipStory();
                return;
            }
        }
        window.StoryManager.nextScene();
    }
}, { passive: true });
