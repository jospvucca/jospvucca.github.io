import * as THREE from "three";

export class Observer {
  constructor() {
    this.position = new THREE.Vector3(10, 0, 0);
    this.velocity = new THREE.Vector3(0, 1, 0);
    this.orientation = new THREE.Matrix3();
    this.time = 0.0;
  }

  orbitalFrame() {
    const orbital_y = this.velocity
      .clone()
      .normalize()
      .multiplyScalar(4.0)
      .sub(this.position)
      .normalize();
    const orbital_z = new THREE.Vector3()
      .crossVectors(this.position, orbital_y)
      .normalize();
    const orbital_x = new THREE.Vector3().crossVectors(orbital_y, orbital_z);

    return new THREE.Matrix4()
      .makeBasis(orbital_x, orbital_y, orbital_z)
      .linearPart();
  }

  move(dt, shaderParams) {
    dt *= shaderParams.time_scale;
    let r;
    let v = 0;

    if (shaderParams.observer.motion) {
      r = shaderParams.observer.distance;
      v = 1.0 / Math.sqrt(2.0 * (r - 1.0));
      const ang_vel = v / r;
      const angle = this.time * ang_vel;

      const s = Math.sin(angle);
      const c = Math.cos(angle);

      this.position.set(c * r, s * r, 0);
      this.velocity.set(-s * v, c * v, 0);

      const alpha = (shaderParams.observer.orbital_inclination * Math.PI) / 180;
      const orbit_coords = new THREE.Matrix4().makeRotationY(alpha);

      this.position.applyMatrix4(orbit_coords);
      this.velocity.applyMatrix4(orbit_coords);
    } else {
      r = this.position.length();
    }

    if (shaderParams.gravitational_time_dilation) {
      dt = Math.sqrt((dt * dt * (1.0 - v * v)) / (1 - 1.0 / r));
    }

    this.time += dt;
  }
}
