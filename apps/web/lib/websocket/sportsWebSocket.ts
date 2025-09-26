/**
 * Blaze Intelligence WebSocket Manager
 * Real-time data streaming with sub-100ms latency
 */

import { io, Socket } from 'socket.io-client';
import { useSportsStore } from '../stores/sportsStore';
import type { WSMessage, Player3DData, GameEvent, Trajectory } from '../../types/3d.types';

interface WebSocketConfig {
  url: string;
  reconnection: boolean;
  reconnectionDelay: number;
  reconnectionAttempts: number;
  transports: string[];
  auth?: Record<string, any>;
}

class SportsWebSocketManager {
  private socket: Socket | null = null;
  private pingInterval: NodeJS.Timeout | null = null;
  private messageBuffer: WSMessage[] = [];
  private bufferTimer: NodeJS.Timeout | null = null;
  private lastSequence: number = 0;
  private missedSequences: Set<number> = new Set();
  private reconnectAttempts: number = 0;

  constructor() {
    this.initializeSocket();
  }

  private getConfig(): WebSocketConfig {
    const isDev = process.env.NODE_ENV === 'development';
    return {
      url: isDev
        ? 'ws://localhost:3001'
        : 'wss://blazesportsintel.com/ws',
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionAttempts: 5,
      transports: ['websocket', 'polling'],
      auth: {
        tenant: useSportsStore.getState().tenant?.id,
        sports: ['MLB', 'NFL', 'NBA', 'NCAA']
      }
    };
  }

  public initializeSocket(): void {
    const config = this.getConfig();

    this.socket = io(config.url, {
      reconnection: config.reconnection,
      reconnectionDelay: config.reconnectionDelay,
      reconnectionAttempts: config.reconnectionAttempts,
      transports: config.transports,
      auth: config.auth
    });

    this.setupEventHandlers();
    this.startPingInterval();
  }

  private setupEventHandlers(): void {
    if (!this.socket) return;

    // Connection events
    this.socket.on('connect', () => {
      console.log('WebSocket connected');
      useSportsStore.getState().setWsConnected(true);
      this.reconnectAttempts = 0;
      this.requestMissedMessages();
    });

    this.socket.on('disconnect', () => {
      console.log('WebSocket disconnected');
      useSportsStore.getState().setWsConnected(false);
    });

    this.socket.on('connect_error', (error) => {
      console.error('Connection error:', error);
      this.reconnectAttempts++;
      if (this.reconnectAttempts > 5) {
        this.fallbackToPolling();
      }
    });

    // Data events
    this.socket.on('player:update', (data: Player3DData[]) => {
      this.handlePlayerUpdate(data);
    });

    this.socket.on('event:new', (event: GameEvent) => {
      this.handleGameEvent(event);
    });

    this.socket.on('trajectory:add', (trajectory: Trajectory) => {
      this.handleTrajectory(trajectory);
    });

    this.socket.on('field:heatmap', (data: any) => {
      this.handleHeatmapUpdate(data);
    });

    this.socket.on('biometric:update', (data: any) => {
      this.handleBiometricUpdate(data);
    });

    this.socket.on('message', (message: WSMessage) => {
      this.handleMessage(message);
    });

    // Latency measurement
    this.socket.on('pong', (timestamp: number) => {
      const latency = Date.now() - timestamp;
      useSportsStore.getState().setWsLatency(latency);
    });

    // Error handling
    this.socket.on('error', (error) => {
      console.error('WebSocket error:', error);
      this.handleError(error);
    });
  }

  private handleMessage(message: WSMessage): void {
    // Check sequence for missed messages
    if (message.sequence > this.lastSequence + 1) {
      for (let seq = this.lastSequence + 1; seq < message.sequence; seq++) {
        this.missedSequences.add(seq);
      }
    }
    this.lastSequence = message.sequence;

    // Buffer messages for batch processing
    this.messageBuffer.push(message);

    if (!this.bufferTimer) {
      this.bufferTimer = setTimeout(() => {
        this.processBufferedMessages();
      }, 16); // Process every frame (60fps)
    }
  }

  private processBufferedMessages(): void {
    if (this.messageBuffer.length === 0) {
      this.bufferTimer = null;
      return;
    }

    const store = useSportsStore.getState();
    const messages = [...this.messageBuffer];
    this.messageBuffer = [];

    // Batch process messages by type
    const playerUpdates: Player3DData[] = [];
    const events: GameEvent[] = [];
    const trajectories: Trajectory[] = [];

    messages.forEach(msg => {
      switch (msg.type) {
        case 'update':
          if (msg.data.players) {
            playerUpdates.push(...msg.data.players);
          }
          break;
        case 'event':
          events.push(msg.data);
          break;
        case 'stats':
          // Handle stats updates
          break;
        case 'biometric':
          // Handle biometric updates
          break;
      }
    });

    // Apply batch updates
    if (playerUpdates.length > 0) {
      store.updatePlayers(playerUpdates);
    }

    events.forEach(event => store.addEvent(event));
    trajectories.forEach(traj => store.addTrajectory(traj));

    this.bufferTimer = null;
  }

  private handlePlayerUpdate(players: Player3DData[]): void {
    useSportsStore.getState().updatePlayers(players);
  }

  private handleGameEvent(event: GameEvent): void {
    useSportsStore.getState().addEvent(event);

    // Trigger particle effects for important events
    if (event.impact > 0.7) {
      this.triggerCelebration(event);
    }
  }

  private handleTrajectory(trajectory: Trajectory): void {
    useSportsStore.getState().addTrajectory(trajectory);
  }

  private handleHeatmapUpdate(data: any): void {
    const zones = this.processHeatmapData(data);
    useSportsStore.getState().updateHeatZones(zones);
  }

  private handleBiometricUpdate(data: any): void {
    const { playerId, biometrics } = data;
    const store = useSportsStore.getState();
    const player = store.players.get(playerId);

    if (player) {
      store.updatePlayer(playerId, {
        biometrics: biometrics,
        timestamp: Date.now()
      });
    }
  }

  private processHeatmapData(data: any): any[] {
    // Process raw heatmap data into HeatZone format
    return data.zones || [];
  }

  private triggerCelebration(event: GameEvent): void {
    // Trigger visual celebration effects
    console.log('Celebration triggered for:', event);
  }

  private handleError(error: any): void {
    console.error('WebSocket error:', error);

    // Implement exponential backoff for reconnection
    const backoff = Math.min(1000 * Math.pow(2, this.reconnectAttempts), 30000);
    setTimeout(() => {
      this.reconnect();
    }, backoff);
  }

  private fallbackToPolling(): void {
    console.warn('Falling back to polling mode');
    // Implement HTTP polling as fallback
    this.startPolling();
  }

  private startPolling(): void {
    setInterval(async () => {
      try {
        const response = await fetch('/api/live-data');
        const data = await response.json();
        this.handleMessage({
          type: 'update',
          sport: useSportsStore.getState().currentSport,
          data: data,
          timestamp: Date.now(),
          sequence: this.lastSequence++
        });
      } catch (error) {
        console.error('Polling error:', error);
      }
    }, 1000);
  }

  private requestMissedMessages(): void {
    if (this.missedSequences.size === 0) return;

    this.socket?.emit('request:missed', Array.from(this.missedSequences));
    this.missedSequences.clear();
  }

  private startPingInterval(): void {
    this.pingInterval = setInterval(() => {
      if (this.socket?.connected) {
        this.socket.emit('ping', Date.now());
      }
    }, 5000);
  }

  public subscribeToSport(sport: 'MLB' | 'NFL' | 'NBA' | 'NCAA'): void {
    this.socket?.emit('subscribe:sport', sport);
  }

  public subscribeToTeam(team: string): void {
    this.socket?.emit('subscribe:team', team);
  }

  public subscribeToPlayer(playerId: string): void {
    this.socket?.emit('subscribe:player', playerId);
  }

  public unsubscribe(channel: string): void {
    this.socket?.emit('unsubscribe', channel);
  }

  public requestReplay(timeRange: [number, number]): void {
    this.socket?.emit('request:replay', timeRange);
  }

  public sendCommand(command: string, data: any): void {
    this.socket?.emit('command', { command, data });
  }

  public reconnect(): void {
    this.disconnect();
    this.initializeSocket();
  }

  public disconnect(): void {
    if (this.pingInterval) {
      clearInterval(this.pingInterval);
      this.pingInterval = null;
    }

    if (this.bufferTimer) {
      clearTimeout(this.bufferTimer);
      this.bufferTimer = null;
    }

    this.socket?.disconnect();
    this.socket = null;
    useSportsStore.getState().setWsConnected(false);
  }

  public getSocket(): Socket | null {
    return this.socket;
  }

  public isConnected(): boolean {
    return this.socket?.connected || false;
  }

  public getLatency(): number {
    return useSportsStore.getState().wsLatency;
  }
}

// Singleton instance
const wsManager = new SportsWebSocketManager();

// React hook for WebSocket
export function useWebSocket() {
  const wsConnected = useSportsStore(state => state.wsConnected);
  const wsLatency = useSportsStore(state => state.wsLatency);

  return {
    connected: wsConnected,
    latency: wsLatency,
    subscribe: wsManager.subscribeToSport.bind(wsManager),
    subscribeToTeam: wsManager.subscribeToTeam.bind(wsManager),
    subscribeToPlayer: wsManager.subscribeToPlayer.bind(wsManager),
    unsubscribe: wsManager.unsubscribe.bind(wsManager),
    requestReplay: wsManager.requestReplay.bind(wsManager),
    sendCommand: wsManager.sendCommand.bind(wsManager),
    reconnect: wsManager.reconnect.bind(wsManager),
    disconnect: wsManager.disconnect.bind(wsManager)
  };
}

export default wsManager;