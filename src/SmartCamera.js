import * as THREE from 'three';
import { gsap } from 'gsap';

export class SmartCamera {
    constructor(game) {
        this.game = game;
        this.camera = game.camera;
        this.basePos = new THREE.Vector3(20, 20, 20);
        this.offset = new THREE.Vector3(20, 15, 20); // Relative to target
        this.targetSearchY = 0;
        this.shakeIntensity = 0;
        this.zoom = 1.0;

        this.comboMode = false;
    }

    update(dt) {
        // 1. Determine Target Y
        // Should track the top of the stack
        let topY = 0;
        if (this.game.currentBlock) {
            topY = this.game.currentBlock.mesh.position.y;
        } else if (this.game.blocks.length > 0) {
            topY = this.game.blocks[this.game.blocks.length - 1].mesh.position.y;
        }

        // Smoothly move search target
        this.targetSearchY += (topY - this.targetSearchY) * 0.05;

        // 2. Base Position Logic
        // We want to look at a point slightly below the top (for context)
        const lookAtY = Math.max(0, this.targetSearchY - 5);

        // Pivot/Orbit based on combo?
        // If combo is high, we might rotate slowly around the tower for dramatic effect?
        // For now, let's stick to a clean isometric-like view but dynamic height.

        let desiredX = 20;
        let desiredZ = 20;

        if (this.game.comboStreak > 5) {
            // Slight rotation effect
            const time = Date.now() * 0.0005;
            desiredX = Math.sin(time) * 25;
            desiredZ = Math.cos(time) * 25;
        }

        const desiredY = Math.max(20, this.targetSearchY + 15);

        // Lerp position
        this.camera.position.x += (desiredX - this.camera.position.x) * 0.05;
        this.camera.position.y += (desiredY - this.camera.position.y) * 0.05;
        this.camera.position.z += (desiredZ - this.camera.position.z) * 0.05;

        // 3. Shake
        if (this.shakeIntensity > 0) {
            const rx = (Math.random() - 0.5) * this.shakeIntensity;
            const ry = (Math.random() - 0.5) * this.shakeIntensity;
            const rz = (Math.random() - 0.5) * this.shakeIntensity;
            this.camera.position.add(new THREE.Vector3(rx, ry, rz));
            this.shakeIntensity -= dt * 2; // Decay
            if (this.shakeIntensity < 0) this.shakeIntensity = 0;
        }

        // 4. Look At
        this.camera.lookAt(0, lookAtY, 0);

        // 5. Dynamic FOV / Zoom triggers?
        // On Perfect drop, maybe quick punch in?
    }

    triggerShake(intensity) {
        this.shakeIntensity = intensity;
    }

    pulseZoom() {
        // Quick zoom in out
        gsap.to(this.camera, { fov: 40, duration: 0.1, yoyo: true, repeat: 1, onUpdate: () => this.camera.updateProjectionMatrix() });
    }
}
