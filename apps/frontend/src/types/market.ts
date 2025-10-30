export type Interval =
  | '1m' | '3m' | '5m' | '15m' | '30m' | '1h' | '2h' | '4h' | '6h' | '12h' | '1d';

export interface SymbolInfo {
  symbol: string;
  baseAsset: string;
  quoteAsset: string;
  status: 'TRADING' | string;
}

export interface Candle {
  time: number;   // seconds since epoch for lightweight-charts
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export interface KlineData {
  t: number;      // open time
  T: number;      // close time
  s: string;      // symbol
  i: string;      // interval
  f: number;      // first trade ID
  L: number;      // last trade ID
  o: string;      // open
  c: string;      // close
  h: string;      // high
  l: string;      // low
  v: string;      // base asset volume
  n: number;      // number of trades
  x: boolean;     // is final
  q: string;      // quote asset volume
  V: string;      // taker buy base asset volume
  Q: string;      // taker buy quote asset volume
  B: string;      // ignore
}

export interface KlineMessage {
  e: string;    // event type
  E: number;    // event time
  s: string;    // symbol
  k: KlineData; // kline data
}

export type ConnectionState = 'connected' | 'reconnecting' | 'disconnected';
