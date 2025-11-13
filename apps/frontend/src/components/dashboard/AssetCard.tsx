import { motion } from 'framer-motion';
import { TrendingUp, Lock } from 'lucide-react';

interface AssetCardProps {
  asset: {
    asset: string;
    free: number;
    locked: number;
    total: number;
  };
  formatNumber: (value: number, decimals?: number) => string;
  formatCurrency: (value: number) => string;
  index: number;
}

/**
 * Modern asset card component with enhanced visuals
 */
export const AssetCard = ({ asset, formatNumber, formatCurrency, index }: AssetCardProps) => {
  const isUSDT = asset.asset === 'USDT';
  const decimals = isUSDT ? 2 : 8;
  const freePercentage = asset.total > 0 ? (asset.free / asset.total) * 100 : 0;
  
  // Generate gradient colors based on asset symbol
  const getGradientColors = (symbol: string) => {
    const colors = [
      'from-blue-500/20 to-cyan-500/20',
      'from-purple-500/20 to-pink-500/20',
      'from-emerald-500/20 to-teal-500/20',
      'from-orange-500/20 to-red-500/20',
      'from-yellow-500/20 to-amber-500/20',
    ];
    const hash = symbol.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    return colors[hash % colors.length];
  };

  const gradientColors = getGradientColors(asset.asset);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: index * 0.05 }}
      whileHover={{ y: -2, transition: { duration: 0.2 } }}
      className="group relative overflow-hidden bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl p-4 hover:border-white/20 hover:bg-white/10 transition-all duration-300"
    >
      {/* Gradient background on hover */}
      <div className={`absolute inset-0 bg-gradient-to-br ${gradientColors} opacity-0 group-hover:opacity-100 transition-opacity duration-300`} />
      
      <div className="relative z-10">
        <div className="flex items-center justify-between mb-3">
          {/* Asset Info */}
          <div className="flex items-center gap-3">
            {/* Asset Icon */}
            <div className={`relative w-12 h-12 rounded-xl bg-gradient-to-br ${gradientColors} flex items-center justify-center shadow-lg`}>
              <span className="text-xl font-bold text-white">{asset.asset[0]}</span>
              {/* Shine effect */}
              <div className="absolute inset-0 bg-gradient-to-br from-white/20 to-transparent rounded-xl opacity-0 group-hover:opacity-100 transition-opacity" />
            </div>
            
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-bold text-white">{asset.asset}</h3>
                {asset.locked > 0 && (
                  <div className="flex items-center gap-1 px-2 py-0.5 bg-yellow-500/20 rounded-full">
                    <Lock className="h-3 w-3 text-yellow-400" />
                    <span className="text-xs text-yellow-400 font-medium">Locked</span>
                  </div>
                )}
              </div>
              <p className="text-sm text-white/60">
                {formatNumber(asset.total, decimals)} {asset.asset}
              </p>
            </div>
          </div>

          {/* Value Display */}
          <div className="text-right">
            <div className="flex items-center gap-1.5 mb-1">
              <TrendingUp className="h-4 w-4 text-emerald-400 opacity-0 group-hover:opacity-100 transition-opacity" />
              <p className="text-lg font-bold text-white">
                {formatNumber(asset.free, decimals)}
              </p>
            </div>
            <p className="text-xs text-white/50 font-medium">Available</p>
          </div>
        </div>

        {/* Progress Bar */}
        {asset.total > 0 && (
          <div className="mt-3 space-y-1.5">
            <div className="flex items-center justify-between text-xs">
              <span className="text-white/60">Free</span>
              <span className="text-white/80 font-medium">{freePercentage.toFixed(1)}%</span>
            </div>
            <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
              <motion.div
                className="h-full bg-gradient-to-r from-emerald-500 to-teal-500 rounded-full"
                initial={{ width: 0 }}
                animate={{ width: `${freePercentage}%` }}
                transition={{ duration: 0.8, delay: index * 0.05 + 0.2 }}
              />
            </div>
            {asset.locked > 0 && (
              <div className="flex items-center justify-between text-xs mt-1">
                <span className="text-white/60">Locked: {formatNumber(asset.locked, decimals)}</span>
                <span className="text-white/60">Total: {formatNumber(asset.total, decimals)}</span>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Shine effect on hover */}
      <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none">
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />
      </div>
    </motion.div>
  );
};

