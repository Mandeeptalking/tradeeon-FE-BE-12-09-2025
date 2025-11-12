import { useEffect, useState } from 'react';
import { dashboardApi, type DashboardSummary } from '../lib/api/dashboard';
import { Wallet, TrendingUp, Activity, DollarSign, RefreshCw, AlertCircle } from 'lucide-react';
import { logger } from '../utils/logger';
import { sanitizeErrorMessage } from '../utils/errorHandler';

// Dashboard component - displays Binance account info, assets, and active trades
const Dashboard = () => {
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Log API URL for debugging
      const apiUrl = import.meta.env.VITE_API_URL || import.meta.env.VITE_API_BASE || 'https://api.tradeeon.com';
      logger.debug('Fetching dashboard data from:', apiUrl);
      
      const data = await dashboardApi.getSummary();
      logger.debug('Dashboard data received:', { 
        hasData: !!data, 
        accountTypes: data?.account?.account_types,
        assetsCount: data?.assets?.length 
      });
      setSummary(data);
    } catch (err: any) {
      logger.error('Failed to fetch dashboard data:', {
        error: err,
        message: err?.message,
        name: err?.name,
        stack: err?.stack
      });
      // Use sanitized error message
      const errorMessage = sanitizeErrorMessage(err);
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(value);
  };

  const formatNumber = (value: number, decimals: number = 8) => {
    return new Intl.NumberFormat('en-US', {
      minimumFractionDigits: 0,
      maximumFractionDigits: decimals,
    }).format(value);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 flex items-center justify-center">
        <div className="text-center">
          <RefreshCw className="h-12 w-12 text-blue-400 animate-spin mx-auto mb-4" />
          <p className="text-white/70">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 flex items-center justify-center px-4">
        <div className="max-w-md w-full bg-gray-800/80 backdrop-blur-sm border border-gray-700/50 rounded-2xl p-8 text-center">
          <AlertCircle className="h-16 w-16 text-red-400 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-white mb-2">Unable to Load Dashboard</h2>
          <p className="text-gray-400 mb-4">{error}</p>
          <button
            onClick={fetchDashboardData}
            className="px-6 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg font-medium transition-colors"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  if (!summary) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 flex items-center justify-center">
        <div className="text-center">
          <p className="text-white/70">No data available</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-white mb-2">Dashboard</h1>
            <p className="text-white/60">Your Binance account overview</p>
          </div>
          <button
            onClick={fetchDashboardData}
            className="flex items-center gap-2 px-4 py-2 bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 rounded-lg border border-blue-500/20 transition-colors"
          >
            <RefreshCw className="h-4 w-4" />
            Refresh
          </button>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {/* USDT Balance */}
          <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl p-6 hover:border-white/20 transition-colors">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 bg-green-500/10 rounded-lg">
                <DollarSign className="h-6 w-6 text-green-400" />
              </div>
              <span className="text-xs text-white/60 uppercase tracking-wide">USDT Balance</span>
            </div>
            <div className="space-y-1">
              <p className="text-3xl font-bold text-white">
                {formatCurrency(summary.usdt_balance.total)}
              </p>
              <div className="flex items-center gap-4 text-sm">
                <span className="text-white/60">
                  Free: <span className="text-white">{formatCurrency(summary.usdt_balance.free)}</span>
                </span>
                {summary.usdt_balance.locked > 0 && (
                  <span className="text-white/60">
                    Locked: <span className="text-white">{formatCurrency(summary.usdt_balance.locked)}</span>
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Total Assets */}
          <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl p-6 hover:border-white/20 transition-colors">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 bg-blue-500/10 rounded-lg">
                <Wallet className="h-6 w-6 text-blue-400" />
              </div>
              <span className="text-xs text-white/60 uppercase tracking-wide">Total Assets</span>
            </div>
            <div className="space-y-1">
              <p className="text-3xl font-bold text-white">{summary.stats.total_assets}</p>
              <p className="text-sm text-white/60">Different cryptocurrencies</p>
            </div>
          </div>

          {/* Active Trades */}
          <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl p-6 hover:border-white/20 transition-colors">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 bg-purple-500/10 rounded-lg">
                <Activity className="h-6 w-6 text-purple-400" />
              </div>
              <span className="text-xs text-white/60 uppercase tracking-wide">Active Trades</span>
            </div>
            <div className="space-y-1">
              <p className="text-3xl font-bold text-white">
                {summary.stats.total_active_trades + (summary.stats.total_futures_positions || 0)}
              </p>
              <p className="text-sm text-white/60">
                {summary.stats.total_active_trades > 0 && (summary.stats.total_futures_positions || 0) > 0
                  ? `${summary.stats.total_active_trades} orders, ${summary.stats.total_futures_positions || 0} positions`
                  : 'Open orders & positions'}
              </p>
            </div>
          </div>

          {/* Account Status */}
          <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl p-6 hover:border-white/20 transition-colors">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 bg-emerald-500/10 rounded-lg">
                <TrendingUp className="h-6 w-6 text-emerald-400" />
              </div>
              <span className="text-xs text-white/60 uppercase tracking-wide">Account Status</span>
            </div>
            <div className="space-y-1">
              <div className="flex items-center gap-2 flex-wrap">
                {summary.account.account_types?.map((type) => (
                  <span
                    key={type}
                    className="px-2 py-1 bg-emerald-500/20 text-emerald-400 rounded text-xs font-medium capitalize"
                  >
                    {type}
                  </span>
                )) || (
                  <span className="text-lg font-semibold text-white capitalize">
                    {summary.account.account_type}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2 text-xs mt-2">
                {summary.account.can_trade && (
                  <span className="px-2 py-1 bg-green-500/20 text-green-400 rounded">Trading</span>
                )}
                {summary.account.can_deposit && (
                  <span className="px-2 py-1 bg-blue-500/20 text-blue-400 rounded">Deposit</span>
                )}
                {summary.account.can_withdraw && (
                  <span className="px-2 py-1 bg-purple-500/20 text-purple-400 rounded">Withdraw</span>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Assets List */}
          <div className="lg:col-span-2 bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-semibold text-white">Your Assets</h2>
              <span className="text-sm text-white/60">{summary.assets.length} assets</span>
            </div>
            {summary.assets.length === 0 ? (
              <div className="text-center py-12">
                <Wallet className="h-12 w-12 text-white/20 mx-auto mb-4" />
                <p className="text-white/60">No assets found</p>
              </div>
            ) : (
              <div className="space-y-3 max-h-96 overflow-y-auto">
                {summary.assets.map((asset) => (
                  <div
                    key={asset.asset}
                    className="flex items-center justify-between p-4 bg-white/5 rounded-lg border border-white/10 hover:border-white/20 transition-colors"
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500/20 to-purple-500/20 flex items-center justify-center">
                        <span className="text-lg font-bold text-white">{asset.asset[0]}</span>
                      </div>
                      <div>
                        <p className="font-semibold text-white">{asset.asset}</p>
                        <p className="text-sm text-white/60">
                          Total: {formatNumber(asset.total, asset.asset === 'USDT' ? 2 : 8)}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-medium text-white">
                        {formatNumber(asset.free, asset.asset === 'USDT' ? 2 : 8)}
                      </p>
                      {asset.locked > 0 && (
                        <p className="text-xs text-white/60">
                          Locked: {formatNumber(asset.locked, asset.asset === 'USDT' ? 2 : 8)}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Active Trades (Open Orders) */}
          <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-semibold text-white">Active Trades (Open Orders)</h2>
              <span className="text-sm text-white/60">{summary.active_trades.length}</span>
            </div>
            {summary.active_trades.length === 0 ? (
              <div className="text-center py-12">
                <Activity className="h-12 w-12 text-white/20 mx-auto mb-4" />
                <p className="text-white/60">No open orders</p>
              </div>
            ) : (
              <div className="space-y-3 max-h-96 overflow-y-auto">
                {summary.active_trades.map((trade) => (
                  <div
                    key={trade.order_id}
                    className="p-4 bg-white/5 rounded-lg border border-white/10 hover:border-white/20 transition-colors"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-white">{trade.symbol}</span>
                        {trade.account_type && (
                          <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                            trade.account_type === 'FUTURES'
                              ? 'bg-purple-500/20 text-purple-400'
                              : 'bg-blue-500/20 text-blue-400'
                          }`}>
                            {trade.account_type}
                          </span>
                        )}
                      </div>
                      <span
                        className={`px-2 py-1 rounded text-xs font-medium ${
                          trade.side === 'BUY'
                            ? 'bg-green-500/20 text-green-400'
                            : 'bg-red-500/20 text-red-400'
                        }`}
                      >
                        {trade.side}
                      </span>
                    </div>
                    <div className="space-y-1 text-sm">
                      <div className="flex justify-between">
                        <span className="text-white/60">Type:</span>
                        <span className="text-white">{trade.type}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-white/60">Quantity:</span>
                        <span className="text-white">{formatNumber(trade.quantity)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-white/60">Price:</span>
                        <span className="text-white">{formatCurrency(trade.price)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-white/60">Status:</span>
                        <span className="text-white capitalize">{trade.status.toLowerCase()}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Futures Positions */}
          {summary.futures_positions && summary.futures_positions.length > 0 && (
            <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-semibold text-white">Futures Positions</h2>
                <span className="text-sm text-white/60">{summary.futures_positions.length}</span>
              </div>
              <div className="space-y-3 max-h-96 overflow-y-auto">
                {summary.futures_positions.map((position, index) => (
                  <div
                    key={`${position.symbol}-${index}`}
                    className="p-4 bg-white/5 rounded-lg border border-white/10 hover:border-white/20 transition-colors"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-white">{position.symbol}</span>
                        <span className="px-2 py-0.5 rounded text-xs font-medium bg-purple-500/20 text-purple-400">
                          FUTURES
                        </span>
                      </div>
                      <span
                        className={`px-2 py-1 rounded text-xs font-medium ${
                          position.position_amount > 0
                            ? 'bg-green-500/20 text-green-400'
                            : 'bg-red-500/20 text-red-400'
                        }`}
                      >
                        {position.position_amount > 0 ? 'LONG' : 'SHORT'}
                      </span>
                    </div>
                    <div className="space-y-1 text-sm">
                      <div className="flex justify-between">
                        <span className="text-white/60">Position:</span>
                        <span className="text-white">{formatNumber(Math.abs(position.position_amount))}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-white/60">Entry Price:</span>
                        <span className="text-white">{formatCurrency(position.entry_price)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-white/60">Mark Price:</span>
                        <span className="text-white">{formatCurrency(position.mark_price)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-white/60">Unrealized PnL:</span>
                        <span className={`font-medium ${
                          position.unrealized_pnl >= 0 ? 'text-green-400' : 'text-red-400'
                        }`}>
                          {formatCurrency(position.unrealized_pnl)}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-white/60">Leverage:</span>
                        <span className="text-white">{position.leverage}x</span>
                      </div>
                      {position.liquidation_price > 0 && (
                        <div className="flex justify-between">
                          <span className="text-white/60">Liquidation Price:</span>
                          <span className="text-red-400">{formatCurrency(position.liquidation_price)}</span>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
