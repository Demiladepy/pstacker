export class AudioSystem {
    constructor() {
        this.ctx = new (window.AudioContext || window.webkitAudioContext)();
        this.masterGain = this.ctx.createGain();
        this.masterGain.connect(this.ctx.destination);
        this.masterGain.gain.value = 0.5;

        // Resume context on interaction
        document.addEventListener('click', () => {
            if (this.ctx.state === 'suspended') this.ctx.resume();
        }, { once: true });
    }

    playImpact(materialDef, velocityLen, combo = 0) {
        if (this.ctx.state === 'suspended') return;

        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        const filter = this.ctx.createBiquadFilter();

        // Material Logic
        let type = 'sine';
        let freq = 200;
        let decay = 0.3;

        if (materialDef.name === 'wood') { freq = 200; type = 'square'; decay = 0.1; }
        if (materialDef.name === 'steel') { freq = 800; type = 'sawtooth'; decay = 0.8; }
        if (materialDef.name === 'rubber') { freq = 100; type = 'sine'; decay = 0.4; } // Boing?
        if (materialDef.name === 'glass') { freq = 1500; type = 'triangle'; decay = 0.2; }
        if (materialDef.name === 'ice') { freq = 2000; type = 'sine'; decay = 0.5; }

        // Velocity & Combo Mod
        freq *= (1 + combo * 0.1);
        freq = Math.min(freq, 10000);

        osc.type = type;
        osc.frequency.setValueAtTime(freq, this.ctx.currentTime);
        // Pitch drop for impact feel
        osc.frequency.exponentialRampToValueAtTime(freq * 0.5, this.ctx.currentTime + decay);

        filter.type = 'lowpass';
        filter.frequency.value = 2000 + velocityLen * 200;

        const vol = Math.min(1.0, velocityLen * 0.1);
        gain.gain.setValueAtTime(vol, this.ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + decay);

        osc.connect(filter);
        filter.connect(gain);
        gain.connect(this.masterGain);

        osc.start();
        osc.stop(this.ctx.currentTime + decay);
    }

    playSuccess(comboLevel) {
        if (this.ctx.state === 'suspended') return;

        // Arpeggio
        const notes = [440, 554, 659, 880]; // A Major
        const speed = 0.08;

        notes.forEach((freq, i) => {
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();

            osc.type = 'triangle';
            osc.frequency.setValueAtTime(freq * (1 + (comboLevel * 0.1)), this.ctx.currentTime + (i * speed));

            gain.gain.setValueAtTime(0.1, this.ctx.currentTime + (i * speed));
            gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + (i * speed) + 0.3);

            osc.connect(gain);
            gain.connect(this.masterGain);

            osc.start(this.ctx.currentTime + (i * speed));
            osc.stop(this.ctx.currentTime + (i * speed) + 0.3);
        });
    }

    playThud(pitch = 1) {
        // Fallback/Generic
        this.playImpact({ name: 'wood' }, 5 * pitch);
    }

    setupAmbience() {
        // Wind Noise (Pink Noise approximation)
        const bufferSize = 2 * this.ctx.sampleRate;
        const noiseBuffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
        const output = noiseBuffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) {
            const white = Math.random() * 2 - 1;
            output[i] = (lastOut + (0.02 * white)) / 1.02;
            lastOut = output[i];
            output[i] *= 3.5;
        }
        var lastOut = 0;

        this.windNode = this.ctx.createBufferSource();
        this.windNode.buffer = noiseBuffer;
        this.windNode.loop = true;

        this.windFilter = this.ctx.createBiquadFilter();
        this.windFilter.type = 'lowpass';
        this.windFilter.frequency.value = 200; // Start muffled

        this.windGain = this.ctx.createGain();
        this.windGain.gain.value = 0.0; // Start silent

        this.windNode.connect(this.windFilter);
        this.windFilter.connect(this.windGain);
        this.windGain.connect(this.masterGain);

        // Drone (Deep sine/triangle)
        this.droneOsc = this.ctx.createOscillator();
        this.droneOsc.type = 'triangle';
        this.droneOsc.frequency.value = 55; // A1

        this.droneGain = this.ctx.createGain();
        this.droneGain.gain.value = 0.0;

        this.droneOsc.connect(this.droneGain);
        this.droneGain.connect(this.masterGain);
    }

    startAmbience() {
        if (!this.windNode) this.setupAmbience();
        if (this.ctx.state === 'suspended') this.ctx.resume();

        try {
            this.windNode.start();
            this.droneOsc.start();

            // Fade in
            this.windGain.gain.setValueAtTime(0, this.ctx.currentTime);
            this.windGain.gain.linearRampToValueAtTime(0.1, this.ctx.currentTime + 2);

            this.droneGain.gain.setValueAtTime(0, this.ctx.currentTime);
            this.droneGain.gain.linearRampToValueAtTime(0.05, this.ctx.currentTime + 5);
        } catch (e) { /* Already started */ }
    }

    updateAmbience(height, combo) {
        if (!this.windFilter) return;

        // Wind gets brighter and louder with height
        const targetFreq = 200 + (height * 50);
        this.windFilter.frequency.setTargetAtTime(Math.min(targetFreq, 4000), this.ctx.currentTime, 0.5);

        const targetVol = 0.05 + (height * 0.002);
        this.windGain.gain.setTargetAtTime(Math.min(targetVol, 0.3), this.ctx.currentTime, 0.5);

        // Drone reacts to combo (adds harmonics or volume?)
        // Let's just modulate volume slightly
        const droneVol = 0.05 + (combo * 0.01);
        this.droneGain.gain.setTargetAtTime(Math.min(droneVol, 0.2), this.ctx.currentTime, 0.1);
    }
}
