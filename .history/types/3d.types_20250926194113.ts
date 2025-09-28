/**
 * Blaze Sports Intelligence - 3D Graphics and Visualization Type Definitions
 * Championship Intelligence Platform - 3D Graphics System
 * The Deep South's Sports Intelligence Hub
 */

import * as THREE from 'three';
import { SportType } from './sports.types';

// Base 3D Object Interfaces
export interface Base3DObject {
  id: string;
  name: string;
  type: '3d_model' | 'primitive' | 'particle_system' | 'text' | 'ui_element';
  position: THREE.Vector3;
  rotation: THREE.Euler;
  scale: THREE.Vector3;
  visible: boolean;
  castShadow: boolean;
  receiveShadow: boolean;
  userData: Record<string, any>;
  animations?: THREE.AnimationClip[];
  boundingBox?: THREE.Box3;
  boundingSphere?: THREE.Sphere;
}

// Stadium 3D Model Interface
export interface Stadium3D extends Base3DObject {
  sport: SportType;
  capacity: number;
  realWorldDimensions: {
    length: number; // in meters
    width: number; // in meters
    height: number; // in meters
  };
  
  playingField: {
    type: 'grass' | 'turf' | 'court' | 'dirt' | 'track';
    dimensions: {
      length: number;
      width: number;
    };
    markings: Array<{
      type: string;
      color: string;
      geometry: THREE.BufferGeometry;
    }>;
    zones: Array<{
      name: string;
      area: THREE.Shape;
      significance: number;
    }>;
  };
  
  structure: {
    seatingBowl: {
      geometry: THREE.BufferGeometry;
      material: THREE.Material;
      sections: Array<{
        name: string;
        capacity: number;
        priceCategory: string;
        viewQuality: number;
      }>;
    };
    
    roof: {
      hasRoof: boolean;
      geometry?: THREE.BufferGeometry;
      material?: THREE.Material;
      retractable: boolean;
      currentPosition?: number; // 0-1 for retractable roofs
    };
    
    facades: Array<{
      name: string;
      geometry: THREE.BufferGeometry;
      material: THREE.Material;
      features: string[];
    }>;
    
    concourses: Array<{
      level: number;
      geometry: THREE.BufferGeometry;
      amenities: string[];
    }>;
  };
  
  lighting: {
    floodlights: Array<{
      position: THREE.Vector3;
      direction: THREE.Vector3;
      intensity: number;
      color: THREE.Color;
      castShadow: boolean;
    }>;
    
    ambient: {
      intensity: number;
      color: THREE.Color;
    };
    
    decorative: Array<{
      type: 'neon' | 'led' | 'spotlights';
      positions: THREE.Vector3[];
      colors: THREE.Color[];
      animated: boolean;
    }>;
  };
  
  atmosphere: {
    weather: {
      enabled: boolean;
      type: 'clear' | 'cloudy' | 'rain' | 'snow' | 'fog';
      intensity: number;
      particles?: ParticleSystemConfig;
    };
    
    crowd: {
      enabled: boolean;
      density: number;
      animationLevel: number;
      soundLevel: number;
      enthusiasm: number;
    };
    
    timeOfDay: {
      hour: number; // 0-23
      season: 'spring' | 'summer' | 'fall' | 'winter';
      lighting: 'natural' | 'artificial' | 'mixed';
    };
  };
  
  interactivity: {
    cameraPositions: Array<{
      name: string;
      position: THREE.Vector3;
      target: THREE.Vector3;
      fov: number;
      description: string;
    }>;
    
    hotspots: Array<{
      name: string;
      position: THREE.Vector3;
      type: 'info' | 'stats' | 'video' | 'audio';
      content: any;
      triggerDistance: number;
    }>;
    
    tours: Array<{
      name: string;
      waypoints: Array<{
        position: THREE.Vector3;
        target: THREE.Vector3;
        duration: number;
        description: string;
      }>;
      totalDuration: number;
    }>;
  };
  
  performance: {
    lodLevels: Array<{
      distance: number;
      triangleCount: number;
      textureResolution: number;
      features: string[];
    }>;
    
    culling: {
      frustumCulling: boolean;
      occlusionCulling: boolean;
      backfaceCulling: boolean;
    };
    
    optimization: {
      instancedRendering: boolean;
      textureAtlasing: boolean;
      geometryMerging: boolean;
      materialSharing: boolean;
    };
  };
}

// Particle System Configuration
export interface ParticleSystemConfig {
  count: number;
  spread: number;
  speed: {
    min: number;
    max: number;
  };
  size: {
    min: number;
    max: number;
  };
  opacity: {
    min: number;
    max: number;
  };
  colors: THREE.Color[];
  
  behavior: {
    type: 'static' | 'floating' | 'orbiting' | 'data_driven' | 'physics';
    gravity?: THREE.Vector3;
    wind?: THREE.Vector3;
    magnetism?: Array<{
      position: THREE.Vector3;
      strength: number;
      range: number;
    }>;
  };
  
  emission: {
    rate: number; // particles per second
    burst?: {
      count: number;
      interval: number;
    };
    shape: 'point' | 'sphere' | 'box' | 'cone' | 'mesh';
    volume?: THREE.BufferGeometry;
  };
  
  lifecycle: {
    lifetime: {
      min: number;
      max: number;
    };
    fadeIn: number;
    fadeOut: number;
    recycling: boolean;
  };
  
  animation: {
    rotation: {
      enabled: boolean;
      speed: number;
      random: boolean;
    };
    scaling: {
      enabled: boolean;
      curve: number[]; // 0-1 values for lifetime
    };
    colorTransition: {
      enabled: boolean;
      colors: THREE.Color[];
      curve: number[];
    };
  };
  
  dataBinding?: {
    enabled: boolean;
    dataSource: any[];
    mappings: {
      position?: string;
      color?: string;
      size?: string;
      opacity?: string;
      velocity?: string;
    };
    updateFrequency: number;
  };
}

// Heat Map 3D Visualization
export interface HeatMap3D {
  id: string;
  sport: SportType;
  metric: string;
  
  data: {
    points: Array<{
      x: number;
      y: number;
      z?: number;
      value: number;
      intensity: number;
      category?: string;
      timestamp?: Date;
      metadata?: Record<string, any>;
    }>;
    
    bounds: {
      minX: number;
      maxX: number;
      minY: number;
      maxY: number;
      minZ?: number;
      maxZ?: number;
    };
    
    statistics: {
      min: number;
      max: number;
      mean: number;
      median: number;
      stdDev: number;
      distribution: number[];
    };
  };
  
  visualization: {
    colorScale: {
      type: 'linear' | 'logarithmic' | 'categorical';
      colors: Array<{
        value: number;
        color: THREE.Color;
      }>;
      interpolation: 'smooth' | 'discrete';
    };
    
    rendering: {
      method: 'points' | 'mesh' | 'volume' | 'contour';
      resolution: number;
      smoothing: number;
      transparency: number;
      blending: THREE.Blending;
    };
    
    interaction: {
      selectable: boolean;
      hoverable: boolean;
      tooltip: boolean;
      filtering: {
        enabled: boolean;
        ranges: Array<{
          property: string;
          min: number;
          max: number;
        }>;
      };
    };
    
    animation: {
      enabled: boolean;
      type: 'temporal' | 'value_based' | 'random';
      speed: number;
      loop: boolean;
      timeWindow?: {
        start: Date;
        end: Date;
        current: Date;
      };
    };
  };
  
  overlay: {
    fieldLines: boolean;
    grid: boolean;
    legend: {
      enabled: boolean;
      position: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';
      scale: number;
    };
    statistics: {
      enabled: boolean;
      metrics: string[];
      position: THREE.Vector3;
    };
  };
}

// Player 3D Model and Animation
export interface Player3D extends Base3DObject {
  playerId: string;
  sport: SportType;
  position: string;
  
  model: {
    geometry: THREE.SkinnedMesh;
    skeleton: THREE.Skeleton;
    materials: THREE.Material[];
    morphTargets?: Array<{
      name: string;
      influence: number;
    }>;
  };
  
  animations: {
    idle: THREE.AnimationClip;
    walk: THREE.AnimationClip;
    run: THREE.AnimationClip;
    sportSpecific: Array<{
      name: string;
      clip: THREE.AnimationClip;
      sport: SportType;
      situation: string;
    }>;
    
    blending: {
      enabled: boolean;
      transitions: Array<{
        from: string;
        to: string;
        duration: number;
      }>;
    };
  };
  
  realTimeData: {
    enabled: boolean;
    tracking: {
      position: THREE.Vector3;
      velocity: THREE.Vector3;
      acceleration: THREE.Vector3;
      orientation: THREE.Quaternion;
    };
    
    biometrics: {
      heartRate?: number;
      fatigue?: number;
      stress?: number;
      hydration?: number;
    };
    
    performance: {
      currentAction: string;
      efficiency: number;
      risk: number;
      prediction: string;
    };
  };
  
  visualization: {
    jersey: {
      number: number;
      colors: {
        primary: THREE.Color;
        secondary: THREE.Color;
        accent: THREE.Color;
      };
      texture?: THREE.Texture;
    };
    
    equipment: Array<{
      type: string;
      geometry: THREE.BufferGeometry;
      material: THREE.Material;
      attachment: string; // bone name
    }>;
    
    effects: {
      trail: {
        enabled: boolean;
        length: number;
        color: THREE.Color;
        opacity: number;
      };
      
      aura: {
        enabled: boolean;
        color: THREE.Color;
        intensity: number;
        pulsing: boolean;
      };
      
      stats: {
        enabled: boolean;
        floating: boolean;
        metrics: string[];
        updateFrequency: number;
      };
    };
  };
}

// Camera System for 3D Scenes
export interface Camera3DSystem {
  cameras: Array<{
    id: string;
    name: string;
    type: 'perspective' | 'orthographic';
    camera: THREE.Camera;
    controls: {
      type: 'orbit' | 'fly' | 'first_person' | 'cinematic' | 'fixed';
      enabled: boolean;
      settings: Record<string, any>;
    };
    
    presets: Array<{
      name: string;
      position: THREE.Vector3;
      target: THREE.Vector3;
      fov?: number;
      zoom?: number;
      description: string;
    }>;
    
    animation: {
      path?: Array<{
        position: THREE.Vector3;
        target: THREE.Vector3;
        duration: number;
        easing: string;
      }>;
      
      tracking?: {
        target: string; // object ID to track
        offset: THREE.Vector3;
        smoothing: number;
      };
      
      cinematic?: {
        shots: Array<{
          name: string;
          duration: number;
          transition: string;
          focus?: string;
        }>;
      };
    };
  }>;
  
  activeCamera: string;
  transitionDuration: number;
  
  automation: {
    autoSwitching: boolean;
    triggers: Array<{
      event: string;
      camera: string;
      duration?: number;
    }>;
    
    gameMode: {
      enabled: boolean;
      followAction: boolean;
      highlightKey: boolean;
      replayMode: boolean;
    };
  };
}

// Lighting System for 3D Scenes
export interface Lighting3DSystem {
  ambientLight: {
    intensity: number;
    color: THREE.Color;
    enabled: boolean;
  };
  
  directionalLights: Array<{
    id: string;
    position: THREE.Vector3;
    target: THREE.Vector3;
    intensity: number;
    color: THREE.Color;
    castShadow: boolean;
    shadowMapSize: number;
    shadowBias: number;
    enabled: boolean;
  }>;
  
  pointLights: Array<{
    id: string;
    position: THREE.Vector3;
    intensity: number;
    color: THREE.Color;
    distance: number;
    decay: number;
    castShadow: boolean;
    enabled: boolean;
  }>;
  
  spotLights: Array<{
    id: string;
    position: THREE.Vector3;
    target: THREE.Vector3;
    intensity: number;
    color: THREE.Color;
    distance: number;
    angle: number;
    penumbra: number;
    decay: number;
    castShadow: boolean;
    enabled: boolean;
  }>;
  
  environmentMapping: {
    enabled: boolean;
    hdri?: THREE.Texture;
    skybox?: THREE.CubeTexture;
    intensity: number;
    rotation: number;
  };
  
  postProcessing: {
    toneMappingType: THREE.ToneMapping;
    toneMappingExposure: number;
    bloom: {
      enabled: boolean;
      threshold: number;
      strength: number;
      radius: number;
    };
    
    colorGrading: {
      enabled: boolean;
      saturation: number;
      contrast: number;
      brightness: number;
      gamma: number;
    };
    
    shadows: {
      enabled: boolean;
      type: 'basic' | 'pcf' | 'pcf_soft' | 'vsm';
      mapSize: number;
      bias: number;
      normalBias: number;
    };
  };
  
  timeOfDay: {
    enabled: boolean;
    hour: number; // 0-23
    sunPosition: THREE.Vector3;
    sunIntensity: number;
    skyColor: THREE.Color;
    horizonColor: THREE.Color;
    groundColor: THREE.Color;
  };
}

// Material System for 3D Objects
export interface Material3DSystem {
  materials: Map<string, {
    id: string;
    name: string;
    type: 'standard' | 'physical' | 'basic' | 'lambert' | 'phong' | 'custom';
    material: THREE.Material;
    
    properties: {
      color?: THREE.Color;
      metalness?: number;
      roughness?: number;
      opacity?: number;
      transparent?: boolean;
      emissive?: THREE.Color;
      emissiveIntensity?: number;
    };
    
    textures: {
      diffuse?: THREE.Texture;
      normal?: THREE.Texture;
      roughness?: THREE.Texture;
      metalness?: THREE.Texture;
      emissive?: THREE.Texture;
      ao?: THREE.Texture;
      displacement?: THREE.Texture;
    };
    
    animation: {
      enabled: boolean;
      properties: Array<{
        property: string;
        keyframes: Array<{
          time: number;
          value: any;
        }>;
        loop: boolean;
      }>;
    };
    
    shaderUniforms?: Record<string, {
      type: string;
      value: any;
    }>;
  }>;
  
  textureAtlas: {
    enabled: boolean;
    atlases: Array<{
      name: string;
      size: number;
      textures: Array<{
        name: string;
        region: THREE.Vector4; // x, y, width, height in UV coordinates
      }>;
    }>;
  };
  
  materialVariants: {
    lod: Array<{
      distance: number;
      materialMappings: Map<string, string>;
    }>;
    
    quality: {
      low: Map<string, string>;
      medium: Map<string, string>;
      high: Map<string, string>;
      ultra: Map<string, string>;
    };
  };
}

// Performance Monitoring for 3D Graphics
export interface Graphics3DPerformance {
  rendering: {
    fps: number;
    frameTime: number;
    drawCalls: number;
    triangleCount: number;
    vertexCount: number;
    textureBindings: number;
    shaderSwitches: number;
  };
  
  memory: {
    geometries: number;
    textures: number;
    materials: number;
    total: number;
    available: number;
    usage: number; // percentage
  };
  
  culling: {
    frustumCulled: number;
    occlusionCulled: number;
    distanceCulled: number;
    rendered: number;
    total: number;
  };
  
  quality: {
    lodLevel: number;
    shadowMapSize: number;
    antialiasing: boolean;
    postProcessing: boolean;
    textureQuality: number;
  };
  
  optimization: {
    instancedRendering: number;
    batchedDrawCalls: number;
    mergedGeometries: number;
    sharedMaterials: number;
    compressionRatio: number;
  };
  
  bottlenecks: Array<{
    type: 'cpu' | 'gpu' | 'memory' | 'bandwidth';
    severity: number;
    description: string;
    suggestions: string[];
  }>;
}

// VR/AR Support Interface
export interface VRAudioVisualSupport {
  vr: {
    enabled: boolean;
    headsets: string[];
    controllers: Array<{
      type: string;
      model: THREE.Object3D;
      interactions: string[];
    }>;
    
    roomScale: {
      enabled: boolean;
      playArea: THREE.Box3;
      boundaries: THREE.Line[];
    };
    
    interfaces: {
      menus: Array<{
        name: string;
        position: THREE.Vector3;
        scale: number;
        items: Array<{
          text: string;
          action: string;
          icon?: THREE.Texture;
        }>;
      }>;
      
      dashboards: Array<{
        name: string;
        layout: '2d' | '3d' | 'curved';
        widgets: string[];
        customizable: boolean;
      }>;
    };
  };
  
  ar: {
    enabled: boolean;
    markerBased: boolean;
    markerless: boolean;
    
    anchors: Array<{
      id: string;
      type: 'plane' | 'image' | 'face' | 'body';
      confidence: number;
      position: THREE.Vector3;
      orientation: THREE.Quaternion;
    }>;
    
    occlusion: {
      enabled: boolean;
      depthSensing: boolean;
      realWorldGeometry: THREE.BufferGeometry[];
    };
    
    overlay: {
      statsDisplay: boolean;
      annotations: Array<{
        position: THREE.Vector3;
        text: string;
        style: Record<string, any>;
      }>;
      
      interactions: {
        gestures: boolean;
        voiceCommands: boolean;
        eyeTracking: boolean;
      };
    };
  };
}

// Export comprehensive 3D types
export interface Comprehensive3DTypes {
  stadium3D: Stadium3D;
  particleSystem: ParticleSystemConfig;
  heatMap3D: HeatMap3D;
  player3D: Player3D;
  cameraSystem: Camera3DSystem;
  lightingSystem: Lighting3DSystem;
  materialSystem: Material3DSystem;
  performance: Graphics3DPerformance;
  vrArSupport: VRAudioVisualSupport;
}
