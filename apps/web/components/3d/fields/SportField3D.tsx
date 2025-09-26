/**
 * Blaze Intelligence 3D Sport Field Component
 * Dynamic field rendering for MLB, NFL, NBA, NCAA
 */

import React, { useMemo, useRef, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import { Line, Text, Plane, Sphere } from '@react-three/drei';
import * as THREE from 'three';
import type { Field3D, HeatZone, Trajectory } from '../../../types/3d.types';

interface SportField3DProps {
  field: Field3D;
  heatZones?: HeatZone[];
  trajectories?: Trajectory[];
  showHeatmap?: boolean;
  showTrajectories?: boolean;
  qualityMode?: 'low' | 'medium' | 'high' | 'ultra';
}

// Field configurations for different sports
const FIELD_CONFIGS = {
  MLB: {
    dimensions: { width: 90, length: 90, height: 0 },
    color: '#228B22',
    lines: [
      // Infield diamond
      { points: [[0, 0], [90, 0], [90, 90], [0, 90], [0, 0]], color: '#FFFFFF', width: 2 },
      // Pitcher's mound
      { points: [[45, 60.5]], color: '#8B4513', width: 0, radius: 9 },
      // Home plate area
      { points: [[45, 0]], color: '#8B4513', width: 0, radius: 3 }
    ],
    positions: {
      homeplate: [45, 0, 0],
      firstbase: [90, 0, 0],
      secondbase: [90, 90, 0],
      thirdbase: [0, 90, 0],
      pitchersmound: [45, 60.5, 0]
    }
  },
  NFL: {
    dimensions: { width: 53.33, length: 120, height: 0 },
    color: '#228B22',
    lines: [
      // Field boundaries
      { points: [[0, 0], [53.33, 0], [53.33, 120], [0, 120], [0, 0]], color: '#FFFFFF', width: 2 },
      // Yard lines (every 5 yards)
      ...Array.from({ length: 21 }, (_, i) => ({
        points: [[0, i * 6], [53.33, i * 6]],
        color: '#FFFFFF',
        width: 1
      })),
      // Hash marks
      { points: [[18.5, 0], [18.5, 120]], color: '#FFFFFF', width: 1 },
      { points: [[34.83, 0], [34.83, 120]], color: '#FFFFFF', width: 1 }
    ],
    positions: {
      leftendzone: [26.67, 0, 0],
      rightendzone: [26.67, 120, 0],
      midfield: [26.67, 60, 0]
    }
  },
  NBA: {
    dimensions: { width: 50, length: 94, height: 0 },
    color: '#8B4513',
    lines: [
      // Court boundaries
      { points: [[0, 0], [50, 0], [50, 94], [0, 94], [0, 0]], color: '#FFFFFF', width: 2 },
      // Center circle
      { points: [[25, 47]], color: '#FFFFFF', width: 2, radius: 6 },
      // Free throw circles
      { points: [[25, 19]], color: '#FFFFFF', width: 2, radius: 6 },
      { points: [[25, 75]], color: '#FFFFFF', width: 2, radius: 6 },
      // Three-point lines
      { points: [[3, 0], [3, 14], [25, 23.75], [47, 14], [47, 0]], color: '#FFFFFF', width: 2 },
      { points: [[3, 94], [3, 80], [25, 70.25], [47, 80], [47, 94]], color: '#FFFFFF', width: 2 }
    ],
    positions: {
      leftbasket: [25, 5.25, 10],
      rightbasket: [25, 88.75, 10],
      center: [25, 47, 0]
    }
  },
  NCAA: {
    dimensions: { width: 53.33, length: 100, height: 0 },
    color: '#228B22',
    lines: [
      // Similar to NFL but shorter
      { points: [[0, 0], [53.33, 0], [53.33, 100], [0, 100], [0, 0]], color: '#FFFFFF', width: 2 }
    ],
    positions: {
      leftendzone: [26.67, 0, 0],
      rightendzone: [26.67, 100, 0],
      midfield: [26.67, 50, 0]
    }
  }
};

// Heat zone shader material for better performance
const heatZoneShader = {
  uniforms: {
    time: { value: 1.0 },
    intensity: { value: 1.0 },
    color: { value: new THREE.Color('#FF0000') }
  },
  vertexShader: `
    varying vec2 vUv;
    void main() {
      vUv = uv;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,
  fragmentShader: `
    uniform float time;
    uniform float intensity;
    uniform vec3 color;
    varying vec2 vUv;

    void main() {
      float distance = length(vUv - 0.5);
      float alpha = smoothstep(0.5, 0.2, distance) * intensity;
      float pulse = sin(time * 3.0) * 0.2 + 0.8;

      gl_FragColor = vec4(color * pulse, alpha);
    }
  `
};

export const SportField3D: React.FC<SportField3DProps> = ({
  field,
  heatZones = [],
  trajectories = [],
  showHeatmap = true,
  showTrajectories = true,
  qualityMode = 'high'
}) => {
  const fieldRef = useRef<THREE.Group>(null);
  const shaderRef = useRef<THREE.ShaderMaterial>(null);

  const config = FIELD_CONFIGS[field.sport] || FIELD_CONFIGS.NCAA;

  // Performance settings based on quality
  const qualitySettings = useMemo(() => ({
    low: { segments: 32, heatmapResolution: 64, maxTrajectories: 10 },
    medium: { segments: 64, heatmapResolution: 128, maxTrajectories: 25 },
    high: { segments: 128, heatmapResolution: 256, maxTrajectories: 50 },
    ultra: { segments: 256, heatmapResolution: 512, maxTrajectories: 100 }
  }), []);

  const settings = qualitySettings[qualityMode];

  // Field ground
  const FieldGround = useMemo(() => (
    <Plane
      args={[config.dimensions.width, config.dimensions.length, settings.segments, settings.segments]}
      rotation={[-Math.PI / 2, 0, 0]}
      position={[config.dimensions.width / 2, 0, config.dimensions.length / 2]}
    >
      <meshStandardMaterial
        color={config.color}
        roughness={0.8}
        metalness={0.1}
      />
    </Plane>
  ), [config, settings]);

  // Field lines
  const FieldLines = useMemo(() => {
    return config.lines.map((line, index) => {
      if (line.radius) {
        // Circular element
        return (
          <mesh
            key={index}
            position={[line.points[0][0], 0.01, line.points[0][1]]}
            rotation={[-Math.PI / 2, 0, 0]}
          >
            <ringGeometry args={[line.radius - 0.2, line.radius, 32]} />
            <meshStandardMaterial color={line.color} />
          </mesh>
        );
      } else {
        // Line element
        const points = line.points.map(p => new THREE.Vector3(p[0], 0.01, p[1]));
        return (
          <Line
            key={index}
            points={points}
            color={line.color}
            lineWidth={line.width}
          />
        );
      }
    });
  }, [config]);

  // Heat zones visualization
  const HeatZones = useMemo(() => {
    if (!showHeatmap || heatZones.length === 0) return null;

    return heatZones.map((zone) => (
      <group key={zone.id}>
        {/* Heat zone circle */}
        <mesh
          position={[zone.position.x, 0.02, zone.position.z]}
          rotation={[-Math.PI / 2, 0, 0]}
        >
          <circleGeometry args={[zone.radius, 32]} />
          <shaderMaterial
            ref={shaderRef}
            transparent
            uniforms={{
              ...heatZoneShader.uniforms,
              intensity: { value: zone.intensity },
              color: { value: new THREE.Color(zone.color) }
            }}
            vertexShader={heatZoneShader.vertexShader}
            fragmentShader={heatZoneShader.fragmentShader}
          />
        </mesh>

        {/* Zone label */}
        <Text
          position={[zone.position.x, 0.5, zone.position.z]}
          fontSize={0.5}
          color="white"
          anchorX="center"
          anchorY="middle"
          outlineWidth={0.02}
          outlineColor="black"
        >
          {zone.label}
        </Text>
      </group>
    ));
  }, [showHeatmap, heatZones]);

  // Trajectory visualization
  const Trajectories = useMemo(() => {
    if (!showTrajectories || trajectories.length === 0) return null;

    return trajectories.slice(-settings.maxTrajectories).map((traj) => {
      const points = traj.points.map(p => new THREE.Vector3(p.x, p.y, p.z));
      const color = traj.outcome === 'success' ? '#00FF00' :
                   traj.outcome === 'fail' ? '#FF0000' : '#FFFF00';

      return (
        <group key={traj.id}>
          {/* Trajectory line */}
          <Line
            points={points}
            color={color}
            lineWidth={2}
            transparent
            opacity={0.8}
          />

          {/* Ball positions along trajectory */}
          {qualityMode !== 'low' && points.slice(0, -1).map((point, index) => (
            <Sphere
              key={index}
              position={point}
              args={[0.1, 8, 6]}
            >
              <meshStandardMaterial
                color={color}
                transparent
                opacity={0.6}
              />
            </Sphere>
          ))}

          {/* End point */}
          <Sphere
            position={points[points.length - 1]}
            args={[0.2, 16, 12]}
          >
            <meshStandardMaterial
              color={color}
              emissive={color}
              emissiveIntensity={0.3}
            />
          </Sphere>
        </group>
      );
    });
  }, [showTrajectories, trajectories, settings, qualityMode]);

  // Field positions markers
  const PositionMarkers = useMemo(() => {
    return Object.entries(config.positions).map(([name, position]) => (
      <group key={name}>
        <mesh position={position}>
          <cylinderGeometry args={[0.3, 0.3, 0.1, 16]} />
          <meshStandardMaterial
            color="#FFD700"
            emissive="#FFD700"
            emissiveIntensity={0.2}
          />
        </mesh>
        <Text
          position={[position[0], position[1] + 0.5, position[2]]}
          fontSize={0.3}
          color="white"
          anchorX="center"
          anchorY="middle"
          outlineWidth={0.02}
          outlineColor="black"
        >
          {name.toUpperCase()}
        </Text>
      </group>
    ));
  }, [config]);

  // Weather effects
  const WeatherEffects = useMemo(() => {
    if (!field.weather) return null;

    const effects = [];

    // Wind visualization
    if (field.weather.windSpeed > 5) {
      const windDirection = field.weather.windDirection;
      for (let i = 0; i < 10; i++) {
        const x = (Math.random() - 0.5) * config.dimensions.width;
        const z = (Math.random() - 0.5) * config.dimensions.length;
        effects.push(
          <Line
            key={`wind-${i}`}
            points={[
              [x, 2, z],
              [x + windDirection.x * 2, 2 + windDirection.y, z + windDirection.z * 2]
            ]}
            color="#87CEEB"
            lineWidth={1}
            transparent
            opacity={0.5}
          />
        );
      }
    }

    return <group>{effects}</group>;
  }, [field.weather, config]);

  // Animate shader uniforms
  useFrame((state) => {
    if (shaderRef.current) {
      shaderRef.current.uniforms.time.value = state.clock.elapsedTime;
    }
  });

  return (
    <group ref={fieldRef}>
      {/* Ground */}
      {FieldGround}

      {/* Field markings */}
      {FieldLines}

      {/* Position markers */}
      {PositionMarkers}

      {/* Heat zones */}
      {HeatZones}

      {/* Trajectories */}
      {Trajectories}

      {/* Weather effects */}
      {WeatherEffects}

      {/* Field boundaries (invisible collision detection) */}
      <mesh
        position={[config.dimensions.width / 2, 0, config.dimensions.length / 2]}
        visible={false}
      >
        <boxGeometry args={[config.dimensions.width, 1, config.dimensions.length]} />
        <meshBasicMaterial transparent opacity={0} />
      </mesh>
    </group>
  );
};

export default SportField3D;