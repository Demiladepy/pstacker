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
            { id: 'tiny', name: 'TINY', desc: 'Precision mode activated!' }
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
                this.game.currentBlock.body.applyForce(new CANNON.Vec3(10, 0, 0), this.game.currentBlock.body.position);
            }
        }
    }

    clear() {
        this.activeEvent = null;
    }
}
