/**
 * Blaze Intelligence Main 3D Dashboard
 * Championship-tier 3D sports analytics dashboard
 */

import React, { Suspense, useState, useEffect, useRef } from 'react';
import { Canvas } from '@react-three/fiber';
import {
  OrbitControls,
  PerspectiveCamera,
  Environment,
  Stats,
  Preload,
  AdaptiveDpr,
  AdaptiveEvents,
  BakeShadows
} from '@react-three/drei';
import { Leva, useControls } from 'leva';
import { ErrorBoundary } from 'react-error-boundary';
import * as THREE from 'three';

// Import our custom components
import Player3D from './players/Player3D';
import SportField3D from './fields/SportField3D';
import ParticleSystem, { PARTICLE_PRESETS } from './particles/ParticleSystem';

// Import types and stores
import type { Player3DData, Field3D, GameEvent, Trajectory } from '../../types/3d.types';
import { useSportsStore } from '../../lib/stores/sportsStore';
import { useWebSocket } from '../../lib/websocket/sportsWebSocket';

interface Dashboard3DProps {
  width?: number;
  height?: number;
  enableControls?: boolean;
  qualityMode?: 'low' | 'medium' | 'high' | 'ultra';
}

// Loading component for Suspense
const LoadingSpinner: React.FC = () => (
  <div
    style={{
      position: 'absolute',
      top: '50%',
      left: '50%',
      transform: 'translate(-50%, -50%)',
      color: '#FF4500',
      fontSize: '18px',
      fontWeight: 600,
      display: 'flex',
      alignItems: 'center',
      gap: '12px'
    }}
  >
    <div
      style={{
        width: '24px',
        height: '24px',
        border: '3px solid transparent',
        borderTop: '3px solid #FF4500',
        borderRadius: '50%',
        animation: 'spin 1s linear infinite'
      }}
    />
    Loading 3D Environment...
  </div>
);

// Error fallback component
const ErrorFallback: React.FC<{ error: Error; resetErrorBoundary: () => void }> = ({
  error,
  resetErrorBoundary
}) => (
  <div
    style={{
      position: 'absolute',
      top: '50%',
      left: '50%',
      transform: 'translate(-50%, -50%)',
      textAlign: 'center',
      color: '#FF4500',
      padding: '20px'
    }}
  >
    <h3 style={{ marginBottom: '10px' }}>3D Rendering Error</h3>
    <p style={{ marginBottom: '15px', color: '#FFA500' }}>{error.message}</p>
    <button
      onClick={resetErrorBoundary}
      style={{
        padding: '10px 20px',
        background: '#FF4500',
        color: 'white',
        border: 'none',
        borderRadius: '5px',
        cursor: 'pointer'
      }}
    >
      Retry
    </button>
  </div>
);

// Main 3D Scene Component
const Scene3D: React.FC<{
  qualityMode: 'low' | 'medium' | 'high' | 'ultra';
}> = ({ qualityMode }) => {
  const {
    currentSport,
    players,
    field,
    events,
    trajectories,
    heatZones,
    selectedPlayer,
    selectedEvent,
    showStats,
    showHeatmap,
    showTrajectories,
    showBiometrics,
    updatePerformanceMetrics
  } = useSportsStore();

  const { connected: wsConnected, latency } = useWebSocket();
  const frameCount = useRef(0);
  const lastTime = useRef(performance.now());

  // Performance monitoring
  useEffect(() => {
    const interval = setInterval(() => {
      const currentTime = performance.now();
      const deltaTime = currentTime - lastTime.current;
      const fps = Math.round(1000 / (deltaTime / frameCount.current || 16));

      updatePerformanceMetrics({
        fps: fps,
        frameTime: deltaTime / frameCount.current || 16,
        latency: latency
      });

      frameCount.current = 0;
      lastTime.current = currentTime;
    }, 1000);

    return () => clearInterval(interval);
  }, [latency, updatePerformanceMetrics]);

  // Convert Map to Array for rendering
  const playersArray = Array.from(players.values());

  return (
    <>
      {/* Lighting Setup */}
      <ambientLight intensity={0.4} color="#ffffff" />
      <directionalLight
        position={[50, 100, 50]}
        intensity={1.2}
        color="#ffffff"
        castShadow={qualityMode !== 'low'}
        shadow-mapSize-width={qualityMode === 'ultra' ? 4096 : 2048}
        shadow-mapSize-height={qualityMode === 'ultra' ? 4096 : 2048}
        shadow-camera-far={200}
        shadow-camera-left={-100}
        shadow-camera-right={100}
        shadow-camera-top={100}
        shadow-camera-bottom={-100}
      />
      <pointLight position={[0, 50, 0]} intensity={0.8} color="#FFA500" />

      {/* Stadium Environment */}
      {qualityMode !== 'low' && (
        <Environment
          files="/hdri/stadium_01_1k.hdr"
          background={false}
          blur={0.8}
        />
      )}

      {/* Sport Field */}
      {field && (
        <SportField3D
          field={field}
          heatZones={showHeatmap ? heatZones : []}
          trajectories={showTrajectories ? trajectories : []}
          showHeatmap={showHeatmap}
          showTrajectories={showTrajectories}
          qualityMode={qualityMode}
        />
      )}

      {/* Players */}
      {playersArray.map((player) => (
        <Player3D
          key={player.id}
          player={player}
          selected={selectedPlayer === player.id}
          showStats={showStats}
          showBiometrics={showBiometrics}
          qualityMode={qualityMode}
          onClick={(p) => useSportsStore.getState().selectPlayer(p.id)}
          onHover={(p) => {
            // Handle hover logic
          }}
        />
      ))}

      {/* Event Particles */}
      {events.slice(-10).map((event) => {
        let preset = PARTICLE_PRESETS.ambient;

        switch (event.type) {
          case 'HOMERUN':
            preset = PARTICLE_PRESETS.homerun;
            break;
          case 'TOUCHDOWN':
            preset = PARTICLE_PRESETS.touchdown;
            break;
          case 'GOAL':
            preset = PARTICLE_PRESETS.threePointer;
            break;
          case 'PENALTY':
            preset = PARTICLE_PRESETS.penalty;
            break;
        }

        return (
          <ParticleSystem
            key={event.id}
            config={preset}
            event={event}
            position={new THREE.Vector3().fromArray(event.position as any)}
            qualityMode={qualityMode}
            autoStart={selectedEvent === event.id}
          />
        );
      })}

      {/* Helper objects for development */}
      {process.env.NODE_ENV === 'development' && qualityMode === 'ultra' && (
        <>
          <gridHelper args={[200, 50]} color="#333333" />
          <axesHelper args={[10]} />
        </>
      )}

      {/* Performance optimization components */}
      <AdaptiveDpr pixelated />
      <AdaptiveEvents />
      {qualityMode !== 'low' && <BakeShadows />}
    </>
  );
};

// Main Dashboard Component
export const Dashboard3D: React.FC<Dashboard3DProps> = ({
  width = 1200,
  height = 800,
  enableControls = true,
  qualityMode = 'high'
}) => {
  const [cameraPreset, setCameraPreset] = useState('default');
  const [showLeva, setShowLeva] = useState(process.env.NODE_ENV === 'development');
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const { currentSport } = useSportsStore();

  // Leva controls for development
  const {
    enableShadows,
    enablePostProcessing,
    fieldOfView,
    cameraHeight,
    particleQuality,
    showPerformanceStats
  } = useControls(
    '3D Settings',
    {
      enableShadows: { value: qualityMode !== 'low', render: showLeva },
      enablePostProcessing: { value: qualityMode === 'ultra', render: showLeva },
      fieldOfView: { value: 75, min: 20, max: 120, step: 5, render: showLeva },
      cameraHeight: { value: 50, min: 10, max: 200, step: 10, render: showLeva },
      particleQuality: {
        value: qualityMode,
        options: ['low', 'medium', 'high', 'ultra'],
        render: showLeva
      },
      showPerformanceStats: { value: true, render: showLeva }
    },
    [qualityMode, showLeva]
  );

  // Camera presets based on sport
  const getCameraPosition = () => {
    const positions = {
      MLB: [80, 40, 80],
      NFL: [100, 50, 100],
      NBA: [60, 30, 60],
      NCAA: [90, 45, 90]
    };
    return positions[currentSport] || positions.MLB;
  };

  // Canvas configuration based on quality mode
  const canvasConfig = {
    low: {
      antialias: false,
      powerPreference: 'default' as WebGLPowerPreference,
      pixelRatio: Math.min(window.devicePixelRatio, 1),
      shadowMap: false
    },
    medium: {
      antialias: true,
      powerPreference: 'default' as WebGLPowerPreference,
      pixelRatio: Math.min(window.devicePixelRatio, 1.5),
      shadowMap: true
    },
    high: {
      antialias: true,
      powerPreference: 'high-performance' as WebGLPowerPreference,
      pixelRatio: Math.min(window.devicePixelRatio, 2),
      shadowMap: true
    },
    ultra: {
      antialias: true,
      powerPreference: 'high-performance' as WebGLPowerPreference,
      pixelRatio: window.devicePixelRatio,
      shadowMap: true
    }
  };

  const config = canvasConfig[qualityMode];

  return (
    <div
      style={{
        width: '100%',
        height: '100%',
        minHeight: `${height}px`,
        position: 'relative',
        background: 'linear-gradient(135deg, #0a0a0a 0%, #1a1a1a 100%)',
        borderRadius: '20px',
        overflow: 'hidden'
      }}
    >
      <ErrorBoundary
        FallbackComponent={ErrorFallback}
        onReset={() => window.location.reload()}
      >
        <Canvas
          ref={canvasRef}
          shadows={config.shadowMap && enableShadows}
          dpr={config.pixelRatio}
          gl={{
            antialias: config.antialias,
            powerPreference: config.powerPreference,
            alpha: false,
            stencil: false,
            depth: true,
            logarithmicDepthBuffer: qualityMode === 'ultra'
          }}
          camera={{
            fov: fieldOfView,
            near: 0.1,
            far: 1000,
            position: getCameraPosition()
          }}
          style={{ width: '100%', height: '100%' }}
        >
          <Suspense fallback={<LoadingSpinner />}>
            {/* Camera */}
            <PerspectiveCamera
              makeDefault
              fov={fieldOfView}
              position={getCameraPosition()}
            />

            {/* Controls */}
            {enableControls && (
              <OrbitControls
                enablePan={true}
                enableZoom={true}
                enableRotate={true}
                minDistance={20}
                maxDistance={200}
                minPolarAngle={0}
                maxPolarAngle={Math.PI / 1.8}
                target={[0, 0, 0]}
                dampingFactor={0.05}
                enableDamping
              />
            )}

            {/* Main 3D Scene */}
            <Scene3D qualityMode={particleQuality as any} />

            {/* Performance Stats */}
            {showPerformanceStats && process.env.NODE_ENV === 'development' && (
              <Stats showPanel={0} className="stats" />
            )}

            {/* Preload assets */}
            <Preload all />
          </Suspense>
        </Canvas>

        {/* Development Controls */}
        {showLeva && (
          <Leva
            collapsed={false}
            oneLineLabels={true}
            fill={true}
            flat={true}
            theme={{
              colors: {
                elevation1: '#1a1a1a',
                elevation2: '#2a2a2a',
                elevation3: '#3a3a3a',
                accent1: '#FF4500',
                accent2: '#FFA500',
                accent3: '#FFD700',
                highlight1: '#FF6B35',
                highlight2: '#C41E3A',
                highlight3: '#FFD700'
              }
            }}
          />
        )}

        {/* Camera Preset Controls */}
        <div
          style={{
            position: 'absolute',
            top: '20px',
            left: '20px',
            display: 'flex',
            gap: '10px',
            flexWrap: 'wrap'
          }}
        >
          {['Overview', 'Field Level', 'Sideline', 'Endzone'].map((preset) => (
            <button
              key={preset}
              onClick={() => setCameraPreset(preset)}
              style={{
                padding: '8px 16px',
                background:
                  cameraPreset === preset
                    ? 'linear-gradient(135deg, #FF4500, #FF6B35)'
                    : 'rgba(255, 255, 255, 0.1)',
                border: '1px solid rgba(255, 69, 0, 0.3)',
                borderRadius: '20px',
                color: '#ffffff',
                fontSize: '12px',
                fontWeight: 600,
                cursor: 'pointer',
                transition: 'all 0.3s ease',
                backdropFilter: 'blur(10px)'
              }}
            >
              {preset}
            </button>
          ))}
        </div>

        {/* Quality Toggle */}
        <div
          style={{
            position: 'absolute',
            top: '20px',
            right: '20px',
            display: 'flex',
            gap: '5px'
          }}
        >
          {(['low', 'medium', 'high', 'ultra'] as const).map((quality) => (
            <button
              key={quality}
              onClick={() => {
                // Quality would be controlled by parent component
                console.log(`Switch to ${quality} quality`);
              }}
              style={{
                padding: '6px 12px',
                background:
                  qualityMode === quality
                    ? 'linear-gradient(135deg, #FF4500, #FF6B35)'
                    : 'rgba(255, 255, 255, 0.1)',
                border: '1px solid rgba(255, 69, 0, 0.3)',
                borderRadius: '15px',
                color: '#ffffff',
                fontSize: '10px',
                fontWeight: 600,
                cursor: 'pointer',
                transition: 'all 0.3s ease',
                backdropFilter: 'blur(10px)',
                textTransform: 'uppercase'
              }}
            >
              {quality}
            </button>
          ))}
        </div>

        {/* Connection Status */}
        <div
          style={{
            position: 'absolute',
            bottom: '20px',
            left: '20px',
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            padding: '8px 16px',
            background: 'rgba(0, 0, 0, 0.8)',
            borderRadius: '20px',
            backdropFilter: 'blur(10px)',
            border: '1px solid rgba(255, 69, 0, 0.3)',
            fontSize: '12px',
            color: '#ffffff'
          }}
        >
          <div
            style={{
              width: '8px',
              height: '8px',
              borderRadius: '50%',
              background: '#00FF41',
              boxShadow: '0 0 10px #00FF41'
            }}
          />
          <span>3D Engine Active</span>
        </div>
      </ErrorBoundary>

      {/* CSS for animations */}
      <style jsx>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }

        .stats {
          position: absolute !important;
          top: 0 !important;
          left: 0 !important;
          z-index: 100 !important;
        }
      `}</style>
    </div>
  );
};

export default Dashboard3D;