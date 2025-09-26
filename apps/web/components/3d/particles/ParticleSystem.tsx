/**
 * Blaze Intelligence Particle System
 * High-performance GPU-accelerated particle effects
 */

import React, { useRef, useMemo, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import type { ParticleConfig, GameEvent } from '../../../types/3d.types';

interface ParticleSystemProps {
  config: ParticleConfig;
  event?: GameEvent;
  position?: THREE.Vector3;
  maxParticles?: number;
  autoStart?: boolean;
  qualityMode?: 'low' | 'medium' | 'high' | 'ultra';
}

// Particle vertex shader for GPU acceleration
const particleVertexShader = `
  uniform float time;
  uniform float size;
  attribute float particleLife;
  attribute float particleDelay;
  attribute vec3 particleVelocity;
  attribute float particleSize;
  attribute vec3 particleColor;

  varying float vLife;
  varying vec3 vColor;
  varying float vAlpha;

  void main() {
    vColor = particleColor;

    float currentLife = clamp((time - particleDelay) / particleLife, 0.0, 1.0);
    vLife = currentLife;

    if (time < particleDelay || currentLife >= 1.0) {
      vAlpha = 0.0;
      gl_Position = vec4(0.0);
      return;
    }

    // Calculate position with velocity and gravity
    vec3 pos = position + particleVelocity * (time - particleDelay) + vec3(0.0, -9.8 * pow(time - particleDelay, 2.0) * 0.1, 0.0);

    // Size animation
    float sizeMultiplier = sin(currentLife * 3.14159) * particleSize;
    gl_PointSize = size * sizeMultiplier;

    // Alpha fade
    vAlpha = sin(currentLife * 3.14159) * 0.8;

    gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
  }
`;

// Particle fragment shader
const particleFragmentShader = `
  varying float vLife;
  varying vec3 vColor;
  varying float vAlpha;

  void main() {
    if (vAlpha <= 0.0) discard;

    // Create circular particle
    float distance = length(gl_PointCoord - 0.5);
    if (distance > 0.5) discard;

    // Soft edges
    float alpha = smoothstep(0.5, 0.0, distance) * vAlpha;

    // Color based on life
    vec3 color = mix(vColor, vec3(1.0, 0.2, 0.2), vLife * 0.3);

    gl_FragColor = vec4(color, alpha);
  }
`;

export const ParticleSystem: React.FC<ParticleSystemProps> = ({
  config,
  event,
  position = new THREE.Vector3(0, 0, 0),
  maxParticles = 1000,
  autoStart = true,
  qualityMode = 'high'
}) => {
  const meshRef = useRef<THREE.Points>(null);
  const materialRef = useRef<THREE.ShaderMaterial>(null);
  const startTime = useRef<number>(0);
  const isActive = useRef<boolean>(autoStart);

  // Quality-based particle count
  const particleCount = useMemo(() => {
    const qualityMultipliers = {
      low: 0.25,
      medium: 0.5,
      high: 1.0,
      ultra: 2.0
    };
    return Math.min(maxParticles, Math.floor(config.count * qualityMultipliers[qualityMode]));
  }, [config.count, maxParticles, qualityMode]);

  // Generate particle attributes
  const { positions, velocities, colors, lifetimes, delays, sizes } = useMemo(() => {
    const positions = new Float32Array(particleCount * 3);
    const velocities = new Float32Array(particleCount * 3);
    const colors = new Float32Array(particleCount * 3);
    const lifetimes = new Float32Array(particleCount);
    const delays = new Float32Array(particleCount);
    const sizes = new Float32Array(particleCount);

    for (let i = 0; i < particleCount; i++) {
      const i3 = i * 3;

      // Position (start from emission point)
      positions[i3] = position.x + (Math.random() - 0.5) * 2;
      positions[i3 + 1] = position.y + (Math.random() - 0.5) * 2;
      positions[i3 + 2] = position.z + (Math.random() - 0.5) * 2;

      // Velocity based on particle type
      switch (config.type) {
        case 'explosion':
          const explosionRadius = Math.random() * Math.PI * 2;
          const explosionSpeed = 5 + Math.random() * 10;
          velocities[i3] = Math.cos(explosionRadius) * explosionSpeed;
          velocities[i3 + 1] = 3 + Math.random() * 8;
          velocities[i3 + 2] = Math.sin(explosionRadius) * explosionSpeed;
          break;

        case 'celebration':
          velocities[i3] = (Math.random() - 0.5) * 8;
          velocities[i3 + 1] = 8 + Math.random() * 12;
          velocities[i3 + 2] = (Math.random() - 0.5) * 8;
          break;

        case 'trail':
          velocities[i3] = config.velocity.x + (Math.random() - 0.5) * 2;
          velocities[i3 + 1] = config.velocity.y + (Math.random() - 0.5) * 2;
          velocities[i3 + 2] = config.velocity.z + (Math.random() - 0.5) * 2;
          break;

        case 'ambient':
        default:
          velocities[i3] = (Math.random() - 0.5) * 2;
          velocities[i3 + 1] = Math.random() * 3;
          velocities[i3 + 2] = (Math.random() - 0.5) * 2;
          break;
      }

      // Color
      const colorIndex = Math.floor(Math.random() * config.colors.length);
      const color = new THREE.Color(config.colors[colorIndex]);
      colors[i3] = color.r;
      colors[i3 + 1] = color.g;
      colors[i3 + 2] = color.b;

      // Lifetime and delay
      lifetimes[i] = config.lifetime + (Math.random() - 0.5) * config.lifetime * 0.5;
      delays[i] = Math.random() * 0.5; // Stagger emission

      // Size
      sizes[i] = config.size + (Math.random() - 0.5) * config.size * 0.5;
    }

    return { positions, velocities, colors, lifetimes, delays, sizes };
  }, [particleCount, position, config]);

  // Create geometry and material
  const geometry = useMemo(() => {
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geo.setAttribute('particleVelocity', new THREE.BufferAttribute(velocities, 3));
    geo.setAttribute('particleColor', new THREE.BufferAttribute(colors, 3));
    geo.setAttribute('particleLife', new THREE.BufferAttribute(lifetimes, 1));
    geo.setAttribute('particleDelay', new THREE.BufferAttribute(delays, 1));
    geo.setAttribute('particleSize', new THREE.BufferAttribute(sizes, 1));
    return geo;
  }, [positions, velocities, colors, lifetimes, delays, sizes]);

  const material = useMemo(() => {
    return new THREE.ShaderMaterial({
      uniforms: {
        time: { value: 0.0 },
        size: { value: config.size }
      },
      vertexShader: particleVertexShader,
      fragmentShader: particleFragmentShader,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending
    });
  }, [config.size]);

  // Start particle system
  const start = () => {
    isActive.current = true;
    startTime.current = performance.now() * 0.001;
  };

  // Stop particle system
  const stop = () => {
    isActive.current = false;
  };

  // Reset particle system
  const reset = () => {
    startTime.current = performance.now() * 0.001;
  };

  // Animation loop
  useFrame((state) => {
    if (!materialRef.current || !isActive.current) return;

    const currentTime = state.clock.elapsedTime;
    const particleTime = currentTime - startTime.current;

    materialRef.current.uniforms.time.value = particleTime;

    // Stop after all particles have finished
    const maxLifetime = Math.max(...lifetimes) + Math.max(...delays);
    if (particleTime > maxLifetime && autoStart === false) {
      stop();
    }
  });

  // Auto-start on event
  useEffect(() => {
    if (event && autoStart) {
      start();
    }
  }, [event, autoStart]);

  // Event-based particle triggers
  const createEventParticles = useMemo(() => {
    if (!event) return null;

    // Customize particles based on event type and impact
    const eventConfig = { ...config };

    switch (event.type) {
      case 'SCORE':
      case 'GOAL':
      case 'TOUCHDOWN':
      case 'HOMERUN':
        eventConfig.type = 'celebration';
        eventConfig.colors = ['#FFD700', '#FFA500', '#FF6B35'];
        eventConfig.count *= 2;
        break;

      case 'PENALTY':
      case 'TURNOVER':
        eventConfig.type = 'explosion';
        eventConfig.colors = ['#DC143C', '#FF4500'];
        break;

      case 'HIGHLIGHT':
        eventConfig.type = 'trail';
        eventConfig.colors = ['#00FF41', '#39FF14'];
        break;
    }

    return eventConfig;
  }, [event, config]);

  // Render instanced particles for better performance
  const InstancedParticles = useMemo(() => {
    if (qualityMode === 'low') {
      // Use simple point sprites for low quality
      return (
        <points ref={meshRef} geometry={geometry}>
          <pointsMaterial
            size={config.size}
            transparent
            opacity={0.6}
            color={config.colors[0]}
            sizeAttenuation
          />
        </points>
      );
    }

    return (
      <points ref={meshRef} geometry={geometry} material={material}>
        <shaderMaterial ref={materialRef} {...material} />
      </points>
    );
  }, [geometry, material, config, qualityMode]);

  // Expose control methods
  React.useImperativeHandle(meshRef, () => ({
    start,
    stop,
    reset,
    isActive: () => isActive.current
  }));

  return (
    <group position={position}>
      {InstancedParticles}
    </group>
  );
};

// Pre-defined particle configurations
export const PARTICLE_PRESETS = {
  homerun: {
    type: 'celebration' as const,
    count: 200,
    colors: ['#FFD700', '#FFA500', '#FF6B35'],
    lifetime: 3.0,
    velocity: new THREE.Vector3(0, 10, 0),
    size: 0.5,
    physics: true
  },

  touchdown: {
    type: 'explosion' as const,
    count: 150,
    colors: ['#00FF00', '#32CD32', '#7FFF00'],
    lifetime: 2.5,
    velocity: new THREE.Vector3(0, 8, 0),
    size: 0.4,
    physics: true
  },

  threePointer: {
    type: 'trail' as const,
    count: 100,
    colors: ['#FF4500', '#FF6B35', '#FFA500'],
    lifetime: 2.0,
    velocity: new THREE.Vector3(0, 5, 0),
    size: 0.3,
    physics: true
  },

  penalty: {
    type: 'explosion' as const,
    count: 80,
    colors: ['#DC143C', '#B22222', '#FF0000'],
    lifetime: 1.5,
    velocity: new THREE.Vector3(0, 3, 0),
    size: 0.4,
    physics: true
  },

  ambient: {
    type: 'ambient' as const,
    count: 50,
    colors: ['#4169E1', '#6495ED', '#87CEEB'],
    lifetime: 5.0,
    velocity: new THREE.Vector3(0, 1, 0),
    size: 0.2,
    physics: false
  }
};

export default ParticleSystem;