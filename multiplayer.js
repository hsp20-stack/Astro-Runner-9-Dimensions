// multiplayer.js - Motor Online Multijugador P2P WebRTC para Astro Runner (2026)
// Permite jugar en cooperativo en tiempo real a distancia desde cualquier parte del mundo sin servidor backend

window.OnlineManager = {
    isOnline: false,
    isHost: false,
    roomCode: '',
    peer: null,
    conn: null,
    connectionStatus: 'disconnected', // 'disconnected', 'connecting', 'connected'
    
    // Estado del jugador remoto
    remotePlayer: {
        active: false,
        x: 0,
        y: 0,
        vx: 0,
        vy: 0,
        w: 24,
        h: 28,
        facing: 'right',
        state: 'normal',
        isGrounded: true,
        isDying: false,
        invulnerableTimer: 0,
        squash: 1,
        stretch: 1,
        name: 'Jugador 2',
        colorSuit: '#dc2626',      // Traje rojo carmesí de Nova (Jugador 2)
        colorArmor: '#991b1b',
        colorVisor: '#f59e0b',     // Visor dorado ámbar
        colorReactor: '#fbbf24',
        currentEmote: null,
        emoteTimer: 0
    },

    localEmote: null,
    localEmoteTimer: 0,
    lastSendTime: 0,

    init: function() {
        // Comprobar si se entra mediante enlace directo con ?room=XXXX
        try {
            const urlParams = new URLSearchParams(window.location.search);
            const autoRoom = urlParams.get('room');
            if (autoRoom) {
                setTimeout(() => {
                    this.openJoinModalWithCode(autoRoom.toUpperCase());
                }, 400);
            }
        } catch (e) {
            console.log("OnlineManager init note:", e);
        }
    },

    openJoinModalWithCode: function(code) {
        if (typeof openOnlineModal === 'function') openOnlineModal();
        if (typeof switchOnlineTab === 'function') switchOnlineTab('join');
        const input = document.getElementById('inputRoomCode');
        if (input) input.value = code;
        this.updateStatusUI('waiting', '¡Invitación recibida! Pulsa "CONECTAR" para unirte a tu amigo.');
    },

    // 1. CREAR SALA (HOST / ANFITRIÓN)
    createRoom: function() {
        if (typeof Peer === 'undefined') {
            this.updateStatusUI('error', 'Cargando motor de conexión... Comprueba tu conexión a internet.');
            return;
        }

        this.isHost = true;
        // Generar un código de 4 caracteres alfanuméricos fácil de recordar y dictar
        const chars = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';
        let code = '';
        for (let i = 0; i < 4; i++) {
            code += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        this.roomCode = code;

        const peerId = 'astro-sp-' + this.roomCode.toLowerCase();
        this.updateStatusUI('connecting', 'Creando sala privada en la nube...');

        if (this.peer) {
            try { this.peer.destroy(); } catch (e) {}
        }

        try {
            this.peer = new Peer(peerId, {
                debug: 1,
                config: {
                    iceServers: [
                        { urls: 'stun:stun.l.google.com:19302' },
                        { urls: 'stun:stun1.l.google.com:19302' },
                        { urls: 'stun:stun2.l.google.com:19302' }
                    ]
                }
            });

            this.peer.on('open', (id) => {
                this.updateStatusUI('waiting', '¡Sala lista! Comparte el código con tu amigo o familiar.');
                this.displayRoomCodeUI(this.roomCode);
            });

            this.peer.on('connection', (connection) => {
                this.setupConnection(connection);
            });

            this.peer.on('error', (err) => {
                console.error('Peer error:', err);
                if (err.type === 'unavailable-id') {
                    // Si el ID casualmente existe, reintentar con otro código
                    this.createRoom();
                } else {
                    this.updateStatusUI('error', 'Error al conectar: ' + (err.message || 'Inténtalo de nuevo'));
                }
            });
        } catch (err) {
            this.updateStatusUI('error', 'No se pudo iniciar el modo online: ' + err.message);
        }
    },

    // 2. UNIRSE A UNA SALA EXISTENTE (CLIENT / GUEST)
    joinRoom: function(code) {
        if (!code || code.trim().length === 0) {
            this.updateStatusUI('error', 'Por favor, escribe el código de la sala.');
            return;
        }

        if (typeof Peer === 'undefined') {
            this.updateStatusUI('error', 'Cargando motor de conexión... Espera un segundo.');
            return;
        }

        this.isHost = false;
        this.roomCode = code.trim().toUpperCase();
        const targetPeerId = 'astro-sp-' + this.roomCode.toLowerCase();

        this.updateStatusUI('connecting', 'Buscando sala ' + this.roomCode + '...');

        if (this.peer) {
            try { this.peer.destroy(); } catch (e) {}
        }

        try {
            this.peer = new Peer({
                debug: 1,
                config: {
                    iceServers: [
                        { urls: 'stun:stun.l.google.com:19302' },
                        { urls: 'stun:stun1.l.google.com:19302' },
                        { urls: 'stun:stun2.l.google.com:19302' }
                    ]
                }
            });

            this.peer.on('open', (id) => {
                const connection = this.peer.connect(targetPeerId, {
                    reliable: false // Ultra baja latencia para 60 FPS
                });
                this.setupConnection(connection);
            });

            this.peer.on('error', (err) => {
                console.error('Join error:', err);
                this.updateStatusUI('error', 'No se encontró la sala ' + this.roomCode + '. Comprueba el código.');
            });
        } catch (err) {
            this.updateStatusUI('error', 'Error de red: ' + err.message);
        }
    },

    // 3. CONFIGURAR CANAL WEBRTC DATACHANNEL
    setupConnection: function(connection) {
        this.conn = connection;

        this.conn.on('open', () => {
            this.isOnline = true;
            this.connectionStatus = 'connected';
            this.remotePlayer.active = true;
            this.remotePlayer.name = this.isHost ? 'Jugador 2 (Amigo)' : 'Jugador 1 (Anfitrión)';
            
            // Si soy invitado, mi traje es el de Nova (Rojo Carmesí y Oro)
            // Si soy anfitrión, mi traje es el de Astro clásico (Blanco y Azul)
            if (this.isHost) {
                this.remotePlayer.colorSuit = '#ef4444';
                this.remotePlayer.colorArmor = '#991b1b';
                this.remotePlayer.colorVisor = '#f59e0b';
            } else {
                this.remotePlayer.colorSuit = '#f8fafc';
                this.remotePlayer.colorArmor = '#0284c7';
                this.remotePlayer.colorVisor = '#0ea5e9';
            }

            this.updateStatusUI('connected', '🟢 ¡Conectado con éxito! Iniciando partida cooperativa...');
            
            // Mostrar notificación flotante
            if (typeof addFloatingText === 'function') {
                addFloatingText('¡AMIGO CONECTADO!', 240, 100, '#4ade80');
            }

            // Iniciar o sincronizar juego tras breve retardo para cerrar modal
            setTimeout(() => {
                const modal = document.getElementById('modalOnline');
                if (modal) modal.classList.add('hidden');
                
                // Mostrar pastilla HUD online
                const onlineHud = document.getElementById('onlineHudPill');
                if (onlineHud) onlineHud.classList.remove('hidden');

                const emoteBar = document.getElementById('quickEmoteBar');
                if (emoteBar) emoteBar.classList.remove('hidden');

                if (this.isHost) {
                    if (typeof startGameDirectly === 'function') {
                        startGameDirectly();
                    }
                    // Enviar nivel actual al invitado
                    this.sendLevelSync(currentWorldNum, currentLevelNum);
                }
            }, 900);
        });

        this.conn.on('data', (data) => {
            this.handleIncomingData(data);
        });

        this.conn.on('close', () => {
            this.isOnline = false;
            this.connectionStatus = 'disconnected';
            this.remotePlayer.active = false;
            if (typeof addFloatingText === 'function') {
                addFloatingText('Amigo desconectado', 240, 100, '#f87171');
            }
            const onlineHud = document.getElementById('onlineHudPill');
            if (onlineHud) onlineHud.classList.add('hidden');
        });
    },

    // 4. ENVÍO DE DATOS EN TIEMPO REAL (60 FPS THROTTLED)
    sendLocalState: function() {
        if (!this.isOnline || !this.conn || !this.conn.open || typeof astro === 'undefined') return;

        const now = Date.now();
        // Enviar a 30-40 Hz para ahorrar ancho de banda y asegurar fluidez
        if (now - this.lastSendTime < 25) return;
        this.lastSendTime = now;

        const payload = {
            t: 'state',
            x: Math.round(astro.x),
            y: Math.round(astro.y),
            vx: Math.round(astro.vx * 10) / 10,
            vy: Math.round(astro.vy * 10) / 10,
            f: astro.facing,
            s: astro.state,
            g: astro.isGrounded,
            d: astro.isDying,
            inv: astro.invulnerableTimer
        };

        try {
            this.conn.send(payload);
        } catch (e) {}
    },

    sendPlasmaShot: function(x, y, vx) {
        if (!this.isOnline || !this.conn || !this.conn.open) return;
        try {
            this.conn.send({
                t: 'shot',
                x: Math.round(x),
                y: Math.round(y),
                vx: vx
            });
        } catch (e) {}
    },

    sendEnemyDefeat: function(index) {
        if (!this.isOnline || !this.conn || !this.conn.open) return;
        try {
            this.conn.send({
                t: 'enemy_dead',
                idx: index
            });
        } catch (e) {}
    },

    sendEmote: function(emoji) {
        this.localEmote = emoji;
        this.localEmoteTimer = 110;
        if (!this.isOnline || !this.conn || !this.conn.open) return;
        try {
            this.conn.send({
                t: 'emote',
                emoji: emoji
            });
        } catch (e) {}
    },

    sendLevelSync: function(world, level) {
        if (!this.isOnline || !this.conn || !this.conn.open) return;
        try {
            this.conn.send({
                t: 'level',
                w: world,
                l: level
            });
        } catch (e) {}
    },

    // 5. RECEPCIÓN Y APLICACIÓN DE DATOS REMOTOS
    handleIncomingData: function(data) {
        if (!data || !data.t) return;

        if (data.t === 'state') {
            // Suavizado e interpolación de la posición del compañero
            this.remotePlayer.targetX = data.x;
            this.remotePlayer.targetY = data.y;
            this.remotePlayer.vx = data.vx;
            this.remotePlayer.vy = data.vy;
            this.remotePlayer.facing = data.f;
            this.remotePlayer.state = data.s;
            this.remotePlayer.isGrounded = data.g;
            this.remotePlayer.isDying = data.d;
            this.remotePlayer.invulnerableTimer = data.inv;

            // Si es la primera recepción o salto grande, posicionar directo
            if (Math.abs(this.remotePlayer.x - data.x) > 100) {
                this.remotePlayer.x = data.x;
                this.remotePlayer.y = data.y;
            }
        } else if (data.t === 'shot') {
            // El compañero disparó una bola de plasma
            if (typeof activePlasmaShots !== 'undefined') {
                activePlasmaShots.push({
                    x: data.x,
                    y: data.y,
                    vx: data.vx,
                    fromRemote: true
                });
                if (window.sounds && window.sounds.playShoot) {
                    window.sounds.playShoot();
                }
            }
        } else if (data.t === 'enemy_dead') {
            // El compañero pisoteó o destruyó un enemigo
            if (typeof activeEnemies !== 'undefined' && activeEnemies[data.idx]) {
                const e = activeEnemies[data.idx];
                e.alive = false;
                if (typeof createExplosion === 'function') {
                    createExplosion(e.x + 10, e.y + 10, '#38bdf8');
                }
            }
        } else if (data.t === 'emote') {
            this.remotePlayer.currentEmote = data.emoji;
            this.remotePlayer.emoteTimer = 120;
        } else if (data.t === 'level') {
            // Sincronización de nivel enviada por el anfitrión
            if (typeof loadLevel === 'function') {
                loadLevel(data.w, data.l);
            }
        }
    },

    // 6. ACTUALIZACIÓN DEL JUGADOR REMOTO POR FRAME
    update: function(dt) {
        if (!this.isOnline || !this.remotePlayer.active) return;

        // Enviar mi propio estado al compañero
        this.sendLocalState();

        // Interpolación fluida hacia la posición objetivo
        if (this.remotePlayer.targetX !== undefined) {
            this.remotePlayer.x += (this.remotePlayer.targetX - this.remotePlayer.x) * 0.35;
            this.remotePlayer.y += (this.remotePlayer.targetY - this.remotePlayer.y) * 0.35;
        }

        // Temporizadores de emotes
        if (this.remotePlayer.emoteTimer > 0) this.remotePlayer.emoteTimer--;
        if (this.localEmoteTimer > 0) this.localEmoteTimer--;
    },

    // 7. RENDERIZADO DEL COMPAÑERO EN PANTALLA (CALIDAD DIOS)
    drawRemotePlayer: function(ctx, cameraX) {
        if (!this.isOnline || !this.remotePlayer.active) return;

        const p = this.remotePlayer;
        const px = Math.floor(p.x - cameraX);
        const py = Math.floor(p.y);

        // Si está completamente fuera de pantalla, dibujar flecha indicadora
        if (px < -30 || px > VIEW_WIDTH + 30) {
            this.drawOffscreenIndicator(ctx, px, py);
            return;
        }

        ctx.save();

        if (p.facing === 'left') {
            ctx.scale(-1, 1);
            ctx.translate(-px * 2 - p.w, 0);
        }

        // Colores distintivos del compañero (Nova)
        const suitCol = p.colorSuit;
        const armorCol = p.colorArmor;
        const visorCol = p.colorVisor;
        const highlightCol = '#fde047';

        // 1. Sombra bajo los pies
        ctx.fillStyle = 'rgba(0, 0, 0, 0.32)';
        ctx.beginPath();
        ctx.ellipse(px + p.w / 2, py + p.h - 1, 9, 3.5, 0, 0, Math.PI * 2);
        ctx.fill();

        // 2. Piernas y botas
        ctx.fillStyle = armorCol;
        ctx.fillRect(px + 3, py + p.h - 9, 6, 6);
        ctx.fillRect(px + p.w - 9, py + p.h - 9, 6, 6);
        ctx.fillStyle = '#0f172a';
        ctx.fillRect(px + 2, py + p.h - 4, 7, 4);
        ctx.fillRect(px + p.w - 10, py + p.h - 4, 8, 4);

        // 3. Torso con coraza
        const chestGrad = ctx.createLinearGradient(px + 2, py + 11, px + p.w - 2, py + p.h - 8);
        chestGrad.addColorStop(0, suitCol);
        chestGrad.addColorStop(1, armorCol);
        ctx.fillStyle = chestGrad;
        ctx.beginPath();
        ctx.roundRect(px + 2, py + 11, p.w - 4, p.h - 18, 4);
        ctx.fill();
        ctx.strokeStyle = armorCol;
        ctx.lineWidth = 1.2;
        ctx.stroke();

        // Reactor de pecho ámbar resplandeciente
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(px + p.w / 2, py + 15, 2.5, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = visorCol;
        ctx.beginPath();
        ctx.arc(px + p.w / 2, py + 15, 4, 0, Math.PI * 2);
        ctx.stroke();

        // 4. Casco y visor dorado
        const headCX = px + p.w / 2;
        const headCY = py + 7;
        const headR = 8.5;
        const helmetGrad = ctx.createRadialGradient(headCX - 2, headCY - 2, 1, headCX, headCY, headR);
        helmetGrad.addColorStop(0, '#ffffff');
        helmetGrad.addColorStop(0.4, suitCol);
        helmetGrad.addColorStop(1, armorCol);
        ctx.fillStyle = helmetGrad;
        ctx.beginPath();
        ctx.arc(headCX, headCY, headR, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = armorCol;
        ctx.lineWidth = 1.2;
        ctx.stroke();

        // Visor de cristal ámbar
        ctx.fillStyle = '#020617';
        ctx.beginPath();
        ctx.ellipse(headCX + 1, headCY, 6.5, 5, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = visorCol;
        ctx.beginPath();
        ctx.ellipse(headCX + 1.5, headCY, 4.5, 2.8, 0, 0, Math.PI * 2);
        ctx.fill();

        ctx.restore();

        // 5. Etiqueta de Nombre del Amigo flotante
        ctx.save();
        ctx.font = '900 9px system-ui, sans-serif';
        ctx.textAlign = 'center';
        // Fondo de la placa de nombre
        const tagText = this.isHost ? '🎮 AMIGO (P2)' : '👑 ANFITRIÓN (P1)';
        const tagW = ctx.measureText(tagText).width + 10;
        ctx.fillStyle = 'rgba(15, 23, 42, 0.82)';
        ctx.beginPath();
        ctx.roundRect(px + p.w / 2 - tagW / 2, py - 16, tagW, 12, 6);
        ctx.fill();
        ctx.strokeStyle = '#38bdf8';
        ctx.lineWidth = 1;
        ctx.stroke();
        ctx.fillStyle = '#38bdf8';
        ctx.fillText(tagText, px + p.w / 2, py - 7);

        // 6. Bocadillo de Emote si está activo
        if (p.emoteTimer > 0 && p.currentEmote) {
            ctx.fillStyle = '#ffffff';
            ctx.beginPath();
            ctx.roundRect(px + p.w / 2 - 14, py - 38, 28, 18, 8);
            ctx.fill();
            // Pico del bocadillo
            ctx.beginPath();
            ctx.moveTo(px + p.w / 2 - 3, py - 20);
            ctx.lineTo(px + p.w / 2 + 3, py - 20);
            ctx.lineTo(px + p.w / 2, py - 16);
            ctx.fill();
            ctx.font = '14px system-ui, sans-serif';
            ctx.fillText(p.currentEmote, px + p.w / 2, py - 24);
        }
        ctx.restore();
    },

    // 8. INDICADOR DE FLECHA CUANDO EL COMPAÑERO ESTÁ LEJOS
    drawOffscreenIndicator: function(ctx, px, py) {
        ctx.save();
        const isRight = (px > VIEW_WIDTH);
        const indX = isRight ? (VIEW_WIDTH - 24) : 24;
        const indY = Math.max(30, Math.min(VIEW_HEIGHT - 30, py + 14));

        ctx.fillStyle = '#38bdf8';
        ctx.beginPath();
        if (isRight) {
            ctx.moveTo(indX + 10, indY);
            ctx.lineTo(indX - 4, indY - 7);
            ctx.lineTo(indX - 4, indY + 7);
        } else {
            ctx.moveTo(indX - 10, indY);
            ctx.lineTo(indX + 4, indY - 7);
            ctx.lineTo(indX + 4, indY + 7);
        }
        ctx.fill();

        ctx.fillStyle = 'rgba(15, 23, 42, 0.9)';
        ctx.beginPath();
        ctx.arc(isRight ? indX - 10 : indX + 10, indY, 9, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#38bdf8';
        ctx.lineWidth = 1.2;
        ctx.stroke();

        ctx.fillStyle = '#ffffff';
        ctx.font = '900 8px system-ui';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(this.isHost ? 'P2' : 'P1', isRight ? indX - 10 : indX + 10, indY);
        ctx.restore();
    },

    // 9. ACTUALIZACIÓN VISUAL DE LA INTERFAZ
    updateStatusUI: function(type, message) {
        const el = document.getElementById('onlineStatusMsg');
        if (el) {
            el.innerText = message;
            el.className = 'online-status-box ' + type;
        }
    },

    displayRoomCodeUI: function(code) {
        const card = document.getElementById('roomCodeDisplayCard');
        const codeText = document.getElementById('roomCodeText');
        if (card && codeText) {
            codeText.innerText = code;
            card.classList.remove('hidden');
        }
    },

    copyInviteLink: function() {
        const currentUrl = window.location.href.split('?')[0];
        const inviteUrl = currentUrl + '?room=' + this.roomCode;
        
        if (navigator.clipboard && navigator.clipboard.writeText) {
            navigator.clipboard.writeText(inviteUrl).then(() => {
                alert('¡Enlace copiado al portapapeles! Pégalo en WhatsApp o compártelo con tu familiar.');
            }).catch(() => {
                prompt('Copia este enlace para enviarlo por WhatsApp:', inviteUrl);
            });
        } else {
            prompt('Copia este enlace para enviarlo por WhatsApp:', inviteUrl);
        }
    }
};

// Inicializar al cargar el script
window.addEventListener('load', () => {
    OnlineManager.init();
});
