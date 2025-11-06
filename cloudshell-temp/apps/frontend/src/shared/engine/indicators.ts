// src/shared/engine/indicators.ts
export type TF = '1m'|'3m'|'5m'|'15m'|'30m'|'1h'|'2h'|'4h'|'6h'|'8h'|'12h'|'1d'|'3d'|'1w'|'1M'
export type Candle = { t:number,o:number,h:number,l:number,c:number,v?:number }

export type Series = Map<number, number|null>

export interface IndicatorQuery {
  name: string;                 // e.g. 'EMA', 'RSI', 'MACD', 'BBANDS'
  params: Record<string, any>;  // e.g. { length: 20, source: 'close' }
  timeframe?: TF;               // optional HTF compute; if omitted, compute on input candles
  source?: 'close'|'open'|'high'|'low'|'hlc3'|'ohlc4';
  confirmOnClose?: boolean;     // for MTF alignment back to base tf
}

export interface IndicatorEngine {
  compute(candles: Candle[], q: IndicatorQuery): Promise<Series | Record<string, Series>>;
}
