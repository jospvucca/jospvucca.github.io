import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

const scenePath = './public/models/campfire4.gltf';

export const LoadGLTFByPath = (scene : any) => {
    return new Promise<void>((resolve, reject) => {
      // Create a loader
      const loader = new GLTFLoader();
  
      // Load the GLTF file
      loader.load(scenePath, (gltf) => {

        scene.add(gltf.scene);

        resolve();
      }, undefined, (error) => {
        reject(error);
      });
    });
};