import * as THREE from 'three';
import * as CANNON from 'cannon-es';
import { gsap } from 'gsap';
import { DisasterManager } from './DisasterManager.js';
import { Materials } from './Materials.js';
import { ScoreSystem } from './ScoreSystem.js';
import { AudioSystem } from './AudioSystem.js';
import { ParticleSystem } from './ParticleSystem.js';
import { PostProcessing } from './PostProcessing.js';

import { SmartCamera } from './SmartCamera.js';
import { ProgressionSystem } from './ProgressionSystem.js';

export class Game {
    constructor() {
        this.container = document.getElementById('canvas-container');
        this.world = null;
        this.scene = null;
        this.camera = null;
        this.renderer = null;
        this.timeStep = 1 / 60;
        this.timeScale = 1.0;
        this.lastCallTime = 0;

        // Game State
        this.blocks = [];
        this.currentBlock = null;
        this.stackHeight = 0;
        this.floorCount = 0;
        this.gameState = 'START';

        // Settings
        this.blockSize = { x: 4, y: 1, z: 4 };
        this.blockHeight = 1;
        this.baseColor = 0x00ffd5;
        this.secondaryColor = 0xff0055;
        this.hue = 0; // For rainbow tower

        // Systems
        this.disasterManager = new DisasterManager(this);
        this.audioSystem = new AudioSystem();
        this.scoreSystem = new ScoreSystem();

        // Combos
        this.comboStreak = 0;
        this.lastBlockPos = { x: 0, z: 0 };

        this.loop = this.loop.bind(this);
        this.handleInput = this.handleInput.bind(this);
        this.handleResize = this.handleResize.bind(this);

        // Next/Hold
        this.nextBlockParams = null;
        this.holdBlockParams = null;
        this.canHold = true;
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

        // Init Particles now that scene exists? Or just init in init()?
        // I initialized in constructor but scene was null. I must move initialization to init() or here.
        if (!this.particleSystem) this.particleSystem = new ParticleSystem(this.scene);

        this.scene.background = new THREE.Color(0x1a1a2e);
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

        // Post Processing
        this.postProcessing = new PostProcessing(this);

        // Smart Camera
        this.smartCamera = new SmartCamera(this);

        // Progression
        this.progression = new ProgressionSystem();
    }

    setupUI() {
        this.startBtn = document.getElementById('start-btn');
        this.startBtn.addEventListener('click', () => this.startGame());

        this.restartBtn = document.getElementById('restart-btn');
        this.restartBtn.addEventListener('click', () => this.resetGame());

        document.addEventListener('mousedown', this.handleInput);
        document.addEventListener('touchstart', (e) => { e.preventDefault(); this.handleInput(e); }, { passive: false });

        this.uiFloor = document.getElementById('ui-floor');
        this.uiScore = document.getElementById('ui-score');

        this.screens = {
            start: document.getElementById('start-screen'),
            game: document.getElementById('game-ui'),
            gameOver: document.getElementById('game-over-screen')
        };

        // Key listeners for tools/hold
        document.addEventListener('keydown', (e) => {
            if (e.key.toLowerCase() === 'h') this.holdBlock();
        });
    }

    createBlock(x, y, z, width, height, depth, mass, matDefOrColor) {
        const shape = new CANNON.Box(new CANNON.Vec3(width / 2, height / 2, depth / 2));
        const body = new CANNON.Body({ mass: mass, material: this.defaultMaterial });
        body.addShape(shape);
        body.position.set(x, y, z);
        this.world.addBody(body);

        const geometry = new THREE.BoxGeometry(width, height, depth);

        let material;
        // Determine Material Visuals
        if (matDefOrColor.isColor) {
            // Basic Color (e.g. Base platform)
            material = new THREE.MeshStandardMaterial({ color: matDefOrColor, roughness: 0.5 });
        } else {
            // Advanced Material Definition
            const def = matDefOrColor;
            const color = new THREE.Color(def.color);

            if (def.name === 'ice') {
                material = new THREE.MeshPhysicalMaterial({
                    color: color,
                    metalness: 0.1,
                    roughness: 0.1,
                    transmission: 0.6, // Glass-like
                    thickness: 1.0,
                    transparent: true,
                    opacity: 0.8
                });
            } else if (def.name === 'glass') {
                material = new THREE.MeshPhysicalMaterial({
                    color: color,
                    metalness: 0.0,
                    roughness: 0.0,
                    transmission: 0.9,
                    thickness: 0.5,
                    transparent: true,
                    opacity: 0.5
                });
            } else if (def.name === 'steel') {
                material = new THREE.MeshStandardMaterial({
                    color: color,
                    metalness: 0.9,
                    roughness: 0.2
                });
            } else if (def.name === 'wood') {
                material = new THREE.MeshStandardMaterial({
                    color: color,
                    roughness: 0.8,
                    metalness: 0.0
                });
            } else {
                // Default (Rubber/Foam)
                material = new THREE.MeshStandardMaterial({
                    color: color,
                    roughness: 0.4,
                    metalness: 0.0
                });
            }
        }


        // Skin Overrides
        const skin = this.progression ? this.progression.getActiveSkin() : 'default';
        if (skin === 'gold') {
            material = new THREE.MeshStandardMaterial({
                color: 0xFFD700,
                metalness: 1.0,
                roughness: 0.1,
                envMapIntensity: 1.0
            });
        }
        if (skin === 'neon') {
            material.emissive = material.color;
            material.emissiveIntensity = 0.5;
        }
        if (skin === 'matrix') {
            material.wireframe = true;
            material.color.setHex(0x00ff00);
            material.emissive = new THREE.Color(0x00ff00);
        }

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
                this.audioSystem.playImpact(block.matDef || Materials.WOOD, Math.abs(relativeVelocity), this.comboStreak);

                // Particles
                this.particleSystem.emitImpact(e.contact.bj.position, block.matDef || Materials.WOOD, Math.abs(relativeVelocity));

                // Shake (if heavy impact)
                if (Math.abs(relativeVelocity) > 5) {
                    this.smartCamera.triggerShake(Math.abs(relativeVelocity) * 0.05);
                }
            }
        });

        this.blocks.push(block);
        return block;
    }

    generateBlockParams() {
        // Params
        let scale = { ...this.blockSize };

        // Apply Chaos Mods
        // Pass 1 to get the multiplier factor
        const mods = this.disasterManager.modifyNextBlock(scale, 1);
        scale = mods.scale;
        const disasterMassMult = mods.mass;

        // Pick Material (Weighted random)
        let matDef = Materials.WOOD;
        const rand = Math.random();
        if (rand > 0.95) matDef = Materials.GLASS;
        else if (rand > 0.9) matDef = Materials.FOAM;
        else if (rand > 0.8) matDef = Materials.RUBBER;
        else if (rand > 0.7) matDef = Materials.ICE;
        else if (rand > 0.6) matDef = Materials.STEEL;

        // Calculate Mass from Density
        const volume = scale.x * this.blockHeight * scale.z;
        let finalMass = volume * matDef.density * disasterMassMult;

        // Color cycle
        this.hue += 0.05;
        if (this.hue > 1) this.hue = 0;

        return {
            scale,
            matDef,
            mass: finalMass,
            color: new THREE.Color(matDef.color)
        };
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

        // Ensure we have a next block
        if (!this.nextBlockParams) this.nextBlockParams = this.generateBlockParams();

        // Spawn it
        this.spawnBlockFromParams(this.nextBlockParams);

        // Generate new next
        this.nextBlockParams = this.generateBlockParams();
        this.updatePreviews();

        this.canHold = true;
    }

    spawnBlockFromParams(params) {
        const y = (this.blocks.length * this.blockHeight) + 4;

        // Spawn Coords
        const axis = this.score % 2 === 0 ? 'x' : 'z';
        const spawnX = axis === 'x' ? -10 : 0;
        const spawnZ = axis === 'z' ? -10 : 0;

        // Create
        const block = this.createBlock(spawnX, y, spawnZ, params.scale.x, this.blockHeight, params.scale.z, 0, params.matDef);
        block.body.material = this.materialMap[params.matDef.name];
        block.matDef = params.matDef;
        block.params = params; // store for hold

        this.currentBlock = block;
        this.currentBlock.oscillate = {
            axis: axis,
            time: 0,
            speed: 3 + (this.score * 0.2), // Get faster
            range: 8
        };

        // Mass for later
        this.currentBlock.targetMass = params.mass;
    }

    updatePreviews() {
        const nextEl = document.getElementById('next-block-preview');
        if (nextEl && this.nextBlockParams) {
            nextEl.style.backgroundColor = '#' + this.nextBlockParams.matDef.color.toString(16);
            nextEl.innerHTML = ""; // Clear
            // Tooltip title?
            nextEl.title = this.nextBlockParams.matDef.name;
        }

        const holdEl = document.getElementById('hold-block-preview');
        if (holdEl) {
            if (this.holdBlockParams) {
                holdEl.style.backgroundColor = '#' + this.holdBlockParams.matDef.color.toString(16);
                holdEl.title = this.holdBlockParams.matDef.name;
            } else {
                holdEl.style.backgroundColor = 'transparent';
                holdEl.title = "Empty";
            }
        }
    }

    holdBlock() {
        if (!this.canHold || !this.currentBlock || !this.currentBlock.oscillate) return;

        this.canHold = false;
        const currentParams = this.currentBlock.params;

        // Destroy current
        this.world.removeBody(this.currentBlock.body);
        this.scene.remove(this.currentBlock.mesh);
        this.blocks.pop(); // Remove from tracking

        // Undo score
        this.floorCount--;

        if (this.holdBlockParams) {
            // Swap
            const temp = this.holdBlockParams;
            this.holdBlockParams = currentParams;

            // Backup next
            const realNext = this.nextBlockParams;
            this.nextBlockParams = temp;
            this.spawnNextBlock();
            this.nextBlockParams = realNext; // Restore real next
            this.updatePreviews();

        } else {
            // Store and Spawn Next
            this.holdBlockParams = currentParams;
            this.spawnNextBlock();
        }

        this.canHold = false;
    }

    startGame() {
        this.setScreen('game');
        this.gameState = 'PLAYING';
        this.scoreSystem.reset();
        this.floorCount = 0;
        this.resetScene();
        this.spawnNextBlock();

        // Audio
        this.audioSystem.startAmbience();
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

        // Score & Combo via System
        const dist = osAxis === 'x'
            ? Math.abs(prevPos.x - currentPos.x)
            : Math.abs(prevPos.z - currentPos.z);

        const result = this.scoreSystem.registerDrop(dist);
        this.uiScore.innerText = result.totalScore;
        this.comboStreak = result.combo; // Update combo state for effects

        // Feedback
        this.showPlacementFeedback(result);

        // Juice
        if (result.placement.name === 'PERFECT') {
            this.audioSystem.playSuccess(result.combo);
            this.particleSystem.emitSuccess(this.currentBlock.mesh.position);
            this.smartCamera.pulseZoom();
        } else {
            this.audioSystem.playImpact(this.currentBlock.matDef, 5); // Simple thud
        }

        this.checkStability();
    }

    showPlacementFeedback(result) {
        const el = document.getElementById('combo-text');
        if (el) {
            let text = result.placement.text;
            if (result.combo > 1) text += ` x${result.combo}`;

            el.innerText = text;
            el.style.color = result.placement.color;
            el.style.opacity = '1';
            el.style.transform = 'translate(-50%, -50%) scale(1.5)';
            gsap.to(el.style, { opacity: 0, scale: 1, duration: 1, ease: "power2.out" });
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

        const finalScore = this.scoreSystem.score;
        const floors = this.floorCount;

        document.getElementById('final-score').innerText = `Floors: ${floors} | Score: ${finalScore}`;
        document.getElementById('final-height').innerText = ""; // Clear or reuse

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
        if (finalScore > savedHigh) {
            localStorage.setItem('pstacker_highscore', finalScore);
            cert.innerText += " (NEW RECORD!)";
            // Confetti for high score!
            if (this.particleSystem) {
                for (let i = 0; i < 5; i++)
                    setTimeout(() => this.particleSystem.emitSuccess(new THREE.Vector3(0, (floors * 1) + i * 2, 0)), i * 200);
            }
        } else {
            cert.innerText += ` (Best: ${savedHigh})`;
        }

        // Progression
        const unlocks = this.progression.registerGameEnd(finalScore);
        if (unlocks.length > 0) {
            // Show toast or alert?
            // For now, simple console or append to cert
            const unlockMsg = document.createElement('div');
            unlockMsg.style.color = '#00ff00';
            unlockMsg.style.fontSize = '1.2rem';
            unlockMsg.innerText = "UNLOCKED: " + unlocks.map(u => u.name).join(', ');
            document.getElementById('game-over-screen').appendChild(unlockMsg);
        }
    }

    updatePhysics(dt) {
        this.world.step(this.timeStep, dt * this.timeScale, 3);

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

    updateGameLogic(time, dt) {
        // Particles
        if (this.particleSystem) this.particleSystem.update(dt);

        // Audio Ambience
        this.audioSystem.updateAmbience(this.floorCount, this.comboStreak);

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
        if (this.smartCamera) this.smartCamera.update(dt);
    }

    handleResize() {
        this.camera.aspect = window.innerWidth / window.innerHeight;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        if (this.postProcessing) this.postProcessing.setSize(window.innerWidth, window.innerHeight);
    }

    loop(time) {
        requestAnimationFrame(this.loop);
        const dt = (time - this.lastCallTime) / 1000;
        this.lastCallTime = time;

        this.updatePhysics(dt);
        this.updateGameLogic(time, dt);

        if (this.postProcessing) {
            this.postProcessing.render(dt);
        } else {
            this.renderer.render(this.scene, this.camera);
        }
    }
}
