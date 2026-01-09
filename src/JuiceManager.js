import * as THREE from 'three';
import { gsap } from 'gsap';

export class JuiceManager {
    constructor(game) {
        this.game = game;
        this.scene = game.scene;

        // Particles
        this.particles = [];

        // Audio (Vanilla Web Audio)
        this.audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        this.sounds = {};
        this.setupAudio();
    }

    setupAudio() {
        // Synthesize simple sounds since we don't have assets
        this.sounds.thud = this.createOscillatorSound('square', 0.1, 100);
        this.sounds.clank = this.createOscillatorSound('sawtooth', 0.3, 800);
        this.sounds.glass = this.createOscillatorSound('sine', 0.1, 1200);
    }

    createOscillatorSound(type, duration, freq) {
        return (pitchMod = 1) => {
            if (this.audioCtx.state === 'suspended') this.audioCtx.resume();

            const osc = this.audioCtx.createOscillator();
            const gain = this.audioCtx.createGain();

            osc.type = type;
            osc.frequency.setValueAtTime(freq * pitchMod, this.audioCtx.currentTime);
            osc.frequency.exponentialRampToValueAtTime(freq * 0.1, this.audioCtx.currentTime + duration);

            gain.gain.setValueAtTime(0.3, this.audioCtx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.01, this.audioCtx.currentTime + duration);

            osc.connect(gain);
            gain.connect(this.audioCtx.destination);

            osc.start();
            osc.stop(this.audioCtx.currentTime + duration);
        };
    }

    playThud(comboStreak = 0) {
        // Pitch shift based on combo
        const pitch = 1 + (comboStreak * 0.2);
        this.sounds.thud(pitch);
    }

    playClank() {
        this.sounds.clank(1);
    }

    spawnCollisionParticles(pos, color) {
        const count = 10;
        const geometry = new THREE.BoxGeometry(0.2, 0.2, 0.2);
        const material = new THREE.MeshBasicMaterial({ color: color });

        for (let i = 0; i < count; i++) {
            const mesh = new THREE.Mesh(geometry, material);
            mesh.position.copy(pos);

            // Random spread
            mesh.position.x += (Math.random() - 0.5) * 2;
            mesh.position.y += (Math.random() - 0.5) * 0.5;
            mesh.position.z += (Math.random() - 0.5) * 2;

            this.scene.add(mesh);

            // Animate
            const destX = mesh.position.x + (Math.random() - 0.5) * 5;
            const destY = mesh.position.y + (Math.random() * 5);
            const destZ = mesh.position.z + (Math.random() - 0.5) * 5;

            gsap.to(mesh.position, {
                x: destX, y: destY, z: destZ,
                duration: 0.5 + Math.random(),
                ease: "power2.out",
                onComplete: () => {
                    this.scene.remove(mesh);
                }
            });
            gsap.to(mesh.rotation, {
                x: Math.random() * 10, y: Math.random() * 10,
                duration: 1
            });
            gsap.to(mesh.scale, {
                x: 0, y: 0, z: 0,
                duration: 1
            });
        }
    }

    shakeScreen(intensity = 1) {
        gsap.to(this.game.camera.position, {
            x: this.game.camera.position.x + (Math.random() - 0.5) * intensity,
            y: this.game.camera.position.y + (Math.random() - 0.5) * intensity,
            z: this.game.camera.position.z + (Math.random() - 0.5) * intensity,
            duration: 0.1,
            yoyo: true,
            repeat: 3,
            onComplete: () => {
                // Reset slightly? Camera logic in Game.js handles smooth follow anyway
            }
        });
    }
}
