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
      <div className="relative z-10 p-6 pb-12 w-full">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="flex items-center justify-between mb-8"
          >
            <div>
              <h1 className="text-4xl font-bold text-white mb-2 bg-gradient-to-r from-white to-white/70 bg-clip-text text-transparent">
                Portfolio
              </h1>
              <p className="text-white/60 text-lg">Account overview and holdings</p>
            </div>
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={fetchPortfolioData}
              className="flex items-center gap-2 px-5 py-2.5 bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 rounded-lg border border-blue-500/20 transition-all backdrop-blur-sm"
            >
              <RefreshCw className="h-4 w-4" />
              Refresh
            </motion.button>
          </motion.div>

          {/* Account Information Section */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl p-6 mb-6"
          >
            <div className="flex items-center gap-3 mb-6">
              <div className="p-3 bg-blue-500/10 rounded-lg">
                <User className="h-6 w-6 text-blue-400" />
              </div>
              <h2 className="text-2xl font-bold text-white">Account Information</h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {/* Account Name/Email */}
              <div className="space-y-2">
                <p className="text-sm text-white/60">Account Name</p>
                <p className="text-lg font-semibold text-white">{user?.name || 'User'}</p>
                <p className="text-sm text-white/50">{user?.email || 'No email'}</p>
              </div>

              {/* Trading Account Types (SPOT/FUTURES) */}
              <div className="space-y-2">
                <p className="text-sm text-white/60">Trading Accounts</p>
                <div className="flex items-center gap-2 flex-wrap">
                  {summary.account.account_types?.map((type) => (
                    <span
                      key={type}
                      className="px-3 py-1 bg-emerald-500/20 text-emerald-400 rounded-lg text-sm font-medium capitalize"
                    >
                      {type}
                    </span>
                  )) || (
                    <span className="text-lg font-semibold text-white capitalize">
                      {summary.account.account_type}
                    </span>
                  )}
                </div>
              </div>

              {/* Account Permissions */}
              <div className="space-y-2">
                <p className="text-sm text-white/60">Permissions</p>
                <div className="flex items-center gap-2 flex-wrap">
                  {summary.account.can_trade && (
                    <span className="px-2 py-1 bg-green-500/20 text-green-400 rounded text-xs font-medium flex items-center gap-1">
                      <CheckCircle className="h-3 w-3" />
                      Trading
                    </span>
                  )}
                  {summary.account.can_deposit && (
                    <span className="px-2 py-1 bg-blue-500/20 text-blue-400 rounded text-xs font-medium flex items-center gap-1">
                      <CheckCircle className="h-3 w-3" />
                      Deposit
                    </span>
                  )}
                  {summary.account.can_withdraw && (
                    <span className="px-2 py-1 bg-purple-500/20 text-purple-400 rounded text-xs font-medium flex items-center gap-1">
                      <CheckCircle className="h-3 w-3" />
                      Withdraw
                    </span>
                  )}
                </div>
              </div>

              {/* Commission Rates & VIP Level */}
              {accountInfo && (
                <>
                  <div className="space-y-2">
                    <p className="text-sm text-white/60">Account Type (VIP Level)</p>
                    <p className="text-lg font-semibold text-white">
                      {accountInfo.account.vip_level || accountInfo.account.account_type || 'Regular'}
                    </p>
                    {accountInfo.account.discount_enabled && (
                      <p className="text-xs text-white/50">
                        {accountInfo.account.discount_asset} discount: {(accountInfo.account.discount_rate || 0) * 100}%
                      </p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <p className="text-sm text-white/60">Maker Commission</p>
                    <p className="text-lg font-semibold text-white">
                      {(accountInfo.account.maker_commission * 100).toFixed(4)}%
                    </p>
                  </div>
                  <div className="space-y-2">
                    <p className="text-sm text-white/60">Taker Commission</p>
                    <p className="text-lg font-semibold text-white">
                      {(accountInfo.account.taker_commission * 100).toFixed(4)}%
                    </p>
                  </div>
                  <div className="space-y-2">
                    <p className="text-sm text-white/60">Account Status</p>
                    <div className="flex items-center gap-2">
                      <Shield className="h-4 w-4 text-green-400" />
                      <span className="text-sm font-medium text-green-400">Active & Secure</span>
                    </div>
                  </div>
                </>
              )}
            </div>
          </motion.div>

          {/* Portfolio Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
            {/* Total Balance */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.2 }}
              className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl p-6 hover:border-white/20 transition-all"
            >
              <div className="flex items-center justify-between mb-4">
                <div className="p-3 bg-green-500/10 rounded-lg">
                  <DollarSign className="h-6 w-6 text-green-400" />
                </div>
                <span className="text-xs text-white/60 uppercase tracking-wide">Total Balance (USDT)</span>
              </div>
              <p className="text-3xl font-bold text-white mb-1">
                {formatCurrency(summary.usdt_balance.total)}
              </p>
              {summary.usdt_balance_by_account && (
                <div className="space-y-1 text-xs mt-2">
                  <div className="flex justify-between text-white/60">
                    <span>Spot:</span>
                    <span className="text-white">{formatCurrency(summary.usdt_balance_by_account.SPOT.total)}</span>
                  </div>
                  {summary.usdt_balance_by_account.FUTURES.total > 0 && (
                    <div className="flex justify-between text-white/60">
                      <span>Futures:</span>
                      <span className="text-white">{formatCurrency(summary.usdt_balance_by_account.FUTURES.total)}</span>
                    </div>
                  )}
                  {summary.usdt_balance_by_account.FUNDING.total > 0 && (
                    <div className="flex justify-between text-white/60">
                      <span>Funding:</span>
                      <span className="text-white">{formatCurrency(summary.usdt_balance_by_account.FUNDING.total)}</span>
                    </div>
                  )}
                </div>
              )}
              <div className="flex items-center gap-4 text-sm mt-2">
                <span className="text-white/60">
                  Free: <span className="text-white">{formatCurrency(summary.usdt_balance.free)}</span>
                </span>
                {summary.usdt_balance.locked > 0 && (
                  <span className="text-white/60">
                    Locked: <span className="text-white">{formatCurrency(summary.usdt_balance.locked)}</span>
                  </span>
                )}
              </div>
            </motion.div>

            {/* Total Assets */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.3 }}
              className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl p-6 hover:border-white/20 transition-all"
            >
              <div className="flex items-center justify-between mb-4">
                <div className="p-3 bg-blue-500/10 rounded-lg">
                  <Wallet className="h-6 w-6 text-blue-400" />
                </div>
                <span className="text-xs text-white/60 uppercase tracking-wide">Total Assets</span>
              </div>
              <p className="text-3xl font-bold text-white">{summary.stats.total_assets}</p>
              <p className="text-sm text-white/60 mt-1">Different cryptocurrencies</p>
            </motion.div>

            {/* Active Trades */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.4 }}
              className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl p-6 hover:border-white/20 transition-all"
            >
              <div className="flex items-center justify-between mb-4">
                <div className="p-3 bg-purple-500/10 rounded-lg">
                  <Activity className="h-6 w-6 text-purple-400" />
                </div>
                <span className="text-xs text-white/60 uppercase tracking-wide">Active Trades</span>
              </div>
              <p className="text-3xl font-bold text-white">
                {summary.stats.total_active_trades + (summary.stats.total_futures_positions || 0)}
              </p>
              <p className="text-sm text-white/60 mt-1">
                {summary.stats.total_active_trades > 0 && (summary.stats.total_futures_positions || 0) > 0
                  ? `${summary.stats.total_active_trades} orders, ${summary.stats.total_futures_positions || 0} positions`
                  : 'Open orders & positions'}
              </p>
            </motion.div>

            {/* Portfolio Value */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.5 }}
              className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl p-6 hover:border-white/20 transition-all"
            >
              <div className="flex items-center justify-between mb-4">
                <div className="p-3 bg-emerald-500/10 rounded-lg">
                  <TrendingUp className="h-6 w-6 text-emerald-400" />
                </div>
                <span className="text-xs text-white/60 uppercase tracking-wide">Portfolio Value</span>
              </div>
              <p className="text-3xl font-bold text-white">
                {formatCurrency(summary.stats.total_portfolio_value_usdt || summary.stats.total_balance_usdt)}
              </p>
              <p className="text-sm text-white/60 mt-1">Total value of all assets</p>
            </motion.div>
          </div>

          {/* Holdings Section */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.6 }}
            className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl p-6"
          >
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-2xl font-bold text-white mb-1">Holdings</h2>
                <p className="text-sm text-white/60">
                  {summary.assets.length} {summary.assets.length === 1 ? 'asset' : 'assets'} in your portfolio
                </p>
              </div>
            </div>

            {summary.assets.length === 0 ? (
              <div className="text-center py-16">
                <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-white/5 flex items-center justify-center">
                  <Wallet className="h-10 w-10 text-white/20" />
                </div>
                <p className="text-white/60 text-lg">No holdings found</p>
                <p className="text-white/40 text-sm mt-2">Connect an exchange to see your holdings</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
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
