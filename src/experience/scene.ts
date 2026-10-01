import {
  ACESFilmicToneMapping,
  AmbientLight,
  BufferGeometry,
  CanvasTexture,
  DirectionalLight,
  DoubleSide,
  EquirectangularReflectionMapping,
  Float32BufferAttribute,
  Group,
  IcosahedronGeometry,
  Mesh,
  MeshStandardMaterial,
  OrthographicCamera,
  PMREMGenerator,
  Points,
  PointsMaterial,
  Scene,
  SRGBColorSpace,
  TorusGeometry,
  WebGLRenderer,
  type Material,
} from 'three';
import { pixelRatio, type Quality } from './quality';

export interface Pose {
  progress: number;
  x: number;
  y: number;
  emphasis: number;
  intro: number;
}

function finGeometry() {
  const positions: number[] = [];
  const indices: number[] = [];
  const rows = 64;
  const columns = 6;
  for (let row = 0; row <= rows; row++) {
    const t = row / rows;
    const radius = 1.05 + Math.sin(t * Math.PI) * 0.52;
    for (let column = 0; column <= columns; column++) {
      const s = column / columns - 0.5;
      const angle = (t - 0.5) * 2.2 + s * (0.2 + 0.3 * Math.sin(Math.PI * t));
      const r = radius + Math.sin((s + 0.5) * Math.PI) * 0.06;
      positions.push(Math.cos(angle) * r, (t - 0.5) * 3.5, Math.sin(angle) * r);
      if (row < rows && column < columns) {
        const a = row * (columns + 1) + column;
        const b = a + columns + 1;
        indices.push(a, b, a + 1, b, b + 1, a + 1);
      }
    }
  }
  const geometry = new BufferGeometry();
  geometry.setAttribute('position', new Float32BufferAttribute(positions, 3));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  return geometry;
}

export function createScene(container: HTMLElement) {
  const renderer = new WebGLRenderer({
    alpha: true,
    antialias: true,
    powerPreference: 'low-power',
  });
  const resources: { dispose: () => void }[] = [];
  const gl = renderer.getContext();
  const samples = Math.max(1, Number(gl.getParameter(gl.SAMPLES)));
  // Reserve 16 MiB for geometry/environment; include multisample and resolved color/depth.
  const framebufferBytesPerPixel = samples * 8 + 8;
  const memoryPixelLimit = Math.floor(
    (48 * 1024 ** 2) / framebufferBytesPerPixel,
  );
  const scene = new Scene();
  const camera = new OrthographicCamera(-3.1, 3.1, 3.1, -3.1, 0.1, 40);
  let disposed = false;

  function dispose() {
    if (disposed) return;
    disposed = true;
    scene.environment = null;
    for (const resource of resources) resource.dispose();
    renderer.dispose();
    renderer.forceContextLoss();
    renderer.domElement.remove();
  }
  function own<T extends { dispose: () => void }>(resource: T): T {
    resources.push(resource);
    return resource;
  }

  try {
    renderer.setClearColor(0x080b10, 0);
    renderer.outputColorSpace = SRGBColorSpace;
    renderer.toneMapping = ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.3;
    renderer.domElement.setAttribute('aria-hidden', 'true');
    camera.position.set(0, 0.4, 9);
    camera.lookAt(0, 0, 0);

    const environment = document.createElement('canvas');
    environment.width = 1024;
    environment.height = 512;
    const context = environment.getContext('2d');
    if (!context) throw new Error('Environment canvas is unavailable');
    const gradient = context.createLinearGradient(0, 0, 0, 512);
    gradient.addColorStop(0, '#e7f4df');
    gradient.addColorStop(0.28, '#122c28');
    gradient.addColorStop(0.5, '#233631');
    gradient.addColorStop(0.65, '#091310');
    gradient.addColorStop(1, '#829d8e');
    context.fillStyle = gradient;
    context.fillRect(0, 0, 1024, 512);
    context.fillStyle = '#f4f4df';
    context.fillRect(80, 20, 140, 310);
    context.fillRect(670, 50, 80, 260);
    context.fillStyle = '#b5e9d7';
    context.fillRect(340, 30, 45, 420);
    context.fillStyle = '#edbe95';
    context.fillRect(880, 110, 110, 120);
    const texture = own(new CanvasTexture(environment));
    texture.mapping = EquirectangularReflectionMapping;
    texture.colorSpace = SRGBColorSpace;
    const generator = new PMREMGenerator(renderer);
    const env = own(generator.fromEquirectangular(texture));
    generator.dispose();
    scene.environment = env.texture;
    scene.add(new AmbientLight(0xb6d5c7, 1.2));
    const key = new DirectionalLight(0xedfce4, 3);
    key.position.set(-3, 4, 5);
    const fill = new DirectionalLight(0x9ef0d0, 2);
    fill.position.set(4, -2, 3);
    scene.add(key, fill);

    const core = new Group();
    core.rotation.set(0.14, -0.35, -0.43);
    scene.add(core);
    const geometry = own(finGeometry());
    const materials = [0xb0c9bc, 0x829e91, 0xc2c7ad].map((color) =>
      own(
        new MeshStandardMaterial({
          color,
          metalness: 0.92,
          roughness: 0.24,
          side: DoubleSide,
          envMapIntensity: 1.7,
        }),
      ),
    );
    const fins: Mesh<BufferGeometry, MeshStandardMaterial>[] = [];
    for (let i = 0; i < 12; i++) {
      const material = materials[i % materials.length];
      if (!material) throw new Error('Fin material is missing');
      const fin = new Mesh(geometry, material);
      fin.rotation.y = (i * Math.PI) / 6;
      fins.push(fin);
      core.add(fin);
    }
    const nucleusMaterial = own(
      new MeshStandardMaterial({
        color: 0xb2eaca,
        emissive: 0x426d53,
        emissiveIntensity: 0.25,
        metalness: 0.65,
        roughness: 0.19,
      }),
    );
    const nucleus = new Mesh(
      own(new IcosahedronGeometry(0.67, 2)),
      nucleusMaterial,
    );
    core.add(nucleus);
    const ringGeometry = own(new TorusGeometry(2.02, 0.014, 6, 180));
    const ringMaterial = own(
      new MeshStandardMaterial({
        color: 0xa8debe,
        metalness: 0.7,
        roughness: 0.3,
        emissive: 0x1d3c2a,
      }),
    );
    const rings: Mesh<BufferGeometry, Material>[] = [];
    for (let i = 0; i < 3; i++) {
      const ring = new Mesh(ringGeometry, ringMaterial);
      ring.rotation.set(Math.PI / 2 + i * 0.35, i * 0.6, i * 0.5);
      ring.scale.setScalar(1 + i * 0.1);
      core.add(ring);
      rings.push(ring);
    }
    let seed = 237;
    const random = () => {
      seed = (seed * 16807) % 2147483647;
      return (seed - 1) / 2147483646;
    };
    const points: number[] = [];
    for (let i = 0; i < 350; i++) {
      const angle = random() * Math.PI * 2;
      const radius = 2.2 + random() * 0.55;
      points.push(
        Math.cos(angle) * radius,
        (random() - 0.5) * 3.8,
        Math.sin(angle) * radius,
      );
    }
    const pointGeometry = own(new BufferGeometry());
    pointGeometry.setAttribute(
      'position',
      new Float32BufferAttribute(points, 3),
    );
    const dust = new Points(
      pointGeometry,
      own(
        new PointsMaterial({
          color: 0xa0cab1,
          size: 0.012,
          transparent: true,
          opacity: 0.5,
          depthWrite: false,
        }),
      ),
    );
    core.add(dust);
    container.append(renderer.domElement);
    let quality: Quality = 'standard';

    function resize() {
      const { width, height } = container.getBoundingClientRect();
      if (width <= 0 || height <= 0) return;
      const aspect = width / height;
      const halfHeight = 3.1 / Math.min(1, aspect);
      camera.left = -halfHeight * aspect;
      camera.right = halfHeight * aspect;
      camera.top = halfHeight;
      camera.bottom = -halfHeight;
      camera.updateProjectionMatrix();
      renderer.setPixelRatio(
        pixelRatio(
          width,
          height,
          window.devicePixelRatio || 1,
          quality,
          memoryPixelLimit,
        ),
      );
      renderer.setSize(width, height, false);
      renderer.domElement.dataset.dpr = String(renderer.getPixelRatio());
      renderer.domElement.dataset.gpuEstimate = String(
        renderer.domElement.width *
          renderer.domElement.height *
          framebufferBytesPerPixel +
          16 * 1024 ** 2,
      );
    }
    function update(pose: Pose) {
      const expand =
        Math.sin(Math.min(1, pose.progress * 1.3) * Math.PI) * 0.72;
      const retreat = Math.max(0, (pose.progress - 0.7) / 0.3);
      core.rotation.set(
        0.14 + pose.y * 0.07,
        -0.35 + pose.progress * 0.9 + pose.x * 0.07,
        -0.43 + pose.progress * 0.26,
      );
      core.scale.setScalar((0.97 + pose.intro * 0.03) * (1 - retreat * 0.14));
      core.position.y = -0.12 * retreat;
      fins.forEach((fin, i) => {
        const angle = (i * Math.PI) / 6;
        fin.position.set(
          Math.cos(angle) * expand,
          ((i % 3) - 1) * expand * 0.8,
          Math.sin(angle) * expand,
        );
        fin.rotation.y = angle + expand * 0.16;
      });
      materials.forEach((material, i) => {
        const intensity =
          Math.max(0, 1 - Math.abs(pose.emphasis - (i + 1))) * 0.18;
        material.emissive.setHex(0x9ef0d0);
        material.emissiveIntensity = intensity;
      });
      nucleus.rotation.set(pose.progress * 0.3, pose.progress * 0.8, 0);
      rings.forEach((ring, i) => {
        ring.rotation.z = i * 0.5 + pose.progress * (i % 2 ? -0.6 : 0.6);
        ring.scale.setScalar(1 + i * 0.1 + expand * 0.18);
      });
      dust.rotation.y = pose.progress * 0.3;
    }
    function render() {
      if (disposed) return;
      renderer.render(scene, camera);
      const info = renderer.info.render;
      renderer.domElement.dataset.frames = String(info.frame);
      renderer.domElement.dataset.drawCalls = String(info.calls);
      renderer.domElement.dataset.triangles = String(info.triangles);
      renderer.domElement.dataset.points = String(info.points);
    }
    resize();
    return {
      canvas: renderer.domElement,
      update,
      render,
      resize,
      dispose,
      setQuality(value: Quality) {
        quality = value;
        pointGeometry.setDrawRange(0, value === 'low' ? 150 : 350);
        renderer.domElement.dataset.quality = value;
        resize();
      },
    };
  } catch (error) {
    dispose();
    throw error;
  }
}
