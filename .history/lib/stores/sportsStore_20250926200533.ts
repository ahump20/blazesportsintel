/**
 * Blaze Sports Intelligence - Sports Store
 * Championship Intelligence Platform - State Management
 * The Deep South's Sports Intelligence Hub
 */

import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';
import { 
  SportType, 
  VisionAIMode, 
  PerformanceMetrics,
  RealTimeUpdate,
  LiveGameData
} from '@/types/sports.types';
import { 
  ChampionshipIntelligence,
  DeepSouthAuthority,
  EliteAnalytics,
  ChampionshipMetallics,
  PerformanceOptimization
} from '@/types/analytics.types';

// Sports store state interface
interface SportsStoreState {
  // Current sport and mode
  currentSport: SportType;
  visionAIMode: VisionAIMode;
  
  // Analytics data
  analyticsData: Record<string, any>;
  championshipData: ChampionshipIntelligence | null;
  deepSouthAuthority: DeepSouthAuthority | null;
  eliteAnalytics: EliteAnalytics | null;
  championshipMetallics: ChampionshipMetallics | null;
  performanceOptimization: PerformanceOptimization | null;
  
  // Real-time data
  realTimeData: Record<string, any>;
  liveGames: Map<string, LiveGameData>;
  recentUpdates: RealTimeUpdate[];
  
  // Performance metrics
  performanceMetrics: PerformanceMetrics;
  
  // UI state
  isLoading: boolean;
  error: string | null;
  lastUpdated: Date | null;
  
  // Configuration
  config: {
    autoRefresh: boolean;
    refreshInterval: number;
    enableRealTimeUpdates: boolean;
    enableVisionAI: boolean;
    enable3DGraphics: boolean;
    performanceMode: 'development' | 'production' | 'championship';
  };
}

// Sports store actions interface
interface SportsStoreActions {
  // Sport and mode management
  setCurrentSport: (sport: SportType) => void;
  setVisionAIMode: (mode: VisionAIMode) => void;
  
  // Data management
  updateAnalyticsData: (data: any) => void;
  updateChampionshipData: (data: ChampionshipIntelligence) => void;
  updateDeepSouthAuthority: (data: DeepSouthAuthority) => void;
  updateEliteAnalytics: (data: EliteAnalytics) => void;
  updateChampionshipMetallics: (data: ChampionshipMetallics) => void;
  updatePerformanceOptimization: (data: PerformanceOptimization) => void;
  
  // Real-time data management
  updateRealTimeData: (data: any) => void;
  addLiveGame: (gameId: string, gameData: LiveGameData) => void;
  updateLiveGame: (gameId: string, updates: Partial<LiveGameData>) => void;
  removeLiveGame: (gameId: string) => void;
  addRealTimeUpdate: (update: RealTimeUpdate) => void;
  clearRecentUpdates: () => void;
  
  // Performance metrics
  updatePerformanceMetrics: (metrics: Partial<PerformanceMetrics>) => void;
  
  // UI state management
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  clearError: () => void;
  
  // Configuration management
  updateConfig: (config: Partial<SportsStoreState['config']>) => void;
  
  // Utility actions
  reset: () => void;
  exportState: () => string;
  importState: (state: string) => void;
}

// Combined store interface
type SportsStore = SportsStoreState & SportsStoreActions;

// Default state
const defaultState: SportsStoreState = {
  currentSport: 'mlb',
  visionAIMode: 'inactive',
  
  analyticsData: {},
  championshipData: null,
  deepSouthAuthority: null,
  eliteAnalytics: null,
  championshipMetallics: null,
  performanceOptimization: null,
  
  realTimeData: {},
  liveGames: new Map(),
  recentUpdates: [],
  
  performanceMetrics: {
    fps: 60,
    frameTime: 16.67,
    memoryUsage: 0,
    renderTime: 0,
    updateTime: 0
  },
  
  isLoading: false,
  error: null,
  lastUpdated: null,
  
  config: {
    autoRefresh: true,
    refreshInterval: 30000,
    enableRealTimeUpdates: true,
    enableVisionAI: true,
    enable3DGraphics: true,
    performanceMode: 'championship'
  }
};

// Create the sports store
export const useSportsStore = create<SportsStore>()(
  subscribeWithSelector((set, get) => ({
    ...defaultState,
    
    // Sport and mode management
    setCurrentSport: (sport: SportType) => {
      set({ currentSport: sport, lastUpdated: new Date() });
      
      // Emit sport change event
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('sportChanged', { detail: { sport } }));
      }
    },
    
    setVisionAIMode: (mode: VisionAIMode) => {
      set({ visionAIMode: mode, lastUpdated: new Date() });
      
      // Emit mode change event
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('visionAIModeChanged', { detail: { mode } }));
      }
    },
    
    // Data management
    updateAnalyticsData: (data: any) => {
      set((state) => ({
        analyticsData: { ...state.analyticsData, ...data },
        lastUpdated: new Date()
      }));
    },
    
    updateChampionshipData: (data: ChampionshipIntelligence) => {
      set({ championshipData: data, lastUpdated: new Date() });
      
      // Emit championship data update event
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('championshipDataUpdated', { detail: { data } }));
      }
    },
    
    updateDeepSouthAuthority: (data: DeepSouthAuthority) => {
      set({ deepSouthAuthority: data, lastUpdated: new Date() });
    },
    
    updateEliteAnalytics: (data: EliteAnalytics) => {
      set({ eliteAnalytics: data, lastUpdated: new Date() });
    },
    
    updateChampionshipMetallics: (data: ChampionshipMetallics) => {
      set({ championshipMetallics: data, lastUpdated: new Date() });
    },
    
    updatePerformanceOptimization: (data: PerformanceOptimization) => {
      set({ performanceOptimization: data, lastUpdated: new Date() });
    },
    
    // Real-time data management
    updateRealTimeData: (data: any) => {
      set((state) => ({
        realTimeData: { ...state.realTimeData, ...data },
        lastUpdated: new Date()
      }));
    },
    
    addLiveGame: (gameId: string, gameData: LiveGameData) => {
      set((state) => {
        const newLiveGames = new Map(state.liveGames);
        newLiveGames.set(gameId, gameData);
        return { liveGames: newLiveGames, lastUpdated: new Date() };
      });
    },
    
    updateLiveGame: (gameId: string, updates: Partial<LiveGameData>) => {
      set((state) => {
        const newLiveGames = new Map(state.liveGames);
        const existingGame = newLiveGames.get(gameId);
        if (existingGame) {
          newLiveGames.set(gameId, { ...existingGame, ...updates, lastUpdated: new Date() });
        }
        return { liveGames: newLiveGames, lastUpdated: new Date() };
      });
    },
    
    removeLiveGame: (gameId: string) => {
      set((state) => {
        const newLiveGames = new Map(state.liveGames);
        newLiveGames.delete(gameId);
        return { liveGames: newLiveGames, lastUpdated: new Date() };
      });
    },
    
    addRealTimeUpdate: (update: RealTimeUpdate) => {
      set((state) => ({
        recentUpdates: [update, ...state.recentUpdates.slice(0, 99)], // Keep last 100 updates
        lastUpdated: new Date()
      }));
      
      // Emit real-time update event
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('realTimeUpdate', { detail: { update } }));
      }
    },
    
    clearRecentUpdates: () => {
      set({ recentUpdates: [], lastUpdated: new Date() });
    },
    
    // Performance metrics
    updatePerformanceMetrics: (metrics: Partial<PerformanceMetrics>) => {
      set((state) => ({
        performanceMetrics: { ...state.performanceMetrics, ...metrics },
        lastUpdated: new Date()
      }));
    },
    
    // UI state management
    setLoading: (loading: boolean) => {
      set({ isLoading: loading });
    },
    
    setError: (error: string | null) => {
      set({ error, lastUpdated: new Date() });
      
      // Emit error event
      if (typeof window !== 'undefined' && error) {
        window.dispatchEvent(new CustomEvent('sportsStoreError', { detail: { error } }));
      }
    },
    
    clearError: () => {
      set({ error: null, lastUpdated: new Date() });
    },
    
    // Configuration management
    updateConfig: (config: Partial<SportsStoreState['config']>) => {
      set((state) => ({
        config: { ...state.config, ...config },
        lastUpdated: new Date()
      }));
    },
    
    // Utility actions
    reset: () => {
      set(defaultState);
      
      // Emit reset event
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('sportsStoreReset'));
      }
    },
    
    exportState: () => {
      const state = get();
      const exportData = {
        currentSport: state.currentSport,
        visionAIMode: state.visionAIMode,
        analyticsData: state.analyticsData,
        championshipData: state.championshipData,
        config: state.config,
        lastUpdated: state.lastUpdated
      };
      
      return JSON.stringify(exportData, null, 2);
    },
    
    importState: (stateString: string) => {
      try {
        const importedState = JSON.parse(stateString);
        
        set((state) => ({
          ...state,
          currentSport: importedState.currentSport || state.currentSport,
          visionAIMode: importedState.visionAIMode || state.visionAIMode,
          analyticsData: importedState.analyticsData || state.analyticsData,
          championshipData: importedState.championshipData || state.championshipData,
          config: { ...state.config, ...importedState.config },
          lastUpdated: new Date()
        }));
        
        // Emit import event
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('sportsStoreImported', { detail: { importedState } }));
        }
      } catch (error) {
        console.error('Failed to import state:', error);
        get().setError('Failed to import state: Invalid JSON');
      }
    }
  }))
);

// Selector hooks for specific parts of the store
export const useCurrentSport = () => useSportsStore((state) => state.currentSport);
export const useVisionAIMode = () => useSportsStore((state) => state.visionAIMode);
export const useAnalyticsData = () => useSportsStore((state) => state.analyticsData);
export const useChampionshipData = () => useSportsStore((state) => state.championshipData);
export const useRealTimeData = () => useSportsStore((state) => state.realTimeData);
export const useLiveGames = () => useSportsStore((state) => state.liveGames);
export const useRecentUpdates = () => useSportsStore((state) => state.recentUpdates);
export const usePerformanceMetrics = () => useSportsStore((state) => state.performanceMetrics);
export const useIsLoading = () => useSportsStore((state) => state.isLoading);
export const useError = () => useSportsStore((state) => state.error);
export const useConfig = () => useSportsStore((state) => state.config);

// Action hooks
export const useSportsActions = () => useSportsStore((state) => ({
  setCurrentSport: state.setCurrentSport,
  setVisionAIMode: state.setVisionAIMode,
  updateAnalyticsData: state.updateAnalyticsData,
  updateChampionshipData: state.updateChampionshipData,
  updateRealTimeData: state.updateRealTimeData,
  addLiveGame: state.addLiveGame,
  updateLiveGame: state.updateLiveGame,
  removeLiveGame: state.removeLiveGame,
  addRealTimeUpdate: state.addRealTimeUpdate,
  clearRecentUpdates: state.clearRecentUpdates,
  updatePerformanceMetrics: state.updatePerformanceMetrics,
  setLoading: state.setLoading,
  setError: state.setError,
  clearError: state.clearError,
  updateConfig: state.updateConfig,
  reset: state.reset,
  exportState: state.exportState,
  importState: state.importState
}));

// Subscription hooks for real-time updates
export const useSportsStoreSubscription = (
  selector: (state: SportsStore) => any,
  callback: (value: any, previousValue: any) => void
) => {
  return useSportsStore.subscribe(selector, callback);
};

// Persistence middleware
export const persistSportsStore = () => {
  const STORAGE_KEY = 'blaze-sports-store';
  
  // Load from localStorage on initialization
  if (typeof window !== 'undefined') {
    const savedState = localStorage.getItem(STORAGE_KEY);
    if (savedState) {
      try {
        useSportsStore.getState().importState(savedState);
      } catch (error) {
        console.error('Failed to load persisted state:', error);
      }
    }
  }
  
  // Subscribe to changes and save to localStorage
  useSportsStore.subscribe(
    (state) => ({
      currentSport: state.currentSport,
      visionAIMode: state.visionAIMode,
      config: state.config,
      analyticsData: state.analyticsData,
      championshipData: state.championshipData
    }),
    (state) => {
      if (typeof window !== 'undefined') {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
      }
    }
  );
};

// Initialize persistence
if (typeof window !== 'undefined') {
  persistSportsStore();
}

// Export the store for direct access if needed
export default useSportsStore;
