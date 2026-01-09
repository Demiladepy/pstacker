import * as THREE from 'three';
import * as CANNON from 'cannon-es';
import { gsap } from 'gsap';
import { DisasterManager } from './DisasterManager.js';
import { JuiceManager } from './JuiceManager.js';
import { Materials } from './Materials.js';

export class Game {
    constructor() {
        this.container = document.getElementById('canvas-container');
        this.world = null;
        this.scene = null;
        this.camera = null;
        this.renderer = null;
        this.timeStep = 1 / 60;
        this.lastCallTime = 0;

        // Game State
        this.blocks = [];
        this.currentBlock = null;
        this.stackHeight = 0;
        this.score = 0;
        this.gameState = 'START';

        // Settings
        this.blockSize = { x: 4, y: 1, z: 4 };
        this.blockHeight = 1;
        this.baseColor = 0x00ffd5;
        this.secondaryColor = 0xff0055;
        this.hue = 0; // For rainbow tower

        // Systems
        this.disasterManager = new DisasterManager(this);
        this.juiceManager = new JuiceManager(this);

        // Combos
        this.comboStreak = 0;
        this.lastBlockPos = { x: 0, z: 0 };

        this.loop = this.loop.bind(this);
        this.handleInput = this.handleInput.bind(this);
        this.handleResize = this.handleResize.bind(this);
    }

    init() {
        this.setupPhysics();
        this.setupGraphics();
        this.setupLights();
        this.setupUI();

        window.addEventListener('resize', this.handleResize);
        requestAnimationFrame(this.loop);
    }

    setupPhysics() {
        this.world = new CANNON.World();
        this.world.gravity.set(0, -20, 0); // Stronger gravity for punchy feel
        this.world.broadphase = new CANNON.NaiveBroadphase();
        this.world.solver.iterations = 10;

        this.defaultMaterial = new CANNON.Material('default');

        // Create Cannon Materials from Dictionary
        this.materialMap = {};
        Object.values(Materials).forEach(matDef => {
            const mat = new CANNON.Material(matDef.name);
            this.materialMap[matDef.name] = mat;

            // Interaction with Default (Base)
            this.world.addContactMaterial(new CANNON.ContactMaterial(
                this.defaultMaterial, mat, { friction: matDef.friction, restitution: matDef.restitution }
            ));

            // Interaction with Self
            this.world.addContactMaterial(new CANNON.ContactMaterial(
                mat, mat, { friction: matDef.friction, restitution: matDef.restitution }
            ));

            // Interaction with Others (Generic mix)
            Object.values(Materials).forEach(otherDef => {
                if (otherDef.name !== matDef.name) {
                    // Average
                    const friction = (matDef.friction + otherDef.friction) / 2;
                    const restitution = (matDef.restitution + otherDef.restitution) / 2;
                    const otherMat = this.materialMap[otherDef.name] || new CANNON.Material(otherDef.name); // Should exist by 2nd pass or lazy
                    // To avoid duplicates, we could loop carefully, but Cannon handles overwrites or we just do simple Pair?
                    // Let's just do Default contact for now for simplicity, or specific if matches.
                    // Actually, Cannon needs explicit contacts or falls back to defaults.
                    // Let's just ensure Self and Default are tuned. Complex interactions can fallback.
                }
            });
        });
    }

    setupGraphics() {
        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(0x1a1a2e);
        this.scene.fog = new THREE.Fog(0x1a1a2e, 20, 80);

        this.camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 1000);
        this.camera.position.set(20, 20, 20);
        this.camera.lookAt(0, 0, 0);

        this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.shadowMap.enabled = true;
        this.container.appendChild(this.renderer.domElement);

        // Base
        this.createBlock(0, -2, 0, 6, 4, 6, 0, new THREE.Color(0x333333));
    }

    setupLights() {
        const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
        this.scene.add(ambientLight);

        const dirLight = new THREE.DirectionalLight(0xffffff, 0.8);
        dirLight.position.set(10, 30, 20);
        dirLight.castShadow = true;
        dirLight.shadow.mapSize.width = 2048;
        dirLight.shadow.mapSize.height = 2048;
        this.scene.add(dirLight);

        // Background gradient plane? Or just lights.
    }

    setupUI() {
        this.startBtn = document.getElementById('start-btn');
        this.startBtn.addEventListener('click', () => this.startGame());

        this.restartBtn = document.getElementById('restart-btn');
        this.restartBtn.addEventListener('click', () => this.resetGame());

        document.addEventListener('mousedown', this.handleInput);
        document.addEventListener('touchstart', (e) => { e.preventDefault(); this.handleInput(e); }, { passive: false });

        this.uiScore = document.getElementById('score');
        this.uiHeight = document.getElementById('height');

        this.screens = {
            start: document.getElementById('start-screen'),
            game: document.getElementById('game-ui'),
            gameOver: document.getElementById('game-over-screen')
        };
    }

    createBlock(x, y, z, width, height, depth, mass, colorInput) {
        const shape = new CANNON.Box(new CANNON.Vec3(width / 2, height / 2, depth / 2));
        const body = new CANNON.Body({ mass: mass, material: this.defaultMaterial });
        body.addShape(shape);
        body.position.set(x, y, z);
        this.world.addBody(body);

        const geometry = new THREE.BoxGeometry(width, height, depth);
        // Rounded edges for toy look?
        // BoxGeometry doesn't support radius. Use RoundedBoxGeometry extension or just box for now.

        const color = colorInput || new THREE.Color().setHSL(this.hue, 0.8, 0.6);
        const material = new THREE.MeshStandardMaterial({ color: color, roughness: 0.1 });
        const mesh = new THREE.Mesh(geometry, material);
        mesh.castShadow = true;
        mesh.receiveShadow = true;

        mesh.position.copy(body.position);
        mesh.quaternion.copy(body.quaternion);

        this.scene.add(mesh);

        // Store
        const block = { mesh, body, initialY: y };

        // Collision Listener for Juice
        body.addEventListener("collide", (e) => {
            const relativeVelocity = e.contact.getImpactVelocityAlongNormal();
            if (Math.abs(relativeVelocity) > 1) {
                // Audio
                const isSteel = body.material.name === 'steel';
                if (isSteel) this.juiceManager.playClank();
                else this.juiceManager.playThud(this.comboStreak);

                // Particles
                this.juiceManager.spawnCollisionParticles(e.contact.bj.position, mesh.material.color);

                // Shake (if heavy impact)
                if (Math.abs(relativeVelocity) > 5) {
                    this.juiceManager.shakeScreen(0.5);
                }
            }
        });

        this.blocks.push(block);
        return block;
    }

    spawnNextBlock() {
        this.score++;
        this.uiScore.innerText = this.score;
        this.uiHeight.innerText = (this.score * this.blockHeight) + 'm';

        // Chaos Check (Every 5th block, start warning at 4?)
        this.disasterManager.clear();
        if (this.score > 0 && this.score % 5 === 0) {
            this.disasterManager.triggerRandomEvent();
        }

        // Params
        let scale = { ...this.blockSize };
        let mass = 5;

        // Apply Chaos Mods
        const mods = this.disasterManager.modifyNextBlock(scale, mass);
        scale = mods.scale;
        mass = mods.mass;

        const y = (this.blocks.length * this.blockHeight) + 4;

        // Color cycle
        this.hue += 0.05;
        if (this.hue > 1) this.hue = 0;

        // Pick Material (Random or based on level)
        let matDef = Materials.WOOD;
        const rand = Math.random();
        if (rand > 0.9) matDef = Materials.RUBBER;
        else if (rand > 0.8) matDef = Materials.ICE;
        else if (rand > 0.7) matDef = Materials.STEEL;

        // Force heavy event override
        let finalMass = mass * matDef.massMult;

        // Spawn
        const axis = this.score % 2 === 0 ? 'x' : 'z';
        const spawnX = axis === 'x' ? -10 : 0;
        const spawnZ = axis === 'z' ? -10 : 0;

        // Create
        const block = this.createBlock(spawnX, y, spawnZ, scale.x, this.blockHeight, scale.z, 0, new THREE.Color(matDef.color));
        block.body.material = this.materialMap[matDef.name];
        block.matDef = matDef; // Store for later

        this.currentBlock = block;
        this.currentBlock.oscillate = {
            axis: axis,
            time: 0,
            speed: 3 + (this.score * 0.2), // Get faster
            range: 8
        };

        // Mass for later
        this.currentBlock.targetMass = finalMass;
    }

    startGame() {
        this.setScreen('game');
        this.gameState = 'PLAYING';
        this.score = 0;
        this.resetScene();
        this.spawnNextBlock();
    }

    resetGame() {
        this.startGame();
    }

    resetScene() {
        for (let i = this.blocks.length - 1; i > 0; i--) {
            this.world.removeBody(this.blocks[i].body);
            this.scene.remove(this.blocks[i].mesh);
        }
        this.blocks = [this.blocks[0]];
        this.currentBlock = null;
        this.hue = 0;

        gsap.to(this.camera.position, {
            x: 20, y: 20, z: 20,
            duration: 1
        });
    }

    setScreen(name) {
        Object.values(this.screens).forEach(s => s.classList.remove('active'));
        if (this.screens[name]) this.screens[name].classList.add('active');
    }

    handleInput(e) {
        if (this.gameState !== 'PLAYING') return;
        // Don't drop if we just clicked start
        if (e.target.closest('button')) return;
        if (!this.currentBlock || !this.currentBlock.oscillate) return;

        // Capture axis before nulling
        const osAxis = this.currentBlock.oscillate.axis;

        // Drop
        this.currentBlock.oscillate = null;
        this.currentBlock.body.mass = this.currentBlock.targetMass;
        this.currentBlock.body.type = CANNON.Body.DYNAMIC;
        this.currentBlock.body.updateMassProperties();
        this.currentBlock.body.velocity.set(0, -10, 0);
        this.currentBlock.body.wakeUp(); // Ensure awake

        // Combo Check
        const prevBlock = this.blocks[this.blocks.length - 2];
        const prevPos = prevBlock ? prevBlock.body.position : new CANNON.Vec3(0, 0, 0);
        const currentPos = this.currentBlock.body.position;

        const dist = osAxis === 'x'
            ? Math.abs(prevPos.x - currentPos.x)
            : Math.abs(prevPos.z - currentPos.z);

        if (dist < 0.5) {
            this.comboStreak++;
            this.showComboText();
            this.juiceManager.playThud(this.comboStreak + 2);

            if (this.comboStreak >= 3) {
                // Safety net? Or just bonus points?
                this.score += 5; // Bonus
                this.uiScore.innerText = this.score;
            }
        } else {
            this.comboStreak = 0;
        }

        this.checkStability();
    }

    showComboText() {
        const el = document.getElementById('combo-text');
        if (el) {
            el.innerText = `PERFECT! x${this.comboStreak}`;
            el.style.opacity = '1';
            el.style.transform = 'translate(-50%, -50%) scale(1.5)';
            gsap.to(el.style, { opacity: 0, scale: 1, duration: 1, ease: "power2.out" });
        } else {
            // Create lazily if not exists (though better to have in HTML)
        }
    }

    checkStability() {
        // Wait and spawn next
        // Use a flag to prevent multiple spawns
        const triggeringBlock = this.currentBlock;

        setTimeout(() => {
            if (this.gameState !== 'PLAYING') return;
            if (triggeringBlock !== this.currentBlock) return; // Already moved on

            // Check if it fell
            if (triggeringBlock.body.position.y < (this.blocks.length * this.blockHeight) - 10) {
                // It fell way down
                this.gameOver();
                return;
            }

            // Simple check: is it reasonably upright? 
            // We'll just let the player keep stacking. If it falls, it falls.
            // Game Over trigger is usually "Something fell below the threshold".

            this.spawnNextBlock();
        }, 1000);
    }

    gameOver() {
        if (this.gameState === 'GAMEOVER') return;
        this.gameState = 'GAMEOVER';
        this.setScreen('gameOver');

        const finalScore = this.score;
        document.getElementById('final-score').innerText = finalScore;
        const heightVal = Math.floor(finalScore * this.blockHeight);
        document.getElementById('final-height').innerText = heightVal + 'm';

        // Certificate Logic
        let grade = "F - Absolute Hazard";
        if (finalScore > 5) grade = "C - Barely Standing";
        if (finalScore > 15) grade = "B - Surprisingly Stable";
        if (finalScore > 30) grade = "A - Master Architect";

        // Inject Certificate HTML if not present or update it
        let cert = document.getElementById('cert-grade');
        if (!cert) {
            const container = document.getElementById('game-over-screen');
            cert = document.createElement('h2');
            cert.id = 'cert-grade';
            cert.style.color = '#ffff00';
            cert.style.textShadow = '0 0 10px orange';
            cert.style.marginTop = '20px';
            container.insertBefore(cert, document.getElementById('restart-btn'));
        }
        cert.innerText = `Certification: ${grade}`;

        // High Score
        const savedHigh = localStorage.getItem('pstacker_highscore') || 0;
        if (finalScore > savedHigh) {
            localStorage.setItem('pstacker_highscore', finalScore);
            cert.innerText += " (NEW RECORD!)";
        } else {
            cert.innerText += ` (Best: ${savedHigh})`;
        }
    }

    updatePhysics(dt) {
        this.world.step(this.timeStep, dt, 3);

        let fallenCount = 0;

        this.blocks.forEach((block, index) => {
            if (index === 0) return; // Base

            block.mesh.position.copy(block.body.position);
            block.mesh.quaternion.copy(block.body.quaternion);

            // Check for game over (any block falling below base)
            if (block.body.position.y < -5) {
                // If it's a recent block, Game Over.
                // If it's an old block (tower collapse), Game Over.
                // We'll just allow some debris but if too many fall?
                // Strict rule: If ANY block falls, Game Over? 
                // "Tower collapses".
                if (this.gameState === 'PLAYING') {
                    this.gameOver();
                }
            }
        });

        this.disasterManager.update(dt);
    }

    updateGameLogic(time) {
        // Oscillate current block
        if (this.currentBlock && this.currentBlock.oscillate) {
            const os = this.currentBlock.oscillate;
            os.time += os.speed;
            const val = Math.sin(os.time * 0.02) * os.range;

            const y = (this.blocks.length * this.blockHeight) + 4;

            if (os.axis === 'x') {
                this.currentBlock.body.position.set(val, y, 0);
            } else {
                this.currentBlock.body.position.set(0, y, val);
            }

            // Sync mesh
            this.currentBlock.mesh.position.copy(this.currentBlock.body.position);
            this.currentBlock.mesh.quaternion.copy(this.currentBlock.body.quaternion);
        }

        // Camera Follow
        if (this.blocks.length > 0) {
            // Target Y is top of stack + offset
            // We can assume top of stack is the last spawned block's Y
            const topY = this.currentBlock ? this.currentBlock.mesh.position.y : (this.blocks.length * this.blockHeight);

            // Target Camera Position
            const targetCamY = Math.max(20, topY + 15);

            this.camera.position.y += (targetCamY - this.camera.position.y) * 0.05;
            this.camera.lookAt(0, this.camera.position.y - 15, 0);
        }
    }

    handleResize() {
        this.camera.aspect = window.innerWidth / window.innerHeight;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(window.innerWidth, window.innerHeight);
    }

    loop(time) {
        requestAnimationFrame(this.loop);
        const dt = (time - this.lastCallTime) / 1000;
        this.lastCallTime = time;

        this.updatePhysics(dt);
        this.updateGameLogic(time);

        this.renderer.render(this.scene, this.camera);
    }
}
