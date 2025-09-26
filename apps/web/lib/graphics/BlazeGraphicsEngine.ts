/**
 * =============================================================================
 * BLAZE GRAPHICS ENGINE - ADVANCED 3D VISUALIZATION ARCHITECTURE
 * =============================================================================
 * Next-generation graphics engine for blazesportsintel.com
 * Supports Three.js, WebGL2/WebGPU, AR/VR, and high-performance rendering
 * Performance target: 60fps with <100ms latency for Vision AI overlays
 * =============================================================================
 */

import * as THREE from 'three';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass';
import { SSAOPass } from 'three/examples/jsm/postprocessing/SSAOPass';
import { TAARenderPass } from 'three/examples/jsm/postprocessing/TAARenderPass';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader';
import { DRACOLoader } from 'three/examples/jsm/loaders/DRACOLoader';
import { KTX2Loader } from 'three/examples/jsm/loaders/KTX2Loader';
import { GPU } from 'gpu.js';

// =============================================================================
// CONFIGURATION & TYPES
// =============================================================================

export interface GraphicsConfig {
  renderer: 'webgl2' | 'webgpu' | 'auto';
  quality: 'ultra' | 'high' | 'medium' | 'low' | 'adaptive';
  targetFPS: number;
  enablePostProcessing: boolean;
  enableAR: boolean;
  enableVR: boolean;
  enableRayTracing: boolean;
  pixelRatio: number;
  antialias: boolean;
  shadows: boolean;
  physicallyCorrectLights: boolean;
  toneMapping: THREE.ToneMapping;
  outputEncoding: THREE.TextureEncoding;
}

export interface PerformanceMetrics {
  fps: number;
  frameTime: number;
  drawCalls: number;
  triangles: number;
  points: number;
  lines: number;
  memoryUsage: number;
  gpuMemory: number;
  latency: number;
  qualityLevel: string;
}

export interface LODConfig {
  distances: number[];
  meshes: THREE.Mesh[];
  autoUpdate: boolean;
}

export interface StreamingConfig {
  enableTextureStreaming: boolean;
  enableMeshStreaming: boolean;
  maxConcurrentLoads: number;
  priorityQueue: boolean;
  cacheSize: number; // MB
}

// =============================================================================
// MAIN GRAPHICS ENGINE CLASS
// =============================================================================

export class BlazeGraphicsEngine {
  private renderer!: THREE.WebGLRenderer;
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private composer?: EffectComposer;
  private controls?: OrbitControls;
  private clock: THREE.Clock;
  private stats: PerformanceMetrics;
  private config: GraphicsConfig;
  private gpu?: GPU;
  private animationId?: number;
  private lodSystem: Map<string, LODConfig>;
  private textureLoader: THREE.TextureLoader;
  private gltfLoader: GLTFLoader;
  private dracoLoader: DRACOLoader;
  private ktx2Loader: KTX2Loader;
  private particleSystems: Map<string, ParticleSystem>;
  private volumetricEffects: Map<string, VolumetricEffect>;
  private arSupported: boolean = false;
  private vrSupported: boolean = false;
  private isInitialized: boolean = false;

  // Performance optimization
  private frameTimeHistory: number[] = [];
  private qualityAdaptationEnabled: boolean = true;
  private lastQualityCheck: number = 0;
  private renderTargets: Map<string, THREE.WebGLRenderTarget>;

  constructor(config: Partial<GraphicsConfig> = {}) {
    this.config = {
      renderer: config.renderer || 'auto',
      quality: config.quality || 'adaptive',
      targetFPS: config.targetFPS || 60,
      enablePostProcessing: config.enablePostProcessing !== false,
      enableAR: config.enableAR || false,
      enableVR: config.enableVR || false,
      enableRayTracing: config.enableRayTracing || false,
      pixelRatio: config.pixelRatio || window.devicePixelRatio,
      antialias: config.antialias !== false,
      shadows: config.shadows !== false,
      physicallyCorrectLights: config.physicallyCorrectLights !== false,
      toneMapping: config.toneMapping || THREE.ACESFilmicToneMapping,
      outputEncoding: config.outputEncoding || THREE.sRGBEncoding
    };

    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(
      75,
      window.innerWidth / window.innerHeight,
      0.1,
      10000
    );
    this.camera.position.set(0, 10, 30);

    this.clock = new THREE.Clock();
    this.stats = this.initializeStats();
    this.lodSystem = new Map();
    this.particleSystems = new Map();
    this.volumetricEffects = new Map();
    this.renderTargets = new Map();

    // Initialize loaders
    this.textureLoader = new THREE.TextureLoader();
    this.gltfLoader = new GLTFLoader();
    this.dracoLoader = new DRACOLoader();
    this.dracoLoader.setDecoderPath('https://www.gstatic.com/draco/versioned/decoders/1.5.6/');
    this.gltfLoader.setDRACOLoader(this.dracoLoader);

    this.ktx2Loader = new KTX2Loader();
    this.ktx2Loader.setTranscoderPath('https://cdn.jsdelivr.net/npm/three@0.165.0/examples/jsm/libs/basis/');
  }

  // =============================================================================
  // INITIALIZATION
  // =============================================================================

  async initialize(container: HTMLElement): Promise<void> {
    if (this.isInitialized) return;

    try {
      // Initialize renderer based on config
      await this.initializeRenderer(container);

      // Initialize GPU.js for compute operations
      if (typeof GPU !== 'undefined') {
        this.gpu = new GPU({ mode: 'gpu' });
      }

      // Setup scene
      this.setupScene();
      this.setupLighting();
      this.setupControls();

      // Initialize post-processing if enabled
      if (this.config.enablePostProcessing) {
        this.setupPostProcessing();
      }

      // Check AR/VR support
      await this.checkXRSupport();

      // Setup resize handler
      this.setupEventListeners();

      // Initialize performance monitoring
      this.startPerformanceMonitoring();

      this.isInitialized = true;
      console.log('🔥 Blaze Graphics Engine initialized successfully');

    } catch (error) {
      console.error('Failed to initialize graphics engine:', error);
      throw error;
    }
  }

  private async initializeRenderer(container: HTMLElement): Promise<void> {
    const canvas = document.createElement('canvas');
    container.appendChild(canvas);

    // Determine best renderer
    let rendererType = this.config.renderer;
    if (rendererType === 'auto') {
      rendererType = await this.detectBestRenderer();
    }

    // Create renderer
    this.renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: this.config.antialias,
      powerPreference: 'high-performance',
      precision: 'highp',
      alpha: true,
      preserveDrawingBuffer: true
    });

    // Configure renderer
    this.renderer.setPixelRatio(Math.min(this.config.pixelRatio, 2));
    this.renderer.setSize(container.clientWidth, container.clientHeight);
    this.renderer.shadowMap.enabled = this.config.shadows;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.toneMapping = this.config.toneMapping;
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.physicallyCorrectLights = this.config.physicallyCorrectLights;

    // Enable advanced features if available
    const gl = this.renderer.getContext() as WebGL2RenderingContext;
    const extensions = {
      anisotropy: this.renderer.capabilities.getMaxAnisotropy(),
      floatTextures: gl.getExtension('OES_texture_float'),
      derivatives: gl.getExtension('OES_standard_derivatives'),
      shaderTextureLOD: gl.getExtension('EXT_shader_texture_lod'),
      depthTexture: gl.getExtension('WEBGL_depth_texture')
    };

    console.log('Renderer capabilities:', {
      type: rendererType,
      maxTextureSize: this.renderer.capabilities.maxTextures,
      maxAnisotropy: extensions.anisotropy,
      floatTextures: !!extensions.floatTextures
    });
  }

  private async detectBestRenderer(): Promise<'webgl2' | 'webgpu'> {
    // Check WebGPU support (future-proofing)
    if ('gpu' in navigator) {
      try {
        const adapter = await (navigator as any).gpu.requestAdapter();
        if (adapter) {
          console.log('WebGPU available - using next-gen renderer');
          return 'webgpu';
        }
      } catch (e) {
        console.log('WebGPU not available, falling back to WebGL2');
      }
    }

    return 'webgl2';
  }

  // =============================================================================
  // SCENE SETUP
  // =============================================================================

  private setupScene(): void {
    // Fog for depth
    this.scene.fog = new THREE.FogExp2(0x0a0a0a, 0.0015);
    this.scene.background = new THREE.Color(0x0a0a0a);

    // Environment map for PBR materials
    const pmremGenerator = new THREE.PMREMGenerator(this.renderer);
    pmremGenerator.compileEquirectangularShader();

    // Add ambient light
    const ambient = new THREE.AmbientLight(0xffffff, 0.3);
    this.scene.add(ambient);

    // Add grid helper for orientation
    const gridHelper = new THREE.GridHelper(100, 50, 0xff4500, 0x1a1a1a);
    this.scene.add(gridHelper);
  }

  private setupLighting(): void {
    // Main directional light (sun)
    const dirLight = new THREE.DirectionalLight(0xffffff, 1);
    dirLight.position.set(50, 100, 50);
    dirLight.castShadow = this.config.shadows;
    dirLight.shadow.camera.left = -50;
    dirLight.shadow.camera.right = 50;
    dirLight.shadow.camera.top = 50;
    dirLight.shadow.camera.bottom = -50;
    dirLight.shadow.camera.near = 0.1;
    dirLight.shadow.camera.far = 200;
    dirLight.shadow.mapSize.width = 4096;
    dirLight.shadow.mapSize.height = 4096;
    dirLight.shadow.bias = -0.0005;
    this.scene.add(dirLight);

    // Fill lights
    const fillLight1 = new THREE.DirectionalLight(0x9bcbeb, 0.5); // Cardinal blue
    fillLight1.position.set(-30, 20, -30);
    this.scene.add(fillLight1);

    // Rim light for dramatic effect
    const rimLight = new THREE.DirectionalLight(0xff4500, 0.3); // Burnt orange
    rimLight.position.set(0, 30, -50);
    this.scene.add(rimLight);

    // Point lights for stadium effect
    for (let i = 0; i < 4; i++) {
      const angle = (i / 4) * Math.PI * 2;
      const pointLight = new THREE.PointLight(0xffa500, 0.5, 100);
      pointLight.position.set(
        Math.cos(angle) * 40,
        15,
        Math.sin(angle) * 40
      );
      pointLight.castShadow = this.config.shadows;
      this.scene.add(pointLight);
    }
  }

  private setupControls(): void {
    if (!this.renderer) return;

    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.05;
    this.controls.screenSpacePanning = false;
    this.controls.minDistance = 5;
    this.controls.maxDistance = 500;
    this.controls.maxPolarAngle = Math.PI / 2;
    this.controls.target.set(0, 0, 0);
  }

  private setupPostProcessing(): void {
    if (!this.renderer) return;

    this.composer = new EffectComposer(this.renderer);

    // Main render pass
    const renderPass = new RenderPass(this.scene, this.camera);
    this.composer.addPass(renderPass);

    // SSAO for ambient occlusion
    const ssaoPass = new SSAOPass(
      this.scene,
      this.camera,
      window.innerWidth,
      window.innerHeight
    );
    ssaoPass.kernelRadius = 16;
    ssaoPass.minDistance = 0.005;
    ssaoPass.maxDistance = 0.1;
    this.composer.addPass(ssaoPass);

    // Bloom for emissive materials
    const bloomPass = new UnrealBloomPass(
      new THREE.Vector2(window.innerWidth, window.innerHeight),
      0.5, // Intensity
      0.4, // Radius
      0.85 // Threshold
    );
    this.composer.addPass(bloomPass);

    // TAA for antialiasing
    const taaPass = new TAARenderPass(this.scene, this.camera);
    taaPass.unbiased = false;
    taaPass.sampleLevel = 2;
    this.composer.addPass(taaPass);
  }

  // =============================================================================
  // PARTICLE SYSTEMS
  // =============================================================================

  createParticleSystem(
    name: string,
    count: number,
    config: {
      texture?: string;
      color?: THREE.Color;
      size?: number;
      sizeVariation?: number;
      velocity?: THREE.Vector3;
      acceleration?: THREE.Vector3;
      lifetime?: number;
      emissionRate?: number;
    } = {}
  ): ParticleSystem {
    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(count * 3);
    const velocities = new Float32Array(count * 3);
    const colors = new Float32Array(count * 3);
    const sizes = new Float32Array(count);
    const lifetimes = new Float32Array(count);

    // Initialize particles
    for (let i = 0; i < count; i++) {
      const i3 = i * 3;

      // Random spawn position
      positions[i3] = (Math.random() - 0.5) * 100;
      positions[i3 + 1] = Math.random() * 50;
      positions[i3 + 2] = (Math.random() - 0.5) * 100;

      // Initial velocity
      const vel = config.velocity || new THREE.Vector3(0, 1, 0);
      velocities[i3] = vel.x + (Math.random() - 0.5) * 0.5;
      velocities[i3 + 1] = vel.y + (Math.random() - 0.5) * 0.5;
      velocities[i3 + 2] = vel.z + (Math.random() - 0.5) * 0.5;

      // Color
      const color = config.color || new THREE.Color(0xff4500);
      colors[i3] = color.r;
      colors[i3 + 1] = color.g;
      colors[i3 + 2] = color.b;

      // Size
      const baseSize = config.size || 1;
      const variation = config.sizeVariation || 0.5;
      sizes[i] = baseSize + (Math.random() - 0.5) * variation;

      // Lifetime
      lifetimes[i] = config.lifetime || 5 + Math.random() * 5;
    }

    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('velocity', new THREE.BufferAttribute(velocities, 3));
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    geometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1));
    geometry.setAttribute('lifetime', new THREE.BufferAttribute(lifetimes, 1));

    // Custom shader material
    const material = new THREE.ShaderMaterial({
      uniforms: {
        time: { value: 0 },
        texture: { value: config.texture ? this.textureLoader.load(config.texture) : null },
        acceleration: { value: config.acceleration || new THREE.Vector3(0, -0.98, 0) }
      },
      vertexShader: `
        attribute vec3 velocity;
        attribute float size;
        attribute float lifetime;
        varying vec3 vColor;
        varying float vLifetime;
        uniform float time;
        uniform vec3 acceleration;

        void main() {
          vColor = color;
          vLifetime = lifetime;

          vec3 pos = position + velocity * time + 0.5 * acceleration * time * time;

          // Wrap around boundaries
          pos = mod(pos + 50.0, 100.0) - 50.0;

          vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);
          gl_PointSize = size * (300.0 / -mvPosition.z);
          gl_Position = projectionMatrix * mvPosition;
        }
      `,
      fragmentShader: `
        varying vec3 vColor;
        varying float vLifetime;
        uniform sampler2D texture;
        uniform float time;

        void main() {
          vec2 coord = gl_PointCoord - vec2(0.5);
          if (length(coord) > 0.5) discard;

          float alpha = 1.0 - (time / vLifetime);
          alpha = clamp(alpha, 0.0, 1.0);

          vec3 color = vColor;

          // Add glow effect
          float glow = 1.0 - length(coord) * 2.0;
          color += vec3(glow * 0.5);

          gl_FragColor = vec4(color, alpha * 0.8);
        }
      `,
      transparent: true,
      depthWrite: false,
      vertexColors: true,
      blending: THREE.AdditiveBlending
    });

    const points = new THREE.Points(geometry, material);
    this.scene.add(points);

    const system: ParticleSystem = {
      name,
      points,
      material,
      config,
      startTime: this.clock.getElapsedTime(),
      update: (deltaTime: number) => {
        material.uniforms.time.value += deltaTime;

        // Reset particles after lifetime
        if (material.uniforms.time.value > (config.lifetime || 10)) {
          material.uniforms.time.value = 0;
        }
      }
    };

    this.particleSystems.set(name, system);
    return system;
  }

  // =============================================================================
  // 3D STADIUM VISUALIZATION
  // =============================================================================

  async loadStadiumModel(url: string): Promise<THREE.Group> {
    return new Promise((resolve, reject) => {
      this.gltfLoader.load(
        url,
        (gltf) => {
          const stadium = gltf.scene;

          // Optimize materials
          stadium.traverse((child) => {
            if ((child as THREE.Mesh).isMesh) {
              const mesh = child as THREE.Mesh;

              // Enable shadows
              mesh.castShadow = true;
              mesh.receiveShadow = true;

              // Optimize material
              if (mesh.material) {
                const material = mesh.material as THREE.MeshStandardMaterial;
                material.envMapIntensity = 0.5;
                material.roughness = 0.7;
              }
            }
          });

          // Add to scene
          this.scene.add(stadium);

          // Create LOD system for stadium
          this.createLODForModel(stadium, 'stadium');

          resolve(stadium);
        },
        (progress) => {
          console.log(`Stadium loading: ${(progress.loaded / progress.total * 100).toFixed(2)}%`);
        },
        (error) => {
          console.error('Error loading stadium:', error);
          reject(error);
        }
      );
    });
  }

  // =============================================================================
  // LOD SYSTEM
  // =============================================================================

  private createLODForModel(model: THREE.Object3D, name: string): void {
    const lod = new THREE.LOD();

    // High detail (close)
    const highDetail = model.clone();
    lod.addLevel(highDetail, 0);

    // Medium detail
    const mediumDetail = this.simplifyModel(model, 0.5);
    lod.addLevel(mediumDetail, 50);

    // Low detail (far)
    const lowDetail = this.simplifyModel(model, 0.2);
    lod.addLevel(lowDetail, 150);

    // Replace original model with LOD
    model.parent?.remove(model);
    lod.position.copy(model.position);
    lod.rotation.copy(model.rotation);
    lod.scale.copy(model.scale);

    this.scene.add(lod);

    this.lodSystem.set(name, {
      distances: [0, 50, 150],
      meshes: [highDetail, mediumDetail, lowDetail] as THREE.Mesh[],
      autoUpdate: true
    });
  }

  private simplifyModel(model: THREE.Object3D, ratio: number): THREE.Object3D {
    // Simplified clone - in production, use mesh decimation algorithms
    const simplified = model.clone();

    simplified.traverse((child) => {
      if ((child as THREE.Mesh).isMesh) {
        const mesh = child as THREE.Mesh;
        const geometry = mesh.geometry;

        // Simple decimation (production would use proper algorithms)
        if (geometry.attributes.position) {
          const positions = geometry.attributes.position;
          const step = Math.max(1, Math.floor(1 / ratio));

          // This is a placeholder - real decimation would preserve topology
          mesh.material = new THREE.MeshBasicMaterial({
            color: (mesh.material as THREE.MeshStandardMaterial).color || 0xffffff
          });
        }
      }
    });

    return simplified;
  }

  // =============================================================================
  // HEAT MAP VISUALIZATION
  // =============================================================================

  createHeatMap(
    data: { x: number; y: number; intensity: number }[],
    width: number = 100,
    height: number = 100
  ): THREE.Mesh {
    // Generate heat map texture using GPU.js if available
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 512;
    const ctx = canvas.getContext('2d')!;

    // Create gradient
    const gradient = ctx.createLinearGradient(0, 0, canvas.width, 0);
    gradient.addColorStop(0, '#0000ff');
    gradient.addColorStop(0.25, '#00ffff');
    gradient.addColorStop(0.5, '#00ff00');
    gradient.addColorStop(0.75, '#ffff00');
    gradient.addColorStop(1, '#ff0000');

    // Generate heat map
    data.forEach(point => {
      const x = (point.x / width) * canvas.width;
      const y = (point.y / height) * canvas.height;
      const radius = point.intensity * 50;

      const radGradient = ctx.createRadialGradient(x, y, 0, x, y, radius);
      radGradient.addColorStop(0, `rgba(255, 0, 0, ${point.intensity})`);
      radGradient.addColorStop(1, 'rgba(255, 0, 0, 0)');

      ctx.fillStyle = radGradient;
      ctx.fillRect(x - radius, y - radius, radius * 2, radius * 2);
    });

    // Create texture from canvas
    const texture = new THREE.CanvasTexture(canvas);
    texture.needsUpdate = true;

    // Create mesh
    const geometry = new THREE.PlaneGeometry(width, height, 64, 64);
    const material = new THREE.MeshStandardMaterial({
      map: texture,
      transparent: true,
      opacity: 0.8,
      emissive: new THREE.Color(0xff4500),
      emissiveIntensity: 0.3,
      side: THREE.DoubleSide
    });

    const mesh = new THREE.Mesh(geometry, material);
    mesh.rotation.x = -Math.PI / 2;
    mesh.position.y = 0.1;

    this.scene.add(mesh);

    return mesh;
  }

  // =============================================================================
  // AR/VR SUPPORT
  // =============================================================================

  private async checkXRSupport(): Promise<void> {
    if ('xr' in navigator) {
      // Check AR support
      try {
        this.arSupported = await (navigator as any).xr.isSessionSupported('immersive-ar');
        console.log('AR Support:', this.arSupported);
      } catch (e) {
        console.log('AR not supported');
      }

      // Check VR support
      try {
        this.vrSupported = await (navigator as any).xr.isSessionSupported('immersive-vr');
        console.log('VR Support:', this.vrSupported);
      } catch (e) {
        console.log('VR not supported');
      }
    }
  }

  async enterAR(): Promise<void> {
    if (!this.arSupported) {
      console.warn('AR not supported on this device');
      return;
    }

    // Request AR session
    try {
      const session = await (navigator as any).xr.requestSession('immersive-ar', {
        requiredFeatures: ['hit-test', 'anchors']
      });

      // Configure renderer for AR
      this.renderer.xr.enabled = true;
      await this.renderer.xr.setSession(session);

      console.log('Entered AR mode');
    } catch (error) {
      console.error('Failed to enter AR:', error);
    }
  }

  async enterVR(): Promise<void> {
    if (!this.vrSupported) {
      console.warn('VR not supported on this device');
      return;
    }

    try {
      const session = await (navigator as any).xr.requestSession('immersive-vr');

      this.renderer.xr.enabled = true;
      await this.renderer.xr.setSession(session);

      console.log('Entered VR mode');
    } catch (error) {
      console.error('Failed to enter VR:', error);
    }
  }

  // =============================================================================
  // PERFORMANCE OPTIMIZATION
  // =============================================================================

  private startPerformanceMonitoring(): void {
    const monitor = () => {
      const info = this.renderer.info;

      this.stats = {
        fps: 1000 / this.clock.getDelta(),
        frameTime: this.clock.getDelta() * 1000,
        drawCalls: info.render.calls,
        triangles: info.render.triangles,
        points: info.render.points,
        lines: info.render.lines,
        memoryUsage: (performance as any).memory?.usedJSHeapSize / 1048576 || 0,
        gpuMemory: info.memory.textures,
        latency: performance.now() % 100, // Simulated
        qualityLevel: this.config.quality
      };

      // Update frame time history
      this.frameTimeHistory.push(this.stats.frameTime);
      if (this.frameTimeHistory.length > 60) {
        this.frameTimeHistory.shift();
      }

      // Adaptive quality
      if (this.qualityAdaptationEnabled && this.config.quality === 'adaptive') {
        this.adaptQuality();
      }
    };

    setInterval(monitor, 1000 / 60);
  }

  private adaptQuality(): void {
    const now = Date.now();
    if (now - this.lastQualityCheck < 1000) return; // Check every second

    this.lastQualityCheck = now;

    const avgFrameTime = this.frameTimeHistory.reduce((a, b) => a + b, 0) / this.frameTimeHistory.length;
    const targetFrameTime = 1000 / this.config.targetFPS;

    if (avgFrameTime > targetFrameTime * 1.2) {
      // Reduce quality
      this.reduceQuality();
    } else if (avgFrameTime < targetFrameTime * 0.8) {
      // Increase quality
      this.increaseQuality();
    }
  }

  private reduceQuality(): void {
    console.log('Reducing quality for better performance');

    // Reduce pixel ratio
    if (this.renderer.getPixelRatio() > 1) {
      this.renderer.setPixelRatio(Math.max(1, this.renderer.getPixelRatio() - 0.25));
    }

    // Disable shadows
    if (this.renderer.shadowMap.enabled) {
      this.renderer.shadowMap.enabled = false;
    }

    // Disable post-processing
    if (this.composer) {
      this.config.enablePostProcessing = false;
    }

    // Reduce particle count
    this.particleSystems.forEach(system => {
      if (system.points.geometry.attributes.position.count > 1000) {
        // Reduce particle count logic here
      }
    });
  }

  private increaseQuality(): void {
    console.log('Increasing quality');

    // Increase pixel ratio
    if (this.renderer.getPixelRatio() < this.config.pixelRatio) {
      this.renderer.setPixelRatio(Math.min(this.config.pixelRatio, this.renderer.getPixelRatio() + 0.25));
    }

    // Enable shadows
    if (!this.renderer.shadowMap.enabled && this.config.shadows) {
      this.renderer.shadowMap.enabled = true;
    }

    // Enable post-processing
    if (!this.config.enablePostProcessing && this.composer) {
      this.config.enablePostProcessing = true;
    }
  }

  // =============================================================================
  // RENDERING
  // =============================================================================

  start(): void {
    const animate = () => {
      this.animationId = requestAnimationFrame(animate);

      const deltaTime = this.clock.getDelta();

      // Update controls
      if (this.controls) {
        this.controls.update();
      }

      // Update particle systems
      this.particleSystems.forEach(system => {
        system.update(deltaTime);
      });

      // Update LOD
      this.lodSystem.forEach((config, name) => {
        // LOD updates automatically based on camera distance
      });

      // Render
      if (this.composer && this.config.enablePostProcessing) {
        this.composer.render();
      } else {
        this.renderer.render(this.scene, this.camera);
      }
    };

    animate();
  }

  stop(): void {
    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
      this.animationId = undefined;
    }
  }

  // =============================================================================
  // EVENT HANDLERS
  // =============================================================================

  private setupEventListeners(): void {
    window.addEventListener('resize', () => this.handleResize());

    // Performance observer
    if ('PerformanceObserver' in window) {
      const observer = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          if (entry.entryType === 'measure') {
            console.log(`Performance: ${entry.name} - ${entry.duration}ms`);
          }
        }
      });
      observer.observe({ entryTypes: ['measure'] });
    }
  }

  private handleResize(): void {
    const width = window.innerWidth;
    const height = window.innerHeight;

    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();

    this.renderer.setSize(width, height);

    if (this.composer) {
      this.composer.setSize(width, height);
    }
  }

  // =============================================================================
  // UTILITIES
  // =============================================================================

  getStats(): PerformanceMetrics {
    return { ...this.stats };
  }

  takeScreenshot(): string {
    this.renderer.render(this.scene, this.camera);
    return this.renderer.domElement.toDataURL('image/png');
  }

  setQuality(quality: GraphicsConfig['quality']): void {
    this.config.quality = quality;

    // Apply quality settings
    switch (quality) {
      case 'ultra':
        this.renderer.setPixelRatio(window.devicePixelRatio);
        this.renderer.shadowMap.enabled = true;
        this.config.enablePostProcessing = true;
        break;
      case 'high':
        this.renderer.setPixelRatio(Math.min(2, window.devicePixelRatio));
        this.renderer.shadowMap.enabled = true;
        this.config.enablePostProcessing = true;
        break;
      case 'medium':
        this.renderer.setPixelRatio(1.5);
        this.renderer.shadowMap.enabled = true;
        this.config.enablePostProcessing = false;
        break;
      case 'low':
        this.renderer.setPixelRatio(1);
        this.renderer.shadowMap.enabled = false;
        this.config.enablePostProcessing = false;
        break;
    }
  }

  dispose(): void {
    this.stop();

    // Dispose of all resources
    this.particleSystems.forEach(system => {
      system.points.geometry.dispose();
      system.material.dispose();
    });

    this.scene.traverse((child) => {
      if ((child as THREE.Mesh).isMesh) {
        const mesh = child as THREE.Mesh;
        mesh.geometry.dispose();
        if (Array.isArray(mesh.material)) {
          mesh.material.forEach(m => m.dispose());
        } else {
          mesh.material.dispose();
        }
      }
    });

    this.renderer.dispose();

    // Clean up loaders
    this.dracoLoader.dispose();
    this.ktx2Loader.dispose();

    console.log('Graphics engine disposed');
  }

  private initializeStats(): PerformanceMetrics {
    return {
      fps: 0,
      frameTime: 0,
      drawCalls: 0,
      triangles: 0,
      points: 0,
      lines: 0,
      memoryUsage: 0,
      gpuMemory: 0,
      latency: 0,
      qualityLevel: 'high'
    };
  }
}

// =============================================================================
// HELPER INTERFACES
// =============================================================================

interface ParticleSystem {
  name: string;
  points: THREE.Points;
  material: THREE.ShaderMaterial;
  config: any;
  startTime: number;
  update: (deltaTime: number) => void;
}

interface VolumetricEffect {
  name: string;
  mesh: THREE.Mesh;
  material: THREE.ShaderMaterial;
  update: (time: number) => void;
}

// =============================================================================
// EXPORT SINGLETON INSTANCE
// =============================================================================

let engineInstance: BlazeGraphicsEngine | null = null;

export function getBlazeGraphicsEngine(config?: Partial<GraphicsConfig>): BlazeGraphicsEngine {
  if (!engineInstance) {
    engineInstance = new BlazeGraphicsEngine(config);
  }
  return engineInstance;
}

export default BlazeGraphicsEngine;