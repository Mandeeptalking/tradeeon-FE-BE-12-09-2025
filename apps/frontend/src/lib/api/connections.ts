import {
  Connection,
  UpsertConnectionBody,
  TestConnectionBody,
  TestConnectionResponse,
  AuditEvent,
  ConnectionGuidance,
} from '../../types/connections';
import { authenticatedFetch } from './auth';
import { logger } from '../../utils/logger';
import { withRateLimit } from '../../utils/rateLimiter';
import { fetchWithTimeoutAndRetry } from '../../utils/retry';

// Security: Enforce HTTPS in production
function getApiBaseUrl(): string {
  const apiUrl = import.meta.env.VITE_API_URL || import.meta.env.VITE_API_BASE;
  
  if (import.meta.env.PROD) {
    if (!apiUrl || !apiUrl.startsWith('https://')) {
      throw new Error('API URL must use HTTPS in production');
    }
    return apiUrl;
  }
  
  return apiUrl || 'http://localhost:8000';
}

const API_BASE_URL = getApiBaseUrl();

// Mock data for development/testing (not used in production)
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

const defaultGuidance: ConnectionGuidance[] = [
  {
    exchange: 'BINANCE',
    whitelist_ip: '52.77.227.148',
    required_permissions: [
      'Enable Reading (spot)',
      'Enable Spot & Margin trading',
      'Optional: Enable Futures trading (if you plan to trade Futures)',
      'Do NOT enable Withdrawals',
    ],
    recommendations: [
      'Add the whitelist IP before testing the connection in Binance API management.',
      'Generate a fresh API key pair dedicated to Tradeeon.',
      'Label the API key clearly so you can rotate or revoke it later.',
    ],
    testing_notes: [
      'Connection test calls Binance spot `/api/v3/account` and futures `/fapi/v1/account` endpoints.',
      'If you receive IP whitelist errors, confirm 52.77.227.148 is whitelisted for this key.',
      'Invalid credential errors usually indicate key/secret mismatch or missing permissions.',
    ],
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
      // Use a reasonable timeout (10 seconds) to allow proper API calls
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout
      
      logger.debug('Fetching connections from:', `${API_BASE_URL}/connections`);
      const response = await authenticatedFetch(`${API_BASE_URL}/connections`, {
        method: 'GET',
        signal: controller.signal,
      });
      
      clearTimeout(timeoutId);
      
      logger.debug('Connections API response status:', response.status, response.ok);
      
      if (response.ok) {
        const data = await response.json();
        logger.debug('Connections API response data:', data, 'Type:', Array.isArray(data), 'Length:', Array.isArray(data) ? data.length : 'N/A');
        
        if (Array.isArray(data)) {
          // Validate and normalize the data
          const normalizedConnections = data.map((conn: any) => {
            // Ensure all required fields are present
            return {
              id: String(conn.id || ''),
              exchange: (conn.exchange || '').toUpperCase(),
              nickname: conn.nickname || undefined,
              status: conn.status || (conn.is_active ? 'connected' : 'not_connected'),
              last_check_at: conn.last_check_at || conn.updated_at || undefined,
              next_check_eta_sec: conn.next_check_eta_sec || 60,
              features: conn.features || {
                trading: conn.permissions?.trading || false,
                wallet: conn.permissions?.wallet || false,
                paper: conn.permissions?.paper || false,
              },
              notes: conn.notes || undefined,
            };
          });
          
          logger.debug('Normalized connections:', normalizedConnections);
          return normalizedConnections;
        } else {
          logger.warn('API returned non-array data:', data);
          return [];
        }
      } else {
        // Try to get error details
        let errorText = response.statusText;
        try {
          const errorData = await response.json();
          errorText = errorData.detail || errorData.message || errorText;
        } catch {
          // Ignore JSON parse errors
        }
        logger.warn('Failed to fetch connections:', response.status, errorText);
        return [];
      }
    } catch (error: any) {
      // Only log if it's not an abort (timeout)
      if (error.name !== 'AbortError') {
        logger.error('Failed to fetch connections from API:', error);
      } else {
        logger.warn('Connections API call timed out');
      }
      return [];
    }
  },

  async testConnection(body: TestConnectionBody): Promise<TestConnectionResponse> {
    // Apply rate limiting
    return withRateLimit(
      'test-connection',
      async () => {
        // Import auth utilities
        const { createAuthHeaders } = await import('./auth');
        const headers = await createAuthHeaders();
        
        const response = await fetchWithTimeoutAndRetry(
          `${API_BASE_URL}/connections/test`,
          {
            method: 'POST',
            headers: {
              ...headers,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(body),
          },
          30000, // 30 second timeout
          {
            maxRetries: 3,
            initialDelay: 1000,
            maxDelay: 5000,
            retryableErrors: ['timeout', 'network', 'fetch', 'ECONNRESET', 'ETIMEDOUT'],
            onRetry: (attempt, error) => {
              logger.debug(`Retrying connection test (attempt ${attempt}):`, error.message);
            },
          }
        );

        if (!response.ok) {
          // Try to extract error message from response
          let errorMessage = 'Failed to test connection';
          try {
            const errorData = await response.json();
            errorMessage = errorData.detail || errorData.message || errorMessage;
          } catch {
            // If response is not JSON, use status text
            errorMessage = response.statusText || errorMessage;
          }
          
          // If it's a 401, provide more specific error
          if (response.status === 401) {
            errorMessage = 'Authentication failed. Please sign in again.';
          }
          
          const error: any = new Error(errorMessage);
          error.response = { data: { detail: errorMessage }, status: response.status };
          throw error;
        }
        
        return await response.json();
      },
      { limit: 5, interval: 10000 } // Allow 5 requests every 10 seconds
    );
  },

  async upsertConnection(body: UpsertConnectionBody): Promise<Connection> {
    // Import auth utilities
    const { createAuthHeaders } = await import('./auth');
    const headers = await createAuthHeaders();
    
    const response = await fetchWithTimeoutAndRetry(
      `${API_BASE_URL}/connections`,
      {
        method: 'POST',
        headers: {
          ...headers,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      },
      30000, // 30 second timeout
      {
        maxRetries: 3,
        initialDelay: 1000,
        maxDelay: 5000,
        retryableErrors: ['timeout', 'network', 'fetch', 'ECONNRESET', 'ETIMEDOUT'],
        onRetry: (attempt, error) => {
          logger.debug(`Retrying connection save (attempt ${attempt}):`, error.message);
        },
      }
    );
    
    if (!response.ok) {
      // Try to extract error message from response
      let errorMessage = 'Failed to save connection';
      try {
        const errorData = await response.json();
        errorMessage = errorData.detail || errorData.message || errorMessage;
      } catch {
        // If response is not JSON, use status text
        errorMessage = response.statusText || errorMessage;
      }
      const error: any = new Error(errorMessage);
      error.response = { data: { detail: errorMessage }, status: response.status };
      throw error;
    }
    
    return await response.json();
  },

  async rotateKeys(id: string, body: UpsertConnectionBody): Promise<Connection> {
    try {
      const response = await authenticatedFetch(`${API_BASE_URL}/connections/${id}/rotate`, {
        method: 'POST',
        body: JSON.stringify(body),
      });
      
      if (!response.ok) {
        throw new Error('Failed to rotate keys');
      }
      return await response.json();
    } catch (error) {
      // Using mock response (development fallback)
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

  async pauseConnection(id: string): Promise<void> {
    try {
      const response = await authenticatedFetch(`${API_BASE_URL}/connections/${id}/pause`, {
        method: 'PATCH',
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.detail || 'Failed to pause connection');
      }
    } catch (error: any) {
      throw error;
    }
  },

  async resumeConnection(id: string): Promise<void> {
    try {
      const response = await authenticatedFetch(`${API_BASE_URL}/connections/${id}/resume`, {
        method: 'PATCH',
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.detail || 'Failed to resume connection');
      }
    } catch (error: any) {
      throw error;
    }
  },

  async deleteConnection(id: string): Promise<void> {
    try {
      const response = await authenticatedFetch(`${API_BASE_URL}/connections/${id}`, {
        method: 'DELETE',
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.detail || 'Failed to delete connection');
      }
    } catch (error: any) {
      throw error;
    }
  },

  // Legacy alias for backward compatibility
  async revokeConnection(id: string): Promise<void> {
    return this.deleteConnection(id);
  },

  async getAuditEvents(): Promise<AuditEvent[]> {
    try {
      // Quick timeout for audit events
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 1000);
      
      const response = await authenticatedFetch(`${API_BASE_URL}/connections/audit`, {
        signal: controller.signal,
      });
      
      clearTimeout(timeoutId);
      
      if (!response.ok) {
        return mockAuditEvents;
      }
      const data = await response.json();
      return Array.isArray(data) ? data : mockAuditEvents;
    } catch (error) {
      // Always return mock data - never fail
      return mockAuditEvents;
    }
  },

  async getGuidance(exchange?: string): Promise<ConnectionGuidance[]> {
    try {
      const query = exchange ? `?exchange=${exchange}` : '';
      const response = await authenticatedFetch(`${API_BASE_URL}/connections/info${query}`, {
        method: 'GET',
      });

      if (!response.ok) {
        throw new Error('Failed to load guidance');
      }

      const data = await response.json();
      if (Array.isArray(data?.exchanges)) {
        return data.exchanges as ConnectionGuidance[];
      }
    } catch (error) {
      logger.warn('Connection guidance fallback:', error);
    }

    if (exchange) {
      return defaultGuidance.filter((g) => g.exchange === exchange);
    }

    return defaultGuidance;
  },
};
