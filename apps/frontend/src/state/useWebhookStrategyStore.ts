import { create } from 'zustand';

export type FireMode = 'per_bar' | 'per_close' | 'per_tick';
export type Pattern = 'ALL' | 'SEQUENCE' | 'N_OF_M';

export type AlertDef = {
  id: string;
  name: string;
  source: 'tradingview';
  keyHint?: string;
  fireMode: FireMode;
  validityBars: number;
  debounceBars: number;
  resetOnOpposite: boolean;
  timeframe: 'base' | '1m' | '3m' | '5m' | '15m' | '1h' | '4h' | '1d';
  meta?: Record<string, any>;
};

export type OrchestrationDef =
  | { pattern: 'ALL'; alertIds: string[]; simultaneous: boolean }
  | { pattern: 'SEQUENCE'; steps: { alertId: string; windowBars: number }[] }
  | { pattern: 'N_OF_M'; group: { alertId: string }[]; n: number; sharedWindowBars: number };

export type GateDef = {
  decisionTiming: FireMode;
  rearmCooldownBars: number;
  maxEntriesPerDay: number;
  tradingWindow?: { start: string; end: string };
};

export type PlaybookDraft = {
  alerts: AlertDef[];
  orchestration: OrchestrationDef;
  gate: GateDef;
};

export interface WebhookStrategy {
  id: string;
  name: string;
  mode: 'paper' | 'live';
  status: 'active' | 'paused';
  createdAt: string;
  lastTriggered?: string;
  draft: PlaybookDraft;
}

interface WebhookStrategyState {
  strategies: WebhookStrategy[];
  selectedStrategyId: string | null;
  selectStrategy: (id: string) => void;
  addStrategy: (strategy: Omit<WebhookStrategy, 'id' | 'createdAt'>) => void;
  deleteStrategy: (id: string) => void;
  updateStrategy: (id: string, updates: Partial<WebhookStrategy>) => void;
  
  // Playbook methods
  setDraft: (strategyId: string, draft: Partial<PlaybookDraft>) => void;
  addAlert: (strategyId: string, alert: AlertDef) => void;
  updateAlert: (strategyId: string, alertId: string, patch: Partial<AlertDef>) => void;
  removeAlert: (strategyId: string, alertId: string) => void;
  setOrchestration: (strategyId: string, orch: OrchestrationDef) => void;
  setGate: (strategyId: string, gate: Partial<GateDef>) => void;
}

const defaultDraft: PlaybookDraft = {
  alerts: [],
  orchestration: { pattern: 'ALL', alertIds: [], simultaneous: false },
  gate: {
    decisionTiming: 'per_close',
    rearmCooldownBars: 0,
    maxEntriesPerDay: 0,
  },
};

const mockStrategies: WebhookStrategy[] = [
  {
    id: '1',
    name: 'RSI Reversal Alert',
    mode: 'paper',
    status: 'active',
    createdAt: '2024-10-20T10:00:00Z',
    lastTriggered: '2024-10-24T14:30:00Z',
    draft: {
      ...defaultDraft,
      alerts: [{
        id: 'alert_1',
        name: 'RSI Oversold',
        source: 'tradingview',
        fireMode: 'per_close',
        validityBars: 10,
        debounceBars: 3,
        resetOnOpposite: false,
        timeframe: 'base',
      }],
      orchestration: { pattern: 'ALL', alertIds: ['alert_1'], simultaneous: false },
    }
  },
  {
    id: '2',
    name: 'EMA Crossover Strategy',
    mode: 'live',
    status: 'paused',
    createdAt: '2024-10-22T15:00:00Z',
    draft: defaultDraft,
  }
];

export const useWebhookStrategyStore = create<WebhookStrategyState>((set) => ({
  strategies: mockStrategies,
  selectedStrategyId: mockStrategies.length > 0 ? mockStrategies[0].id : null,
  
  selectStrategy: (id: string) => set({ selectedStrategyId: id }),
  
  addStrategy: (strategy) => {
    const newStrategy: WebhookStrategy = {
      ...strategy,
      id: `strategy_${Date.now()}`,
      createdAt: new Date().toISOString(),
      draft: strategy.draft || defaultDraft,
    };
    set((state) => ({
      strategies: [...state.strategies, newStrategy],
      selectedStrategyId: newStrategy.id
    }));
  },
  
  deleteStrategy: (id: string) => set((state) => {
    const filtered = state.strategies.filter(s => s.id !== id);
    return {
      strategies: filtered,
      selectedStrategyId: state.selectedStrategyId === id 
        ? (filtered.length > 0 ? filtered[0].id : null)
        : state.selectedStrategyId
    };
  }),
  
  updateStrategy: (id: string, updates: Partial<WebhookStrategy>) => set((state) => ({
    strategies: state.strategies.map(s => s.id === id ? { ...s, ...updates } : s)
  })),
  
  // Playbook methods
  setDraft: (strategyId: string, updates: Partial<PlaybookDraft>) => set((state) => ({
    strategies: state.strategies.map(s => 
      s.id === strategyId 
        ? { ...s, draft: { ...s.draft, ...updates } }
        : s
    )
  })),
  
  addAlert: (strategyId: string, alert: AlertDef) => set((state) => ({
    strategies: state.strategies.map(s => 
      s.id === strategyId
        ? { ...s, draft: { ...s.draft, alerts: [...s.draft.alerts, alert] } }
        : s
    )
  })),
  
  updateAlert: (strategyId: string, alertId: string, patch: Partial<AlertDef>) => set((state) => ({
    strategies: state.strategies.map(s => 
      s.id === strategyId
        ? { 
            ...s, 
            draft: { 
              ...s.draft, 
              alerts: s.draft.alerts.map(a => a.id === alertId ? { ...a, ...patch } : a) 
            } 
          }
        : s
    )
  })),
  
  removeAlert: (strategyId: string, alertId: string) => set((state) => ({
    strategies: state.strategies.map(s => 
      s.id === strategyId
        ? { ...s, draft: { ...s.draft, alerts: s.draft.alerts.filter(a => a.id !== alertId) } }
        : s
    )
  })),
  
  setOrchestration: (strategyId: string, orch: OrchestrationDef) => set((state) => ({
    strategies: state.strategies.map(s => 
      s.id === strategyId
        ? { ...s, draft: { ...s.draft, orchestration: orch } }
        : s
    )
  })),
  
  setGate: (strategyId: string, gate: Partial<GateDef>) => set((state) => ({
    strategies: state.strategies.map(s => 
      s.id === strategyId
        ? { ...s, draft: { ...s.draft, gate: { ...s.draft.gate, ...gate } } }
        : s
    )
  })),
}));
