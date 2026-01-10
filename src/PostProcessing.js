import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import * as THREE from 'three';

export class PostProcessing {
    constructor(game) {
        this.game = game;
        this.composer = new EffectComposer(game.renderer);

        const renderPass = new RenderPass(game.scene, game.camera);
        this.composer.addPass(renderPass);

        this.bloomPass = new UnrealBloomPass(
            new THREE.Vector2(window.innerWidth, window.innerHeight),
            1.5, // strength
            0.5, // radius
            0.85 // threshold
        );
        this.bloomPass.strength = 0.5; // Start subtle
        this.composer.addPass(this.bloomPass);
    }

    render(dt) {
        this.composer.render();
    }

    setSize(width, height) {
        this.composer.setSize(width, height);
    }
}
