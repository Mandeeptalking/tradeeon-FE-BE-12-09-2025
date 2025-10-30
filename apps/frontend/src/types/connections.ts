export type Exchange = 'BINANCE' | 'COINBASE' | 'KRAKEN' | 'ZERODHA';

export type ConnStatus = 'connected' | 'degraded' | 'error' | 'not_connected';

export type ConnectionFeatures = {
  trading: boolean;
  wallet: boolean;
  paper: boolean;
};

export type Connection = {
  id: string;
  exchange: Exchange;
  nickname?: string;
  status: ConnStatus;
  last_check_at?: string;       // ISO
  next_check_eta_sec?: number;  // seconds
  features: ConnectionFeatures;
  notes?: string;               // server messages (e.g., scope missing)
};

// Legacy alias for backward compatibility
export type ConnectionStatus = ConnStatus;

export type UpsertConnectionBody = {
  exchange: Exchange;
  api_key: string;
  api_secret: string;
  passphrase?: string;      // for Coinbase/Kraken if needed
  nickname?: string;
};

export type TestConnectionBody = Omit<UpsertConnectionBody, 'nickname'>;

export type TestConnectionResponse = {
  ok: boolean;
  code: string;
  latency_ms?: number;
  message?: string;
};

export type AuditEvent = {
  id: string;
  connection_id: string;
  action: 'connected' | 'tested' | 'rotated' | 'revoked' | 'error';
  timestamp: string;
  details?: string;
};

export type ExchangeInfo = {
  name: string;
  logo: string;
  color: string;
  requiresPassphrase: boolean;
};
