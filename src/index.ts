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
};

const planetSystem = new PlanetSystem();

const clock = new THREE.Clock();

console.log(planetSystem.meshes);

renderer.scene.add(...planetSystem.meshes);

// Animation loop
renderer.animate(() => {
  const elapsedTime = clock.getElapsedTime();
  const deltaTime = clock.getDelta();
  planetSystem.updateElapseTime(elapsedTime * 100);
});

gui.add(config, "wireframe").onChange((value: boolean) => {
  planetSystem.updateWireframe(value);
});

const massFolder = gui.addFolder("Masas de Planetas");



const planetMasses = {
  sun: planetSystem.getSunMass(),
  mercury: planetSystem.getPlanetMass("mercury"),
  venus: planetSystem.getPlanetMass("venus"),
  earth: planetSystem.getPlanetMass("earth"),
  mars: planetSystem.getPlanetMass("mars"),
  jupiter: planetSystem.getPlanetMass("jupiter"),
  saturn: planetSystem.getPlanetMass("saturn"),
  uranus: planetSystem.getPlanetMass("uranus"),
  neptune: planetSystem.getPlanetMass("neptune"),
};

massFolder
  .add(planetMasses, "sun", 1, 1.98892e30)
  .step(1e23)
  .name("Sol")
  .onChange((value: number) => {
    planetSystem.updateSunMass(value);
  });

massFolder
  .add(planetMasses, "mercury", 1, 1.98892e30)
  .step(1e23)
  .name("Mercurio")
  .onChange((value: number) => {
    planetSystem.updatePlanetMass("mercury", value);
  });

massFolder
  .add(planetMasses, "venus", 1, 1.98892e30)
  .step(1e23)
  .name("Venus")
  .onChange((value: number) => {
    planetSystem.updatePlanetMass("venus", value);
  });

massFolder
  .add(planetMasses, "earth", 1, 1.98892e30)
  .step(1e23)
  .name("Tierra")
  .onChange((value: number) => {
    planetSystem.updatePlanetMass("earth", value);
  });

massFolder
  .add(planetMasses, "mars", 1, 1.98892e30)
  .step(1e23)
  .name("Marte")
  .onChange((value: number) => {
    planetSystem.updatePlanetMass("mars", value);
  });

massFolder
  .add(planetMasses, "jupiter", 1, 1.98892e30)
  .step(1e26)
  .name("Júpiter")
  .onChange((value: number) => {
    planetSystem.updatePlanetMass("jupiter", value);
  });

massFolder
  .add(planetMasses, "saturn", 1, 1.98892e30)
  .step(1e25)
  .name("Saturno")
  .onChange((value: number) => {
    planetSystem.updatePlanetMass("saturn", value);
  });

massFolder
  .add(planetMasses, "uranus", 1, 1.98892e30)
  .step(1e24)
  .name("Urano")
  .onChange((value: number) => {
    planetSystem.updatePlanetMass("uranus", value);
  });

massFolder
  .add(planetMasses, "neptune", 1, 1.98892e30)
  .step(1e24)
  .name("Neptuno")
  .onChange((value: number) => {
    planetSystem.updatePlanetMass("neptune", value);
  });
