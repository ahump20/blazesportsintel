/**
 * Blaze Sports Intelligence - Real-Time Data Hook
 * Championship Intelligence Platform - Live Data Management
 * The Deep South's Sports Intelligence Hub
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import { useSportsStore } from '@/lib/stores/sportsStore';
import { 
  SportType, 
  RealTimeUpdate, 
  LiveGameData, 
  WebSocketMessage 
} from '@/types/sports.types';

// WebSocket connection states
type ConnectionState = 'disconnected' | 'connecting' | 'connected' | 'reconnecting' | 'error';

// Real-time data configuration
interface RealTimeConfig {
  autoReconnect: boolean;
  reconnectInterval: number; // milliseconds
  maxReconnectAttempts: number;
  heartbeatInterval: number; // milliseconds
  bufferSize: number; // number of updates to buffer
  compressionEnabled: boolean;
  batchUpdates: boolean;
  batchSize: number;
  batchInterval: number; // milliseconds
  prioritizeUpdates: boolean;
  debugMode: boolean;
}

// Real-time data state
interface RealTimeState {
  isConnected: boolean;
  connectionState: ConnectionState;
  lastConnected: Date | null;
  reconnectAttempts: number;
  error: string | null;
  latency: number;
  throughput: number;
  updateCount: number;
  queueSize: number;
  subscriptions: Set<string>;
  lastUpdate: Date | null;
}

// Real-time data interface
interface RealTimeDataHook {
  // Connection state
  isConnected: boolean;
  connectionState: ConnectionState;
  connectionStatus: string;
  latency: number;
  throughput: number;
  error: string | null;
  
  // Data
  realTimeData: Record<string, any>;
  liveGames: Map<string, LiveGameData>;
  recentUpdates: RealTimeUpdate[];
  
  // Actions
  connect: () => Promise<void>;
  disconnect: () => void;
  subscribeToUpdates: (channels: string[]) => void;
  unsubscribeFromUpdates: (channels: string[]) => void;
  sendMessage: (message: any) => void;
  
  // Configuration
  updateConfig: (newConfig: Partial<RealTimeConfig>) => void;
  getConnectionStats: () => Record<string, any>;
}

// Default configuration
const DEFAULT_CONFIG: RealTimeConfig = {
  autoReconnect: true,
  reconnectInterval: 5000,
  maxReconnectAttempts: 10,
  heartbeatInterval: 30000,
  bufferSize: 1000,
  compressionEnabled: true,
  batchUpdates: true,
  batchSize: 10,
  batchInterval: 100,
  prioritizeUpdates: true,
  debugMode: false
};

// WebSocket endpoint
const WS_ENDPOINT = process.env.NEXT_PUBLIC_WS_ENDPOINT || 'wss://api.blazesportsintel.com/ws';

export function useRealTimeData(initialConfig: Partial<RealTimeConfig> = {}): RealTimeDataHook {
  const config = { ...DEFAULT_CONFIG, ...initialConfig };
  const { currentSport, updateAnalyticsData } = useSportsStore();
  
  // State management
  const [state, setState] = useState<RealTimeState>({
    isConnected: false,
    connectionState: 'disconnected',
    lastConnected: null,
    reconnectAttempts: 0,
    error: null,
    latency: 0,
    throughput: 0,
    updateCount: 0,
    queueSize: 0,
    subscriptions: new Set(),
    lastUpdate: null
  });
  
  const [realTimeData, setRealTimeData] = useState<Record<string, any>>({});
  const [liveGames, setLiveGames] = useState<Map<string, LiveGameData>>(new Map());
  const [recentUpdates, setRecentUpdates] = useState<RealTimeUpdate[]>([]);
  
  // Refs for persistent values
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout>();
  const heartbeatIntervalRef = useRef<NodeJS.Timeout>();
  const updateQueueRef = useRef<RealTimeUpdate[]>([]);
  const latencyTrackerRef = useRef<Map<string, number>>(new Map());
  const performanceStatsRef = useRef({
    messagesReceived: 0,
    messagesPerSecond: 0,
    lastSecondStart: Date.now(),
    lastSecondCount: 0
  });
  
  // Connection effect
  useEffect(() => {
    if (config.autoReconnect) {
      connect();
    }
    
    return () => {
      cleanup();
    };
  }, []);
  
  // Sport change effect - update subscriptions
  useEffect(() => {
    if (state.isConnected && state.subscriptions.size > 0) {
      // Re-subscribe with new sport context
      const channels = Array.from(state.subscriptions);
      unsubscribeFromUpdates(channels);
      subscribeToUpdates(channels);
    }
  }, [currentSport]);
  
  // Connect to WebSocket
  const connect = useCallback(async (): Promise<void> => {
    if (wsRef.current?.readyState === WebSocket.OPEN) return;
    
    setState(prev => ({ 
      ...prev, 
      connectionState: 'connecting', 
      error: null 
    }));
    
    try {
      const ws = new WebSocket(WS_ENDPOINT);
      wsRef.current = ws;
      
      ws.onopen = handleOpen;
      ws.onmessage = handleMessage;
      ws.onclose = handleClose;
      ws.onerror = handleError;
      
      if (config.debugMode) {
        console.log('Attempting WebSocket connection to:', WS_ENDPOINT);
      }
    } catch (error) {
      handleError(error);
    }
  }, [config]);
  
  // Handle WebSocket open
  const handleOpen = useCallback(() => {
    setState(prev => ({
      ...prev,
      isConnected: true,
      connectionState: 'connected',
      lastConnected: new Date(),
      reconnectAttempts: 0,
      error: null
    }));
    
    // Start heartbeat
    startHeartbeat();
    
    // Send initial authentication/configuration
    sendMessage({
      type: 'authenticate',
      data: {
        sport: currentSport,
        features: ['live_scores', 'player_stats', 'game_events'],
        compression: config.compressionEnabled
      }
    });
    
    if (config.debugMode) {
      console.log('WebSocket connected successfully');
    }
  }, [currentSport, config]);
  
  // Handle WebSocket message
  const handleMessage = useCallback((event: MessageEvent) => {
    try {
      const message: WebSocketMessage = JSON.parse(event.data);
      
      // Track latency if this is a pong response
      if (message.type === 'pong' && message.id) {
        const sentTime = latencyTrackerRef.current.get(message.id);
        if (sentTime) {
          const latency = Date.now() - sentTime;
          setState(prev => ({ ...prev, latency }));
          latencyTrackerRef.current.delete(message.id);
        }
      }
      
      // Update performance stats
      updatePerformanceStats();
      
      // Process data messages
      if (message.type === 'data' && message.data) {
        processDataUpdate(message.data);
      }
      
      // Handle errors
      if (message.type === 'error') {
        setState(prev => ({ 
          ...prev, 
          error: message.data?.message || 'Unknown error'
        }));
      }
      
    } catch (error) {
      console.error('Failed to parse WebSocket message:', error);
    }
  }, []);
  
  // Handle WebSocket close
  const handleClose = useCallback((event: CloseEvent) => {
    setState(prev => ({
      ...prev,
      isConnected: false,
      connectionState: event.wasClean ? 'disconnected' : 'error'
    }));
    
    clearHeartbeat();
    wsRef.current = null;
    
    // Attempt reconnection if enabled
    if (config.autoReconnect && state.reconnectAttempts < config.maxReconnectAttempts) {
      setState(prev => ({
        ...prev,
        connectionState: 'reconnecting',
        reconnectAttempts: prev.reconnectAttempts + 1
      }));
      
      reconnectTimeoutRef.current = setTimeout(() => {
        connect();
      }, config.reconnectInterval);
      
      if (config.debugMode) {
        console.log(`Reconnecting in ${config.reconnectInterval}ms (attempt ${state.reconnectAttempts + 1})`);
      }
    }
  }, [config, state.reconnectAttempts]);
  
  // Handle WebSocket error
  const handleError = useCallback((error: any) => {
    const errorMessage = error instanceof Event ? 'WebSocket connection failed' : error.message;
    
    setState(prev => ({
      ...prev,
      connectionState: 'error',
      error: errorMessage
    }));
    
    if (config.debugMode) {
      console.error('WebSocket error:', error);
    }
  }, [config]);
  
  // Process data updates
  const processDataUpdate = useCallback((data: any) => {
    const update: RealTimeUpdate = {
      id: data.id || generateId(),
      type: data.type,
      sport: data.sport || currentSport,
      gameId: data.gameId,
      playerId: data.playerId,
      teamId: data.teamId,
      timestamp: new Date(data.timestamp || Date.now()),
      data: data.payload || data,
      source: data.source || 'websocket',
      reliability: data.reliability || 1.0
    };
    
    // Add to queue
    updateQueueRef.current.push(update);
    
    // Process queue if batch processing is disabled or queue is full
    if (!config.batchUpdates || updateQueueRef.current.length >= config.batchSize) {
      processUpdateQueue();
    }
    
    setState(prev => ({
      ...prev,
      updateCount: prev.updateCount + 1,
      queueSize: updateQueueRef.current.length,
      lastUpdate: new Date()
    }));
  }, [currentSport, config]);
  
  // Process update queue
  const processUpdateQueue = useCallback(() => {
    const updates = updateQueueRef.current.splice(0);
    if (updates.length === 0) return;
    
    // Sort updates by priority if enabled
    if (config.prioritizeUpdates) {
      updates.sort((a, b) => {
        const aPriority = getUpdatePriority(a);
        const bPriority = getUpdatePriority(b);
        return bPriority - aPriority;
      });
    }
    
    // Group updates by type and process
    const groupedUpdates = groupUpdatesByType(updates);
    
    Object.entries(groupedUpdates).forEach(([type, typeUpdates]) => {
      switch (type) {
        case 'score':
          processScoreUpdates(typeUpdates);
          break;
        case 'stat':
          processStatUpdates(typeUpdates);
          break;
        case 'event':
          processEventUpdates(typeUpdates);
          break;
        case 'injury':
          processInjuryUpdates(typeUpdates);
          break;
        default:
          processGenericUpdates(typeUpdates);
      }
    });
    
    // Update recent updates list
    setRecentUpdates(prev => {
      const combined = [...updates, ...prev];
      return combined.slice(0, config.bufferSize);
    });
    
    // Update analytics data store
    updateAnalyticsData({
      sport: currentSport,
      timestamp: Date.now(),
      updates: updates
    });
    
    setState(prev => ({
      ...prev,
      queueSize: updateQueueRef.current.length
    }));
  }, [config, currentSport, updateAnalyticsData]);
  
  // Start heartbeat
  const startHeartbeat = useCallback(() => {
    heartbeatIntervalRef.current = setInterval(() => {
      if (wsRef.current?.readyState === WebSocket.OPEN) {
        const pingId = generateId();
        latencyTrackerRef.current.set(pingId, Date.now());
        
        sendMessage({
          type: 'ping',
          id: pingId,
          timestamp: new Date()
        });
      }
    }, config.heartbeatInterval);
  }, [config]);
  
  // Clear heartbeat
  const clearHeartbeat = useCallback(() => {
    if (heartbeatIntervalRef.current) {
      clearInterval(heartbeatIntervalRef.current);
    }
  }, []);
  
  // Send message via WebSocket
  const sendMessage = useCallback((message: any) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      const wsMessage: WebSocketMessage = {
        type: message.type,
        channel: message.channel,
        data: message.data || message,
        timestamp: new Date(),
        id: message.id || generateId()
      };
      
      wsRef.current.send(JSON.stringify(wsMessage));
      
      if (config.debugMode) {
        console.log('Sent WebSocket message:', wsMessage);
      }
    } else {
      console.warn('Cannot send message - WebSocket not connected');
    }
  }, [config]);
  
  // Subscribe to updates
  const subscribeToUpdates = useCallback((channels: string[]) => {
    channels.forEach(channel => {
      state.subscriptions.add(channel);
      
      sendMessage({
        type: 'subscribe',
        channel: channel,
        data: {
          sport: currentSport,
          filters: getChannelFilters(channel)
        }
      });
    });
    
    setState(prev => ({
      ...prev,
      subscriptions: new Set([...prev.subscriptions, ...channels])
    }));
    
    if (config.debugMode) {
      console.log('Subscribed to channels:', channels);
    }
  }, [state.subscriptions, currentSport, config]);
  
  // Unsubscribe from updates
  const unsubscribeFromUpdates = useCallback((channels: string[]) => {
    channels.forEach(channel => {
      state.subscriptions.delete(channel);
      
      sendMessage({
        type: 'unsubscribe',
        channel: channel
      });
    });
    
    setState(prev => {
      const newSubscriptions = new Set(prev.subscriptions);
      channels.forEach(channel => newSubscriptions.delete(channel));
      return { ...prev, subscriptions: newSubscriptions };
    });
    
    if (config.debugMode) {
      console.log('Unsubscribed from channels:', channels);
    }
  }, [state.subscriptions, config]);
  
  // Disconnect WebSocket
  const disconnect = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
    }
    
    clearHeartbeat();
    
    if (wsRef.current) {
      wsRef.current.close(1000, 'Manual disconnect');
      wsRef.current = null;
    }
    
    setState(prev => ({
      ...prev,
      isConnected: false,
      connectionState: 'disconnected',
      subscriptions: new Set(),
      error: null
    }));
    
    if (config.debugMode) {
      console.log('WebSocket disconnected manually');
    }
  }, [config]);
  
  // Update configuration
  const updateConfig = useCallback((newConfig: Partial<RealTimeConfig>) => {
    Object.assign(config, newConfig);
    
    // Restart heartbeat if interval changed
    if (newConfig.heartbeatInterval && state.isConnected) {
      clearHeartbeat();
      startHeartbeat();
    }
  }, [config, state.isConnected]);
  
  // Get connection statistics
  const getConnectionStats = useCallback(() => {
    const stats = performanceStatsRef.current;
    
    return {
      isConnected: state.isConnected,
      connectionState: state.connectionState,
      uptime: state.lastConnected ? Date.now() - state.lastConnected.getTime() : 0,
      latency: state.latency,
      throughput: state.throughput,
      messagesReceived: stats.messagesReceived,
      messagesPerSecond: stats.messagesPerSecond,
      reconnectAttempts: state.reconnectAttempts,
      subscriptions: Array.from(state.subscriptions),
      queueSize: state.queueSize,
      lastUpdate: state.lastUpdate,
      error: state.error
    };
  }, [state]);
  
  // Cleanup function
  const cleanup = useCallback(() => {
    disconnect();
    
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
    }
    
    updateQueueRef.current = [];
    latencyTrackerRef.current.clear();
  }, [disconnect]);
  
  // Update performance statistics
  const updatePerformanceStats = useCallback(() => {
    const stats = performanceStatsRef.current;
    const now = Date.now();
    
    stats.messagesReceived++;
    stats.lastSecondCount++;
    
    if (now - stats.lastSecondStart >= 1000) {
      stats.messagesPerSecond = stats.lastSecondCount;
      stats.lastSecondCount = 0;
      stats.lastSecondStart = now;
      
      setState(prev => ({
        ...prev,
        throughput: stats.messagesPerSecond
      }));
    }
  }, []);
  
  // Get connection status string
  const getConnectionStatus = useCallback((): string => {
    switch (state.connectionState) {
      case 'connected':
        return `Connected (${state.latency}ms)`;
      case 'connecting':
        return 'Connecting...';
      case 'reconnecting':
        return `Reconnecting (${state.reconnectAttempts}/${config.maxReconnectAttempts})`;
      case 'error':
        return `Error: ${state.error}`;
      case 'disconnected':
      default:
        return 'Disconnected';
    }
  }, [state, config]);
  
  return {
    // Connection state
    isConnected: state.isConnected,
    connectionState: state.connectionState,
    connectionStatus: getConnectionStatus(),
    latency: state.latency,
    throughput: state.throughput,
    error: state.error,
    
    // Data
    realTimeData,
    liveGames,
    recentUpdates,
    
    // Actions
    connect,
    disconnect,
    subscribeToUpdates,
    unsubscribeFromUpdates,
    sendMessage,
    
    // Configuration
    updateConfig,
    getConnectionStats
  };
}

// Helper functions
function generateId(): string {
  return Math.random().toString(36).substr(2, 9);
}

function getUpdatePriority(update: RealTimeUpdate): number {
  // Higher numbers = higher priority
  switch (update.type) {
    case 'score': return 10;
    case 'injury': return 9;
    case 'event': return 7;
    case 'stat': return 5;
    case 'substitution': return 6;
    case 'penalty': return 6;
    default: return 1;
  }
}

function groupUpdatesByType(updates: RealTimeUpdate[]): Record<string, RealTimeUpdate[]> {
  return updates.reduce((groups, update) => {
    const type = update.type;
    if (!groups[type]) {
      groups[type] = [];
    }
    groups[type].push(update);
    return groups;
  }, {} as Record<string, RealTimeUpdate[]>);
}

function getChannelFilters(channel: string): Record<string, any> {
  switch (channel) {
    case 'live_scores':
      return { includeInProgress: true, includeFinal: false };
    case 'player_stats':
      return { includeAdvanced: true, realTimeOnly: true };
    case 'game_events':
      return { includeMinor: false, priority: 'high' };
    default:
      return {};
  }
}

function processScoreUpdates(updates: RealTimeUpdate[]) {
  // Process score updates
  updates.forEach(update => {
    if (update.gameId && update.data) {
      // Update live game data
      // This would typically update a global store or trigger callbacks
    }
  });
}

function processStatUpdates(updates: RealTimeUpdate[]) {
  // Process statistical updates
  updates.forEach(update => {
    if (update.playerId && update.data) {
      // Update player statistics
      // This would typically update player data in store
    }
  });
}

function processEventUpdates(updates: RealTimeUpdate[]) {
  // Process game events
  updates.forEach(update => {
    if (update.gameId && update.data) {
      // Process significant game events
      // This might trigger notifications or UI updates
    }
  });
}

function processInjuryUpdates(updates: RealTimeUpdate[]) {
  // Process injury reports
  updates.forEach(update => {
    if (update.playerId && update.data) {
      // Handle injury updates with high priority
      // This might trigger alerts or roster updates
    }
  });
}

function processGenericUpdates(updates: RealTimeUpdate[]) {
  // Process generic updates
  updates.forEach(update => {
    // Handle other types of updates
  });
}
