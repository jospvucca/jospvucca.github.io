import * as THREE from "three";
import { Scene } from "./Scene";
import { OrbitControls } from "three/examples/jsm/Addons.js";

const rootElement = document.querySelector("#root");

let camera;
let controls;
let scene;
let renderer;
let demoScene;

const onResize = () => {
  renderer.setSize(1, 1);
  const renderWidth = window.innerWidth;
  const renderHeight = window.innerHeight;

  camera.aspect = renderWidth / renderHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(renderWidth, renderHeight);
};

const initThreeJS = async () => {
  const renderWidth = window.innerWidth;
  const renderHeight = window.innerHeight;

  camera = new THREE.PerspectiveCamera(
    70,
    renderWidth / renderHeight,
    0.1,
    100
  );
  camera.position.set(
    0.024318913205115755,
    2.263085369169634,
    2.2461082450972363
  );
  camera.quaternion.set(
    -0.31211109312645235,
    0.05162137245260911,
    0.016986581102126804,
    0.9484900397558116
  );

  scene = new THREE.Scene();

  renderer = new THREE.WebGLRenderer({
    antialias: true,
  });
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.setSize(renderWidth, renderHeight);

  //controls are missing for testing purposes
  controls = new OrbitControls(camera, renderer.domElement);

  window.addEventListener("resize", onResize, false);

  rootElement.appendChild(renderer.domElement);

  //TODO - missing imports from new file
  demoScene = new Scene(scene, camera, renderer);
  demoScene.build();
};

const animate = () => {
  requestAnimationFrame(animate);
  demoScene.update();
  renderer.render(scene, camera);
  demoScene.update();
};

initThreeJS().then(() => animate());
