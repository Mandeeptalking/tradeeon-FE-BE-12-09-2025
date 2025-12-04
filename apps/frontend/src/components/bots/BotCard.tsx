import { useState } from 'react';
import { motion } from 'framer-motion';
import { 
  Play, 
  Pause, 
  Square, 
  Eye, 
  Edit, 
  Copy, 
  FileText, 
  MoreHorizontal,
  Trash2,
  TrendingUp,
  TrendingDown,
  RotateCw,
  Bot,
  Activity,
  DollarSign,
  BarChart3,
} from 'lucide-react';
import { Card, CardContent } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '../ui/dropdown-menu';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '../ui/alert-dialog';
import type { Bot, BotStatus } from '../../lib/api/bots';

interface BotCardProps {
  bot: Bot;
  onStart: (botId: string) => void;
  onResume: (botId: string) => void;
  onPause: (botId: string) => void;
  onStop: (botId: string) => void;
  onDelete: (botId: string) => void;
  onDuplicate: (botId: string) => void;
  onEdit: (botId: string) => void;
  onView: (botId: string) => void;
}

// Enhanced Sparkline component
function Sparkline({ data, className = '' }: { data: number[]; className?: string }) {
  if (!data || data.length === 0) return null;

  const width = 80;
  const height = 30;
  const max = Math.max(...data);
  const min = Math.min(...data);
  const range = max - min || 1;

  const points = data.map((value, index) => {
    const x = (index / (data.length - 1)) * width;
    const y = height - ((value - min) / range) * height;
    return `${x},${y}`;
  }).join(' ');

  const isPositive = data[data.length - 1] >= data[0];
  const lastValue = data[data.length - 1];
  const firstValue = data[0];

  return (
    <div className="relative">
      <svg width={width} height={height} className={className}>
        <defs>
          <linearGradient id={`gradient-${isPositive ? 'green' : 'red'}`} x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor={isPositive ? '#10b981' : '#ef4444'} stopOpacity="0.3" />
            <stop offset="100%" stopColor={isPositive ? '#10b981' : '#ef4444'} stopOpacity="0" />
          </linearGradient>
        </defs>
        <polyline
          fill="url(#gradient-green)"
          stroke={isPositive ? '#10b981' : '#ef4444'}
          strokeWidth="2"
          points={`0,${height} ${points} ${width},${height}`}
        />
        <polyline
          fill="none"
          stroke={isPositive ? '#10b981' : '#ef4444'}
          strokeWidth="2.5"
          points={points}
        />
      </svg>
    </div>
  );
}

export default function BotCard({ 
  bot, 
  onStart,
  onResume,
  onPause,
  onStop,
  onDelete, 
  onDuplicate, 
  onEdit, 
  onView 
}: BotCardProps) {
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [isActionLoading, setIsActionLoading] = useState(false);

  const getStatusConfig = (status: BotStatus) => {
    switch (status) {
      case 'running':
        return { 
          label: 'Running', 
          color: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
          dotColor: 'bg-emerald-400',
          gradient: 'from-emerald-500/10 to-emerald-500/5',
          ringColor: 'ring-emerald-500/30'
        };
      case 'paused':
        return { 
          label: 'Paused', 
          color: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
          dotColor: 'bg-amber-400',
          gradient: 'from-amber-500/10 to-amber-500/5',
          ringColor: 'ring-amber-500/30'
        };
      case 'stopped':
      case 'inactive':
        return { 
          label: status === 'inactive' ? 'Inactive' : 'Stopped', 
          color: 'bg-gray-500/10 text-gray-400 border-gray-500/20',
          dotColor: 'bg-gray-400',
          gradient: 'from-gray-500/10 to-gray-500/5',
          ringColor: 'ring-gray-500/30'
        };
      default:
        return { 
          label: 'Unknown', 
          color: 'bg-gray-500/10 text-gray-400 border-gray-500/20',
          dotColor: 'bg-gray-400',
          gradient: 'from-gray-500/10 to-gray-500/5',
          ringColor: 'ring-gray-500/30'
        };
    }
  };

  const getExchangeConfig = (exchange: string) => {
    const configs = {
      Binance: { 
        color: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20',
        icon: '🟡'
      },
      Zerodha: { 
        color: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
        icon: '🔵'
      },
      KuCoin: { 
        color: 'bg-green-500/10 text-green-400 border-green-500/20',
        icon: '🟢'
      },
    };
    return configs[exchange as keyof typeof configs] || { 
      color: 'bg-gray-500/10 text-gray-400 border-gray-500/20',
      icon: '⚪'
    };
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);
  };

  const formatPercentage = (pct: number) => {
    const sign = pct >= 0 ? '+' : '';
    return `${sign}${pct.toFixed(2)}%`;
  };

  const statusConfig = getStatusConfig(bot.status);
  const exchangeConfig = getExchangeConfig(bot.exchange);
  const canStart = bot.status === 'stopped' || bot.status === 'inactive';
  const canResume = bot.status === 'paused';
  const canPause = bot.status === 'running';
  const canStop = bot.status === 'running' || bot.status === 'paused';

  const handleAction = async (action: () => Promise<void>) => {
    if (isActionLoading) return;
    setIsActionLoading(true);
    try {
      await action();
    } finally {
      setIsActionLoading(false);
    }
  };

  return (
    <>
      <motion.div
        layout
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        whileHover={{ y: -4, transition: { duration: 0.2 } }}
        className="group h-full"
      >
        <Card className={`
          relative overflow-visible h-full flex flex-col min-h-[420px]
          bg-gradient-to-br from-gray-800/95 via-gray-800/90 to-gray-900/95
          border border-gray-700/50
          shadow-xl shadow-black/20
          transition-all duration-300
          hover:border-gray-600/50 hover:shadow-2xl hover:shadow-black/30
          ${statusConfig.ringColor} ring-1
        `}>
          {/* Status Indicator Bar */}
          <div className={`absolute top-0 left-0 right-0 h-1 bg-gradient-to-r ${statusConfig.gradient}`} />

          {/* Header Section */}
          <div className="p-5 pb-4 space-y-4">
            {/* Top Row: Exchange & Status */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Badge className={`text-xs font-semibold px-2.5 py-1 border ${exchangeConfig.color}`}>
                  {bot.exchange}
                </Badge>
                <span className="font-mono text-sm font-bold text-white/90">
                  {bot.pair}
                </span>
              </div>
              <Badge className={`text-xs font-semibold px-2.5 py-1 border flex items-center gap-1.5 ${statusConfig.color}`}>
                <span className={`w-1.5 h-1.5 rounded-full ${statusConfig.dotColor} animate-pulse`} />
                {statusConfig.label}
              </Badge>
            </div>

            {/* Bot Name & Type */}
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-lg bg-blue-500/10 border border-blue-500/20">
                  <Bot className="w-4 h-4 text-blue-400" />
                </div>
                <h3 className="font-bold text-lg text-white group-hover:text-blue-400 transition-colors">
                  {bot.name}
                </h3>
              </div>
              <p className="text-xs text-gray-400 ml-7 capitalize">
                {bot.bot_type} Trading Bot
              </p>
            </div>
          </div>

          {/* Metrics Section */}
          <CardContent className="px-5 pb-5 space-y-4 flex-1 overflow-visible">
            {/* Key Metrics Grid */}
            <div className="grid grid-cols-2 gap-3">
              <div className="p-3 rounded-lg bg-gray-700/30 border border-gray-600/30 backdrop-blur-sm">
                <div className="flex items-center gap-2 mb-1">
                  <DollarSign className="w-3.5 h-3.5 text-gray-400" />
                  <p className="text-xs text-gray-400 font-medium">Invested</p>
                </div>
                <p className="font-bold text-base text-white">{formatCurrency(bot.invested)}</p>
              </div>
              <div className="p-3 rounded-lg bg-gray-700/30 border border-gray-600/30 backdrop-blur-sm">
                <div className="flex items-center gap-2 mb-1">
                  <BarChart3 className="w-3.5 h-3.5 text-gray-400" />
                  <p className="text-xs text-gray-400 font-medium">Orders</p>
                </div>
                <p className="font-bold text-base text-white">{bot.orders_count}</p>
              </div>
            </div>

            {/* P&L Section with Sparkline */}
            <div className="p-4 rounded-lg bg-gradient-to-br from-gray-700/40 to-gray-800/40 border border-gray-600/30 backdrop-blur-sm">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Activity className={`w-4 h-4 ${bot.pnl_24h >= 0 ? 'text-emerald-400' : 'text-red-400'}`} />
                  <span className="text-xs font-semibold text-gray-300">24h P&L</span>
                </div>
                {bot.sparkline && <Sparkline data={bot.sparkline} />}
              </div>
              <div className="flex items-baseline justify-between">
                <span className={`text-xl font-bold ${bot.pnl_24h >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                  {formatCurrency(bot.pnl_24h)}
                </span>
                <div className="flex items-center gap-1.5">
                  {bot.pnl_24h >= 0 ? (
                    <TrendingUp className="w-4 h-4 text-emerald-400" />
                  ) : (
                    <TrendingDown className="w-4 h-4 text-red-400" />
                  )}
                  <span className={`text-sm font-semibold ${bot.pnl_24h >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                    {formatPercentage(bot.pnl_24h_pct)}
                  </span>
                </div>
              </div>
            </div>

            {/* Actions Section */}
            <div className="pt-3 border-t border-gray-700/50 overflow-visible">
              <div className="flex items-center justify-between gap-2">
                {/* Primary Action Button */}
                <div className="flex-1">
                  {canStart && (
                    <Button
                      size="sm"
                      onClick={() => handleAction(() => onStart(bot.bot_id))}
                      disabled={isActionLoading}
                      className="w-full bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-500 hover:to-emerald-400 text-white font-semibold shadow-lg shadow-emerald-500/20"
                    >
                      {isActionLoading ? (
                        <RotateCw className="h-4 w-4 mr-2 animate-spin" />
                      ) : (
                        <Play className="h-4 w-4 mr-2" />
                      )}
                      Start Bot
                    </Button>
                  )}
                  {canResume && (
                    <Button
                      size="sm"
                      onClick={() => handleAction(() => onResume(bot.bot_id))}
                      disabled={isActionLoading}
                      className="w-full bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-500 hover:to-blue-400 text-white font-semibold shadow-lg shadow-blue-500/20"
                    >
                      {isActionLoading ? (
                        <RotateCw className="h-4 w-4 mr-2 animate-spin" />
                      ) : (
                        <Play className="h-4 w-4 mr-2" />
                      )}
                      Resume Bot
                    </Button>
                  )}
                  {canPause && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleAction(() => onPause(bot.bot_id))}
                      disabled={isActionLoading}
                      className="w-full border-amber-500/30 text-amber-400 hover:bg-amber-500/10 hover:border-amber-500/50"
                    >
                      {isActionLoading ? (
                        <RotateCw className="h-4 w-4 mr-2 animate-spin" />
                      ) : (
                        <Pause className="h-4 w-4 mr-2" />
                      )}
                      Pause Bot
                    </Button>
                  )}
                  {canStop && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleAction(() => onStop(bot.bot_id))}
                      disabled={isActionLoading}
                      className="w-full border-red-500/30 text-red-400 hover:bg-red-500/10 hover:border-red-500/50"
                    >
                      {isActionLoading ? (
                        <RotateCw className="h-4 w-4 mr-2 animate-spin" />
                      ) : (
                        <Square className="h-4 w-4 mr-2" />
                      )}
                      Stop Bot
                    </Button>
                  )}
                </div>

                {/* Secondary Actions */}
                <div className="flex items-center gap-1">
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => onView(bot.bot_id)}
                    className="h-9 w-9 p-0 text-gray-400 hover:text-white hover:bg-gray-700/50 border border-transparent hover:border-gray-600/50 rounded-lg transition-all"
                    title="View Logs"
                  >
                    <Eye className="h-4 w-4" />
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => onEdit(bot.bot_id)}
                    className="h-9 w-9 p-0 text-gray-400 hover:text-white hover:bg-gray-700/50 border border-transparent hover:border-gray-600/50 rounded-lg transition-all"
                    title="Edit Bot"
                  >
                    <Edit className="h-4 w-4" />
                  </Button>
                  
                  {/* More Actions Menu */}
                  <div className="relative">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button 
                          size="sm" 
                          variant="ghost"
                          className="h-9 w-9 p-0 text-gray-300 hover:text-white hover:bg-gray-700/50 border border-gray-600/30 hover:border-gray-500/50 rounded-lg transition-all flex items-center justify-center bg-gray-700/10"
                          title="More options"
                        >
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="bg-gray-800 border-gray-700 w-48 z-50">
                      <DropdownMenuItem 
                        onClick={() => onDuplicate(bot.bot_id)}
                        className="text-white hover:bg-gray-700 focus:bg-gray-700 cursor-pointer"
                      >
                        <Copy className="h-4 w-4 mr-2" />
                        Duplicate Bot
                      </DropdownMenuItem>
                      <DropdownMenuItem 
                        onClick={() => onView(bot.bot_id)}
                        className="text-white hover:bg-gray-700 focus:bg-gray-700 cursor-pointer"
                      >
                        <FileText className="h-4 w-4 mr-2" />
                        View Logs
                      </DropdownMenuItem>
                      <DropdownMenuSeparator className="bg-gray-700" />
                      <DropdownMenuItem 
                        onClick={() => setShowDeleteDialog(true)}
                        className="text-red-400 hover:bg-red-900/20 focus:bg-red-900/20 cursor-pointer"
                      >
                        <Trash2 className="h-4 w-4 mr-2" />
                        Delete Bot
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent className="bg-gray-800 border-gray-700">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-white">Delete Bot</AlertDialogTitle>
            <AlertDialogDescription className="text-gray-400">
              Are you sure you want to delete <strong className="text-white">{bot.name}</strong>? This action cannot be undone.
              All bot data and trading history will be permanently removed.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="bg-gray-700 text-white border-gray-600 hover:bg-gray-600">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                handleAction(() => onDelete(bot.bot_id));
                setShowDeleteDialog(false);
              }}
              className="bg-red-600 text-white hover:bg-red-700 focus-visible:ring-2 focus-visible:ring-red-500"
            >
              Delete Bot
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
