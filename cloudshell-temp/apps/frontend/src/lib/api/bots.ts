export type BotStatus = 'running' | 'paused' | 'stopped';
export type Exchange = 'Binance' | 'Zerodha' | 'KuCoin';
export type BotType = 'dca' | 'grid' | 'custom';

export interface Bot {
  bot_id: string;
  name: string;
  bot_type: BotType;
  exchange: Exchange;
  pair: string;                 // e.g., 'BTCUSDT'
  status: BotStatus;
  invested: number;             // in INR
  pnl_24h: number;              // absolute
  pnl_24h_pct: number;          // %
  pnl_realized_mtd: number;
  orders_count: number;
  created_at: string;
  updated_at: string;
  sparkline?: number[];         // last 24h pnl series for the card
}

export interface BotFilters {
  search: string;
  exchange: string;
  status: string;
}

export interface BotKPIs {
  totalCapitalDeployed: number;
  activeBots: number;
  pnl24h: number;
  pnl24hPct: number;
  realizedPnlMtd: number;
}

export interface CreateBotPayload {
  name: string;
  bot_type: BotType;
  exchange: Exchange;
  pair: string;
  initial_amount: number;
}

// Mock data for development
const mockBots: Bot[] = [
  {
    bot_id: 'bot_1',
    name: 'BTC DCA Strategy',
    bot_type: 'dca',
    exchange: 'Binance',
    pair: 'BTCUSDT',
    status: 'running',
    invested: 50000,
    pnl_24h: 1250,
    pnl_24h_pct: 2.5,
    pnl_realized_mtd: 8500,
    orders_count: 24,
    created_at: '2024-01-15T10:30:00Z',
    updated_at: '2024-01-20T14:22:00Z',
    sparkline: [100, 120, 110, 130, 125, 140, 135, 150, 145, 160, 155, 170],
  },
  {
    bot_id: 'bot_2',
    name: 'ETH Grid Bot',
    bot_type: 'grid',
    exchange: 'Binance',
    pair: 'ETHUSDT',
    status: 'paused',
    invested: 30000,
    pnl_24h: -750,
    pnl_24h_pct: -2.5,
    pnl_realized_mtd: 2100,
    orders_count: 18,
    created_at: '2024-01-10T09:15:00Z',
    updated_at: '2024-01-19T16:45:00Z',
    sparkline: [100, 95, 105, 90, 85, 95, 100, 110, 105, 95, 90, 85],
  },
  {
    bot_id: 'bot_4',
    name: 'NIFTY Momentum',
    bot_type: 'custom',
    exchange: 'Zerodha',
    pair: 'NIFTY50',
    status: 'running',
    invested: 75000,
    pnl_24h: 3200,
    pnl_24h_pct: 4.27,
    pnl_realized_mtd: 12500,
    orders_count: 8,
    created_at: '2024-01-08T11:00:00Z',
    updated_at: '2024-01-20T13:30:00Z',
    sparkline: [100, 110, 115, 108, 120, 125, 130, 135, 128, 140, 145, 142],
  },
  {
    bot_id: 'bot_4',
    name: 'SOL Scalping',
    bot_type: 'custom',
    exchange: 'KuCoin',
    pair: 'SOLUSDT',
    status: 'stopped',
    invested: 0,
    pnl_24h: 0,
    pnl_24h_pct: 0,
    pnl_realized_mtd: -500,
    orders_count: 0,
    created_at: '2024-01-05T14:20:00Z',
    updated_at: '2024-01-18T10:15:00Z',
    sparkline: [100, 98, 95, 92, 89, 85, 82, 80, 78, 75, 72, 70],
  },
];

// Environment flag for Supabase (future)
const enableSupabase = false; // process.env.VITE_ENABLE_SUPABASE === 'true';

// Helper to compute KPIs from bot array
export function getKPIs(bots: Bot[]): BotKPIs {
  const activeBots = bots.filter(bot => bot.status === 'running');
  
  return {
    totalCapitalDeployed: bots.reduce((sum, bot) => sum + bot.invested, 0),
    activeBots: activeBots.length,
    pnl24h: bots.reduce((sum, bot) => sum + bot.pnl_24h, 0),
    pnl24hPct: bots.length > 0 
      ? bots.reduce((sum, bot) => sum + (bot.pnl_24h / Math.max(bot.invested, 1)) * 100, 0) / bots.length 
      : 0,
    realizedPnlMtd: bots.reduce((sum, bot) => sum + bot.pnl_realized_mtd, 0),
  };
}

// Filter bots based on criteria
export function filterBots(bots: Bot[], filters: BotFilters): Bot[] {
  return bots.filter(bot => {
    const matchesSearch = !filters.search || 
      bot.name.toLowerCase().includes(filters.search.toLowerCase()) ||
      bot.pair.toLowerCase().includes(filters.search.toLowerCase());
    
    const matchesExchange = filters.exchange === 'All' || bot.exchange === filters.exchange;
    const matchesStatus = filters.status === 'All' || bot.status === filters.status;
    
    return matchesSearch && matchesExchange && matchesStatus;
  });
}

// Mock API functions
async function mockDelay(ms: number = 500) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

export async function listBots(filters: BotFilters): Promise<Bot[]> {
  if (enableSupabase) {
    // TODO: Implement Supabase queries with RLS
    throw new Error('Supabase integration not implemented yet');
  }
  
  await mockDelay(300);
  return filterBots(mockBots, filters);
}

export async function createBot(payload: CreateBotPayload): Promise<Bot> {
  if (enableSupabase) {
    // TODO: Implement Supabase insert
    throw new Error('Supabase integration not implemented yet');
  }
  
  await mockDelay(800);
  
  const newBot: Bot = {
    bot_id: `bot_${Date.now()}`,
    name: payload.name,
    bot_type: payload.bot_type,
    exchange: payload.exchange,
    pair: payload.pair,
    status: 'paused',
    invested: 0,
    pnl_24h: 0,
    pnl_24h_pct: 0,
    pnl_realized_mtd: 0,
    orders_count: 0,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    sparkline: Array(12).fill(0),
  };
  
  mockBots.push(newBot);
  return newBot;
}

export async function updateBotStatus(botId: string, status: BotStatus): Promise<Bot> {
  if (enableSupabase) {
    // TODO: Implement Supabase update
    throw new Error('Supabase integration not implemented yet');
  }
  
  await mockDelay(200);
  
  const bot = mockBots.find(b => b.bot_id === botId);
  if (!bot) throw new Error('Bot not found');
  
  bot.status = status;
  bot.updated_at = new Date().toISOString();
  
  return bot;
}

export async function duplicateBot(botId: string): Promise<Bot> {
  if (enableSupabase) {
    // TODO: Implement Supabase duplicate
    throw new Error('Supabase integration not implemented yet');
  }
  
  await mockDelay(500);
  
  const originalBot = mockBots.find(b => b.bot_id === botId);
  if (!originalBot) throw new Error('Bot not found');
  
  const duplicatedBot: Bot = {
    ...originalBot,
    bot_id: `bot_${Date.now()}`,
    name: `${originalBot.name} (Copy)`,
    status: 'paused',
    invested: 0,
    pnl_24h: 0,
    pnl_24h_pct: 0,
    pnl_realized_mtd: 0,
    orders_count: 0,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    sparkline: Array(12).fill(0),
  };
  
  mockBots.push(duplicatedBot);
  return duplicatedBot;
}

export async function deleteBot(botId: string): Promise<void> {
  if (enableSupabase) {
    // TODO: Implement Supabase delete
    throw new Error('Supabase integration not implemented yet');
  }
  
  await mockDelay(300);
  
  const index = mockBots.findIndex(b => b.bot_id === botId);
  if (index === -1) throw new Error('Bot not found');
  
  mockBots.splice(index, 1);
}

