import { create } from 'zustand';
import { Interval, SymbolInfo, ConnectionState } from '@/types/market';

interface ChartState {
  // Data
  symbols: SymbolInfo[];
  filteredSymbols: SymbolInfo[];
  showAllQuotes: boolean;
  
  // Current selection
  symbol: string;         // e.g., 'BTCUSDT'
  interval: Interval;     // e.g., '1m'
  
  // Connection state
  connectionState: ConnectionState;
  
  // Actions
  setSymbols: (symbols: SymbolInfo[]) => void;
  setShowAllQuotes: (showAll: boolean) => void;
  setSymbol: (symbol: string) => void;
  setInterval: (interval: Interval) => void;
  setConnectionState: (state: ConnectionState) => void;
  
  // Computed
  getFilteredSymbols: () => SymbolInfo[];
}

export const useChartStore = create<ChartState>((set, get) => ({
  // Initial state
  symbols: [],
  filteredSymbols: [],
  showAllQuotes: false,
  symbol: 'BTCUSDT',
  interval: '1m',
  connectionState: 'disconnected',

  // Actions
  setSymbols: (symbols) => {
    const state = get();
    const prefer = ['USDT', 'USDC', 'BTC'];
    const filtered = state.showAllQuotes 
      ? symbols.filter(x => x.status === 'TRADING')
      : symbols.filter(x => x.status === 'TRADING' && prefer.includes(x.quoteAsset));
    
    set({ 
      symbols, 
      filteredSymbols: filtered 
    });
  },

  setShowAllQuotes: (showAll) => {
    const state = get();
    const prefer = ['USDT', 'USDC', 'BTC'];
    const filtered = showAll 
      ? state.symbols.filter(x => x.status === 'TRADING')
      : state.symbols.filter(x => x.status === 'TRADING' && prefer.includes(x.quoteAsset));
    
    set({ 
      showAllQuotes: showAll, 
      filteredSymbols: filtered 
    });
  },

  setSymbol: (symbol) => set({ symbol }),
  setInterval: (interval) => set({ interval }),
  setConnectionState: (connectionState) => set({ connectionState }),

  // Computed
  getFilteredSymbols: () => {
    const state = get();
    return state.filteredSymbols;
  },
}));

