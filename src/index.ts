import GUI from "lil-gui";
import * as THREE from "three";
import { Renderer } from "./lib/renderer";
import { PlanetSystem } from "./lib/planet-system";

const canvas = document.getElementById("webgl-canvas") as HTMLCanvasElement;

if (!canvas) {
  throw new Error("Canvas element not found");
}

const gui = new GUI();
const renderer = new Renderer(canvas);

const config = {
  wireframe: false,
  speed: 1,
};

const planetSystem = new PlanetSystem();

const clock = new THREE.Clock();

console.log(planetSystem.meshes);

renderer.scene.add(...planetSystem.meshes);

// Animation loop
renderer.animate(() => {
  const elapsedTime = clock.getElapsedTime();
  const deltaTime = clock.getDelta();
  planetSystem.updateElapseTime(elapsedTime * 0.1, deltaTime * 0.1);
});

gui.add(config, "wireframe").onChange((value: boolean) => {
  planetSystem.updateWireframe(value);
});
gui
  .add(config, "speed", 0, 100)
  .step(0.1)
  .onChange((value: number) => {
    planetSystem.config.simulationSpeed = value;
  });
