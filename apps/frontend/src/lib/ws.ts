import { KlineMessage } from '@/types/market';

export function makeKlineWs(symbol: string, interval: string): WebSocket {
  const stream = `${symbol.toLowerCase()}@kline_${interval}`;
  const wsUrl = `wss://stream.binance.com:9443/ws/${stream}`;
  console.log(`🔌 Creating WebSocket connection to: ${wsUrl}`);
  return new WebSocket(wsUrl);
}

export function parseKlineMessage(message: string): KlineMessage | null {
  try {
    const data = JSON.parse(message);
    
    // Check if this is a kline message
    if (data.e === 'kline' && data.k) {
      return data as KlineMessage;
    } else {
      console.log('⚠️ Non-kline message received:', data);
      return null;
    }
  } catch (error) {
    console.error('❌ Failed to parse WebSocket message:', error);
    return null;
  }
}

export function createReconnectWebSocket(
  symbol: string,
  interval: string,
  onMessage: (message: KlineMessage) => void,
  onStateChange: (state: 'connected' | 'reconnecting' | 'disconnected') => void,
  maxReconnectAttempts = 20
): () => void {
  let ws: WebSocket | null = null;
  let reconnectAttempts = 0;
  let reconnectTimeout: NodeJS.Timeout | null = null;
  let heartbeatInterval: NodeJS.Timeout | null = null;
  let isManualClose = false;

  const connect = () => {
    if (isManualClose) return;

    try {
      ws = makeKlineWs(symbol, interval);
      
      ws.onopen = () => {
        console.log(`✅ WebSocket CONNECTED for ${symbol}@${interval}`);
        reconnectAttempts = 0;
        onStateChange('connected');
        
        // Start heartbeat to keep connection alive (disabled for now to test)
        // heartbeatInterval = setInterval(() => {
        //   if (ws && ws.readyState === WebSocket.OPEN) {
        //     try {
        //       ws.send(JSON.stringify({ method: 'ping' }));
        //       console.log(`💓 Heartbeat sent for ${symbol}@${interval}`);
        //     } catch (error) {
        //       console.error('❌ Heartbeat failed:', error);
        //     }
        //   }
        // }, 30000); // Ping every 30 seconds
      };

      ws.onmessage = (event) => {
        try {
          const message = parseKlineMessage(event.data);
          if (message) {
            onMessage(message);
          }
        } catch (error) {
          console.error('❌ Error processing WebSocket message:', error);
        }
      };

      ws.onclose = (event) => {
        console.log(`🔌 WebSocket CLOSED for ${symbol}@${interval} - Code: ${event.code}, Reason: ${event.reason}`);
        ws = null;
        
        // Clear heartbeat
        if (heartbeatInterval) {
          clearInterval(heartbeatInterval);
          heartbeatInterval = null;
        }
        
        if (!isManualClose && reconnectAttempts < maxReconnectAttempts) {
          onStateChange('reconnecting');
          const delay = Math.min(1000 * Math.pow(1.2, reconnectAttempts), 5000); // More stable reconnection
          reconnectAttempts++;
          
          console.log(`🔄 RECONNECTING in ${delay}ms (attempt ${reconnectAttempts}/${maxReconnectAttempts})`);
          reconnectTimeout = setTimeout(() => {
            console.log(`🔄 Attempting reconnection ${reconnectAttempts}/${maxReconnectAttempts}`);
            connect();
          }, delay);
        } else if (reconnectAttempts >= maxReconnectAttempts) {
          console.error('❌ MAX RECONNECTION ATTEMPTS REACHED');
          onStateChange('disconnected');
        }
      };

      ws.onerror = (error) => {
        console.error('WebSocket error:', error);
        onStateChange('disconnected');
      };
    } catch (error) {
      console.error('Failed to create WebSocket:', error);
      onStateChange('disconnected');
    }
  };

  // Start connection
  connect();

  // Return cleanup function
  return () => {
    isManualClose = true;
    if (reconnectTimeout) {
      clearTimeout(reconnectTimeout);
    }
    if (heartbeatInterval) {
      clearInterval(heartbeatInterval);
    }
    if (ws) {
      ws.close();
    }
  };
}
