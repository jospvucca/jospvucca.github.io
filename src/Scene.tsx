import * as THREE from "three";
import { addTorchWithParticles } from "./Torch";
import { useEffect } from "react";

function TorchScene() {
    useEffect(() => {
        function init() {
            const scene = new THREE.Scene();
            const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 100);
            camera.position.set(0, 5, 10);
            camera.lookAt(new THREE.Vector3(0, 3, 0));
        
            const renderer = new THREE.WebGLRenderer();
            renderer.setSize(window.innerWidth, window.innerHeight);
            renderer.setClearColor(0x000000, 1);
            document.body.appendChild(renderer.domElement);
        
            //Add torch with particle system
            addTorchWithParticles(scene);
        
            //Animation Loop
            function animate() {
                requestAnimationFrame(animate);
                renderer.render(scene, camera);
            }
        
            animate();
        }

        init();
    }, []);

    return null;
}

export default TorchScene;
