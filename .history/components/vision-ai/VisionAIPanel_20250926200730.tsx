/**
 * Blaze Sports Intelligence - Vision AI Panel Component
 * Championship Intelligence Platform - Computer Vision Interface
 * The Deep South's Sports Intelligence Hub
 */

'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useVisionAI } from '../../hooks/useVisionAI';
import { 
  VisionAIMode, 
  PoseMetrics, 
  BiomechanicalAnalysis, 
  CharacterAssessment 
} from '../../types/sports.types';

// Vision AI Panel props interface
interface VisionAIPanelProps {
  isActive: boolean;
  mode: VisionAIMode;
  metrics: PoseMetrics;
  onActivate: () => void;
  onStop: () => void;
  onModeChange: (mode: VisionAIMode) => void;
  className?: string;
  showAdvancedMetrics?: boolean;
  enableRecording?: boolean;
  enableAnalysis?: boolean;
}

// Panel configuration interface
interface PanelConfig {
  showVideoFeed: boolean;
  showPoseOverlay: boolean;
  showMetrics: boolean;
  showBiomechanicalAnalysis: boolean;
  showCharacterAssessment: boolean;
  showRecommendations: boolean;
  showPerformanceHistory: boolean;
  compactMode: boolean;
  darkMode: boolean;
}

// Default configuration
const DEFAULT_CONFIG: PanelConfig = {
  showVideoFeed: true,
  showPoseOverlay: true,
  showMetrics: true,
  showBiomechanicalAnalysis: true,
  showCharacterAssessment: false,
  showRecommendations: true,
  showPerformanceHistory: true,
  compactMode: false,
  darkMode: true
};

// Main Vision AI Panel Component
export const VisionAIPanel: React.FC<VisionAIPanelProps> = ({
  isActive,
  mode,
  metrics,
  onActivate,
  onStop,
  onModeChange,
  className = '',
  showAdvancedMetrics = true,
  enableRecording = true,
  enableAnalysis = true
}) => {
  const { 
    isVisionActive, 
    poseMetrics, 
    biomechanicalAnalysis, 
    characterAssessment,
    performance,
    error,
    calibrateSystem,
    getVideoStream
  } = useVisionAI();
  
  // State management
  const [config, setConfig] = useState<PanelConfig>(DEFAULT_CONFIG);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingData, setRecordingData] = useState<any[]>([]);
  const [analysisHistory, setAnalysisHistory] = useState<BiomechanicalAnalysis[]>([]);
  const [selectedTimeRange, setSelectedTimeRange] = useState<'1m' | '5m' | '15m' | '1h'>('5m');
  const [isCalibrating, setIsCalibrating] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  
  // Refs
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const recordingIntervalRef = useRef<NodeJS.Timeout>();
  const analysisIntervalRef = useRef<NodeJS.Timeout>();
  
  // Update video stream when active
  useEffect(() => {
    if (isActive && videoRef.current) {
      const stream = getVideoStream();
      if (stream) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
      }
    }
  }, [isActive, getVideoStream]);
  
  // Start/stop recording
  useEffect(() => {
    if (isRecording && isActive) {
      startRecording();
    } else {
      stopRecording();
    }
    
    return () => stopRecording();
  }, [isRecording, isActive]);
  
  // Update analysis history
  useEffect(() => {
    if (biomechanicalAnalysis) {
      setAnalysisHistory(prev => [biomechanicalAnalysis, ...prev.slice(0, 99)]);
    }
  }, [biomechanicalAnalysis]);
  
  // Start recording pose data
  const startRecording = useCallback(() => {
    if (recordingIntervalRef.current) return;
    
    recordingIntervalRef.current = setInterval(() => {
      if (isActive && poseMetrics) {
        const timestamp = new Date();
        const dataPoint = {
          timestamp,
          metrics: { ...poseMetrics },
          mode,
          performance: { ...performance }
        };
        
        setRecordingData(prev => [dataPoint, ...prev.slice(0, 999)]);
      }
    }, 100); // Record at 10Hz
  }, [isActive, poseMetrics, mode, performance]);
  
  // Stop recording
  const stopRecording = useCallback(() => {
    if (recordingIntervalRef.current) {
      clearInterval(recordingIntervalRef.current);
      recordingIntervalRef.current = undefined;
    }
  }, []);
  
  // Handle mode change
  const handleModeChange = useCallback((newMode: VisionAIMode) => {
    onModeChange(newMode);
  }, [onModeChange]);
  
  // Handle calibration
  const handleCalibration = useCallback(async () => {
    setIsCalibrating(true);
    try {
      await calibrateSystem();
    } catch (error) {
      console.error('Calibration failed:', error);
    } finally {
      setIsCalibrating(false);
    }
  }, [calibrateSystem]);
  
  // Export recording data
  const exportRecordingData = useCallback(() => {
    const data = {
      timestamp: new Date(),
      duration: recordingData.length * 0.1, // seconds
      mode,
      data: recordingData
    };
    
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `vision-ai-recording-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }, [recordingData, mode]);
  
  // Get filtered analysis history
  const getFilteredHistory = useCallback(() => {
    const now = Date.now();
    const timeRanges = {
      '1m': 60 * 1000,
      '5m': 5 * 60 * 1000,
      '15m': 15 * 60 * 1000,
      '1h': 60 * 60 * 1000
    };
    
    const cutoff = now - timeRanges[selectedTimeRange];
    return analysisHistory.filter(analysis => 
      analysis.timestamp.getTime() > cutoff
    );
  }, [analysisHistory, selectedTimeRange]);
  
  // Render video feed
  const renderVideoFeed = () => {
    if (!config.showVideoFeed) return null;
    
    return (
      <div className="video-feed-container">
        <video
          ref={videoRef}
          className="video-feed"
          muted
          playsInline
          style={{ display: isActive ? 'block' : 'none' }}
        />
        
        {!isActive && (
          <div className="video-placeholder">
            <div className="placeholder-icon">📹</div>
            <div className="placeholder-text">Vision AI Inactive</div>
            <button 
              className="activate-button"
              onClick={onActivate}
            >
              Activate Vision AI
            </button>
          </div>
        )}
        
        {/* Pose overlay canvas */}
        {isActive && config.showPoseOverlay && (
          <canvas
            ref={canvasRef}
            className="pose-overlay"
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: '100%',
              height: '100%',
              pointerEvents: 'none'
            }}
          />
        )}
        
        {/* Performance overlay */}
        {isActive && (
          <div className="performance-overlay">
            <div className="performance-metric">
              <span className="label">FPS:</span>
              <span className="value">{performance.fps}</span>
            </div>
            <div className="performance-metric">
              <span className="label">Latency:</span>
              <span className="value">{performance.latency}ms</span>
            </div>
            <div className="performance-metric">
              <span className="label">Accuracy:</span>
              <span className="value">{(performance.accuracy * 100).toFixed(1)}%</span>
            </div>
          </div>
        )}
      </div>
    );
  };
  
  // Render pose metrics
  const renderPoseMetrics = () => {
    if (!config.showMetrics) return null;
    
    return (
      <div className="pose-metrics">
        <h4>Pose Metrics</h4>
        <div className="metrics-grid">
          <div className="metric-item">
            <span className="metric-label">Form Score</span>
            <div className="metric-value">
              <span className="value">{metrics.formScore.toFixed(1)}%</span>
              <div className="metric-bar">
                <div 
                  className="metric-fill"
                  style={{ 
                    width: `${metrics.formScore}%`,
                    backgroundColor: metrics.formScore > 80 ? '#4CAF50' : 
                                   metrics.formScore > 60 ? '#FF9800' : '#F44336'
                  }}
                />
              </div>
            </div>
          </div>
          
          <div className="metric-item">
            <span className="metric-label">Hip Rotation</span>
            <div className="metric-value">
              <span className="value">{metrics.hipRotation.toFixed(1)}°</span>
              <div className="metric-bar">
                <div 
                  className="metric-fill"
                  style={{ 
                    width: `${Math.min(metrics.hipRotation / 45 * 100, 100)}%`,
                    backgroundColor: '#2196F3'
                  }}
                />
              </div>
            </div>
          </div>
          
          <div className="metric-item">
            <span className="metric-label">Shoulder Tilt</span>
            <div className="metric-value">
              <span className="value">{metrics.shoulderTilt.toFixed(1)}°</span>
              <div className="metric-bar">
                <div 
                  className="metric-fill"
                  style={{ 
                    width: `${Math.min(metrics.shoulderTilt / 30 * 100, 100)}%`,
                    backgroundColor: '#9C27B0'
                  }}
                />
              </div>
            </div>
          </div>
          
          <div className="metric-item">
            <span className="metric-label">Weight Transfer</span>
            <div className="metric-value">
              <span className="value">{metrics.weightTransfer.toFixed(1)}%</span>
              <div className="metric-bar">
                <div 
                  className="metric-fill"
                  style={{ 
                    width: `${metrics.weightTransfer}%`,
                    backgroundColor: '#FF5722'
                  }}
                />
              </div>
            </div>
          </div>
          
          <div className="metric-item">
            <span className="metric-label">Confidence</span>
            <div className="metric-value">
              <span className="value">{(metrics.confidence * 100).toFixed(1)}%</span>
              <div className="metric-bar">
                <div 
                  className="metric-fill"
                  style={{ 
                    width: `${metrics.confidence * 100}%`,
                    backgroundColor: '#00BCD4'
                  }}
                />
              </div>
            </div>
          </div>
          
          <div className="metric-item">
            <span className="metric-label">Injury Risk</span>
            <div className="metric-value">
              <span className="value">{(metrics.injuryRisk * 100).toFixed(1)}%</span>
              <div className="metric-bar">
                <div 
                  className="metric-fill"
                  style={{ 
                    width: `${metrics.injuryRisk * 100}%`,
                    backgroundColor: metrics.injuryRisk > 0.7 ? '#F44336' : 
                                   metrics.injuryRisk > 0.4 ? '#FF9800' : '#4CAF50'
                  }}
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };
  
  // Render biomechanical analysis
  const renderBiomechanicalAnalysis = () => {
    if (!config.showBiomechanicalAnalysis || !biomechanicalAnalysis) return null;
    
    return (
      <div className="biomechanical-analysis">
        <h4>Biomechanical Analysis</h4>
        
        <div className="analysis-summary">
          <div className="summary-metric">
            <span className="label">Overall Score</span>
            <span className="value">
              {biomechanicalAnalysis.comparisonToIdeal.overallScore.toFixed(1)}%
            </span>
          </div>
          
          <div className="summary-metric">
            <span className="label">Activity</span>
            <span className="value">{biomechanicalAnalysis.activity}</span>
          </div>
          
          <div className="summary-metric">
            <span className="label">Timestamp</span>
            <span className="value">
              {biomechanicalAnalysis.timestamp.toLocaleTimeString()}
            </span>
          </div>
        </div>
        
        <div className="deviations">
          <h5>Key Deviations</h5>
          {biomechanicalAnalysis.comparisonToIdeal.deviations.map((deviation, index) => (
            <div key={index} className="deviation-item">
              <span className="deviation-metric">{deviation.metric}</span>
              <span className="deviation-value">{deviation.deviation.toFixed(1)}</span>
              <span className="deviation-impact">{deviation.impact}</span>
            </div>
          ))}
        </div>
        
        <div className="recommendations">
          <h5>Recommendations</h5>
          {biomechanicalAnalysis.recommendations.map((rec, index) => (
            <div key={index} className={`recommendation-item priority-${rec.priority}`}>
              <div className="recommendation-header">
                <span className="recommendation-category">{rec.category}</span>
                <span className="recommendation-priority">{rec.priority}</span>
              </div>
              <div className="recommendation-description">{rec.description}</div>
              {rec.exercises && (
                <div className="recommendation-exercises">
                  <strong>Exercises:</strong> {rec.exercises.join(', ')}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    );
  };
  
  // Render character assessment
  const renderCharacterAssessment = () => {
    if (!config.showCharacterAssessment || !characterAssessment) return null;
    
    return (
      <div className="character-assessment">
        <h4>Character Assessment</h4>
        
        <div className="assessment-summary">
          <div className="summary-metric">
            <span className="label">Overall Score</span>
            <span className="value">
              {(characterAssessment.overallScore * 100).toFixed(1)}%
            </span>
          </div>
          
          <div className="summary-metric">
            <span className="label">Confidence</span>
            <span className="value">
              {(characterAssessment.confidence * 100).toFixed(1)}%
            </span>
          </div>
        </div>
        
        <div className="assessment-traits">
          <h5>Character Traits</h5>
          {Object.entries(characterAssessment.assessment).map(([trait, value]) => (
            <div key={trait} className="trait-item">
              <span className="trait-name">{trait.replace(/([A-Z])/g, ' $1').trim()}</span>
              <div className="trait-value">
                <div className="trait-bar">
                  <div 
                    className="trait-fill"
                    style={{ 
                      width: `${value * 100}%`,
                      backgroundColor: value > 0.7 ? '#4CAF50' : 
                                     value > 0.4 ? '#FF9800' : '#F44336'
                    }}
                  />
                </div>
                <span className="trait-percentage">{(value * 100).toFixed(1)}%</span>
              </div>
            </div>
          ))}
        </div>
        
        <div className="behavioral-indicators">
          <h5>Behavioral Indicators</h5>
          {characterAssessment.behavioralIndicators.map((indicator, index) => (
            <div key={index} className="indicator-item">
              <span className="indicator-name">{indicator.indicator}</span>
              <span className="indicator-frequency">
                {(indicator.frequency * 100).toFixed(1)}%
              </span>
              <span className="indicator-significance">
                {(indicator.significance * 100).toFixed(1)}%
              </span>
            </div>
          ))}
        </div>
      </div>
    );
  };
  
  // Render performance history
  const renderPerformanceHistory = () => {
    if (!config.showPerformanceHistory) return null;
    
    const filteredHistory = getFilteredHistory();
    
    return (
      <div className="performance-history">
        <div className="history-header">
          <h4>Performance History</h4>
          <select
            value={selectedTimeRange}
            onChange={(e) => setSelectedTimeRange(e.target.value as any)}
          >
            <option value="1m">Last Minute</option>
            <option value="5m">Last 5 Minutes</option>
            <option value="15m">Last 15 Minutes</option>
            <option value="1h">Last Hour</option>
          </select>
        </div>
        
        <div className="history-chart">
          {/* Simple line chart representation */}
          <div className="chart-container">
            {filteredHistory.map((analysis, index) => (
              <div
                key={index}
                className="chart-point"
                style={{
                  left: `${(index / Math.max(filteredHistory.length - 1, 1)) * 100}%`,
                  bottom: `${analysis.comparisonToIdeal.overallScore}%`
                }}
                title={`${analysis.comparisonToIdeal.overallScore.toFixed(1)}% - ${analysis.timestamp.toLocaleTimeString()}`}
              />
            ))}
          </div>
        </div>
        
        <div className="history-stats">
          <div className="stat-item">
            <span className="stat-label">Average Score</span>
            <span className="stat-value">
              {filteredHistory.length > 0 
                ? (filteredHistory.reduce((sum, a) => sum + a.comparisonToIdeal.overallScore, 0) / filteredHistory.length).toFixed(1)
                : '0.0'
              }%
            </span>
          </div>
          
          <div className="stat-item">
            <span className="stat-label">Data Points</span>
            <span className="stat-value">{filteredHistory.length}</span>
          </div>
          
          <div className="stat-item">
            <span className="stat-label">Trend</span>
            <span className="stat-value">
              {filteredHistory.length > 1 
                ? (filteredHistory[0].comparisonToIdeal.overallScore > filteredHistory[filteredHistory.length - 1].comparisonToIdeal.overallScore 
                   ? '↗️ Improving' 
                   : '↘️ Declining')
                : '➡️ Stable'
              }
            </span>
          </div>
        </div>
      </div>
    );
  };
  
  // Render control panel
  const renderControlPanel = () => {
    return (
      <div className="control-panel">
        <div className="control-group">
          <h4>Vision AI Controls</h4>
          
          <div className="mode-selector">
            <label>Analysis Mode:</label>
            <select
              value={mode}
              onChange={(e) => handleModeChange(e.target.value as VisionAIMode)}
              disabled={!isActive}
            >
              <option value="inactive">Inactive</option>
              <option value="pose_detection">Pose Detection</option>
              <option value="form_analysis">Form Analysis</option>
              <option value="character_read">Character Read</option>
              <option value="biomechanical_analysis">Biomechanical Analysis</option>
              <option value="injury_prevention">Injury Prevention</option>
              <option value="performance_tracking">Performance Tracking</option>
            </select>
          </div>
          
          <div className="control-buttons">
            {!isActive ? (
              <button 
                className="control-button primary"
                onClick={onActivate}
              >
                🎥 Activate Vision AI
              </button>
            ) : (
              <button 
                className="control-button danger"
                onClick={onStop}
              >
                ⏹️ Stop Analysis
              </button>
            )}
            
            <button 
              className="control-button secondary"
              onClick={handleCalibration}
              disabled={isCalibrating || !isActive}
            >
              {isCalibrating ? '⏳ Calibrating...' : '🎯 Calibrate'}
            </button>
            
            {enableRecording && (
              <button 
                className={`control-button ${isRecording ? 'recording' : 'secondary'}`}
                onClick={() => setIsRecording(!isRecording)}
                disabled={!isActive}
              >
                {isRecording ? '🔴 Stop Recording' : '⏺️ Start Recording'}
              </button>
            )}
          </div>
        </div>
        
        <div className="control-group">
          <h4>Display Options</h4>
          
          <div className="display-options">
            <label>
              <input
                type="checkbox"
                checked={config.showVideoFeed}
                onChange={(e) => setConfig(prev => ({ ...prev, showVideoFeed: e.target.checked }))}
              />
              Video Feed
            </label>
            
            <label>
              <input
                type="checkbox"
                checked={config.showPoseOverlay}
                onChange={(e) => setConfig(prev => ({ ...prev, showPoseOverlay: e.target.checked }))}
              />
              Pose Overlay
            </label>
            
            <label>
              <input
                type="checkbox"
                checked={config.showMetrics}
                onChange={(e) => setConfig(prev => ({ ...prev, showMetrics: e.target.checked }))}
              />
              Metrics
            </label>
            
            <label>
              <input
                type="checkbox"
                checked={config.showBiomechanicalAnalysis}
                onChange={(e) => setConfig(prev => ({ ...prev, showBiomechanicalAnalysis: e.target.checked }))}
              />
              Biomechanical Analysis
            </label>
            
            <label>
              <input
                type="checkbox"
                checked={config.showCharacterAssessment}
                onChange={(e) => setConfig(prev => ({ ...prev, showCharacterAssessment: e.target.checked }))}
              />
              Character Assessment
            </label>
            
            <label>
              <input
                type="checkbox"
                checked={config.showPerformanceHistory}
                onChange={(e) => setConfig(prev => ({ ...prev, showPerformanceHistory: e.target.checked }))}
              />
              Performance History
            </label>
          </div>
        </div>
        
        {enableRecording && recordingData.length > 0 && (
          <div className="control-group">
            <h4>Recording Data</h4>
            
            <div className="recording-info">
              <div className="info-item">
                <span className="label">Duration:</span>
                <span className="value">{(recordingData.length * 0.1).toFixed(1)}s</span>
              </div>
              
              <div className="info-item">
                <span className="label">Data Points:</span>
                <span className="value">{recordingData.length}</span>
              </div>
              
              <div className="info-item">
                <span className="label">Mode:</span>
                <span className="value">{mode}</span>
              </div>
            </div>
            
            <button 
              className="control-button secondary"
              onClick={exportRecordingData}
            >
              📥 Export Data
            </button>
          </div>
        )}
        
        <div className="control-group">
          <button 
            className="control-button secondary"
            onClick={() => setShowSettings(!showSettings)}
          >
            ⚙️ {showSettings ? 'Hide' : 'Show'} Settings
          </button>
        </div>
      </div>
    );
  };
  
  // Render settings panel
  const renderSettingsPanel = () => {
    if (!showSettings) return null;
    
    return (
      <div className="settings-panel">
        <h4>Advanced Settings</h4>
        
        <div className="settings-group">
          <label>
            <span>Compact Mode</span>
            <input
              type="checkbox"
              checked={config.compactMode}
              onChange={(e) => setConfig(prev => ({ ...prev, compactMode: e.target.checked }))}
            />
          </label>
          
          <label>
            <span>Dark Mode</span>
            <input
              type="checkbox"
              checked={config.darkMode}
              onChange={(e) => setConfig(prev => ({ ...prev, darkMode: e.target.checked }))}
            />
          </label>
        </div>
        
        <div className="settings-group">
          <label>
            <span>Show Recommendations</span>
            <input
              type="checkbox"
              checked={config.showRecommendations}
              onChange={(e) => setConfig(prev => ({ ...prev, showRecommendations: e.target.checked }))}
            />
          </label>
        </div>
      </div>
    );
  };
  
  // Main render
  return (
    <div className={`vision-ai-panel ${className} ${config.darkMode ? 'dark' : 'light'} ${config.compactMode ? 'compact' : ''}`}>
      {/* Error display */}
      {error && (
        <div className="error-message">
          <span className="error-icon">⚠️</span>
          <span className="error-text">{error}</span>
        </div>
      )}
      
      {/* Control Panel */}
      {renderControlPanel()}
      
      {/* Settings Panel */}
      {renderSettingsPanel()}
      
      {/* Main Content */}
      <div className="panel-content">
        {/* Video Feed */}
        {renderVideoFeed()}
        
        {/* Pose Metrics */}
        {renderPoseMetrics()}
        
        {/* Biomechanical Analysis */}
        {renderBiomechanicalAnalysis()}
        
        {/* Character Assessment */}
        {renderCharacterAssessment()}
        
        {/* Performance History */}
        {renderPerformanceHistory()}
      </div>
    </div>
  );
};

export default VisionAIPanel;
