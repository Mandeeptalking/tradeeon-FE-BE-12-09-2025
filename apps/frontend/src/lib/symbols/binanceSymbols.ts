// Complete Binance trading pairs list (1526 pairs)
// Fetched from Binance API: https://api.binance.com/api/v3/exchangeInfo
// Updated: September 2025

// Import the complete symbol list
import { BINANCE_SYMBOLS as COMPLETE_SYMBOLS } from './binanceSymbolsComplete';

export const BINANCE_SYMBOLS = COMPLETE_SYMBOLS;

// Popular pairs for quick access
export const POPULAR_PAIRS = [
  'BTCUSDT', 'ETHUSDT', 'BNBUSDT', 'XRPUSDT', 'ADAUSDT', 'SOLUSDT',
  'DOGEUSDT', 'DOTUSDT', 'MATICUSDT', 'SHIBUSDT', 'AVAXUSDT', 'LTCUSDT',
  'TRXUSDT', 'LINKUSDT', 'ATOMUSDT', 'ETCUSDT', 'XLMUSDT', 'VETUSDT',
  'FILUSDT', 'ICPUSDT', 'THETAUSDT', 'AXSUSDT', 'SANDUSDT', 'MANAUSDT',
];

// Category-based groupings (all quote currencies from live data)
export const USDT_PAIRS = BINANCE_SYMBOLS.filter(symbol => symbol.endsWith('USDT'));
export const USDC_PAIRS = BINANCE_SYMBOLS.filter(symbol => symbol.endsWith('USDC'));
export const FDUSD_PAIRS = BINANCE_SYMBOLS.filter(symbol => symbol.endsWith('FDUSD'));
export const TUSD_PAIRS = BINANCE_SYMBOLS.filter(symbol => symbol.endsWith('TUSD'));
export const BTC_PAIRS = BINANCE_SYMBOLS.filter(symbol => symbol.endsWith('BTC'));
export const ETH_PAIRS = BINANCE_SYMBOLS.filter(symbol => symbol.endsWith('ETH'));
export const BNB_PAIRS = BINANCE_SYMBOLS.filter(symbol => symbol.endsWith('BNB'));
export const EUR_PAIRS = BINANCE_SYMBOLS.filter(symbol => symbol.endsWith('EUR'));
export const GBP_PAIRS = BINANCE_SYMBOLS.filter(symbol => symbol.endsWith('GBP'));
export const AUD_PAIRS = BINANCE_SYMBOLS.filter(symbol => symbol.endsWith('AUD'));
export const TRY_PAIRS = BINANCE_SYMBOLS.filter(symbol => symbol.endsWith('TRY'));
export const BRL_PAIRS = BINANCE_SYMBOLS.filter(symbol => symbol.endsWith('BRL'));
export const BUSD_PAIRS = BINANCE_SYMBOLS.filter(symbol => symbol.endsWith('BUSD'));
export const DAI_PAIRS = BINANCE_SYMBOLS.filter(symbol => symbol.endsWith('DAI'));
export const RON_PAIRS = BINANCE_SYMBOLS.filter(symbol => symbol.endsWith('RON'));
export const NGN_PAIRS = BINANCE_SYMBOLS.filter(symbol => symbol.endsWith('NGN'));
export const PLN_PAIRS = BINANCE_SYMBOLS.filter(symbol => symbol.endsWith('PLN'));
export const ZAR_PAIRS = BINANCE_SYMBOLS.filter(symbol => symbol.endsWith('ZAR'));
export const BVND_PAIRS = BINANCE_SYMBOLS.filter(symbol => symbol.endsWith('BVND'));

// Search function with fuzzy matching
export const searchSymbols = (query: string, limit: number = 50): string[] => {
  if (!query || query.length < 1) {
    return POPULAR_PAIRS.slice(0, limit);
  }

  const upperQuery = query.toUpperCase();
  
  // Exact matches first
  const exactMatches = BINANCE_SYMBOLS.filter(symbol => 
    symbol === upperQuery
  );
  
  // Starts with matches
  const startsWithMatches = BINANCE_SYMBOLS.filter(symbol => 
    symbol.startsWith(upperQuery) && !exactMatches.includes(symbol)
  );
  
  // Contains matches
  const containsMatches = BINANCE_SYMBOLS.filter(symbol => 
    symbol.includes(upperQuery) && 
    !exactMatches.includes(symbol) && 
    !startsWithMatches.includes(symbol)
  );
  
  // Combine results with priority order
  const results = [
    ...exactMatches,
    ...startsWithMatches,
    ...containsMatches,
  ].slice(0, limit);
  
  return results;
};

// Get symbol info
export const getSymbolInfo = (symbol: string) => {
  // Define all possible quote currencies found in live data
  const quoteRegex = /USDT|USDC|FDUSD|TUSD|BUSD|DAI|BTC|ETH|BNB|EUR|GBP|AUD|TRY|BRL|RON|NGN|PLN|ZAR|BVND$/;
  const match = symbol.match(quoteRegex);
  const quoteAsset = match ? match[0] : 'OTHER';
  const baseAsset = quoteAsset !== 'OTHER' ? symbol.replace(quoteAsset, '') : symbol;
  
  return {
    baseAsset,
    quoteAsset,
    isPopular: POPULAR_PAIRS.includes(symbol),
    category: quoteAsset,
  };
};

// Get all available quote currencies
export const getQuoteCurrencies = () => {
  const quotes = new Set<string>();
  BINANCE_SYMBOLS.forEach(symbol => {
    const info = getSymbolInfo(symbol);
    quotes.add(info.quoteAsset);
  });
  return Array.from(quotes).sort();
};

// Fetch live symbols from Binance API (for future updates)
export const fetchLiveSymbols = async (): Promise<string[]> => {
  try {
    const response = await fetch('https://api.binance.com/api/v3/exchangeInfo');
    const data = await response.json();
    
    return data.symbols
      .filter((s: any) => s.status === 'TRADING')
      .map((s: any) => s.symbol)
      .sort();
  } catch (error) {
    console.warn('Failed to fetch live symbols, using static list:', error);
    return BINANCE_SYMBOLS;
  }
};