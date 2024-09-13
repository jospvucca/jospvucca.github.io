import * as THREE from "three";

export class BlackHole {
  constructor() {
    this.uniforms = {
      time: { value: 0.0 },
      resolution: {
        value: new THREE.Vector2(window.innerWidth, window.innerHeight),
      },
      cam_pos: { value: new THREE.Vector3() },
      blackHoleMass: { value: 1.0 }, // mass of the black hole
      blackHoleRadius: { value: 1.0 }, // event horizon radius
    };

    this.geometry = new THREE.PlaneGeometry(20, 20, 32, 32); // Bigger plane for effects

    this.material = new THREE.ShaderMaterial({
      uniforms: this.uniforms,
      vertexShader: this.vertexShader(),
      fragmentShader: this.fragmentShader(),
    });

    this.mesh = new THREE.Mesh(this.geometry, this.material);
  }

  vertexShader() {
    return `
      varying vec2 vUv;
      void main() {
        vUv = uv;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `;
  }

  fragmentShader() {
    return `
    uniform float time;
uniform vec2 resolution;
uniform vec3 cam_pos;
uniform float blackHoleMass;
uniform float blackHoleRadius;

varying vec2 vUv;

// Simulates gravitational lensing
vec2 distort(vec2 uv, float schwarzschildRadius) {
  vec2 centeredUv = uv - vec2(0.5, 0.5);
  float dist = length(centeredUv);
  
  // Add a small value to avoid dividing by zero
  float distortion = 1.0 / (1.0 + (dist / schwarzschildRadius)); 
  return centeredUv * distortion + vec2(0.5, 0.5);
}

void main() {
  float schwarzschildRadius = 2.0 * blackHoleMass;

  // Distort UV based on distance
  vec2 distortedUv = distort(vUv, schwarzschildRadius);
  
  // Initialize black color
  gl_FragColor = vec4(0.0, 0.0, 0.0, 1.0);  
  
  // Black hole core: completely black inside radius
  if (length(distortedUv - vec2(0.5, 0.5)) < blackHoleRadius) {
    gl_FragColor.rgb = vec3(0.0); 
  } else {
    // Gravitational lensing with light bending effect
    gl_FragColor.rgb = vec3(1.0) * pow(1.0 - length(distortedUv - vec2(0.5, 0.5)), 3.0);
  }
}

    `;
  }

  update(deltaTime, cameraPosition) {
    this.uniforms.time.value += deltaTime;
    this.uniforms.cam_pos.value.copy(cameraPosition);
  }

  getMesh() {
    return this.mesh;
  }
}
