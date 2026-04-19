import * as THREE from "three";

const textureLoader = new THREE.TextureLoader();

const SUN_RADIUS = 1.5;
const auToScene = (au: number) => SUN_RADIUS + 1.2 + Math.log1p(au) * 3.8;

const setSRGBColorSpace = (texture: THREE.Texture) => {
  texture.colorSpace = THREE.SRGBColorSpace;
};

const loadTexture = (path: string) => {
  const texture = textureLoader.load(path, setSRGBColorSpace);
  return texture;
};

const planetTextures = {
  sun: loadTexture("/plantet-textures/2k_sun.jpg"),
  mercury: loadTexture("/plantet-textures/2k_mercury.jpg"),
  venus: loadTexture("/plantet-textures/2k_venus_surface.jpg"),
  earth: loadTexture("/plantet-textures/2k_earth_daymap.jpg"),
  mars: loadTexture("/plantet-textures/2k_mars.jpg"),
  jupiter: loadTexture("/plantet-textures/2k_jupiter.jpg"),
  saturn: loadTexture("/plantet-textures/2k_saturn.jpg"),
  saturnRing: loadTexture("/plantet-textures/2k_saturn_ring_alpha.png"),
  uranus: loadTexture("/plantet-textures/2k_uranus.jpg"),
  neptune: loadTexture("/plantet-textures/2k_neptune.jpg"),
};

export type PlanetKey =
  | "mercury"
  | "venus"
  | "earth"
  | "mars"
  | "jupiter"
  | "saturn"
  | "uranus"
  | "neptune";

export type SimulationConfig = {
  simulationSpeed: number;
  gravitationalConstant: number;
  sunMass: number;
  planetMasses: Record<PlanetKey, number>;
};

export const defaultSimulationConfig: SimulationConfig = {
  simulationSpeed: 0.25,
  gravitationalConstant: 0.5,
  sunMass: 100,
  planetMasses: {
    mercury: 0.055,
    venus: 0.815,
    earth: 1.0,
    mars: 0.107,
    jupiter: 317.8,
    saturn: 95.2,
    uranus: 14.5,
    neptune: 17.1,
  },
};

type RingConfig = {
  texture: THREE.Texture;
  innerRadius: number;
  outerRadius: number;
};

type PlanetConfig = {
  key: PlanetKey;
  texture: THREE.Texture;
  size: number;
  au: number;
  orbitRadius: number;
  baseAngularSpeed: number;
  initialAngle: number;
  rotationSpeed: number;
  ring?: RingConfig;
  mass: number;
};

const PLANET_DEFS: Array<
  [PlanetKey, THREE.Texture, number, number, number, RingConfig?]
> = [
  ["mercury", planetTextures.mercury, 0.15, 0.387, 0.8],
  ["venus", planetTextures.venus, 0.28, 0.723, 0.6],
  ["earth", planetTextures.earth, 0.3, 1.0, 0.5],
  ["mars", planetTextures.mars, 0.22, 1.524, 0.5],
  ["jupiter", planetTextures.jupiter, 0.65, 5.203, 1.2],
  [
    "saturn",
    planetTextures.saturn,
    0.55,
    9.537,
    1.0,
    { texture: planetTextures.saturnRing, innerRadius: 0.7, outerRadius: 1.2 },
  ],
  ["uranus", planetTextures.uranus, 0.45, 19.19, 0.7],
  ["neptune", planetTextures.neptune, 0.43, 30.07, 0.65],
];

const INITIAL_ANGLES: Record<PlanetKey, number> = {
  mercury: 0,
  venus: Math.PI * 0.25,
  earth: Math.PI * 0.5,
  mars: Math.PI * 0.75,
  jupiter: Math.PI,
  saturn: Math.PI * 1.25,
  uranus: Math.PI * 1.5,
  neptune: Math.PI * 1.75,
};

export class PlanetSystem {
  private sunMesh: THREE.Mesh;
  private planetMeshes: THREE.Mesh[] = [];
  private planetData: PlanetConfig[] = [];
  private angleOffsets: number[] = [];
  private angleVelocities: number[] = [];
  public config: SimulationConfig;
  private accumulatedTime: number = 0;
  private lastRealTime: number = 0;

  constructor(config: Partial<SimulationConfig> = {}) {
    this.config = { ...defaultSimulationConfig, ...config };

    this.planetData = PLANET_DEFS.map(
      ([key, texture, size, au, rotationSpeed, ring]) => ({
        key,
        texture,
        size,
        au,
        orbitRadius: auToScene(au),
        baseAngularSpeed: ((2 * Math.PI) / Math.pow(au, 1.5)) * 0.3,
        initialAngle: INITIAL_ANGLES[key],
        rotationSpeed,
        ring,
        mass: this.config.planetMasses[key] * 0.001,
      }),
    );

    this.angleOffsets = new Array(this.planetData.length).fill(0);
    this.angleVelocities = new Array(this.planetData.length).fill(0);

    this.sunMesh = this.createMesh(planetTextures.sun, SUN_RADIUS);

    for (const data of this.planetData) {
      const mesh = this.createMesh(data.texture, data.size);
      mesh.position.set(
        Math.cos(data.initialAngle) * data.orbitRadius,
        0,
        Math.sin(data.initialAngle) * data.orbitRadius,
      );
      this.planetMeshes.push(mesh);
      if (data.ring) {
        mesh.add(
          this.createSaturnRing(
            data.ring.texture,
            data.ring.innerRadius,
            data.ring.outerRadius,
          ),
        );
      }
    }

    this.lastRealTime = performance.now() / 1000;
  }

  private createMesh(texture: THREE.Texture, size: number): THREE.Mesh {
    return new THREE.Mesh(
      new THREE.SphereGeometry(size, 32, 32),
      new THREE.MeshBasicMaterial({ map: texture }),
    );
  }

  private createSaturnRing(
    texture: THREE.Texture,
    innerRadius: number,
    outerRadius: number,
  ): THREE.Mesh {
    const geometry = new THREE.RingGeometry(innerRadius, outerRadius, 64);
    const pos = geometry.attributes.position;
    const uv = geometry.attributes.uv;
    const v3 = new THREE.Vector3();
    for (let i = 0; i < pos.count; i++) {
      v3.fromBufferAttribute(pos, i);
      const u = (v3.length() - innerRadius) / (outerRadius - innerRadius);
      uv.setXY(i, u, uv.getY(i));
    }
    const ring = new THREE.Mesh(
      geometry,
      new THREE.MeshBasicMaterial({
        map: texture,
        side: THREE.DoubleSide,
        transparent: true,
        alphaTest: 0.01,
      }),
    );
    ring.rotation.x = Math.PI / 2;
    return ring;
  }

  private computePerturbation(index: number, currentAngles: number[]): number {
    let perturbation = 0;
    const G = this.config.gravitationalConstant * 0.001;
    const dataI = this.planetData[index];

    for (let j = 0; j < this.planetData.length; j++) {
      if (index === j) continue;

      const dataJ = this.planetData[j];

      const x1 = Math.cos(currentAngles[index]) * dataI.orbitRadius;
      const z1 = Math.sin(currentAngles[index]) * dataI.orbitRadius;
      const x2 = Math.cos(currentAngles[j]) * dataJ.orbitRadius;
      const z2 = Math.sin(currentAngles[j]) * dataJ.orbitRadius;

      const dx = x2 - x1;
      const dz = z2 - z1;
      const dist = Math.sqrt(dx * dx + dz * dz);

      if (dist < 0.5) continue;

      const force = (G * dataJ.mass) / (dist * dist);
      const tangentialDir =
        -Math.sin(currentAngles[index]) * dx +
        Math.cos(currentAngles[index]) * dz;

      perturbation += force * (tangentialDir / dist);
    }

    return Math.max(-0.5, Math.min(0.5, perturbation));
  }

  get meshes(): THREE.Mesh[] {
    return [this.sunMesh, ...this.planetMeshes];
  }

  updateElapseTime(elapsedTime: number, dt: number): void {
    const currentRealTime = performance.now() / 1000;
    const realDt = Math.min(currentRealTime - this.lastRealTime, 0.033);
    this.lastRealTime = currentRealTime;

    this.accumulatedTime += realDt * this.config.simulationSpeed;

    this.sunMesh.rotation.y += realDt * 0.3;

    const baseTime = this.accumulatedTime;

    const currentAngles = this.planetData.map((data, i) => {
      return (
        data.initialAngle +
        data.baseAngularSpeed * baseTime +
        this.angleOffsets[i]
      );
    });

    const physicsDt = 0.016;
    const steps = Math.floor(realDt / physicsDt) + 1;
    const stepDt = realDt / steps;

    for (let step = 0; step < steps; step++) {
      for (let i = 0; i < this.planetData.length; i++) {
        const perturbation = this.computePerturbation(i, currentAngles);
        this.angleVelocities[i] += perturbation * stepDt;
        this.angleOffsets[i] += this.angleVelocities[i] * stepDt;
      }
    }

    const finalAngles = this.planetData.map((data, i) => {
      return (
        data.initialAngle +
        data.baseAngularSpeed * baseTime +
        this.angleOffsets[i]
      );
    });

    for (let i = 0; i < this.planetData.length; i++) {
      const data = this.planetData[i];
      const angle = finalAngles[i];

      this.planetMeshes[i].position.set(
        Math.cos(angle) * data.orbitRadius,
        0,
        Math.sin(angle) * data.orbitRadius,
      );
      this.planetMeshes[i].rotation.y += realDt * data.rotationSpeed;
    }
  }
}
