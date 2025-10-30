import axios from 'axios';
import { Candle, Interval, SymbolInfo } from '@/types/market';

const BINANCE_API_BASE = 'https://api.binance.com/api/v3';

export async function fetchSymbols(): Promise<SymbolInfo[]> {
  try {
    const { data } = await axios.get(`${BINANCE_API_BASE}/exchangeInfo`);
    return data.symbols.map((s: any) => ({
      symbol: s.symbol,
      baseAsset: s.baseAsset,
      quoteAsset: s.quoteAsset,
      status: s.status,
    }));
  } catch (error) {
    console.error('Failed to fetch symbols:', error);
    throw new Error('Failed to fetch trading symbols');
  }
}

export async function fetchKlines(
  symbol: string, 
  interval: Interval, 
  limit = 1000
): Promise<Candle[]> {
  try {
    const { data } = await axios.get(`${BINANCE_API_BASE}/klines`, {
      params: { 
        symbol, 
        interval, 
        limit 
      }
    });
    
    return data.map((k: any[]) => ({
      time: Math.floor(k[0] / 1000), // open time in seconds
      open: parseFloat(k[1]),
      high: parseFloat(k[2]),
      low: parseFloat(k[3]),
      close: parseFloat(k[4]),
      volume: parseFloat(k[5]),
    }));
  } catch (error) {
    console.error('Failed to fetch klines:', error);
    throw new Error(`Failed to fetch klines for ${symbol}`);
  }
}

export function getSymbolPrice(symbol: string): Promise<number> {
  return axios.get(`${BINANCE_API_BASE}/ticker/price`, {
    params: { symbol }
  }).then(response => parseFloat(response.data.price));
}

