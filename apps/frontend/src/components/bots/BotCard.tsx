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
} from 'lucide-react';
import { Card, CardContent, CardHeader } from '../ui/card';
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

// Simple SVG sparkline component
function Sparkline({ data, className = '' }: { data: number[]; className?: string }) {
  if (!data || data.length === 0) return null;

  const width = 60;
  const height = 20;
  const max = Math.max(...data);
  const min = Math.min(...data);
  const range = max - min || 1;

  const points = data.map((value, index) => {
    const x = (index / (data.length - 1)) * width;
    const y = height - ((value - min) / range) * height;
    return `${x},${y}`;
  }).join(' ');

  const isPositive = data[data.length - 1] >= data[0];

  return (
    <svg width={width} height={height} className={className}>
      <polyline
        fill="none"
        stroke={isPositive ? "#10b981" : "#ef4444"}
        strokeWidth="1.5"
        points={points}
      />
    </svg>
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
          color: 'bg-green-100 text-green-800 border-green-200 dark:bg-green-900/30 dark:text-green-400',
          ring: 'ring-green-500/20'
        };
      case 'paused':
        return { 
          label: 'Paused', 
          color: 'bg-amber-100 text-amber-800 border-amber-200 dark:bg-amber-900/30 dark:text-amber-400',
          ring: 'ring-amber-500/20'
        };
      case 'stopped':
      case 'inactive':
        return { 
          label: status === 'inactive' ? 'Inactive' : 'Stopped', 
          color: 'bg-gray-100 text-gray-800 border-gray-200 dark:bg-gray-800 dark:text-gray-300',
          ring: 'ring-gray-500/20'
        };
      default:
        return { 
          label: 'Unknown', 
          color: 'bg-gray-100 text-gray-800 border-gray-200 dark:bg-gray-800 dark:text-gray-300',
          ring: 'ring-gray-500/20'
        };
    }
  };

  const getExchangeBadge = (exchange: string) => {
    const colors = {
      Binance: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400',
      Zerodha: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
      KuCoin: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
    };
    return colors[exchange as keyof typeof colors] || 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300';
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
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -20 }}
        whileHover={{ y: -2, transition: { duration: 0.2 } }}
        className="group h-full"
        data-testid="bot-card"
      >
        <Card className={`relative overflow-visible transition-all duration-200 hover:shadow-xl ${statusConfig.ring} ring-1 bg-gray-800/95 backdrop-blur-sm border-gray-700 shadow-lg h-full flex flex-col`}>
          <CardHeader className="pb-3">
            {/* Header Row */}
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                {/* Exchange Badge */}
                <Badge className={`text-xs font-medium ${getExchangeBadge(bot.exchange)}`}>
                  {bot.exchange}
                </Badge>
                
                {/* Pair */}
                <span className="font-mono text-sm font-semibold text-white">
                  {bot.pair}
                </span>
              </div>

              {/* Status Badge */}
              <Badge className={`text-xs ${statusConfig.color}`}>
                {statusConfig.label}
              </Badge>
            </div>

            {/* Bot Name */}
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-lg text-white group-hover:text-blue-400 transition-colors">
                {bot.name}
              </h3>
              <span className="text-xs text-gray-400 capitalize">
                {bot.bot_type} bot
              </span>
            </div>
          </CardHeader>

          <CardContent className="space-y-4 flex-1 flex flex-col">
            {/* Mini Metrics */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <p className="text-xs text-gray-400">Invested</p>
                <p className="font-semibold text-sm text-white">{formatCurrency(bot.invested)}</p>
              </div>
              <div className="space-y-1">
                <p className="text-xs text-gray-400">Orders</p>
                <p className="font-semibold text-sm text-white">{bot.orders_count}</p>
              </div>
            </div>

            {/* P&L Section */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs text-gray-400">24h P&L</span>
                <div className="flex items-center space-x-2">
                  {bot.sparkline && <Sparkline data={bot.sparkline} />}
                  {bot.pnl_24h >= 0 ? (
                    <TrendingUp className="h-3 w-3 text-green-600" />
                  ) : (
                    <TrendingDown className="h-3 w-3 text-red-600" />
                  )}
                </div>
              </div>
              <div className="flex items-center justify-between">
                <span className={`font-semibold ${bot.pnl_24h >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {formatCurrency(bot.pnl_24h)}
                </span>
                <span className={`text-sm ${bot.pnl_24h >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {formatPercentage(bot.pnl_24h_pct)}
                </span>
              </div>
            </div>

            {/* Actions Footer */}
            <div className="flex items-center justify-between pt-3 mt-auto border-t border-gray-700">
              {/* Primary Actions */}
              <div className="flex items-center space-x-2">
                {canStart && (
                  <Button
                    size="sm"
                    onClick={() => handleAction(() => onStart(bot.bot_id))}
                    disabled={isActionLoading}
                    className="bg-green-600 hover:bg-green-700 text-white"
                    data-testid="bot-start"
                  >
                    {isActionLoading ? (
                      <RotateCw className="h-4 w-4 mr-1 animate-spin" />
                    ) : (
                      <Play className="h-4 w-4 mr-1" />
                    )}
                    Start
                  </Button>
                )}
                {canResume && (
                  <Button
                    size="sm"
                    onClick={() => handleAction(() => onResume(bot.bot_id))}
                    disabled={isActionLoading}
                    className="bg-blue-600 hover:bg-blue-700 text-white"
                    data-testid="bot-resume"
                  >
                    {isActionLoading ? (
                      <RotateCw className="h-4 w-4 mr-1 animate-spin" />
                    ) : (
                      <Play className="h-4 w-4 mr-1" />
                    )}
                    Resume
                  </Button>
                )}
                {canPause && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleAction(() => onPause(bot.bot_id))}
                    disabled={isActionLoading}
                    data-testid="bot-pause"
                  >
                    {isActionLoading ? (
                      <RotateCw className="h-4 w-4 mr-1 animate-spin" />
                    ) : (
                      <Pause className="h-4 w-4 mr-1" />
                    )}
                    Pause
                  </Button>
                )}
                {canStop && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleAction(() => onStop(bot.bot_id))}
                    disabled={isActionLoading}
                    data-testid="bot-stop"
                  >
                    {isActionLoading ? (
                      <RotateCw className="h-4 w-4 mr-1 animate-spin" />
                    ) : (
                      <Square className="h-4 w-4 mr-1" />
                    )}
                    Stop
                  </Button>
                )}
              </div>

              {/* Secondary Actions */}
              <div className="flex items-center space-x-1">
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    console.log('🔍 View button clicked for bot:', bot.bot_id);
                    try {
                      if (onView && typeof onView === 'function') {
                        onView(bot.bot_id);
                      } else {
                        console.error('❌ onView is not a function:', typeof onView);
                      }
                    } catch (error) {
                      console.error('❌ Error in onView:', error);
                    }
                  }}
                  title="View Details"
                  className="text-gray-400 hover:text-white hover:bg-gray-700/50 border border-transparent hover:border-gray-600"
                >
                  <Eye className="h-4 w-4" />
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => onEdit(bot.bot_id)}
                  title="Edit Bot"
                  className="text-gray-400 hover:text-white hover:bg-gray-700/50 border border-transparent hover:border-gray-600"
                >
                  <Edit className="h-4 w-4" />
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => onDuplicate(bot.bot_id)}
                  title="Duplicate Bot"
                  data-testid="bot-duplicate"
                  className="text-gray-400 hover:text-white hover:bg-gray-700/50 border border-transparent hover:border-gray-600"
                >
                  <Copy className="h-4 w-4" />
                </Button>

                {/* More Actions Menu */}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button 
                      size="sm" 
                      variant="ghost"
                      className="text-gray-400 hover:text-white hover:bg-gray-700/50 border border-transparent hover:border-gray-600"
                    >
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="bg-gray-800 border-gray-700">
                    <DropdownMenuItem 
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        console.log('🔍 View Logs clicked for bot:', bot.bot_id);
                        try {
                          if (onView && typeof onView === 'function') {
                            onView(bot.bot_id);
                          } else {
                            console.error('❌ onView is not a function:', typeof onView);
                          }
                        } catch (error) {
                          console.error('❌ Error in onView:', error);
                        }
                      }}
                      className="text-white hover:bg-gray-700 focus:bg-gray-700"
                    >
                      <FileText className="h-4 w-4 mr-2" />
                      View Logs
                    </DropdownMenuItem>
                    <DropdownMenuSeparator className="bg-gray-700" />
                    <DropdownMenuItem 
                      onClick={() => setShowDeleteDialog(true)}
                      className="text-red-400 hover:bg-red-900/20 focus:bg-red-900/20"
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      Delete Bot
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Bot</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete <strong>{bot.name}</strong>? This action cannot be undone.
              All bot data and trading history will be permanently removed.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
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
