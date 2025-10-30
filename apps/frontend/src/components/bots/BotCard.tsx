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
  onStatusChange: (botId: string, status: BotStatus) => void;
  onDuplicate: (botId: string) => void;
  onDelete: (botId: string) => void;
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
  onStatusChange, 
  onDuplicate, 
  onDelete, 
  onEdit, 
  onView 
}: BotCardProps) {
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  const getStatusConfig = (status: BotStatus) => {
    switch (status) {
      case 'running':
        return { 
          label: 'Running', 
          color: 'bg-green-100 text-green-800 border-green-200',
          ring: 'ring-green-500/20'
        };
      case 'paused':
        return { 
          label: 'Paused', 
          color: 'bg-amber-100 text-amber-800 border-amber-200',
          ring: 'ring-amber-500/20'
        };
      case 'stopped':
        return { 
          label: 'Stopped', 
          color: 'bg-gray-100 text-gray-800 border-gray-200',
          ring: 'ring-gray-500/20'
        };
    }
  };

  const getExchangeBadge = (exchange: string) => {
    const colors = {
      Binance: 'bg-yellow-100 text-yellow-800',
      Zerodha: 'bg-blue-100 text-blue-800',
      KuCoin: 'bg-green-100 text-green-800',
    };
    return colors[exchange as keyof typeof colors] || 'bg-gray-100 text-gray-800';
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const formatPercentage = (pct: number) => {
    const sign = pct >= 0 ? '+' : '';
    return `${sign}${pct.toFixed(2)}%`;
  };

  const statusConfig = getStatusConfig(bot.status);
  const canStart = bot.status === 'paused' || bot.status === 'stopped';
  const canPause = bot.status === 'running';
  const canStop = bot.status === 'running' || bot.status === 'paused';

  return (
    <>
      <motion.div
        layout
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -20 }}
        whileHover={{ y: -2, transition: { duration: 0.2 } }}
        className="group"
        data-testid="bot-card"
      >
        <Card className={`relative overflow-hidden transition-all duration-200 hover:shadow-lg ${statusConfig.ring} ring-1`}>
          <CardHeader className="pb-3">
            {/* Header Row */}
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                {/* Exchange Badge */}
                <Badge className={`text-xs font-medium ${getExchangeBadge(bot.exchange)}`}>
                  {bot.exchange}
                </Badge>
                
                {/* Pair */}
                <span className="font-mono text-sm font-semibold text-foreground">
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
              <h3 className="font-semibold text-lg text-foreground group-hover:text-primary transition-colors">
                {bot.name}
              </h3>
              <span className="text-xs text-muted-foreground capitalize">
                {bot.bot_type} bot
              </span>
            </div>
          </CardHeader>

          <CardContent className="space-y-4">
            {/* Mini Metrics */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground">Invested</p>
                <p className="font-semibold text-sm">{formatCurrency(bot.invested)}</p>
              </div>
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground">Orders</p>
                <p className="font-semibold text-sm">{bot.orders_count}</p>
              </div>
            </div>

            {/* P&L Section */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground">24h P&L</span>
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
            <div className="flex items-center justify-between pt-2 border-t">
              {/* Primary Action */}
              <div className="flex items-center space-x-2">
                {canStart && (
                  <Button
                    size="sm"
                    onClick={() => onStatusChange(bot.bot_id, 'running')}
                    className="bg-green-600 hover:bg-green-700"
                    data-testid="bot-play"
                  >
                    <Play className="h-4 w-4 mr-1" />
                    Start
                  </Button>
                )}
                {canPause && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => onStatusChange(bot.bot_id, 'paused')}
                  >
                    <Pause className="h-4 w-4 mr-1" />
                    Pause
                  </Button>
                )}
                {canStop && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => onStatusChange(bot.bot_id, 'stopped')}
                  >
                    <Square className="h-4 w-4 mr-1" />
                    Stop
                  </Button>
                )}
              </div>

              {/* Secondary Actions */}
              <div className="flex items-center space-x-1">
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => onView(bot.bot_id)}
                  title="View Details"
                >
                  <Eye className="h-4 w-4" />
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => onEdit(bot.bot_id)}
                  title="Edit Bot"
                >
                  <Edit className="h-4 w-4" />
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => onDuplicate(bot.bot_id)}
                  title="Duplicate Bot"
                  data-testid="bot-duplicate"
                >
                  <Copy className="h-4 w-4" />
                </Button>

                {/* More Actions Menu */}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button size="sm" variant="ghost">
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => onView(bot.bot_id)}>
                      <FileText className="h-4 w-4 mr-2" />
                      View Logs
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem 
                      onClick={() => setShowDeleteDialog(true)}
                      className="text-destructive focus:text-destructive"
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
                onDelete(bot.bot_id);
                setShowDeleteDialog(false);
              }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete Bot
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}


