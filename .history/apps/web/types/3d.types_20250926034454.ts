/**
 * Blaze Intelligence 3D Visualization Types
 * Championship-tier type definitions for 3D sports analytics
 */

import { Vector3, Euler, Quaternion } from 'three';

// Player positioning and movement types
export interface Player3DData {
  id: string;
  name: string;
  team: string;
  sport: 'MLB' | 'NFL' | 'NBA' | 'NCAA';
  position: Vector3;
  rotation: Euler;
  velocity: Vector3;
  acceleration: Vector3;
  stats: PlayerStats;
  biometrics?: BiometricData;
  jerseyNumber: number;
  isActive: boolean;
  timestamp: number;
}

export interface PlayerStats {
  primary: number; // Main stat (batting avg, completion %, etc)
  secondary: number; // Secondary stat (home runs, touchdowns, etc)
  tertiary: number; // Third stat (RBIs, yards, etc)
  efficiency: number; // Calculated efficiency metric
  trend: 'up' | 'down' | 'stable';
  customMetrics: Record<string, number>;
}

export interface BiometricData {
  skeleton: SkeletonPoint[];
  velocity: number;
  fatigue: number;
  stressLevel: number;
  microExpressions?: MicroExpression[];
  heartRate?: number;
  muscleActivation?: Record<string, number>;
}

export interface SkeletonPoint {
  joint: string;
  position: Vector3;
  rotation: Quaternion;
  confidence: number;
}

export interface MicroExpression {
  type: 'determination' | 'focus' | 'stress' | 'confidence' | 'fatigue';
  intensity: number;
  duration: number;
  timestamp: number;
}

// Field/Court visualization types
export interface Field3D {
  sport: 'MLB' | 'NFL' | 'NBA' | 'NCAA';
  dimensions: FieldDimensions;
  zones: HeatZone[];
  trajectories: Trajectory[];
  events: GameEvent[];
  weather?: WeatherConditions;
}

export interface FieldDimensions {
  width: number;
  length: number;
  height?: number; // For dome stadiums
  boundaries: Vector3[];
  importantPoints: Record<string, Vector3>;
}

export interface HeatZone {
  id: string;
  position: Vector3;
  radius: number;
  intensity: number;
  color: string;
  label: string;
  type: 'success' | 'danger' | 'neutral';
  playerActivity: number[];
}

export interface Trajectory {
  id: string;
  type: 'ball' | 'player' | 'pass' | 'shot';
  points: Vector3[];
  velocity: number[];
  spin?: Vector3;
  outcome: 'success' | 'fail' | 'pending';
  probability?: number;
  timestamp: number;
}

export interface GameEvent {
  id: string;
  type: string;
  position: Vector3;
  players: string[];
  outcome: string;
  impact: number; // -1 to 1
  timestamp: number;
  particles?: ParticleConfig;
}

export interface ParticleConfig {
  type: 'explosion' | 'trail' | 'ambient' | 'celebration';
  count: number;
  colors: string[];
  lifetime: number;
  velocity: Vector3;
  size: number;
  physics: boolean;
}

// Analytics visualization types
export interface Analytics3D {
  id: string;
  type: 'matrix' | 'graph' | 'flow' | 'volumetric';
  data: DataPoint3D[];
  axes: Axis3D[];
  legends: Legend3D[];
  interactions: InteractionConfig;
}

export interface DataPoint3D {
  position: Vector3;
  value: number;
  label: string;
  color: string;
  size: number;
  connections?: string[];
  metadata?: Record<string, any>;
}

export interface Axis3D {
  dimension: 'x' | 'y' | 'z';
  label: string;
  min: number;
  max: number;
  ticks: number;
  unit: string;
}

export interface Legend3D {
  label: string;
  color: string;
  shape: 'sphere' | 'cube' | 'cone' | 'cylinder';
  value: string | number;
}

export interface InteractionConfig {
  hover: boolean;
  click: boolean;
  drag: boolean;
  zoom: boolean;
  rotate: boolean;
  callbacks?: {
    onHover?: (data: DataPoint3D) => void;
    onClick?: (data: DataPoint3D) => void;
    onDrag?: (data: DataPoint3D) => void;
  };
}

// Performance optimization types
export interface LODConfig {
  distances: number[];
  geometries: string[];
  materials: string[];
}

export interface InstancedMeshConfig {
  count: number;
  positions: Float32Array;
  rotations: Float32Array;
  scales: Float32Array;
  colors?: Float32Array;
  updateFrequency: number;
}

// Camera and view types
export interface CameraConfig {
  type: 'perspective' | 'orthographic';
  position: Vector3;
  target: Vector3;
  fov?: number;
  near: number;
  far: number;
  controls: 'orbit' | 'fly' | 'fps' | 'trackball';
  presets?: CameraPreset[];
}

export interface CameraPreset {
  name: string;
  position: Vector3;
  target: Vector3;
  fov?: number;
  transition: number; // Duration in ms
}

// WebSocket message types
export interface WSMessage {
  type: 'update' | 'event' | 'stats' | 'biometric';
  sport: 'MLB' | 'NFL' | 'NBA' | 'NCAA';
  data: any;
  timestamp: number;
  sequence: number;
}

// AR/VR support types
export interface XRConfig {
  enabled: boolean;
  mode: 'AR' | 'VR';
  referenceSpace: 'local' | 'local-floor' | 'bounded-floor' | 'unbounded';
  controllers: boolean;
  handTracking: boolean;
  passthrough?: boolean;
}

// Weather conditions for outdoor sports
export interface WeatherConditions {
  temperature: number;
  humidity: number;
  windSpeed: number;
  windDirection: Vector3;
  precipitation: number;
  visibility: number;
}

// Multi-tenant configuration
export interface TenantConfig {
  id: string;
  name: string;
  theme: ThemeConfig;
  sports: Array<'MLB' | 'NFL' | 'NBA' | 'NCAA'>;
  features: string[];
  customizations: Record<string, any>;
}

export interface ThemeConfig {
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;
  fontFamily: string;
  logo?: string;
  watermark?: boolean;
}

// Export formats
export interface ExportConfig {
  format: 'video' | 'gif' | 'image' | 'pdf' | 'csv' | 'json';
  quality: 'low' | 'medium' | 'high' | 'ultra';
  duration?: number; // For video/gif
  fps?: number;
  dimensions?: { width: number; height: number };
}

// Performance metrics
export interface PerformanceMetrics {
  fps: number;
  frameTime: number;
  drawCalls: number;
  triangles: number;
  points: number;
  memory: number;
  latency: number;
}