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
      whileHover={{ scale: 1.02, transition: { duration: 0.2 } }}
      className="group relative overflow-hidden bg-white/5 backdrop-blur-sm border border-white/10 rounded-lg p-2.5 hover:border-white/20 transition-all duration-300"
    >
      {/* Gradient background on hover */}
      <div className={`absolute inset-0 bg-gradient-to-br ${gradientColors} opacity-0 group-hover:opacity-100 transition-opacity duration-300`} />
      
      <div className="relative z-10">
        <div className="flex items-center justify-between mb-2">
          {/* Asset Info */}
          <div className="flex items-center gap-2 flex-1 min-w-0">
            {/* Asset Icon */}
            <div className={`relative w-7 h-7 rounded-lg bg-gradient-to-br ${gradientColors} flex items-center justify-center flex-shrink-0`}>
              <span className="text-sm font-bold text-white">{asset.asset[0]}</span>
            </div>
            
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1">
                <h3 className="text-sm font-semibold text-white truncate">{asset.asset}</h3>
                {asset.locked > 0 && (
                  <Lock className="h-2.5 w-2.5 text-yellow-400 flex-shrink-0" />
                )}
              </div>
              <p className="text-xs text-white/60 truncate">
                {formatNumber(asset.total, asset.asset === 'USDT' ? 2 : 4)}
              </p>
            </div>
          </div>
        </div>

        {/* Progress Bar */}
        {asset.total > 0 && (
          <div className="mt-1.5">
            <div className="h-1 bg-white/10 rounded-full overflow-hidden">
              <motion.div
                className="h-full bg-gradient-to-r from-emerald-500 to-teal-500 rounded-full"
                initial={{ width: 0 }}
                animate={{ width: `${freePercentage}%` }}
                transition={{ duration: 0.8, delay: index * 0.05 + 0.2 }}
              />
            </div>
          </div>
        )}
      </div>
    </motion.div>
  );
};

