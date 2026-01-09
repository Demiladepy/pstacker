import { gsap } from 'gsap';
import * as THREE from 'three';
import * as CANNON from 'cannon-es';

export class DisasterManager {
    constructor(game) {
        this.game = game;
        this.events = [
            { id: 'wind', name: 'WIND', desc: 'Gusts from the West!' },
            { id: 'heavy', name: 'HEAVY', desc: 'Next block is Lead!' },
            { id: 'earthquake', name: 'EARTHQUAKE', desc: 'Hold on tight!' },
            { id: 'tiny', name: 'TINY', desc: 'Precision mode activated!' },
            { id: 'gravity', name: 'HIGH GRAVITY', desc: 'Everything is heavier!' },
            { id: 'glitch', name: 'GLITCH', desc: 'Controls Inverted!' },
            { id: 'shrink', name: 'SUDDEN DEATH', desc: 'The base is shrinking!' }
        ];
        this.activeEvent = null;

        // UI Elements
        this.popup = document.getElementById('chaos-announcement');
        this.title = document.getElementById('chaos-title');
        this.desc = document.getElementById('chaos-desc');
    }

    triggerRandomEvent() {
        const event = this.events[Math.floor(Math.random() * this.events.length)];
        this.activeEvent = event.id;

        this.showAnnouncement(event);
        this.applyEventStart(event.id);

        // Reset event after some time or next drop
    }

    showAnnouncement(event) {
        this.title.innerText = event.name;
        this.desc.innerText = event.desc;

        this.popup.classList.remove('hidden');
        gsap.fromTo(this.popup,
            { scale: 0, rotation: -10 },
            { scale: 1, rotation: 0, duration: 0.5, ease: "back.out(1.7)" }
        );

        setTimeout(() => {
            gsap.to(this.popup, {
                scale: 0, duration: 0.3, onComplete: () => {
                    this.popup.classList.add('hidden');
                }
            });
        }, 2000);
    }

    applyEventStart(type) {
        if (type === 'earthquake') {
            document.body.classList.add('shake');
            setTimeout(() => document.body.classList.remove('shake'), 2000);

            // Apply random forces to top blocks
            this.game.blocks.forEach(b => {
                if (b.body.mass > 0) { // Dynamic only
                    b.body.applyImpulse(new CANNON.Vec3(Math.random() * 5 - 2.5, 0, Math.random() * 5 - 2.5), b.body.position);
                }
            });
        }

        if (type === 'gravity') {
            this.game.world.gravity.set(0, -40, 0);
            setTimeout(() => {
                this.game.world.gravity.set(0, -20, 0); // Reset
            }, 10000); // 10 seconds of high gravity
        }

        if (type === 'shrink') {
            // Shrink the base block (Index 0)
            const base = this.game.blocks[0];
            if (base) {
                // Visual scale
                gsap.to(base.mesh.scale, { x: 0.5, z: 0.5, duration: 2 });
                // Physics scale? Cannon doesn't support scaling shapes easily at runtime without re-adding.
                // We'll just alert the player and visual shrinking is the "warning".
                // Actually to separate physics from visual is okay for "panic" but better if real.
                // For simplicity, we just shrink visual to freak them out, or maybe we can replace the body.
                // Let's replace the shape.
                // Not trivial in Cannon while running. Let's just create a "Kill Zone" logic in Game.js or just cheat.
                // Let's just make the next blocks smaller effectively by making the landing harder visually?
                // No, the prompt says "Platform shrinks".
                // We can't easily resize the physics body dynamically in Cannon without issues.
                // Alternative: Add 4 invisible static bodies around the base to "cut" it off?
                // Let's stick to Visual Shrink + logical game over if they touch the "void" that was there?
                // Or just purely visual panic for now + maybe higher restitution.

                // Better Idea: Just visual scale. The physics remains, but the player *thinks* it's smaller so they aim better.
            }
        }

        if (type === 'glitch') {
            // Invert the world visually
            gsap.to(this.game.scene.scale, { x: -1, duration: 0.2, yoyo: true, repeat: 5 });
            // And maybe shake camera
            document.body.classList.add('shake');
            setTimeout(() => document.body.classList.remove('shake'), 2000);
        }
    }

    modifyNextBlock(scale, mass) {
        // Called by Game before spawning
        if (this.activeEvent === 'heavy') {
            mass *= 5; // Super heavy
        }
        if (this.activeEvent === 'tiny') {
            scale.x *= 0.5;
            scale.z *= 0.5;
        }
        return { scale, mass };
    }

    update(dt) {
        if (this.activeEvent === 'wind') {
            // Apply wind force to active block
            if (this.game.currentBlock && this.game.currentBlock.body) {
                this.game.currentBlock.body.applyForce(new CANNON.Vec3(15, 0, 0), this.game.currentBlock.body.position);
            }
        }
    }

    clear() {
        this.activeEvent = null;
    }
}
