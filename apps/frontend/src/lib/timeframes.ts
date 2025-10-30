import { Interval } from '@/types/market';

export const INTERVALS: Interval[] = [
  '1m', '3m', '5m', '15m', '30m', '1h', '2h', '4h', '6h', '12h', '1d'
];

export const INTERVAL_LABELS: Record<Interval, string> = {
  '1m': '1 Minute',
  '3m': '3 Minutes',
  '5m': '5 Minutes',
  '15m': '15 Minutes',
  '30m': '30 Minutes',
  '1h': '1 Hour',
  '2h': '2 Hours',
  '4h': '4 Hours',
  '6h': '6 Hours',
  '12h': '12 Hours',
  '1d': '1 Day',
};

export const INTERVAL_SHORT_LABELS: Record<Interval, string> = {
  '1m': '1m',
  '3m': '3m',
  '5m': '5m',
  '15m': '15m',
  '30m': '30m',
  '1h': '1h',
  '2h': '2h',
  '4h': '4h',
  '6h': '6h',
  '12h': '12h',
  '1d': '1d',
};

