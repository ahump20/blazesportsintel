/**
 * Blaze Sports Intelligence - Advanced Dashboard Component
 * Championship Intelligence Platform - Analytics Dashboard
 * The Deep South's Sports Intelligence Hub
 */

'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useSportsStore } from '@/lib/stores/sportsStore';
import { useVisionAI } from '@/hooks/useVisionAI';
import { useRealTimeData } from '@/hooks/useRealTimeData';
import { PerformanceCharts } from '@/components/analytics/PerformanceCharts';
import { LiveScoresWidget } from '@/components/widgets/LiveScoresWidget';
import { TopPlayersWidget } from '@/components/widgets/TopPlayersWidget';
import { StandingsWidget } from '@/components/widgets/StandingsWidget';
import { HeatMap3D } from '@/components/3d/HeatMap3D';
import { 
  SportType, 
  PerformanceMetrics,
  ChampionshipIntelligence,
  EliteAnalytics
} from '@/types/analytics.types';

// Dashboard configuration interface
interface DashboardConfig {
  layout: 'grid' | 'masonry' | 'flex';
  responsive: boolean;
  autoRefresh: boolean;
  refreshInterval: number; // milliseconds
  enableAnimations: boolean;
  compactMode: boolean;
  darkMode: boolean;
  showPerformanceMetrics: boolean;
  enableAlerts: boolean;
}

// Dashboard props interface
interface AdvancedDashboardProps {
  sport: SportType;
  data: any;
  predictions: Record<string, any>;
  championshipIntelligence: ChampionshipIntelligence;
  performanceMetrics: PerformanceMetrics;
  config?: Partial<DashboardConfig>;
  className?: string;
  onWidgetClick?: (widgetId: string, data: any) => void;
  onConfigChange?: (config: DashboardConfig) => void;
}

// Widget configuration interface
interface WidgetConfig {
  id: string;
  title: string;
  component: React.ComponentType<any>;
  props: Record<string, any>;
  size: 'small' | 'medium' | 'large' | 'xlarge';
  position: { x: number; y: number; w: number; h: number };
  visible: boolean;
  refreshable: boolean;
  configurable: boolean;
  draggable: boolean;
  resizable: boolean;
}

// Default dashboard configuration
const DEFAULT_CONFIG: DashboardConfig = {
  layout: 'grid',
  responsive: true,
  autoRefresh: true,
  refreshInterval: 30000,
  enableAnimations: true,
  compactMode: false,
  darkMode: true,
  showPerformanceMetrics: true,
  enableAlerts: true
};

// Main dashboard component
export const AdvancedDashboard: React.FC<AdvancedDashboardProps> = ({
  sport,
  data,
  predictions,
  championshipIntelligence,
  performanceMetrics,
  config: userConfig = {},
  className = '',
  onWidgetClick,
  onConfigChange
}) => {
  const config = { ...DEFAULT_CONFIG, ...userConfig };
  const { 
    analyticsData,
    updateAnalyticsData,
    championshipData,
    updateChampionshipData
  } = useSportsStore();
  
  const { isVisionActive, poseMetrics } = useVisionAI();
  const { isConnected, realTimeData, recentUpdates } = useRealTimeData();
  
  // State management
  const [widgets, setWidgets] = useState<WidgetConfig[]>([]);
  const [activeWidget, setActiveWidget] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [alerts, setAlerts] = useState<Array<{
    id: string;
    type: 'info' | 'warning' | 'error' | 'success';
    message: string;
    timestamp: Date;
  }>>([]);
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date());
  
  // Initialize widgets based on sport
  useEffect(() => {
    const sportWidgets = generateWidgetsForSport(sport, config);
    setWidgets(sportWidgets);
  }, [sport, config]);
  
  // Auto-refresh effect
  useEffect(() => {
    if (!config.autoRefresh) return;
    
    const interval = setInterval(() => {
      refreshDashboard();
    }, config.refreshInterval);
    
    return () => clearInterval(interval);
  }, [config.autoRefresh, config.refreshInterval]);
  
  // Real-time data effect
  useEffect(() => {
    if (recentUpdates.length > 0) {
      processRealTimeUpdates(recentUpdates);
    }
  }, [recentUpdates]);
  
  // Championship intelligence monitoring
  useEffect(() => {
    if (championshipIntelligence) {
      updateChampionshipData(championshipIntelligence);
      checkForAlerts(championshipIntelligence);
    }
  }, [championshipIntelligence, updateChampionshipData]);
  
  // Generate widgets based on sport
  const generateWidgetsForSport = useCallback((
    sportType: SportType, 
    dashboardConfig: DashboardConfig
  ): WidgetConfig[] => {
    const baseWidgets: WidgetConfig[] = [
      {
        id: 'championship-overview',
        title: 'Championship Intelligence',
        component: ChampionshipOverview,
        props: { 
          data: championshipIntelligence,
          sport: sportType
        },
        size: 'xlarge',
        position: { x: 0, y: 0, w: 12, h: 6 },
        visible: true,
        refreshable: true,
        configurable: true,
        draggable: true,
        resizable: true
      },
      {
        id: 'live-scores',
        title: 'Live Scores & Games',
        component: LiveScoresWidget,
        props: { 
          sport: sportType,
          realTimeUpdates: realTimeData
        },
        size: 'large',
        position: { x: 0, y: 6, w: 8, h: 4 },
        visible: true,
        refreshable: true,
        configurable: false,
        draggable: true,
        resizable: true
      },
      {
        id: 'performance-charts',
        title: 'Performance Analytics',
        component: PerformanceCharts,
        props: {
          data: analyticsData,
          predictions: predictions,
          sport: sportType
        },
        size: 'large',
        position: { x: 8, y: 6, w: 4, h: 8 },
        visible: true,
        refreshable: true,
        configurable: true,
        draggable: true,
        resizable: true
      },
      {
        id: 'top-players',
        title: 'Elite Performers',
        component: TopPlayersWidget,
        props: {
          sport: sportType,
          predictions: predictions
        },
        size: 'medium',
        position: { x: 0, y: 10, w: 4, h: 6 },
        visible: true,
        refreshable: true,
        configurable: true,
        draggable: true,
        resizable: true
      },
      {
        id: 'standings',
        title: 'League Standings',
        component: StandingsWidget,
        props: {
          sport: sportType,
          championshipIntelligence: championshipIntelligence
        },
        size: 'medium',
        position: { x: 4, y: 10, w: 4, h: 6 },
        visible: true,
        refreshable: true,
        configurable: false,
        draggable: true,
        resizable: true
      }
    ];
    
    // Add sport-specific widgets
    switch (sportType) {
      case 'mlb':
        baseWidgets.push({
          id: 'bullpen-analysis',
          title: 'Bullpen Intelligence',
          component: BullpenAnalysis,
          props: { data: data },
          size: 'medium',
          position: { x: 8, y: 14, w: 4, h: 4 },
          visible: true,
          refreshable: true,
          configurable: true,
          draggable: true,
          resizable: true
        });
        break;
        
      case 'nfl':
        baseWidgets.push({
          id: 'qb-pressure',
          title: 'QB Pressure Analytics',
          component: QBPressureAnalysis,
          props: { data: data },
          size: 'medium',
          position: { x: 8, y: 14, w: 4, h: 4 },
          visible: true,
          refreshable: true,
          configurable: true,
          draggable: true,
          resizable: true
        });
        break;
        
      case 'nba':
        baseWidgets.push({
          id: 'shooting-efficiency',
          title: 'Shooting Analytics',
          component: ShootingEfficiencyAnalysis,
          props: { data: data },
          size: 'medium',
          position: { x: 8, y: 14, w: 4, h: 4 },
          visible: true,
          refreshable: true,
          configurable: true,
          draggable: true,
          resizable: true
        });
        break;
        
      case 'ncaa':
        baseWidgets.push({
          id: 'nil-valuation',
          title: 'NIL Intelligence',
          component: NILValuationAnalysis,
          props: { data: data },
          size: 'medium',
          position: { x: 8, y: 14, w: 4, h: 4 },
          visible: true,
          refreshable: true,
          configurable: true,
          draggable: true,
          resizable: true
        });
        break;
    }
    
    // Add Vision AI widget if active
    if (isVisionActive) {
      baseWidgets.push({
        id: 'vision-ai',
        title: 'Vision AI Analysis',
        component: VisionAIWidget,
        props: { 
          metrics: poseMetrics,
          isActive: isVisionActive
        },
        size: 'large',
        position: { x: 0, y: 16, w: 8, h: 6 },
        visible: true,
        refreshable: false,
        configurable: true,
        draggable: true,
        resizable: true
      });
    }
    
    // Add performance metrics widget if enabled
    if (dashboardConfig.showPerformanceMetrics) {
      baseWidgets.push({
        id: 'performance-monitor',
        title: 'System Performance',
        component: PerformanceMonitor,
        props: { 
          metrics: performanceMetrics,
          connectionStatus: isConnected
        },
        size: 'small',
        position: { x: 8, y: 18, w: 4, h: 4 },
        visible: true,
        refreshable: true,
        configurable: false,
        draggable: false,
        resizable: false
      });
    }
    
    return baseWidgets;
  }, [championshipIntelligence, analyticsData, predictions, poseMetrics, isVisionActive, performanceMetrics, isConnected]);
  
  // Refresh dashboard data
  const refreshDashboard = useCallback(async () => {
    setIsLoading(true);
    try {
      // Trigger data refresh for all widgets
      await Promise.all(
        widgets
          .filter(widget => widget.refreshable && widget.visible)
          .map(widget => refreshWidget(widget.id))
      );
      
      setLastRefresh(new Date());
    } catch (error) {
      console.error('Dashboard refresh failed:', error);
      addAlert('error', 'Failed to refresh dashboard data');
    } finally {
      setIsLoading(false);
    }
  }, [widgets]);
  
  // Refresh individual widget
  const refreshWidget = useCallback(async (widgetId: string) => {
    const widget = widgets.find(w => w.id === widgetId);
    if (!widget) return;
    
    try {
      // Refresh widget-specific data
      switch (widgetId) {
        case 'live-scores':
          // Refresh live scores
          break;
        case 'performance-charts':
          // Refresh analytics data
          break;
        case 'top-players':
          // Refresh player data
          break;
        // Add more widget refresh logic
      }
    } catch (error) {
      console.error(`Failed to refresh widget ${widgetId}:`, error);
    }
  }, [widgets]);
  
  // Process real-time updates
  const processRealTimeUpdates = useCallback((updates: any[]) => {
    updates.forEach(update => {
      switch (update.type) {
        case 'score':
          // Update live scores widget
          updateWidgetData('live-scores', update.data);
          break;
        case 'stat':
          // Update performance charts
          updateWidgetData('performance-charts', update.data);
          break;
        case 'injury':
          // Add alert and update relevant widgets
          addAlert('warning', `Injury report: ${update.data.player}`);
          break;
      }
    });
  }, []);
  
  // Update widget data
  const updateWidgetData = useCallback((widgetId: string, newData: any) => {
    setWidgets(prev => 
      prev.map(widget => 
        widget.id === widgetId 
          ? { ...widget, props: { ...widget.props, data: newData } }
          : widget
      )
    );
  }, []);
  
  // Check for alerts based on championship intelligence
  const checkForAlerts = useCallback((intelligence: ChampionshipIntelligence) => {
    // Check readiness index
    if (intelligence.readinessIndex < 0.3) {
      addAlert('warning', 'Championship readiness below 30%');
    }
    
    // Check fatigue level
    if (intelligence.fatigueLevel > 0.8) {
      addAlert('error', 'Critical fatigue level detected');
    }
    
    // Check championship probability
    if (intelligence.championshipProbability > 0.8) {
      addAlert('success', 'High championship probability detected!');
    }
    
    // Check for critical factors
    intelligence.criticalFactors.forEach(factor => {
      if (factor.impact > 0.8 && !factor.controllable) {
        addAlert('warning', `Critical uncontrollable factor: ${factor.factor}`);
      }
    });
  }, []);
  
  // Add alert
  const addAlert = useCallback((
    type: 'info' | 'warning' | 'error' | 'success',
    message: string
  ) => {
    if (!config.enableAlerts) return;
    
    const alert = {
      id: generateId(),
      type,
      message,
      timestamp: new Date()
    };
    
    setAlerts(prev => [alert, ...prev.slice(0, 9)]); // Keep only 10 alerts
    
    // Auto-remove alert after 10 seconds
    setTimeout(() => {
      setAlerts(prev => prev.filter(a => a.id !== alert.id));
    }, 10000);
  }, [config.enableAlerts]);
  
  // Handle widget click
  const handleWidgetClick = useCallback((widgetId: string, widgetData: any) => {
    setActiveWidget(widgetId);
    onWidgetClick?.(widgetId, widgetData);
  }, [onWidgetClick]);
  
  // Handle widget configuration
  const handleWidgetConfig = useCallback((widgetId: string, newConfig: any) => {
    setWidgets(prev =>
      prev.map(widget =>
        widget.id === widgetId
          ? { ...widget, ...newConfig }
          : widget
      )
    );
  }, []);
  
  // Render widget
  const renderWidget = useCallback((widget: WidgetConfig) => {
    if (!widget.visible) return null;
    
    const Component = widget.component;
    
    return (
      <div
        key={widget.id}
        className={`dashboard-widget ${widget.size} ${
          activeWidget === widget.id ? 'active' : ''
        }`}
        onClick={() => handleWidgetClick(widget.id, widget.props)}
        style={{
          gridArea: `${widget.position.y + 1} / ${widget.position.x + 1} / ${
            widget.position.y + widget.position.h + 1
          } / ${widget.position.x + widget.position.w + 1}`
        }}
      >
        <div className="widget-header">
          <h3 className="widget-title">{widget.title}</h3>
          <div className="widget-controls">
            {widget.refreshable && (
              <button
                className="widget-refresh"
                onClick={(e) => {
                  e.stopPropagation();
                  refreshWidget(widget.id);
                }}
                title="Refresh"
              >
                🔄
              </button>
            )}
            {widget.configurable && (
              <button
                className="widget-config"
                onClick={(e) => {
                  e.stopPropagation();
                  // Open widget configuration
                }}
                title="Configure"
              >
                ⚙️
              </button>
            )}
          </div>
        </div>
        
        <div className="widget-content">
          <Component {...widget.props} />
        </div>
      </div>
    );
  }, [activeWidget, handleWidgetClick, refreshWidget]);
  
  // Render alerts
  const renderAlerts = useCallback(() => {
    if (!config.enableAlerts || alerts.length === 0) return null;
    
    return (
      <div className="dashboard-alerts">
        {alerts.map(alert => (
          <div
            key={alert.id}
            className={`alert alert-${alert.type}`}
          >
            <span className="alert-message">{alert.message}</span>
            <button
              className="alert-close"
              onClick={() => setAlerts(prev => prev.filter(a => a.id !== alert.id))}
            >
              ×
            </button>
          </div>
        ))}
      </div>
    );
  }, [config.enableAlerts, alerts]);
  
  // Memoized visible widgets
  const visibleWidgets = useMemo(() => 
    widgets.filter(widget => widget.visible),
    [widgets]
  );
  
  return (
    <div className={`advanced-dashboard ${className}`}>
      {/* Dashboard Header */}
      <div className="dashboard-header">
        <div className="dashboard-title">
          <h2>Championship Intelligence Dashboard</h2>
          <div className="dashboard-subtitle">
            {sport.toUpperCase()} • Last updated: {lastRefresh.toLocaleTimeString()}
          </div>
        </div>
        
        <div className="dashboard-controls">
          <div className="connection-status">
            <span className={`status-indicator ${isConnected ? 'connected' : 'disconnected'}`}>
              {isConnected ? '🟢' : '🔴'}
            </span>
            <span className="status-text">
              {isConnected ? 'Live' : 'Offline'}
            </span>
          </div>
          
          <button
            className="refresh-button"
            onClick={refreshDashboard}
            disabled={isLoading}
          >
            {isLoading ? '⏳' : '🔄'} Refresh
          </button>
          
          <button
            className="config-button"
            onClick={() => {
              // Open dashboard configuration
            }}
          >
            ⚙️ Configure
          </button>
        </div>
      </div>
      
      {/* Alerts */}
      {renderAlerts()}
      
      {/* Dashboard Grid */}
      <div className={`dashboard-grid layout-${config.layout}`}>
        {visibleWidgets.map(renderWidget)}
      </div>
      
      {/* Loading Overlay */}
      {isLoading && (
        <div className="dashboard-loading">
          <div className="loading-spinner"></div>
          <div className="loading-text">Refreshing dashboard...</div>
        </div>
      )}
    </div>
  );
};

// Championship Overview Component
const ChampionshipOverview: React.FC<{
  data: ChampionshipIntelligence;
  sport: SportType;
}> = ({ data, sport }) => {
  return (
    <div className="championship-overview">
      <div className="metrics-grid">
        <div className="metric">
          <span className="metric-label">Readiness Index</span>
          <span className="metric-value">
            {(data.readinessIndex * 100).toFixed(1)}%
          </span>
          <div className="metric-bar">
            <div 
              className="metric-fill"
              style={{ width: `${data.readinessIndex * 100}%` }}
            />
          </div>
        </div>
        
        <div className="metric">
          <span className="metric-label">Championship Probability</span>
          <span className="metric-value">
            {(data.championshipProbability * 100).toFixed(1)}%
          </span>
          <div className="metric-bar">
            <div 
              className="metric-fill championship"
              style={{ width: `${data.championshipProbability * 100}%` }}
            />
          </div>
        </div>
        
        <div className="metric">
          <span className="metric-label">Strategic Advantage</span>
          <span className="metric-value">
            {(data.strategicAdvantage * 100).toFixed(1)}%
          </span>
          <div className="metric-bar">
            <div 
              className="metric-fill strategic"
              style={{ width: `${data.strategicAdvantage * 100}%` }}
            />
          </div>
        </div>
        
        <div className="metric">
          <span className="metric-label">Fatigue Level</span>
          <span className="metric-value">
            {(data.fatigueLevel * 100).toFixed(1)}%
          </span>
          <div className="metric-bar">
            <div 
              className="metric-fill fatigue"
              style={{ width: `${data.fatigueLevel * 100}%` }}
            />
          </div>
        </div>
      </div>
      
      <div className="championship-insights">
        <div className="insights-section">
          <h4>Key Strengths</h4>
          <ul>
            {data.keyStrengths.slice(0, 3).map((strength, index) => (
              <li key={index}>{strength}</li>
            ))}
          </ul>
        </div>
        
        <div className="insights-section">
          <h4>Areas for Improvement</h4>
          <ul>
            {data.keyWeaknesses.slice(0, 3).map((weakness, index) => (
              <li key={index}>{weakness}</li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
};

// Sport-specific analysis components
const BullpenAnalysis: React.FC<{ data: any }> = ({ data }) => (
  <div className="bullpen-analysis">
    <h4>Bullpen Intelligence</h4>
    {/* MLB-specific bullpen analysis */}
  </div>
);

const QBPressureAnalysis: React.FC<{ data: any }> = ({ data }) => (
  <div className="qb-pressure-analysis">
    <h4>QB Pressure Analytics</h4>
    {/* NFL-specific QB pressure analysis */}
  </div>
);

const ShootingEfficiencyAnalysis: React.FC<{ data: any }> = ({ data }) => (
  <div className="shooting-efficiency-analysis">
    <h4>Shooting Analytics</h4>
    {/* NBA-specific shooting analysis */}
  </div>
);

const NILValuationAnalysis: React.FC<{ data: any }> = ({ data }) => (
  <div className="nil-valuation-analysis">
    <h4>NIL Intelligence</h4>
    {/* NCAA-specific NIL analysis */}
  </div>
);

const VisionAIWidget: React.FC<{ metrics: any; isActive: boolean }> = ({ metrics, isActive }) => (
  <div className="vision-ai-widget">
    <h4>Vision AI Analysis</h4>
    {/* Vision AI metrics display */}
  </div>
);

const PerformanceMonitor: React.FC<{ metrics: PerformanceMetrics; connectionStatus: boolean }> = ({ metrics, connectionStatus }) => (
  <div className="performance-monitor">
    <h4>System Performance</h4>
    <div className="performance-stats">
      <div>FPS: {metrics.fps}</div>
      <div>Memory: {(metrics.memoryUsage / 1024 / 1024).toFixed(1)}MB</div>
      <div>Status: {connectionStatus ? 'Connected' : 'Offline'}</div>
    </div>
  </div>
);

// Helper function
function
  return Math.random().toString(36).substr(2, 9);
}
