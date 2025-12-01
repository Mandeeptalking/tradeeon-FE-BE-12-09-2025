import { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Plus, 
  Bot as BotIcon, 
  RefreshCw, 
  Search,
  Filter,
  X,
  AlertCircle,
  TrendingUp,
  DollarSign,
  Activity,
  Grid3x3,
  List,
  SortAsc,
} from 'lucide-react';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Badge } from '../components/ui/badge';
import { Skeleton } from '../components/ui/skeleton';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../components/ui/select';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';
import { authenticatedFetch } from '../lib/api/auth';
import { logger } from '../utils/logger';
import BotCard from '../components/bots/BotCard';
import { StatCard } from '../components/dashboard/StatCard';
import EmptyState from '../components/EmptyState';
import type { Bot, BotStatus, Exchange, BotType } from '../lib/api/bots';
import { getKPIs, filterBots } from '../lib/api/bots';

// Helper to get API base URL
function getApiBaseUrl(): string {
  const apiUrl = import.meta.env.VITE_API_URL;
  
  // Log for debugging (remove in production if needed)
  if (import.meta.env.DEV) {
    console.log('[DEBUG] VITE_API_URL:', apiUrl);
  }
  
  if (import.meta.env.PROD) {
    if (!apiUrl || !apiUrl.startsWith('https://')) {
      throw new Error('API URL must use HTTPS in production');
    }
    return apiUrl;
  }
  
  // In development, prefer VITE_API_URL if set, otherwise default to localhost
  // This allows testing against production API if needed
  return apiUrl || 'http://localhost:8000';
}

// Extended bot interface for internal use
interface ExtendedBot extends Bot {
  symbol?: string; // For backward compatibility
}

export default function BotsPage() {
  const navigate = useNavigate();
  const [bots, setBots] = useState<ExtendedBot[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<{ title: string; details: string; tips?: string[] } | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  
  // Filter states
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('All');
  const [exchangeFilter, setExchangeFilter] = useState<string>('All');
  const [botTypeFilter, setBotTypeFilter] = useState<string>('All');
  const [sortBy, setSortBy] = useState<'name' | 'status' | 'created' | 'pnl'>('created');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  // Debounced search
  const [debouncedSearch, setDebouncedSearch] = useState('');
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchQuery);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

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
        let errorTitle = '';
        let errorDetails = '';
        let errorTips: string[] = [];
        
        // Handle specific status codes with user-friendly messages
        if (response.status === 401) {
          errorTitle = 'Authentication Required';
          errorDetails = 'Please sign in to view your bots. Your session may have expired.';
          errorTips = ['Ensure you are logged in.', 'Try logging out and logging back in.'];
        } else if (response.status === 403) {
          errorTitle = 'Access Denied';
          errorDetails = 'You do not have permission to view bots.';
          errorTips = ['Contact support if you believe this is an error.'];
        } else if (response.status === 422) {
          errorTitle = 'Invalid Request';
          errorDetails = 'The request format is incorrect. This may indicate the backend needs to be updated.';
          errorTips = ['Ensure the backend is running the latest code.', 'Check backend logs for validation errors.'];
        } else if (response.status === 500) {
          errorTitle = 'Server Error';
          errorDetails = 'The server encountered an error while fetching bots. Please try again later.';
          errorTips = ['Check backend logs for detailed error messages.', 'Try refreshing the page.'];
        } else if (response.status === 503) {
          errorTitle = 'Service Unavailable';
          errorDetails = 'The database service is not available. Please contact support.';
          errorTips = ['Verify Supabase connection in backend logs.', 'Ensure Supabase credentials are correct.'];
        } else {
          errorTitle = `Failed to fetch bots (${response.status})`;
        }
        
        // Try to parse error response for more details
        try {
          const errorData = await response.json();
          logger.debug('Error response data:', errorData);
          
          if (errorData.detail) {
            if (Array.isArray(errorData.detail)) {
              const validationErrors = errorData.detail.map((e: any) => {
                const field = e.loc && e.loc.length > 1 ? e.loc[e.loc.length - 1] : 'field';
                const msg = e.msg || 'is required';
                return `${field}: ${msg}`;
              });
              
              if (response.status === 422) {
                errorTitle = 'Backend Configuration Error';
                errorDetails = `The backend is expecting a parameter that should not be required: ${validationErrors.join(', ')}. This indicates the backend code needs to be updated.`;
                errorTips = ['Deploy the latest backend code to Lightsail.', 'Ensure the backend Docker image is rebuilt without cache.'];
              } else {
                errorDetails = validationErrors.join('; ');
              }
            } else if (typeof errorData.detail === 'string') {
              errorDetails = errorData.detail;
            } else {
              errorDetails = JSON.stringify(errorData.detail);
            }
          } else if (errorData.message) {
            errorDetails = errorData.message;
          }
        } catch (parseError) {
          // If JSON parsing fails, try to get text
          try {
            const text = await response.text();
            logger.debug('Error response text:', text);
            if (text && text.length < 200) {
              errorDetails = text;
            }
          } catch (textError) {
            logger.debug('Could not parse error response');
          }
        }
        
        setError({ title: errorTitle, details: errorDetails, tips: errorTips });
        logger.error('Bot fetch error:', { status: response.status, title: errorTitle, details: errorDetails });
        toast.error(errorTitle, { description: errorDetails });
        return;
      }
      
      const data = await response.json();
      logger.debug('Bots API response:', data);
      
      // Handle different response formats
      let botsArray = [];
      if (Array.isArray(data)) {
        botsArray = data;
      } else if (data.bots && Array.isArray(data.bots)) {
        botsArray = data.bots;
      } else if (data.data && Array.isArray(data.data)) {
        botsArray = data.data;
      } else {
        logger.warn('Unexpected response format:', data);
        setBots([]);
        return;
      }
      
      // Map bot data to BotCard interface with defaults for missing fields
      const botsList: ExtendedBot[] = botsArray.map((bot: any) => ({
        bot_id: bot.bot_id || bot.id,
        name: bot.name || 'Unnamed Bot',
        bot_type: (bot.bot_type || 'dca') as BotType,
        exchange: (bot.exchange || 'Binance') as Exchange,
        pair: bot.symbol || bot.pair || '',
        symbol: bot.symbol || bot.pair || '', // Keep for backward compatibility
        status: (bot.status || 'inactive') as BotStatus,
        invested: bot.invested || bot.required_capital || 0,
        pnl_24h: bot.pnl_24h || 0,
        pnl_24h_pct: bot.pnl_24h_pct || 0,
        pnl_realized_mtd: bot.pnl_realized_mtd || 0,
        orders_count: bot.orders_count || 0,
        created_at: bot.created_at || new Date().toISOString(),
        updated_at: bot.updated_at || new Date().toISOString(),
        sparkline: bot.sparkline || Array(12).fill(0),
      }));
      
      logger.debug('Parsed bots:', botsList);
      setBots(botsList);
      
      if (botsList.length === 0) {
        logger.info('No bots found in database');
      }
    } catch (err: any) {
      let errorTitle = 'Failed to load bots';
      let errorDetails = 'An unexpected error occurred.';
      let errorTips: string[] = [];

      if (err instanceof Error) {
        errorDetails = err.message;
        if (errorDetails.includes(':')) {
          const parts = errorDetails.split(':');
          errorTitle = parts[0].trim();
          errorDetails = parts.slice(1).join(':').trim();
        }
      } else if (typeof err === 'string') {
        errorDetails = err;
      } else if (err && typeof err === 'object') {
        if (err.message) {
          errorDetails = err.message;
        } else if (err.detail) {
          errorDetails = typeof err.detail === 'string' ? err.detail : JSON.stringify(err.detail);
        }
      }
      
      setError({ title: errorTitle, details: errorDetails, tips: errorTips });
      logger.error('Error fetching bots:', { error: err, title: errorTitle, details: errorDetails });
      toast.error(errorTitle, { description: errorDetails });
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
      let requestBody: string | undefined = undefined;
      
      switch (action) {
        case 'start':
          // Get bot to check trading mode
          const bot = bots.find(b => b.bot_id === botId);
          const tradingMode = bot?.config?.tradingMode || 'test'; // Default to 'test' if not found
          
          // Use appropriate endpoint based on trading mode
          endpoint = tradingMode === 'live'
            ? `${API_BASE_URL}/bots/dca-bots/${botId}/start`
            : `${API_BASE_URL}/bots/dca-bots/${botId}/start-paper`;
          
          requestBody = JSON.stringify({
            initial_balance: 10000,
            interval_seconds: 60,
            use_live_data: true
          });
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
        default:
          throw new Error(`Unknown action: ${action}`);
      }
      
      logger.debug(`Executing bot action: ${action}`, { botId, endpoint, method });
      
      const fetchOptions: RequestInit = {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
      };
      
      // Only add body if it exists (for start action)
      if (requestBody) {
        fetchOptions.body = requestBody;
      }
      
      logger.debug(`Making API request:`, { 
        endpoint, 
        method, 
        hasBody: !!requestBody,
        body: requestBody 
      });
      
      let response: Response;
      try {
        response = await authenticatedFetch(endpoint, fetchOptions);
      } catch (fetchError: any) {
        logger.error(`Network error during bot action:`, {
          action,
          botId,
          error: fetchError,
          message: fetchError?.message
        });
        throw new Error(
          fetchError?.message || 
          `Network error: Failed to connect to server. Please check your internet connection and try again.`
        );
      }
      
      logger.debug(`Bot action response:`, { 
        action, 
        botId, 
        status: response.status, 
        statusText: response.statusText,
        ok: response.ok
      });
      
      if (!response.ok) {
        let errorMessage = `Failed to ${action} bot`;
        let errorDetails = '';
        
        try {
          const errorData = await response.json();
          logger.error(`Bot action error response:`, errorData);
          console.error('Bot action error details:', errorData);
          
          // Log full error structure for debugging
          // Temporarily disabled console.group to fix build issue
          // console.group('🔴 Bot Start Error - Full Details');
          console.error('Full Error Object:', JSON.stringify(errorData, null, 2));
          if (errorData.error) {
            console.error('Error Code:', errorData.error.code);
            console.error('Error Message:', errorData.error.message);
            if (errorData.error.details) {
              console.error('Error Details:', errorData.error.details);
              if (errorData.error.details.error_message) {
                console.error('Actual Error:', errorData.error.details.error_message);
              }
              if (errorData.error.details.error_type) {
                console.error('Error Type:', errorData.error.details.error_type);
              }
            }
          }
          // console.groupEnd();
          
          // Try multiple error formats
          if (errorData.error && errorData.error.message) {
            errorMessage = errorData.error.message;
            // Include error code if available
            if (errorData.error.code) {
              errorMessage = `[${errorData.error.code}] ${errorMessage}`;
            }
            // Include details if available
            if (errorData.error.details) {
              errorDetails = JSON.stringify(errorData.error.details);
              console.error('Error details:', errorData.error.details);
              // Extract specific error information from details
              if (errorData.error.details.error_message) {
                errorMessage = errorData.error.details.error_message;
              }
              if (errorData.error.details.error_type) {
                errorMessage = `${errorData.error.details.error_type}: ${errorMessage}`;
              }
            }
          } else if (errorData.detail) {
            if (typeof errorData.detail === 'string') {
              errorMessage = errorData.detail;
            } else if (Array.isArray(errorData.detail)) {
              errorDetails = errorData.detail.map((e: any) => {
                const field = e.loc && e.loc.length > 1 ? e.loc[e.loc.length - 1] : 'field';
                const msg = e.msg || 'is required';
                return `${field}: ${msg}`;
              }).join('; ');
              errorMessage = `Validation error: ${errorDetails}`;
            } else {
              errorMessage = JSON.stringify(errorData.detail);
            }
          } else if (errorData.message) {
            errorMessage = errorData.message;
          } else {
            // Fallback: show the whole error object
            errorMessage = JSON.stringify(errorData);
            console.error('Full error response:', errorData);
          }
        } catch (parseError) {
          // If JSON parsing fails, try to get text
          try {
            const errorText = await response.text();
            if (errorText) {
              errorMessage = errorText.substring(0, 200); // Limit length
            }
          } catch (textError) {
            logger.error('Failed to parse error response:', textError);
          }
        }
        
        // Provide user-friendly error messages based on status code
        if (response.status === 401) {
          errorMessage = 'Authentication required. Please sign in again.';
        } else if (response.status === 403) {
          errorMessage = 'You do not have permission to perform this action.';
        } else if (response.status === 404) {
          errorMessage = 'Bot not found. It may have been deleted.';
        } else if (response.status === 400) {
          // Keep the detailed error message for 400 errors
        } else if (response.status === 500) {
          // For 500 errors, show the actual error message if available
          if (errorMessage && !errorMessage.includes('Server error:')) {
            errorMessage = `Server error: ${errorMessage}`;
          } else if (!errorMessage || errorMessage === `Failed to ${action} bot`) {
            errorMessage = `Server error: An unexpected error occurred. Check browser console for details.`;
          }
        } else if (response.status === 503) {
          errorMessage = 'Service temporarily unavailable. Please try again later.';
        }
        
        // Log full error for debugging
        console.error(`Bot ${action} failed:`, {
          status: response.status,
          errorMessage,
          errorDetails,
          botId,
          endpoint
        });
        
        throw new Error(errorMessage);
      }
      
      // Parse successful response
      let responseData: any = {};
      try {
        const contentType = response.headers.get('content-type');
        if (contentType && contentType.includes('application/json')) {
          responseData = await response.json();
          logger.debug(`Bot action success response:`, responseData);
        } else {
          // Try to get text response
          const text = await response.text();
          logger.debug(`Bot action success response (text):`, text);
          if (text) {
            try {
              responseData = JSON.parse(text);
            } catch {
              // Not JSON, that's okay
            }
          }
        }
      } catch (parseError) {
        logger.warn('Failed to parse success response:', parseError);
      }
      
      const actionMessages = {
        start: 'started',
        pause: 'paused',
        resume: 'resumed',
        stop: 'stopped',
        delete: 'deleted'
      };
      
      // Show success message with details if available
      const successMessage = responseData.message || `Bot ${actionMessages[action]} successfully`;
      toast.success(successMessage);
      
      logger.info(`✅ Bot ${action} successful:`, { botId, responseData });
      
      // Refresh bots list after a short delay to ensure backend has updated
      setTimeout(async () => {
        logger.debug('Refreshing bots list after action...');
        await fetchBots();
      }, 500);
      
    } catch (err: any) {
      const errorMessage = err.message || `Failed to ${action} bot`;
      logger.error(`❌ Error ${action}ing bot:`, { 
        botId, 
        action, 
        error: err,
        message: errorMessage,
        stack: err.stack
      });
      
      // Show detailed error to user with full message
      const errorDescription = action === 'delete' 
        ? 'The bot may still exist. Please refresh the page.' 
        : 'Check the browser console (F12) for detailed error information.';
      
      // Show the full error message in toast
      toast.error(errorMessage, { 
        description: errorDescription,
        duration: 8000 // Show for 8 seconds to give user time to read
      });
      
      // Log full error details to console for debugging
      console.error(`❌ Bot action failed (${action}):`, {
        botId,
        action,
        error: err,
        message: errorMessage,
        stack: err.stack,
        endpoint: `${getApiBaseUrl()}/bots/dca-bots/${botId}/${action === 'start' ? 'start-paper' : action === 'delete' ? '' : action}`
      });
    } finally {
      setActionLoading(null);
    }
  };

  // View/Edit/Duplicate handlers
  const handleView = (botId: string) => {
    console.log('🔍 handleView called with botId:', botId);
    console.log('📍 Current location:', window.location.pathname);
    
    if (!botId) {
      console.error('❌ handleView: botId is empty or undefined');
      toast.error('Error', { description: 'Bot ID is missing. Cannot navigate to logs.' });
      return;
    }
    
    try {
      const targetPath = `/app/bots/${botId}/logs`;
      console.log('🚀 Navigating to:', targetPath);
      logger.debug('Navigating to bot logs page:', botId);
      
      // Navigate to the logs page instead of opening a modal
      navigate(targetPath);
      
      // Log after a short delay to see if navigation happened
      setTimeout(() => {
        console.log('📍 Location after navigation:', window.location.pathname);
        if (window.location.pathname !== targetPath) {
          console.error('❌ Navigation failed! Still at:', window.location.pathname);
        } else {
          console.log('✅ Navigation successful!');
        }
      }, 100);
    } catch (error) {
      console.error('❌ Error during navigation:', error);
      toast.error('Navigation Error', { 
        description: `Failed to navigate to logs: ${error instanceof Error ? error.message : 'Unknown error'}` 
      });
    }
  };

  const handleEdit = (botId: string) => {
    // Navigate to bot configuration page with pre-filled data
    toast.info('Edit bot', { description: 'Bot editing coming soon' });
    // TODO: Navigate to bot edit page with botId
  };

  const handleDuplicate = async (botId: string) => {
    try {
      const bot = filteredAndSortedBots.find(b => b.bot_id === botId);
      if (!bot) {
        toast.error('Bot not found');
        return;
      }
      
      // For now, just show a message
      toast.info('Duplicate bot', { description: 'Bot duplication coming soon. This will create a copy of the bot configuration.' });
      // TODO: Implement bot duplication via API
    } catch (err: any) {
      logger.error('Error duplicating bot:', err);
      toast.error('Failed to duplicate bot', { description: err.message });
    }
  };

  // Filter and sort bots
  const filteredAndSortedBots = useMemo(() => {
    let filtered = bots.filter(bot => {
      const matchesSearch = !debouncedSearch || 
        bot.name.toLowerCase().includes(debouncedSearch.toLowerCase()) ||
        bot.pair.toLowerCase().includes(debouncedSearch.toLowerCase());
      
      const matchesStatus = statusFilter === 'All' || bot.status === statusFilter;
      const matchesExchange = exchangeFilter === 'All' || bot.exchange === exchangeFilter;
      const matchesBotType = botTypeFilter === 'All' || bot.bot_type === botTypeFilter;
      
      return matchesSearch && matchesStatus && matchesExchange && matchesBotType;
    });

    // Sort bots
    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'name':
          return a.name.localeCompare(b.name);
        case 'status':
          return a.status.localeCompare(b.status);
        case 'created':
          return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
        case 'pnl':
          return (b.pnl_24h || 0) - (a.pnl_24h || 0);
        default:
          return 0;
      }
    });

    return filtered;
  }, [bots, debouncedSearch, statusFilter, exchangeFilter, botTypeFilter, sortBy]);

  // Calculate KPIs
  const kpis = useMemo(() => getKPIs(bots), [bots]);

  // Count active filters
  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (debouncedSearch) count++;
    if (statusFilter !== 'All') count++;
    if (exchangeFilter !== 'All') count++;
    if (botTypeFilter !== 'All') count++;
    return count;
  }, [debouncedSearch, statusFilter, exchangeFilter, botTypeFilter]);

  // Clear all filters
  const clearFilters = () => {
    setSearchQuery('');
    setStatusFilter('All');
    setExchangeFilter('All');
    setBotTypeFilter('All');
  };

  // Initial load
  useEffect(() => {
    fetchBots();
  }, []);

  // Format currency
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(value);
  };

  // Format percentage
  const formatPercentage = (pct: number) => {
    const sign = pct >= 0 ? '+' : '';
    return `${sign}${pct.toFixed(2)}%`;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 p-6 space-y-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center justify-between"
      >
        <div>
          <h1 className="text-3xl font-bold text-white mb-2">Trading Bots</h1>
          <p className="text-gray-400">Manage your automated trading strategies</p>
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
      </motion.div>

      {/* Stats Summary */}
      {!isLoading && !error && bots.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4"
        >
          <StatCard
            title="Total Bots"
            value={bots.length}
            subtitle={`${kpis.activeBots} active`}
            icon={BotIcon}
            iconColor="text-blue-400"
            iconBgColor="bg-blue-500/10"
            gradientFrom="from-blue-500"
            gradientTo="to-blue-600"
            progress={(kpis.activeBots / Math.max(bots.length, 1)) * 100}
            delay={0.1}
          />
          <StatCard
            title="Active Bots"
            value={kpis.activeBots}
            subtitle="Currently running"
            icon={Activity}
            iconColor="text-green-400"
            iconBgColor="bg-green-500/10"
            gradientFrom="from-green-500"
            gradientTo="to-green-600"
            delay={0.2}
          />
          <StatCard
            title="24h P&L"
            value={formatCurrency(kpis.pnl24h)}
            subtitle={formatPercentage(kpis.pnl24hPct)}
            icon={TrendingUp}
            iconColor={kpis.pnl24h >= 0 ? "text-green-400" : "text-red-400"}
            iconBgColor={kpis.pnl24h >= 0 ? "bg-green-500/10" : "bg-red-500/10"}
            gradientFrom={kpis.pnl24h >= 0 ? "from-green-500" : "from-red-500"}
            gradientTo={kpis.pnl24h >= 0 ? "to-green-600" : "to-red-600"}
            delay={0.3}
          />
          <StatCard
            title="Capital Deployed"
            value={formatCurrency(kpis.totalCapitalDeployed)}
            subtitle="Total invested"
            icon={DollarSign}
            iconColor="text-purple-400"
            iconBgColor="bg-purple-500/10"
            gradientFrom="from-purple-500"
            gradientTo="to-purple-600"
            delay={0.4}
          />
        </motion.div>
      )}

      {/* Filters and Search */}
      {!isLoading && !error && bots.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl p-4 space-y-4"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-gray-400" />
              <span className="text-sm font-medium text-white">Filters</span>
              {activeFilterCount > 0 && (
                <Badge className="bg-blue-500/20 text-blue-400 border-blue-500/30">
                  {activeFilterCount} active
                </Badge>
              )}
            </div>
            {activeFilterCount > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={clearFilters}
                className="text-gray-400 hover:text-white"
              >
                <X className="h-4 w-4 mr-1" />
                Clear All
              </Button>
            )}
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
            {/* Search */}
            <div className="lg:col-span-2 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search bots..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 bg-white/5 border-white/10 text-white placeholder:text-gray-500"
              />
            </div>
            
            {/* Status Filter */}
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="bg-white/5 border-white/10 text-white">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="All">All Status</SelectItem>
                <SelectItem value="running">Running</SelectItem>
                <SelectItem value="paused">Paused</SelectItem>
                <SelectItem value="stopped">Stopped</SelectItem>
                <SelectItem value="inactive">Inactive</SelectItem>
              </SelectContent>
            </Select>
            
            {/* Exchange Filter */}
            <Select value={exchangeFilter} onValueChange={setExchangeFilter}>
              <SelectTrigger className="bg-white/5 border-white/10 text-white">
                <SelectValue placeholder="Exchange" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="All">All Exchanges</SelectItem>
                <SelectItem value="Binance">Binance</SelectItem>
                <SelectItem value="Zerodha">Zerodha</SelectItem>
                <SelectItem value="KuCoin">KuCoin</SelectItem>
              </SelectContent>
            </Select>
            
            {/* Bot Type Filter */}
            <Select value={botTypeFilter} onValueChange={setBotTypeFilter}>
              <SelectTrigger className="bg-white/5 border-white/10 text-white">
                <SelectValue placeholder="Bot Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="All">All Types</SelectItem>
                <SelectItem value="dca">DCA</SelectItem>
                <SelectItem value="grid">Grid</SelectItem>
                <SelectItem value="custom">Custom</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          {/* Sort and View Toggle */}
          <div className="flex items-center justify-between pt-2 border-t border-white/10">
            <div className="flex items-center gap-2">
              <SortAsc className="h-4 w-4 text-gray-400" />
              <Select value={sortBy} onValueChange={(v) => setSortBy(v as typeof sortBy)}>
                <SelectTrigger className="w-[180px] bg-white/5 border-white/10 text-white">
                  <SelectValue placeholder="Sort by" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="created">Newest First</SelectItem>
                  <SelectItem value="name">Name (A-Z)</SelectItem>
                  <SelectItem value="status">Status</SelectItem>
                  <SelectItem value="pnl">P&L (High to Low)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="flex items-center gap-2">
              <Button
                variant={viewMode === 'grid' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setViewMode('grid')}
                className={viewMode === 'grid' ? 'bg-blue-600 hover:bg-blue-700' : 'text-gray-400 hover:text-white'}
              >
                <Grid3x3 className="h-4 w-4" />
              </Button>
              <Button
                variant={viewMode === 'list' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setViewMode('list')}
                className={viewMode === 'list' ? 'bg-blue-600 hover:bg-blue-700' : 'text-gray-400 hover:text-white'}
              >
                <List className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </motion.div>
      )}

      {/* Error Display */}
      {error && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-red-900/20 border border-red-500/50 rounded-xl p-6"
        >
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-2">
                <AlertCircle className="h-5 w-5 text-red-400" />
                <p className="text-red-400 font-medium">{error.title}</p>
              </div>
              <p className="text-red-300 text-sm mb-3">{error.details}</p>
              {error.tips && error.tips.length > 0 && (
                <div className="mt-3">
                  <p className="text-red-400 text-sm font-medium mb-2">Tips:</p>
                  <ul className="list-disc list-inside text-red-300 text-sm space-y-1">
                    {error.tips.map((tip, index) => (
                      <li key={index}>{tip}</li>
                    ))}
                  </ul>
                </div>
              )}
              <Button
                onClick={fetchBots}
                className="mt-4 bg-red-600 hover:bg-red-700 text-white"
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                Retry
              </Button>
            </div>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setError(null)}
              className="text-red-400 hover:text-red-300"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </motion.div>
      )}

      {/* Loading State with Skeletons */}
      {isLoading && (
        <div className="space-y-6">
          {/* Stats Skeletons */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl p-6 space-y-4">
                <Skeleton className="h-12 w-12 rounded-lg" />
                <Skeleton className="h-8 w-24" />
                <Skeleton className="h-4 w-32" />
              </div>
            ))}
          </div>
          
          {/* Bot Card Skeletons */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl p-6 space-y-4">
                <div className="flex items-center justify-between">
                  <Skeleton className="h-6 w-32" />
                  <Skeleton className="h-6 w-20" />
                </div>
                <Skeleton className="h-4 w-24" />
                <div className="grid grid-cols-2 gap-4">
                  <Skeleton className="h-16 w-full" />
                  <Skeleton className="h-16 w-full" />
                </div>
                <Skeleton className="h-10 w-full" />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Bots List */}
      {!isLoading && !error && (
        <>
          {filteredAndSortedBots.length === 0 ? (
            <EmptyState
              icon={BotIcon}
              title={bots.length === 0 ? "No bots found" : "No bots match your filters"}
              description={
                bots.length === 0
                  ? "Create your first trading bot to get started with automated trading strategies."
                  : "Try adjusting your search or filter criteria to find what you're looking for."
              }
              actionLabel={bots.length === 0 ? "Create Your First Bot" : "Clear Filters"}
              onAction={bots.length === 0 ? () => window.location.href = '/app/dca-bot' : clearFilters}
              tips={
                bots.length === 0
                  ? [
                      "DCA bots help you buy assets at regular intervals",
                      "Start with paper trading to test your strategies",
                      "Monitor your bots' performance regularly"
                    ]
                  : [
                      "Try removing some filters",
                      "Check your search query spelling",
                      "Make sure at least one bot matches your criteria"
                    ]
              }
            />
          ) : (
            <AnimatePresence mode="wait">
              <motion.div
                key={viewMode}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className={
                  viewMode === 'grid'
                    ? "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 pb-6"
                    : "space-y-4 pb-6"
                }
              >
                {filteredAndSortedBots.map((bot) => (
                  <BotCard
                    key={bot.bot_id}
                    bot={bot}
                    onStart={() => handleBotAction(bot.bot_id, 'start')}
                    onResume={() => handleBotAction(bot.bot_id, 'resume')}
                    onPause={() => handleBotAction(bot.bot_id, 'pause')}
                    onStop={() => handleBotAction(bot.bot_id, 'stop')}
                    onDelete={() => handleBotAction(bot.bot_id, 'delete')}
                    onDuplicate={handleDuplicate}
                    onEdit={handleEdit}
                    onView={handleView}
                  />
                ))}
              </motion.div>
            </AnimatePresence>
          )}
        </>
      )}
    </div>
  );
}
