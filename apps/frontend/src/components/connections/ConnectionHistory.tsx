import React, { useEffect, useState } from 'react';
import { Clock, CheckCircle, XCircle, AlertCircle, Download, RefreshCw } from 'lucide-react';
import { connectionsApi } from '../../lib/api/connections';
import type { AuditEvent } from '../../types/connections';
import { logger } from '../../utils/logger';
import { motion } from 'framer-motion';

interface ConnectionHistoryProps {
  connectionId: string;
  isOpen: boolean;
  onClose: () => void;
}

const ConnectionHistory = ({ connectionId, isOpen, onClose }: ConnectionHistoryProps) => {
  const [events, setEvents] = useState<AuditEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen && connectionId) {
      loadHistory();
    }
  }, [isOpen, connectionId]);

  const loadHistory = async () => {
    try {
      setLoading(true);
      setError(null);
      const auditEvents = await connectionsApi.getAuditEvents();
      // Filter events for this connection
      const filteredEvents = auditEvents.filter((event) => event.connection_id === connectionId);
      setEvents(filteredEvents.sort((a, b) => 
        new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
      ));
    } catch (err: any) {
      logger.error('Failed to load connection history:', err);
      setError('Failed to load history');
    } finally {
      setLoading(false);
    }
  };

  const exportLogs = () => {
    const logs = events.map((event) => ({
      timestamp: event.timestamp,
      action: event.action,
      details: event.details || '',
    }));

    const blob = new Blob([JSON.stringify(logs, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `connection-history-${connectionId}-${new Date().toISOString()}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const getActionIcon = (action: string) => {
    switch (action) {
      case 'connected':
        return <CheckCircle className="h-4 w-4 text-green-400" />;
      case 'tested':
        return <CheckCircle className="h-4 w-4 text-blue-400" />;
      case 'error':
        return <XCircle className="h-4 w-4 text-red-400" />;
      default:
        return <AlertCircle className="h-4 w-4 text-gray-400" />;
    }
  };

  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp);
    return date.toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="relative w-full max-w-2xl bg-gray-800/95 backdrop-blur-sm border border-gray-700/50 rounded-2xl shadow-2xl overflow-hidden"
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-700/50">
          <div>
            <h2 className="text-2xl font-bold text-white mb-1">Connection History</h2>
            <p className="text-sm text-gray-400">View all events and test results for this connection</p>
          </div>
          <div className="flex items-center gap-2">
            {events.length > 0 && (
              <button
                onClick={exportLogs}
                className="flex items-center gap-2 px-3 py-2 bg-blue-500/20 hover:bg-blue-500/30 text-blue-300 rounded-lg text-sm font-medium transition-colors"
              >
                <Download className="h-4 w-4" />
                Export
              </button>
            )}
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-700/50 rounded-lg transition-colors"
              aria-label="Close"
            >
              <X className="h-5 w-5 text-gray-400" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 max-h-[60vh] overflow-y-auto custom-scrollbar">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <RefreshCw className="h-8 w-8 text-blue-400 animate-spin" />
            </div>
          ) : error ? (
            <div className="text-center py-12">
              <AlertCircle className="h-12 w-12 text-red-400 mx-auto mb-4" />
              <p className="text-gray-400">{error}</p>
              <button
                onClick={loadHistory}
                className="mt-4 px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg text-sm font-medium transition-colors"
              >
                Retry
              </button>
            </div>
          ) : events.length === 0 ? (
            <div className="text-center py-12">
              <Clock className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-400">No history available</p>
            </div>
          ) : (
            <div className="space-y-3">
              {events.map((event, index) => (
                <motion.div
                  key={event.id || index}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.05 }}
                  className="flex items-start gap-4 p-4 bg-gray-700/30 rounded-lg border border-gray-600/50 hover:border-gray-500/50 transition-colors"
                >
                  <div className="flex-shrink-0 mt-0.5">
                    {getActionIcon(event.action)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-semibold text-white capitalize">
                        {event.action.replace('_', ' ')}
                      </span>
                      <span className="text-xs text-gray-400 flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {formatTimestamp(event.timestamp)}
                      </span>
                    </div>
                    {event.details && (
                      <p className="text-sm text-gray-300">{event.details}</p>
                    )}
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
};

export default ConnectionHistory;

