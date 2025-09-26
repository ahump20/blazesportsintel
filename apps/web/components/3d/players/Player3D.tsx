/**
 * Blaze Intelligence 3D Player Component
 * High-performance 3D player representation with biometric data
 */

import React, { useRef, useMemo, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import { Text, Billboard, Line, Sphere } from '@react-three/drei';
import * as THREE from 'three';
import type { Player3DData, BiometricData } from '../../../types/3d.types';

interface Player3DProps {
  player: Player3DData;
  selected?: boolean;
  showStats?: boolean;
  showBiometrics?: boolean;
  qualityMode?: 'low' | 'medium' | 'high' | 'ultra';
  onClick?: (player: Player3DData) => void;
  onHover?: (player: Player3DData | null) => void;
}

// Color mapping for different sports and positions
const SPORT_COLORS = {
  MLB: {
    PITCHER: '#FF4444',
    CATCHER: '#44FF44',
    default: '#4444FF'
  },
  NFL: {
    QUARTERBACK: '#FFD700',
    RUNNING_BACK: '#FF6B35',
    WIDE_RECEIVER: '#4ECDC4',
    default: '#45B7D1'
  },
  NBA: {
    POINT_GUARD: '#96CEB4',
    SHOOTING_GUARD: '#FFEAA7',
    CENTER: '#DDA0DD',
    default: '#74B9FF'
  },
  NCAA: {
    default: '#A29BFE'
  }
};

// Skeleton joint mapping for pose visualization
const SKELETON_CONNECTIONS = [
  ['nose', 'left_eye'],
  ['nose', 'right_eye'],
  ['left_eye', 'left_ear'],
  ['right_eye', 'right_ear'],
  ['left_shoulder', 'right_shoulder'],
  ['left_shoulder', 'left_elbow'],
  ['left_elbow', 'left_wrist'],
  ['right_shoulder', 'right_elbow'],
  ['right_elbow', 'right_wrist'],
  ['left_shoulder', 'left_hip'],
  ['right_shoulder', 'right_hip'],
  ['left_hip', 'right_hip'],
  ['left_hip', 'left_knee'],
  ['left_knee', 'left_ankle'],
  ['right_hip', 'right_knee'],
  ['right_knee', 'right_ankle']
];

export const Player3D: React.FC<Player3DProps> = ({
  player,
  selected = false,
  showStats = true,
  showBiometrics = false,
  qualityMode = 'high',
  onClick,
  onHover
}) => {
  const meshRef = useRef<THREE.Mesh>(null);
  const groupRef = useRef<THREE.Group>(null);
  const trailRef = useRef<THREE.BufferGeometry>(null);

  // Performance optimizations based on quality mode
  const LOD_CONFIG = useMemo(() => ({
    low: { segments: 8, rings: 6, trailLength: 10 },
    medium: { segments: 16, rings: 12, trailLength: 20 },
    high: { segments: 32, rings: 24, trailLength: 50 },
    ultra: { segments: 64, rings: 48, trailLength: 100 }
  }), []);

  const config = LOD_CONFIG[qualityMode];

  // Player color based on sport and position
  const playerColor = useMemo(() => {
    const sportColors = SPORT_COLORS[player.sport] || SPORT_COLORS.NCAA;
    return sportColors[player.position as keyof typeof sportColors] || sportColors.default;
  }, [player.sport, player.position]);

  // Trail positions for movement history
  const trailPositions = useRef<THREE.Vector3[]>([]);

  // Biometric skeleton points
  const skeletonPoints = useMemo(() => {
    if (!showBiometrics || !player.biometrics?.skeleton) return null;

    return player.biometrics.skeleton.reduce((acc, point) => {
      acc[point.joint] = new THREE.Vector3().fromArray(point.position as any);
      return acc;
    }, {} as Record<string, THREE.Vector3>);
  }, [showBiometrics, player.biometrics]);

  // Animation frame updates
  useFrame((state, delta) => {
    if (!meshRef.current || !groupRef.current) return;

    // Update player position with smooth interpolation
    const targetPosition = new THREE.Vector3().fromArray(player.position as any);
    groupRef.current.position.lerp(targetPosition, delta * 10);

    // Update rotation
    const targetRotation = new THREE.Euler().fromArray(player.rotation as any);
    groupRef.current.rotation.x = THREE.MathUtils.lerp(groupRef.current.rotation.x, targetRotation.x, delta * 5);
    groupRef.current.rotation.y = THREE.MathUtils.lerp(groupRef.current.rotation.y, targetRotation.y, delta * 5);
    groupRef.current.rotation.z = THREE.MathUtils.lerp(groupRef.current.rotation.z, targetRotation.z, delta * 5);

    // Update trail
    if (trailPositions.current.length > config.trailLength) {
      trailPositions.current.shift();
    }
    trailPositions.current.push(targetPosition.clone());

    // Selection pulsing effect
    if (selected && meshRef.current) {
      const pulse = Math.sin(state.clock.elapsedTime * 4) * 0.1 + 1;
      meshRef.current.scale.setScalar(pulse);
    }

    // Fatigue visualization
    if (player.biometrics?.fatigue !== undefined) {
      const fatigueColor = new THREE.Color().lerpColors(
        new THREE.Color(playerColor),
        new THREE.Color('#FF0000'),
        player.biometrics.fatigue
      );
      if (meshRef.current.material instanceof THREE.MeshStandardMaterial) {
        meshRef.current.material.color = fatigueColor;
      }
    }
  });

  // Click handler
  const handleClick = (event: any) => {
    event.stopPropagation();
    onClick?.(player);
  };

  // Hover handlers
  const handlePointerEnter = () => onHover?.(player);
  const handlePointerLeave = () => onHover?(null);

  // Micro-expressions visualization
  const MicroExpressionIndicator = useMemo(() => {
    if (!showBiometrics || !player.biometrics?.microExpressions?.length) return null;

    const dominant = player.biometrics.microExpressions.reduce((prev, current) =>
      current.intensity > prev.intensity ? current : prev
    );

    const colors = {
      determination: '#FFD700',
      focus: '#00FF00',
      stress: '#FF4500',
      confidence: '#4169E1',
      fatigue: '#8B0000'
    };

    return (
      <Sphere
        position={[0, 2.5, 0]}
        args={[0.2, config.segments / 2, config.rings / 2]}
      >
        <meshStandardMaterial
          color={colors[dominant.type] || '#FFFFFF'}
          emissive={colors[dominant.type] || '#FFFFFF'}
          emissiveIntensity={dominant.intensity * 0.3}
          transparent
          opacity={0.7}
        />
      </Sphere>
    );
  }, [showBiometrics, player.biometrics?.microExpressions, config]);

  // Skeleton visualization
  const SkeletonVisualization = useMemo(() => {
    if (!showBiometrics || !skeletonPoints) return null;

    return (
      <>
        {/* Joint points */}
        {Object.entries(skeletonPoints).map(([joint, position]) => (
          <Sphere
            key={joint}
            position={position}
            args={[0.05, 8, 6]}
          >
            <meshStandardMaterial
              color="#00FFFF"
              emissive="#00FFFF"
              emissiveIntensity={0.2}
            />
          </Sphere>
        ))}

        {/* Skeleton connections */}
        {SKELETON_CONNECTIONS.map(([joint1, joint2], index) => {
          const pos1 = skeletonPoints[joint1];
          const pos2 = skeletonPoints[joint2];

          if (!pos1 || !pos2) return null;

          return (
            <Line
              key={index}
              points={[pos1, pos2]}
              color="#00FFFF"
              lineWidth={2}
              transparent
              opacity={0.6}
            />
          );
        })}
      </>
    );
  }, [showBiometrics, skeletonPoints]);

  // Movement trail
  const MovementTrail = useMemo(() => {
    if (trailPositions.current.length < 2) return null;

    return (
      <Line
        points={trailPositions.current}
        color={playerColor}
        lineWidth={1}
        transparent
        opacity={0.5}
      />
    );
  }, [trailPositions.current, playerColor]);

  // Stats display
  const StatsDisplay = useMemo(() => {
    if (!showStats) return null;

    return (
      <Billboard position={[0, 3, 0]} follow={true}>
        <Text
          fontSize={0.3}
          color="white"
          anchorX="center"
          anchorY="middle"
          outlineWidth={0.02}
          outlineColor="black"
        >
          {`${player.name}\n#${player.jerseyNumber}\n${player.stats.primary.toFixed(1)}`}
        </Text>
      </Billboard>
    );
  }, [showStats, player]);

  return (
    <group
      ref={groupRef}
      onPointerDown={handleClick}
      onPointerEnter={handlePointerEnter}
      onPointerLeave={handlePointerLeave}
    >
      {/* Main player mesh */}
      <mesh ref={meshRef}>
        <cylinderGeometry args={[0.3, 0.5, 2, config.segments]} />
        <meshStandardMaterial
          color={playerColor}
          roughness={0.4}
          metalness={0.1}
          transparent={!player.isActive}
          opacity={player.isActive ? 1.0 : 0.5}
        />
      </mesh>

      {/* Jersey number */}
      <Billboard position={[0, 1, 0.6]} follow={false}>
        <Text
          fontSize={0.5}
          color="white"
          anchorX="center"
          anchorY="middle"
          font="/fonts/roboto-bold.woff"
          outlineWidth={0.02}
          outlineColor="black"
        >
          {player.jerseyNumber}
        </Text>
      </Billboard>

      {/* Selection indicator */}
      {selected && (
        <mesh position={[0, -1.2, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[0.8, 1.0, 32]} />
          <meshStandardMaterial
            color="#FFD700"
            emissive="#FFD700"
            emissiveIntensity={0.3}
            transparent
            opacity={0.8}
          />
        </mesh>
      )}

      {/* Velocity vector */}
      {player.velocity && (
        <Line
          points={[
            [0, 1, 0],
            [player.velocity.x * 2, 1 + player.velocity.y * 2, player.velocity.z * 2]
          ]}
          color="#FFFF00"
          lineWidth={3}
        />
      )}

      {/* Components */}
      {MicroExpressionIndicator}
      {SkeletonVisualization}
      {MovementTrail}
      {StatsDisplay}

      {/* Biometric data visualization */}
      {showBiometrics && player.biometrics && (
        <group position={[0, -2, 0]}>
          {/* Fatigue indicator */}
          <mesh>
            <boxGeometry args={[2, 0.1, 0.1]} />
            <meshStandardMaterial
              color={`hsl(${(1 - player.biometrics.fatigue) * 120}, 100%, 50%)`}
            />
          </mesh>

          {/* Heart rate indicator */}
          {player.biometrics.heartRate && (
            <Billboard position={[0, -0.5, 0]}>
              <Text
                fontSize={0.2}
                color="red"
                anchorX="center"
                anchorY="middle"
              >
                ❤️ {player.biometrics.heartRate} BPM
              </Text>
            </Billboard>
          )}
        </group>
      )}
    </group>
  );
};

export default Player3D;