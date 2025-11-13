import { useEffect, useState } from 'react';
import { dashboardApi, type DashboardSummary, type AccountInfo } from '../../lib/api/dashboard';
import { useAuthStore } from '../../store/auth';
import { Wallet, TrendingUp, Activity, DollarSign, RefreshCw, AlertCircle, User, Shield, CheckCircle } from 'lucide-react';
import { logger } from '../../utils/logger';
import { sanitizeErrorMessage } from '../../utils/errorHandler';
import { motion } from 'framer-motion';
import { AssetCard } from '../../components/dashboard/AssetCard';

const Portfolio = () => {
  const { user } = useAuthStore();
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [accountInfo, setAccountInfo] = useState<AccountInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchPortfolioData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Fetch dashboard summary (includes assets, account info)
      const dashboardData = await dashboardApi.getSummary();
      setSummary(dashboardData);
      
      // Fetch detailed account info
      try {
        const account = await dashboardApi.getAccountInfo();
        setAccountInfo(account);
      } catch (err) {
        logger.warn('Failed to fetch detailed account info:', err);
        // Continue without detailed account info
      }
    } catch (err: any) {
      logger.error('Failed to fetch portfolio data:', err);
      const errorMessage = sanitizeErrorMessage(err);
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPortfolioData();
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

  const formatPercentage = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'percent',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(value / 100);
  };

  if (loading) {
    return (
      <div className="min-h-full relative overflow-hidden bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 flex items-center justify-center">
        <div className="text-center">
          <RefreshCw className="h-12 w-12 text-blue-400 animate-spin mx-auto mb-4" />
          <p className="text-white/70">Loading portfolio...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-full relative overflow-hidden bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 flex items-center justify-center px-4">
        <div className="max-w-md w-full bg-gray-800/80 backdrop-blur-sm border border-gray-700/50 rounded-2xl p-8 text-center">
          <AlertCircle className="h-16 w-16 text-red-400 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-white mb-2">Unable to Load Portfolio</h2>
          <p className="text-gray-400 mb-4">{error}</p>
          <button
            onClick={fetchPortfolioData}
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
      <div className="min-h-full relative overflow-hidden bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 flex items-center justify-center">
        <div className="text-center">
          <p className="text-white/70">No data available</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-full w-full relative bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900">
      {/* Animated background */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px]" />
      </div>

      {/* Content */}
      <div className="relative z-10 p-4 pb-6 w-full">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="flex items-center justify-between mb-4"
          >
            <div>
              <h1 className="text-2xl font-bold text-white mb-0.5 bg-gradient-to-r from-white to-white/70 bg-clip-text text-transparent">
                Portfolio
              </h1>
              <p className="text-white/60 text-sm">Account overview and holdings</p>
            </div>
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={fetchPortfolioData}
              className="flex items-center gap-2 px-3 py-1.5 bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 rounded-lg border border-blue-500/20 transition-all backdrop-blur-sm text-sm"
            >
              <RefreshCw className="h-3.5 w-3.5" />
              Refresh
            </motion.button>
          </motion.div>

          {/* Account Information Section */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl p-4 mb-4"
          >
            <div className="flex items-center gap-2 mb-4">
              <div className="p-2 bg-blue-500/10 rounded-lg">
                <User className="h-4 w-4 text-blue-400" />
              </div>
              <h2 className="text-lg font-bold text-white">Account Information</h2>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
              {/* Account Name/Email */}
              <div className="space-y-1">
                <p className="text-xs text-white/60">Account Name</p>
                <p className="text-sm font-semibold text-white">{user?.name || 'User'}</p>
                <p className="text-xs text-white/50 truncate">{user?.email || 'No email'}</p>
              </div>

              {/* Trading Account Types (SPOT/FUTURES) */}
              <div className="space-y-1">
                <p className="text-xs text-white/60">Trading Accounts</p>
                <div className="flex items-center gap-1.5 flex-wrap">
                  {summary.account.account_types?.map((type) => (
                    <span
                      key={type}
                      className="px-2 py-0.5 bg-emerald-500/20 text-emerald-400 rounded text-xs font-medium capitalize"
                    >
                      {type}
                    </span>
                  )) || (
                    <span className="text-sm font-semibold text-white capitalize">
                      {summary.account.account_type}
                    </span>
                  )}
                </div>
              </div>

              {/* Account Permissions */}
              <div className="space-y-1">
                <p className="text-xs text-white/60">Permissions</p>
                <div className="flex items-center gap-1 flex-wrap">
                  {summary.account.can_trade && (
                    <span className="px-1.5 py-0.5 bg-green-500/20 text-green-400 rounded text-xs font-medium flex items-center gap-0.5">
                      <CheckCircle className="h-2.5 w-2.5" />
                      Trade
                    </span>
                  )}
                  {summary.account.can_deposit && (
                    <span className="px-1.5 py-0.5 bg-blue-500/20 text-blue-400 rounded text-xs font-medium flex items-center gap-0.5">
                      <CheckCircle className="h-2.5 w-2.5" />
                      Deposit
                    </span>
                  )}
                  {summary.account.can_withdraw && (
                    <span className="px-1.5 py-0.5 bg-purple-500/20 text-purple-400 rounded text-xs font-medium flex items-center gap-0.5">
                      <CheckCircle className="h-2.5 w-2.5" />
                      Withdraw
                    </span>
                  )}
                </div>
              </div>

              {/* Commission Rates & VIP Level */}
              {accountInfo && (
                <>
                  <div className="space-y-1">
                    <p className="text-xs text-white/60">VIP Level</p>
                    <div className="flex items-center gap-1.5">
                      <p className="text-sm font-semibold text-white">
                        {accountInfo.account.vip_level || accountInfo.account.account_type || 'Regular'}
                      </p>
                      {accountInfo.account.vip_level && accountInfo.account.vip_level !== 'Regular' && (
                        <span className="px-1.5 py-0.5 bg-yellow-500/20 text-yellow-400 rounded text-xs font-medium">
                          VIP
                        </span>
                      )}
                    </div>
                    {accountInfo.account.discount_enabled && (
                      <p className="text-xs text-white/50 mt-0.5">
                        {accountInfo.account.discount_asset} {(accountInfo.account.discount_rate || 0) * 100}%
                      </p>
                    )}
                  </div>
                  <div className="space-y-1">
                    <p className="text-xs text-white/60">Maker Fee</p>
                    <p className="text-sm font-semibold text-white">
                      {(accountInfo.account.maker_commission * 100).toFixed(3)}%
                    </p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-xs text-white/60">Taker Fee</p>
                    <p className="text-sm font-semibold text-white">
                      {(accountInfo.account.taker_commission * 100).toFixed(3)}%
                    </p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-xs text-white/60">Status</p>
                    <div className="flex items-center gap-1.5">
                      <Shield className="h-3 w-3 text-green-400" />
                      <span className="text-xs font-medium text-green-400">Active</span>
                    </div>
                  </div>
                </>
              )}
            </div>
          </motion.div>

          {/* Portfolio Summary Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
            {/* Total Balance */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.2 }}
              className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-lg p-3 hover:border-white/20 transition-all"
            >
              <div className="flex items-center justify-between mb-2">
                <div className="p-1.5 bg-green-500/10 rounded">
                  <DollarSign className="h-3.5 w-3.5 text-green-400" />
                </div>
                <span className="text-xs text-white/60 uppercase tracking-wide">Total Balance</span>
              </div>
              <p className="text-xl font-bold text-white mb-1">
                {formatCurrency(summary.usdt_balance.total)}
              </p>
              {summary.usdt_balance_by_account && (
                <div className="space-y-0.5 text-xs mt-1">
                  <div className="flex justify-between text-white/50">
                    <span>S:</span>
                    <span className="text-white">{formatCurrency(summary.usdt_balance_by_account.SPOT.total)}</span>
                  </div>
                  {summary.usdt_balance_by_account.FUTURES.total > 0 && (
                    <div className="flex justify-between text-white/50">
                      <span>F:</span>
                      <span className="text-white">{formatCurrency(summary.usdt_balance_by_account.FUTURES.total)}</span>
                    </div>
                  )}
                  {summary.usdt_balance_by_account.FUNDING.total > 0 && (
                    <div className="flex justify-between text-white/50">
                      <span>Fu:</span>
                      <span className="text-white">{formatCurrency(summary.usdt_balance_by_account.FUNDING.total)}</span>
                    </div>
                  )}
                </div>
              )}
            </motion.div>

            {/* Total Assets */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.3 }}
              className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-lg p-3 hover:border-white/20 transition-all"
            >
              <div className="flex items-center justify-between mb-2">
                <div className="p-1.5 bg-blue-500/10 rounded">
                  <Wallet className="h-3.5 w-3.5 text-blue-400" />
                </div>
                <span className="text-xs text-white/60 uppercase tracking-wide">Assets</span>
              </div>
              <p className="text-xl font-bold text-white">{summary.stats.total_assets}</p>
              <p className="text-xs text-white/50 mt-0.5">Cryptocurrencies</p>
            </motion.div>

            {/* Active Trades */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.4 }}
              className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-lg p-3 hover:border-white/20 transition-all"
            >
              <div className="flex items-center justify-between mb-2">
                <div className="p-1.5 bg-purple-500/10 rounded">
                  <Activity className="h-3.5 w-3.5 text-purple-400" />
                </div>
                <span className="text-xs text-white/60 uppercase tracking-wide">Trades</span>
              </div>
              <p className="text-xl font-bold text-white">
                {summary.stats.total_active_trades + (summary.stats.total_futures_positions || 0)}
              </p>
              <p className="text-xs text-white/50 mt-0.5">
                {summary.stats.total_active_trades > 0 && (summary.stats.total_futures_positions || 0) > 0
                  ? `${summary.stats.total_active_trades} orders`
                  : 'Open orders'}
              </p>
            </motion.div>

            {/* Portfolio Value */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.5 }}
              className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-lg p-3 hover:border-white/20 transition-all"
            >
              <div className="flex items-center justify-between mb-2">
                <div className="p-1.5 bg-emerald-500/10 rounded">
                  <TrendingUp className="h-3.5 w-3.5 text-emerald-400" />
                </div>
                <span className="text-xs text-white/60 uppercase tracking-wide">Portfolio</span>
              </div>
              <p className="text-xl font-bold text-white">
                {formatCurrency(summary.stats.total_portfolio_value_usdt || summary.stats.total_balance_usdt)}
              </p>
              <p className="text-xs text-white/50 mt-0.5">Total value</p>
            </motion.div>
          </div>

          {/* Holdings Section */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.6 }}
            className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-lg p-4"
          >
            <div className="flex items-center justify-between mb-3">
              <div>
                <h2 className="text-lg font-bold text-white mb-0.5">Holdings</h2>
                <p className="text-xs text-white/60">
                  {summary.assets.length} {summary.assets.length === 1 ? 'asset' : 'assets'}
                </p>
              </div>
            </div>

            {summary.assets.length === 0 ? (
              <div className="text-center py-8">
                <div className="w-12 h-12 mx-auto mb-2 rounded-full bg-white/5 flex items-center justify-center">
                  <Wallet className="h-6 w-6 text-white/20" />
                </div>
                <p className="text-white/60 text-sm">No holdings found</p>
                <p className="text-white/40 text-xs mt-1">Connect an exchange to see your holdings</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-2 max-h-[280px] overflow-y-auto pr-2 custom-scrollbar">
                {summary.assets.map((asset, index) => (
                  <AssetCard
                    key={asset.asset}
                    asset={asset}
                    formatNumber={formatNumber}
                    formatCurrency={formatCurrency}
                    index={index}
                  />
                ))}
              </div>
            )}
          </motion.div>
        </div>
      </div>
    </div>
  );
};

export default Portfolio;
