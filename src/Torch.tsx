import * as THREE from "three";
// @ts-ignore
import * as PHOTONS from "./photons/photons.module.js";

export function addTorchWithParticles(scene: THREE.Scene) {
    //Create the torch point light
    const light = new THREE.PointLight(0xffa95c, 5, 50);
    light.position.set(0, 3, 0);
    light.castShadow = true;
    scene.add(light);

    //Add the flickering effect to torch light
    setInterval(() => {
        light.intensity = 0.8 + Math.random() * 0.4;                // Randomize flicker
        light.color.setHSL(0.1 + Math.random() * 0.1, 1, 0.5);      // Randomize color shift
    }, 100);    // Every 100ms

    //Add the particle system for fire and smoke
    addParticles(scene, light.position);
}

function addParticles(scene: THREE.Scene, position: THREE.Vector3) {
    //Create particle system
    const particles = new PHOTONS.ParticleSystem(new THREE.Object3D(), null);
    particles.init(1000);

    //Set up particle emitter
    const emitter = new PHOTONS.ConstantParticleEmitter(50);    //Emit 50 particles per second
    particles.setEmitter(emitter);

    //Add particle initializers
    particles.addParticleStateInitializer(new PHOTONS.LifetimeInitializer(2, 0));
    particles.addParticleStateInitializer(new PHOTONS.SizeInitializer(new PHOTONS.RandomGenerator(new THREE.Vector2(2, 4), new THREE.Vector2(1.0, 1.0))));
    particles.addParticleStateInitializer({
        initializeState(state: any) {
            state.initialColor.set(1, 0.3, 0);
            state.color.copy(state.initialColor);
            state.opacity = 1;
    }});    //Flame Color

    // particles.particleMaterial.blending = THREE.AdditiveBlending;
    // particles.particleMaterial.transparent = true;

    //Add particle system to the scene
    particles.owner.position.set(position);
    scene.add(particles.owner);

    //Register the update function in the animation loop
    const clock = new THREE.Clock();
    //Update the particle system in the animation loop
    const updateParticles = (timeDelta: number) => {
        particles.update(null, timeDelta);          //Call update to animate particles
    }

    const animate = () => {
        requestAnimationFrame(animate);
        const delta = clock.getDelta();
        updateParticles(delta);
    }

    animate();
}