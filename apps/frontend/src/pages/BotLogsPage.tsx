import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  ArrowLeft, 
  RefreshCw, 
  Activity, 
  TrendingUp, 
  TrendingDown, 
  AlertCircle, 
  CheckCircle, 
  Info,
  Clock,
  DollarSign,
  Package,
  FileText,
} from 'lucide-react';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { authenticatedFetch } from '../lib/api/auth';
import { logger } from '../utils/logger';
import { toast } from 'sonner';
import { Skeleton } from '../components/ui/skeleton';

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

interface BotDetails {
  bot_id: string;
  name: string;
  bot_type: string;
  exchange: string;
  status: string;
  created_at: string;
  updated_at: string;
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

export default function BotLogsPage() {
  const { botId } = useParams<{ botId: string }>();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'overview' | 'events' | 'orders' | 'timeline'>('overview');
  
  // Data states
  const [botDetails, setBotDetails] = useState<BotDetails | null>(null);
  const [status, setStatus] = useState<BotStatus | null>(null);
  const [events, setEvents] = useState<BotEvent[]>([]);
  const [orders, setOrders] = useState<BotOrder[]>([]);
  const [timeline, setTimeline] = useState<any[]>([]);
  
  // UI states
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch bot details - get from bots list and find matching bot
  const fetchBotDetails = async () => {
    if (!botId) return;
    
    try {
      const API_BASE_URL = getApiBaseUrl();
      // Fetch all bots and find the one matching botId
      const response = await authenticatedFetch(`${API_BASE_URL}/bots/`);
      if (response.ok) {
        const data = await response.json();
        const botsArray = Array.isArray(data) ? data : (data.bots || []);
        const bot = (botsArray as any[]).find((b) => {
          const bid = b.bot_id || b.id;
          return bid === botId;
        });
        
        if (bot) {
          const botData = bot;
          const botDetailsObj: BotDetails = {
            bot_id: botId,
            name: botData.name || `Bot ${botId}`,
            bot_type: botData.bot_type || 'dca',
            exchange: botData.exchange || 'Binance',
            status: botData.status || 'inactive',
            created_at: botData.created_at || new Date().toISOString(),
            updated_at: botData.updated_at || new Date().toISOString()
          };
          setBotDetails(botDetailsObj);
        } else {
          // Bot not found in list, try to get basic info from status endpoint
          const statusResponse = await authenticatedFetch(`${API_BASE_URL}/bots/dca-bots/${botId}/status`);
          if (statusResponse.ok) {
            const statusData = await statusResponse.json();
            if (statusData.database) {
              setBotDetails({
                bot_id: botId,
                name: `Bot ${botId}`,
                bot_type: 'dca',
                exchange: 'Binance',
                status: statusData.database.status,
                created_at: statusData.database.created_at,
                updated_at: statusData.database.updated_at
              });
            }
          } else if (statusResponse.status === 404) {
            setError('Bot not found');
            toast.error('Bot not found', { description: 'The bot you are looking for does not exist.' });
            setTimeout(() => navigate('/app/bots'), 2000);
          }
        }
      }
    } catch (error: any) {
      logger.error('Error fetching bot details:', error);
      // Don't set error here, let status fetch handle it
    }
  };

  // Fetch bot status
  const fetchBotStatus = async () => {
    if (!botId) {
      console.log('⚠️ fetchBotStatus: No botId provided');
      return;
    }
    
    try {
      const API_BASE_URL = getApiBaseUrl();
      console.log('🔍 Fetching bot status for:', botId);
      const response = await authenticatedFetch(`${API_BASE_URL}/bots/dca-bots/${botId}/status`);
      console.log('📡 Status API response:', { status: response.status, ok: response.ok });
      
      if (response.ok) {
        const data = await response.json();
        console.log('📦 Status data received:', data);
        setStatus(data);
      } else {
        const errorText = await response.text();
        console.error('❌ Status API error:', { status: response.status, error: errorText });
        logger.error('Failed to fetch bot status', { status: response.status, error: errorText });
      }
    } catch (error: any) {
      console.error('❌ Error fetching bot status:', error);
      logger.error('Error fetching bot status:', error);
    }
  };

  // Fetch events
  const fetchEvents = async () => {
    if (!botId) {
      console.log('⚠️ fetchEvents: No botId provided');
      return;
    }
    
    try {
      const API_BASE_URL = getApiBaseUrl();
      console.log('🔍 Fetching events for bot:', botId, `${API_BASE_URL}/bots/dca-bots/${botId}/events?limit=100`);
      const response = await authenticatedFetch(`${API_BASE_URL}/bots/dca-bots/${botId}/events?limit=100`);
      console.log('📡 Events API response:', { status: response.status, ok: response.ok });
      
      if (response.ok) {
        const data = await response.json();
        console.log('📦 Events data received:', { 
          success: data.success, 
          eventsCount: data.events?.length || 0,
          total: data.total,
          data: data 
        });
        setEvents(data.events || []);
        
        if (!data.events || data.events.length === 0) {
          console.warn('⚠️ No events found for bot:', botId);
          if (data.message) {
            console.warn('📝 Message:', data.message);
          }
        }
      } else {
        const errorText = await response.text();
        console.error('❌ Events API error:', { status: response.status, error: errorText });
        logger.error('Failed to fetch events', { status: response.status, error: errorText });
        toast.error('Failed to fetch events', { description: `Status: ${response.status}` });
      }
    } catch (error: any) {
      console.error('❌ Error fetching events:', error);
      logger.error('Error fetching events:', error);
      toast.error('Error fetching events', { description: error.message });
    }
  };

  // Fetch orders
  const fetchOrders = async () => {
    if (!botId) return;
    
    try {
      const API_BASE_URL = getApiBaseUrl();
      const response = await authenticatedFetch(`${API_BASE_URL}/bots/dca-bots/${botId}/orders?limit=100`);
      if (response.ok) {
        const data = await response.json();
        setOrders(data.orders || []);
      }
    } catch (error: any) {
      logger.error('Error fetching orders:', error);
    }
  };

  // Fetch timeline
  const fetchTimeline = async () => {
    if (!botId) return;
    
    try {
      const API_BASE_URL = getApiBaseUrl();
      const response = await authenticatedFetch(`${API_BASE_URL}/bots/dca-bots/${botId}/timeline?limit=200`);
      if (response.ok) {
        const data = await response.json();
        setTimeline(data.timeline || []);
      }
    } catch (error: any) {
      logger.error('Error fetching timeline:', error);
    }
  };

  // Fetch all data
  const fetchAll = async (showLoading = true) => {
    if (!botId) {
      setError('No bot ID provided');
      return;
    }

    if (showLoading) {
      setIsRefreshing(true);
    }

    try {
      await Promise.all([
        fetchBotDetails(),
        fetchBotStatus(),
        fetchEvents(),
        fetchOrders(),
        fetchTimeline()
      ]);
      setError(null);
    } catch (error: any) {
      logger.error('Error fetching bot logs:', error);
      setError('Failed to load bot logs');
      toast.error('Failed to load bot logs', { description: error.message });
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  // Initial load
  useEffect(() => {
    console.log('🔍 BotLogsPage useEffect - botId:', botId);
    if (botId) {
      console.log('✅ BotId found, fetching all data...');
      fetchAll();
    } else {
      console.error('❌ No botId provided');
      setError('Invalid bot ID');
      setIsLoading(false);
    }
  }, [botId]);

  // Auto-refresh
  useEffect(() => {
    if (!autoRefresh || !botId || isLoading) return;

    const interval = setInterval(() => {
      fetchAll(false); // Don't show loading spinner on auto-refresh
    }, 10000); // Refresh every 10 seconds

    return () => clearInterval(interval);
  }, [autoRefresh, botId, isLoading]);

  // Helper functions
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

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'running':
        return 'bg-green-100 text-green-800 border-green-200 dark:bg-green-900/30 dark:text-green-400';
      case 'paused':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200 dark:bg-yellow-900/30 dark:text-yellow-400';
      case 'stopped':
        return 'bg-red-100 text-red-800 border-red-200 dark:bg-red-900/30 dark:text-red-400';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200 dark:bg-gray-900/30 dark:text-gray-400';
    }
  };

  // Loading state
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-6">
        <div className="max-w-7xl mx-auto space-y-6">
          <Skeleton className="h-16 w-full" />
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-96 w-full" />
        </div>
      </div>
    );
  }

  // Error state
  if (error && !botDetails) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center p-6">
        <Card className="max-w-md w-full">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-red-500" />
              Error
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-gray-600 dark:text-gray-400 mb-4">{error}</p>
            <div className="flex gap-2">
              <Button onClick={() => navigate('/app/bots')} variant="outline">
                Back to Bots
              </Button>
              <Button onClick={() => fetchAll()}>
                <RefreshCw className="h-4 w-4 mr-2" />
                Retry
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const overallStatus = status?.overall_status || botDetails?.status || 'unknown';
  const totalOrders = orders.length;
  const totalEvents = events.length;
  const lastActivity = events[0]?.created_at || orders[0]?.created_at || 'Never';

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="max-w-7xl mx-auto p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate('/app/bots')}
              className="flex items-center gap-2"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to Bots
            </Button>
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                {botDetails?.name || 'Bot Logs'}
              </h1>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Bot ID: {botId}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Badge className={getStatusColor(overallStatus)}>
              {overallStatus}
            </Badge>
            <Button
              variant="outline"
              size="sm"
              onClick={() => fetchAll()}
              disabled={isRefreshing}
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setAutoRefresh(!autoRefresh)}
            >
              {autoRefresh ? '⏸️ Auto' : '▶️ Auto'}
            </Button>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Status</CardTitle>
              <Activity className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{overallStatus}</div>
              <p className="text-xs text-muted-foreground">
                {status?.memory?.is_healthy ? 'Healthy' : 'Unhealthy'}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Orders</CardTitle>
              <Package className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{totalOrders}</div>
              <p className="text-xs text-muted-foreground">
                {orders.filter(o => o.side === 'buy').length} buys, {orders.filter(o => o.side === 'sell').length} sells
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Events</CardTitle>
              <FileText className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{totalEvents}</div>
              <p className="text-xs text-muted-foreground">
                {status?.memory?.iteration_count || 0} iterations
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Last Activity</CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-sm">
                {lastActivity !== 'Never' ? new Date(lastActivity).toLocaleTimeString() : 'Never'}
              </div>
              <p className="text-xs text-muted-foreground">
                {lastActivity !== 'Never' ? new Date(lastActivity).toLocaleDateString() : 'No activity yet'}
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)}>
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="events">Events ({events.length})</TabsTrigger>
            <TabsTrigger value="orders">Orders ({orders.length})</TabsTrigger>
            <TabsTrigger value="timeline">Timeline</TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Status Details */}
              <Card>
                <CardHeader>
                  <CardTitle>Execution Status</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {status?.memory ? (
                    <>
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600 dark:text-gray-400">Running in Memory:</span>
                        <span>{status.memory.running_in_memory ? '✅ Yes' : '❌ No'}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600 dark:text-gray-400">Paused:</span>
                        <span>{status.memory.paused ? '⏸️ Yes' : '▶️ No'}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600 dark:text-gray-400">Iteration Count:</span>
                        <span>{status.memory.iteration_count}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600 dark:text-gray-400">Last Execution:</span>
                        <span className="text-xs">
                          {status.memory.last_execution_time ? formatTime(status.memory.last_execution_time) : 'Never'}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600 dark:text-gray-400">Next Execution:</span>
                        <span className="text-xs">
                          {status.memory.next_execution_time ? formatTime(status.memory.next_execution_time) : 'N/A'}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600 dark:text-gray-400">Time Until Next:</span>
                        <span>{status.memory.time_until_next_seconds !== null ? `${status.memory.time_until_next_seconds}s` : 'N/A'}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600 dark:text-gray-400">Health:</span>
                        <span className={status.memory.is_healthy ? 'text-green-600' : 'text-red-600'}>
                          {status.memory.is_healthy ? '✅ Healthy' : '❌ Unhealthy'}
                        </span>
                      </div>
                    </>
                  ) : (
                    <p className="text-sm text-gray-500">No execution data available</p>
                  )}
                </CardContent>
              </Card>

              {/* Recent Activity */}
              <Card>
                <CardHeader>
                  <CardTitle>Recent Activity</CardTitle>
                </CardHeader>
                <CardContent>
                  {status?.recent_activity?.events && status.recent_activity.events.length > 0 ? (
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
                  ) : (
                    <p className="text-sm text-gray-500">No recent activity</p>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Events Tab */}
          <TabsContent value="events" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Bot Events {events.length > 0 && `(${events.length})`}</CardTitle>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <div className="text-center py-8 text-gray-500">Loading events...</div>
                ) : events.length > 0 ? (
                  <div className="space-y-2 max-h-[600px] overflow-y-auto">
                    {events.map((event) => (
                      <div key={event.event_id || event.id || Math.random()} className="border-b border-gray-200 dark:border-gray-700 pb-2">
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
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 space-y-3">
                    <div className="text-gray-500 font-medium">No events found</div>
                    <div className="text-xs text-gray-400 space-y-1">
                      <p>Possible reasons:</p>
                      <ul className="list-disc list-inside space-y-1 text-left max-w-md mx-auto">
                        <li>Bot hasn't been started yet</li>
                        <li>Bot hasn't executed any actions</li>
                        <li>bot_events table doesn't exist in database</li>
                        <li>Events haven't been logged yet</li>
                      </ul>
                    </div>
                    {error && (
                      <div className="text-xs text-red-500 mt-2">
                        Error: {error}
                      </div>
                    )}
                    <div className="text-xs text-blue-500 mt-4">
                      💡 Check browser console (F12) for detailed API response logs
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Orders Tab */}
          <TabsContent value="orders" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Order History</CardTitle>
              </CardHeader>
              <CardContent>
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
              </CardContent>
            </Card>
          </TabsContent>

          {/* Timeline Tab */}
          <TabsContent value="timeline" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Timeline</CardTitle>
              </CardHeader>
              <CardContent>
                {timeline.length > 0 ? (
                  <div className="space-y-2 max-h-[600px] overflow-y-auto">
                    {timeline.map((item, index) => (
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
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-gray-500">No timeline data found</div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

