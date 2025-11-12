import { authenticatedFetch } from './auth';
import { sanitizeErrorMessage } from '../../utils/errorHandler';

// Security: Enforce HTTPS in production, allow HTTP only in development
function getApiBaseUrl(): string {
  const apiUrl = import.meta.env.VITE_API_URL || import.meta.env.VITE_API_BASE;
  
  // In production, enforce HTTPS
  if (import.meta.env.PROD) {
    if (!apiUrl || !apiUrl.startsWith('https://')) {
      console.error('CRITICAL: API URL must use HTTPS in production');
      throw new Error('API URL must use HTTPS in production');
    }
    return apiUrl;
  }
  
  // Development fallback (HTTP allowed only in dev)
  return apiUrl || 'http://localhost:8000';
}

const API_BASE_URL = getApiBaseUrl();

export interface DashboardSummary {
  success: boolean;
  account: {
    can_trade: boolean;
    can_withdraw: boolean;
    can_deposit: boolean;
    account_type: string;  // Primary account type (for backward compatibility)
    account_types: string[];  // List of all available account types (SPOT, FUTURES)
  };
  usdt_balance: {
    free: number;
    locked: number;
    total: number;
  };
  assets: Array<{
    asset: string;
    free: number;
    locked: number;
    total: number;
  }>;
  active_trades: Array<{
    order_id: number;
    symbol: string;
    side: string;
    type: string;
    quantity: number;
    price: number;
    status: string;
    time: number;
    account_type?: string;  // SPOT or FUTURES
  }>;
  futures_positions?: Array<{
    symbol: string;
    position_side: string;  // LONG, SHORT, or BOTH
    position_amount: number;
    entry_price: number;
    mark_price: number;
    unrealized_pnl: number;
    leverage: number;
    liquidation_price: number;
    account_type: string;
  }>;
  stats: {
    total_assets: number;
    total_active_trades: number;
    total_futures_positions?: number;
    total_balance_usdt: number;
  };
}

export interface AccountInfo {
  success: boolean;
  account: {
    maker_commission: number;
    taker_commission: number;
    buyer_commission: number;
    seller_commission: number;
    can_trade: boolean;
    can_withdraw: boolean;
    can_deposit: boolean;
    update_time: number;
    account_type: string;
    balances: Array<{
      asset: string;
      free: string;
      locked: string;
    }>;
  };
}

export interface BalanceResponse {
  success: boolean;
  balances: Array<{
    asset: string;
    free: number;
    locked: number;
    total: number;
  }>;
  count: number;
}

export interface USDTBalanceResponse {
  success: boolean;
  balance: {
    free: number;
    locked: number;
    total: number;
  };
}

export interface ActiveTradesResponse {
  success: boolean;
  orders: Array<{
    order_id: number;
    symbol: string;
    side: string;
    type: string;
    quantity: number;
    price: number;
    status: string;
    time: number;
    update_time: number;
  }>;
  count: number;
}

export const dashboardApi = {
  async getSummary(): Promise<DashboardSummary> {
    try {
      const response = await authenticatedFetch(`${API_BASE_URL}/dashboard/summary`);
      
      if (!response.ok) {
        let errorMessage = 'Failed to fetch dashboard summary';
        try {
          const errorData = await response.json();
          errorMessage = errorData.detail || errorData.message || errorMessage;
        } catch {
          errorMessage = `HTTP ${response.status}: ${response.statusText}`;
        }
        throw new Error(errorMessage);
      }
      
      return await response.json();
    } catch (error: any) {
      // Handle network errors (backend down, CORS, etc.)
      if (error.name === 'TypeError' && error.message.includes('fetch')) {
        throw new Error('Unable to connect to backend. Please check if the server is running.');
      }
      // Sanitize error before throwing
      const sanitizedError = new Error(sanitizeErrorMessage(error));
      throw sanitizedError;
    }
  },

  async getAccountInfo(): Promise<AccountInfo> {
    const response = await authenticatedFetch(`${API_BASE_URL}/dashboard/account`);
    if (!response.ok) {
      throw new Error('Failed to fetch account info');
    }
    return await response.json();
  },

  async getBalance(asset?: string): Promise<BalanceResponse> {
    const url = asset 
      ? `${API_BASE_URL}/dashboard/balance?asset=${asset}`
      : `${API_BASE_URL}/dashboard/balance`;
    const response = await authenticatedFetch(url);
    if (!response.ok) {
      throw new Error('Failed to fetch balance');
    }
    return await response.json();
  },

  async getUSDTBalance(): Promise<USDTBalanceResponse> {
    const response = await authenticatedFetch(`${API_BASE_URL}/dashboard/usdt-balance`);
    if (!response.ok) {
      throw new Error('Failed to fetch USDT balance');
    }
    return await response.json();
  },

  async getActiveTrades(symbol?: string): Promise<ActiveTradesResponse> {
    const url = symbol
      ? `${API_BASE_URL}/dashboard/active-trades?symbol=${symbol}`
      : `${API_BASE_URL}/dashboard/active-trades`;
    const response = await authenticatedFetch(url);
    if (!response.ok) {
      throw new Error('Failed to fetch active trades');
    }
    return await response.json();
  },
};

