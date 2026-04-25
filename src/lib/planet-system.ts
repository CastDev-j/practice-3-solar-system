import * as THREE from "three";

export type PlanetKey =
  | "sun"
  | "mercury"
  | "venus"
  | "earth"
  | "mars"
  | "jupiter"
  | "saturn"
  | "uranus"
  | "neptune";

export type SimulationConfig = {
  gravitationalConstant: number;
  planetMasses: Record<PlanetKey, number>;
  timestep: number;
  scale: number;
  sizeScale: number;
};

export const defaultSimulationConfig: SimulationConfig = {
  gravitationalConstant: 6.67428e-11,
  planetMasses: {
    sun: 1.98892e30,
    mercury: 3.30e23,
    venus: 4.8685e24,
    earth: 5.9742e24,
    mars: 6.39e23,
    jupiter: 1.898e27,
    saturn: 5.68e26,
    uranus: 8.68e25,
    neptune: 1.02e26,
  },
  timestep: 3600 * 6,
  scale: 1e-10,
  sizeScale: 0.1,
};

type Body = {
  key: PlanetKey;
  mesh: THREE.Mesh;
  trail: THREE.Line;
  trailGeometry: THREE.BufferGeometry;
  trailPositions: Float32Array;
  trailIndex: number;
  maxTrailLength: number;
  mass: number;
  x: number;
  y: number;
  z: number;
  vx: number;
  vy: number;
  vz: number;
};

const COLORS: Record<PlanetKey, number> = {
  sun: 0xffff00,
  mercury: 0xaaaaaa,
  venus: 0xffcc88,
  earth: 0x4488ff,
  mars: 0xff6644,
  jupiter: 0xc99e6f,
  saturn: 0xe8cfb0,
  uranus: 0xb0e0e6,
  neptune: 0x4169e1,
};

const DISTANCES: Record<PlanetKey, number> = {
  sun: 0,
  mercury: 5.7e10,
  venus: 1.08e11,
  earth: 1.496e11,
  mars: 2.27e11,
  jupiter: 7.78e11,
  saturn: 1.43e12,
  uranus: 2.87e12,
  neptune: 4.5e12,
};

const RADII: Record<PlanetKey, number> = {
  sun: 12,
  mercury: 2,
  venus: 3,
  earth: 3,
  mars: 2.5,
  jupiter: 6,
  saturn: 5,
  uranus: 4,
  neptune: 4,
};

export class PlanetSystem {
  private bodies: Body[] = [];
  private lastElapsed = 0;

  public config: SimulationConfig;

  constructor(config: Partial<SimulationConfig> = {}) {
    this.config = { ...defaultSimulationConfig, ...config };

    (Object.keys(this.config.planetMasses) as PlanetKey[]).forEach((key) => {
      const distance = DISTANCES[key];

      const x = distance;
      const y = 0;
      const z = 0;

      const mesh = this.createCircle(RADII[key], COLORS[key]);

      const maxTrailLength = 400;
      const trailPositions = new Float32Array(maxTrailLength * 3);

      const trailGeometry = new THREE.BufferGeometry();
      trailGeometry.setAttribute(
        "position",
        new THREE.BufferAttribute(trailPositions, 3)
      );

      const trail = new THREE.Line(
        trailGeometry,
        new THREE.LineBasicMaterial({ color: COLORS[key] })
      );

      const isSun = key === "sun";

      this.bodies.push({
        key,
        mesh,
        trail,
        trailGeometry,
        trailPositions,
        trailIndex: 0,
        maxTrailLength,
        mass: this.config.planetMasses[key],
        x,
        y,
        z,
        vx: 0,
        vy: 0,
        vz: isSun
          ? 0
          : Math.sqrt(
              (this.config.gravitationalConstant *
                this.config.planetMasses["sun"]) /
                distance
            ),
      });
    });
  }

  private createCircle(radius: number, color: number): THREE.Mesh {
    const geometry = new THREE.CircleGeometry(
      radius * this.config.sizeScale,
      64
    );

    const material = new THREE.MeshBasicMaterial({
      color,
      side: THREE.DoubleSide,
    });

    const mesh = new THREE.Mesh(geometry, material);
    mesh.rotation.x = -Math.PI / 2;

    return mesh;
  }

  private attraction(a: Body, b: Body) {
    if (a === b) return { fx: 0, fy: 0, fz: 0 };

    const dx = b.x - a.x;
    const dy = b.y - a.y;
    const dz = b.z - a.z;

    const distance = Math.sqrt(dx * dx + dy * dy + dz * dz) + 1e-5;

    const force =
      (this.config.gravitationalConstant * a.mass * b.mass) /
      (distance * distance);

    return {
      fx: (dx / distance) * force,
      fy: (dy / distance) * force,
      fz: (dz / distance) * force,
    };
  }

  private updatePositions(dt: number) {
    const forces = this.bodies.map(() => ({
      fx: 0,
      fy: 0,
      fz: 0,
    }));

    for (let i = 0; i < this.bodies.length; i++) {
      for (let j = i + 1; j < this.bodies.length; j++) {
        const a = this.bodies[i];
        const b = this.bodies[j];

        const f = this.attraction(a, b);

        forces[i].fx += f.fx;
        forces[i].fy += f.fy;
        forces[i].fz += f.fz;

        forces[j].fx -= f.fx;
        forces[j].fy -= f.fy;
        forces[j].fz -= f.fz;
      }
    }

    for (let i = 0; i < this.bodies.length; i++) {
      const b = this.bodies[i];
      const f = forces[i];

      b.vx += (f.fx / b.mass) * dt;
      b.vy += (f.fy / b.mass) * dt;
      b.vz += (f.fz / b.mass) * dt;

      b.x += b.vx * dt;
      b.y += b.vy * dt;
      b.z += b.vz * dt;

      b.mesh.position.set(
        b.x * this.config.scale,
        b.y * this.config.scale,
        b.z * this.config.scale
      );
    }
  }

  private updateTrails() {
    for (const b of this.bodies) {
      const i = b.trailIndex % b.maxTrailLength;

      b.trailPositions[i * 3] = b.x * this.config.scale;
      b.trailPositions[i * 3 + 1] = b.y * this.config.scale;
      b.trailPositions[i * 3 + 2] = b.z * this.config.scale;

      b.trailIndex++;

      const length = Math.min(b.trailIndex, b.maxTrailLength);
      const ordered = new Float32Array(length * 3);

      const start = b.trailIndex >= b.maxTrailLength ? i + 1 : 0;

      for (let j = 0; j < length; j++) {
        const idx = ((start + j) % b.maxTrailLength) * 3;

        ordered[j * 3] = b.trailPositions[idx];
        ordered[j * 3 + 1] = b.trailPositions[idx + 1];
        ordered[j * 3 + 2] = b.trailPositions[idx + 2];
      }

      b.trailGeometry.setAttribute(
        "position",
        new THREE.BufferAttribute(ordered, 3)
      );

      b.trailGeometry.setDrawRange(0, length);
    }
  }

  updateElapseTime(elapsedTime: number) {
    const delta = elapsedTime - this.lastElapsed;
    this.lastElapsed = elapsedTime;

    const dt = delta * this.config.timestep;

    const steps = 5;
    for (let i = 0; i < steps; i++) {
      this.updatePositions(dt / steps);
    }

    this.updateTrails();
  }

  get meshes() {
    return [
      ...this.bodies.map((b) => b.mesh),
      ...this.bodies.map((b) => b.trail),
    ];
  }

  updateWireframe(wireframe: boolean) {
    this.bodies.forEach((b) => {
      (b.mesh.material as THREE.MeshBasicMaterial).wireframe = wireframe;
    });
  }

  updatePlanetMass(key: PlanetKey, mass: number) {
    const b = this.bodies.find((b) => b.key === key);
    if (b) {
      b.mass = mass;
      this.config.planetMasses[key] = mass;
    }
  }

  updateSunMass(mass: number) {
    this.updatePlanetMass("sun", mass);
  }

  getPlanetMass(key: PlanetKey) {
    return this.config.planetMasses[key];
  }

  getSunMass() {
    return this.config.planetMasses["sun"];
  }

  setSizeScale(scale: number) {
    this.config.sizeScale = scale;

    this.bodies.forEach((b) => {
      const base = RADII[b.key];
      b.mesh.geometry.dispose();
      b.mesh.geometry = new THREE.CircleGeometry(base * scale, 64);
    });
  }

  reset() {
    this.lastElapsed = 0;

    for (const b of this.bodies) {
      b.trailIndex = 0;

      for (let i = 0; i < b.trailPositions.length; i++) {
        b.trailPositions[i] = 0;
      }

      const attr = b.trailGeometry.getAttribute(
        "position"
      ) as THREE.BufferAttribute;

      attr.needsUpdate = true;

      b.trailGeometry.setDrawRange(0, 0);
    }
  }
}