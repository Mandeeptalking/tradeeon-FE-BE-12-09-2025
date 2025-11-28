import { useState, useEffect } from 'react';
import { X, RefreshCw, Clock, Activity, TrendingUp, TrendingDown, AlertCircle, CheckCircle, Info } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '../ui/dialog';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { authenticatedFetch } from '../../lib/api/auth';
import { logger } from '../../utils/logger';
import { toast } from 'sonner';

interface BotEvent {
  event_id: string;
  event_type: string;
  event_category: string;
  message: string;
  details: any;
  created_at: string;
}

interface BotOrder {
  order_id: string;
  symbol: string;
  side: string;
  qty: number;
  order_type: string;
  status: string;
  filled_qty: number;
  avg_price: number;
  created_at: string;
}

interface BotStatus {
  overall_status: string;
  status_details: string[];
  database: {
    status: string;
    created_at: string;
    updated_at: string;
  };
  memory: {
    running_in_memory: boolean;
    executor_status: string;
    paused: boolean;
    iteration_count: number;
    last_execution_time: string;
    next_execution_time: string;
    time_until_next_seconds: number;
    is_healthy: boolean;
  } | null;
  latest_run: any;
  recent_activity: {
    events_count: number;
    events: BotEvent[];
  };
}

interface BotLogsModalProps {
  botId: string;
  botName: string;
  isOpen: boolean;
  onClose: () => void;
}

function getApiBaseUrl(): string {
  const apiUrl = import.meta.env.VITE_API_URL;
  if (import.meta.env.PROD) {
    if (!apiUrl || !apiUrl.startsWith('https://')) {
      throw new Error('API URL must use HTTPS in production');
    }
    return apiUrl;
  }
  return apiUrl || 'http://localhost:8000';
}

export default function BotLogsModal({ botId, botName, isOpen, onClose }: BotLogsModalProps) {
  const [activeTab, setActiveTab] = useState<'status' | 'events' | 'orders' | 'timeline'>('status');
  const [status, setStatus] = useState<BotStatus | null>(null);
  const [events, setEvents] = useState<BotEvent[]>([]);
  const [orders, setOrders] = useState<BotOrder[]>([]);
  const [timeline, setTimeline] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [autoRefresh, setAutoRefresh] = useState(true);

  // Don't render if no botId
  if (!botId) {
    return null;
  }

  const fetchBotStatus = async () => {
    try {
      const API_BASE_URL = getApiBaseUrl();
      logger.debug('Fetching bot status', { botId, url: `${API_BASE_URL}/bots/dca-bots/${botId}/status` });
      const response = await authenticatedFetch(`${API_BASE_URL}/bots/dca-bots/${botId}/status`);
      if (response.ok) {
        const data = await response.json();
        logger.debug('Bot status fetched successfully', data);
        setStatus(data);
      } else {
        const errorText = await response.text();
        logger.error('Failed to fetch bot status', { status: response.status, error: errorText });
        throw new Error(`Failed to fetch bot status: ${response.status} ${errorText}`);
      }
    } catch (error: any) {
      logger.error('Error fetching bot status:', error);
      toast.error('Failed to fetch bot status', { description: error.message });
    }
  };

  const fetchEvents = async () => {
    try {
      const API_BASE_URL = getApiBaseUrl();
      const response = await authenticatedFetch(`${API_BASE_URL}/bots/dca-bots/${botId}/events?limit=50`);
      if (response.ok) {
        const data = await response.json();
        logger.debug('Events fetched', { count: data.events?.length || 0 });
        setEvents(data.events || []);
      } else {
        logger.error('Failed to fetch events', { status: response.status });
      }
    } catch (error: any) {
      logger.error('Error fetching events:', error);
    }
  };

  const fetchOrders = async () => {
    try {
      const API_BASE_URL = getApiBaseUrl();
      const response = await authenticatedFetch(`${API_BASE_URL}/bots/dca-bots/${botId}/orders?limit=50`);
      if (response.ok) {
        const data = await response.json();
        logger.debug('Orders fetched', { count: data.orders?.length || 0 });
        setOrders(data.orders || []);
      } else {
        logger.error('Failed to fetch orders', { status: response.status });
      }
    } catch (error: any) {
      logger.error('Error fetching orders:', error);
    }
  };

  const fetchTimeline = async () => {
    try {
      const API_BASE_URL = getApiBaseUrl();
      const response = await authenticatedFetch(`${API_BASE_URL}/bots/dca-bots/${botId}/timeline?limit=100`);
      if (response.ok) {
        const data = await response.json();
        setTimeline(data.timeline || []);
      }
    } catch (error: any) {
      logger.error('Error fetching timeline:', error);
    }
  };

  const fetchAll = async () => {
    setIsLoading(true);
    try {
      await Promise.all([
        fetchBotStatus(),
        fetchEvents(),
        fetchOrders(),
        fetchTimeline()
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen && botId) {
      fetchAll();
    }
  }, [isOpen, botId]);

  useEffect(() => {
    if (!isOpen || !autoRefresh) return;

    const interval = setInterval(() => {
      if (activeTab === 'status') {
        fetchBotStatus();
      } else if (activeTab === 'events') {
        fetchEvents();
      } else if (activeTab === 'orders') {
        fetchOrders();
      } else if (activeTab === 'timeline') {
        fetchTimeline();
      }
    }, 5000); // Refresh every 5 seconds

    return () => clearInterval(interval);
  }, [isOpen, autoRefresh, activeTab, botId]);

  const getEventIcon = (category: string, type: string) => {
    if (type.includes('executed') || type.includes('success')) {
      return <CheckCircle className="h-4 w-4 text-green-500" />;
    }
    if (type.includes('failed') || type.includes('error')) {
      return <AlertCircle className="h-4 w-4 text-red-500" />;
    }
    if (category === 'trade' || category === 'execution') {
      return <TrendingUp className="h-4 w-4 text-blue-500" />;
    }
    return <Info className="h-4 w-4 text-gray-500" />;
  };

  const formatTime = (timestamp: string) => {
    return new Date(timestamp).toLocaleString();
  };

  // Debug logging
  useEffect(() => {
    console.log('🔍 BotLogsModal useEffect - isOpen changed:', { isOpen, botId, botName });
    if (isOpen) {
      logger.debug('BotLogsModal opened', { botId, botName });
      console.log('✅ BotLogsModal: Modal should be visible', { botId, botName, isOpen });
    } else {
      console.log('❌ BotLogsModal: Modal is closed', { botId, botName, isOpen });
    }
  }, [isOpen, botId, botName]);

  // Always render Dialog, let Radix UI handle visibility
  console.log('🔍 BotLogsModal render - isOpen:', isOpen, 'botId:', botId);
  
  return (
    <Dialog 
      open={isOpen} 
      onOpenChange={(open) => {
        console.log('🔍 Dialog onOpenChange called', { open, currentIsOpen: isOpen, botId });
        logger.debug('Dialog onOpenChange called', { open });
        if (!open) {
          console.log('🔍 Closing dialog, calling onClose');
          onClose();
        }
      }}
    >
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle className="text-xl font-semibold">
              Bot Logs: {botName}
            </DialogTitle>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={fetchAll}
                disabled={isLoading}
              >
                <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
                Refresh
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setAutoRefresh(!autoRefresh)}
              >
                {autoRefresh ? '⏸️ Auto' : '▶️ Auto'}
              </Button>
              <Button variant="ghost" size="sm" onClick={onClose}>
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </DialogHeader>

        {/* Tabs */}
        <div className="flex border-b border-gray-200 dark:border-gray-700">
          {(['status', 'events', 'orders', 'timeline'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                activeTab === tab
                  ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                  : 'border-transparent text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
              }`}
            >
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4">
          {activeTab === 'status' && (
            <div className="space-y-4">
              {status ? (
                <>
                  <div className="bg-gray-50 dark:bg-gray-900/50 rounded-lg p-4">
                    <h3 className="font-semibold mb-2">Overall Status</h3>
                    <Badge className={
                      status.overall_status === 'running' 
                        ? 'bg-green-100 text-green-800' 
                        : status.overall_status === 'paused'
                        ? 'bg-yellow-100 text-yellow-800'
                        : 'bg-gray-100 text-gray-800'
                    }>
                      {status.overall_status}
                    </Badge>
                    <div className="mt-2 text-sm text-gray-600 dark:text-gray-400">
                      {status.status_details.map((detail, i) => (
                        <div key={i}>• {detail}</div>
                      ))}
                    </div>
                  </div>

                  {status.memory && (
                    <div className="bg-gray-50 dark:bg-gray-900/50 rounded-lg p-4">
                      <h3 className="font-semibold mb-2">Execution Status</h3>
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span>Running in Memory:</span>
                          <span>{status.memory.running_in_memory ? '✅ Yes' : '❌ No'}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Paused:</span>
                          <span>{status.memory.paused ? '⏸️ Yes' : '▶️ No'}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Iteration Count:</span>
                          <span>{status.memory.iteration_count}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Last Execution:</span>
                          <span>{status.memory.last_execution_time ? formatTime(status.memory.last_execution_time) : 'Never'}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Next Execution:</span>
                          <span>{status.memory.next_execution_time ? formatTime(status.memory.next_execution_time) : 'N/A'}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Time Until Next:</span>
                          <span>{status.memory.time_until_next_seconds !== null ? `${status.memory.time_until_next_seconds}s` : 'N/A'}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Health:</span>
                          <span className={status.memory.is_healthy ? 'text-green-600' : 'text-red-600'}>
                            {status.memory.is_healthy ? '✅ Healthy' : '❌ Unhealthy'}
                          </span>
                        </div>
                      </div>
                    </div>
                  )}

                  {status.recent_activity.events.length > 0 && (
                    <div className="bg-gray-50 dark:bg-gray-900/50 rounded-lg p-4">
                      <h3 className="font-semibold mb-2">Recent Activity</h3>
                      <div className="space-y-2">
                        {status.recent_activity.events.slice(0, 5).map((event) => (
                          <div key={event.event_id} className="text-sm flex items-start gap-2">
                            {getEventIcon(event.event_category, event.event_type)}
                            <div className="flex-1">
                              <div className="font-medium">{event.message}</div>
                              <div className="text-xs text-gray-500">{formatTime(event.created_at)}</div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </>
              ) : (
                <div className="text-center py-8 text-gray-500">Loading status...</div>
              )}
            </div>
          )}

          {activeTab === 'events' && (
            <div className="space-y-2">
              {events.length > 0 ? (
                events.map((event) => (
                  <div key={event.event_id} className="border-b border-gray-200 dark:border-gray-700 pb-2">
                    <div className="flex items-start gap-2">
                      {getEventIcon(event.event_category, event.event_type)}
                      <div className="flex-1">
                        <div className="font-medium">{event.message}</div>
                        <div className="text-xs text-gray-500 mt-1">
                          <Badge variant="outline" className="mr-2">{event.event_type}</Badge>
                          <Badge variant="outline">{event.event_category}</Badge>
                          <span className="ml-2">{formatTime(event.created_at)}</span>
                        </div>
                        {event.details && Object.keys(event.details).length > 0 && (
                          <details className="mt-2 text-xs">
                            <summary className="cursor-pointer text-blue-600">Details</summary>
                            <pre className="mt-1 p-2 bg-gray-100 dark:bg-gray-800 rounded text-xs overflow-x-auto">
                              {JSON.stringify(event.details, null, 2)}
                            </pre>
                          </details>
                        )}
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-8 text-gray-500">No events found</div>
              )}
            </div>
          )}

          {activeTab === 'orders' && (
            <div className="space-y-2">
              {orders.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-gray-200 dark:border-gray-700">
                        <th className="text-left p-2">Time</th>
                        <th className="text-left p-2">Symbol</th>
                        <th className="text-left p-2">Side</th>
                        <th className="text-left p-2">Quantity</th>
                        <th className="text-left p-2">Price</th>
                        <th className="text-left p-2">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {orders.map((order) => (
                        <tr key={order.order_id} className="border-b border-gray-200 dark:border-gray-700">
                          <td className="p-2">{formatTime(order.created_at)}</td>
                          <td className="p-2">{order.symbol}</td>
                          <td className="p-2">
                            <Badge className={order.side === 'buy' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}>
                              {order.side.toUpperCase()}
                            </Badge>
                          </td>
                          <td className="p-2">{order.filled_qty}</td>
                          <td className="p-2">${order.avg_price.toFixed(4)}</td>
                          <td className="p-2">
                            <Badge className={order.status === 'filled' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}>
                              {order.status}
                            </Badge>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">No orders found</div>
              )}
            </div>
          )}

          {activeTab === 'timeline' && (
            <div className="space-y-2">
              {timeline.length > 0 ? (
                timeline.map((item, index) => (
                  <div key={index} className="border-l-2 border-blue-500 pl-4 pb-4">
                    <div className="flex items-start gap-2">
                      {item.type === 'order' ? (
                        <TrendingUp className="h-4 w-4 text-blue-500 mt-1" />
                      ) : (
                        <Activity className="h-4 w-4 text-gray-500 mt-1" />
                      )}
                      <div className="flex-1">
                        <div className="font-medium">
                          {item.type === 'order' 
                            ? `${item.data.side.toUpperCase()} ${item.data.symbol} - ${item.data.filled_qty} @ $${item.data.avg_price}`
                            : item.data.message}
                        </div>
                        <div className="text-xs text-gray-500 mt-1">
                          <Badge variant="outline" className="mr-2">{item.type}</Badge>
                          {formatTime(item.timestamp)}
                        </div>
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-8 text-gray-500">No timeline data found</div>
              )}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

