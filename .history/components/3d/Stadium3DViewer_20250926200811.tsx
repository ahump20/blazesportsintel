/**
 * Blaze Sports Intelligence - Stadium 3D Viewer Component
 * Championship Intelligence Platform - Interactive 3D Stadium Visualization
 * The Deep South's Sports Intelligence Hub
 */

'use client';

import React, { useRef, useEffect, useState, useCallback, useMemo } from 'react';
import { Canvas, useFrame, useThree, extend } from '@react-three/fiber';
import { 
  OrbitControls, 
  Text, 
  Sphere, 
  Box, 
  Plane,
  Line,
  Points,
  PointMaterial,
  useTexture,
  useGLTF,
  Environment,
  ContactShadows,
  Sky,
  Stars
} from '@react-three/drei';
import { EffectComposer, Bloom, ChromaticAberration, SSAO } from '@react-three/postprocessing';
import { BlendFunction } from 'postprocessing';
import * as THREE from 'three';
import { SportType, Stadium3D, HeatMapData } from '../../types/3d.types';
import { useSportsStore } from '../../lib/stores/sportsStore';
import { usePerformanceOptimizer } from '../../lib/utils/performance-optimizer';

// Stadium configuration interface
interface StadiumConfig {
  sport: SportType;
  stadiumId: string;
  showCrowd: boolean;
  showWeather: boolean;
  showLighting: boolean;
  showFieldMarkings: boolean;
  showSeating: boolean;
  showFacilities: boolean;
  enableInteractions: boolean;
  quality: 'low' | 'medium' | 'high' | 'ultra';
  cameraPresets: Array<{
    name: string;
    position: [number, number, number];
    target: [number, number, number];
    fov: number;
  }>;
}

// Stadium data interface
interface StadiumData {
  id: string;
  name: string;
  sport: SportType;
  capacity: number;
  dimensions: {
    length: number;
    width: number;
    height: number;
  };
  fieldDimensions: {
    length: number;
    width: number;
  };
  seating: {
    total: number;
    sections: Array<{
      name: string;
      capacity: number;
      priceCategory: string;
      color: string;
    }>;
  };
  facilities: Array<{
    name: string;
    type: string;
    position: [number, number, number];
    size: [number, number, number];
  }>;
  lighting: {
    floodlights: Array<{
      position: [number, number, number];
      intensity: number;
      color: string;
    }>;
  };
  weather: {
    type: 'clear' | 'cloudy' | 'rain' | 'snow';
    intensity: number;
  };
  atmosphere: {
    crowdDensity: number;
    noiseLevel: number;
    enthusiasm: number;
  };
}

// Stadium 3D Viewer props
interface Stadium3DViewerProps {
  sport: SportType;
  data: any;
  is3DInitialized: boolean;
  config?: Partial<StadiumConfig>;
  className?: string;
  onCameraChange?: (position: THREE.Vector3, target: THREE.Vector3) => void;
  onStadiumClick?: (stadiumId: string, position: THREE.Vector3) => void;
  onFacilityClick?: (facilityId: string, data: any) => void;
}

// Default stadium configuration
const DEFAULT_CONFIG: StadiumConfig = {
  sport: 'mlb',
  stadiumId: 'default',
  showCrowd: true,
  showWeather: true,
  showLighting: true,
  showFieldMarkings: true,
  showSeating: true,
  showFacilities: true,
  enableInteractions: true,
  quality: 'high',
  cameraPresets: [
    {
      name: 'Overview',
      position: [0, 100, 200],
      target: [0, 0, 0],
      fov: 50
    },
    {
      name: 'Field Level',
      position: [0, 5, 50],
      target: [0, 0, 0],
      fov: 60
    },
    {
      name: 'Press Box',
      position: [0, 80, 100],
      target: [0, 0, 0],
      fov: 45
    }
  ]
};

// Stadium data for different sports
const STADIUM_DATA: Record<SportType, StadiumData> = {
  mlb: {
    id: 'busch_stadium',
    name: 'Busch Stadium',
    sport: 'mlb',
    capacity: 45494,
    dimensions: { length: 200, width: 150, height: 60 },
    fieldDimensions: { length: 120, width: 80 },
    seating: {
      total: 45494,
      sections: [
        { name: 'Diamond Club', capacity: 500, priceCategory: 'premium', color: '#FFD700' },
        { name: 'Club Level', capacity: 2000, priceCategory: 'high', color: '#FFA500' },
        { name: 'Lower Bowl', capacity: 15000, priceCategory: 'medium', color: '#FF6B35' },
        { name: 'Upper Bowl', capacity: 15000, priceCategory: 'low', color: '#CC5500' },
        { name: 'Bleachers', capacity: 12994, priceCategory: 'low', color: '#8B3D00' }
      ]
    },
    facilities: [
      { name: 'Home Dugout', type: 'dugout', position: [-40, 0, 0], size: [20, 5, 10] },
      { name: 'Visitor Dugout', type: 'dugout', position: [40, 0, 0], size: [20, 5, 10] },
      { name: 'Bullpen', type: 'bullpen', position: [0, 0, 60], size: [30, 5, 15] },
      { name: 'Press Box', type: 'press', position: [0, 50, 0], size: [40, 10, 20] }
    ],
    lighting: {
      floodlights: [
        { position: [0, 45, 80], intensity: 1.0, color: '#FFFFFF' },
        { position: [0, 45, -80], intensity: 1.0, color: '#FFFFFF' },
        { position: [80, 45, 0], intensity: 0.8, color: '#FFFFFF' },
        { position: [-80, 45, 0], intensity: 0.8, color: '#FFFFFF' }
      ]
    },
    weather: { type: 'clear', intensity: 0.0 },
    atmosphere: { crowdDensity: 0.8, noiseLevel: 0.7, enthusiasm: 0.8 }
  },
  nfl: {
    id: 'nissan_stadium',
    name: 'Nissan Stadium',
    sport: 'nfl',
    capacity: 69143,
    dimensions: { length: 250, width: 180, height: 80 },
    fieldDimensions: { length: 120, width: 53.3 },
    seating: {
      total: 69143,
      sections: [
        { name: 'Club Seats', capacity: 8000, priceCategory: 'premium', color: '#FFD700' },
        { name: 'Lower Level', capacity: 25000, priceCategory: 'high', color: '#FFA500' },
        { name: 'Upper Level', capacity: 25000, priceCategory: 'medium', color: '#FF6B35' },
        { name: 'End Zone', capacity: 11143, priceCategory: 'low', color: '#CC5500' }
      ]
    },
    facilities: [
      { name: 'Home Locker Room', type: 'locker', position: [-60, 0, 0], size: [30, 10, 20] },
      { name: 'Visitor Locker Room', type: 'locker', position: [60, 0, 0], size: [30, 10, 20] },
      { name: 'Press Box', type: 'press', position: [0, 60, 0], size: [50, 15, 25] }
    ],
    lighting: {
      floodlights: [
        { position: [0, 60, 100], intensity: 1.2, color: '#FFFFFF' },
        { position: [0, 60, -100], intensity: 1.2, color: '#FFFFFF' },
        { position: [100, 60, 0], intensity: 1.0, color: '#FFFFFF' },
        { position: [-100, 60, 0], intensity: 1.0, color: '#FFFFFF' }
      ]
    },
    weather: { type: 'clear', intensity: 0.0 },
    atmosphere: { crowdDensity: 0.9, noiseLevel: 0.9, enthusiasm: 0.9 }
  },
  nba: {
    id: 'fedex_forum',
    name: 'FedEx Forum',
    sport: 'nba',
    capacity: 18119,
    dimensions: { length: 120, width: 100, height: 50 },
    fieldDimensions: { length: 94, width: 50 },
    seating: {
      total: 18119,
      sections: [
        { name: 'Courtside', capacity: 200, priceCategory: 'premium', color: '#FFD700' },
        { name: 'Lower Level', capacity: 6000, priceCategory: 'high', color: '#FFA500' },
        { name: 'Upper Level', capacity: 8000, priceCategory: 'medium', color: '#FF6B35' },
        { name: 'Balcony', capacity: 3919, priceCategory: 'low', color: '#CC5500' }
      ]
    },
    facilities: [
      { name: 'Home Locker Room', type: 'locker', position: [-30, 0, 0], size: [20, 8, 15] },
      { name: 'Visitor Locker Room', type: 'locker', position: [30, 0, 0], size: [20, 8, 15] },
      { name: 'Press Box', type: 'press', position: [0, 35, 0], size: [30, 8, 20] }
    ],
    lighting: {
      floodlights: [
        { position: [0, 40, 0], intensity: 1.5, color: '#FFFFFF' },
        { position: [0, 40, 50], intensity: 1.0, color: '#FFFFFF' },
        { position: [0, 40, -50], intensity: 1.0, color: '#FFFFFF' }
      ]
    },
    weather: { type: 'clear', intensity: 0.0 },
    atmosphere: { crowdDensity: 0.7, noiseLevel: 0.8, enthusiasm: 0.8 }
  },
  ncaa: {
    id: 'daryl_royal_stadium',
    name: 'Darrell K Royal Stadium',
    sport: 'ncaa',
    capacity: 100119,
    dimensions: { length: 300, width: 200, height: 100 },
    fieldDimensions: { length: 120, width: 53.3 },
    seating: {
      total: 100119,
      sections: [
        { name: 'Student Section', capacity: 15000, priceCategory: 'low', color: '#FF6B35' },
        { name: 'Alumni Section', capacity: 20000, priceCategory: 'medium', color: '#FFA500' },
        { name: 'Premium Seating', capacity: 5000, priceCategory: 'high', color: '#FFD700' },
        { name: 'General Admission', capacity: 60119, priceCategory: 'low', color: '#CC5500' }
      ]
    },
    facilities: [
      { name: 'Home Locker Room', type: 'locker', position: [-80, 0, 0], size: [40, 15, 25] },
      { name: 'Visitor Locker Room', type: 'locker', position: [80, 0, 0], size: [40, 15, 25] },
      { name: 'Press Box', type: 'press', position: [0, 80, 0], size: [60, 20, 30] }
    ],
    lighting: {
      floodlights: [
        { position: [0, 80, 120], intensity: 1.5, color: '#FFFFFF' },
        { position: [0, 80, -120], intensity: 1.5, color: '#FFFFFF' },
        { position: [120, 80, 0], intensity: 1.2, color: '#FFFFFF' },
        { position: [-120, 80, 0], intensity: 1.2, color: '#FFFFFF' }
      ]
    },
    weather: { type: 'clear', intensity: 0.0 },
    atmosphere: { crowdDensity: 0.95, noiseLevel: 0.95, enthusiasm: 0.95 }
  }
};

// Main Stadium 3D Viewer Component
export const Stadium3DViewer: React.FC<Stadium3DViewerProps> = ({
  sport,
  data,
  is3DInitialized,
  config: userConfig = {},
  className = '',
  onCameraChange,
  onStadiumClick,
  onFacilityClick
}) => {
  const config = { ...DEFAULT_CONFIG, ...userConfig };
  const { optimizePerformance } = usePerformanceOptimizer();
  
  // State management
  const [currentStadium, setCurrentStadium] = useState<StadiumData>(STADIUM_DATA[sport]);
  const [activeCameraPreset, setActiveCameraPreset] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [interactionMode, setInteractionMode] = useState<'explore' | 'analyze' | 'presentation'>('explore');
  const [selectedFacility, setSelectedFacility] = useState<string | null>(null);
  const [heatMapData, setHeatMapData] = useState<HeatMapData | null>(null);
  
  // Refs
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const controlsRef = useRef<any>(null);
  const sceneRef = useRef<THREE.Scene>(null);
  
  // Update stadium when sport changes
  useEffect(() => {
    setCurrentStadium(STADIUM_DATA[sport]);
    setActiveCameraPreset(0);
  }, [sport]);
  
  // Performance optimization
  useEffect(() => {
    if (is3DInitialized) {
      optimizePerformance();
    }
  }, [is3DInitialized, optimizePerformance]);
  
  // Handle camera preset change
  const handleCameraPresetChange = useCallback((presetIndex: number) => {
    setActiveCameraPreset(presetIndex);
    const preset = config.cameraPresets[presetIndex];
    if (preset && controlsRef.current) {
      controlsRef.current.setLookAt(
        preset.position[0], preset.position[1], preset.position[2],
        preset.target[0], preset.target[1], preset.target[2],
        true
      );
    }
  }, [config.cameraPresets]);
  
  // Handle facility click
  const handleFacilityClick = useCallback((facilityId: string, position: THREE.Vector3) => {
    setSelectedFacility(facilityId);
    onFacilityClick?.(facilityId, { position, stadium: currentStadium });
  }, [currentStadium, onFacilityClick]);
  
  // Generate heat map data
  const generateHeatMapData = useCallback((): HeatMapData => {
    const points = [];
    const fieldLength = currentStadium.fieldDimensions.length;
    const fieldWidth = currentStadium.fieldDimensions.width;
    
    // Generate random heat map points for demonstration
    for (let i = 0; i < 100; i++) {
      points.push({
        x: (Math.random() - 0.5) * fieldLength,
        y: (Math.random() - 0.5) * fieldWidth,
        z: 0,
        value: Math.random(),
        intensity: Math.random(),
        category: Math.random() > 0.5 ? 'offense' : 'defense',
        timestamp: new Date(),
        metadata: { player: `Player ${i + 1}` }
      });
    }
    
    return {
      id: `${sport}_heatmap`,
      sport,
      metric: 'player_movement',
      data: {
        points,
        bounds: {
          minX: -fieldLength / 2,
          maxX: fieldLength / 2,
          minY: -fieldWidth / 2,
          maxY: fieldWidth / 2,
          minZ: -5,
          maxZ: 5
        },
        statistics: {
          min: 0,
          max: 1,
          mean: 0.5,
          median: 0.5,
          stdDev: 0.3,
          distribution: []
        }
      },
      visualization: {
        colorScale: {
          type: 'linear' as const,
          colors: [
            { value: 0, color: new THREE.Color(0x0000FF) },
            { value: 0.5, color: new THREE.Color(0x00FF00) },
            { value: 1, color: new THREE.Color(0xFF0000) }
          ],
          interpolation: 'smooth' as const
        },
        rendering: {
          method: 'points' as const,
          resolution: 64,
          smoothing: 0.5,
          transparency: 0.7,
          blending: THREE.AdditiveBlending
        },
        interaction: {
          selectable: true,
          hoverable: true,
          tooltip: true,
          filtering: {
            enabled: true,
            ranges: []
          }
        },
        animation: {
          enabled: true,
          type: 'temporal' as const,
          speed: 1.0,
          loop: true
        }
      },
      overlay: {
        fieldLines: true,
        grid: true,
        legend: {
          enabled: true,
          position: 'top-right' as const,
          scale: 1.0
        },
        statistics: {
          enabled: true,
          metrics: ['intensity', 'frequency'],
          position: new THREE.Vector3(0, 0, 0)
        }
      }
    };
  }, [sport, currentStadium]);
  
  // Update heat map data
  useEffect(() => {
    if (data && data.heatMap) {
      setHeatMapData(generateHeatMapData());
    }
  }, [data, generateHeatMapData]);
  
  // Stadium Field Component
  const StadiumField: React.FC = () => {
    const fieldRef = useRef<THREE.Mesh>(null);
    
    useFrame((state) => {
      if (fieldRef.current) {
        // Subtle field animation
        fieldRef.current.rotation.y = Math.sin(state.clock.elapsedTime * 0.1) * 0.01;
      }
    });
    
    return (
      <group>
        {/* Field Surface */}
        <Plane
          ref={fieldRef}
          args={[currentStadium.fieldDimensions.length, currentStadium.fieldDimensions.width]}
          rotation={[-Math.PI / 2, 0, 0]}
          position={[0, 0, 0]}
        >
          <meshStandardMaterial
            color={sport === 'mlb' ? '#228B22' : sport === 'nfl' ? '#228B22' : '#FFD700'}
            roughness={0.8}
            metalness={0.1}
          />
        </Plane>
        
        {/* Field Markings */}
        {config.showFieldMarkings && (
          <FieldMarkings sport={sport} dimensions={currentStadium.fieldDimensions} />
        )}
        
        {/* Heat Map Overlay */}
        {heatMapData && (
          <HeatMapOverlay data={heatMapData} />
        )}
      </group>
    );
  };
  
  // Stadium Structure Component
  const StadiumStructure: React.FC = () => {
    return (
      <group>
        {/* Seating Bowl */}
        {config.showSeating && (
          <SeatingBowl stadium={currentStadium} />
        )}
        
        {/* Facilities */}
        {config.showFacilities && (
          <StadiumFacilities 
            facilities={currentStadium.facilities}
            onFacilityClick={handleFacilityClick}
            selectedFacility={selectedFacility}
          />
        )}
        
        {/* Roof Structure */}
        <RoofStructure stadium={currentStadium} />
      </group>
    );
  };
  
  // Lighting System Component
  const LightingSystem: React.FC = () => {
    return (
      <group>
        {/* Ambient Light */}
        <ambientLight intensity={0.3} color="#FFFFFF" />
        
        {/* Stadium Floodlights */}
        {config.showLighting && currentStadium.lighting.floodlights.map((light, index) => (
          <pointLight
            key={index}
            position={[light.position[0], light.position[1], light.position[2]]}
            intensity={light.intensity}
            color={light.color}
            distance={200}
            decay={2}
            castShadow
          />
        ))}
        
        {/* Directional Light for Sun */}
        <directionalLight
          position={[100, 100, 50]}
          intensity={0.8}
          color="#FFE4B5"
          castShadow
          shadow-mapSize={[2048, 2048]}
          shadow-camera-far={500}
          shadow-camera-left={-100}
          shadow-camera-right={100}
          shadow-camera-top={100}
          shadow-camera-bottom={-100}
        />
      </group>
    );
  };
  
  // Weather Effects Component
  const WeatherEffects: React.FC = () => {
    if (!config.showWeather) return null;
    
    const { weather } = currentStadium;
    
    switch (weather.type) {
      case 'rain':
        return <RainEffect intensity={weather.intensity} />;
      case 'snow':
        return <SnowEffect intensity={weather.intensity} />;
      case 'cloudy':
        return <CloudyEffect intensity={weather.intensity} />;
      default:
        return <ClearSkyEffect />;
    }
  };
  
  // Crowd Animation Component
  const CrowdAnimation: React.FC = () => {
    if (!config.showCrowd) return null;
    
    return (
      <group>
        {/* Crowd particles for atmosphere */}
        <Points limit={1000}>
          <PointMaterial
            size={0.5}
            transparent
            opacity={0.6}
            color="#FF6B35"
            blending={THREE.AdditiveBlending}
          />
        </Points>
      </group>
    );
  };
  
  // Main render
  return (
    <div className={`stadium-3d-viewer ${className}`}>
      {/* Controls Panel */}
      <div className="stadium-controls">
        <div className="control-group">
          <h4>Camera Presets</h4>
          {config.cameraPresets.map((preset, index) => (
            <button
              key={index}
              className={`preset-button ${activeCameraPreset === index ? 'active' : ''}`}
              onClick={() => handleCameraPresetChange(index)}
            >
              {preset.name}
            </button>
          ))}
        </div>
        
        <div className="control-group">
          <h4>Display Options</h4>
          <label>
            <input
              type="checkbox"
              checked={config.showCrowd}
              onChange={(e) => {
                // Update config
              }}
            />
            Show Crowd
          </label>
          <label>
            <input
              type="checkbox"
              checked={config.showWeather}
              onChange={(e) => {
                // Update config
              }}
            />
            Show Weather
          </label>
          <label>
            <input
              type="checkbox"
              checked={config.showFieldMarkings}
              onChange={(e) => {
                // Update config
              }}
            />
            Field Markings
          </label>
        </div>
        
        <div className="control-group">
          <h4>Interaction Mode</h4>
          <select
            value={interactionMode}
            onChange={(e) => setInteractionMode(e.target.value as any)}
          >
            <option value="explore">Explore</option>
            <option value="analyze">Analyze</option>
            <option value="presentation">Presentation</option>
          </select>
        </div>
      </div>
      
      {/* 3D Canvas */}
      <div className="stadium-canvas">
        <Canvas
          ref={canvasRef}
          camera={{
            position: config.cameraPresets[activeCameraPreset].position,
            fov: config.cameraPresets[activeCameraPreset].fov
          }}
          gl={{ 
            antialias: true, 
            alpha: true,
            powerPreference: "high-performance"
          }}
          shadows
          performance={{ min: 0.5 }}
        >
          {/* Scene Setup */}
          <color attach="background" args={['#87CEEB']} />
          <fog attach="fog" args={['#87CEEB', 100, 1000]} />
          
          {/* Lighting */}
          <LightingSystem />
          
          {/* Environment */}
          <Environment preset="sunset" />
          <Sky
            distance={450000}
            sunPosition={[0, 1, 0]}
            inclination={0}
            azimuth={0.25}
          />
          <Stars
            radius={300}
            depth={60}
            count={20000}
            factor={7}
            saturation={0}
            fade
          />
          
          {/* Stadium Components */}
          <StadiumField />
          <StadiumStructure />
          
          {/* Effects */}
          <WeatherEffects />
          <CrowdAnimation />
          
          {/* Shadows */}
          <ContactShadows
            position={[0, -0.1, 0]}
            opacity={0.25}
            scale={200}
            blur={1.5}
            far={50}
          />
          
          {/* Controls */}
          <OrbitControls
            ref={controlsRef}
            enablePan={true}
            enableZoom={true}
            enableRotate={true}
            minDistance={20}
            maxDistance={500}
            minPolarAngle={Math.PI / 6}
            maxPolarAngle={Math.PI - Math.PI / 6}
            onChange={(e) => {
              if (e?.target && onCameraChange) {
                const position = e.target.object.position;
                const target = e.target.target;
                onCameraChange(position, target);
              }
            }}
          />
          
          {/* Post-processing Effects */}
          <EffectComposer>
            <SSAO
              blendFunction={BlendFunction.MULTIPLY}
              samples={31}
              rings={4}
              distanceThreshold={0.4}
              distanceFalloff={0.0}
              rangeThreshold={0.0005}
              rangeFalloff={0.0001}
              luminanceInfluence={0.9}
              radius={20}
              scale={0.5}
              bias={0.5}
            />
            <Bloom
              intensity={0.5}
              luminanceThreshold={0.1}
              luminanceSmoothing={0.9}
            />
            <ChromaticAberration
              offset={[0.001, 0.001]}
            />
          </EffectComposer>
        </Canvas>
      </div>
      
      {/* Stadium Information Panel */}
      <div className="stadium-info">
        <h3>{currentStadium.name}</h3>
        <div className="stadium-details">
          <div className="detail">
            <span className="label">Sport:</span>
            <span className="value">{currentStadium.sport.toUpperCase()}</span>
          </div>
          <div className="detail">
            <span className="label">Capacity:</span>
            <span className="value">{currentStadium.capacity.toLocaleString()}</span>
          </div>
          <div className="detail">
            <span className="label">Field Size:</span>
            <span className="value">
              {currentStadium.fieldDimensions.length} × {currentStadium.fieldDimensions.width}
            </span>
          </div>
          <div className="detail">
            <span className="label">Atmosphere:</span>
            <span className="value">
              {Math.round(currentStadium.atmosphere.enthusiasm * 100)}% Enthusiasm
            </span>
          </div>
        </div>
        
        {selectedFacility && (
          <div className="facility-info">
            <h4>Selected Facility</h4>
            <p>Facility ID: {selectedFacility}</p>
          </div>
        )}
      </div>
      
      {/* Loading Overlay */}
      {isLoading && (
        <div className="loading-overlay">
          <div className="loading-spinner"></div>
          <div className="loading-text">Loading Stadium...</div>
        </div>
      )}
    </div>
  );
};

// Field Markings Component
const FieldMarkings: React.FC<{ sport: SportType; dimensions: { length: number; width: number } }> = ({ 
  sport, 
  dimensions 
}) => {
  const markings = useMemo(() => {
    switch (sport) {
      case 'mlb':
        return (
          <group>
            {/* Baseball diamond */}
            <Line
              points={[
                [0, 0, 0],
                [0, 0, dimensions.width / 2],
                [dimensions.length / 2, 0, dimensions.width / 2],
                [0, 0, 0]
              ]}
              color="#FFFFFF"
              lineWidth={2}
            />
            {/* Bases */}
            {[
              [0, 0, 0],
              [0, 0, dimensions.width / 2],
              [dimensions.length / 2, 0, dimensions.width / 2],
              [dimensions.length / 2, 0, 0]
            ].map((position, index) => (
              <Box key={index} position={position} args={[2, 0.1, 2]}>
                <meshBasicMaterial color="#FFFFFF" />
              </Box>
            ))}
          </group>
        );
        
      case 'nfl':
      case 'ncaa':
        return (
          <group>
            {/* Football field lines */}
            <Line
              points={[
                [-dimensions.length / 2, 0, -dimensions.width / 2],
                [dimensions.length / 2, 0, -dimensions.width / 2],
                [dimensions.length / 2, 0, dimensions.width / 2],
                [-dimensions.length / 2, 0, dimensions.width / 2],
                [-dimensions.length / 2, 0, -dimensions.width / 2]
              ]}
              color="#FFFFFF"
              lineWidth={2}
            />
            {/* Yard lines */}
            {Array.from({ length: 11 }, (_, i) => (
              <Line
                key={i}
                points={[
                  [-dimensions.length / 2 + (i * dimensions.length / 10), 0, -dimensions.width / 2],
                  [-dimensions.length / 2 + (i * dimensions.length / 10), 0, dimensions.width / 2]
                ]}
                color="#FFFFFF"
                lineWidth={1}
              />
            ))}
          </group>
        );
        
      case 'nba':
        return (
          <group>
            {/* Basketball court lines */}
            <Line
              points={[
                [-dimensions.length / 2, 0, -dimensions.width / 2],
                [dimensions.length / 2, 0, -dimensions.width / 2],
                [dimensions.length / 2, 0, dimensions.width / 2],
                [-dimensions.length / 2, 0, dimensions.width / 2],
                [-dimensions.length / 2, 0, -dimensions.width / 2]
              ]}
              color="#FFFFFF"
              lineWidth={2}
            />
            {/* Center line */}
            <Line
              points={[
                [0, 0, -dimensions.width / 2],
                [0, 0, dimensions.width / 2]
              ]}
              color="#FFFFFF"
              lineWidth={2}
            />
            {/* Free throw lines */}
            <Line
              points={[
                [-dimensions.length / 4, 0, -dimensions.width / 2],
                [-dimensions.length / 4, 0, dimensions.width / 2]
              ]}
              color="#FFFFFF"
              lineWidth={2}
            />
            <Line
              points={[
                [dimensions.length / 4, 0, -dimensions.width / 2],
                [dimensions.length / 4, 0, dimensions.width / 2]
              ]}
              color="#FFFFFF"
              lineWidth={2}
            />
          </group>
        );
        
      default:
        return null;
    }
  }, [sport, dimensions]);
  
  return markings;
};

// Seating Bowl Component
const SeatingBowl: React.FC<{ stadium: StadiumData }> = ({ stadium }) => {
  return (
    <group>
      {stadium.seating.sections.map((section, index) => (
        <group key={index}>
          {/* Seating section geometry */}
          <Box
            position={[0, 10 + index * 5, 0]}
            args={[stadium.dimensions.length * 0.8, 3, stadium.dimensions.width * 0.8]}
          >
            <meshStandardMaterial
              color={section.color}
              roughness={0.7}
              metalness={0.1}
            />
          </Box>
          
          {/* Section label */}
          <Text
            position={[0, 12 + index * 5, stadium.dimensions.width * 0.4]}
            fontSize={2}
            color="#FFFFFF"
            anchorX="center"
            anchorY="middle"
          >
            {section.name}
          </Text>
        </group>
      ))}
    </group>
  );
};

// Stadium Facilities Component
const StadiumFacilities: React.FC<{
  facilities: Array<{
    name: string;
    type: string;
    position: [number, number, number];
    size: [number, number, number];
  }>;
  onFacilityClick: (facilityId: string, position: THREE.Vector3) => void;
  selectedFacility: string | null;
}> = ({ facilities, onFacilityClick, selectedFacility }) => {
  return (
    <group>
      {facilities.map((facility, index) => (
        <group key={index}>
          <Box
            position={facility.position}
            args={facility.size}
            onClick={(e) => {
              e.stopPropagation();
              onFacilityClick(facility.name, new THREE.Vector3(...facility.position));
            }}
          >
            <meshStandardMaterial
              color={selectedFacility === facility.name ? '#FFD700' : '#666666'}
              roughness={0.5}
              metalness={0.3}
            />
          </Box>
          
          {/* Facility label */}
          <Text
            position={[facility.position[0], facility.position[1] + facility.size[1] / 2 + 2, facility.position[2]]}
            fontSize={1.5}
            color="#FFFFFF"
            anchorX="center"
            anchorY="middle"
          >
            {facility.name}
          </Text>
        </group>
      ))}
    </group>
  );
};

// Roof Structure Component
const RoofStructure: React.FC<{ stadium: StadiumData }> = ({ stadium }) => {
  return (
    <group>
      {/* Main roof structure */}
      <Box
        position={[0, stadium.dimensions.height - 5, 0]}
        args={[stadium.dimensions.length, 5, stadium.dimensions.width]}
      >
        <meshStandardMaterial
          color="#CCCCCC"
          roughness={0.8}
          metalness={0.2}
          transparent
          opacity={0.7}
        />
      </Box>
      
      {/* Support columns */}
      {Array.from({ length: 8 }, (_, i) => {
        const angle = (i / 8) * Math.PI * 2;
        const radius = Math.min(stadium.dimensions.length, stadium.dimensions.width) / 2;
        const x = Math.cos(angle) * radius;
        const z = Math.sin(angle) * radius;
        
        return (
          <Box
            key={i}
            position={[x, stadium.dimensions.height / 2, z]}
            args={[2, stadium.dimensions.height, 2]}
          >
            <meshStandardMaterial
              color="#888888"
              roughness={0.6}
              metalness={0.4}
            />
          </Box>
        );
      })}
    </group>
  );
};

// Heat Map Overlay Component
const HeatMapOverlay: React.FC<{ data: HeatMapData }> = ({ data }) => {
  const points = useMemo(() => {
    return data.data.points.map(point => new THREE.Vector3(point.x, point.y, point.z));
  }, [data.data.points]);
  
  const colors = useMemo(() => {
    return data.data.points.map(point => {
      const intensity = point.intensity;
      const color = new THREE.Color();
      color.setHSL(0.7 - intensity * 0.7, 1, 0.5);
      return color;
    });
  }, [data.data.points]);
  
  return (
    <Points>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          count={points.length}
          array={new Float32Array(points.flatMap(p => [p.x, p.y, p.z]))}
          itemSize={3}
        />
        <bufferAttribute
          attach="attributes-color"
          count={colors.length}
          array={new Float32Array(colors.flatMap(c => [c.r, c.g, c.b]))}
          itemSize={3}
        />
      </bufferGeometry>
      <pointsMaterial
        size={2}
        transparent
        opacity={0.7}
        vertexColors
        blending={THREE.AdditiveBlending}
      />
    </Points>
  );
};

// Weather Effect Components
const RainEffect: React.FC<{ intensity: number }> = ({ intensity }) => (
  <group>
    <Points limit={1000}>
      <PointMaterial
        size={0.1}
        transparent
        opacity={0.6 * intensity}
        color="#87CEEB"
        blending={THREE.AdditiveBlending}
      />
    </Points>
  </group>
);

const SnowEffect: React.FC<{ intensity: number }> = ({ intensity }) => (
  <group>
    <Points limit={500}>
      <PointMaterial
        size={0.2}
        transparent
        opacity={0.8 * intensity}
        color="#FFFFFF"
        blending={THREE.AdditiveBlending}
      />
    </Points>
  </group>
);

const CloudyEffect: React.FC<{ intensity: number }> = ({ intensity }) => (
  <group>
    {/* Cloud particles */}
    <Points limit={200}>
      <PointMaterial
        size={5}
        transparent
        opacity={0.3 * intensity}
        color="#CCCCCC"
        blending={THREE.NormalBlending}
      />
    </Points>
  </group>
);

const ClearSkyEffect: React.FC = () => (
  <group>
    {/* Clear sky - no additional effects */}
  </group>
);

export default Stadium3DViewer;
