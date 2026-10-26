// audio.js - Sintetizador de efectos y música retro 8-bit con Web Audio API
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

    playJump(isSuper = false) {
        if (this.muted) return;
        this.init();
        if (!this.ctx) return;

        const now = this.ctx.currentTime;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc.type = isSuper ? 'sawtooth' : 'square';
        osc.frequency.setValueAtTime(isSuper ? 160 : 150, now);
        osc.frequency.exponentialRampToValueAtTime(isSuper ? 600 : 480, now + 0.16);

        gain.gain.setValueAtTime(0.2, now);
        gain.gain.linearRampToValueAtTime(0.01, now + 0.16);

        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start(now);
        osc.stop(now + 0.17);
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

        gain.gain.setValueAtTime(0.25, now);
        gain.gain.setValueAtTime(0.25, now + 0.08);
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
        osc.frequency.setValueAtTime(120, now);
        osc.frequency.exponentialRampToValueAtTime(40, now + 0.12);

        gain.gain.setValueAtTime(0.3, now);
        gain.gain.linearRampToValueAtTime(0.01, now + 0.12);

        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start(now);
        osc.stop(now + 0.13);
    }

    playPowerUp() {
        if (this.muted) return;
        this.init();
        if (!this.ctx) return;

        const notes = [330, 392, 659, 523, 587, 784];
        notes.forEach((freq, i) => {
            const now = this.ctx.currentTime + (i * 0.07);
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();

            osc.type = 'triangle';
            osc.frequency.setValueAtTime(freq, now);

            gain.gain.setValueAtTime(0.2, now);
            gain.gain.linearRampToValueAtTime(0.01, now + 0.07);

            osc.connect(gain);
            gain.connect(this.ctx.destination);
            osc.start(now);
            osc.stop(now + 0.07);
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
        osc.frequency.setValueAtTime(700, now);
        osc.frequency.exponentialRampToValueAtTime(200, now + 0.1);

        gain.gain.setValueAtTime(0.18, now);
        gain.gain.linearRampToValueAtTime(0.01, now + 0.1);

        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start(now);
        osc.stop(now + 0.1);
    }

    playBossHurt() {
        if (this.muted) return;
        this.init();
        if (!this.ctx) return;

        const now = this.ctx.currentTime;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(140, now);
        osc.frequency.linearRampToValueAtTime(40, now + 0.3);

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

        const fanfare = [
            { f: 523.25, d: 0.15 }, // C5
            { f: 659.25, d: 0.15 }, // E5
            { f: 783.99, d: 0.15 }, // G5
            { f: 1046.50, d: 0.3 }, // C6
            { f: 880.00, d: 0.2 },  // A5
            { f: 1046.50, d: 0.5 }  // C6
        ];

        let offset = 0;
        fanfare.forEach(note => {
            const now = this.ctx.currentTime + offset;
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();

            osc.type = 'square';
            osc.frequency.setValueAtTime(note.f, now);

            gain.gain.setValueAtTime(0.25, now);
            gain.gain.linearRampToValueAtTime(0.01, now + note.d);

            osc.connect(gain);
            gain.connect(this.ctx.destination);
            osc.start(now);
            osc.stop(now + note.d);
            offset += note.d + 0.05;
        });
    }

    playGameOver() {
        if (this.muted) return;
        this.stopMusic();
        this.init();
        if (!this.ctx) return;

        const melody = [
            { f: 330, d: 0.2 },
            { f: 293, d: 0.2 },
            { f: 261, d: 0.2 },
            { f: 196, d: 0.4 }
        ];

        let offset = 0;
        melody.forEach(n => {
            const now = this.ctx.currentTime + offset;
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();

            osc.type = 'triangle';
            osc.frequency.setValueAtTime(n.f, now);

            gain.gain.setValueAtTime(0.2, now);
            gain.gain.linearRampToValueAtTime(0.01, now + n.d);

            osc.connect(gain);
            gain.connect(this.ctx.destination);
            osc.start(now);
            osc.stop(now + n.d);
            offset += n.d;
        });
    }

    startMusic(worldNum, isBoss = false) {
        if (this.muted) return;
        this.init();
        if (!this.ctx) return;
        this.currentWorld = worldNum;
        this.stopMusic();
        this.musicPlaying = true;

        // Bucle musical procedural estilo chiptune retro según el mundo
        const tempo = isBoss ? 150 : 130;
        const beatDuration = 60 / tempo;

        let notes;
        if (isBoss) {
            // Boss theme: rápido y tenso
            notes = [110, 110, 130.8, 123.5, 110, 110, 146.8, 138.6];
        } else if (worldNum % 2 === 1) {
            // Overworld alegre (C major)
            notes = [261.6, 261.6, 329.6, 392.0, 440.0, 392.0, 329.6, 261.6];
        } else {
            // Underground / Desierto misterioso
            notes = [220.0, 246.9, 261.6, 293.7, 261.6, 246.9, 220.0, 196.0];
        }

        let step = 0;
        const playBeat = () => {
            if (!this.musicPlaying || this.muted) return;
            const now = this.ctx.currentTime;
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();

            osc.type = isBoss ? 'sawtooth' : 'square';
            const freq = notes[step % notes.length];
            osc.frequency.setValueAtTime(freq, now);

            gain.gain.setValueAtTime(0.04, now);
            gain.gain.exponentialRampToValueAtTime(0.001, now + beatDuration * 0.8);

            osc.connect(gain);
            gain.connect(this.ctx.destination);
            osc.start(now);
            osc.stop(now + beatDuration * 0.9);

            step++;
            this.musicTimeout = setTimeout(playBeat, beatDuration * 1000);
        };

        playBeat();
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
