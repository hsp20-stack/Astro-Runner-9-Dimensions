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

        // Zelda Secret / Puzzle Solved Fanfare!
        // G5, F#5, D#5, A4, G#4, E5, G#5, C6
        const fanfare = [
            { f: 783.99, d: 0.12 },
            { f: 739.99, d: 0.12 },
            { f: 622.25, d: 0.12 },
            { f: 440.00, d: 0.12 },
            { f: 415.30, d: 0.12 },
            { f: 659.25, d: 0.12 },
            { f: 830.61, d: 0.14 },
            { f: 1046.50, d: 0.45 }
        ];

        let offset = 0;
        fanfare.forEach(note => {
            const now = this.ctx.currentTime + offset;
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();

            osc.type = 'triangle';
            osc.frequency.setValueAtTime(note.f, now);

            gain.gain.setValueAtTime(0.28, now);
            gain.gain.linearRampToValueAtTime(0.01, now + note.d);

            osc.connect(gain);
            gain.connect(this.ctx.destination);
            osc.start(now);
            osc.stop(now + note.d);
            offset += note.d + 0.02;
        });
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
        this.currentWorld = worldNum;
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
        // TEMA DEL JEFE: MARIO 64 BOWSER + OCARINA GANONDORF
        // ==========================================
        const bossBattleTheme = [
            { f: 110,   d: 0.14, b: 55 },
            { f: 110,   d: 0.14, b: 55 },
            { f: 130.8, d: 0.14, b: 65.4 },
            { f: 123.5, d: 0.14, b: 61.7 },
            { f: 110,   d: 0.14, b: 55 },
            { f: 146.8, d: 0.14, b: 73.4 },
            { f: 138.6, d: 0.20, b: 69.3 },
            { f: 220,   d: 0.14, b: 110 },
            { f: 207.6, d: 0.14, b: 103.8 },
            { f: 196,   d: 0.14, b: 98 },
            { f: 185,   d: 0.20, b: 92.5 }
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
