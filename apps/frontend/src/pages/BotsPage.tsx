import { useState, useEffect } from 'react';
import { Plus, Bot as BotIcon, RefreshCw, Play, Pause, Square, Trash2 } from 'lucide-react';
import { Button } from '../components/ui/button';
import { toast } from 'sonner';
import { authenticatedFetch } from '../lib/api/auth';
import { logger } from '../utils/logger';

// Helper to get API base URL
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

// Bot interface
interface Bot {
  bot_id: string;
  name: string;
  bot_type: string;
  exchange: string;
  symbol: string;
  status: 'running' | 'paused' | 'stopped' | 'inactive';
  created_at: string;
  updated_at: string;
}

export default function BotsPage() {
  const [bots, setBots] = useState<Bot[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  // Fetch bots from API
  const fetchBots = async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      const API_BASE_URL = getApiBaseUrl();
      logger.debug('Fetching bots from:', `${API_BASE_URL}/bots/`);
      
      const response = await authenticatedFetch(`${API_BASE_URL}/bots/`);
      
      logger.debug('Response status:', response.status, response.statusText);
      
      if (!response.ok) {
        let errorMessage = `Failed to fetch bots (${response.status})`;
        
        if (response.status === 401) {
          errorMessage = 'Please sign in to view your bots';
        } else {
          try {
            const errorData = await response.json();
            logger.debug('Error response data:', errorData);
            
            // Handle different error formats
            if (errorData.detail) {
              if (Array.isArray(errorData.detail)) {
                // FastAPI validation errors
                errorMessage = errorData.detail.map((e: any) => e.msg || JSON.stringify(e)).join(', ');
              } else if (typeof errorData.detail === 'string') {
                errorMessage = errorData.detail;
              } else {
                errorMessage = JSON.stringify(errorData.detail);
              }
            } else if (errorData.message) {
              errorMessage = errorData.message;
            } else if (errorData.error) {
              errorMessage = typeof errorData.error === 'string' ? errorData.error : JSON.stringify(errorData.error);
            }
          } catch (parseError) {
            const text = await response.text().catch(() => '');
            logger.debug('Error response text:', text);
            errorMessage = text || `Failed to fetch bots: ${response.status} ${response.statusText}`;
          }
        }
        
        throw new Error(errorMessage);
      }
      
      const data = await response.json();
      logger.debug('Bots API response:', data);
      
      if (!data || !data.bots) {
        logger.warn('Unexpected response format:', data);
        setBots([]);
        return;
      }
      
      const botsList: Bot[] = (data.bots || []).map((bot: any) => ({
        bot_id: bot.bot_id || bot.id,
        name: bot.name || 'Unnamed Bot',
        bot_type: bot.bot_type || 'dca',
        exchange: bot.exchange || 'Binance',
        symbol: bot.symbol || bot.pair || '',
        status: (bot.status || 'inactive') as Bot['status'],
        created_at: bot.created_at || new Date().toISOString(),
        updated_at: bot.updated_at || new Date().toISOString(),
      }));
      
      logger.debug('Parsed bots:', botsList);
      setBots(botsList);
      
      if (botsList.length === 0) {
        logger.info('No bots found in database');
      }
    } catch (err: any) {
      // Extract proper error message
      let errorMessage = 'Failed to load bots';
      
      if (err instanceof Error) {
        errorMessage = err.message;
      } else if (typeof err === 'string') {
        errorMessage = err;
      } else if (err?.message) {
        errorMessage = err.message;
      } else if (err?.detail) {
        errorMessage = typeof err.detail === 'string' ? err.detail : JSON.stringify(err.detail);
      } else {
        errorMessage = JSON.stringify(err);
      }
      
      setError(errorMessage);
      logger.error('Error fetching bots:', { error: err, message: errorMessage });
      toast.error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  // Handle bot actions
  const handleBotAction = async (botId: string, action: 'start' | 'pause' | 'resume' | 'stop' | 'delete') => {
    try {
      setActionLoading(botId);
      const API_BASE_URL = getApiBaseUrl();
      let endpoint = '';
      let method = 'POST';
      
      switch (action) {
        case 'start':
          endpoint = `${API_BASE_URL}/bots/dca-bots/${botId}/start-paper`;
          break;
        case 'pause':
          endpoint = `${API_BASE_URL}/bots/dca-bots/${botId}/pause`;
          break;
        case 'resume':
          endpoint = `${API_BASE_URL}/bots/dca-bots/${botId}/resume`;
          break;
        case 'stop':
          endpoint = `${API_BASE_URL}/bots/dca-bots/${botId}/stop`;
          break;
        case 'delete':
          endpoint = `${API_BASE_URL}/bots/dca-bots/${botId}`;
          method = 'DELETE';
          break;
      }
      
      const response = await authenticatedFetch(endpoint, {
        method,
        ...(action === 'start' && {
          body: JSON.stringify({
            initial_balance: 10000,
            interval_seconds: 60,
            use_live_data: true
          })
        })
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ detail: `Failed to ${action} bot` }));
        throw new Error(errorData.detail || `Failed to ${action} bot`);
      }
      
      toast.success(`Bot ${action === 'start' ? 'started' : action === 'pause' ? 'paused' : action === 'resume' ? 'resumed' : action === 'stop' ? 'stopped' : 'deleted'} successfully`);
      
      // Refresh bots list
      await fetchBots();
    } catch (err: any) {
      const errorMessage = err.message || `Failed to ${action} bot`;
      logger.error(`Error ${action}ing bot:`, err);
      toast.error(errorMessage);
    } finally {
      setActionLoading(null);
    }
  };

  // Initial load
  useEffect(() => {
    fetchBots();
  }, []);

  const getStatusColor = (status: Bot['status']) => {
    switch (status) {
      case 'running':
        return 'bg-green-500';
      case 'paused':
        return 'bg-yellow-500';
      case 'stopped':
      case 'inactive':
        return 'bg-gray-500';
      default:
        return 'bg-gray-500';
    }
  };

  const getStatusLabel = (status: Bot['status']) => {
    switch (status) {
      case 'running':
        return 'Running';
      case 'paused':
        return 'Paused';
      case 'stopped':
        return 'Stopped';
      case 'inactive':
        return 'Inactive';
      default:
        return status;
    }
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Trading Bots</h1>
          <p className="text-gray-400 mt-1">Manage your automated trading strategies</p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            onClick={fetchBots}
            disabled={isLoading}
            className="text-white border-gray-600 hover:bg-gray-800"
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Button
            onClick={() => window.location.href = '/app/dca-bot'}
            className="bg-blue-600 hover:bg-blue-700 text-white"
          >
            <Plus className="h-4 w-4 mr-2" />
            Create Bot
          </Button>
        </div>
      </div>

      {/* Error Display */}
      {error && (
        <div className="bg-red-900/20 border border-red-500/50 rounded-lg p-4">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <p className="text-red-400 font-medium mb-1">Error loading bots</p>
              <p className="text-red-300 text-sm">{error}</p>
            </div>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setError(null)}
              className="text-red-400 hover:text-red-300"
            >
              ×
            </Button>
          </div>
        </div>
      )}

      {/* Loading State */}
      {isLoading && (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
        </div>
      )}

      {/* Bots List */}
      {!isLoading && !error && (
        <>
          {bots.length === 0 ? (
            <div className="text-center py-12">
              <BotIcon className="h-16 w-16 text-gray-600 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-white mb-2">No bots found</h3>
              <p className="text-gray-400 mb-4">Create your first trading bot to get started</p>
              <Button
                onClick={() => window.location.href = '/app/dca-bot'}
                className="bg-blue-600 hover:bg-blue-700 text-white"
              >
                <Plus className="h-4 w-4 mr-2" />
                Create Your First Bot
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {bots.map((bot) => (
                <div
                  key={bot.bot_id}
                  className="bg-gray-800 border border-gray-700 rounded-lg p-4 space-y-4"
                >
                  {/* Bot Header */}
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="text-lg font-semibold text-white">{bot.name}</h3>
                      <p className="text-sm text-gray-400">{bot.symbol} • {bot.exchange}</p>
                    </div>
                    <span className={`px-2 py-1 rounded text-xs font-medium text-white ${getStatusColor(bot.status)}`}>
                      {getStatusLabel(bot.status)}
                    </span>
                  </div>

                  {/* Bot Info */}
                  <div className="text-sm text-gray-400">
                    <p>Type: {bot.bot_type.toUpperCase()}</p>
                    <p>Created: {new Date(bot.created_at).toLocaleDateString()}</p>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2 pt-2 border-t border-gray-700">
                    {(bot.status === 'inactive' || bot.status === 'stopped') && (
                      <Button
                        size="sm"
                        onClick={() => handleBotAction(bot.bot_id, 'start')}
                        disabled={actionLoading === bot.bot_id}
                        className="bg-green-600 hover:bg-green-700 text-white flex-1"
                      >
                        <Play className="h-4 w-4 mr-1" />
                        Start
                      </Button>
                    )}
                    {bot.status === 'paused' && (
                      <Button
                        size="sm"
                        onClick={() => handleBotAction(bot.bot_id, 'resume')}
                        disabled={actionLoading === bot.bot_id}
                        className="bg-blue-600 hover:bg-blue-700 text-white flex-1"
                      >
                        <Play className="h-4 w-4 mr-1" />
                        Resume
                      </Button>
                    )}
                    {bot.status === 'running' && (
                      <>
                        <Button
                          size="sm"
                          onClick={() => handleBotAction(bot.bot_id, 'pause')}
                          disabled={actionLoading === bot.bot_id}
                          className="bg-yellow-600 hover:bg-yellow-700 text-white flex-1"
                        >
                          <Pause className="h-4 w-4 mr-1" />
                          Pause
                        </Button>
                        <Button
                          size="sm"
                          onClick={() => handleBotAction(bot.bot_id, 'stop')}
                          disabled={actionLoading === bot.bot_id}
                          className="bg-red-600 hover:bg-red-700 text-white flex-1"
                        >
                          <Square className="h-4 w-4 mr-1" />
                          Stop
                        </Button>
                      </>
                    )}
                    {(bot.status === 'paused' || bot.status === 'stopped') && (
                      <Button
                        size="sm"
                        onClick={() => handleBotAction(bot.bot_id, 'stop')}
                        disabled={actionLoading === bot.bot_id}
                        className="bg-red-600 hover:bg-red-700 text-white"
                      >
                        <Square className="h-4 w-4 mr-1" />
                        Stop
                      </Button>
                    )}
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        if (confirm(`Are you sure you want to delete ${bot.name}?`)) {
                          handleBotAction(bot.bot_id, 'delete');
                        }
                      }}
                      disabled={actionLoading === bot.bot_id}
                      className="border-red-600 text-red-400 hover:bg-red-900/20"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
