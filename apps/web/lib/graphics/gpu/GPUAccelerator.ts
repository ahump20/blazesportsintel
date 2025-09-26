/**
 * =============================================================================
 * GPU ACCELERATOR - HIGH PERFORMANCE COMPUTE OPERATIONS
 * =============================================================================
 * WebGL/WebGPU compute shaders for blazesportsintel.com
 * Handles particle physics, data processing, and vision AI operations
 * Performance target: <10ms compute operations, GPU memory optimization
 * =============================================================================
 */

import { GPU, IKernelRunShortcut } from 'gpu.js';
import * as THREE from 'three';

// =============================================================================
// TYPES & INTERFACES
// =============================================================================

export interface ComputeConfig {
  preferGPU: boolean;
  fallbackCPU: boolean;
  precision: 'single' | 'double';
  memoryOptimize: boolean;
}

export interface ParticlePhysicsData {
  positions: Float32Array;
  velocities: Float32Array;
  forces: Float32Array;
  masses: Float32Array;
  lifetimes: Float32Array;
  count: number;
}

export interface SportAnalyticsData {
  playerPositions: Float32Array;
  ballTrajectory: Float32Array;
  fieldZones: Float32Array;
  heatMapData: Float32Array;
  timeStamps: Float32Array;
}

export interface VisionAIData {
  imageData: Uint8ClampedArray;
  landmarkPoints: Float32Array;
  confidenceScores: Float32Array;
  boundingBoxes: Float32Array;
}

// =============================================================================
// GPU ACCELERATOR CLASS
// =============================================================================

export class GPUAccelerator {
  private gpu: GPU;
  private kernels: Map<string, IKernelRunShortcut>;
  private config: ComputeConfig;
  private isInitialized: boolean = false;
  private performanceMetrics: Map<string, number> = new Map();

  constructor(config: Partial<ComputeConfig> = {}) {
    this.config = {
      preferGPU: config.preferGPU !== false,
      fallbackCPU: config.fallbackCPU !== false,
      precision: config.precision || 'single',
      memoryOptimize: config.memoryOptimize !== false
    };

    this.kernels = new Map();

    // Initialize GPU.js
    this.gpu = new GPU({
      mode: this.config.preferGPU ? 'gpu' : 'cpu',
      precision: this.config.precision
    });

    console.log('🚀 GPU Accelerator initialized with mode:', this.gpu.mode);
  }

  // =============================================================================
  // INITIALIZATION
  // =============================================================================

  async initialize(): Promise<void> {
    if (this.isInitialized) return;

    try {
      // Test GPU capabilities
      await this.testGPUCapabilities();

      // Pre-compile common kernels
      this.compileParticlePhysicsKernels();
      this.compileSportsAnalyticsKernels();
      this.compileVisionAIKernels();
      this.compileUtilityKernels();

      this.isInitialized = true;
      console.log('✅ GPU Accelerator fully initialized');

    } catch (error) {
      console.error('❌ GPU Accelerator initialization failed:', error);

      if (this.config.fallbackCPU) {
        console.log('🔄 Falling back to CPU mode');
        this.gpu = new GPU({ mode: 'cpu' });
        await this.initialize(); // Retry with CPU
      } else {
        throw error;
      }
    }
  }

  // =============================================================================
  // GPU CAPABILITY TESTING
  // =============================================================================

  private async testGPUCapabilities(): Promise<void> {
    // Test basic computation
    const testKernel = this.gpu.createKernel(function(a: number, b: number) {
      return a + b;
    }).setOutput([1]);

    const result = testKernel(1, 2) as Float32Array;

    if (result[0] !== 3) {
      throw new Error('GPU computation test failed');
    }

    // Test array operations
    const arrayTestKernel = this.gpu.createKernel(function(a: number[]) {
      return a[this.thread.x] * 2;
    }).setOutput([100]);

    const testArray = Array.from({ length: 100 }, (_, i) => i);
    const arrayResult = arrayTestKernel(testArray) as Float32Array;

    if (arrayResult[0] !== 0 || arrayResult[99] !== 198) {
      throw new Error('GPU array computation test failed');
    }

    console.log('✅ GPU capability tests passed');
  }

  // =============================================================================
  // PARTICLE PHYSICS KERNELS
  // =============================================================================

  private compileParticlePhysicsKernels(): void {
    // Update particle positions
    const updatePositions = this.gpu.createKernel(function(
      positions: number[][],
      velocities: number[][],
      deltaTime: number
    ) {
      const i = this.thread.x;
      const axis = this.thread.y;
      return positions[i][axis] + velocities[i][axis] * deltaTime;
    }).setOutput([1000, 3]);

    this.kernels.set('updatePositions', updatePositions);

    // Update particle velocities with forces
    const updateVelocities = this.gpu.createKernel(function(
      velocities: number[][],
      forces: number[][],
      masses: number[],
      deltaTime: number
    ) {
      const i = this.thread.x;
      const axis = this.thread.y;
      const acceleration = forces[i][axis] / masses[i];
      return velocities[i][axis] + acceleration * deltaTime;
    }).setOutput([1000, 3]);

    this.kernels.set('updateVelocities', updateVelocities);

    // Calculate inter-particle forces (simplified n-body)
    const calculateForces = this.gpu.createKernel(function(
      positions: number[][],
      masses: number[],
      gravityStrength: number,
      particleCount: number
    ) {
      const i = this.thread.x;
      const axis = this.thread.y;

      let force = 0;

      for (let j = 0; j < particleCount; j++) {
        if (i === j) continue;

        const dx = positions[j][0] - positions[i][0];
        const dy = positions[j][1] - positions[i][1];
        const dz = positions[j][2] - positions[i][2];

        const distSq = dx * dx + dy * dy + dz * dz + 0.001; // Softening
        const dist = Math.sqrt(distSq);

        const forceStrength = gravityStrength * masses[i] * masses[j] / distSq;

        if (axis === 0) force += forceStrength * dx / dist;
        else if (axis === 1) force += forceStrength * dy / dist;
        else force += forceStrength * dz / dist;
      }

      return force;
    }).setOutput([1000, 3]);

    this.kernels.set('calculateForces', calculateForces);

    // Boundary collision handling
    const handleCollisions = this.gpu.createKernel(function(
      positions: number[][],
      velocities: number[][],
      bounds: number[],
      restitution: number
    ) {
      const i = this.thread.x;
      const axis = this.thread.y;

      let newVel = velocities[i][axis];
      let newPos = positions[i][axis];

      const minBound = bounds[axis * 2];
      const maxBound = bounds[axis * 2 + 1];

      if (newPos < minBound) {
        newPos = minBound;
        newVel = -newVel * restitution;
      } else if (newPos > maxBound) {
        newPos = maxBound;
        newVel = -newVel * restitution;
      }

      return axis === 0 ? newVel : newPos;
    }).setOutput([1000, 3, 2]); // [particles, axes, vel/pos]

    this.kernels.set('handleCollisions', handleCollisions);
  }

  // =============================================================================
  // SPORTS ANALYTICS KERNELS
  // =============================================================================

  private compileSportsAnalyticsKernels(): void {
    // Calculate player heat map
    const calculateHeatMap = this.gpu.createKernel(function(
      playerPositions: number[][],
      fieldWidth: number,
      fieldHeight: number,
      gridSize: number,
      timeWeights: number[]
    ) {
      const gridX = this.thread.x;
      const gridY = this.thread.y;

      const cellX = (gridX + 0.5) * gridSize - fieldWidth / 2;
      const cellY = (gridY + 0.5) * gridSize - fieldHeight / 2;

      let heatValue = 0;
      const numPositions = playerPositions.length;

      for (let i = 0; i < numPositions; i++) {
        const dx = playerPositions[i][0] - cellX;
        const dy = playerPositions[i][1] - cellY;
        const distance = Math.sqrt(dx * dx + dy * dy);

        // Gaussian influence
        const influence = Math.exp(-(distance * distance) / (2 * gridSize * gridSize));
        heatValue += influence * timeWeights[i];
      }

      return heatValue;
    }).setOutput([64, 64]); // 64x64 heat map grid

    this.kernels.set('calculateHeatMap', calculateHeatMap);

    // Ball trajectory prediction
    const predictTrajectory = this.gpu.createKernel(function(
      initialPos: number[],
      initialVel: number[],
      gravity: number,
      airResistance: number,
      steps: number,
      deltaTime: number
    ) {
      const step = this.thread.x;
      const axis = this.thread.y;

      let pos = initialPos[axis];
      let vel = initialVel[axis];

      for (let i = 0; i < step; i++) {
        // Apply physics
        if (axis === 1) { // Y axis - gravity
          vel += gravity * deltaTime;
        }

        // Air resistance
        vel *= (1.0 - airResistance * deltaTime);

        pos += vel * deltaTime;
      }

      return pos;
    }).setOutput([100, 3]); // 100 trajectory points, XYZ

    this.kernels.set('predictTrajectory', predictTrajectory);

    // Player speed calculation
    const calculatePlayerSpeed = this.gpu.createKernel(function(
      positions: number[][],
      timestamps: number[]
    ) {
      const i = this.thread.x;

      if (i === 0) return 0;

      const dx = positions[i][0] - positions[i - 1][0];
      const dy = positions[i][1] - positions[i - 1][1];
      const dt = timestamps[i] - timestamps[i - 1];

      const distance = Math.sqrt(dx * dx + dy * dy);
      return dt > 0 ? distance / dt : 0;
    }).setOutput([1000]);

    this.kernels.set('calculatePlayerSpeed', calculatePlayerSpeed);

    // Zone occupation analysis
    const analyzeZoneOccupation = this.gpu.createKernel(function(
      playerPositions: number[][],
      zoneDefinitions: number[][],
      numZones: number
    ) {
      const player = this.thread.x;
      const zone = this.thread.y;

      if (zone >= numZones) return 0;

      const px = playerPositions[player][0];
      const py = playerPositions[player][1];

      const zx1 = zoneDefinitions[zone][0];
      const zy1 = zoneDefinitions[zone][1];
      const zx2 = zoneDefinitions[zone][2];
      const zy2 = zoneDefinitions[zone][3];

      return (px >= zx1 && px <= zx2 && py >= zy1 && py <= zy2) ? 1 : 0;
    }).setOutput([22, 20]); // 22 players, 20 zones max

    this.kernels.set('analyzeZoneOccupation', analyzeZoneOccupation);
  }

  // =============================================================================
  // VISION AI KERNELS
  // =============================================================================

  private compileVisionAIKernels(): void {
    // Image preprocessing
    const preprocessImage = this.gpu.createKernel(function(
      imageData: number[],
      width: number,
      brightness: number,
      contrast: number
    ) {
      const x = this.thread.x;
      const y = this.thread.y;

      const idx = (y * width + x) * 4;
      const r = imageData[idx] / 255.0;
      const g = imageData[idx + 1] / 255.0;
      const b = imageData[idx + 2] / 255.0;

      // Convert to grayscale
      let gray = 0.299 * r + 0.587 * g + 0.114 * b;

      // Apply brightness and contrast
      gray = (gray + brightness) * contrast;
      gray = Math.max(0, Math.min(1, gray));

      return gray;
    }).setOutput([640, 480]);

    this.kernels.set('preprocessImage', preprocessImage);

    // Gaussian blur for noise reduction
    const gaussianBlur = this.gpu.createKernel(function(
      image: number[][],
      kernelSize: number,
      sigma: number
    ) {
      const x = this.thread.x;
      const y = this.thread.y;

      let sum = 0;
      let weightSum = 0;
      const radius = Math.floor(kernelSize / 2);

      for (let dy = -radius; dy <= radius; dy++) {
        for (let dx = -radius; dx <= radius; dx++) {
          const nx = x + dx;
          const ny = y + dy;

          if (nx >= 0 && nx < 640 && ny >= 0 && ny < 480) {
            const distance = dx * dx + dy * dy;
            const weight = Math.exp(-distance / (2 * sigma * sigma));

            sum += image[ny][nx] * weight;
            weightSum += weight;
          }
        }
      }

      return weightSum > 0 ? sum / weightSum : 0;
    }).setOutput([640, 480]);

    this.kernels.set('gaussianBlur', gaussianBlur);

    // Edge detection for pose estimation
    const edgeDetection = this.gpu.createKernel(function(
      image: number[][]
    ) {
      const x = this.thread.x;
      const y = this.thread.y;

      if (x === 0 || x === 639 || y === 0 || y === 479) return 0;

      // Sobel operator
      const sobelX =
        -1 * image[y-1][x-1] + 1 * image[y-1][x+1] +
        -2 * image[y][x-1] + 2 * image[y][x+1] +
        -1 * image[y+1][x-1] + 1 * image[y+1][x+1];

      const sobelY =
        -1 * image[y-1][x-1] - 2 * image[y-1][x] - 1 * image[y-1][x+1] +
         1 * image[y+1][x-1] + 2 * image[y+1][x] + 1 * image[y+1][x+1];

      return Math.sqrt(sobelX * sobelX + sobelY * sobelY);
    }).setOutput([640, 480]);

    this.kernels.set('edgeDetection', edgeDetection);

    // Keypoint matching for pose tracking
    const matchKeypoints = this.gpu.createKernel(function(
      keypoints1: number[][],
      keypoints2: number[][],
      descriptors1: number[][],
      descriptors2: number[][],
      threshold: number
    ) {
      const i = this.thread.x;
      const j = this.thread.y;

      let similarity = 0;
      const descriptorLength = 128; // Typical SIFT descriptor length

      for (let k = 0; k < descriptorLength; k++) {
        const diff = descriptors1[i][k] - descriptors2[j][k];
        similarity += diff * diff;
      }

      const distance = Math.sqrt(similarity);
      return distance < threshold ? distance : 999999;
    }).setOutput([1000, 1000]); // Max 1000 keypoints each frame

    this.kernels.set('matchKeypoints', matchKeypoints);
  }

  // =============================================================================
  // UTILITY KERNELS
  // =============================================================================

  private compileUtilityKernels(): void {
    // Matrix multiplication
    const matrixMultiply = this.gpu.createKernel(function(
      a: number[][],
      b: number[][],
      size: number
    ) {
      let sum = 0;
      for (let i = 0; i < size; i++) {
        sum += a[this.thread.y][i] * b[i][this.thread.x];
      }
      return sum;
    }).setOutput([4, 4]);

    this.kernels.set('matrixMultiply', matrixMultiply);

    // Vector normalization
    const normalizeVectors = this.gpu.createKernel(function(
      vectors: number[][]
    ) {
      const i = this.thread.x;
      const component = this.thread.y;

      const x = vectors[i][0];
      const y = vectors[i][1];
      const z = vectors[i][2];

      const length = Math.sqrt(x * x + y * y + z * z);

      if (length === 0) return 0;

      if (component === 0) return x / length;
      if (component === 1) return y / length;
      return z / length;
    }).setOutput([1000, 3]);

    this.kernels.set('normalizeVectors', normalizeVectors);

    // Fast Fourier Transform (simplified 1D)
    const fft1D = this.gpu.createKernel(function(
      real: number[],
      imag: number[],
      n: number,
      inverse: number
    ) {
      const k = this.thread.x;
      const isReal = this.thread.y === 0;

      let sumReal = 0;
      let sumImag = 0;

      for (let j = 0; j < n; j++) {
        const angle = (inverse > 0 ? 2 : -2) * Math.PI * k * j / n;
        const cosAngle = Math.cos(angle);
        const sinAngle = Math.sin(angle);

        sumReal += real[j] * cosAngle - imag[j] * sinAngle;
        sumImag += real[j] * sinAngle + imag[j] * cosAngle;
      }

      return isReal ? sumReal : sumImag;
    }).setOutput([1024, 2]); // 1024 point FFT, real/imaginary

    this.kernels.set('fft1D', fft1D);
  }

  // =============================================================================
  // HIGH-LEVEL API METHODS
  // =============================================================================

  async updateParticlePhysics(data: ParticlePhysicsData, deltaTime: number): Promise<ParticlePhysicsData> {
    const startTime = performance.now();

    try {
      // Reshape data for GPU kernels
      const positions = this.reshapeFloat32Array(data.positions, data.count, 3);
      const velocities = this.reshapeFloat32Array(data.velocities, data.count, 3);
      const forces = this.reshapeFloat32Array(data.forces, data.count, 3);
      const masses = Array.from(data.masses);

      // Update forces
      const newForces = this.kernels.get('calculateForces')!(
        positions, masses, 0.1, data.count
      ) as Float32Array;

      // Update velocities
      const newVelocities = this.kernels.get('updateVelocities')!(
        velocities, this.reshapeFloat32Array(newForces, data.count, 3), masses, deltaTime
      ) as Float32Array;

      // Update positions
      const newPositions = this.kernels.get('updatePositions')!(
        positions, this.reshapeFloat32Array(newVelocities, data.count, 3), deltaTime
      ) as Float32Array;

      // Handle boundary collisions
      const bounds = [-50, 50, -50, 50, -50, 50]; // x, y, z bounds
      const collisionResult = this.kernels.get('handleCollisions')!(
        this.reshapeFloat32Array(newPositions, data.count, 3),
        this.reshapeFloat32Array(newVelocities, data.count, 3),
        bounds,
        0.8 // restitution
      ) as Float32Array;

      const endTime = performance.now();
      this.performanceMetrics.set('particlePhysics', endTime - startTime);

      return {
        positions: newPositions,
        velocities: new Float32Array(collisionResult.slice(0, data.count * 3)),
        forces: newForces,
        masses: data.masses,
        lifetimes: data.lifetimes,
        count: data.count
      };

    } catch (error) {
      console.error('Particle physics GPU computation failed:', error);
      throw error;
    }
  }

  async calculateSportsHeatMap(
    playerPositions: Float32Array,
    fieldWidth: number,
    fieldHeight: number,
    gridSize: number = 64
  ): Promise<Float32Array> {
    const startTime = performance.now();

    try {
      const numPositions = playerPositions.length / 2;
      const positions = this.reshapeFloat32Array(playerPositions, numPositions, 2);
      const timeWeights = Array.from({ length: numPositions }, (_, i) =>
        Math.exp(-i * 0.01) // Recent positions weighted higher
      );

      const heatMap = this.kernels.get('calculateHeatMap')!(
        positions, fieldWidth, fieldHeight, gridSize, timeWeights
      ) as Float32Array;

      const endTime = performance.now();
      this.performanceMetrics.set('sportsHeatMap', endTime - startTime);

      return heatMap;

    } catch (error) {
      console.error('Sports heat map GPU computation failed:', error);
      throw error;
    }
  }

  async processVisionFrame(
    imageData: Uint8ClampedArray,
    width: number,
    height: number
  ): Promise<{
    processed: Float32Array;
    edges: Float32Array;
  }> {
    const startTime = performance.now();

    try {
      // Convert to float array
      const floatData = Array.from(imageData);

      // Preprocess image
      const processed = this.kernels.get('preprocessImage')!(
        floatData, width, 0.0, 1.2 // brightness, contrast
      ) as Float32Array;

      // Apply Gaussian blur
      const blurred = this.kernels.get('gaussianBlur')!(
        this.reshapeFloat32Array(processed, height, width), 5, 1.0
      ) as Float32Array;

      // Edge detection
      const edges = this.kernels.get('edgeDetection')!(
        this.reshapeFloat32Array(blurred, height, width)
      ) as Float32Array;

      const endTime = performance.now();
      this.performanceMetrics.set('visionProcessing', endTime - startTime);

      return { processed, edges };

    } catch (error) {
      console.error('Vision frame GPU processing failed:', error);
      throw error;
    }
  }

  // =============================================================================
  // UTILITY METHODS
  // =============================================================================

  private reshapeFloat32Array(data: Float32Array, rows: number, cols: number): number[][] {
    const result: number[][] = [];

    for (let i = 0; i < rows; i++) {
      const row: number[] = [];
      for (let j = 0; j < cols; j++) {
        row.push(data[i * cols + j] || 0);
      }
      result.push(row);
    }

    return result;
  }

  getPerformanceMetrics(): Map<string, number> {
    return new Map(this.performanceMetrics);
  }

  getGPUInfo(): {
    mode: string;
    canvas?: HTMLCanvasElement;
    context?: WebGLRenderingContext | WebGL2RenderingContext;
    supportedExtensions?: string[];
  } {
    const canvas = this.gpu.canvas;
    const context = this.gpu.context;

    let extensions: string[] = [];
    if (context instanceof WebGLRenderingContext || context instanceof WebGL2RenderingContext) {
      extensions = context.getSupportedExtensions() || [];
    }

    return {
      mode: this.gpu.mode,
      canvas,
      context,
      supportedExtensions: extensions
    };
  }

  dispose(): void {
    // Clean up kernels
    this.kernels.clear();

    // Destroy GPU instance
    this.gpu.destroy();

    console.log('GPU Accelerator disposed');
  }
}

// =============================================================================
// SINGLETON INSTANCE
// =============================================================================

let acceleratorInstance: GPUAccelerator | null = null;

export function getGPUAccelerator(config?: Partial<ComputeConfig>): GPUAccelerator {
  if (!acceleratorInstance) {
    acceleratorInstance = new GPUAccelerator(config);
  }
  return acceleratorInstance;
}

export default GPUAccelerator;