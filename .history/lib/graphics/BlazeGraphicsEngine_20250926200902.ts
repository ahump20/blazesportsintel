/**
 * Blaze Sports Intelligence - Blaze Graphics Engine
 * Championship Intelligence Platform - Advanced 3D Graphics System
 * The Deep South's Sports Intelligence Hub
 */

import * as THREE from 'three';
import { 
  Stadium3D, 
  ParticleSystemConfig, 
  HeatMap3D, 
  Player3D,
  Camera3DSystem,
  Lighting3DSystem,
  Material3DSystem,
  Graphics3DPerformance,
  VRAudioVisualSupport
} from '../../types/3d.types';
import { SportType } from '../../types/sports.types';

// Graphics engine configuration
interface GraphicsEngineConfig {
  renderer: 'webgl' | 'webgl2' | 'webgpu';
  quality: 'low' | 'medium' | 'high' | 'ultra';
  shadows: boolean;
  postProcessing: boolean;
  antialiasing: boolean;
  targetFPS: number;
  maxMemoryUsage: number; // MB
  enableVR: boolean;
  enableAR: boolean;
  debugMode: boolean;
}

// Performance monitoring interface
interface PerformanceMonitor {
  fps: number;
  frameTime: number;
  memoryUsage: number;
  drawCalls: number;
  triangleCount: number;
  textureMemory: number;
  shaderSwitches: number;
  lastUpdate: number;
}

// Scene management interface
interface SceneManager {
  scenes: Map<string, THREE.Scene>;
  activeScene: string;
  cameras: Map<string, THREE.Camera>;
  activeCamera: string;
  renderers: Map<string, THREE.WebGLRenderer>;
  activeRenderer: string;
}

// Asset management interface
interface AssetManager {
  geometries: Map<string, THREE.BufferGeometry>;
  materials: Map<string, THREE.Material>;
  textures: Map<string, THREE.Texture>;
  models: Map<string, THREE.Object3D>;
  animations: Map<string, THREE.AnimationClip>;
  shaders: Map<string, { vertex: string; fragment: string }>;
}

// Default configuration
const DEFAULT_CONFIG: GraphicsEngineConfig = {
  renderer: 'webgl2',
  quality: 'high',
  shadows: true,
  postProcessing: true,
  antialiasing: true,
  targetFPS: 60,
  maxMemoryUsage: 500,
  enableVR: false,
  enableAR: false,
  debugMode: false
};

/**
 * Blaze Graphics Engine - Advanced 3D Graphics System
 * Handles all 3D rendering, scene management, and performance optimization
 */
export class BlazeGraphicsEngine {
  private config: GraphicsEngineConfig;
  private canvas: HTMLCanvasElement;
  private renderer: THREE.WebGLRenderer;
  private sceneManager: SceneManager;
  private assetManager: AssetManager;
  private performanceMonitor: PerformanceMonitor;
  private animationFrameId: number | null = null;
  private isInitialized: boolean = false;
  private isRunning: boolean = false;
  
  // Scene objects
  private scenes: Map<string, THREE.Scene> = new Map();
  private cameras: Map<string, THREE.Camera> = new Map();
  private lights: Map<string, THREE.Light> = new Map();
  private objects: Map<string, THREE.Object3D> = new Map();
  
  // Performance tracking
  private frameCount: number = 0;
  private lastFrameTime: number = 0;
  private performanceHistory: Array<PerformanceMonitor> = [];
  private maxHistorySize: number = 60; // 1 second at 60fps
  
  // Event system
  private eventListeners: Map<string, Array<(data: any) => void>> = new Map();
  
  constructor(canvas: HTMLCanvasElement, config: Partial<GraphicsEngineConfig> = {}) {
    this.canvas = canvas;
    this.config = { ...DEFAULT_CONFIG, ...config };
    
    // Initialize managers
    this.sceneManager = {
      scenes: new Map(),
      activeScene: 'main',
      cameras: new Map(),
      activeCamera: 'main',
      renderers: new Map(),
      activeRenderer: 'main'
    };
    
    this.assetManager = {
      geometries: new Map(),
      materials: new Map(),
      textures: new Map(),
      models: new Map(),
      animations: new Map(),
      shaders: new Map()
    };
    
    this.performanceMonitor = {
      fps: 0,
      frameTime: 0,
      memoryUsage: 0,
      drawCalls: 0,
      triangleCount: 0,
      textureMemory: 0,
      shaderSwitches: 0,
      lastUpdate: 0
    };
    
    this.initializeRenderer();
    this.initializeScenes();
    this.initializePerformanceMonitoring();
  }
  
  /**
   * Initialize the graphics engine
   */
  async initialize(): Promise<void> {
    try {
      // Initialize WebGL renderer
      await this.initializeRenderer();
      
      // Create main scene
      await this.createMainScene();
      
      // Initialize lighting system
      await this.initializeLighting();
      
      // Initialize camera system
      await this.initializeCameras();
      
      // Load default assets
      await this.loadDefaultAssets();
      
      // Initialize post-processing
      if (this.config.postProcessing) {
        await this.initializePostProcessing();
      }
      
      // Initialize VR/AR if enabled
      if (this.config.enableVR || this.config.enableAR) {
        await this.initializeVRAudioVisual();
      }
      
      this.isInitialized = true;
      this.emit('initialized', { engine: this });
      
      if (this.config.debugMode) {
        console.log('Blaze Graphics Engine initialized successfully');
      }
    } catch (error) {
      console.error('Failed to initialize Blaze Graphics Engine:', error);
      throw error;
    }
  }
  
  /**
   * Initialize WebGL renderer
   */
  private async initializeRenderer(): Promise<void> {
    const rendererConfig: THREE.WebGLRendererParameters = {
      canvas: this.canvas,
      antialias: this.config.antialiasing,
      alpha: true,
      powerPreference: 'high-performance',
      precision: 'highp',
      logarithmicDepthBuffer: true
    };
    
    // Try WebGL2 first, fallback to WebGL
    if (this.config.renderer === 'webgl2') {
      try {
        this.renderer = new THREE.WebGLRenderer(rendererConfig);
        // WebGL2 context detected
      } catch (error) {
        console.warn('WebGL2 not supported, falling back to WebGL');
        this.renderer = new THREE.WebGLRenderer(rendererConfig);
      }
    } else {
      this.renderer = new THREE.WebGLRenderer(rendererConfig);
    }
    
    // Configure renderer
    this.renderer.setSize(this.canvas.clientWidth, this.canvas.clientHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = this.config.shadows;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.0;
    
    // Enable extensions
    this.enableWebGLExtensions();
    
    this.sceneManager.renderers.set('main', this.renderer);
    this.sceneManager.activeRenderer = 'main';
  }
  
  /**
   * Enable WebGL extensions for enhanced features
   */
  private enableWebGLExtensions(): void {
    const gl = this.renderer.getContext();
    const extensions = [
      'EXT_texture_filter_anisotropic',
      'WEBGL_compressed_texture_s3tc',
      'WEBGL_compressed_texture_etc1',
      'WEBGL_compressed_texture_pvrtc',
      'OES_texture_float',
      'OES_texture_half_float',
      'WEBGL_depth_texture',
      'EXT_frag_depth'
    ];
    
    extensions.forEach(extension => {
      if (gl.getExtension(extension)) {
        if (this.config.debugMode) {
          console.log(`Enabled WebGL extension: ${extension}`);
        }
      }
    });
  }
  
  /**
   * Initialize scenes
   */
  private async initializeScenes(): Promise<void> {
    // Create main scene
    const mainScene = new THREE.Scene();
    mainScene.name = 'main';
    mainScene.background = new THREE.Color(0x040309);
    mainScene.fog = new THREE.Fog(0x040309, 100, 1000);
    
    this.scenes.set('main', mainScene);
    this.sceneManager.activeScene = 'main';
    
    // Create additional scenes for different contexts
    const uiScene = new THREE.Scene();
    uiScene.name = 'ui';
    this.scenes.set('ui', uiScene);
    
    const effectsScene = new THREE.Scene();
    effectsScene.name = 'effects';
    this.scenes.set('effects', effectsScene);
  }
  
  /**
   * Create main scene with default setup
   */
  private async createMainScene(): Promise<void> {
    const scene = this.getActiveScene();
    if (!scene) return;
    
    // Add default environment
    await this.createEnvironment(scene);
    
    // Add default lighting
    await this.setupDefaultLighting(scene);
    
    // Add default camera
    await this.setupDefaultCamera();
  }
  
  /**
   * Create environment for the scene
   */
  private async createEnvironment(scene: THREE.Scene): Promise<void> {
    // Skybox
    const skyboxGeometry = new THREE.SphereGeometry(500, 32, 32);
    const skyboxMaterial = new THREE.MeshBasicMaterial({
      color: 0x87CEEB,
      side: THREE.BackSide
    });
    const skybox = new THREE.Mesh(skyboxGeometry, skyboxMaterial);
    skybox.name = 'skybox';
    scene.add(skybox);
    
    // Ground plane
    const groundGeometry = new THREE.PlaneGeometry(1000, 1000);
    const groundMaterial = new THREE.MeshLambertMaterial({
      color: 0x228B22,
      transparent: true,
      opacity: 0.8
    });
    const ground = new THREE.Mesh(groundGeometry, groundMaterial);
    ground.rotation.x = -Math.PI / 2;
    ground.position.y = -10;
    ground.receiveShadow = true;
    ground.name = 'ground';
    scene.add(ground);
  }
  
  /**
   * Initialize lighting system
   */
  private async initializeLighting(): Promise<void> {
    const scene = this.getActiveScene();
    if (!scene) return;
    
    // Ambient light
    const ambientLight = new THREE.AmbientLight(0x404040, 0.3);
    ambientLight.name = 'ambient';
    scene.add(ambientLight);
    this.lights.set('ambient', ambientLight);
    
    // Directional light (sun)
    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight.position.set(100, 100, 50);
    directionalLight.castShadow = true;
    directionalLight.shadow.mapSize.width = 2048;
    directionalLight.shadow.mapSize.height = 2048;
    directionalLight.shadow.camera.near = 0.5;
    directionalLight.shadow.camera.far = 500;
    directionalLight.shadow.camera.left = -100;
    directionalLight.shadow.camera.right = 100;
    directionalLight.shadow.camera.top = 100;
    directionalLight.shadow.camera.bottom = -100;
    directionalLight.name = 'directional';
    scene.add(directionalLight);
    this.lights.set('directional', directionalLight);
    
    // Hemisphere light for natural lighting
    const hemisphereLight = new THREE.HemisphereLight(0x87CEEB, 0x228B22, 0.4);
    hemisphereLight.name = 'hemisphere';
    scene.add(hemisphereLight);
    this.lights.set('hemisphere', hemisphereLight);
  }
  
  /**
   * Setup default lighting
   */
  private async setupDefaultLighting(scene: THREE.Scene): Promise<void> {
    // Additional lighting setup can be added here
    // This is called after the main lighting system is initialized
  }
  
  /**
   * Initialize camera system
   */
  private async initializeCameras(): Promise<void> {
    // Main camera
    const mainCamera = new THREE.PerspectiveCamera(
      75,
      this.canvas.clientWidth / this.canvas.clientHeight,
      0.1,
      1000
    );
    mainCamera.position.set(0, 50, 100);
    mainCamera.name = 'main';
    this.cameras.set('main', mainCamera);
    this.sceneManager.activeCamera = 'main';
    
    // UI camera for overlay elements
    const uiCamera = new THREE.OrthographicCamera(
      -this.canvas.clientWidth / 2,
      this.canvas.clientWidth / 2,
      this.canvas.clientHeight / 2,
      -this.canvas.clientHeight / 2,
      0.1,
      1000
    );
    uiCamera.position.z = 100;
    uiCamera.name = 'ui';
    this.cameras.set('ui', uiCamera);
  }
  
  /**
   * Setup default camera
   */
  private async setupDefaultCamera(): Promise<void> {
    const camera = this.getActiveCamera();
    if (!camera) return;
    
    // Set default camera position and target
    camera.position.set(0, 50, 100);
    camera.lookAt(0, 0, 0);
  }
  
  /**
   * Load default assets
   */
  private async loadDefaultAssets(): Promise<void> {
    // Load default geometries
    await this.loadDefaultGeometries();
    
    // Load default materials
    await this.loadDefaultMaterials();
    
    // Load default textures
    await this.loadDefaultTextures();
    
    // Load default shaders
    await this.loadDefaultShaders();
  }
  
  /**
   * Load default geometries
   */
  private async loadDefaultGeometries(): Promise<void> {
    const geometries = {
      sphere: new THREE.SphereGeometry(1, 32, 32),
      box: new THREE.BoxGeometry(1, 1, 1),
      plane: new THREE.PlaneGeometry(1, 1),
      cylinder: new THREE.CylinderGeometry(1, 1, 1, 32),
      torus: new THREE.TorusGeometry(1, 0.4, 16, 100),
      torusKnot: new THREE.TorusKnotGeometry(1, 0.3, 100, 16)
    };
    
    Object.entries(geometries).forEach(([name, geometry]) => {
      this.assetManager.geometries.set(name, geometry);
    });
  }
  
  /**
   * Load default materials
   */
  private async loadDefaultMaterials(): Promise<void> {
    const materials = {
      basic: new THREE.MeshBasicMaterial({ color: 0xffffff }),
      lambert: new THREE.MeshLambertMaterial({ color: 0xffffff }),
      phong: new THREE.MeshPhongMaterial({ color: 0xffffff }),
      standard: new THREE.MeshStandardMaterial({ color: 0xffffff }),
      physical: new THREE.MeshPhysicalMaterial({ color: 0xffffff }),
      points: new THREE.PointsMaterial({ color: 0xffffff, size: 1 }),
      line: new THREE.LineBasicMaterial({ color: 0xffffff })
    };
    
    Object.entries(materials).forEach(([name, material]) => {
      this.assetManager.materials.set(name, material);
    });
  }
  
  /**
   * Load default textures
   */
  private async loadDefaultTextures(): Promise<void> {
    // Create procedural textures
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 256;
    const context = canvas.getContext('2d')!;
    
    // Noise texture
    const imageData = context.createImageData(256, 256);
    for (let i = 0; i < imageData.data.length; i += 4) {
      const noise = Math.random();
      imageData.data[i] = noise * 255;     // R
      imageData.data[i + 1] = noise * 255; // G
      imageData.data[i + 2] = noise * 255; // B
      imageData.data[i + 3] = 255;         // A
    }
    context.putImageData(imageData, 0, 0);
    
    const noiseTexture = new THREE.CanvasTexture(canvas);
    noiseTexture.wrapS = THREE.RepeatWrapping;
    noiseTexture.wrapT = THREE.RepeatWrapping;
    this.assetManager.textures.set('noise', noiseTexture);
    
    // Gradient texture
    const gradient = context.createLinearGradient(0, 0, 256, 256);
    gradient.addColorStop(0, '#FF0000');
    gradient.addColorStop(0.5, '#00FF00');
    gradient.addColorStop(1, '#0000FF');
    context.fillStyle = gradient;
    context.fillRect(0, 0, 256, 256);
    
    const gradientTexture = new THREE.CanvasTexture(canvas);
    this.assetManager.textures.set('gradient', gradientTexture);
  }
  
  /**
   * Load default shaders
   */
  private async loadDefaultShaders(): Promise<void> {
    const shaders = {
      basic: {
        vertex: `
          varying vec2 vUv;
          void main() {
            vUv = uv;
            gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
          }
        `,
        fragment: `
          varying vec2 vUv;
          void main() {
            gl_FragColor = vec4(vUv, 0.5, 1.0);
          }
        `
      },
      heatmap: {
        vertex: `
          attribute float intensity;
          varying float vIntensity;
          void main() {
            vIntensity = intensity;
            gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
          }
        `,
        fragment: `
          varying float vIntensity;
          void main() {
            vec3 color = mix(vec3(0.0, 0.0, 1.0), vec3(1.0, 0.0, 0.0), vIntensity);
            gl_FragColor = vec4(color, 0.8);
          }
        `
      }
    };
    
    Object.entries(shaders).forEach(([name, shader]) => {
      this.assetManager.shaders.set(name, shader);
    });
  }
  
  /**
   * Initialize post-processing
   */
  private async initializePostProcessing(): Promise<void> {
    // Post-processing setup will be handled by the post-processing library
    // This is a placeholder for future implementation
  }
  
  /**
   * Initialize VR/AR support
   */
  private async initializeVRAudioVisual(): Promise<void> {
    // VR/AR setup will be handled by WebXR
    // This is a placeholder for future implementation
  }
  
  /**
   * Initialize performance monitoring
   */
  private initializePerformanceMonitoring(): void {
    // Set up performance monitoring
    this.lastFrameTime = performance.now();
    
    // Monitor memory usage
    if ('memory' in performance) {
      setInterval(() => {
        const memory = (performance as any).memory;
        this.performanceMonitor.memoryUsage = memory.usedJSHeapSize / 1024 / 1024; // MB
      }, 1000);
    }
  }
  
  /**
   * Start the render loop
   */
  start(): void {
    if (this.isRunning) return;
    
    this.isRunning = true;
    this.render();
    
    if (this.config.debugMode) {
      console.log('Blaze Graphics Engine started');
    }
  }
  
  /**
   * Stop the render loop
   */
  stop(): void {
    if (!this.isRunning) return;
    
    this.isRunning = false;
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
    
    if (this.config.debugMode) {
      console.log('Blaze Graphics Engine stopped');
    }
  }
  
  /**
   * Main render loop
   */
  private render(): void {
    if (!this.isRunning) return;
    
    const currentTime = performance.now();
    const deltaTime = currentTime - this.lastFrameTime;
    
    // Update performance metrics
    this.updatePerformanceMetrics(deltaTime);
    
    // Update scenes
    this.updateScenes(deltaTime);
    
    // Render scenes
    this.renderScenes();
    
    // Schedule next frame
    this.animationFrameId = requestAnimationFrame(() => this.render());
    
    this.lastFrameTime = currentTime;
  }
  
  /**
   * Update performance metrics
   */
  private updatePerformanceMetrics(deltaTime: number): void {
    this.frameCount++;
    
    // Calculate FPS
    if (deltaTime > 0) {
      this.performanceMonitor.fps = 1000 / deltaTime;
      this.performanceMonitor.frameTime = deltaTime;
    }
    
    // Update renderer stats
    const info = this.renderer.info;
    this.performanceMonitor.drawCalls = info.render.calls;
    this.performanceMonitor.triangleCount = info.render.triangles;
    
    // Store performance history
    this.performanceHistory.push({ ...this.performanceMonitor });
    if (this.performanceHistory.length > this.maxHistorySize) {
      this.performanceHistory.shift();
    }
    
    this.performanceMonitor.lastUpdate = performance.now();
  }
  
  /**
   * Update scenes
   */
  private updateScenes(deltaTime: number): void {
    this.scenes.forEach((scene, name) => {
      // Update scene objects
      scene.traverse((object) => {
        if (object.userData.update) {
          object.userData.update(deltaTime);
        }
      });
      
      // Emit scene update event
      this.emit('sceneUpdate', { sceneName: name, deltaTime });
    });
  }
  
  /**
   * Render scenes
   */
  private renderScenes(): void {
    const scene = this.getActiveScene();
    const camera = this.getActiveCamera();
    
    if (scene && camera) {
      this.renderer.render(scene, camera);
    }
  }
  
  /**
   * Create a stadium 3D model
   */
  async createStadium3D(stadiumData: Stadium3D): Promise<THREE.Object3D> {
    const stadium = new THREE.Group();
    stadium.name = stadiumData.name;
    
    // Create stadium structure
    await this.createStadiumStructure(stadium, stadiumData);
    
    // Create field
    await this.createStadiumField(stadium, stadiumData);
    
    // Create seating
    await this.createStadiumSeating(stadium, stadiumData);
    
    // Create lighting
    await this.createStadiumLighting(stadium, stadiumData);
    
    return stadium;
  }
  
  /**
   * Create stadium structure
   */
  private async createStadiumStructure(parent: THREE.Object3D, stadiumData: Stadium3D): Promise<void> {
    // Main structure
    const structureGeometry = new THREE.BoxGeometry(
      stadiumData.realWorldDimensions.length,
      stadiumData.realWorldDimensions.height,
      stadiumData.realWorldDimensions.width
    );
    const structureMaterial = new THREE.MeshStandardMaterial({
      color: 0x666666,
      roughness: 0.8,
      metalness: 0.2
    });
    const structure = new THREE.Mesh(structureGeometry, structureMaterial);
    structure.position.y = stadiumData.realWorldDimensions.height / 2;
    structure.castShadow = true;
    structure.receiveShadow = true;
    parent.add(structure);
  }
  
  /**
   * Create stadium field
   */
  private async createStadiumField(parent: THREE.Object3D, stadiumData: Stadium3D): Promise<void> {
    // Field surface
    const fieldGeometry = new THREE.PlaneGeometry(
      stadiumData.playingField.dimensions.length,
      stadiumData.playingField.dimensions.width
    );
    const fieldMaterial = new THREE.MeshStandardMaterial({
      color: stadiumData.playingField.type === 'grass' ? 0x228B22 : 0xFFD700,
      roughness: 0.8,
      metalness: 0.1
    });
    const field = new THREE.Mesh(fieldGeometry, fieldMaterial);
    field.rotation.x = -Math.PI / 2;
    field.receiveShadow = true;
    parent.add(field);
    
    // Field markings
    stadiumData.playingField.markings.forEach(marking => {
      const markingMesh = new THREE.Mesh(marking.geometry, new THREE.MeshBasicMaterial({
        color: marking.color
      }));
      parent.add(markingMesh);
    });
  }
  
  /**
   * Create stadium seating
   */
  private async createStadiumSeating(parent: THREE.Object3D, stadiumData: Stadium3D): Promise<void> {
    // Seating bowl
    const seatingGeometry = new THREE.BoxGeometry(
      stadiumData.structure.seatingBowl.geometry.parameters.width,
      stadiumData.structure.seatingBowl.geometry.parameters.height,
      stadiumData.structure.seatingBowl.geometry.parameters.depth
    );
    const seatingMaterial = stadiumData.structure.seatingBowl.material;
    const seating = new THREE.Mesh(seatingGeometry, seatingMaterial);
    seating.position.y = stadiumData.structure.seatingBowl.geometry.parameters.height / 2;
    seating.castShadow = true;
    seating.receiveShadow = true;
    parent.add(seating);
  }
  
  /**
   * Create stadium lighting
   */
  private async createStadiumLighting(parent: THREE.Object3D, stadiumData: Stadium3D): Promise<void> {
    stadiumData.lighting.floodlights.forEach((light, index) => {
      const pointLight = new THREE.PointLight(
        new THREE.Color(light.color),
        light.intensity,
        200,
        2
      );
      pointLight.position.set(light.position.x, light.position.y, light.position.z);
      pointLight.castShadow = true;
      pointLight.name = `floodlight_${index}`;
      parent.add(pointLight);
    });
  }
  
  /**
   * Create particle system
   */
  async createParticleSystem(config: ParticleSystemConfig): Promise<THREE.Points> {
    const particleCount = config.count;
    const positions = new Float32Array(particleCount * 3);
    const colors = new Float32Array(particleCount * 3);
    const sizes = new Float32Array(particleCount);
    
    // Initialize particle data
    for (let i = 0; i < particleCount; i++) {
      const i3 = i * 3;
      
      // Position
      positions[i3] = (Math.random() - 0.5) * config.spread;
      positions[i3 + 1] = (Math.random() - 0.5) * config.spread;
      positions[i3 + 2] = (Math.random() - 0.5) * config.spread;
      
      // Color
      const color = config.colors[Math.floor(Math.random() * config.colors.length)];
      colors[i3] = color.r;
      colors[i3 + 1] = color.g;
      colors[i3 + 2] = color.b;
      
      // Size
      sizes[i] = config.size.min + Math.random() * (config.size.max - config.size.min);
    }
    
    // Create geometry
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    geometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1));
    
    // Create material
    const material = new THREE.PointsMaterial({
      size: config.size.max,
      vertexColors: true,
      transparent: true,
      opacity: config.opacity.max,
      blending: THREE.AdditiveBlending
    });
    
    // Create points
    const particles = new THREE.Points(geometry, material);
    particles.userData.config = config;
    particles.userData.update = (deltaTime: number) => {
      this.updateParticleSystem(particles, deltaTime);
    };
    
    return particles;
  }
  
  /**
   * Update particle system
   */
  private updateParticleSystem(particles: THREE.Points, deltaTime: number): void {
    const config = particles.userData.config as ParticleSystemConfig;
    const positions = particles.geometry.attributes.position.array as Float32Array;
    const colors = particles.geometry.attributes.color.array as Float32Array;
    
    for (let i = 0; i < config.count; i++) {
      const i3 = i * 3;
      
      // Update position based on behavior
      switch (config.behavior.type) {
        case 'floating':
          positions[i3 + 1] += Math.sin(Date.now() * 0.001 + i) * 0.1;
          break;
        case 'orbiting':
          const angle = Date.now() * 0.0001 + i;
          const radius = 50 + i * 0.1;
          positions[i3] = Math.cos(angle) * radius;
          positions[i3 + 2] = Math.sin(angle) * radius;
          break;
        case 'physics':
          // Simple physics simulation
          if (config.behavior.gravity) {
            positions[i3 + 1] -= config.behavior.gravity.y * deltaTime * 0.001;
          }
          break;
      }
      
      // Update color animation
      if (config.animation.colorTransition.enabled) {
        const time = Date.now() * 0.001;
        const colorIndex = Math.floor(time * config.animation.colorTransition.curve.length) % config.animation.colorTransition.colors.length;
        const color = config.animation.colorTransition.colors[colorIndex];
        colors[i3] = color.r;
        colors[i3 + 1] = color.g;
        colors[i3 + 2] = color.b;
      }
    }
    
    particles.geometry.attributes.position.needsUpdate = true;
    particles.geometry.attributes.color.needsUpdate = true;
  }
  
  /**
   * Create heat map 3D visualization
   */
  async createHeatMap3D(heatMapData: HeatMap3D): Promise<THREE.Object3D> {
    const heatMap = new THREE.Group();
    heatMap.name = `heatmap_${heatMapData.id}`;
    
    // Create heat map points
    const points = heatMapData.data.points;
    const positions = new Float32Array(points.length * 3);
    const colors = new Float32Array(points.length * 3);
    const intensities = new Float32Array(points.length);
    
    points.forEach((point, index) => {
      const i3 = index * 3;
      positions[i3] = point.x;
      positions[i3 + 1] = point.y;
      positions[i3 + 2] = point.z || 0;
      
      // Color based on intensity
      const color = new THREE.Color();
      const colorScale = heatMapData.visualization.colorScale;
      const normalizedIntensity = (point.intensity - heatMapData.data.statistics.min) / 
                                 (heatMapData.data.statistics.max - heatMapData.data.statistics.min);
      
      if (colorScale.type === 'linear') {
        const colorIndex = Math.floor(normalizedIntensity * (colorScale.colors.length - 1));
        const color1 = colorScale.colors[colorIndex];
        const color2 = colorScale.colors[Math.min(colorIndex + 1, colorScale.colors.length - 1)];
        const t = normalizedIntensity * (colorScale.colors.length - 1) - colorIndex;
        color.lerpColors(color1.color, color2.color, t);
      }
      
      colors[i3] = color.r;
      colors[i3 + 1] = color.g;
      colors[i3 + 2] = color.b;
      
      intensities[index] = point.intensity;
    });
    
    // Create geometry
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    geometry.setAttribute('intensity', new THREE.BufferAttribute(intensities, 1));
    
    // Create material
    const material = new THREE.PointsMaterial({
      size: 2,
      vertexColors: true,
      transparent: true,
      opacity: heatMapData.visualization.rendering.transparency,
      blending: heatMapData.visualization.rendering.blending
    });
    
    // Create points
    const heatMapPoints = new THREE.Points(geometry, material);
    heatMap.add(heatMapPoints);
    
    // Add field overlay if enabled
    if (heatMapData.overlay.fieldLines) {
      await this.createFieldOverlay(heatMap, heatMapData);
    }
    
    return heatMap;
  }
  
  /**
   * Create field overlay for heat map
   */
  private async createFieldOverlay(parent: THREE.Object3D, heatMapData: HeatMap3D): Promise<void> {
    const bounds = heatMapData.data.bounds;
    
    // Create field boundary
    const fieldGeometry = new THREE.PlaneGeometry(
      bounds.maxX - bounds.minX,
      bounds.maxY - bounds.minY
    );
    const fieldMaterial = new THREE.MeshBasicMaterial({
      color: 0x228B22,
      transparent: true,
      opacity: 0.3,
      side: THREE.DoubleSide
    });
    const field = new THREE.Mesh(fieldGeometry, fieldMaterial);
    field.rotation.x = -Math.PI / 2;
    field.position.y = -0.1;
    parent.add(field);
    
    // Create grid if enabled
    if (heatMapData.overlay.grid) {
      const gridHelper = new THREE.GridHelper(
        Math.max(bounds.maxX - bounds.minX, bounds.maxY - bounds.minY),
        10,
        0xffffff,
        0xffffff
      );
      gridHelper.position.y = 0;
      parent.add(gridHelper);
    }
  }
  
  /**
   * Get active scene
   */
  getActiveScene(): THREE.Scene | null {
    return this.scenes.get(this.sceneManager.activeScene) || null;
  }
  
  /**
   * Get active camera
   */
  getActiveCamera(): THREE.Camera | null {
    return this.cameras.get(this.sceneManager.activeCamera) || null;
  }
  
  /**
   * Get performance metrics
   */
  getPerformanceMetrics(): Graphics3DPerformance {
    return {
      rendering: {
        fps: this.performanceMonitor.fps,
        frameTime: this.performanceMonitor.frameTime,
        drawCalls: this.performanceMonitor.drawCalls,
        triangleCount: this.performanceMonitor.triangleCount,
        vertexCount: 0, // Would need to calculate from scene
        textureBindings: 0, // Would need to track from renderer
        shaderSwitches: 0 // Would need to track from renderer
      },
      memory: {
        geometries: this.assetManager.geometries.size,
        textures: this.assetManager.textures.size,
        materials: this.assetManager.materials.size,
        total: this.performanceMonitor.memoryUsage,
        available: this.config.maxMemoryUsage - this.performanceMonitor.memoryUsage,
        usage: (this.performanceMonitor.memoryUsage / this.config.maxMemoryUsage) * 100
      },
      culling: {
        frustumCulled: 0, // Would need to track from renderer
        occlusionCulled: 0, // Would need to track from renderer
        distanceCulled: 0, // Would need to track from renderer
        rendered: this.performanceMonitor.triangleCount,
        total: this.performanceMonitor.triangleCount
      },
      quality: {
        lodLevel: this.config.quality === 'ultra' ? 4 : this.config.quality === 'high' ? 3 : this.config.quality === 'medium' ? 2 : 1,
        shadowMapSize: 2048,
        antialiasing: this.config.antialiasing,
        postProcessing: this.config.postProcessing,
        textureQuality: this.config.quality === 'ultra' ? 1.0 : this.config.quality === 'high' ? 0.8 : this.config.quality === 'medium' ? 0.6 : 0.4
      },
      optimization: {
        instancedRendering: 0, // Would need to track
        batchedDrawCalls: 0, // Would need to track
        mergedGeometries: 0, // Would need to track
        sharedMaterials: this.assetManager.materials.size,
        compressionRatio: 0.8 // Estimated
      },
      bottlenecks: this.identifyBottlenecks()
    };
  }
  
  /**
   * Identify performance bottlenecks
   */
  private identifyBottlenecks(): Array<{
    type: 'cpu' | 'gpu' | 'memory' | 'bandwidth';
    severity: number;
    description: string;
    suggestions: string[];
  }> {
    const bottlenecks = [];
    
    // Check FPS
    if (this.performanceMonitor.fps < this.config.targetFPS * 0.8) {
      bottlenecks.push({
        type: 'gpu',
        severity: 0.8,
        description: 'Low frame rate detected',
        suggestions: [
          'Reduce shadow map size',
          'Lower texture quality',
          'Disable post-processing effects',
          'Reduce particle count'
        ]
      });
    }
    
    // Check memory usage
    if (this.performanceMonitor.memoryUsage > this.config.maxMemoryUsage * 0.8) {
      bottlenecks.push({
        type: 'memory',
        severity: 0.9,
        description: 'High memory usage detected',
        suggestions: [
          'Clear unused geometries',
          'Reduce texture resolution',
          'Implement LOD system',
          'Use texture compression'
        ]
      });
    }
    
    // Check draw calls
    if (this.performanceMonitor.drawCalls > 100) {
      bottlenecks.push({
        type: 'cpu',
        severity: 0.7,
        description: 'High draw call count',
        suggestions: [
          'Use instanced rendering',
          'Merge geometries',
          'Use texture atlasing',
          'Implement batching'
        ]
      });
    }
    
    return bottlenecks;
  }
  
  /**
   * Event system
   */
  on(event: string, callback: (data: any) => void): void {
    if (!this.eventListeners.has(event)) {
      this.eventListeners.set(event, []);
    }
    this.eventListeners.get(event)!.push(callback);
  }
  
  off(event: string, callback: (data: any) => void): void {
    const listeners = this.eventListeners.get(event);
    if (listeners) {
      const index = listeners.indexOf(callback);
      if (index > -1) {
        listeners.splice(index, 1);
      }
    }
  }
  
  private emit(event: string, data: any): void {
    const listeners = this.eventListeners.get(event);
    if (listeners) {
      listeners.forEach(callback => callback(data));
    }
  }
  
  /**
   * Cleanup resources
   */
  cleanup(): void {
    this.stop();
    
    // Dispose of geometries
    this.assetManager.geometries.forEach(geometry => geometry.dispose());
    this.assetManager.geometries.clear();
    
    // Dispose of materials
    this.assetManager.materials.forEach(material => material.dispose());
    this.assetManager.materials.clear();
    
    // Dispose of textures
    this.assetManager.textures.forEach(texture => texture.dispose());
    this.assetManager.textures.clear();
    
    // Dispose of renderer
    this.renderer.dispose();
    
    // Clear scenes
    this.scenes.forEach(scene => {
      scene.traverse((object) => {
        if (object instanceof THREE.Mesh) {
          object.geometry.dispose();
          if (Array.isArray(object.material)) {
            object.material.forEach(material => material.dispose());
          } else {
            object.material.dispose();
          }
        }
      });
    });
    this.scenes.clear();
    
    // Clear event listeners
    this.eventListeners.clear();
    
    if (this.config.debugMode) {
      console.log('Blaze Graphics Engine cleaned up');
    }
  }
}
