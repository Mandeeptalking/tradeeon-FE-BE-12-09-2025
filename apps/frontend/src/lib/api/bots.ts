export type BotStatus = 'running' | 'paused' | 'stopped' | 'inactive';
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

// Helper to get API base URL
function getApiBaseUrl(): string {
  const apiUrl = import.meta.env.VITE_API_URL;
  if (import.meta.env.PROD) {
    if (!apiUrl || !apiUrl.startsWith('https://')) {
      throw new Error('API URL must use HTTPS in production');
    }
    return apiUrl;
  }
  return apiUrl || 'http://localhost:8000';
}

// Helper to get auth token
async function getAuthToken(): Promise<string | null> {
  try {
    const { supabase } = await import('../supabase');
    const { data: { session } } = await supabase.auth.getSession();
    return session?.access_token || null;
  } catch (error) {
    console.error('Error getting auth token:', error);
    return null;
  }
}

// Helper to create authenticated fetch
async function authenticatedFetch(url: string, options: RequestInit = {}): Promise<Response> {
  const token = await getAuthToken();
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...(options.headers || {}),
  };
  
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  
  return fetch(url, {
    ...options,
    headers,
  });
}

// Helper to compute KPIs from bot array
export function getKPIs(bots: Bot[]): BotKPIs {
  const activeBots = bots.filter(bot => bot.status === 'running');
  
  return {
    totalCapitalDeployed: bots.reduce((sum, bot) => sum + (bot.invested || 0), 0),
    activeBots: activeBots.length,
    pnl24h: bots.reduce((sum, bot) => sum + (bot.pnl_24h || 0), 0),
    pnl24hPct: bots.length > 0 
      ? bots.reduce((sum, bot) => sum + ((bot.pnl_24h || 0) / Math.max(bot.invested || 1, 1)) * 100, 0) / bots.length 
      : 0,
    realizedPnlMtd: bots.reduce((sum, bot) => sum + (bot.pnl_realized_mtd || 0), 0),
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

// List all bots for the current user from Supabase via API
export async function listBots(filters: BotFilters): Promise<Bot[]> {
  try {
    const API_BASE_URL = getApiBaseUrl();
    const statusParam = filters.status !== 'All' ? `&status=${filters.status}` : '';
    
    const response = await authenticatedFetch(`${API_BASE_URL}/bots/?${statusParam}`);
    
    if (!response.ok) {
      if (response.status === 401) {
        throw new Error('Authentication required. Please sign in.');
      }
      const error = await response.json().catch(() => ({ detail: 'Failed to fetch bots' }));
      throw new Error(error.detail || 'Failed to fetch bots');
    }
    
    const data = await response.json();
    const bots: Bot[] = (data.bots || []).map((bot: any) => ({
      bot_id: bot.bot_id || bot.id,
      name: bot.name,
      bot_type: bot.bot_type || 'dca',
      exchange: bot.exchange || 'Binance',
      pair: bot.symbol || bot.pair || '',
      status: (bot.status || 'inactive') as BotStatus,
      invested: bot.invested || bot.required_capital || 0,
      pnl_24h: bot.pnl_24h || 0,
      pnl_24h_pct: bot.pnl_24h_pct || 0,
      pnl_realized_mtd: bot.pnl_realized_mtd || 0,
      orders_count: bot.orders_count || 0,
      created_at: bot.created_at || new Date().toISOString(),
      updated_at: bot.updated_at || new Date().toISOString(),
      sparkline: bot.sparkline || Array(12).fill(0),
    }));
    
    return filterBots(bots, filters);
  } catch (error: any) {
    console.error('Error listing bots:', error);
    throw error;
  }
}

// Start a bot (for inactive/stopped bots)
export async function startBot(botId: string): Promise<Bot> {
  try {
    const API_BASE_URL = getApiBaseUrl();
    const endpoint = `${API_BASE_URL}/bots/dca-bots/${botId}/start-paper`;
    
    const response = await authenticatedFetch(endpoint, {
      method: 'POST',
      body: JSON.stringify({
        initial_balance: 10000,
        interval_seconds: 60,
        use_live_data: true
      }),
    });
    
    if (!response.ok) {
      if (response.status === 401) {
        throw new Error('Authentication required. Please sign in.');
      }
      const error = await response.json().catch(() => ({ detail: 'Failed to start bot' }));
      throw new Error(error.detail || 'Failed to start bot');
    }
    
    // Refresh bot list to get updated status
    const bots = await listBots({ search: '', exchange: 'All', status: 'All' });
    const updatedBot = bots.find(b => b.bot_id === botId);
    
    if (!updatedBot) {
      throw new Error('Bot not found after starting');
    }
    
    return updatedBot;
  } catch (error: any) {
    console.error('Error starting bot:', error);
    throw error;
  }
}

// Resume a paused bot
export async function resumeBot(botId: string): Promise<Bot> {
  try {
    const API_BASE_URL = getApiBaseUrl();
    const endpoint = `${API_BASE_URL}/bots/dca-bots/${botId}/resume`;
    
    const response = await authenticatedFetch(endpoint, {
      method: 'POST',
    });
    
    if (!response.ok) {
      if (response.status === 401) {
        throw new Error('Authentication required. Please sign in.');
      }
      const error = await response.json().catch(() => ({ detail: 'Failed to resume bot' }));
      throw new Error(error.detail || 'Failed to resume bot');
    }
    
    // Refresh bot list to get updated status
    const bots = await listBots({ search: '', exchange: 'All', status: 'All' });
    const updatedBot = bots.find(b => b.bot_id === botId);
    
    if (!updatedBot) {
      throw new Error('Bot not found after resuming');
    }
    
    return updatedBot;
  } catch (error: any) {
    console.error('Error resuming bot:', error);
    throw error;
  }
}

// Pause a running bot
export async function pauseBot(botId: string): Promise<Bot> {
  try {
    const API_BASE_URL = getApiBaseUrl();
    const endpoint = `${API_BASE_URL}/bots/dca-bots/${botId}/pause`;
    
    const response = await authenticatedFetch(endpoint, {
      method: 'POST',
    });
    
    if (!response.ok) {
      if (response.status === 401) {
        throw new Error('Authentication required. Please sign in.');
      }
      const error = await response.json().catch(() => ({ detail: 'Failed to pause bot' }));
      throw new Error(error.detail || 'Failed to pause bot');
    }
    
    // Refresh bot list to get updated status
    const bots = await listBots({ search: '', exchange: 'All', status: 'All' });
    const updatedBot = bots.find(b => b.bot_id === botId);
    
    if (!updatedBot) {
      throw new Error('Bot not found after pausing');
    }
    
    return updatedBot;
  } catch (error: any) {
    console.error('Error pausing bot:', error);
    throw error;
  }
}

// Stop a bot
export async function stopBot(botId: string): Promise<Bot> {
  try {
    const API_BASE_URL = getApiBaseUrl();
    const endpoint = `${API_BASE_URL}/bots/dca-bots/${botId}/stop`;
    
    const response = await authenticatedFetch(endpoint, {
      method: 'POST',
    });
    
    if (!response.ok) {
      if (response.status === 401) {
        throw new Error('Authentication required. Please sign in.');
      }
      const error = await response.json().catch(() => ({ detail: 'Failed to stop bot' }));
      throw new Error(error.detail || 'Failed to stop bot');
    }
    
    // Refresh bot list to get updated status
    const bots = await listBots({ search: '', exchange: 'All', status: 'All' });
    const updatedBot = bots.find(b => b.bot_id === botId);
    
    if (!updatedBot) {
      throw new Error('Bot not found after stopping');
    }
    
    return updatedBot;
  } catch (error: any) {
    console.error('Error stopping bot:', error);
    throw error;
  }
}

// Delete a bot
export async function deleteBot(botId: string): Promise<void> {
  try {
    const API_BASE_URL = getApiBaseUrl();
    const endpoint = `${API_BASE_URL}/bots/dca-bots/${botId}`;
    
    const response = await authenticatedFetch(endpoint, {
      method: 'DELETE',
    });
    
    if (!response.ok) {
      if (response.status === 401) {
        throw new Error('Authentication required. Please sign in.');
      }
      if (response.status === 404) {
        // Bot already deleted, that's okay
        return;
      }
      const error = await response.json().catch(() => ({ detail: 'Failed to delete bot' }));
      throw new Error(error.detail || 'Failed to delete bot');
    }
  } catch (error: any) {
    console.error('Error deleting bot:', error);
    throw error;
  }
}

// Legacy function for compatibility (maps to appropriate action)
export async function updateBotStatus(botId: string, status: BotStatus): Promise<Bot> {
  switch (status) {
    case 'running':
      // Check if bot is paused, then resume, otherwise start
      const bots = await listBots({ search: '', exchange: 'All', status: 'All' });
      const bot = bots.find(b => b.bot_id === botId);
      if (bot?.status === 'paused') {
        return resumeBot(botId);
      } else {
        return startBot(botId);
      }
    case 'paused':
      return pauseBot(botId);
    case 'stopped':
      return stopBot(botId);
    default:
      throw new Error(`Invalid status: ${status}`);
  }
}

// Create a new bot (this is handled by DCABot page, but kept for compatibility)
export async function createBot(payload: CreateBotPayload): Promise<Bot> {
  // This is a placeholder - actual bot creation is done in DCABot.tsx
  throw new Error('Bot creation should be done through the DCA Bot page');
}

// Duplicate a bot
export async function duplicateBot(botId: string): Promise<Bot> {
  try {
    // First get the bot details
    const bots = await listBots({ search: '', exchange: 'All', status: 'All' });
    const originalBot = bots.find(b => b.bot_id === botId);
    
    if (!originalBot) {
      throw new Error('Bot not found');
    }
    
    // For now, duplication is not implemented in backend
    // Return a copy with new ID
    const duplicatedBot: Bot = {
      ...originalBot,
      bot_id: `bot_${Date.now()}`,
      name: `${originalBot.name} (Copy)`,
      status: 'inactive',
      invested: 0,
      pnl_24h: 0,
      pnl_24h_pct: 0,
      pnl_realized_mtd: 0,
      orders_count: 0,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      sparkline: Array(12).fill(0),
    };
    
    // TODO: Call backend API to duplicate bot when endpoint is available
    return duplicatedBot;
  } catch (error: any) {
    console.error('Error duplicating bot:', error);
    throw error;
  }
}
