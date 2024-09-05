import * as THREE from "three";
import * as Photons from "../photons/photons.module.js";
import { GLTFLoader } from "three/examples/jsm/Addons.js";

export class Scene {
  constructor(scene, camera, renderer) {
    this.scene = scene;
    this.camera = camera;
    this.renderer = renderer;
    this.particleSystems = [];
    this.manager = new Photons.Manager();
    this.jsonTypeStore = new Photons.JSONTypeStore();
    this.jsonTypeStore.addNamespace("THREE", THREE);
    this.jsonTypeStore.addNamespace("Photons", Photons);
    this.instancedParticleSystems = true;
  }

  build() {
    //TODO - missing file
    // const loadingSpinner = new LoadingSpinner();
    // loadingSpinner.show();
    this.setupSceneComponents().then(() => {
      //TODO - missing file
      // loadingSpinner.hide();
      console.log("Stop spinning.");
      this.setupParticleSystems();
    });
  }

  update() {
    this.manager.update();

    for (let system of this.manager.particleSystems) {
      system.update();
      system.render(this.renderer, this.camera);
    }
  }

  render() {
    this.manager.render(this.renderer, this.camera);
  }

  // Not sure if this is necesary
  static traverseScene(node, onVisit, visited) {
    visited = visited || {};
    if (!visited[node.uuid]) {
      visited[node.uuid] = true;
      onVisit(node);
      if (node.children) {
        for (let child of node.children) {
          Scene.traverseScene(child, onVisit, visited);
        }
      }
    }
  }

  setupParticleSystems() {
    let scale = 0.15;
    let flamePosition = new THREE.Vector3(-0.3, 1, 1.65);
    let smokePosition = new THREE.Vector3(-0.3, 1.75, 1.65);
    this.manager.addParticleSystem(this.setupEmbers(scale, flamePosition));
    this.manager.addParticleSystem(this.setupBaseFlame(scale, flamePosition));
    this.manager.addParticleSystem(this.setupBrightFlame(scale, flamePosition));
    this.manager.addParticleSystem(
      this.setupSmoke(scale + 0.25, smokePosition)
    );
  }

  setupEmbers(scale, position) {
    scale *= 7;

    const embersRoot = new THREE.Object3D();
    embersRoot.position.copy(position);

    //TODO - textures missing
    const texturePath = new URL(
      "../assets/assets-photons/textures/ember.png",
      import.meta.url
    ).href;
    const embersTexture = new THREE.TextureLoader().load(
      texturePath,
      function (texture) {
        console.log("Texture loaded:", texture);
      },
      undefined,
      function (err) {
        console.error("Texture loading error:", err);
      }
    );
    const embersAtlas = new Photons.Atlas(embersTexture, texturePath);
    embersAtlas.addFrameSet(1, 0.0, 0.0, 1.0, 1.0);
    const embersRenderer = new Photons.AnimatedSpriteRenderer(
      this.instancedParticleSystems,
      embersAtlas,
      true,
      THREE.AdditiveBlending
    );

    const embersParticleSystem = new Photons.ParticleSystem(
      embersRoot,
      embersRenderer,
      this.renderer
    );
    embersParticleSystem.init(150);

    embersParticleSystem.setEmitter(new Photons.ConstantParticleEmitter(30));

    const sizeInitializerGenerator = new Photons.RandomGenerator(
      THREE.Vector2,
      new THREE.Vector2(0.05 * scale, 0.05 * scale),
      new THREE.Vector2(scale * 0.15, scale * 0.15),
      0.0,
      0.0,
      false
    );
    embersParticleSystem.addParticleStateInitializer(
      new Photons.LifetimeInitializer(2.5, 0.5, 0.0, 0.0, false)
    );

    embersParticleSystem.addParticleStateInitializer(
      new Photons.SizeInitializer(sizeInitializerGenerator)
    );
    embersParticleSystem.addParticleStateInitializer(
      new Photons.BoxPositionInitializer(
        new THREE.Vector3(-0.1 * scale, -1.0, -0.1 * scale),
        new THREE.Vector3(-0.025 * scale, 1.0, -0.025 * scale)
      )
    );
    embersParticleSystem.addParticleStateInitializer(
      new Photons.RandomVelocityInitializer(
        new THREE.Vector3(0.4 * scale, -0.5 * scale, 0.4 * scale),
        new THREE.Vector3(-0.5 * scale, 0.8 * scale, -0.5 * scale),
        -0.4 * scale,
        0.8 * scale,
        false
      )
    );

    const emberOpacityOperator = embersParticleSystem.addParticleStateOperator(
      new Photons.OpacityInterpolatorOperator()
    );
    emberOpacityOperator.addElements([
      [0.0, 0.0],
      [0.7, 0.25],
      [0.9, 0.75],
      [0.0, 1.0],
    ]);

    const emberColorOperator = embersParticleSystem.addParticleStateOperator(
      new Photons.ColorInterpolatorOperator(true)
    );
    emberColorOperator.addElementsFromParameters([
      [[1.0, 0.7, 0.0], 0.0],
      [[1.0, 0.4, 0.0], 0.5],
      [[0.7, 0.2, 0.0], 1.0],
    ]);

    const acceleratorOperatorGenerator = new Photons.SphereRandomGenerator(
      Math.PI * 2.0,
      0.0,
      Math.PI,
      -Math.PI / 2,
      30.0,
      -15,
      scale,
      scale,
      scale,
      0.0,
      0.0,
      0.0
    );

    embersParticleSystem.addParticleStateOperator(
      new Photons.AccelerationOperator(acceleratorOperatorGenerator)
    );

    embersParticleSystem.setSimulateInWorldSpace(true);
    embersParticleSystem.start();

    console.log("Debuging embersParticleSystem: ", embersParticleSystem);
    return embersParticleSystem;
  }

  setupBaseFlame(scale, position) {
    scale *= 7;

    const baseFlameRoot = new THREE.Object3D();
    baseFlameRoot.position.copy(position);

    const texturePath = new URL(
      "../assets/assets-photons/textures/base_flame.png",
      import.meta.url
    ).href;
    const baseFlameTexture = new THREE.TextureLoader().load(
      texturePath,
      function (texture) {
        console.log("Texture loaded:", texture);
      },
      undefined,
      function (err) {
        console.error("Texture loading error:", err);
      }
    );
    const baseFlameAtlas = new Photons.Atlas(baseFlameTexture, texturePath);
    baseFlameAtlas.addFrameSet(18, 0.0, 0.0, 128.0 / 1024.0, 128.0 / 512.0);
    const baseFlameRenderer = new Photons.AnimatedSpriteRenderer(
      this.instancedParticleSystems,
      baseFlameAtlas,
      true
    );

    const baseFlameParticleSystem = new Photons.ParticleSystem(
      baseFlameRoot,
      baseFlameRenderer,
      this.renderer
    );
    baseFlameParticleSystem.init(18);

    baseFlameParticleSystem.setEmitter(new Photons.ConstantParticleEmitter(18));

    baseFlameParticleSystem.addParticleSequence(0, 18);
    const baseFlameParticleSequences =
      baseFlameParticleSystem.getParticleSequences();

    baseFlameParticleSystem.addParticleStateInitializer(
      new Photons.LifetimeInitializer(1.1, 0.0, 0.0, 0.0, false) //Adjust after box and accel design
    );
    baseFlameParticleSystem.addParticleStateInitializer(
      new Photons.RotationInitializer(
        new Photons.RandomGenerator(
          0,
          Math.PI / 2.0,
          -Math.PI / 2.0,
          0.0,
          0.0,
          false
        )
      )
    );
    baseFlameParticleSystem.addParticleStateInitializer(
      new Photons.RotationalSpeedInitializer(1.0, -1.0, 0.0, 0.0, false)
    );
    baseFlameParticleSystem.addParticleStateInitializer(
      new Photons.SizeInitializer(
        new Photons.RandomGenerator(
          THREE.Vector2,
          new THREE.Vector2(0.25 * scale, 0.25 * scale),
          new THREE.Vector2(0.5 * scale, 0.5 * scale),
          0.5,
          0.0,
          false
        )
      )
    );

    baseFlameParticleSystem.addParticleStateInitializer(
      new Photons.BoxPositionInitializer(
        new THREE.Vector3(0.15 * scale, 0.0, 0.15 * scale),
        new THREE.Vector3(-0.025 * scale, 0.1, -0.025 * scale)
      )
    );
    baseFlameParticleSystem.addParticleStateInitializer(
      new Photons.RandomVelocityInitializer(
        new THREE.Vector3(0.05 * scale, 0.2 * scale, 0.05 * scale),
        new THREE.Vector3(-0.025 * scale, 0.8 * scale, -0.025 * scale),
        0.35 * scale,
        0.05 * scale,
        false
      )
    );
    baseFlameParticleSystem.addParticleStateInitializer(
      new Photons.SequenceInitializer(baseFlameParticleSequences)
    );

    baseFlameParticleSystem.addParticleStateOperator(
      new Photons.SequenceOperator(baseFlameParticleSequences, 0.07, false)
    );

    const baseFlameOpacityOperator =
      baseFlameParticleSystem.addParticleStateOperator(
        new Photons.OpacityInterpolatorOperator()
      );
    baseFlameOpacityOperator.addElements([
      [0.1, 0.0],
      [0.5, 0.25],
      [0.15, 0.4],
      [0.0, 1.0],
    ]);

    const baseFlameSizeOperator =
      baseFlameParticleSystem.addParticleStateOperator(
        new Photons.SizeInterpolatorOperator(true)
      );
    baseFlameSizeOperator.addElementsFromParameters([
      [[0.2, 0.2], 0.0],
      [[0.65, 0.65], 0.3],
      [[0.7, 0.7], 0.6],
      [[0.05, 0.05], 1.0],
    ]);

    const baseFlameColorOperator =
      baseFlameParticleSystem.addParticleStateOperator(
        new Photons.ColorInterpolatorOperator(true)
      );
    baseFlameColorOperator.addElementsFromParameters([
      [[1.0, 1.0, 1.0], 0.0],
      [[4.0, 3.0, 2.0], 0.55],
      [[0.8, 0.8, 0.8], 0.7],
      [[0.1, 0.1, 0.1], 1.0],
    ]);

    baseFlameParticleSystem.addParticleStateOperator(
      new Photons.AccelerationOperator(
        new Photons.RandomGenerator(
          THREE.Vector3,
          new THREE.Vector3(0.0, 0.0, 0.0),
          new THREE.Vector3(0.0, 1.5 * scale, 0.0),
          0.0,
          0.0,
          false
        )
      )
    );

    baseFlameParticleSystem.setSimulateInWorldSpace(true);
    baseFlameParticleSystem.start();
    console.log("BaseFlameParticleSystem: ", baseFlameParticleSystem);

    return baseFlameParticleSystem;
  }

  setupBrightFlame(scale, position) {
    scale *= 7.5;

    const brightFlameRoot = new THREE.Object3D();
    brightFlameRoot.position.copy(position);

    const texturePath = new URL(
      "../assets/assets-photons/textures/bright_flame.png",
      import.meta.url
    ).href;
    const brightFlameTexture = new THREE.TextureLoader().load(
      texturePath,
      function (texture) {
        console.log("Texture loaded:", texture);
      },
      undefined,
      function (err) {
        console.error("Texture loading error:", err);
      }
    );
    const brightFlameAtlas = new Photons.Atlas(brightFlameTexture, texturePath);
    brightFlameAtlas.addFrameSet(16, 0.0, 0.0, 212.0 / 1024.0, 256.0 / 1024.0);
    const brightFlameRenderer = new Photons.AnimatedSpriteRenderer(
      this.instancedParticleSystems,
      brightFlameAtlas,
      true
    );

    const brightFlameParticleSystem = new Photons.ParticleSystem(
      brightFlameRoot,
      brightFlameRenderer,
      this.renderer
    );
    brightFlameParticleSystem.init(16);

    brightFlameParticleSystem.setEmitter(
      new Photons.ConstantParticleEmitter(4)
    );

    brightFlameParticleSystem.addParticleSequence(0, 16);
    const brightFlameParticleSequences =
      brightFlameParticleSystem.getParticleSequences();

    brightFlameParticleSystem.addParticleStateInitializer(
      new Photons.LifetimeInitializer(0.0, 0.0, 0.0, 0.0, false)
    );
    brightFlameParticleSystem.addParticleStateInitializer(
      new Photons.RotationInitializer(
        new Photons.RandomGenerator(0, Math.PI, -Math.PI / 2.0, 0.0, 0.0, false)
      )
    );
    brightFlameParticleSystem.addParticleStateInitializer(
      new Photons.RotationalSpeedInitializer(
        Math.PI / 2.0,
        -Math.PI / 4.0,
        0.0,
        0.0,
        false
      )
    );
    brightFlameParticleSystem.addParticleStateInitializer(
      new Photons.SizeInitializer(
        new Photons.RandomGenerator(
          THREE.Vector2,
          new THREE.Vector2(0.0, 0.0),
          new THREE.Vector2(0.0, 0.0),
          0.5 * scale,
          0.4 * scale,
          false
        )
      )
    );
    brightFlameParticleSystem.addParticleStateInitializer(
      new Photons.BoxPositionInitializer(
        new THREE.Vector3(0.1 * scale, 0.0, 0.1 * scale),
        new THREE.Vector3(-0.05 * scale, 0.0, -0.05 * scale)
      )
    );
    brightFlameParticleSystem.addParticleStateInitializer(
      new Photons.RandomVelocityInitializer(
        new THREE.Vector3(0.02 * scale, 0.4 * scale, 0.02 * scale),
        new THREE.Vector3(-0.01 * scale, 0.1 * scale, -0.01 * scale),
        0.1 * scale,
        0.2 * scale,
        false
      )
    );
    brightFlameParticleSystem.addParticleStateInitializer(
      new Photons.SequenceInitializer(brightFlameParticleSequences)
    );

    brightFlameParticleSystem.addParticleStateOperator(
      new Photons.SequenceOperator(brightFlameParticleSequences, 0.1, false)
    );

    const brightFlameOpacityOperator =
      brightFlameParticleSystem.addParticleStateOperator(
        new Photons.OpacityInterpolatorOperator()
      );
    brightFlameOpacityOperator.addElements([
      [0.2, 0.0],
      [1.0, 0.2],
      [0.5, 0.5],
      [0.0, 1.0],
    ]);

    const brightFlameSizeOperator =
      brightFlameParticleSystem.addParticleStateOperator(
        new Photons.SizeInterpolatorOperator(true)
      );
    brightFlameSizeOperator.addElementsFromParameters([
      [[0.3, 0.3], 0.0],
      [[1.0, 1.0], 0.4],
      [[1.0, 1.0], 0.55],
      [[0.65, 0.65], 0.7],
      [[0.0, 0.0], 1.0],
    ]);

    const brightFlameColorOperator =
      brightFlameParticleSystem.addParticleStateOperator(
        new Photons.ColorInterpolatorOperator(true)
      );
    brightFlameColorOperator.addElementsFromParameters([
      [[1.0, 1.0, 1.0], 0.0],
      [[2.0, 2.0, 2.0], 0.3],
      [[2.0, 1.5, 1.5], 0.5],
      [[0.9, 0.6, 0.3], 0.65],
      [[0.75, 0.0, 0.0], 1.0],
    ]);

    brightFlameParticleSystem.addParticleStateOperator(
      new Photons.AccelerationOperator(
        new Photons.RandomGenerator(
          THREE.Vector3,
          new THREE.Vector3(0.0, 0.0, 0.0),
          new THREE.Vector3(0.0, 1.2 * scale, 0.0),
          0.0,
          0.0,
          false
        )
      )
    );

    brightFlameParticleSystem.setSimulateInWorldSpace(true);
    brightFlameParticleSystem.start();
    console.log("BrightFlameParticleSystem: ", brightFlameParticleSystem);

    return brightFlameParticleSystem;
  }

  setupSmoke(scale, position) {
    //testing
    scale *= 5;

    const smokeRoot = new THREE.Object3D();
    smokeRoot.position.copy(position);

    const texturePath = new URL(
      "../assets/textures/SmokePuff04.png",
      import.meta.url
    ).href;
    const smokeTexture = new THREE.TextureLoader().load(
      texturePath,
      function (texture) {
        console.log("Texture loaded:", texture);
      },
      undefined,
      function (err) {
        console.error("Texture loading error:", err);
      }
    );
    const smokeAtlas = new Photons.Atlas(smokeTexture, texturePath);
    smokeAtlas.addFrameSet(25, 0.0, 0.0, 409.6 / 2048.0, 409.6 / 2048.0);
    const smokeRenderer = new Photons.AnimatedSpriteRenderer(
      this.instancedParticleSystems,
      smokeAtlas,
      true
    );

    const smokeParticleSystem = new Photons.ParticleSystem(
      smokeRoot,
      smokeRenderer,
      this.renderer
    );
    smokeParticleSystem.init(100);

    smokeParticleSystem.setEmitter(new Photons.ConstantParticleEmitter(25));

    smokeParticleSystem.addParticleSequence(0, 100);
    const smokeParticleSequences = smokeParticleSystem.getParticleSequences();

    smokeParticleSystem.addParticleStateInitializer(
      new Photons.LifetimeInitializer(4.0, 2.0, 0.0, 0.0, false)
    );
    smokeParticleSystem.addParticleStateInitializer(
      new Photons.SizeInitializer(
        new Photons.RandomGenerator(
          THREE.Vector2,
          new THREE.Vector2(0.25 * scale, 0.25 * scale),
          new THREE.Vector2(0.5 * scale, 0.5 * scale),
          0.0,
          0.0,
          false
        )
      )
    );
    smokeParticleSystem.addParticleStateInitializer(
      new Photons.BoxPositionInitializer(
        new THREE.Vector3(0.25 * scale, 0.1 * scale, 0.25 * scale),
        new THREE.Vector3(-0.1 * scale, 0.0 * scale, -0.1 * scale)
      )
    );
    smokeParticleSystem.addParticleStateInitializer(
      new Photons.RandomVelocityInitializer(
        new THREE.Vector3(0.2 * scale, 0.06 * scale, 0.2 * scale),
        new THREE.Vector3(-0.01 * scale, 0.04 * scale, -0.01 * scale),
        0.03 * scale,
        -0.3 * scale,
        false
      )
    );

    smokeParticleSystem.addParticleStateInitializer(
      new Photons.SequenceInitializer(smokeParticleSequences)
    );
    smokeParticleSystem.addParticleStateOperator(
      new Photons.SequenceOperator(smokeParticleSequences, 0.1, false)
    );

    const smokeOpacityOperator = smokeParticleSystem.addParticleStateOperator(
      new Photons.OpacityInterpolatorOperator()
    );
    smokeOpacityOperator.addElements([
      [0.6, 0.0],
      [0.7, 0.1],
      [0.8, 0.5],
      [1.0, 1.0],
    ]);

    const smokeSizeOperator = smokeParticleSystem.addParticleStateOperator(
      new Photons.SizeInterpolatorOperator(true)
    );
    smokeSizeOperator.addElementsFromParameters([
      [[0.3, 0.3], 0.0],
      [[0.8, 0.8], 0.25],
      [[1.0, 1.0], 0.5],
      [[0.5, 0.5], 0.65],
      [[0.25, 0.25], 1.0],
    ]);

    const smokeColorOperator = smokeParticleSystem.addParticleStateOperator(
      new Photons.ColorInterpolatorOperator(true)
    );
    smokeColorOperator.addElementsFromParameters([
      [[0.6, 0.6, 0.6], 0.0], // Starting gray
      [[0.8, 0.8, 0.8], 0.2],
      [[1.0, 1.0, 1.0], 1.0], // Fade to white
    ]);

    smokeParticleSystem.addParticleStateOperator(
      new Photons.AccelerationOperator(
        new Photons.RandomGenerator(
          THREE.Vector3,
          new THREE.Vector3(0.0, 0.0, 0.0),
          new THREE.Vector3(0.1, 1.3 * scale, 0.1),
          1.0,
          -1.0,
          false
        )
      )
    );

    smokeParticleSystem.setSimulateInWorldSpace(true);
    smokeParticleSystem.start();
    console.log("SmokeParticleSystem: ", smokeParticleSystem);

    return smokeParticleSystem;
  }

  //   setupSmokeNew(scale, position) {
  //     //testing
  //     //scale *= 5;

  //     const smokeRoot = new THREE.Object3D();
  //     smokeRoot.position.copy(position);

  //     const texturePath = new URL(
  //       "../assets/textures/SmokePuff04.png",
  //       import.meta.url
  //     ).href;
  //     const smokeTexture = new THREE.TextureLoader().load(
  //       texturePath,
  //       function (texture) {
  //         console.log("Texture loaded:", texture);
  //       },
  //       undefined,
  //       function (err) {
  //         console.error("Texture loading error:", err);
  //       }
  //     );
  //     const smokeAtlas = new Photons.Atlas(smokeTexture, texturePath);
  //     smokeAtlas.addFrameSet(25, 0.0, 0.0, 409.6 / 2048.0, 409.6 / 2048.0);
  //     const smokeRenderer = new Photons.AnimatedSpriteRenderer(
  //       this.instancedParticleSystems,
  //       smokeAtlas,
  //       true
  //     );

  //     const smokeParticleSystem = new Photons.ParticleSystem(
  //       smokeRoot,
  //       smokeRenderer,
  //       this.renderer
  //     );
  //     smokeParticleSystem.init(100);

  //     smokeParticleSystem.setEmitter(new Photons.ConstantParticleEmitter(40));

  //     smokeParticleSystem.addParticleSequence(0, 250);
  //     const smokeParticleSequences = smokeParticleSystem.getParticleSequences();

  //     smokeParticleSystem.addParticleStateInitializer(
  //       new Photons.LifetimeInitializer(1.5, 1.0, 0.0, 0.0, false)
  //     );

  //     //
  //     // smokeParticleSystem.addParticleStateInitializer(
  //     //   new Photons.RotationInitializer(
  //     //     new Photons.RandomGenerator(0, Math.PI, -Math.PI / 2.0, 0.0, 0.0, false)
  //     //   )
  //     // );
  //     // smokeParticleSystem.addParticleStateInitializer(
  //     //   new Photons.RotationalSpeedInitializer(
  //     //     Math.PI / 2.0,
  //     //     -Math.PI / 4.0,
  //     //     0.0,
  //     //     0.0,
  //     //     false
  //     //   )
  //     // );
  //     //

  //     smokeParticleSystem.addParticleStateInitializer(
  //       new Photons.SizeInitializer(
  //         new Photons.RandomGenerator(
  //           THREE.Vector2,
  //           new THREE.Vector2((1.0 * scale) / 5, (1.0 * scale) / 5),
  //           new THREE.Vector2((3.0 * scale) / 5, (3.0 * scale) / 5),
  //           0.0,
  //           0.0,
  //           false
  //         )
  //       )
  //     );
  //     smokeParticleSystem.addParticleStateInitializer(
  //       new Photons.BoxPositionInitializer(
  //         new THREE.Vector3(0.1 * scale, 0.1 * scale, 0.1 * scale),
  //         new THREE.Vector3(-0.05 * scale, 0.05 * scale, -0.05 * scale)
  //       )
  //     );
  //     smokeParticleSystem.addParticleStateInitializer(
  //       new Photons.RandomVelocityInitializer(
  //         new THREE.Vector3(5.0 * scale, 5.0 * scale, 5.0 * scale),
  //         new THREE.Vector3(2.0 * scale, 2.0 * scale, 2.0 * scale),
  //         0.3 * scale,
  //         0.4 * scale,
  //         false
  //       )
  //     );

  //     smokeParticleSystem.addParticleStateInitializer(
  //       new Photons.SequenceInitializer(smokeParticleSequences)
  //     );
  //     smokeParticleSystem.addParticleStateOperator(
  //       new Photons.SequenceOperator(smokeParticleSequences, 0.1, false)
  //     );

  //     const smokeOpacityOperator = smokeParticleSystem.addParticleStateOperator(
  //       new Photons.OpacityInterpolatorOperator()
  //     );
  //     smokeOpacityOperator.addElements([
  //       [1.0, 0.0],
  //       [0.1, 0.25],
  //       [0.9, 0.25],
  //       [1.0, 0.0],
  //     ]);

  //     const smokeSizeOperator = smokeParticleSystem.addParticleStateOperator(
  //       new Photons.SizeInterpolatorOperator(true)
  //     );
  //     smokeSizeOperator.addElementsFromParameters([
  //       [[0.5 * scale, 0.5 * scale], 0.0],
  //       [[1.0 * scale, 1.0 * scale], 0.4],
  //       [[1.5 * scale, 1.5 * scale], 0.7],
  //       [[0.75 * scale, 0.75 * scale], 1.0],
  //     ]);

  //     const smokeColorOperator = smokeParticleSystem.addParticleStateOperator(
  //       new Photons.ColorInterpolatorOperator(true)
  //     );
  //     smokeColorOperator.addElementsFromParameters([
  //       [[0.5, 0.5, 0.5], 0.0], // Starting gray
  //       [[0.7, 0.7, 0.7], 0.1],
  //       [[0.8, 0.8, 0.8], 0.5],
  //       [[1.0, 1.0, 1.0], 1.0], // Fade to white
  //     ]);

  //     smokeParticleSystem.addParticleStateOperator(
  //       new Photons.AccelerationOperator(
  //         new Photons.RandomGenerator(
  //           THREE.Vector3,
  //           new THREE.Vector3(0.0, 0.1 * scale, 0.0),
  //           new THREE.Vector3(0.0, 0.2 * scale, 0.0),
  //           0.0,
  //           0.0,
  //           false
  //         )
  //       )
  //     );

  //     smokeParticleSystem.setSimulateInWorldSpace(true);
  //     smokeParticleSystem.start();
  //     console.log("SmokeParticleSystem: ", smokeParticleSystem);

  //     return smokeParticleSystem;

  //     // brightFlameParticleSystem.addParticleStateInitializer(
  //     //   new Photons.RotationInitializer(
  //     //     new Photons.RandomGenerator(0, Math.PI, -Math.PI / 2.0, 0.0, 0.0, false)
  //     //   )
  //     // );
  //     // brightFlameParticleSystem.addParticleStateInitializer(
  //     //   new Photons.RotationalSpeedInitializer(
  //     //     Math.PI / 2.0,
  //     //     -Math.PI / 4.0,
  //     //     0.0,
  //     //     0.0,
  //     //     false
  //     //   )
  //     // );
  //   }

  setupSceneComponents() {
    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.5);
    this.scene.add(directionalLight);
    directionalLight.position.set(5, 5, 5);

    //TODO - missing model path, GLTFLoader is used by third party lib, change if it causes problems
    const modelLoader = new GLTFLoader();
    const graveyardPath = new URL(
      "../assets/assets-photons/models/pumpkin_graveyard/pumpkin_graveyard.gltf",
      import.meta.url
    ).href;
    const graveyardLoadPromise = new Promise((resolve, reject) => {
      modelLoader.load(
        graveyardPath,
        (object) => {
          resolve(object);
        },
        null,
        (err) => {
          console.error("Error loading the model Graveyard:", err);
          reject(err);
        }
      );
    });

    const torchPath = new URL(
      "../assets/assets-photons/models/cartoon_torch/cartoon_torch.gltf",
      import.meta.url
    ).href;
    const torchLoadPromise = new Promise((resolve, reject) => {
      modelLoader.load(
        torchPath,
        (object) => {
          resolve(object);
        },
        null,
        (err) => {
          console.error("Error loading the model Torch:", err);
          reject(err);
        }
      );
    });

    const campfirePath = new URL(
      "../assets/models/campfire14.gltf",
      import.meta.url
    ).href;
    const campfireLoadPromise = new Promise((resolve, reject) => {
      modelLoader.load(
        campfirePath,
        (object) => {
          resolve(object);
        },
        null,
        (err) => {
          console.log("Error loading the model Campfire: ", err);
          reject(err);
        }
      );
    });

    return Promise.all([
      graveyardLoadPromise,
      torchLoadPromise,
      campfireLoadPromise,
    ]).then(([graveyardObject, torchObject, campfireObject]) => {
      //this.scene.add(graveyardObject.scene);
      Scene.traverseScene(graveyardObject.scene, (node) => {
        if (node.isMesh) {
          if (node.name == "Opaque") {
            node.castShadow = true;
            node.recieveShadow = true;
            const oldMaterial = node.material;
            node.material = new THREE.MeshStandardMaterial();
            node.material.map = oldMaterial.map;
            node.material.normalMap = oldMaterial.normalMap;
            node.material.normalScale.copy(oldMaterial.normalScale);
            node.material.roughness = 0.6;
          }
        }
      });

      graveyardObject.scene.scale.set(0.75, 0.75, 0.75);

      //Fog is missing, probably should be commented out
      // const fogParent = new THREE.Object3D();
      // const fogGeometry = new THREE.PlaneGeometry(1, 1);
      // const fogMaterial = new FogMaterial({
      //   side: THREE.DoubleSide,
      // });
      // fogMaterial.transparent = true;
      // fogMaterial.depthWrite = false;
      // const fogPlane = new THREE.Mesh(fogGeometry, fogMaterial);
      // fogPlane.scale.set(32, 32, 0);
      // fogPlane.rotateX(-Math.PI / 2);
      // fogParent.add(fogPlane);
      // fogParent.position.y += 1.0;
      // this.scene.add(fogParent);

      let torchPostPosition = new THREE.Vector3(-0.31, 1, 1.65);
      this.scene.add(torchObject.scene);
      Scene.traverseScene(torchObject.scene, (node) => {
        if (node.isMesh) {
          node.castShadow = false;
          node.recieveShadow = false;
        }
      });
      torchObject.scene.scale.set(1.2, 1.15, 1.2);
      torchObject.scene.position.copy(torchPostPosition);

      let campfirePosition = new THREE.Vector3(-0.31, 1, 1.65);
      this.scene.add(campfireObject.scene);
      Scene.traverseScene(campfireObject.scene, (node) => {
        if (node.isMesh) {
          if (node.name == "Opaque") {
            node.castShadow = true;
            node.recieveShadow = true;
            const oldMaterial = node.material;
            node.material = new THREE.MeshStandardMaterial();
            node.material.map = oldMaterial.map;
            node.material.normalMap = oldMaterial.normalMap;
            node.material.normalScale.copy(oldMaterial.normalScale);
            node.material.roughness = 0.6;
          }
        }
      });
      campfireObject.scene.scale.set(1.2, 1.15, 1.2);
      campfireObject.scene.position.copy(campfirePosition);

      const lightParent = new THREE.Object3D();
      this.scene.add(lightParent);
      lightParent.position.copy(torchPostPosition);
      lightParent.position.add(new THREE.Vector3(0.0, 0.65, 0.0));

      const flickerLightShadows = {
        mapSize: 1024,
        cameraNear: 0.5,
        cameraFar: 500,
        bias: 0.000009,
        edgeRadius: 3,
      };
      this.manager.addComponent(
        new Photons.FlickerLight(
          lightParent,
          10, //Should be 10 but for testing 0 = disabled light
          2,
          new THREE.Color().setRGB(1, 0.8, 0.4),
          0,
          1.0,
          flickerLightShadows
        )
      );
    });
  }
}
