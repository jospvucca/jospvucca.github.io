import * as THREE from "three";
import * as Photons from "../photons/photons.module.js";
import { GLTFLoader } from "three/examples/jsm/Addons.js";
import { Observer } from "../galaxy/Observer.js";
import { ShaderLoader } from "../galaxy/Shader.js";
import { Shader } from "../galaxy/Shader.js";
import { createShaderProjectionPlane } from "../galaxy/render.js";
import { loadTextures } from "../galaxy/render.js";

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
    this.observer = new Observer();
    this.uniforms = {
      time: { type: "f", value: 0.0 },
      resolution: { type: "v2", value: new THREE.Vector2() },
      accretion_disk: { type: "b", value: false },
      use_disk_texture: { type: "b", value: true },
      lorentz_transform: { type: "b", value: false },
      doppler_shift: { type: "b", value: false },
      beaming: { type: "b", value: false },
      cam_pos: { type: "v3", value: new THREE.Vector3() },
      cam_vel: { type: "v3", value: new THREE.Vector3() },
      cam_dir: { type: "v3", value: new THREE.Vector3() },
      cam_up: { type: "v3", value: new THREE.Vector3() },
      fov: { type: "f", value: 0.0 },
      bg_texture: { type: "t", value: null },
      star_texture: { type: "t", value: null },
      disk_texture: { type: "t", value: null },
    };
    this.lastframe = Date.now();
    this.delta = 0;
    this.time = 0;
  }

  async initBlackHole() {
    const textures = await loadTextures();

    // Create the shader projection plane (using your custom shader logic)
    const { mesh, changePerformanceQuality } =
      await createShaderProjectionPlane(this.uniforms);

    // Add the black hole shader mesh to the scene
    this.scene.add(mesh);
  }

  // Updates shader uniforms periodically
  updateUniforms() {
    if (!this.shader || !this.shader.parameters) {
      console.warn("Shader or shader parameters are not initialized yet.");
      return;
    }

    uniforms.time.value = time;
    uniforms.resolution.value.x =
      window.innerWidth * performanceConfig.resolution;
    uniforms.resolution.value.y =
      window.innerHeight * performanceConfig.resolution;

    uniforms.cam_pos.value = observer.position;
    uniforms.cam_dir.value = observer.direction;
    uniforms.cam_up.value = observer.up;
    uniforms.fov.value = observer.fov;

    uniforms.cam_vel.value = observer.velocity;

    uniforms.bg_texture.value = textures.get("bg1");
    uniforms.star_texture.value = textures.get("star");
    uniforms.disk_texture.value = textures.get("disk");

    bloomPass.strength = bloomConfig.strength;
    bloomPass.radius = bloomConfig.radius;
    bloomPass.threshold = bloomConfig.threshold;

    observer.distance = cameraConfig.distance;
    observer.moving = cameraConfig.orbit;
    observer.fov = cameraConfig.fov;
    uniforms.lorentz_transform.value = effectConfig.lorentz_transform;
    uniforms.accretion_disk.value = effectConfig.accretion_disk;
    uniforms.use_disk_texture.value = effectConfig.use_disk_texture;
    uniforms.doppler_shift.value = effectConfig.doppler_shift;
    uniforms.beaming.value = effectConfig.beaming;
  }

  // Updates the shader material
  updateShader() {
    this.shader.fragment = this.shader.compile();
    this.scene.traverse((child) => {
      if (child.isMesh) {
        child.material.fragmentShader = this.shader.fragment;
        child.material.needsUpdate = true;
      }
    });
  }

  // Load shader files from URLs
  async loadShaderFile(url) {
    return fetch(url)
      .then((response) => response.text())
      .catch((err) => {
        console.error(`Failed to load shader: ${url}`, err);
      });
  }

  build() {
    //TODO - missing file
    // const loadingSpinner = new LoadingSpinner();
    // loadingSpinner.show();
    this.setupSceneComponents().then(async () => {
      //TODO - missing file
      // loadingSpinner.hide();
      console.log("Stop spinning.");
      this.setupParticleSystems();
      await this.initBlackHole();
    });
  }

  // addBlackHole() {
  //   // Create shader material and black hole mesh
  //   const material = new THREE.ShaderMaterial({
  //     uniforms: this.uniforms,
  //     vertexShader: vertexShader(),
  //     fragmentShader: shader.compile(), // Compile the fragment shader using your shader logic
  //   });

  //   const blackHoleMesh = new THREE.Mesh(
  //     new THREE.SphereGeometry(1, 32, 32),
  //     material
  //   );
  //   this.scene.add(blackHoleMesh);
  // }

  setupShader() {
    this.uniforms.planet_distance.value =
      this.shader.parameters.planet.distance;
    this.uniforms.planet_radius.value = this.shader.parameters.planet.radius;

    const geometry = new THREE.PlaneGeometry(2, 2); // Replacing deprecated PlaneBufferGeometry
    const material = new THREE.ShaderMaterial({
      uniforms: this.uniforms,
      vertexShader: this.shader.vertexShader, // Vertex shader loaded earlier
      fragmentShader: this.shader.compile(), // Compiled fragment shader
    });

    const mesh = new THREE.Mesh(geometry, material);
    this.scene.add(mesh);
  }

  vertexShader() {
    return `
      void main() {
        gl_Position = vec4(position, 1.0);
      }
    `;
  }

  fragmentShader() {
    return `
#define M_PI 3.141592653589793238462643383279
#define R_SQRT_2 0.7071067811865475
#define DEG_TO_RAD (M_PI/180.0)
#define SQ(x) ((x)*(x))

#define ROT_Y(a) mat3(0, cos(a), sin(a), 1, 0, 0, 0, sin(a), -cos(a))


// spectrum texture lookup helper macros
const float BLACK_BODY_TEXTURE_COORD = 1.0;
const float SINGLE_WAVELENGTH_TEXTURE_COORD = 0.5;
const float TEMPERATURE_LOOKUP_RATIO_TEXTURE_COORD = 0.0;

// black-body texture metadata
const float SPECTRUM_TEX_TEMPERATURE_RANGE = 65504.0;
const float SPECTRUM_TEX_WAVELENGTH_RANGE = 2048.0;
const float SPECTRUM_TEX_RATIO_RANGE = 6.48053329012;

// multi-line macros don't seem to work in WebGL :(
#define BLACK_BODY_COLOR(t) texture2D(spectrum_texture, vec2((t) / SPECTRUM_TEX_TEMPERATURE_RANGE, BLACK_BODY_TEXTURE_COORD))
#define SINGLE_WAVELENGTH_COLOR(lambda) texture2D(spectrum_texture, vec2((lambda) / SPECTRUM_TEX_WAVELENGTH_RANGE, SINGLE_WAVELENGTH_TEXTURE_COORD))
#define TEMPERATURE_LOOKUP(ratio) (texture2D(spectrum_texture, vec2((ratio) / SPECTRUM_TEX_RATIO_RANGE, TEMPERATURE_LOOKUP_RATIO_TEXTURE_COORD)).r * SPECTRUM_TEX_TEMPERATURE_RANGE)

uniform vec2 resolution;
uniform float time;

uniform vec3 cam_pos;
uniform vec3 cam_x;
uniform vec3 cam_y;
uniform vec3 cam_z;
uniform vec3 cam_vel;

uniform float planet_distance, planet_radius;

uniform sampler2D galaxy_texture, star_texture,
    accretion_disk_texture, planet_texture, spectrum_texture;

// stepping parameters
const int NSTEPS = {{n_steps}};
const float MAX_REVOLUTIONS = 2.0;

const float ACCRETION_MIN_R = 1.5;
const float ACCRETION_WIDTH = 5.0;
const float ACCRETION_BRIGHTNESS = 0.9;
const float ACCRETION_TEMPERATURE = 3900.0;

const float STAR_MIN_TEMPERATURE = 4000.0;
const float STAR_MAX_TEMPERATURE = 15000.0;

const float STAR_BRIGHTNESS = 1.0;
const float GALAXY_BRIGHTNESS = 0.4;

const float PLANET_AMBIENT = 0.1;
const float PLANET_LIGHTNESS = 1.5;

// background texture coordinate system
mat3 BG_COORDS = ROT_Y(45.0 * DEG_TO_RAD);

// planet texture coordinate system
const float PLANET_AXIAL_TILT = 30.0 * DEG_TO_RAD;
mat3 PLANET_COORDS = ROT_Y(PLANET_AXIAL_TILT);

const float FOV_ANGLE_DEG = 90.0;
float FOV_MULT = 1.0 / tan(DEG_TO_RAD * FOV_ANGLE_DEG*0.5);

// derived "constants" (from uniforms)
float PLANET_RADIUS,
    PLANET_DISTANCE,
    PLANET_ORBITAL_ANG_VEL,
    PLANET_ROTATION_ANG_VEL,
    PLANET_GAMMA;

vec2 sphere_map(vec3 p) {
    return vec2(atan(p.x,p.y)/M_PI*0.5+0.5, asin(p.z)/M_PI+0.5);
}

float smooth_step(float x, float threshold) {
    const float STEEPNESS = 1.0;
    return 1.0 / (1.0 + exp(-(x-threshold)*STEEPNESS));
}

vec3 lorentz_velocity_transformation(vec3 moving_v, vec3 frame_v) {
    float v = length(frame_v);
    if (v > 0.0) {
        vec3 v_axis = -frame_v / v;
        float gamma = 1.0/sqrt(1.0 - v*v);

        float moving_par = dot(moving_v, v_axis);
        vec3 moving_perp = moving_v - v_axis*moving_par;

        float denom = 1.0 + v*moving_par;
        return (v_axis*(moving_par+v)+moving_perp/gamma)/denom;
    }
    return moving_v;
}

vec3 contract(vec3 x, vec3 d, float mult) {
    float par = dot(x,d);
    return (x-par*d) + d*par*mult;
}

vec4 planet_intersection(vec3 old_pos, vec3 ray, float t, float dt,
        vec3 planet_pos0, float ray_doppler_factor) {

    vec4 ret = vec4(0,0,0,0);
    vec3 ray0 = ray;
    ray = ray/dt;

    vec3 planet_dir = vec3(planet_pos0.y, -planet_pos0.x, 0.0) / PLANET_DISTANCE;

    {{#light_travel_time}}
    float planet_ang1 = (t-dt) * PLANET_ORBITAL_ANG_VEL;
    vec3 planet_pos1 = vec3(cos(planet_ang1), sin(planet_ang1), 0)*PLANET_DISTANCE;
    vec3 planet_vel = (planet_pos1-planet_pos0)/dt;

    // transform to moving planet coordinate system
    ray = ray - planet_vel;
    {{/light_travel_time}}
    {{^light_travel_time}}
    vec3 planet_vel = planet_dir * PLANET_ORBITAL_ANG_VEL * PLANET_DISTANCE;
    {{/light_travel_time}}

    // ray-sphere intersection
    vec3 d = old_pos - planet_pos0;

    {{#lorentz_contraction}}
    ray = contract(ray, planet_dir, PLANET_GAMMA);
    d = contract(d, planet_dir, PLANET_GAMMA);
    {{/lorentz_contraction}}

    float dotp = dot(d,ray);
    float c_coeff = dot(d,d) - SQ(PLANET_RADIUS);
    float ray2 = dot(ray, ray);
    float discr = dotp*dotp - ray2*c_coeff;

    if (discr < 0.0) return ret;
    float isec_t = (-dotp - sqrt(discr)) / ray2;

    float MIN_ISEC_DT = 0.0;
    {{#lorentz_contraction}}
    MIN_ISEC_DT = -dt;
    {{/lorentz_contraction}}

    if (isec_t < MIN_ISEC_DT || isec_t > dt) return ret;

    vec3 surface_point = (d + isec_t*ray) / PLANET_RADIUS;

    isec_t = isec_t/dt;

    vec3 light_dir = planet_pos0;
    float rot_phase = t;

    {{#light_travel_time}}
    light_dir += planet_vel*isec_t*dt;
    rot_phase -= isec_t*dt;
    {{/light_travel_time}}

    rot_phase = rot_phase * PLANET_ROTATION_ANG_VEL*0.5/M_PI;
    light_dir = light_dir / PLANET_DISTANCE;

    {{#light_travel_time}}
    light_dir = light_dir - planet_vel;
    {{/light_travel_time}}

    vec3 surface_normal = surface_point;
    {{#lorentz_contraction}}
    light_dir = contract(light_dir, planet_dir, PLANET_GAMMA);
    {{/lorentz_contraction}}
    light_dir = normalize(light_dir);

    vec2 tex_coord = sphere_map(surface_point * PLANET_COORDS);
    tex_coord.x = mod(tex_coord.x + rot_phase, 1.0);

    float diffuse = max(0.0, dot(surface_normal, -light_dir));
    float lightness = ((1.0-PLANET_AMBIENT)*diffuse + PLANET_AMBIENT) *
        PLANET_LIGHTNESS;

    float light_temperature = ACCRETION_TEMPERATURE;
    {{#doppler_shift}}
    float doppler_factor = SQ(PLANET_GAMMA) *
        (1.0 + dot(planet_vel, light_dir)) *
        (1.0 - dot(planet_vel, normalize(ray)));
    light_temperature /= doppler_factor * ray_doppler_factor;
    {{/doppler_shift}}

    vec4 light_color = BLACK_BODY_COLOR(light_temperature);
    ret = texture2D(planet_texture, tex_coord) * lightness * light_color;
    if (isec_t < 0.0) isec_t = 0.5;
    ret.w = isec_t;

    return ret;
}

vec4 galaxy_color(vec2 tex_coord, float doppler_factor) {

    vec4 color = texture2D(galaxy_texture, tex_coord);
    {{^observerMotion}}
    return color;
    {{/observerMotion}}

    {{#observerMotion}}
    vec4 ret = vec4(0.0,0.0,0.0,0.0);
    float red = max(0.0, color.r - color.g);

    const float H_ALPHA_RATIO = 0.1;
    const float TEMPERATURE_BIAS = 0.95;

    color.r -= red*H_ALPHA_RATIO;

    float i1 = max(color.r, max(color.g, color.b));
    float ratio = (color.g+color.b) / color.r;

    if (i1 > 0.0 && color.r > 0.0) {

        float temperature = TEMPERATURE_LOOKUP(ratio) * TEMPERATURE_BIAS;
        color = BLACK_BODY_COLOR(temperature);

        float i0 = max(color.r, max(color.g, color.b));
        if (i0 > 0.0) {
            temperature /= doppler_factor;
            ret = BLACK_BODY_COLOR(temperature) * max(i1/i0,0.0);
        }
    }

    ret += SINGLE_WAVELENGTH_COLOR(656.28 * doppler_factor) * red / 0.214 * H_ALPHA_RATIO;

    return ret;
    {{/observerMotion}}
}

void main() {

    {{#planetEnabled}}
    // "constants" derived from uniforms
    PLANET_RADIUS = planet_radius;
    PLANET_DISTANCE = max(planet_distance,planet_radius+1.5);
    PLANET_ORBITAL_ANG_VEL = -1.0 / sqrt(2.0*(PLANET_DISTANCE-1.0)) / PLANET_DISTANCE;
    float MAX_PLANET_ROT = max((1.0 + PLANET_ORBITAL_ANG_VEL*PLANET_DISTANCE) / PLANET_RADIUS,0.0);
    PLANET_ROTATION_ANG_VEL = -PLANET_ORBITAL_ANG_VEL + MAX_PLANET_ROT * 0.5;
    PLANET_GAMMA = 1.0/sqrt(1.0-SQ(PLANET_ORBITAL_ANG_VEL*PLANET_DISTANCE));
    {{/planetEnabled}}

    vec2 p = -1.0 + 2.0 * gl_FragCoord.xy / resolution.xy;
    p.y *= resolution.y / resolution.x;

    vec3 pos = cam_pos;
    vec3 ray = normalize(p.x*cam_x + p.y*cam_y + FOV_MULT*cam_z);

    {{#aberration}}
    ray = lorentz_velocity_transformation(ray, cam_vel);
    {{/aberration}}

    float ray_intensity = 1.0;
    float ray_doppler_factor = 1.0;

    float gamma = 1.0/sqrt(1.0-dot(cam_vel,cam_vel));
    ray_doppler_factor = gamma*(1.0 + dot(ray,-cam_vel));
    {{#beaming}}
    ray_intensity /= ray_doppler_factor*ray_doppler_factor*ray_doppler_factor;
    {{/beaming}}
    {{^doppler_shift}}
    ray_doppler_factor = 1.0;
    {{/doppler_shift}}

    float step = 0.01;
    vec4 color = vec4(0.0,0.0,0.0,1.0);

    // initial conditions
    float u = 1.0 / length(pos), old_u;
    float u0 = u;

    vec3 normal_vec = normalize(pos);
    vec3 tangent_vec = normalize(cross(cross(normal_vec, ray), normal_vec));

    float du = -dot(ray,normal_vec) / dot(ray,tangent_vec) * u;
    float du0 = du;

    float phi = 0.0;
    float t = time;
    float dt = 1.0;

    {{^light_travel_time}}
    float planet_ang0 = t * PLANET_ORBITAL_ANG_VEL;
    vec3 planet_pos0 = vec3(cos(planet_ang0), sin(planet_ang0), 0)*PLANET_DISTANCE;
    {{/light_travel_time}}

    vec3 old_pos;

    for (int j=0; j < NSTEPS; j++) {

        step = MAX_REVOLUTIONS * 2.0*M_PI / float(NSTEPS);

        // adaptive step size, some ad hoc formulas
        float max_rel_u_change = (1.0-log(u))*10.0 / float(NSTEPS);
        if ((du > 0.0 || (du0 < 0.0 && u0/u < 5.0)) && abs(du) > abs(max_rel_u_change*u) / step)
            step = max_rel_u_change*u/abs(du);

        old_u = u;

        {{#light_travel_time}}
        {{#gravitational_time_dilation}}
        dt = sqrt(du*du + u*u*(1.0-u))/(u*u*(1.0-u))*step;
        {{/gravitational_time_dilation}}
        {{/light_travel_time}}

        // Leapfrog scheme
        u += du*step;
        float ddu = -u*(1.0 - 1.5*u*u);
        du += ddu*step;

        if (u < 0.0) break;

        phi += step;

        old_pos = pos;
        pos = (cos(phi)*normal_vec + sin(phi)*tangent_vec)/u;

        ray = pos-old_pos;
        float solid_isec_t = 2.0;
        float ray_l = length(ray);

        {{#light_travel_time}}
        {{#gravitational_time_dilation}}
        float mix = smooth_step(1.0/u, 8.0);
        dt = mix*ray_l + (1.0-mix)*dt;
        {{/gravitational_time_dilation}}
        {{^gravitational_time_dilation}}
        dt = ray_l;
        {{/gravitational_time_dilation}}
        {{/light_travel_time}}

        {{#planetEnabled}}
        if (
            (
                old_pos.z * pos.z < 0.0 ||
                min(abs(old_pos.z), abs(pos.z)) < PLANET_RADIUS
            ) &&
            max(u, old_u) > 1.0/(PLANET_DISTANCE+PLANET_RADIUS) &&
            min(u, old_u) < 1.0/(PLANET_DISTANCE-PLANET_RADIUS)
        ) {

            {{#light_travel_time}}
            float planet_ang0 = t * PLANET_ORBITAL_ANG_VEL;
            vec3 planet_pos0 = vec3(cos(planet_ang0), sin(planet_ang0), 0)*PLANET_DISTANCE;
            {{/light_travel_time}}

            vec4 planet_isec = planet_intersection(old_pos, ray, t, dt,
                    planet_pos0, ray_doppler_factor);
            if (planet_isec.w > 0.0) {
                solid_isec_t = planet_isec.w;
                planet_isec.w = 1.0;
                color += planet_isec;
            }
        }
        {{/planetEnabled}}

        {{#accretion_disk}}
        if (old_pos.z * pos.z < 0.0) {
            // crossed plane z=0

            float acc_isec_t = -old_pos.z / ray.z;
            if (acc_isec_t < solid_isec_t) {
                vec3 isec = old_pos + ray*acc_isec_t;

                float r = length(isec);

                if (r > ACCRETION_MIN_R) {
                    vec2 tex_coord = vec2(
                            (r-ACCRETION_MIN_R)/ACCRETION_WIDTH,
                            atan(isec.x, isec.y)/M_PI*0.5+0.5
                    );

                    float accretion_intensity = ACCRETION_BRIGHTNESS;
                    //accretion_intensity *= 1.0 / abs(ray.z/ray_l);
                    float temperature = ACCRETION_TEMPERATURE;

                    vec3 accretion_v = vec3(-isec.y, isec.x, 0.0) / sqrt(2.0*(r-1.0)) / (r*r);
                    gamma = 1.0/sqrt(1.0-dot(accretion_v,accretion_v));
                    float doppler_factor = gamma*(1.0+dot(ray/ray_l,accretion_v));
                    {{#beaming}}
                    accretion_intensity /= doppler_factor*doppler_factor*doppler_factor;
                    {{/beaming}}
                    {{#doppler_shift}}
                    temperature /= ray_doppler_factor*doppler_factor;
                    {{/doppler_shift}}

                    color += texture2D(accretion_disk_texture,tex_coord)
                        * accretion_intensity
                        * BLACK_BODY_COLOR(temperature);
                }
            }
        }
        {{/accretion_disk}}

        {{#light_travel_time}}
        t -= dt;
        {{/light_travel_time}}

        if (solid_isec_t <= 1.0) u = 2.0; // break
        if (u > 1.0) break;
    }

    // the event horizon is at u = 1
    if (u < 1.0) {
        ray = normalize(pos - old_pos);
        vec2 tex_coord = sphere_map(ray * BG_COORDS);
        float t_coord;

        vec4 star_color = texture2D(star_texture, tex_coord);
        if (star_color.r > 0.0) {
            t_coord = (STAR_MIN_TEMPERATURE +
                (STAR_MAX_TEMPERATURE-STAR_MIN_TEMPERATURE) * star_color.g)
                 / ray_doppler_factor;

            color += BLACK_BODY_COLOR(t_coord) * star_color.r * STAR_BRIGHTNESS;
        }

        color += galaxy_color(tex_coord, ray_doppler_factor) * GALAXY_BRIGHTNESS;
    }

    gl_FragColor = color*ray_intensity;
}

    `;
  }

  update() {
    this.delta = (Date.now() - this.lastframe) / 1000;
    this.time += this.delta;

    // this.updateUniforms();

    this.manager.update();

    for (let system of this.manager.particleSystems) {
      system.update();
      system.render(this.renderer, this.camera);
    }

    this.lastframe = Date.now();
    // this.renderer.update();
  }

  render() {
    //this.updateUniforms();
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

    const campfireTestingPath = new URL(
      "../assets/models/campfire_test/stone_fire_pit_4k.gltf",
      import.meta.url
    ).href;
    const campfireTestLoadPromise = new Promise((resolve, reject) => {
      modelLoader.load(
        campfireTestingPath,
        (object) => {
          resolve(object);
        },
        null,
        (err) => {
          console.log("Error loading the model CampfireTest: ", err);
          reject(err);
        }
      );
    });

    const skeletonPath = new URL(
      "../assets/models/skeleton/skeleton4.glb",
      import.meta.url
    ).href;
    const skeletonLoadPromise = new Promise((resolve, reject) => {
      modelLoader.load(
        skeletonPath,
        (object) => {
          resolve(object);
        },
        null,
        (err) => {
          console.log("Error loading the model Skeleton: ", err);
          reject(err);
        }
      );
    });

    const tentPath = new URL("../assets/models/tent/tent.gltf", import.meta.url)
      .href;
    const tentLoadPromise = new Promise((resolve, reject) => {
      modelLoader.load(
        tentPath,
        (object) => {
          resolve(object);
        },
        null,
        (err) => {
          console.log("Error loading the model Tent: ", err);
          reject(err);
        }
      );
    });

    const terrainPath = new URL(
      "../assets/models/terrain/canyon2.gltf",
      import.meta.url
    ).href;
    const terrainLoadPromise = new Promise((resolve, reject) => {
      modelLoader.load(
        terrainPath,
        (object) => {
          resolve(object);
        },
        null,
        (err) => {
          console.log("Error loading the model Terrain: ", err);
          reject(err);
        }
      );
    });

    const propsPath = new URL(
      "../assets/models/terrain/props/ue/SM_Oak_Sapling_a.gltf",
      import.meta.url
    ).href;

    const propsLoadPromise = new Promise((resolve, reject) => {
      modelLoader.load(
        propsPath,
        (object) => {
          resolve(object);
        },
        null,
        (err) => {
          console.log("Error loading prop with path: ", err);
          reject(err);
        }
      );
    });

    return Promise.all([
      graveyardLoadPromise,
      torchLoadPromise,
      campfireLoadPromise,
      campfireTestLoadPromise,
      skeletonLoadPromise,
      tentLoadPromise,
      terrainLoadPromise,
      propsLoadPromise,
    ]).then(
      ([
        graveyardObject,
        torchObject,
        campfireObject,
        campfireTestObject,
        skeletonObject,
        tentObject,
        terrainObject,
        propsObject,
      ]) => {
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
        //this.scene.add(torchObject.scene);
        Scene.traverseScene(torchObject.scene, (node) => {
          if (node.isMesh) {
            node.castShadow = false;
            node.recieveShadow = false;
          }
        });
        torchObject.scene.scale.set(1.2, 1.15, 1.2);
        torchObject.scene.position.copy(torchPostPosition);

        let campfirePosition = new THREE.Vector3(-0.31, 1.1, 1.65);
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

        ///         TEST je prosa, maknit kamenja iz originalnog objecta
        let campfireTestPosition = new THREE.Vector3(-0.31, 1.1, 1.65);
        this.scene.add(campfireTestObject.scene);
        Scene.traverseScene(campfireTestObject.scene, (node) => {
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
        campfireTestObject.scene.scale.set(1.2, 1.2, 1.2);
        campfireTestObject.scene.position.copy(campfireTestPosition);

        let skeletonPosition = new THREE.Vector3(2, 0.9, 0);
        let skeletonRotation = new THREE.Euler(0, -1.0, 0);
        this.scene.add(skeletonObject.scene);
        Scene.traverseScene(skeletonObject.scene, (node) => {
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
        skeletonObject.scene.scale.set(1.8, 1.8, 1.8);
        skeletonObject.scene.position.copy(skeletonPosition);
        skeletonObject.scene.rotation.copy(skeletonRotation);

        let tentPosition = new THREE.Vector3(-4.5, 1.0, 1.0);
        let tentRotation = new THREE.Euler(0.0, 1.8, 0.0);
        this.scene.add(tentObject.scene);
        Scene.traverseScene(tentObject.scene, (node) => {});
        tentObject.scene.scale.set(1.2, 1.2, 1.2);
        tentObject.scene.position.copy(tentPosition);
        tentObject.scene.rotation.copy(tentRotation);

        let terrainPosition = new THREE.Vector3(0, 1, 0);
        let terrainRotation = new THREE.Euler(0, -10.0, 0);
        this.scene.add(terrainObject.scene);
        Scene.traverseScene(terrainObject.scene, (node) => {
          // if (node.isMesh) {
          //   if (node.name == "Opaque") {
          //     node.castShadow = true;
          //     node.recieveShadow = true;
          //     const oldMaterial = node.material;
          //     node.material = new THREE.MeshStandardMaterial();
          //     node.material.map = oldMaterial.map;
          //     node.material.normalMap = oldMaterial.normalMap;
          //     node.material.normalScale.copy(oldMaterial.normalScale);
          //     node.material.roughness = 0.6;
          //   }
          // }
        });
        terrainObject.scene.scale.set(1.8, 1.8, 1.8);
        terrainObject.scene.rotation.copy(terrainRotation);
        terrainObject.scene.position.copy(terrainPosition);

        let propsPosition = new THREE.Vector3(0, 0, 0);
        this.scene.add(propsObject.scene);
        Scene.traverseScene(propsObject.scene, (node) => {});
        propsObject.scene.scale.set(10, 10, 10);
        propsObject.scene.position.copy(campfirePosition);
        console.log(propsObject);

        const lightParent = new THREE.Object3D();
        this.scene.add(lightParent);
        lightParent.position.copy(torchPostPosition);

        // const pointLight = new THREE.PointLight(
        //   new THREE.Color(1, 0.8, 0.0),
        //   200,
        //   100,
        //   1
        // );
        // pointLight.power = 100;
        // pointLight.position.copy(lightParent);
        // pointLight.rotation.set(0, 0, 0);
        // pointLight.position.add(new THREE.Vector3(0, 0, 10));
        // this.scene.add(pointLight);

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
      }
    );
  }
}
