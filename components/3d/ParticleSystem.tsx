/**
 * Blaze Sports Intelligence - Particle System Component
 * Championship Intelligence Platform - Advanced 3D Particle Effects
 * The Deep South's Sports Intelligence Hub
 */

'use client';

import React, { useRef, useEffect, useMemo, useCallback } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { Points, PointMaterial } from '@react-three/drei';
import * as THREE from 'three';
import { ParticleSystemConfig } from '../../types/3d.types';
import { SportType } from '../../types/sports.types';

// Particle behavior types
type ParticleBehavior = 'floating' | 'orbiting' | 'flowing' | 'exploding' | 'magnetic' | 'physics';

// Particle system state
interface ParticleSystemState {
  particles: Float32Array;
  velocities: Float32Array;
  colors: Float32Array;
  sizes: Float32Array;
  lifetimes: Float32Array;
  forces: Float32Array;
  lastUpdate: number;
}

// Particle physics configuration
interface ParticlePhysics {
  gravity: THREE.Vector3;
  friction: number;
  attraction: number;
  repulsion: number;
  turbulence: number;
  wind: THREE.Vector3;
  collisionRadius: number;
  bounceFactorX: number;
  bounceFactorY: number;
  bounceFactorZ: number;
}

// Particle emitter configuration
interface ParticleEmitter {
  position: THREE.Vector3;
  velocity: THREE.Vector3;
  spread: number;
  rate: number;
  lifetime: number;
  enabled: boolean;
}

// Default configurations for different sports
const SPORT_PARTICLE_CONFIGS: Record<SportType, Partial<ParticleSystemConfig>> = {
  mlb: {
    count: 500,
    spread: 100,
    size: { min: 0.5, max: 2.0 },
    colors: [
      new THREE.Color(0xFFFFFF), // White
      new THREE.Color(0xFF0000), // Red
      new THREE.Color(0x0000FF)  // Blue
    ],
    behavior: {
      type: 'floating',
      speed: 0.5,
      amplitude: 2.0
    }
  },
  nfl: {
    count: 800,
    spread: 150,
    size: { min: 1.0, max: 3.0 },
    colors: [
      new THREE.Color(0x013369), // Navy
      new THREE.Color(0xFFFFFF), // White
      new THREE.Color(0xFF0000)  // Red
    ],
    behavior: {
      type: 'orbiting',
      speed: 1.0,
      amplitude: 5.0
    }
  },
  nba: {
    count: 600,
    spread: 80,
    size: { min: 0.8, max: 2.5 },
    colors: [
      new THREE.Color(0xFF6600), // Orange
      new THREE.Color(0x000000), // Black
      new THREE.Color(0xFFFFFF)  // White
    ],
    behavior: {
      type: 'flowing',
      speed: 2.0,
      amplitude: 3.0
    }
  },
  ncaa: {
    count: 1000,
    spread: 200,
    size: { min: 0.3, max: 1.5 },
    colors: [
      new THREE.Color(0xBF5700), // Burnt Orange
      new THREE.Color(0xFFFFFF), // White
      new THREE.Color(0x333333)  // Dark Gray
    ],
    behavior: {
      type: 'exploding',
      speed: 1.5,
      amplitude: 8.0
    }
  }
};

// Component props
interface ParticleSystemProps {
  config: Partial<ParticleSystemConfig>;
  sport: SportType;
  intensity?: number;
  enabled?: boolean;
  interactive?: boolean;
  className?: string;
  onParticleClick?: (particle: any) => void;
}

/**
 * Particle System Component
 * Advanced 3D particle effects for sports visualization
 */
export const ParticleSystem: React.FC<ParticleSystemProps> = ({
  config: userConfig,
  sport,
  intensity = 1.0,
  enabled = true,
  interactive = false,
  className = '',
  onParticleClick
}) => {
  // Merge sport-specific config with user config
  const config = useMemo(() => ({
    ...SPORT_PARTICLE_CONFIGS[sport],
    ...userConfig
  }) as ParticleSystemConfig, [sport, userConfig]);
  
  // Refs
  const pointsRef = useRef<THREE.Points>(null);
  const geometryRef = useRef<THREE.BufferGeometry>(null);
  const materialRef = useRef<THREE.PointsMaterial>(null);
  
  // Three.js context
  const { camera, raycaster, pointer } = useThree();
  
  // Particle system state
  const particleState = useRef<ParticleSystemState>({
    particles: new Float32Array(config.count * 3),
    velocities: new Float32Array(config.count * 3),
    colors: new Float32Array(config.count * 3),
    sizes: new Float32Array(config.count),
    lifetimes: new Float32Array(config.count),
    forces: new Float32Array(config.count * 3),
    lastUpdate: 0
  });
  
  // Physics configuration
  const physics = useRef<ParticlePhysics>({
    gravity: new THREE.Vector3(0, -0.1, 0),
    friction: 0.98,
    attraction: 0.01,
    repulsion: 0.05,
    turbulence: 0.1,
    wind: new THREE.Vector3(0.1, 0, 0),
    collisionRadius: 1.0,
    bounceFactorX: 0.8,
    bounceFactorY: 0.9,
    bounceFactorZ: 0.8
  });
  
  // Emitters
  const emitters = useRef<ParticleEmitter[]>([
    {
      position: new THREE.Vector3(0, 10, 0),
      velocity: new THREE.Vector3(0, -1, 0),
      spread: 5,
      rate: 10,
      lifetime: 100,
      enabled: true
    }
  ]);
  
  // Initialize particles
  const initializeParticles = useCallback(() => {
    const state = particleState.current;
    
    for (let i = 0; i < config.count; i++) {
      const i3 = i * 3;
      
      // Position
      state.particles[i3] = (Math.random() - 0.5) * config.spread;
      state.particles[i3 + 1] = (Math.random() - 0.5) * config.spread;
      state.particles[i3 + 2] = (Math.random() - 0.5) * config.spread;
      
      // Velocity
      state.velocities[i3] = (Math.random() - 0.5) * 2;
      state.velocities[i3 + 1] = (Math.random() - 0.5) * 2;
      state.velocities[i3 + 2] = (Math.random() - 0.5) * 2;
      
      // Color
      const color = config.colors[Math.floor(Math.random() * config.colors.length)];
      state.colors[i3] = color.r;
      state.colors[i3 + 1] = color.g;
      state.colors[i3 + 2] = color.b;
      
      // Size
      state.sizes[i] = config.size.min + Math.random() * (config.size.max - config.size.min);
      
      // Lifetime
      state.lifetimes[i] = Math.random() * 100 + 50;
      
      // Forces
      state.forces[i3] = 0;
      state.forces[i3 + 1] = 0;
      state.forces[i3 + 2] = 0;
    }
    
    state.lastUpdate = performance.now();
  }, [config]);
  
  // Initialize particles on mount
  useEffect(() => {
    initializeParticles();
  }, [initializeParticles]);
  
  // Update particles based on behavior
  const updateParticles = useCallback((deltaTime: number) => {
    if (!enabled) return;
    
    const state = particleState.current;
    const time = performance.now() * 0.001;
    
    for (let i = 0; i < config.count; i++) {
      const i3 = i * 3;
      
      // Current position
      const x = state.particles[i3];
      const y = state.particles[i3 + 1];
      const z = state.particles[i3 + 2];
      
      // Current velocity
      let vx = state.velocities[i3];
      let vy = state.velocities[i3 + 1];
      let vz = state.velocities[i3 + 2];
      
      // Apply behavior-specific forces
      switch (config.behavior.type) {
        case 'floating':
          updateFloatingBehavior(i, state, time, deltaTime);
          break;
        case 'orbiting':
          updateOrbitingBehavior(i, state, time, deltaTime);
          break;
        case 'flowing':
          updateFlowingBehavior(i, state, time, deltaTime);
          break;
        case 'exploding':
          updateExplodingBehavior(i, state, time, deltaTime);
          break;
        case 'magnetic':
          updateMagneticBehavior(i, state, time, deltaTime);
          break;
        case 'physics':
          updatePhysicsBehavior(i, state, time, deltaTime);
          break;
      }
      
      // Apply global physics
      if (config.behavior.physics) {
        applyPhysics(i, state, deltaTime);
      }
      
      // Update lifetime
      state.lifetimes[i] -= deltaTime * 60; // 60fps normalization
      
      // Respawn if lifetime expired
      if (state.lifetimes[i] <= 0) {
        respawnParticle(i, state);
      }
      
      // Apply intensity modifier
      const intensityFactor = Math.max(0.1, intensity);
      state.velocities[i3] *= intensityFactor;
      state.velocities[i3 + 1] *= intensityFactor;
      state.velocities[i3 + 2] *= intensityFactor;
    }
    
    // Update geometry attributes
    if (geometryRef.current) {
      geometryRef.current.attributes.position.needsUpdate = true;
      geometryRef.current.attributes.color.needsUpdate = true;
      geometryRef.current.attributes.size.needsUpdate = true;
    }
  }, [config, enabled, intensity]);
  
  // Floating behavior implementation
  const updateFloatingBehavior = (
    index: number, 
    state: ParticleSystemState, 
    time: number, 
    deltaTime: number
  ) => {
    const i3 = index * 3;
    const speed = config.behavior.speed || 1.0;
    const amplitude = config.behavior.amplitude || 1.0;
    
    // Sine wave motion
    const offset = index * 0.1;
    state.particles[i3 + 1] += Math.sin(time * speed + offset) * amplitude * deltaTime;
    
    // Gentle drift
    state.particles[i3] += Math.cos(time * speed * 0.5 + offset) * 0.5 * deltaTime;
    state.particles[i3 + 2] += Math.sin(time * speed * 0.3 + offset) * 0.3 * deltaTime;
  };
  
  // Orbiting behavior implementation
  const updateOrbitingBehavior = (
    index: number, 
    state: ParticleSystemState, 
    time: number, 
    deltaTime: number
  ) => {
    const i3 = index * 3;
    const speed = config.behavior.speed || 1.0;
    const amplitude = config.behavior.amplitude || 1.0;
    
    const angle = time * speed + index * 0.1;
    const radius = amplitude + Math.sin(time + index) * 2;
    
    state.particles[i3] = Math.cos(angle) * radius;
    state.particles[i3 + 1] += Math.sin(time * 2 + index) * 0.5 * deltaTime;
    state.particles[i3 + 2] = Math.sin(angle) * radius;
  };
  
  // Flowing behavior implementation
  const updateFlowingBehavior = (
    index: number, 
    state: ParticleSystemState, 
    time: number, 
    deltaTime: number
  ) => {
    const i3 = index * 3;
    const speed = config.behavior.speed || 1.0;
    const amplitude = config.behavior.amplitude || 1.0;
    
    // Flow along curved path
    const flowSpeed = speed * deltaTime;
    state.particles[i3] += flowSpeed;
    state.particles[i3 + 1] += Math.sin(state.particles[i3] * 0.1) * amplitude * deltaTime;
    state.particles[i3 + 2] += Math.cos(state.particles[i3] * 0.05) * amplitude * 0.5 * deltaTime;
    
    // Wrap around
    if (state.particles[i3] > config.spread / 2) {
      state.particles[i3] = -config.spread / 2;
    }
  };
  
  // Exploding behavior implementation
  const updateExplodingBehavior = (
    index: number, 
    state: ParticleSystemState, 
    time: number, 
    deltaTime: number
  ) => {
    const i3 = index * 3;
    const speed = config.behavior.speed || 1.0;
    
    // Expand outward from center
    const centerX = 0;
    const centerY = 0;
    const centerZ = 0;
    
    const dx = state.particles[i3] - centerX;
    const dy = state.particles[i3 + 1] - centerY;
    const dz = state.particles[i3 + 2] - centerZ;
    
    const distance = Math.sqrt(dx * dx + dy * dy + dz * dz);
    
    if (distance > 0) {
      const normalizedX = dx / distance;
      const normalizedY = dy / distance;
      const normalizedZ = dz / distance;
      
      state.particles[i3] += normalizedX * speed * deltaTime;
      state.particles[i3 + 1] += normalizedY * speed * deltaTime;
      state.particles[i3 + 2] += normalizedZ * speed * deltaTime;
    }
  };
  
  // Magnetic behavior implementation
  const updateMagneticBehavior = (
    index: number, 
    state: ParticleSystemState, 
    time: number, 
    deltaTime: number
  ) => {
    const i3 = index * 3;
    const attractorX = Math.sin(time * 0.5) * 10;
    const attractorY = Math.cos(time * 0.3) * 5;
    const attractorZ = Math.sin(time * 0.7) * 8;
    
    const dx = attractorX - state.particles[i3];
    const dy = attractorY - state.particles[i3 + 1];
    const dz = attractorZ - state.particles[i3 + 2];
    
    const distance = Math.sqrt(dx * dx + dy * dy + dz * dz);
    const force = Math.min(0.1, 1 / (distance + 0.1));
    
    state.velocities[i3] += (dx / distance) * force * deltaTime;
    state.velocities[i3 + 1] += (dy / distance) * force * deltaTime;
    state.velocities[i3 + 2] += (dz / distance) * force * deltaTime;
    
    // Apply velocity
    state.particles[i3] += state.velocities[i3] * deltaTime;
    state.particles[i3 + 1] += state.velocities[i3 + 1] * deltaTime;
    state.particles[i3 + 2] += state.velocities[i3 + 2] * deltaTime;
    
    // Apply friction
    state.velocities[i3] *= 0.99;
    state.velocities[i3 + 1] *= 0.99;
    state.velocities[i3 + 2] *= 0.99;
  };
  
  // Physics behavior implementation
  const updatePhysicsBehavior = (
    index: number, 
    state: ParticleSystemState, 
    time: number, 
    deltaTime: number
  ) => {
    const i3 = index * 3;
    
    // Apply gravity
    if (config.behavior.gravity) {
      state.velocities[i3 + 1] += config.behavior.gravity.y * deltaTime;
    }
    
    // Apply wind
    if (config.behavior.wind) {
      state.velocities[i3] += config.behavior.wind.x * deltaTime;
      state.velocities[i3 + 1] += config.behavior.wind.y * deltaTime;
      state.velocities[i3 + 2] += config.behavior.wind.z * deltaTime;
    }
    
    // Update position
    state.particles[i3] += state.velocities[i3] * deltaTime;
    state.particles[i3 + 1] += state.velocities[i3 + 1] * deltaTime;
    state.particles[i3 + 2] += state.velocities[i3 + 2] * deltaTime;
    
    // Boundary collision
    checkBoundaryCollision(index, state);
  };
  
  // Apply global physics forces
  const applyPhysics = (index: number, state: ParticleSystemState, deltaTime: number) => {
    const i3 = index * 3;
    const phys = physics.current;
    
    // Apply gravity
    state.velocities[i3] += phys.gravity.x * deltaTime;
    state.velocities[i3 + 1] += phys.gravity.y * deltaTime;
    state.velocities[i3 + 2] += phys.gravity.z * deltaTime;
    
    // Apply wind
    state.velocities[i3] += phys.wind.x * deltaTime;
    state.velocities[i3 + 1] += phys.wind.y * deltaTime;
    state.velocities[i3 + 2] += phys.wind.z * deltaTime;
    
    // Apply turbulence
    const turbulence = phys.turbulence;
    state.velocities[i3] += (Math.random() - 0.5) * turbulence * deltaTime;
    state.velocities[i3 + 1] += (Math.random() - 0.5) * turbulence * deltaTime;
    state.velocities[i3 + 2] += (Math.random() - 0.5) * turbulence * deltaTime;
    
    // Apply friction
    state.velocities[i3] *= phys.friction;
    state.velocities[i3 + 1] *= phys.friction;
    state.velocities[i3 + 2] *= phys.friction;
    
    // Update position
    state.particles[i3] += state.velocities[i3] * deltaTime;
    state.particles[i3 + 1] += state.velocities[i3 + 1] * deltaTime;
    state.particles[i3 + 2] += state.velocities[i3 + 2] * deltaTime;
    
    // Check collisions
    checkBoundaryCollision(index, state);
  };
  
  // Check boundary collision
  const checkBoundaryCollision = (index: number, state: ParticleSystemState) => {
    const i3 = index * 3;
    const phys = physics.current;
    const boundary = config.spread / 2;
    
    // X boundary
    if (state.particles[i3] > boundary) {
      state.particles[i3] = boundary;
      state.velocities[i3] *= -phys.bounceFactorX;
    } else if (state.particles[i3] < -boundary) {
      state.particles[i3] = -boundary;
      state.velocities[i3] *= -phys.bounceFactorX;
    }
    
    // Y boundary
    if (state.particles[i3 + 1] > boundary) {
      state.particles[i3 + 1] = boundary;
      state.velocities[i3 + 1] *= -phys.bounceFactorY;
    } else if (state.particles[i3 + 1] < -boundary) {
      state.particles[i3 + 1] = -boundary;
      state.velocities[i3 + 1] *= -phys.bounceFactorY;
    }
    
    // Z boundary
    if (state.particles[i3 + 2] > boundary) {
      state.particles[i3 + 2] = boundary;
      state.velocities[i3 + 2] *= -phys.bounceFactorZ;
    } else if (state.particles[i3 + 2] < -boundary) {
      state.particles[i3 + 2] = -boundary;
      state.velocities[i3 + 2] *= -phys.bounceFactorZ;
    }
  };
  
  // Respawn particle
  const respawnParticle = (index: number, state: ParticleSystemState) => {
    const i3 = index * 3;
    
    // Choose random emitter
    const emitter = emitters.current[Math.floor(Math.random() * emitters.current.length)];
    
    if (emitter.enabled) {
      // Position near emitter
      state.particles[i3] = emitter.position.x + (Math.random() - 0.5) * emitter.spread;
      state.particles[i3 + 1] = emitter.position.y + (Math.random() - 0.5) * emitter.spread;
      state.particles[i3 + 2] = emitter.position.z + (Math.random() - 0.5) * emitter.spread;
      
      // Initial velocity
      state.velocities[i3] = emitter.velocity.x + (Math.random() - 0.5) * 2;
      state.velocities[i3 + 1] = emitter.velocity.y + (Math.random() - 0.5) * 2;
      state.velocities[i3 + 2] = emitter.velocity.z + (Math.random() - 0.5) * 2;
      
      // Reset lifetime
      state.lifetimes[index] = emitter.lifetime + Math.random() * 50;
      
      // Random color
      const color = config.colors[Math.floor(Math.random() * config.colors.length)];
      state.colors[i3] = color.r;
      state.colors[i3 + 1] = color.g;
      state.colors[i3 + 2] = color.b;
      
      // Random size
      state.sizes[index] = config.size.min + Math.random() * (config.size.max - config.size.min);
    }
  };
  
  // Handle particle interaction
  const handleParticleInteraction = useCallback((event: any) => {
    if (!interactive || !onParticleClick) return;
    
    // Raycast to find intersected particles
    raycaster.setFromCamera(pointer, camera);
    
    if (pointsRef.current) {
      const intersects = raycaster.intersectObject(pointsRef.current);
      
      if (intersects.length > 0) {
        const intersection = intersects[0];
        onParticleClick({
          index: intersection.index,
          position: intersection.point,
          distance: intersection.distance
        });
      }
    }
  }, [interactive, onParticleClick, raycaster, pointer, camera]);
  
  // Animation loop
  useFrame((state, deltaTime) => {
    updateParticles(deltaTime);
  });
  
  // Create geometry with attributes
  const geometry = useMemo(() => {
    const geo = new THREE.BufferGeometry();
    const state = particleState.current;
    
    geo.setAttribute('position', new THREE.Float32BufferAttribute(state.particles, 3));
    geo.setAttribute('color', new THREE.Float32BufferAttribute(state.colors, 3));
    geo.setAttribute('size', new THREE.Float32BufferAttribute(state.sizes, 1));
    
    return geo;
  }, [config.count]);
  
  // Material configuration
  const material = useMemo(() => {
    return new THREE.PointsMaterial({
      size: config.size.max,
      vertexColors: true,
      transparent: true,
      opacity: config.opacity?.max || 0.8,
      blending: THREE.AdditiveBlending,
      sizeAttenuation: true,
      depthWrite: false
    });
  }, [config]);
  
  // Color animation
  useEffect(() => {
    if (config.animation?.colorTransition?.enabled) {
      const interval = setInterval(() => {
        const state = particleState.current;
        const colors = config.animation.colorTransition.colors;
        
        for (let i = 0; i < config.count; i++) {
          const i3 = i * 3;
          const colorIndex = Math.floor(Math.random() * colors.length);
          const color = colors[colorIndex];
          
          // Smooth transition
          const targetR = color.r;
          const targetG = color.g;
          const targetB = color.b;
          
          state.colors[i3] += (targetR - state.colors[i3]) * 0.1;
          state.colors[i3 + 1] += (targetG - state.colors[i3 + 1]) * 0.1;
          state.colors[i3 + 2] += (targetB - state.colors[i3 + 2]) * 0.1;
        }
        
        if (geometryRef.current) {
          geometryRef.current.attributes.color.needsUpdate = true;
        }
      }, 100);
      
      return () => clearInterval(interval);
    }
  }, [config]);
  
  if (!enabled) return null;
  
  return (
    <Points
      ref={pointsRef}
      geometry={geometry}
      material={material}
      onClick={handleParticleInteraction}
      className={className}
    >
      <bufferGeometry ref={geometryRef} {...geometry} />
      <pointsMaterial ref={materialRef} {...material} />
    </Points>
  );
};

export default ParticleSystem;
