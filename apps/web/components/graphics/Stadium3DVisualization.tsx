/**
 * =============================================================================
 * STADIUM 3D VISUALIZATION COMPONENT
 * =============================================================================
 * Interactive 3D stadium visualization with real-time data overlays
 * Integrated with Blaze Graphics Engine for championship-tier visuals
 * =============================================================================
 */

import React, { useEffect, useRef, useState, useCallback } from 'react';
import { getBlazeGraphicsEngine, BlazeGraphicsEngine, GraphicsConfig, PerformanceMetrics } from '../../lib/graphics/BlazeGraphicsEngine';
import * as THREE from 'three';

interface Stadium3DVisualizationProps {
  team: 'cardinals' | 'titans' | 'grizzlies' | 'longhorns';
  showHeatMap?: boolean;
  showParticles?: boolean;
  enableAR?: boolean;
  enableVR?: boolean;
  quality?: GraphicsConfig['quality'];
  className?: string;
  onStatsUpdate?: (stats: PerformanceMetrics) => void;
}

export const Stadium3DVisualization: React.FC<Stadium3DVisualizationProps> = ({
  team = 'cardinals',
  showHeatMap = true,
  showParticles = true,
  enableAR = false,
  enableVR = false,
  quality = 'adaptive',
  className = '',
  onStatsUpdate
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const engineRef = useRef<BlazeGraphicsEngine | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [stats, setStats] = useState<PerformanceMetrics | null>(null);
  const [isARMode, setIsARMode] = useState(false);
  const [isVRMode, setIsVRMode] = useState(false);

  // Team-specific configurations
  const teamConfig = {
    cardinals: {
      primaryColor: new THREE.Color(0xc41e3a), // Cardinal red
      secondaryColor: new THREE.Color(0xfedb00), // Gold
      stadiumModel: '/models/busch-stadium.glb',
      particleTexture: '/textures/baseball.png',
      environmentMap: '/textures/stadium-env.hdr'
    },
    titans: {
      primaryColor: new THREE.Color(0x002244), // Navy
      secondaryColor: new THREE.Color(0x4b92db), // Light blue
      stadiumModel: '/models/nissan-stadium.glb',
      particleTexture: '/textures/football.png',
      environmentMap: '/textures/stadium-env.hdr'
    },
    grizzlies: {
      primaryColor: new THREE.Color(0x5d76a9), // Memphis blue
      secondaryColor: new THREE.Color(0xf5b112), // Gold
      stadiumModel: '/models/fedex-forum.glb',
      particleTexture: '/textures/basketball.png',
      environmentMap: '/textures/arena-env.hdr'
    },
    longhorns: {
      primaryColor: new THREE.Color(0xbf5700), // Burnt orange
      secondaryColor: new THREE.Color(0xffffff), // White
      stadiumModel: '/models/dkr-stadium.glb',
      particleTexture: '/textures/longhorn.png',
      environmentMap: '/textures/stadium-env.hdr'
    }
  };

  // Initialize graphics engine
  useEffect(() => {
    if (!containerRef.current) return;

    const initEngine = async () => {
      try {
        setIsLoading(true);
        setError(null);

        // Create graphics engine
        const config: Partial<GraphicsConfig> = {
          quality,
          enableAR,
          enableVR,
          targetFPS: 60,
          enablePostProcessing: true,
          shadows: true,
          antialias: true
        };

        const engine = getBlazeGraphicsEngine(config);
        engineRef.current = engine;

        // Initialize engine
        await engine.initialize(containerRef.current!);

        // Load team-specific assets
        await loadTeamAssets(engine);

        // Setup scene elements
        if (showParticles) {
          createTeamParticles(engine);
        }

        if (showHeatMap) {
          createFieldHeatMap(engine);
        }

        // Start rendering
        engine.start();

        // Setup stats monitoring
        if (onStatsUpdate) {
          const statsInterval = setInterval(() => {
            const currentStats = engine.getStats();
            setStats(currentStats);
            onStatsUpdate(currentStats);
          }, 1000);

          return () => clearInterval(statsInterval);
        }

        setIsLoading(false);
        console.log(`🔥 3D Stadium visualization initialized for ${team}`);

      } catch (err) {
        console.error('Failed to initialize 3D visualization:', err);
        setError(err instanceof Error ? err.message : 'Initialization failed');
        setIsLoading(false);
      }
    };

    initEngine();

    return () => {
      if (engineRef.current) {
        engineRef.current.stop();
        engineRef.current.dispose();
      }
    };
  }, [team, quality, enableAR, enableVR, showParticles, showHeatMap]);

  // Load team-specific stadium and assets
  const loadTeamAssets = async (engine: BlazeGraphicsEngine) => {
    const config = teamConfig[team];

    try {
      // Load stadium model (using placeholder geometry for now)
      const stadiumGeometry = createPlaceholderStadium(config);

      // In production, this would load the actual GLTF model:
      // await engine.loadStadiumModel(config.stadiumModel);

    } catch (err) {
      console.error('Error loading team assets:', err);
    }
  };

  // Create placeholder stadium geometry
  const createPlaceholderStadium = (config: typeof teamConfig.cardinals) => {
    // This is a simplified stadium representation
    // In production, use actual 3D models

    const scene = (engineRef.current as any).scene;

    // Stadium bowl
    const bowlGeometry = new THREE.CylinderGeometry(40, 50, 20, 32, 1, true);
    const bowlMaterial = new THREE.MeshStandardMaterial({
      color: config.primaryColor,
      roughness: 0.7,
      metalness: 0.3
    });
    const bowl = new THREE.Mesh(bowlGeometry, bowlMaterial);
    bowl.position.y = 10;
    scene.add(bowl);

    // Field/Court
    const fieldGeometry = new THREE.PlaneGeometry(60, 40);
    const fieldMaterial = new THREE.MeshStandardMaterial({
      color: team === 'grizzlies' ? 0x8b4513 : 0x00ff00, // Brown for basketball, green for others
      roughness: 0.9
    });
    const field = new THREE.Mesh(fieldGeometry, fieldMaterial);
    field.rotation.x = -Math.PI / 2;
    field.position.y = 0.1;
    scene.add(field);

    // Stadium lights
    for (let i = 0; i < 4; i++) {
      const angle = (i / 4) * Math.PI * 2;
      const lightPole = new THREE.CylinderGeometry(0.5, 0.5, 30);
      const poleMaterial = new THREE.MeshStandardMaterial({ color: 0x333333 });
      const pole = new THREE.Mesh(lightPole, poleMaterial);
      pole.position.set(
        Math.cos(angle) * 45,
        15,
        Math.sin(angle) * 45
      );
      scene.add(pole);

      // Stadium light
      const light = new THREE.SpotLight(0xffffff, 2, 100, Math.PI / 4, 0.5);
      light.position.copy(pole.position);
      light.position.y = 30;
      light.target.position.set(0, 0, 0);
      light.castShadow = true;
      scene.add(light);
      scene.add(light.target);
    }

    // Team logo plane
    const logoGeometry = new THREE.PlaneGeometry(10, 10);
    const logoMaterial = new THREE.MeshStandardMaterial({
      color: config.secondaryColor,
      emissive: config.primaryColor,
      emissiveIntensity: 0.3
    });
    const logo = new THREE.Mesh(logoGeometry, logoMaterial);
    logo.rotation.x = -Math.PI / 2;
    logo.position.y = 0.2;
    scene.add(logo);

    return { bowl, field, logo };
  };

  // Create team-colored particle effects
  const createTeamParticles = (engine: BlazeGraphicsEngine) => {
    const config = teamConfig[team];

    // Victory particles
    engine.createParticleSystem('victory', 500, {
      color: config.primaryColor,
      size: 2,
      sizeVariation: 1,
      velocity: new THREE.Vector3(0, 5, 0),
      acceleration: new THREE.Vector3(0, -2, 0),
      lifetime: 10
    });

    // Ambient particles
    engine.createParticleSystem('ambient', 200, {
      color: config.secondaryColor,
      size: 1,
      sizeVariation: 0.5,
      velocity: new THREE.Vector3(0, 0.5, 0),
      acceleration: new THREE.Vector3(0, 0, 0),
      lifetime: 15
    });
  };

  // Create field heat map
  const createFieldHeatMap = (engine: BlazeGraphicsEngine) => {
    // Generate sample heat map data
    const heatMapData = [];
    for (let i = 0; i < 100; i++) {
      heatMapData.push({
        x: Math.random() * 60 - 30,
        y: Math.random() * 40 - 20,
        intensity: Math.random()
      });
    }

    engine.createHeatMap(heatMapData, 60, 40);
  };

  // Handle AR mode
  const handleARToggle = useCallback(async () => {
    if (!engineRef.current) return;

    if (!isARMode) {
      await engineRef.current.enterAR();
      setIsARMode(true);
    } else {
      // Exit AR (would need to implement exit method)
      setIsARMode(false);
    }
  }, [isARMode]);

  // Handle VR mode
  const handleVRToggle = useCallback(async () => {
    if (!engineRef.current) return;

    if (!isVRMode) {
      await engineRef.current.enterVR();
      setIsVRMode(true);
    } else {
      // Exit VR (would need to implement exit method)
      setIsVRMode(false);
    }
  }, [isVRMode]);

  // Handle quality change
  const handleQualityChange = (newQuality: GraphicsConfig['quality']) => {
    if (engineRef.current) {
      engineRef.current.setQuality(newQuality);
    }
  };

  // Handle screenshot
  const handleScreenshot = () => {
    if (engineRef.current) {
      const dataUrl = engineRef.current.takeScreenshot();

      // Download screenshot
      const link = document.createElement('a');
      link.download = `blaze-stadium-${team}-${Date.now()}.png`;
      link.href = dataUrl;
      link.click();
    }
  };

  return (
    <div className={`relative w-full h-full ${className}`}>
      {/* 3D Container */}
      <div
        ref={containerRef}
        className="w-full h-full bg-gray-900"
        style={{ minHeight: '500px' }}
      />

      {/* Loading Overlay */}
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-75 z-20">
          <div className="text-center">
            <div className="w-16 h-16 border-4 border-orange-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
            <p className="text-white text-lg">Loading Stadium...</p>
          </div>
        </div>
      )}

      {/* Error Overlay */}
      {error && (
        <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-75 z-20">
          <div className="text-center p-6 bg-red-900 rounded-lg">
            <p className="text-white text-lg mb-2">Error Loading 3D View</p>
            <p className="text-gray-300 text-sm">{error}</p>
          </div>
        </div>
      )}

      {/* Controls Overlay */}
      {!isLoading && !error && (
        <div className="absolute bottom-4 left-4 right-4 flex justify-between items-end z-10">
          {/* Left Controls */}
          <div className="bg-black bg-opacity-75 rounded-lg p-3 space-y-2">
            <div className="text-white text-sm mb-2">Camera Controls</div>
            <div className="flex gap-2">
              <button className="p-2 bg-gray-800 hover:bg-gray-700 rounded text-white transition-colors">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>
              <button className="p-2 bg-gray-800 hover:bg-gray-700 rounded text-white transition-colors">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
              </button>
              <button className="p-2 bg-gray-800 hover:bg-gray-700 rounded text-white transition-colors">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 10l-6-6-6 6" />
                </svg>
              </button>
              <button className="p-2 bg-gray-800 hover:bg-gray-700 rounded text-white transition-colors">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </button>
              <button
                onClick={() => {
                  if (engineRef.current) {
                    // Reset camera position
                    const camera = (engineRef.current as any).camera;
                    camera.position.set(0, 10, 30);
                    camera.lookAt(0, 0, 0);
                  }
                }}
                className="p-2 bg-gray-800 hover:bg-gray-700 rounded text-white transition-colors"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
              </button>
            </div>
          </div>

          {/* Center - Performance Stats */}
          {stats && (
            <div className="bg-black bg-opacity-75 rounded-lg p-3 text-white">
              <div className="flex gap-4 text-sm">
                <div>
                  <span className="text-gray-400">FPS:</span>
                  <span className={`ml-1 font-mono ${stats.fps >= 55 ? 'text-green-400' : stats.fps >= 30 ? 'text-yellow-400' : 'text-red-400'}`}>
                    {Math.round(stats.fps)}
                  </span>
                </div>
                <div>
                  <span className="text-gray-400">Draw Calls:</span>
                  <span className="ml-1 font-mono">{stats.drawCalls}</span>
                </div>
                <div>
                  <span className="text-gray-400">Triangles:</span>
                  <span className="ml-1 font-mono">{(stats.triangles / 1000).toFixed(1)}K</span>
                </div>
                <div>
                  <span className="text-gray-400">Quality:</span>
                  <span className="ml-1 capitalize">{stats.qualityLevel}</span>
                </div>
              </div>
            </div>
          )}

          {/* Right Controls */}
          <div className="bg-black bg-opacity-75 rounded-lg p-3 space-y-2">
            <div className="flex gap-2">
              {/* Quality Selector */}
              <select
                onChange={(e) => handleQualityChange(e.target.value as GraphicsConfig['quality'])}
                className="px-3 py-1 bg-gray-800 text-white rounded text-sm"
                defaultValue={quality}
              >
                <option value="adaptive">Adaptive</option>
                <option value="ultra">Ultra</option>
                <option value="high">High</option>
                <option value="medium">Medium</option>
                <option value="low">Low</option>
              </select>

              {/* Screenshot Button */}
              <button
                onClick={handleScreenshot}
                className="p-2 bg-blue-600 hover:bg-blue-700 rounded text-white transition-colors"
                title="Take Screenshot"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </button>

              {/* AR Button */}
              {enableAR && (
                <button
                  onClick={handleARToggle}
                  className={`p-2 rounded text-white transition-colors ${
                    isARMode ? 'bg-green-600 hover:bg-green-700' : 'bg-gray-800 hover:bg-gray-700'
                  }`}
                  title="Toggle AR Mode"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                </button>
              )}

              {/* VR Button */}
              {enableVR && (
                <button
                  onClick={handleVRToggle}
                  className={`p-2 rounded text-white transition-colors ${
                    isVRMode ? 'bg-green-600 hover:bg-green-700' : 'bg-gray-800 hover:bg-gray-700'
                  }`}
                  title="Toggle VR Mode"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                  </svg>
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Team Badge */}
      <div className="absolute top-4 left-4 bg-black bg-opacity-75 rounded-lg p-3 z-10">
        <div className="flex items-center gap-3">
          <div className="text-3xl">
            {team === 'cardinals' && '🔴'}
            {team === 'titans' && '⚔️'}
            {team === 'grizzlies' && '🐻'}
            {team === 'longhorns' && '🤘'}
          </div>
          <div className="text-white">
            <div className="font-bold capitalize">{team}</div>
            <div className="text-xs text-gray-400">3D Stadium View</div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Stadium3DVisualization;