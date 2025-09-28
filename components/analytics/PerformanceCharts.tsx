/**
 * Blaze Sports Intelligence - Performance Charts Component
 * Championship Intelligence Platform - Advanced Analytics Visualization
 * The Deep South's Sports Intelligence Hub
 */

'use client';

import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { Chart as ChartJS, registerables } from 'chart.js';
import { Line, Bar, Radar, Doughnut, Scatter, Polar } from 'react-chartjs-2';
import 'chartjs-adapter-date-fns';
import { format, parseISO, startOfWeek, endOfWeek, eachDayOfInterval } from 'date-fns';
import { SportType, PerformanceMetrics } from '../../types/sports.types';
import { ChampionshipIntelligence, EliteAnalytics } from '../../types/analytics.types';

// Register Chart.js components
ChartJS.register(...registerables);

// Chart configuration interface
interface ChartConfig {
  responsive: boolean;
  maintainAspectRatio: boolean;
  animation: {
    duration: number;
    easing: string;
  };
  interaction: {
    intersect: boolean;
    mode: string;
  };
  plugins: {
    legend: {
      display: boolean;
      position: string;
    };
    tooltip: {
      enabled: boolean;
      backgroundColor: string;
      titleColor: string;
      bodyColor: string;
      borderColor: string;
      borderWidth: number;
    };
  };
  scales?: any;
}

// Performance data interface
interface PerformanceData {
  timestamp: Date;
  metric: string;
  value: number;
  sport: SportType;
  category: 'offense' | 'defense' | 'special' | 'overall';
  player?: string;
  team?: string;
  game?: string;
}

// Chart type enum
type ChartType = 'line' | 'bar' | 'radar' | 'doughnut' | 'scatter' | 'polar';

// Component props interface
interface PerformanceChartsProps {
  data: PerformanceData[];
  championshipData?: ChampionshipIntelligence;
  eliteAnalytics?: EliteAnalytics;
  sport: SportType;
  timeRange: '24h' | '7d' | '30d' | '90d' | '1y';
  chartType?: ChartType;
  showComparison?: boolean;
  showPredictions?: boolean;
  enableInteraction?: boolean;
  className?: string;
  onMetricSelect?: (metric: string, data: any) => void;
  onTimeRangeChange?: (range: string) => void;
}

// Default chart configuration
const DEFAULT_CHART_CONFIG: ChartConfig = {
  responsive: true,
  maintainAspectRatio: false,
  animation: {
    duration: 750,
    easing: 'easeInOutQuart'
  },
  interaction: {
    intersect: false,
    mode: 'index'
  },
  plugins: {
    legend: {
      display: true,
      position: 'top'
    },
    tooltip: {
      enabled: true,
      backgroundColor: 'rgba(0, 0, 0, 0.8)',
      titleColor: '#ffffff',
      bodyColor: '#ffffff',
      borderColor: '#FF6B35',
      borderWidth: 1
    }
  }
};

// Color schemes for different sports
const SPORT_COLOR_SCHEMES = {
  mlb: {
    primary: ['#C41E3A', '#FFD700', '#003087', '#00A651'],
    secondary: ['#FF6B6B', '#FFE66D', '#4ECDC4', '#45B7D1'],
    accent: '#FF6B35'
  },
  nfl: {
    primary: ['#013369', '#D50A0A', '#FF7900', '#4B0082'],
    secondary: ['#4169E1', '#FF6347', '#FFA500', '#8A2BE2'],
    accent: '#32CD32'
  },
  nba: {
    primary: ['#C8102E', '#FFC72C', '#002D62', '#CE1141'],
    secondary: ['#FF4757', '#FFD700', '#1E90FF', '#FF1493'],
    accent: '#FF8C00'
  },
  ncaa: {
    primary: ['#BF5700', '#FFFFFF', '#333F48', '#FF6900'],
    secondary: ['#FF7F00', '#F5F5F5', '#708090', '#FFA500'],
    accent: '#BF5700'
  }
};

// Main Performance Charts Component
export const PerformanceCharts: React.FC<PerformanceChartsProps> = ({
  data,
  championshipData,
  eliteAnalytics,
  sport,
  timeRange,
  chartType = 'line',
  showComparison = true,
  showPredictions = false,
  enableInteraction = true,
  className = '',
  onMetricSelect,
  onTimeRangeChange
}) => {
  // State management
  const [selectedMetrics, setSelectedMetrics] = useState<string[]>(['overall_performance']);
  const [activeChart, setActiveChart] = useState<ChartType>(chartType);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [animationEnabled, setAnimationEnabled] = useState(true);
  const [chartTheme, setChartTheme] = useState<'light' | 'dark'>('dark');
  const [customTimeRange, setCustomTimeRange] = useState<{ start: Date; end: Date } | null>(null);
  
  // Refs
  const chartRefs = useRef<{ [key: string]: any }>({});
  
  // Get color scheme for current sport
  const colorScheme = useMemo(() => SPORT_COLOR_SCHEMES[sport] || SPORT_COLOR_SCHEMES.mlb, [sport]);
  
  // Filter data by time range
  const filteredData = useMemo(() => {
    const now = new Date();
    const timeRanges = {
      '24h': 24 * 60 * 60 * 1000,
      '7d': 7 * 24 * 60 * 60 * 1000,
      '30d': 30 * 24 * 60 * 60 * 1000,
      '90d': 90 * 24 * 60 * 60 * 1000,
      '1y': 365 * 24 * 60 * 60 * 1000
    };
    
    const cutoff = now.getTime() - timeRanges[timeRange];
    
    return data.filter(item => item.timestamp.getTime() > cutoff);
  }, [data, timeRange]);
  
  // Process data for charts
  const processedData = useMemo(() => {
    const grouped = filteredData.reduce((acc, item) => {
      const key = item.metric;
      if (!acc[key]) {
        acc[key] = [];
      }
      acc[key].push(item);
      return acc;
    }, {} as Record<string, PerformanceData[]>);
    
    // Sort each metric by timestamp
    Object.keys(grouped).forEach(key => {
      grouped[key].sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
    });
    
    return grouped;
  }, [filteredData]);
  
  // Generate chart datasets
  const generateDatasets = useCallback((metrics: string[]) => {
    return metrics.map((metric, index) => {
      const metricData = processedData[metric] || [];
      const color = colorScheme.primary[index % colorScheme.primary.length];
      
      return {
        label: metric.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
        data: metricData.map(item => ({
          x: item.timestamp,
          y: item.value
        })),
        borderColor: color,
        backgroundColor: `${color}20`,
        fill: false,
        tension: 0.4,
        pointRadius: 3,
        pointHoverRadius: 6,
        borderWidth: 2
      };
    });
  }, [processedData, colorScheme]);
  
  // Generate comparison datasets
  const generateComparisonDatasets = useCallback((metric: string) => {
    const baseData = processedData[metric] || [];
    const datasets = [];
    
    // Current performance
    datasets.push({
      label: 'Current Performance',
      data: baseData.map(item => ({
        x: item.timestamp,
        y: item.value
      })),
      borderColor: colorScheme.primary[0],
      backgroundColor: `${colorScheme.primary[0]}20`,
      fill: false,
      tension: 0.4
    });
    
    // League average (simulated)
    datasets.push({
      label: 'League Average',
      data: baseData.map(item => ({
        x: item.timestamp,
        y: item.value * (0.85 + Math.random() * 0.3) // Simulate league average
      })),
      borderColor: colorScheme.secondary[1],
      backgroundColor: `${colorScheme.secondary[1]}20`,
      fill: false,
      tension: 0.4,
      borderDash: [5, 5]
    });
    
    // Elite performance benchmark
    datasets.push({
      label: 'Elite Benchmark',
      data: baseData.map(item => ({
        x: item.timestamp,
        y: item.value * (1.1 + Math.random() * 0.2) // Simulate elite performance
      })),
      borderColor: colorScheme.accent,
      backgroundColor: `${colorScheme.accent}20`,
      fill: false,
      tension: 0.4,
      borderDash: [10, 5]
    });
    
    return datasets;
  }, [processedData, colorScheme]);
  
  // Generate prediction datasets
  const generatePredictionDatasets = useCallback((metric: string) => {
    const baseData = processedData[metric] || [];
    if (baseData.length < 2) return [];
    
    const lastPoint = baseData[baseData.length - 1];
    const secondLastPoint = baseData[baseData.length - 2];
    const trend = (lastPoint.value - secondLastPoint.value) / (lastPoint.timestamp.getTime() - secondLastPoint.timestamp.getTime());
    
    // Generate prediction points
    const predictionData = [];
    const predictionStart = lastPoint.timestamp.getTime();
    const timeStep = 24 * 60 * 60 * 1000; // 1 day
    
    for (let i = 1; i <= 7; i++) { // 7 days prediction
      const timestamp = new Date(predictionStart + i * timeStep);
      const predictedValue = lastPoint.value + trend * i * timeStep;
      predictionData.push({
        x: timestamp,
        y: Math.max(0, predictedValue) // Ensure non-negative values
      });
    }
    
    return [{
      label: 'Predicted Trend',
      data: predictionData,
      borderColor: `${colorScheme.accent}80`,
      backgroundColor: `${colorScheme.accent}10`,
      fill: false,
      tension: 0.4,
      borderDash: [3, 3],
      pointRadius: 2
    }];
  }, [processedData, colorScheme]);
  
  // Chart configuration with theme
  const getChartConfig = useCallback((type: ChartType): ChartConfig => {
    const baseConfig = { ...DEFAULT_CHART_CONFIG };
    
    // Theme-specific colors
    const textColor = chartTheme === 'dark' ? '#ffffff' : '#333333';
    const gridColor = chartTheme === 'dark' ? '#444444' : '#e0e0e0';
    
    // Type-specific scales
    switch (type) {
      case 'line':
      case 'bar':
      case 'scatter':
        baseConfig.scales = {
          x: {
            type: 'time',
            time: {
              displayFormats: {
                hour: 'HH:mm',
                day: 'MMM dd',
                week: 'MMM dd',
                month: 'MMM yyyy'
              }
            },
            grid: {
              color: gridColor,
              borderColor: gridColor
            },
            ticks: {
              color: textColor
            }
          },
          y: {
            beginAtZero: false,
            grid: {
              color: gridColor,
              borderColor: gridColor
            },
            ticks: {
              color: textColor
            }
          }
        };
        break;
      case 'radar':
      case 'polar':
        baseConfig.scales = {
          r: {
            beginAtZero: true,
            grid: {
              color: gridColor
            },
            ticks: {
              color: textColor
            }
          }
        };
        break;
    }
    
    // Animation settings
    if (!animationEnabled) {
      baseConfig.animation.duration = 0;
    }
    
    return baseConfig;
  }, [chartTheme, animationEnabled]);
  
  // Render time series chart
  const renderTimeSeriesChart = () => {
    const datasets = showComparison && selectedMetrics.length === 1
      ? generateComparisonDatasets(selectedMetrics[0])
      : generateDatasets(selectedMetrics);
    
    // Add predictions if enabled
    if (showPredictions && selectedMetrics.length === 1) {
      datasets.push(...generatePredictionDatasets(selectedMetrics[0]));
    }
    
    const chartData = {
      datasets
    };
    
    const config = getChartConfig(activeChart);
    
    return (
      <div className="chart-container">
        <Line
          ref={(ref) => chartRefs.current['timeSeries'] = ref}
          data={chartData}
          options={config}
        />
      </div>
    );
  };
  
  // Render performance distribution chart
  const renderDistributionChart = () => {
    const metric = selectedMetrics[0] || 'overall_performance';
    const metricData = processedData[metric] || [];
    
    // Create histogram bins
    const values = metricData.map(item => item.value);
    const min = Math.min(...values);
    const max = Math.max(...values);
    const binCount = 10;
    const binSize = (max - min) / binCount;
    
    const bins = Array.from({ length: binCount }, (_, i) => ({
      start: min + i * binSize,
      end: min + (i + 1) * binSize,
      count: 0
    }));
    
    values.forEach(value => {
      const binIndex = Math.min(Math.floor((value - min) / binSize), binCount - 1);
      bins[binIndex].count++;
    });
    
    const chartData = {
      labels: bins.map(bin => `${bin.start.toFixed(1)}-${bin.end.toFixed(1)}`),
      datasets: [{
        label: 'Performance Distribution',
        data: bins.map(bin => bin.count),
        backgroundColor: colorScheme.primary.map(color => `${color}80`),
        borderColor: colorScheme.primary,
        borderWidth: 2
      }]
    };
    
    const config = getChartConfig('bar');
    
    return (
      <div className="chart-container">
        <Bar
          ref={(ref) => chartRefs.current['distribution'] = ref}
          data={chartData}
          options={config}
        />
      </div>
    );
  };
  
  // Render radar chart for multi-metric comparison
  const renderRadarChart = () => {
    if (!championshipData) return null;
    
    const metrics = ['offense', 'defense', 'special_teams', 'conditioning', 'mental_toughness'];
    const labels = metrics.map(metric => metric.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()));
    
    // Simulate radar data based on championship data
    const playerData = metrics.map(() => 60 + Math.random() * 40);
    const teamAverage = metrics.map(() => 50 + Math.random() * 30);
    const eliteLevel = metrics.map(() => 80 + Math.random() * 20);
    
    const chartData = {
      labels,
      datasets: [
        {
          label: 'Player Performance',
          data: playerData,
          backgroundColor: `${colorScheme.primary[0]}30`,
          borderColor: colorScheme.primary[0],
          borderWidth: 2,
          pointBackgroundColor: colorScheme.primary[0],
          pointBorderColor: '#fff',
          pointHoverBackgroundColor: '#fff',
          pointHoverBorderColor: colorScheme.primary[0]
        },
        {
          label: 'Team Average',
          data: teamAverage,
          backgroundColor: `${colorScheme.secondary[1]}30`,
          borderColor: colorScheme.secondary[1],
          borderWidth: 2,
          pointBackgroundColor: colorScheme.secondary[1],
          pointBorderColor: '#fff',
          pointHoverBackgroundColor: '#fff',
          pointHoverBorderColor: colorScheme.secondary[1]
        },
        {
          label: 'Elite Level',
          data: eliteLevel,
          backgroundColor: `${colorScheme.accent}30`,
          borderColor: colorScheme.accent,
          borderWidth: 2,
          pointBackgroundColor: colorScheme.accent,
          pointBorderColor: '#fff',
          pointHoverBackgroundColor: '#fff',
          pointHoverBorderColor: colorScheme.accent
        }
      ]
    };
    
    const config = getChartConfig('radar');
    
    return (
      <div className="chart-container">
        <Radar
          ref={(ref) => chartRefs.current['radar'] = ref}
          data={chartData}
          options={config}
        />
      </div>
    );
  };
  
  // Render performance breakdown pie chart
  const renderBreakdownChart = () => {
    const categories = ['offense', 'defense', 'special', 'conditioning'];
    const values = categories.map(() => 20 + Math.random() * 30);
    
    const chartData = {
      labels: categories.map(cat => cat.charAt(0).toUpperCase() + cat.slice(1)),
      datasets: [{
        data: values,
        backgroundColor: colorScheme.primary,
        borderColor: colorScheme.primary.map(color => color),
        borderWidth: 2,
        hoverBorderWidth: 3
      }]
    };
    
    const config = getChartConfig('doughnut');
    
    return (
      <div className="chart-container">
        <Doughnut
          ref={(ref) => chartRefs.current['breakdown'] = ref}
          data={chartData}
          options={config}
        />
      </div>
    );
  };
  
  // Render scatter plot for correlation analysis
  const renderScatterChart = () => {
    const xMetric = selectedMetrics[0] || 'overall_performance';
    const yMetric = selectedMetrics[1] || 'conditioning';
    
    const xData = processedData[xMetric] || [];
    const yData = processedData[yMetric] || [];
    
    // Match data points by timestamp
    const scatterData = xData.map(xPoint => {
      const yPoint = yData.find(y => Math.abs(y.timestamp.getTime() - xPoint.timestamp.getTime()) < 60000);
      return yPoint ? { x: xPoint.value, y: yPoint.value } : null;
    }).filter(Boolean);
    
    const chartData = {
      datasets: [{
        label: `${xMetric} vs ${yMetric}`,
        data: scatterData,
        backgroundColor: `${colorScheme.primary[0]}60`,
        borderColor: colorScheme.primary[0],
        pointRadius: 5,
        pointHoverRadius: 8
      }]
    };
    
    const config = getChartConfig('scatter');
    config.scales = {
      x: {
        title: {
          display: true,
          text: xMetric.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())
        }
      },
      y: {
        title: {
          display: true,
          text: yMetric.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())
        }
      }
    };
    
    return (
      <div className="chart-container">
        <Scatter
          ref={(ref) => chartRefs.current['scatter'] = ref}
          data={chartData}
          options={config}
        />
      </div>
    );
  };
  
  // Render performance heatmap
  const renderHeatmapChart = () => {
    // Simulate weekly performance data
    const weeks = 12;
    const daysOfWeek = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
    const heatmapData = [];
    
    for (let week = 0; week < weeks; week++) {
      for (let day = 0; day < 7; day++) {
        heatmapData.push({
          x: day,
          y: week,
          v: Math.random() * 100
        });
      }
    }
    
    const chartData = {
      labels: daysOfWeek,
      datasets: [{
        label: 'Performance Intensity',
        data: heatmapData,
        backgroundColor: (context: any) => {
          const value = context.parsed.v;
          const alpha = value / 100;
          return `rgba(255, 107, 53, ${alpha})`;
        },
        borderColor: 'rgba(255, 107, 53, 1)',
        borderWidth: 1
      }]
    };
    
    return (
      <div className="heatmap-container">
        <div className="heatmap-grid">
          {heatmapData.map((point, index) => (
            <div
              key={index}
              className="heatmap-cell"
              style={{
                backgroundColor: `rgba(255, 107, 53, ${point.v / 100})`,
                gridColumn: point.x + 1,
                gridRow: point.y + 1
              }}
              title={`Week ${point.y + 1}, ${daysOfWeek[point.x]}: ${point.v.toFixed(1)}%`}
            />
          ))}
        </div>
      </div>
    );
  };
  
  // Handle metric selection
  const handleMetricSelect = useCallback((metric: string) => {
    if (selectedMetrics.includes(metric)) {
      setSelectedMetrics(prev => prev.filter(m => m !== metric));
    } else {
      setSelectedMetrics(prev => [...prev, metric]);
    }
    
    onMetricSelect?.(metric, processedData[metric]);
  }, [selectedMetrics, processedData, onMetricSelect]);
  
  // Handle chart type change
  const handleChartTypeChange = useCallback((type: ChartType) => {
    setActiveChart(type);
  }, []);
  
  // Handle time range change
  const handleTimeRangeChange = useCallback((range: string) => {
    onTimeRangeChange?.(range);
  }, [onTimeRangeChange]);
  
  // Export chart data
  const exportChartData = useCallback((format: 'json' | 'csv') => {
    const exportData = selectedMetrics.map(metric => ({
      metric,
      data: processedData[metric] || []
    }));
    
    if (format === 'json') {
      const dataStr = JSON.stringify(exportData, null, 2);
      const blob = new Blob([dataStr], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `performance-data-${Date.now()}.json`;
      a.click();
      URL.revokeObjectURL(url);
    } else {
      // CSV export implementation
      let csvContent = 'Metric,Timestamp,Value,Category,Sport\n';
      exportData.forEach(({ metric, data }) => {
        data.forEach(item => {
          csvContent += `${metric},${item.timestamp.toISOString()},${item.value},${item.category},${item.sport}\n`;
        });
      });
      
      const blob = new Blob([csvContent], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `performance-data-${Date.now()}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    }
  }, [selectedMetrics, processedData]);
  
  // Available metrics
  const availableMetrics = useMemo(() => {
    return Object.keys(processedData);
  }, [processedData]);
  
  // Render main component
  return (
    <div className={`performance-charts ${className} theme-${chartTheme}`}>
      {/* Controls */}
      <div className="charts-controls">
        <div className="control-group">
          <h4>Chart Type</h4>
          <div className="chart-type-selector">
            {(['line', 'bar', 'radar', 'doughnut', 'scatter'] as ChartType[]).map(type => (
              <button
                key={type}
                className={`chart-type-button ${activeChart === type ? 'active' : ''}`}
                onClick={() => handleChartTypeChange(type)}
              >
                {type.charAt(0).toUpperCase() + type.slice(1)}
              </button>
            ))}
          </div>
        </div>
        
        <div className="control-group">
          <h4>Metrics</h4>
          <div className="metrics-selector">
            {availableMetrics.map(metric => (
              <label key={metric} className="metric-checkbox">
                <input
                  type="checkbox"
                  checked={selectedMetrics.includes(metric)}
                  onChange={() => handleMetricSelect(metric)}
                />
                <span className="metric-name">
                  {metric.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                </span>
              </label>
            ))}
          </div>
        </div>
        
        <div className="control-group">
          <h4>Options</h4>
          <div className="chart-options">
            <label>
              <input
                type="checkbox"
                checked={showComparison}
                onChange={(e) => {
                  // Would need parent state management
                }}
              />
              Show Comparison
            </label>
            
            <label>
              <input
                type="checkbox"
                checked={showPredictions}
                onChange={(e) => {
                  // Would need parent state management
                }}
              />
              Show Predictions
            </label>
            
            <label>
              <input
                type="checkbox"
                checked={animationEnabled}
                onChange={(e) => setAnimationEnabled(e.target.checked)}
              />
              Enable Animations
            </label>
          </div>
        </div>
        
        <div className="control-group">
          <h4>Theme</h4>
          <select
            value={chartTheme}
            onChange={(e) => setChartTheme(e.target.value as 'light' | 'dark')}
          >
            <option value="dark">Dark</option>
            <option value="light">Light</option>
          </select>
        </div>
        
        <div className="control-group">
          <h4>Export</h4>
          <div className="export-buttons">
            <button onClick={() => exportChartData('json')}>
              Export JSON
            </button>
            <button onClick={() => exportChartData('csv')}>
              Export CSV
            </button>
          </div>
        </div>
      </div>
      
      {/* Main Chart Area */}
      <div className="charts-main">
        {isLoading && (
          <div className="charts-loading">
            <div className="loading-spinner"></div>
            <div className="loading-text">Loading performance data...</div>
          </div>
        )}
        
        {error && (
          <div className="charts-error">
            <div className="error-icon">⚠️</div>
            <div className="error-text">{error}</div>
          </div>
        )}
        
        {!isLoading && !error && (
          <div className="charts-grid">
            {/* Primary Chart */}
            <div className="chart-panel primary">
              <div className="chart-header">
                <h3>Performance Trends</h3>
                <div className="chart-controls">
                  <select
                    value={timeRange}
                    onChange={(e) => handleTimeRangeChange(e.target.value)}
                  >
                    <option value="24h">Last 24 Hours</option>
                    <option value="7d">Last 7 Days</option>
                    <option value="30d">Last 30 Days</option>
                    <option value="90d">Last 90 Days</option>
                    <option value="1y">Last Year</option>
                  </select>
                </div>
              </div>
              {renderTimeSeriesChart()}
            </div>
            
            {/* Secondary Charts */}
            <div className="chart-panel secondary">
              <div className="chart-header">
                <h3>Performance Distribution</h3>
              </div>
              {renderDistributionChart()}
            </div>
            
            <div className="chart-panel secondary">
              <div className="chart-header">
                <h3>Multi-Metric Analysis</h3>
              </div>
              {renderRadarChart()}
            </div>
            
            <div className="chart-panel secondary">
              <div className="chart-header">
                <h3>Performance Breakdown</h3>
              </div>
              {renderBreakdownChart()}
            </div>
            
            {selectedMetrics.length >= 2 && (
              <div className="chart-panel secondary">
                <div className="chart-header">
                  <h3>Correlation Analysis</h3>
                </div>
                {renderScatterChart()}
              </div>
            )}
            
            <div className="chart-panel secondary">
              <div className="chart-header">
                <h3>Performance Heatmap</h3>
              </div>
              {renderHeatmapChart()}
            </div>
          </div>
        )}
      </div>
      
      {/* Statistics Summary */}
      <div className="charts-summary">
        <h4>Performance Summary</h4>
        <div className="summary-stats">
          {selectedMetrics.map(metric => {
            const metricData = processedData[metric] || [];
            if (metricData.length === 0) return null;
            
            const values = metricData.map(item => item.value);
            const average = values.reduce((sum, val) => sum + val, 0) / values.length;
            const max = Math.max(...values);
            const min = Math.min(...values);
            const latest = values[values.length - 1];
            
            return (
              <div key={metric} className="stat-card">
                <h5>{metric.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}</h5>
                <div className="stat-values">
                  <div className="stat-item">
                    <span className="stat-label">Current:</span>
                    <span className="stat-value">{latest?.toFixed(2) || 'N/A'}</span>
                  </div>
                  <div className="stat-item">
                    <span className="stat-label">Average:</span>
                    <span className="stat-value">{average.toFixed(2)}</span>
                  </div>
                  <div className="stat-item">
                    <span className="stat-label">Max:</span>
                    <span className="stat-value">{max.toFixed(2)}</span>
                  </div>
                  <div className="stat-item">
                    <span className="stat-label">Min:</span>
                    <span className="stat-value">{min.toFixed(2)}</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default PerformanceCharts;
