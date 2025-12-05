import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  X,
  RefreshCw,
  Filter,
  ChevronDown,
  ChevronUp,
  Bot,
  Play,
  Pause,
  Square,
  RotateCw,
  Trash2,
  AlertCircle,
  CheckCircle,
  Info,
  Activity,
  TrendingUp,
  TrendingDown,
  DollarSign,
  Target,
  Shield,
  Sparkles,
} from 'lucide-react';
import { useThemeStore } from '../../store/theme';
import { Button } from '../ui/button';
import { getBotLogs, type BotLog } from '../../lib/api/bots';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../ui/select';

interface BotLogsProps {
  botId: string;
  botName: string;
  onClose: () => void;
}

const EVENT_TYPE_ICONS: Record<string, React.ReactNode> = {
  bot_created: <Bot className="w-4 h-4" />,
  bot_started: <Play className="w-4 h-4" />,
  bot_stopped: <Square className="w-4 h-4" />,
  bot_paused: <Pause className="w-4 h-4" />,
  bot_resumed: <RotateCw className="w-4 h-4" />,
  bot_deleted: <Trash2 className="w-4 h-4" />,
  entry_condition: <Target className="w-4 h-4" />,
  dca_triggered: <DollarSign className="w-4 h-4" />,
  order_executed: <Activity className="w-4 h-4" />,
  profit_target: <TrendingUp className="w-4 h-4" />,
  market_regime: <Shield className="w-4 h-4" />,
  emergency_brake: <AlertCircle className="w-4 h-4" />,
  dynamic_scaling: <Sparkles className="w-4 h-4" />,
};

const EVENT_TYPE_COLORS: Record<string, string> = {
  bot_created: 'text-blue-400 bg-blue-500/10 border-blue-500/20',
  bot_started: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
  bot_stopped: 'text-gray-400 bg-gray-500/10 border-gray-500/20',
  bot_paused: 'text-amber-400 bg-amber-500/10 border-amber-500/20',
  bot_resumed: 'text-blue-400 bg-blue-500/10 border-blue-500/20',
  bot_deleted: 'text-red-400 bg-red-500/10 border-red-500/20',
  order_executed: 'text-green-400 bg-green-500/10 border-green-500/20',
  dca_executed: 'text-green-400 bg-green-500/10 border-green-500/20',
  profit_target: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
  market_regime: 'text-orange-400 bg-orange-500/10 border-orange-500/20',
  emergency_brake: 'text-red-400 bg-red-500/10 border-red-500/20',
  dynamic_scaling: 'text-yellow-400 bg-yellow-500/10 border-yellow-500/20',
};

const EVENT_CATEGORIES = [
  { value: 'all', label: 'All Categories' },
  { value: 'system', label: 'System' },
  { value: 'execution', label: 'Execution' },
  { value: 'condition', label: 'Condition' },
  { value: 'risk', label: 'Risk' },
  { value: 'position', label: 'Position' },
];

export default function BotLogs({ botId, botName, onClose }: BotLogsProps) {
  const { theme } = useThemeStore();
  const isDark = theme === 'dark';
  
  // Filter out system logs by default - only show user-actionable events
  const [eventTypeFilter, setEventTypeFilter] = useState<string>('all');
  const [eventCategoryFilter, setEventCategoryFilter] = useState<string>('execution'); // Default to execution only
  const [expandedLogs, setExpandedLogs] = useState<Set<string>>(new Set());
  
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['bot-logs', botId, eventTypeFilter, eventCategoryFilter],
    queryFn: () => getBotLogs(
      botId,
      200,
      0,
      eventTypeFilter !== 'all' ? eventTypeFilter : undefined,
      eventCategoryFilter !== 'all' ? eventCategoryFilter : undefined
    ),
    refetchInterval: 10000, // Auto-refresh every 10 seconds
  });

  const toggleLogExpansion = (eventId: string) => {
    setExpandedLogs((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(eventId)) {
        newSet.delete(eventId);
      } else {
        newSet.add(eventId);
      }
      return newSet;
    });
  };

  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    
    return date.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const formatFullTimestamp = (timestamp: string) => {
    return new Date(timestamp).toLocaleString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className={`w-full max-w-4xl max-h-[90vh] rounded-xl border shadow-2xl ${isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} flex flex-col`}>
        {/* Header */}
        <div className={`flex items-center justify-between p-6 border-b ${isDark ? 'border-gray-700' : 'border-gray-200'}`}>
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-lg ${isDark ? 'bg-blue-500/20' : 'bg-blue-100'}`}>
              <Activity className={`w-5 h-5 ${isDark ? 'text-blue-400' : 'text-blue-600'}`} />
            </div>
            <div>
              <h2 className={`text-xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                Bot Logs
              </h2>
              <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                {botName}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => refetch()}
              className={isDark ? 'text-gray-400 hover:text-white hover:bg-gray-700' : ''}
            >
              <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={onClose}
              className={isDark ? 'text-gray-400 hover:text-white hover:bg-gray-700' : ''}
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* Filters */}
        <div className={`p-4 border-b ${isDark ? 'border-gray-700 bg-gray-800/50' : 'border-gray-200 bg-gray-50'} flex items-center gap-3`}>
          <Select value={eventCategoryFilter} onValueChange={setEventCategoryFilter}>
            <SelectTrigger className={`w-48 ${isDark ? 'bg-gray-700 border-gray-600 text-white' : ''}`}>
              <SelectValue placeholder="Category" />
            </SelectTrigger>
            <SelectContent className={isDark ? 'bg-gray-800 border-gray-700' : ''}>
              {EVENT_CATEGORIES.map((cat) => (
                <SelectItem key={cat.value} value={cat.value} className={isDark ? 'text-white hover:bg-gray-700' : ''}>
                  {cat.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          
          <Select value={eventTypeFilter} onValueChange={setEventTypeFilter}>
            <SelectTrigger className={`w-48 ${isDark ? 'bg-gray-700 border-gray-600 text-white' : ''}`}>
              <SelectValue placeholder="Event Type" />
            </SelectTrigger>
            <SelectContent className={isDark ? 'bg-gray-800 border-gray-700' : ''}>
              <SelectItem value="all" className={isDark ? 'text-white hover:bg-gray-700' : ''}>
                All Types
              </SelectItem>
              <SelectItem value="bot_created" className={isDark ? 'text-white hover:bg-gray-700' : ''}>
                Bot Created
              </SelectItem>
              <SelectItem value="bot_started" className={isDark ? 'text-white hover:bg-gray-700' : ''}>
                Bot Started
              </SelectItem>
              <SelectItem value="bot_stopped" className={isDark ? 'text-white hover:bg-gray-700' : ''}>
                Bot Stopped
              </SelectItem>
              <SelectItem value="bot_paused" className={isDark ? 'text-white hover:bg-gray-700' : ''}>
                Bot Paused
              </SelectItem>
              <SelectItem value="bot_resumed" className={isDark ? 'text-white hover:bg-gray-700' : ''}>
                Bot Resumed
              </SelectItem>
              <SelectItem value="bot_deleted" className={isDark ? 'text-white hover:bg-gray-700' : ''}>
                Bot Deleted
              </SelectItem>
            </SelectContent>
          </Select>
          
          <div className={`text-sm ml-auto ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
            {data?.total || 0} {data?.total === 1 ? 'event' : 'events'}
          </div>
        </div>

        {/* Logs List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-2">
          {isLoading && !data ? (
            <div className="flex items-center justify-center py-12">
              <RefreshCw className={`w-6 h-6 animate-spin ${isDark ? 'text-gray-400' : 'text-gray-600'}`} />
              <span className={`ml-3 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                Loading logs...
              </span>
            </div>
          ) : error ? (
            <div className={`rounded-lg border p-4 ${isDark ? 'bg-red-900/20 border-red-800' : 'bg-red-50 border-red-200'}`}>
              <div className="flex items-center gap-2">
                <AlertCircle className={`w-5 h-5 ${isDark ? 'text-red-400' : 'text-red-600'}`} />
                <span className={`text-sm ${isDark ? 'text-red-300' : 'text-red-800'}`}>
                  Failed to load logs. Please try again.
                </span>
              </div>
            </div>
          ) : !data || data.logs.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12">
              <Activity className={`w-12 h-12 mb-4 ${isDark ? 'text-gray-600' : 'text-gray-400'}`} />
              <h3 className={`text-lg font-semibold mb-2 ${isDark ? 'text-white' : 'text-gray-900'}`}>
                No logs found
              </h3>
              <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                No events have been logged for this bot yet.
              </p>
            </div>
          ) : (
            data.logs.map((log: BotLog) => {
              const isExpanded = expandedLogs.has(log.event_id);
              const icon = EVENT_TYPE_ICONS[log.event_type] || <Info className="w-4 h-4" />;
              const colorClass = EVENT_TYPE_COLORS[log.event_type] || 'text-gray-400 bg-gray-500/10 border-gray-500/20';
              
              return (
                <div
                  key={log.event_id}
                  className={`rounded-lg border p-4 transition-all ${isDark ? 'bg-gray-800/50 border-gray-700' : 'bg-white border-gray-200'} hover:border-gray-500/50`}
                >
                  <div className="flex items-start gap-3">
                    <div className={`p-2 rounded-lg border ${colorClass} flex-shrink-0`}>
                      {icon}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <span className={`font-semibold text-sm ${isDark ? 'text-white' : 'text-gray-900'}`}>
                              {EVENT_TYPE_LABELS[log.event_type] || log.event_type.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                            </span>
                            {log.symbol && (
                              <span className={`text-xs px-2 py-0.5 rounded ${isDark ? 'bg-gray-700 text-gray-300' : 'bg-gray-100 text-gray-700'}`}>
                                {log.symbol}
                              </span>
                            )}
                          </div>
                          <p className={`text-sm ${isDark ? 'text-gray-300' : 'text-gray-700'} mb-2`}>
                            {log.message}
                          </p>
                          <div className="flex items-center gap-4 text-xs">
                            <span className={isDark ? 'text-gray-500' : 'text-gray-500'}>
                              {formatTimestamp(log.created_at)}
                            </span>
                            {log.details && Object.keys(log.details).length > 0 && (
                              <button
                                onClick={() => toggleLogExpansion(log.event_id)}
                                className={`flex items-center gap-1 ${isDark ? 'text-blue-400 hover:text-blue-300' : 'text-blue-600 hover:text-blue-700'}`}
                              >
                                {isExpanded ? (
                                  <>
                                    <ChevronUp className="w-3 h-3" />
                                    Hide Details
                                  </>
                                ) : (
                                  <>
                                    <ChevronDown className="w-3 h-3" />
                                    Show Details
                                  </>
                                )}
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                      
                      {isExpanded && log.details && Object.keys(log.details).length > 0 && (
                        <div className={`mt-3 pt-3 border-t ${isDark ? 'border-gray-700' : 'border-gray-200'}`}>
                          <div className={`text-xs font-semibold mb-2 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                            Details:
                          </div>
                          <pre className={`text-xs p-3 rounded-lg overflow-x-auto ${isDark ? 'bg-gray-900/50 text-gray-300' : 'bg-gray-50 text-gray-800'}`}>
                            {JSON.stringify(log.details, null, 2)}
                          </pre>
                          <div className={`text-xs mt-2 ${isDark ? 'text-gray-500' : 'text-gray-500'}`}>
                            Full timestamp: {formatFullTimestamp(log.created_at)}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}

