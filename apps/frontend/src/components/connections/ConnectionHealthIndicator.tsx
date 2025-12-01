import React, { useEffect, useState, useCallback, useRef } from 'react';
import { Activity, Clock, Zap, AlertCircle } from 'lucide-react';
import { motion } from 'framer-motion';
import { connectionsApi } from '../../lib/api/connections';
import type { Connection } from '../../types/connections';
import { logger } from '../../utils/logger';

interface ConnectionHealthIndicatorProps {
  connection: Connection;
  onRefresh?: () => void;
}

const ConnectionHealthIndicator = ({ connection, onRefresh }: ConnectionHealthIndicatorProps) => {
  const [latency, setLatency] = useState<number | null>(null);
  const [isChecking, setIsChecking] = useState(false);
  const [lastCheck, setLastCheck] = useState<Date | null>(
    connection.last_check_at ? new Date(connection.last_check_at) : null
  );
  
  // Use ref to store the latest onRefresh callback to avoid dependency issues
  const onRefreshRef = useRef(onRefresh);
  const connectionIdRef = useRef(connection.id);
  const connectionStatusRef = useRef(connection.status);
  
  // Update refs when props change - but only update if values actually changed
  useEffect(() => {
    onRefreshRef.current = onRefresh;
    const idChanged = connectionIdRef.current !== connection.id;
    const statusChanged = connectionStatusRef.current !== connection.status;
    
    if (idChanged) {
      connectionIdRef.current = connection.id;
    }
    if (statusChanged) {
      connectionStatusRef.current = connection.status;
    }
  }, [onRefresh, connection.id, connection.status]);

  const checkLatency = useCallback(async (shouldTriggerRefresh = false) => {
    const currentId = connectionIdRef.current;
    const currentStatus = connectionStatusRef.current;
    
    if (!currentId || currentStatus !== 'connected') return;

    setIsChecking(true);
    const startTime = Date.now();

    try {
      // Simple ping to test latency (using a lightweight endpoint)
      const response = await fetch(`${import.meta.env.VITE_API_URL || 'https://api.tradeeon.com'}/health`, {
        method: 'GET',
        signal: AbortSignal.timeout(5000), // 5 second timeout
      });

      if (response.ok) {
        const endTime = Date.now();
        const calculatedLatency = endTime - startTime;
        setLatency(calculatedLatency);
        setLastCheck(new Date());
        
        // Only refresh connections if explicitly requested (manual refresh button)
        // Don't refresh on automatic periodic checks to avoid refresh loops
        if (shouldTriggerRefresh) {
          onRefreshRef.current?.();
        }
      }
    } catch (error) {
      logger.debug('Latency check failed:', error);
      setLatency(null);
    } finally {
      setIsChecking(false);
    }
  }, []); // No dependencies - uses refs instead

  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const hasInitializedRef = useRef(false);
  const lastIdRef = useRef<string | null>(null);
  const lastStatusRef = useRef<string | null>(null);

  useEffect(() => {
    // Only set up interval if connection is connected
    if (connection.status !== 'connected') {
      // Clear interval if status changed to not connected
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      hasInitializedRef.current = false;
      lastIdRef.current = null;
      lastStatusRef.current = null;
      return;
    }

    // Check if id or status actually changed - use refs to track previous values
    const idChanged = lastIdRef.current !== connection.id;
    const statusChanged = lastStatusRef.current !== connection.status;
    
    // Only initialize or restart if id or status actually changed
    if (idChanged || statusChanged || !hasInitializedRef.current) {
      // Update tracking refs
      lastIdRef.current = connection.id;
      lastStatusRef.current = connection.status;
      
      // Clear existing interval
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }

      // Check latency on mount or when connection changes (only once)
      // TEMPORARILY DISABLED TO STOP THE LOOP
      // if (!hasInitializedRef.current) {
      //   checkLatency(false); // Don't refresh on initial check
      //   hasInitializedRef.current = true;
      // }
      if (!hasInitializedRef.current) {
        hasInitializedRef.current = true;
      }

      // Set up new interval - DISABLED TEMPORARILY TO STOP THE LOOP
      // intervalRef.current = setInterval(() => {
      //   checkLatency(false); // Don't refresh connections on automatic checks
      // }, 30000);
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
    // Only depend on connection.id and connection.status - checkLatency is stable
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [connection.id, connection.status]);

  const getStatusColor = () => {
    if (connection.status === 'connected') {
      if (latency === null) return 'text-gray-400';
      if (latency < 200) return 'text-green-400';
      if (latency < 500) return 'text-yellow-400';
      return 'text-red-400';
    }
    if (connection.status === 'degraded') return 'text-yellow-400';
    if (connection.status === 'error') return 'text-red-400';
    return 'text-gray-400';
  };

  const getStatusLabel = () => {
    if (connection.status === 'connected') {
      if (latency === null) return 'Checking...';
      if (latency < 200) return 'Excellent';
      if (latency < 500) return 'Good';
      return 'Slow';
    }
    return connection.status.charAt(0).toUpperCase() + connection.status.slice(1).replace('_', ' ');
  };

  const formatLastCheck = (date: Date | null) => {
    if (!date) return 'Never';
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffSec = Math.floor(diffMs / 1000);
    const diffMin = Math.floor(diffSec / 60);
    const diffHour = Math.floor(diffMin / 60);

    if (diffSec < 60) return 'Just now';
    if (diffMin < 60) return `${diffMin}m ago`;
    if (diffHour < 24) return `${diffHour}h ago`;
    return date.toLocaleDateString();
  };

  if (connection.status === 'not_connected') {
    return null; // Don't show health indicator for disconnected connections
  }

  return (
    <div className="flex items-center gap-3 px-3 py-2 bg-gray-700/30 rounded-lg border border-gray-600/50">
      {/* Status Indicator */}
      <div className="flex items-center gap-2">
        <div className={`relative ${getStatusColor()}`}>
          <Activity className={`h-4 w-4 ${isChecking ? 'animate-pulse' : ''}`} />
          {connection.status === 'connected' && (
            <motion.div
              className="absolute inset-0 bg-green-400 rounded-full"
              initial={{ scale: 1, opacity: 0.5 }}
              animate={{ scale: 1.5, opacity: 0 }}
              transition={{ duration: 2, repeat: Infinity }}
            />
          )}
        </div>
        <span className={`text-xs font-medium ${getStatusColor()}`}>
          {getStatusLabel()}
        </span>
      </div>

      {/* Latency */}
      {connection.status === 'connected' && latency !== null && (
        <div className="flex items-center gap-1 text-xs text-gray-400">
          <Zap className="h-3 w-3" />
          <span>{latency}ms</span>
        </div>
      )}

      {/* Last Check */}
      {lastCheck && (
        <div className="flex items-center gap-1 text-xs text-gray-400">
          <Clock className="h-3 w-3" />
          <span>{formatLastCheck(lastCheck)}</span>
        </div>
      )}

      {/* Refresh Button */}
      {connection.status === 'connected' && (
        <button
          onClick={() => checkLatency(true)} // Pass true to trigger refresh on manual click
          disabled={isChecking}
          className="ml-auto text-xs text-blue-400 hover:text-blue-300 transition-colors disabled:opacity-50"
          title="Refresh connection status"
        >
          {isChecking ? 'Checking...' : 'Refresh'}
        </button>
      )}
    </div>
  );
};

export default ConnectionHealthIndicator;

