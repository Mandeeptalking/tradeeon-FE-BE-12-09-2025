import { Connection, UpsertConnectionBody, TestConnectionBody, TestConnectionResponse, AuditEvent } from '../../types/connections';

const API_BASE_URL = import.meta.env.VITE_API_BASE || 'http://localhost:8000';

// Mock data for demo purposes
const mockConnections: Connection[] = [
  {
    id: '1',
    exchange: 'BINANCE',
    nickname: 'Main Trading',
    status: 'connected',
    last_check_at: new Date(Date.now() - 2 * 60 * 1000).toISOString(),
    next_check_eta_sec: 58,
    features: { trading: true, wallet: true, paper: false },
  },
  {
    id: '2',
    exchange: 'KRAKEN',
    nickname: 'Backup Account',
    status: 'degraded',
    last_check_at: new Date(Date.now() - 5 * 60 * 1000).toISOString(),
    next_check_eta_sec: 45,
    features: { trading: false, wallet: true, paper: true },
    notes: 'Trading scope missing',
  },
  {
    id: '3',
    exchange: 'COINBASE',
    nickname: 'Coinbase Pro',
    status: 'not_connected',
    features: { trading: false, wallet: false, paper: false },
  },
];

const mockAuditEvents: AuditEvent[] = [
  {
    id: '1',
    connection_id: '1',
    action: 'tested',
    timestamp: new Date(Date.now() - 2 * 60 * 1000).toISOString(),
    details: 'Connection test successful',
  },
  {
    id: '2',
    connection_id: '2',
    action: 'rotated',
    timestamp: new Date(Date.now() - 1 * 60 * 60 * 1000).toISOString(),
    details: 'API keys rotated',
  },
  {
    id: '3',
    connection_id: '1',
    action: 'connected',
    timestamp: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
    details: 'Initial connection established',
  },
];

export const connectionsApi = {
  async listConnections(): Promise<Connection[]> {
    try {
      const response = await fetch(`${API_BASE_URL}/connections`);
      if (!response.ok) {
        throw new Error('Failed to fetch connections');
      }
      return await response.json();
    } catch (error) {
      console.log('Using mock connections data');
      return mockConnections;
    }
  },

  async testConnection(body: TestConnectionBody): Promise<TestConnectionResponse> {
    try {
      const response = await fetch(`${API_BASE_URL}/connections/test`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      });
      
      if (!response.ok) {
        throw new Error('Failed to test connection');
      }
      return await response.json();
    } catch (error) {
      console.log('Using mock test response');
      // Randomize response for demo
      const responses = [
        { ok: true, code: 'ok', latency_ms: 120 },
        { ok: false, code: 'invalid_credentials', message: 'Invalid API credentials' },
        { ok: false, code: 'scope_missing', message: 'Trading scope required' },
        { ok: true, code: 'ok', latency_ms: 89 },
      ];
      return responses[Math.floor(Math.random() * responses.length)];
    }
  },

  async upsertConnection(body: UpsertConnectionBody): Promise<Connection> {
    try {
      const response = await fetch(`${API_BASE_URL}/connections`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      });
      
      if (!response.ok) {
        throw new Error('Failed to save connection');
      }
      return await response.json();
    } catch (error) {
      console.log('Using mock upsert response');
      // Create mock connection
      const newConnection: Connection = {
        id: Date.now().toString(),
        exchange: body.exchange,
        nickname: body.nickname,
        status: 'connected',
        last_check_at: new Date().toISOString(),
        next_check_eta_sec: 60,
        features: { trading: true, wallet: true, paper: false },
      };
      return newConnection;
    }
  },

  async rotateKeys(id: string, body: UpsertConnectionBody): Promise<Connection> {
    try {
      const response = await fetch(`${API_BASE_URL}/connections/${id}/rotate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      });
      
      if (!response.ok) {
        throw new Error('Failed to rotate keys');
      }
      return await response.json();
    } catch (error) {
      console.log('Using mock rotate response');
      // Find existing connection and update
      const existing = mockConnections.find(c => c.id === id);
      if (existing) {
        return {
          ...existing,
          last_check_at: new Date().toISOString(),
        };
      }
      throw new Error('Connection not found');
    }
  },

  async revokeConnection(id: string): Promise<void> {
    try {
      const response = await fetch(`${API_BASE_URL}/connections/${id}`, {
        method: 'DELETE',
      });
      
      if (!response.ok) {
        throw new Error('Failed to revoke connection');
      }
    } catch (error) {
      console.log('Using mock revoke response');
      // In real app, this would update the connection status
    }
  },

  async getAuditEvents(): Promise<AuditEvent[]> {
    try {
      const response = await fetch(`${API_BASE_URL}/connections/audit`);
      if (!response.ok) {
        throw new Error('Failed to fetch audit events');
      }
      return await response.json();
    } catch (error) {
      console.log('Using mock audit events');
      return mockAuditEvents;
    }
  },
};
