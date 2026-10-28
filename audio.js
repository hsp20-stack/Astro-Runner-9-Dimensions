// audio.js - Sintetizador de efectos y el Tema Legendario de Zelda en Chiptune con Web Audio API
class SoundManager {
    constructor() {
        this.ctx = null;
        this.muted = false;
        this.musicPlaying = false;
        this.musicTimeout = null;
        this.currentWorld = 1;
    }

    init() {
        if (!this.ctx) {
            const AudioContext = window.AudioContext || window.webkitAudioContext;
            if (AudioContext) {
                this.ctx = new AudioContext();
            }
        }
        if (this.ctx && this.ctx.state === 'suspended') {
            this.ctx.resume();
        }
        // Desbloqueo especial para Safari en iPhone/iOS
        try {
            const buffer = this.ctx.createBuffer(1, 1, 22050);
            const source = this.ctx.createBufferSource();
            source.buffer = buffer;
            source.connect(this.ctx.destination);
            source.start(0);
        } catch (e) {}
    }

    toggleMute() {
        this.muted = !this.muted;
        if (this.muted) {
            this.stopMusic();
        } else {
            this.startMusic(this.currentWorld);
        }
        return this.muted;
    }

    playStudioIntroChime() {
        if (this.muted) return;
        this.init();
        if (!this.ctx) return;

        // Intro cinemática estilo PlayStation / Unity
        const chords = [
            { f: 261.63, d: 1.2 }, // C4
            { f: 329.63, d: 1.2 }, // E4
            { f: 392.00, d: 1.2 }, // G4
            { f: 523.25, d: 1.4 }  // C5
        ];

        chords.forEach((note) => {
            const now = this.ctx.currentTime;
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();

            osc.type = 'sine';
            osc.frequency.setValueAtTime(note.f, now);

            gain.gain.setValueAtTime(0.01, now);
            gain.gain.linearRampToValueAtTime(0.35, now + 0.35); // Sonido de intro nítido y potente
            gain.gain.exponentialRampToValueAtTime(0.001, now + note.d);

            osc.connect(gain);
            gain.connect(this.ctx.destination);
            osc.start(now);
            osc.stop(now + note.d);
        });
    }

    playJump(isSuper = false) {
        if (this.muted) return;
        this.init();
        if (!this.ctx) return;

        const now = this.ctx.currentTime;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc.type = isSuper ? 'triangle' : 'sine';
        osc.frequency.setValueAtTime(isSuper ? 180 : 160, now);
        osc.frequency.exponentialRampToValueAtTime(isSuper ? 650 : 520, now + 0.18);

        gain.gain.setValueAtTime(0.25, now);
        gain.gain.linearRampToValueAtTime(0.01, now + 0.18);

        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start(now);
        osc.stop(now + 0.19);
    }

    playCoin() {
        if (this.muted) return;
        this.init();
        if (!this.ctx) return;

        const now = this.ctx.currentTime;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc.type = 'sine';
        osc.frequency.setValueAtTime(987.77, now); // B5
        osc.frequency.setValueAtTime(1318.51, now + 0.08); // E6

        gain.gain.setValueAtTime(0.28, now);
        gain.gain.setValueAtTime(0.28, now + 0.08);
        gain.gain.linearRampToValueAtTime(0.01, now + 0.35);

        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start(now);
        osc.stop(now + 0.36);
    }

    playStomp() {
        if (this.muted) return;
        this.init();
        if (!this.ctx) return;

        const now = this.ctx.currentTime;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc.type = 'triangle';
        osc.frequency.setValueAtTime(140, now);
        osc.frequency.exponentialRampToValueAtTime(35, now + 0.14);

        gain.gain.setValueAtTime(0.35, now);
        gain.gain.linearRampToValueAtTime(0.01, now + 0.14);

        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start(now);
        osc.stop(now + 0.15);
    }

    playPowerUp() {
        if (this.muted) return;
        this.init();
        if (!this.ctx) return;

        // Zelda "Item Get" fanfare chimes
        const notes = [466.16, 523.25, 587.33, 698.46, 783.99, 932.33];
        notes.forEach((freq, i) => {
            const now = this.ctx.currentTime + (i * 0.08);
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();

            osc.type = 'triangle';
            osc.frequency.setValueAtTime(freq, now);

            gain.gain.setValueAtTime(0.25, now);
            gain.gain.linearRampToValueAtTime(0.01, now + 0.08);

            osc.connect(gain);
            gain.connect(this.ctx.destination);
            osc.start(now);
            osc.stop(now + 0.08);
        });
    }

    playFireball() {
        if (this.muted) return;
        this.init();
        if (!this.ctx) return;

        const now = this.ctx.currentTime;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(750, now);
        osc.frequency.exponentialRampToValueAtTime(220, now + 0.12);

        gain.gain.setValueAtTime(0.2, now);
        gain.gain.linearRampToValueAtTime(0.01, now + 0.12);

        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start(now);
        osc.stop(now + 0.12);
    }

    playBossHurt() {
        if (this.muted) return;
        this.init();
        if (!this.ctx) return;

        const now = this.ctx.currentTime;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(150, now);
        osc.frequency.linearRampToValueAtTime(45, now + 0.3);

        gain.gain.setValueAtTime(0.4, now);
        gain.gain.linearRampToValueAtTime(0.01, now + 0.3);

        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start(now);
        osc.stop(now + 0.3);
    }

    playStageClear() {
        if (this.muted) return;
        this.stopMusic();
        this.init();
        if (!this.ctx) return;
        if (this.ctx.state === 'suspended') {
            this.ctx.resume();
        }

        // ==========================================
        // FANFARRIA ÉPICA DE VICTORIA: SUPER MARIO LEVEL CLEAR FANFARE
        // ==========================================
        const G3 = 196.00, C4 = 261.63, E4 = 329.63, G4 = 392.00, C5 = 523.25, E5 = 659.25, G5 = 783.99;
        const Ab3 = 207.65, C5_2 = 523.25, Eb4 = 311.13, Ab4 = 415.30, Eb5 = 622.25, Ab5 = 830.61;
        const Bb3 = 233.08, D4 = 293.66, F4 = 349.23, Bb4 = 466.16, D5 = 587.33, F5 = 698.46, Bb5 = 932.33;
        const C6 = 1046.50, E6 = 1318.51, G6 = 1567.98, Ab6 = 1661.22, Bb6 = 1864.66;

        const fanfare = [
            // Arpegio 1: Triada de Do Mayor ascendente triunfal
            { f: G4,  d: 0.11, b: C3 },
            { f: C5,  d: 0.11, b: C3 },
            { f: E5,  d: 0.11, b: E3 },
            { f: G5,  d: 0.11, b: G3 },
            { f: C6,  d: 0.11, b: C4 },
            { f: E6,  d: 0.18, b: E4 },
            { f: G6,  d: 0.32, b: G4 },
            { f: E6,  d: 0.22, b: E4 },

            // Arpegio 2: Modulación a La Bemol Mayor
            { f: Ab4, d: 0.11, b: Ab3 },
            { f: C5,  d: 0.11, b: C4 },
            { f: Eb5, d: 0.11, b: Eb4 },
            { f: Ab5, d: 0.11, b: Ab4 },
            { f: C6,  d: 0.11, b: C5 },
            { f: Eb6, d: 0.18, b: Eb5 },
            { f: Ab6, d: 0.32, b: Ab5 },
            { f: Eb6, d: 0.22, b: Eb5 },

            // Arpegio 3: Clímax en Si Bemol Mayor con fanfarria
            { f: Bb4, d: 0.11, b: Bb3 },
            { f: D5,  d: 0.11, b: D4 },
            { f: F5,  d: 0.11, b: F4 },
            { f: Bb5, d: 0.11, b: Bb4 },
            { f: D6,  d: 0.11, b: D5 },
            { f: F6,  d: 0.18, b: F5 },
            { f: Bb6, d: 0.34, b: Bb5 },
            { f: Bb6, d: 0.13, b: Bb5 },
            { f: Bb6, d: 0.13, b: Bb5 },

            // Gran Acorde final triunfal de Do Mayor sostenido
            { f: C6,  d: 1.25, b: C3 }
        ];

        let offset = 0;
        fanfare.forEach(note => {
            const now = this.ctx.currentTime + offset;
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();

            osc.type = 'triangle';
            osc.frequency.setValueAtTime(note.f, now);

            gain.gain.setValueAtTime(0.35, now);
            gain.gain.exponentialRampToValueAtTime(0.012, now + note.d * 0.94);

            osc.connect(gain);
            gain.connect(this.ctx.destination);
            osc.start(now);
            osc.stop(now + note.d * 0.98);

            // Acompañamiento armónico y bajo
            if (note.b) {
                const bOsc = this.ctx.createOscillator();
                const bGain = this.ctx.createGain();
                bOsc.type = 'triangle';
                bOsc.frequency.setValueAtTime(note.b, now);
                bGain.gain.setValueAtTime(0.24, now);
                bGain.gain.exponentialRampToValueAtTime(0.01, now + note.d * 0.90);
                bOsc.connect(bGain);
                bGain.connect(this.ctx.destination);
                bOsc.start(now);
                bOsc.stop(now + note.d * 0.95);
            }

            offset += note.d * 0.95;
        });

        // La música vuelve a sonar siempre automáticamente tras la fanfarria de victoria
        setTimeout(() => {
            if (!this.musicPlaying && !this.muted) {
                this.startMusic(this.currentWorld, false);
            }
        }, offset * 1000 + 400);
    }

    playGameOver() {
        if (this.muted) return;
        this.stopMusic();
        this.init();
        if (!this.ctx) return;

        const melody = [
            { f: 330, d: 0.25 },
            { f: 293, d: 0.25 },
            { f: 261, d: 0.25 },
            { f: 196, d: 0.5 }
        ];

        let offset = 0;
        melody.forEach(n => {
            const now = this.ctx.currentTime + offset;
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();

            osc.type = 'triangle';
            osc.frequency.setValueAtTime(n.f, now);

            gain.gain.setValueAtTime(0.25, now);
            gain.gain.linearRampToValueAtTime(0.01, now + n.d);

            osc.connect(gain);
            gain.connect(this.ctx.destination);
            osc.start(now);
            osc.stop(now + n.d);
            offset += n.d;
        });
    }

    // ==========================================
    // MEDLEY NINTENDO SUPREMO:
    // SUPER MARIO 64 + ZELDA: OCARINA OF TIME +
    // SUPER MARIO SUNSHINE + SUPER MARIO GALAXY
    // ==========================================
    startMusic(worldNum, isBoss = false) {
        if (this.muted) return;
        this.init();
        if (!this.ctx) return;
        if (this.ctx.state === 'suspended') {
            this.ctx.resume();
        }

        // Si ya está sonando la música correspondiente, continuarla fluidamente sin reiniciar
        if (this.musicPlaying && this.currentWorld === worldNum && this.isBossMusic === isBoss) {
            return;
        }

        this.currentWorld = worldNum;
        this.isBossMusic = isBoss;
        this.stopMusic();
        this.musicPlaying = true;

        // Frecuencias exactas en Hz
        const C3 = 130.81, D3 = 146.83, E3 = 164.81, F3 = 174.61, G3 = 196.00, A3 = 220.00, B3 = 246.94;
        const C4 = 261.63, Cs4 = 277.18, D4 = 293.66, Ds4 = 311.13, E4 = 329.63, F4 = 349.23, Fs4 = 369.99, G4 = 392.00, Gs4 = 415.30, A4 = 440.00, As4 = 466.16, B4 = 493.88;
        const C5 = 523.25, Cs5 = 554.37, D5 = 587.33, Ds5 = 622.25, E5 = 659.25, F5 = 698.46, Fs5 = 739.99, G5 = 783.99, Gs5 = 830.61, A5 = 880.00, As5 = 932.33, B5 = 987.77;
        const C6 = 1046.50, D6 = 1174.66, E6 = 1318.51;

        // ==========================================
        // 1. SUPER MARIO 64 - BOB-OMB BATTLEFIELD (TEMA PRINCIPAL)
        // ==========================================
        const sm64Theme = [
            { f: G4, d: 0.16, b: C3 },
            { f: C5, d: 0.16, b: C3 },
            { f: E5, d: 0.16, b: E3 },
            { f: G5, d: 0.30, b: G3 },
            { f: A5, d: 0.16, b: A3 },
            { f: G5, d: 0.16, b: G3 },
            { f: E5, d: 0.30, b: E3 },
            { f: C5, d: 0.30, b: C3 },
            { f: D5, d: 0.16, b: G3 },
            { f: D5, d: 0.16, b: G3 },
            { f: D5, d: 0.26, b: G3 },
            { f: E5, d: 0.16, b: A3 },
            { f: D5, d: 0.16, b: G3 },
            { f: C5, d: 0.44, b: C3 },
            { f: 0,  d: 0.08, b: 0  }
        ];

        // ==========================================
        // 2. ZELDA: OCARINA OF TIME - SONG OF STORMS (CANCIÓN DE LAS TORMENTAS)
        // ==========================================
        const songOfStorms = [
            { f: D4, d: 0.15, b: D3 },
            { f: F4, d: 0.15, b: F3 },
            { f: D5, d: 0.45, b: D3 },
            { f: D4, d: 0.15, b: D3 },
            { f: F4, d: 0.15, b: F3 },
            { f: D5, d: 0.45, b: D3 },
            { f: E5, d: 0.28, b: E3 },
            { f: F5, d: 0.15, b: F3 },
            { f: E5, d: 0.15, b: E3 },
            { f: F5, d: 0.15, b: F3 },
            { f: E5, d: 0.15, b: E3 },
            { f: C5, d: 0.15, b: C3 },
            { f: A4, d: 0.50, b: A3 },
            { f: 0,  d: 0.08, b: 0  }
        ];

        // ==========================================
        // 3. SUPER MARIO SUNSHINE - DELFINO PLAZA (PLAZA DELFINO)
        // ==========================================
        const sunshineTheme = [
            { f: E5, d: 0.17, b: C3 },
            { f: G5, d: 0.17, b: G3 },
            { f: A5, d: 0.17, b: A3 },
            { f: C6, d: 0.32, b: C3 },
            { f: B5, d: 0.17, b: G3 },
            { f: G5, d: 0.17, b: E3 },
            { f: A5, d: 0.32, b: A3 },
            { f: F5, d: 0.17, b: F3 },
            { f: E5, d: 0.17, b: E3 },
            { f: D5, d: 0.17, b: G3 },
            { f: C5, d: 0.45, b: C3 },
            { f: 0,  d: 0.08, b: 0  }
        ];

        // ==========================================
        // 4. ZELDA: OCARINA OF TIME - SARIA'S SONG (LOST WOODS / BOSQUE PERDIDO)
        // ==========================================
        const sariasSong = [
            { f: F4, d: 0.15, b: F3 },
            { f: A4, d: 0.15, b: A3 },
            { f: B4, d: 0.30, b: G3 },
            { f: F4, d: 0.15, b: F3 },
            { f: A4, d: 0.15, b: A3 },
            { f: B4, d: 0.30, b: G3 },
            { f: F4, d: 0.15, b: F3 },
            { f: A4, d: 0.15, b: A3 },
            { f: B4, d: 0.15, b: B3 },
            { f: E5, d: 0.15, b: E3 },
            { f: D5, d: 0.30, b: D3 },
            { f: B4, d: 0.15, b: G3 },
            { f: C5, d: 0.15, b: A3 },
            { f: B4, d: 0.15, b: G3 },
            { f: G4, d: 0.15, b: E3 },
            { f: E4, d: 0.45, b: C3 },
            { f: 0,  d: 0.08, b: 0  }
        ];

        // ==========================================
        // 5. SUPER MARIO GALAXY - GUSTY GARDEN GALAXY (JARDÍN CÉFIRO)
        // ==========================================
        const galaxyTheme = [
            { f: D5,  d: 0.22, b: D3 },
            { f: E5,  d: 0.22, b: E3 },
            { f: Fs5, d: 0.22, b: F3 },
            { f: A5,  d: 0.44, b: A3 },
            { f: G5,  d: 0.22, b: G3 },
            { f: Fs5, d: 0.22, b: F3 },
            { f: E5,  d: 0.22, b: E3 },
            { f: D5,  d: 0.35, b: D3 },
            { f: B4,  d: 0.22, b: G3 },
            { f: D5,  d: 0.55, b: D3 },
            { f: Cs5, d: 0.22, b: A3 },
            { f: D5,  d: 0.22, b: D3 },
            { f: E5,  d: 0.55, b: E3 },
            { f: 0,   d: 0.10, b: 0  }
        ];

        // Medley completo para los niveles normales
        const mainMedley = [
            ...sm64Theme,
            ...songOfStorms,
            ...sunshineTheme,
            ...sariasSong,
            ...galaxyTheme
        ];

        // ==========================================
        // TEMA DEL JEFE FINAL: SUPER MARIO 64 - BATALLA FINAL CONTRA BOWSER
        // ==========================================
        const C2 = 65.41, Eb2 = 77.78, F2 = 87.31, Fs2 = 92.50, G2 = 98.00, Ab2 = 103.83, Bb2 = 116.54;
        const bossBattleTheme = [
            // Intro dramática y pesada de Bowser
            { f: C4,  d: 0.16, b: C2 },
            { f: C4,  d: 0.16, b: C2 },
            { f: Eb4, d: 0.16, b: Eb2 },
            { f: F4,  d: 0.16, b: F2 },
            { f: Fs4, d: 0.16, b: Fs2 },
            { f: G4,  d: 0.32, b: G2 },
            // Motivo principal de la batalla (Marcha siniestra de Bowser)
            { f: C4,  d: 0.14, b: C2 },
            { f: C4,  d: 0.14, b: C2 },
            { f: C4,  d: 0.14, b: C2 },
            { f: Eb4, d: 0.28, b: Eb2 },
            { f: D4,  d: 0.14, b: D3 },
            { f: C4,  d: 0.14, b: C2 },
            { f: Bb3, d: 0.28, b: Bb2 },

            { f: C4,  d: 0.14, b: C2 },
            { f: C4,  d: 0.14, b: C2 },
            { f: C4,  d: 0.14, b: C2 },
            { f: Eb4, d: 0.14, b: Eb2 },
            { f: F4,  d: 0.14, b: F2 },
            { f: G4,  d: 0.30, b: G2 },
            { f: F4,  d: 0.14, b: F2 },
            { f: Eb4, d: 0.14, b: Eb2 },
            { f: D4,  d: 0.30, b: D3 },

            // Clímax orquestal ascendente de Mario 64
            { f: C4,  d: 0.14, b: C2 },
            { f: Eb4, d: 0.14, b: Eb2 },
            { f: G4,  d: 0.14, b: G2 },
            { f: C5,  d: 0.36, b: C3 },
            { f: Bb4, d: 0.14, b: Bb2 },
            { f: Ab4, d: 0.14, b: Ab2 },
            { f: G4,  d: 0.28, b: G2 },
            { f: F4,  d: 0.14, b: F2 },
            { f: Eb4, d: 0.14, b: Eb2 },
            { f: D4,  d: 0.36, b: D3 },

            // Cadencia de combate
            { f: G4,  d: 0.14, b: G2 },
            { f: G4,  d: 0.14, b: G2 },
            { f: Ab4, d: 0.14, b: Ab2 },
            { f: Bb4, d: 0.28, b: Bb2 },
            { f: Ab4, d: 0.14, b: Ab2 },
            { f: G4,  d: 0.14, b: G2 },
            { f: F4,  d: 0.28, b: F2 },
            { f: Eb4, d: 0.14, b: Eb2 },
            { f: D4,  d: 0.14, b: D3 },
            { f: C4,  d: 0.50, b: C2 }
        ];

        const sequence = isBoss ? bossBattleTheme : mainMedley;
        let index = 0;

        const playNextNote = () => {
            if (!this.musicPlaying || this.muted) return;
            const note = sequence[index % sequence.length];
            const now = this.ctx.currentTime;

            if (note.f > 0) {
                // Voz principal: Melodía rica y brillante con armónicos estilo Nintendo 64/GameCube
                const osc = this.ctx.createOscillator();
                const gain = this.ctx.createGain();

                osc.type = isBoss ? 'sawtooth' : 'triangle';
                osc.frequency.setValueAtTime(note.f, now);

                gain.gain.setValueAtTime(0.26, now); // Volumen principal bien claro y nítido
                gain.gain.exponentialRampToValueAtTime(0.012, now + note.d * 0.92);

                osc.connect(gain);
                gain.connect(this.ctx.destination);
                osc.start(now);
                osc.stop(now + note.d * 0.95);

                // Línea de bajo rítmico (Bassline que marca el compás de Super Mario y Zelda)
                if (note.b && note.b > 0) {
                    const bassOsc = this.ctx.createOscillator();
                    const bassGain = this.ctx.createGain();
                    bassOsc.type = isBoss ? 'sawtooth' : 'triangle';
                    bassOsc.frequency.setValueAtTime(note.b, now);

                    bassGain.gain.setValueAtTime(0.19, now);
                    bassGain.gain.exponentialRampToValueAtTime(0.01, now + note.d * 0.85);

                    bassOsc.connect(bassGain);
                    bassGain.connect(this.ctx.destination);
                    bassOsc.start(now);
                    bassOsc.stop(now + note.d * 0.88);
                }
            }

            index++;
            this.musicTimeout = setTimeout(playNextNote, note.d * 1000);
        };

        playNextNote();
    }

    stopMusic() {
        this.musicPlaying = false;
        if (this.musicTimeout) {
            clearTimeout(this.musicTimeout);
            this.musicTimeout = null;
        }
    }
}

window.sounds = new SoundManager();
