import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { RSISettings } from './indicatorRegistry';

export interface ChartState {
  // Chart preferences
  symbol: string;
  timeframe: string;
  exchange: string;
  theme: 'dark' | 'light';
  isLive: boolean;
  
  // Active indicators
  activeIndicators: string[];
  indicatorSettings: Record<string, any>;
  
  // UI state
  showIndicatorPanel: boolean;
  
  // Actions
  setSymbol: (symbol: string) => void;
  setTimeframe: (tf: string) => void;
  setExchange: (exchange: string) => void;
  setTheme: (theme: 'dark' | 'light') => void;
  setLive: (isLive: boolean) => void;
  
  addIndicator: (key: string, settings?: any) => void;
  removeIndicator: (key: string) => void;
  updateIndicatorSettings: (key: string, settings: any) => void;
  
  setShowIndicatorPanel: (show: boolean) => void;
  
  // Computed getters
  getRSISettings: () => RSISettings;
}

const DEFAULT_RSI_SETTINGS: RSISettings = {
  length: 14,
  source: 'close',
  mode: 'classic',
  ma: null,
  overbought: 70,
  oversold: 30,
};

export const useChartStore = create<ChartState>()(
  persist(
    (set, get) => ({
      // Initial state
      symbol: 'BTCUSDT',
      timeframe: '1m',
      exchange: 'Binance',
      theme: 'dark',
      isLive: true,
      
      activeIndicators: [],
      indicatorSettings: {},
      
      showIndicatorPanel: false,
      
      // Actions
      setSymbol: (symbol) => set({ symbol }),
      setTimeframe: (timeframe) => set({ timeframe }),
      setExchange: (exchange) => set({ exchange }),
      setTheme: (theme) => {
        set({ theme });
        // Also save to localStorage for compatibility
        localStorage.setItem('chartTheme', theme);
      },
      setLive: (isLive) => set({ isLive }),
      
      addIndicator: (key, settings) => set((state) => {
        if (state.activeIndicators.includes(key)) return state;
        
        return {
          activeIndicators: [...state.activeIndicators, key],
          indicatorSettings: {
            ...state.indicatorSettings,
            [key]: settings || (key === 'RSI' ? DEFAULT_RSI_SETTINGS : {}),
          },
        };
      }),
      
      removeIndicator: (key) => set((state) => ({
        activeIndicators: state.activeIndicators.filter(ind => ind !== key),
        indicatorSettings: Object.fromEntries(
          Object.entries(state.indicatorSettings).filter(([k]) => k !== key)
        ),
      })),
      
      updateIndicatorSettings: (key, settings) => set((state) => ({
        indicatorSettings: {
          ...state.indicatorSettings,
          [key]: { ...state.indicatorSettings[key], ...settings },
        },
      })),
      
      setShowIndicatorPanel: (showIndicatorPanel) => set({ showIndicatorPanel }),
      
      // Computed getters
      getRSISettings: () => {
        const state = get();
        return state.indicatorSettings.RSI || DEFAULT_RSI_SETTINGS;
      },
    }),
    {
      name: 'chart-preferences',
      partialize: (state) => ({
        symbol: state.symbol,
        timeframe: state.timeframe,
        exchange: state.exchange,
        theme: state.theme,
        isLive: state.isLive,
        activeIndicators: state.activeIndicators,
        indicatorSettings: state.indicatorSettings,
      }),
    }
  )
);


