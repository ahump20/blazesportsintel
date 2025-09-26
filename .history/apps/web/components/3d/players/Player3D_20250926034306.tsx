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

export const Player3D: React.FC<Player3DProps> = ({
  player,
  selected = false,
  showStats = true,
  showBiometrics = false,
  qualityMode = 'medium',
  onClick,
  onHover
}) => {
  const meshRef = useRef<THREE.Mesh>(null);
  const groupRef = useRef<THREE.Group>(null);

  // Animation
  useFrame((state) => {
    if (meshRef.current) {
      // Subtle breathing animation
      const scale = 1 + Math.sin(state.clock.elapsedTime * 2) * 0.02;
      meshRef.current.scale.setScalar(scale);
    }
  });

  // Click handlers
  const handleClick = () => {
    onClick?.(player);
  };

  // Hover handlers
  const handlePointerEnter = () => onHover?.(player);
  const handlePointerLeave = () => onHover?.(null);

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
      anxiety: '#FF69B4'
    };

    return (
      <Sphere args={[0.1, 8, 8]} position={[0, 1.2, 0]}>
        <meshBasicMaterial color={colors[dominant.type as keyof typeof colors] || '#FFFFFF'} />
      </Sphere>
    );
  }, [showBiometrics, player.biometrics?.microExpressions]);

  // Performance stats visualization
  const PerformanceStats = useMemo(() => {
    if (!showStats || !player.stats) return null;

    const stats = player.stats;
    const maxValue = 100;

    return (
      <group position={[0, -0.5, 0]}>
        {/* Speed indicator */}
        <Line
          points={[
            [0, 0, 0],
            [stats.speed / maxValue, 0, 0]
          ]}
          color="#00FF00"
          lineWidth={3}
        />
        
        {/* Strength indicator */}
        <Line
          points={[
            [0, -0.1, 0],
            [stats.strength / maxValue, -0.1, 0]
          ]}
          color="#FF4500"
          lineWidth={3}
        />
        
        {/* Agility indicator */}
        <Line
          points={[
            [0, -0.2, 0],
            [stats.agility / maxValue, -0.2, 0]
          ]}
          color="#4169E1"
          lineWidth={3}
        />
      </group>
    );
  }, [showStats, player.stats]);

  // Player name label
  const NameLabel = useMemo(() => {
    if (!showStats) return null;

    return (
      <Billboard position={[0, 1.5, 0]}>
        <Text
          fontSize={0.2}
          color={selected ? '#FFD700' : '#FFFFFF'}
          anchorX="center"
          anchorY="middle"
        >
          {player.name}
        </Text>
      </Billboard>
    );
  }, [showStats, player.name, selected]);

  return (
    <group
      ref={groupRef}
      position={player.position}
      onClick={handleClick}
      onPointerEnter={handlePointerEnter}
      onPointerLeave={handlePointerLeave}
    >
      {/* Main player mesh */}
      <mesh ref={meshRef}>
        <boxGeometry args={[0.8, 1.6, 0.4]} />
        <meshStandardMaterial
          color={selected ? '#FFD700' : player.teamColor || '#FFFFFF'}
          emissive={selected ? '#FFD700' : '#000000'}
          emissiveIntensity={selected ? 0.2 : 0}
        />
      </mesh>

      {/* Micro-expression indicator */}
      {MicroExpressionIndicator}

      {/* Performance stats */}
      {PerformanceStats}

      {/* Name label */}
      {NameLabel}
    </group>
  );
};

export default Player3D;