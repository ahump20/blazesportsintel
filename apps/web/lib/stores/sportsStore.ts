/**
 * Blaze Intelligence Global State Store
 * Zustand-powered state management for 3D sports analytics
 */

import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';
import { Vector3 } from 'three';
import type {
  Player3DData,
  Field3D,
  Analytics3D,
  GameEvent,
  Trajectory,
  HeatZone,
  WSMessage,
  TenantConfig,
  PerformanceMetrics
} from '../../types/3d.types';

interface SportsStore {
  // Current sport and view
  currentSport: 'MLB' | 'NFL' | 'NBA' | 'NCAA';
  currentView: 'field' | 'analytics' | 'player' | 'replay';
  currentTeam: string;

  // 3D Data
  players: Map<string, Player3DData>;
  field: Field3D | null;
  analytics: Analytics3D[];
  trajectories: Trajectory[];
  heatZones: HeatZone[];
  events: GameEvent[];

  // Real-time connection
  wsConnected: boolean;
  wsLatency: number;
  lastUpdate: number;
  messageQueue: WSMessage[];

  // Performance
  performanceMetrics: PerformanceMetrics;
  qualityMode: 'low' | 'medium' | 'high' | 'ultra';

  // Multi-tenant
  tenant: TenantConfig | null;

  // Camera
  cameraPosition: Vector3;
  cameraTarget: Vector3;
  cameraPreset: string;

  // UI State
  selectedPlayer: string | null;
  selectedEvent: string | null;
  timeRange: [number, number];
  playbackSpeed: number;
  isPaused: boolean;
  showStats: boolean;
  showHeatmap: boolean;
  showTrajectories: boolean;
  showBiometrics: boolean;

  // Actions
  setSport: (sport: 'MLB' | 'NFL' | 'NBA' | 'NCAA') => void;
  setView: (view: 'field' | 'analytics' | 'player' | 'replay') => void;
  setTeam: (team: string) => void;

  // Player actions
  updatePlayer: (id: string, data: Partial<Player3DData>) => void;
  updatePlayers: (players: Player3DData[]) => void;
  selectPlayer: (id: string | null) => void;

  // Field actions
  updateField: (field: Field3D) => void;
  addHeatZone: (zone: HeatZone) => void;
  updateHeatZones: (zones: HeatZone[]) => void;

  // Trajectory actions
  addTrajectory: (trajectory: Trajectory) => void;
  updateTrajectory: (id: string, data: Partial<Trajectory>) => void;
  clearTrajectories: () => void;

  // Event actions
  addEvent: (event: GameEvent) => void;
  selectEvent: (id: string | null) => void;

  // WebSocket actions
  setWsConnected: (connected: boolean) => void;
  setWsLatency: (latency: number) => void;
  queueMessage: (message: WSMessage) => void;
  processMessageQueue: () => void;

  // Performance actions
  updatePerformanceMetrics: (metrics: Partial<PerformanceMetrics>) => void;
  setQualityMode: (mode: 'low' | 'medium' | 'high' | 'ultra') => void;

  // Camera actions
  setCameraPosition: (position: Vector3) => void;
  setCameraTarget: (target: Vector3) => void;
  setCameraPreset: (preset: string) => void;

  // Playback actions
  setTimeRange: (range: [number, number]) => void;
  setPlaybackSpeed: (speed: number) => void;
  togglePause: () => void;

  // UI toggles
  toggleStats: () => void;
  toggleHeatmap: () => void;
  toggleTrajectories: () => void;
  toggleBiometrics: () => void;

  // Tenant actions
  setTenant: (config: TenantConfig) => void;

  // Utility
  reset: () => void;
}

// Initial state
const initialState = {
  currentSport: 'MLB' as const,
  currentView: 'field' as const,
  currentTeam: 'Cardinals',
  players: new Map(),
  field: null,
  analytics: [],
  trajectories: [],
  heatZones: [],
  events: [],
  wsConnected: false,
  wsLatency: 0,
  lastUpdate: Date.now(),
  messageQueue: [],
  performanceMetrics: {
    fps: 60,
    frameTime: 16.67,
    drawCalls: 0,
    triangles: 0,
    points: 0,
    memory: 0,
    latency: 0
  },
  qualityMode: 'high' as const,
  tenant: null,
  cameraPosition: new Vector3(100, 100, 100),
  cameraTarget: new Vector3(0, 0, 0),
  cameraPreset: 'default',
  selectedPlayer: null,
  selectedEvent: null,
  timeRange: [0, 100] as [number, number],
  playbackSpeed: 1,
  isPaused: false,
  showStats: true,
  showHeatmap: true,
  showTrajectories: true,
  showBiometrics: false
};

export const useSportsStore = create<SportsStore>()(
  subscribeWithSelector((set, get) => ({
    ...initialState,

    // Sport and view management
    setSport: (sport) => set({
      currentSport: sport,
      players: new Map(),
      trajectories: [],
      events: []
    }),

    setView: (view) => set({ currentView: view }),
    setTeam: (team) => set({ currentTeam: team }),

    // Player management
    updatePlayer: (id, data) => set((state) => {
      const players = new Map(state.players);
      const existing = players.get(id);
      if (existing) {
        players.set(id, { ...existing, ...data });
      } else {
        players.set(id, data as Player3DData);
      }
      return { players, lastUpdate: Date.now() };
    }),

    updatePlayers: (playersList) => set(() => {
      const players = new Map();
      playersList.forEach(p => players.set(p.id, p));
      return { players, lastUpdate: Date.now() };
    }),

    selectPlayer: (id) => set({ selectedPlayer: id }),

    // Field management
    updateField: (field) => set({ field, lastUpdate: Date.now() }),

    addHeatZone: (zone) => set((state) => ({
      heatZones: [...state.heatZones, zone],
      lastUpdate: Date.now()
    })),

    updateHeatZones: (zones) => set({ heatZones: zones, lastUpdate: Date.now() }),

    // Trajectory management
    addTrajectory: (trajectory) => set((state) => ({
      trajectories: [...state.trajectories.slice(-99), trajectory], // Keep last 100
      lastUpdate: Date.now()
    })),

    updateTrajectory: (id, data) => set((state) => ({
      trajectories: state.trajectories.map(t =>
        t.id === id ? { ...t, ...data } : t
      ),
      lastUpdate: Date.now()
    })),

    clearTrajectories: () => set({ trajectories: [] }),

    // Event management
    addEvent: (event) => set((state) => ({
      events: [...state.events.slice(-499), event], // Keep last 500
      lastUpdate: Date.now()
    })),

    selectEvent: (id) => set({ selectedEvent: id }),

    // WebSocket management
    setWsConnected: (connected) => set({ wsConnected: connected }),
    setWsLatency: (latency) => set({ wsLatency: latency }),

    queueMessage: (message) => set((state) => ({
      messageQueue: [...state.messageQueue, message]
    })),

    processMessageQueue: () => set((state) => {
      // Process all queued messages
      const messages = state.messageQueue;
      messages.forEach(msg => {
        // Handle different message types
        switch(msg.type) {
          case 'update':
            // Update players, field, etc.
            break;
          case 'event':
            // Add event
            break;
          case 'stats':
            // Update stats
            break;
          case 'biometric':
            // Update biometric data
            break;
        }
      });
      return { messageQueue: [], lastUpdate: Date.now() };
    }),

    // Performance management
    updatePerformanceMetrics: (metrics) => set((state) => ({
      performanceMetrics: { ...state.performanceMetrics, ...metrics }
    })),

    setQualityMode: (mode) => set({ qualityMode: mode }),

    // Camera management
    setCameraPosition: (position) => set({ cameraPosition: position }),
    setCameraTarget: (target) => set({ cameraTarget: target }),
    setCameraPreset: (preset) => set({ cameraPreset: preset }),

    // Playback management
    setTimeRange: (range) => set({ timeRange: range }),
    setPlaybackSpeed: (speed) => set({ playbackSpeed: speed }),
    togglePause: () => set((state) => ({ isPaused: !state.isPaused })),

    // UI toggles
    toggleStats: () => set((state) => ({ showStats: !state.showStats })),
    toggleHeatmap: () => set((state) => ({ showHeatmap: !state.showHeatmap })),
    toggleTrajectories: () => set((state) => ({ showTrajectories: !state.showTrajectories })),
    toggleBiometrics: () => set((state) => ({ showBiometrics: !state.showBiometrics })),

    // Tenant management
    setTenant: (config) => set({ tenant: config }),

    // Reset
    reset: () => set(initialState)
  }))
);

// Performance monitoring subscription
useSportsStore.subscribe(
  (state) => state.performanceMetrics,
  (metrics) => {
    // Log performance issues
    if (metrics.fps < 30) {
      console.warn('Low FPS detected:', metrics.fps);
    }
    if (metrics.latency > 100) {
      console.warn('High latency detected:', metrics.latency);
    }
  }
);