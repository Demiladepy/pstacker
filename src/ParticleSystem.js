import * as THREE from 'three';
import { gsap } from 'gsap';

class ParticlePool {
    constructor(scene, maxCount, material, geometry) {
        this.scene = scene;
        this.maxCount = maxCount;
        this.mesh = new THREE.InstancedMesh(geometry, material, maxCount);
        this.mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
        this.scene.add(this.mesh);

        this.particles = [];
        for (let i = 0; i < maxCount; i++) {
            this.particles.push({
                active: false,
                life: 0,
                velocity: new THREE.Vector3(),
                position: new THREE.Vector3(),
                scale: 0,
                color: new THREE.Color()
            });
        }

        this.dummy = new THREE.Object3D();
    }

    emit(config) {
        // config: { position, count, speed, spread, color, lifetime, gravity }
        let emitted = 0;
        for (let i = 0; i < this.maxCount && emitted < config.count; i++) {
            if (!this.particles[i].active) {
                const p = this.particles[i];
                p.active = true;
                p.life = config.lifetime;
                p.maxLife = config.lifetime;
                p.position.copy(config.position);

                // Random velocity in spread
                const angle = (Math.random() - 0.5) * config.spread;
                const phi = Math.random() * Math.PI * 2;
                // Simple sphere spread
                const u = Math.random();
                const v = Math.random();
                const theta = 2 * Math.PI * u;
                const phi2 = Math.acos(2 * v - 1);

                const speed = config.speed * (0.5 + Math.random() * 0.5);
                p.velocity.set(
                    Math.sin(phi2) * Math.cos(theta) * speed,
                    Math.sin(phi2) * Math.sin(theta) * speed,
                    Math.cos(phi2) * speed
                );

                p.gravity = config.gravity || -9.8;
                p.scale = 1;
                p.color.set(config.color || 0xffffff);

                emitted++;
            }
        }
    }

    update(dt) {
        let activeCount = 0;
        for (let i = 0; i < this.maxCount; i++) {
            const p = this.particles[i];
            if (p.active) {
                p.life -= dt;
                if (p.life <= 0) {
                    p.active = false;
                    p.scale = 0;
                } else {
                    p.velocity.y += p.gravity * dt;
                    p.position.addScaledVector(p.velocity, dt);
                    p.scale = p.life / p.maxLife; // Fade out scale
                }

                // Update Instance
                this.dummy.position.copy(p.position);
                this.dummy.scale.setScalar(p.scale);
                this.dummy.updateMatrix();
                this.mesh.setMatrixAt(i, this.dummy.matrix);
                this.mesh.setColorAt(i, p.color);

                activeCount++;
            } else {
                // Reset inactive to zero scale
                this.dummy.scale.set(0, 0, 0);
                this.dummy.updateMatrix();
                this.mesh.setMatrixAt(i, this.dummy.matrix);
            }
        }

        if (activeCount > 0 || true) { // Always update to clear/animate
            this.mesh.instanceMatrix.needsUpdate = true;
            if (this.mesh.instanceColor) this.mesh.instanceColor.needsUpdate = true;
        }
    }
}

export class ParticleSystem {
    constructor(scene) {
        this.scene = scene;
        this.pools = {};

        // Dust / Debris (Cubes)
        const dustGeo = new THREE.BoxGeometry(0.3, 0.3, 0.3);
        const dustMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 1 });
        this.pools.dust = new ParticlePool(scene, 500, dustMat, dustGeo);

        // Sparks (Planes/Triangles? Or tiny cubes)
        const sparkGeo = new THREE.BoxGeometry(0.1, 0.1, 0.1);
        const sparkMat = new THREE.MeshBasicMaterial({ color: 0xffff00 });
        this.pools.sparks = new ParticlePool(scene, 200, sparkMat, sparkGeo);

        // Confetti
        const confettiGeo = new THREE.PlaneGeometry(0.4, 0.2);
        const confettiMat = new THREE.MeshBasicMaterial({ color: 0xffffff, side: THREE.DoubleSide });
        this.pools.confetti = new ParticlePool(scene, 1000, confettiMat, confettiGeo);
    }

    update(dt) {
        Object.values(this.pools).forEach(pool => pool.update(dt));
    }

    emitImpact(position, materialDef, velocityLen) {
        const type = materialDef.particles; // "sawdust", "sparks", etc.
        const color = materialDef.color;

        let pool = this.pools.dust;
        if (materialDef.name === 'steel') pool = this.pools.sparks;
        if (materialDef.name === 'glass') pool = this.pools.dust; // Glass shards logic later

        pool.emit({
            position: position,
            count: Math.min(20, velocityLen * 2),
            speed: velocityLen * 0.5,
            spread: 1,
            color: color,
            lifetime: 1.0,
            gravity: -10
        });
    }

    emitSuccess(position) {
        // Confetti
        this.pools.confetti.emit({
            position: position,
            count: 50,
            speed: 8,
            spread: 3,
            color: new THREE.Color().setHSL(Math.random(), 1, 0.5), // Random colors inside logic?
            // Actually our pool usage sets one color per emit? No, per particle logic in loop needs tweaking if we want multicolor.
            // Current pool emit sets ALL validation to config.color.
            // Let's just emit multiple times for colors.
            lifetime: 2.0,
            gravity: -5
        });

        // Emit more colors
        this.pools.confetti.emit({ position, count: 20, speed: 8, spread: 3, color: 0xFFD700, lifetime: 2, gravity: -5 });
        this.pools.confetti.emit({ position, count: 20, speed: 8, spread: 3, color: 0xFF69B4, lifetime: 2, gravity: -5 });
        this.pools.confetti.emit({ position, count: 20, speed: 8, spread: 3, color: 0x00FF88, lifetime: 2, gravity: -5 });
    }
}
