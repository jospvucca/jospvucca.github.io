import './App.css'

import { Canvas, extend, ReactThreeFiber, useFrame } from '@react-three/fiber';
import { OrbitControls, PerspectiveCamera, shaderMaterial, useGLTF, useAnimations } from '@react-three/drei';

import * as THREE from 'three';
import { Suspense, useEffect, useMemo, useRef, useState } from 'react';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import TorchScene from './Scene';

const CampfireModel : React.FC = () => {
  const {scene} = useGLTF('./assets/models/campfire11.gltf');

  return <primitive object={scene} scale={1} />;
}

// const Fire: React.FC = () => {
//   const {scene, animations} = useGLTF("./assets/models/needle/lts/asgltf/SmokeEffect.gltf");
//   const {actions, mixer} = useAnimations(animations, scene);

//   useEffect(() => {
//     if(actions) {
//       const action = actions[Object.keys(actions)[0]];
//       if(action) {
//         console.log("Animation found.");
//       }
//       action?.play();
//     }

//     scene.traverse((child) => {
//       if((child as THREE.Mesh).isMesh) {
//         const material = (child as THREE.Mesh).material as THREE.MeshStandardMaterial;
//         material.emissive = new THREE.Color(0xff5500);
//         material.emissiveIntensity = 1.5;
//         material.transparent = true;
//         material.alphaTest = 0.5;
//       }
//     });

//     return () => {
//       if(mixer)
//         mixer.stopAllAction();
//     };
//   }, [actions, scene, mixer]);

//   return <primitive object={scene} scale={1} />;
// };

function loadGLTFWithNeedleExtension(url: string) {
  const loader = new GLTFLoader();

    // Register the Needle Engine extension for the custom particle system data
    loader.register((parser) => {
      console.log("Parser: ", JSON.stringify(parser));
      const needleExtension = parser.json.extensions?.NEEDLE_components;

      if(needleExtension || !needleExtension) {
        console.log("Needle extension found:", needleExtension);

        return {
          afterRoot: (gltf) => {
                      // Here you handle the particle system logic using the data from Needle Engine
            console.log("Processing needle components:", needleExtension);
          },
        };
      }

      console.log("Needle extension not found!");
      return null;

    });

      // Return the promise of loading GLTF
  return loader.loadAsync(url);
  // .then((gltf) => gltf)
  // .catch((error) => console.log("Error loading GLTF: ", error));
}

function LoadGLBFile(url: string) {

    const loader = new GLTFLoader();

    loader.load(
      url, // Replace with the actual path
      (gltf) => {
        console.log(gltf);
        console.log("GLTF Content:", JSON.stringify(gltf.scene));
        console.log("Animations:", JSON.stringify(gltf.animations));
        console.log("Extensions:", JSON.stringify(gltf.parser.json.extensions));
      },
      undefined,
      (error) => {
        console.error('An error occurred while loading the GLB:', error);
      }
    );

  return null;
};

const Particles: React.FC = () => {
  const [gltf, setGltf] = useState<any>(null);
  const [mixer, setMixer] = useState<THREE.AnimationMixer | null>(null);

  useEffect(() => {
        const a = LoadGLBFile("./assets/models/needle/lts/asglb/SmokeEffect.glb");
        // Use the custom loader to load the GLTF file
        loadGLTFWithNeedleExtension("./assets/models/needle/lts/asglb/ParticlesTest.glb").then((result) => {
          console.log("Result of loading: " + JSON.stringify(result));
          setGltf(result.scene);

          if(result.animations && result.animations.length > 0) {
            console.log("Animations found.");
            const mxr = new THREE.AnimationMixer(result.scene);
            const action = mxr.clipAction(result.animations[0]);
            action.play();
            setMixer(mxr);
          }
        })
        .catch((error) => console.error("Error loading GLTF:", error));
  }, []);

    // Animate the particles if there's a mixer
    useFrame((state, delta) => {
      if(mixer) {
        console.log("State: " + JSON.stringify(state) + "/n Delta: " + delta);
        state.advance(delta);
        mixer.update(delta);
      }
    });

    return gltf ? <primitive object={gltf} scale={1} /> : null;
};

// const Fire: React.FC = () => {
//   const { scene } = useGLTF("./assets/models/fire_anim.gltf");
//   const { animations } = useGLTF("./assets/models/fire_anim.gltf");
//   const { actions } = useAnimations(animations, scene);

//   const videoRef = useRef<HTMLVideoElement | null>(null);

//   useEffect(() => {
//     if (actions) {
//       const action = actions[Object.keys(actions)[0]];
//       action?.play(); // Play the animation
//     }

//     // Traverse the GLTF scene and find the Mesh to apply the texture
//     scene.traverse((child) => {
//       if ((child as THREE.Mesh).isMesh) {
//         console.log('Mesh found:', child); // Debug: log the found mesh

//         // Create the video element dynamically
//         const video = document.createElement('video');
//         video.src = './assets/models/Anim/fire-chad-madden.mp4';
//         video.loop = true;
//         video.muted = true;
//         video.crossOrigin = 'anonymous';
//         video.autoplay = true;
//         video.play();

//         // Create video texture
//         const videoTexture = new THREE.VideoTexture(video);
//         videoTexture.needsUpdate = true;

//         // Apply the video texture to the mesh's material
//         (child as THREE.Mesh).material = new THREE.MeshBasicMaterial({
//           map: videoTexture,
//           transparent: true,
//           alphaTest: 0.5, // Make the black background of the video transparent
//         });
//       }
//     });
//   }, [actions, scene]);

//   return <primitive object={scene} scale={1} />;
// };

function Ground() {
  return (
    <mesh rotation={[-Math.PI / 2, 0 ,0]} receiveShadow>
      <planeGeometry args={[100, 100]} />
      {/* <groundMaterial attach="material" /> */}
    </mesh>
  );
}

function App() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [renderer, setRenderer] = useState<THREE.WebGLRenderer | null>(null);

  useEffect(() => {
    // Initialize the renderer only once
    if (!renderer && canvasRef.current) {
      const canvas = document.querySelector('#background') as HTMLCanvasElement;
      const newRenderer = new THREE.WebGLRenderer({
        canvas: canvasRef.current,
        antialias: true,
      });
      newRenderer.setSize(window.innerWidth, window.innerHeight);
      newRenderer.shadowMap.enabled = true;
      newRenderer.shadowMap.type = THREE.PCFSoftShadowMap;
      newRenderer.setPixelRatio(window.devicePixelRatio);
      newRenderer.toneMapping = THREE.ACESFilmicToneMapping;
      newRenderer.toneMappingExposure = 1;
      newRenderer.setClearColor(0xffffff, 0);
      newRenderer.outputColorSpace = THREE.NoColorSpace;

      setRenderer(newRenderer);
    }
  }, [renderer]);

  return (
    <Canvas>
    <TorchScene />
    <OrbitControls />
    </Canvas>
    // <>

    // <Canvas id="background" ref={canvasRef} shadows camera={{position: [0, 5, 10], fov: 60}} 
    // onCreated={({ gl }) => {
    //   if (renderer) {
    //     console.log("Should be here");
    //     gl.dispose(); // Dispose of the default renderer
    //     gl = renderer; // Replace with our custom renderer
    //     gl.outputColorSpace = THREE.DisplayP3ColorSpace;
    //   }
    // }}
    // >

    //   <PerspectiveCamera makeDefault position={[0, 2, 10]} fov={50}/>

    //   <ambientLight intensity={1.3} />
      

    //   <Suspense fallback={null}>
    //     <CampfireModel />
    //     {/* <Fire /> */}
    //     <Particles />
    //   </Suspense>

    //   <Ground />
    //   {/* <Box /> */}
    //   <OrbitControls />
    // </Canvas>
    // </>
  );
}

export default App;
