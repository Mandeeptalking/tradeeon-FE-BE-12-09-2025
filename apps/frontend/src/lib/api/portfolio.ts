import { useQuery } from '@tanstack/react-query';

// Types
export interface Overview {
  equity: number;
  pnl_day: number;
  pnl_total: number;
  win_rate?: number;
}

export interface EquityPoint {
  t: string;
  v: number;
}

export interface AllocationSlice {
  label: string;
  value: number;
}

export interface Holding {
  symbol: string;
  exchange: string;
  qty: number;
  avg: number;
  ltp: number;
  pnl_day: number;
  pnl_total: number;
  weight: number;
  spark: number[];
}

export interface PortfolioFilters {
  from: string;
  to: string;
  exchange: string;
  by?: 'symbol' | 'exchange';
  as_of?: string;
}

// API functions
const portfolioApi = {
  async getOverview(filters: PortfolioFilters): Promise<Overview> {
    const params = new URLSearchParams({
      from: filters.from,
      to: filters.to,
      exchange: filters.exchange,
    });
    
    const response = await fetch(`/api/portfolio/overview?${params}`);
    if (!response.ok) {
      throw new Error('Failed to fetch portfolio overview');
    }
    return response.json();
  },

  async getEquityCurve(filters: PortfolioFilters): Promise<EquityPoint[]> {
    const params = new URLSearchParams({
      from: filters.from,
      to: filters.to,
      exchange: filters.exchange,
    });
    
    const response = await fetch(`/api/portfolio/equity_curve?${params}`);
    if (!response.ok) {
      throw new Error('Failed to fetch equity curve');
    }
    return response.json();
  },

  async getAllocation(filters: PortfolioFilters): Promise<AllocationSlice[]> {
    const params = new URLSearchParams({
      from: filters.from,
      to: filters.to,
      exchange: filters.exchange,
      by: filters.by || 'symbol',
    });
    
    const response = await fetch(`/api/portfolio/allocation?${params}`);
    if (!response.ok) {
      throw new Error('Failed to fetch allocation');
    }
    return response.json();
  },

  async getHoldings(filters: PortfolioFilters): Promise<Holding[]> {
    const params = new URLSearchParams({
      as_of: filters.as_of || filters.to,
      exchange: filters.exchange,
    });
    
    const response = await fetch(`/api/portfolio/holdings?${params}`);
    if (!response.ok) {
      throw new Error('Failed to fetch holdings');
    }
    return response.json();
  },
};

// React Query hooks
export const usePortfolioOverview = (filters: PortfolioFilters) => {
  return useQuery({
    queryKey: ['portfolio', 'overview', filters],
    queryFn: () => portfolioApi.getOverview(filters),
    refetchInterval: 60000, // 60 seconds
    staleTime: 30000, // 30 seconds
  });
};

export const useEquityCurve = (filters: PortfolioFilters) => {
  return useQuery({
    queryKey: ['portfolio', 'equity_curve', filters],
    queryFn: () => portfolioApi.getEquityCurve(filters),
    staleTime: 60000, // 1 minute
  });
};

export const useAllocation = (filters: PortfolioFilters) => {
  return useQuery({
    queryKey: ['portfolio', 'allocation', filters],
    queryFn: () => portfolioApi.getAllocation(filters),
    staleTime: 60000, // 1 minute
  });
};

export const useHoldings = (filters: PortfolioFilters) => {
  return useQuery({
    queryKey: ['portfolio', 'holdings', filters],
    queryFn: () => portfolioApi.getHoldings(filters),
    staleTime: 30000, // 30 seconds
  });
};

export default portfolioApi;


