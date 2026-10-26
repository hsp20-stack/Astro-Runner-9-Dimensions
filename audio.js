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
    // MÚSICA DE THE LEGEND OF ZELDA (OVERWORLD THEME)
    // ==========================================
    startMusic(worldNum, isBoss = false) {
        if (this.muted) return;
        this.init();
        if (!this.ctx) return;
        this.currentWorld = worldNum;
        this.stopMusic();
        this.musicPlaying = true;

        // Notas del icónico tema de Zelda (Overworld)
        // Frecuencias:
        const Bb3 = 233.08, F3 = 174.61, C4 = 261.63, D4 = 293.66, Eb4 = 311.13, F4 = 349.23;
        const Bb4 = 466.16, F4_hi = 349.23, Gb4 = 369.99, Ab4 = 415.30;
        const C5 = 523.25, D5 = 587.33, Eb5 = 622.25, F5 = 698.46, Gb5 = 739.99, Ab5 = 830.61, Bb5 = 932.33;

        // Melodía completa del tema principal de The Legend of Zelda
        const zeldaTheme = [
            // Compás 1: Bb4 (larga)
            { f: Bb4, d: 0.65 },
            // F4 (media)
            { f: F4_hi, d: 0.35 },
            // Bb4 Bb4 C5 D5 Eb5 F5
            { f: Bb4, d: 0.18 },
            { f: Bb4, d: 0.18 },
            { f: C5,  d: 0.18 },
            { f: D5,  d: 0.18 },
            { f: Eb5, d: 0.18 },
            { f: F5,  d: 0.65 },
            // F5 F5 F5 Gb5 Ab5 Bb5
            { f: F5,  d: 0.18 },
            { f: F5,  d: 0.18 },
            { f: Gb5, d: 0.18 },
            { f: Ab5, d: 0.18 },
            { f: Bb5, d: 0.70 },
            // Bb5 Ab5 Gb5
            { f: Bb5, d: 0.20 },
            { f: Ab5, d: 0.20 },
            { f: Gb5, d: 0.35 },
            // Ab5 Gb5 F5
            { f: Ab5, d: 0.20 },
            { f: Gb5, d: 0.20 },
            { f: F5,  d: 0.55 },
            // F5 Eb5 F5
            { f: F5,  d: 0.20 },
            { f: Eb5, d: 0.20 },
            { f: F5,  d: 0.40 },
            // Eb5 D5 Eb5
            { f: Eb5, d: 0.20 },
            { f: D5,  d: 0.20 },
            { f: Eb5, d: 0.40 },
            // D5 C5 D5
            { f: D5,  d: 0.20 },
            { f: C5,  d: 0.20 },
            { f: D5,  d: 0.35 },
            // F4
            { f: F4_hi, d: 0.45 }
        ];

        // Boss Theme tenso y rápido
        const bossTheme = [
            { f: 110, d: 0.14 },
            { f: 110, d: 0.14 },
            { f: 130.8, d: 0.14 },
            { f: 123.5, d: 0.14 },
            { f: 110, d: 0.14 },
            { f: 146.8, d: 0.14 },
            { f: 138.6, d: 0.20 }
        ];

        const sequence = isBoss ? bossTheme : zeldaTheme;
        let index = 0;

        const playNextNote = () => {
            if (!this.musicPlaying || this.muted) return;
            const note = sequence[index % sequence.length];
            const now = this.ctx.currentTime;

            // Voz principal (Zelda Lead - Volumen Alto y Nítido)
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();

            osc.type = isBoss ? 'sawtooth' : 'triangle';
            osc.frequency.setValueAtTime(note.f, now);

            gain.gain.setValueAtTime(0.24, now); // Volumen de música subido
            gain.gain.exponentialRampToValueAtTime(0.015, now + note.d * 0.9);

            osc.connect(gain);
            gain.connect(this.ctx.destination);
            osc.start(now);
            osc.stop(now + note.d * 0.95);

            // Línea de bajo rítmico (Bassline con buen cuerpo)
            if (!isBoss && index % 2 === 0) {
                const bassOsc = this.ctx.createOscillator();
                const bassGain = this.ctx.createGain();
                bassOsc.type = 'triangle';
                bassOsc.frequency.setValueAtTime(note.f / 4, now);
                bassGain.gain.setValueAtTime(0.18, now); // Bajo sonoro
                bassGain.gain.exponentialRampToValueAtTime(0.01, now + note.d * 0.8);
                bassOsc.connect(bassGain);
                bassGain.connect(this.ctx.destination);
                bassOsc.start(now);
                bassOsc.stop(now + note.d * 0.85);
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
