import { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '../ui/dialog';
import { AssetCard } from './AssetCard';
import { Search, X } from 'lucide-react';

interface Asset {
  asset: string;
  free: number;
  locked: number;
  total: number;
}

interface AssetSummaryModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  assets: Asset[];
  formatNumber: (value: number, decimals?: number) => string;
  formatCurrency: (value: number) => string;
}

/**
 * Simple SVG Pie Chart Component
 */
const PieChart = ({ data, size = 200 }: { data: Array<{ label: string; value: number; color: string }>; size?: number }) => {
  const total = data.reduce((sum, item) => sum + item.value, 0);
  const radius = size / 2 - 10;
  const center = size / 2;
  
  let currentAngle = -90; // Start from top
  
  const paths = data.map((item, index) => {
    const percentage = item.value / total;
    const angle = percentage * 360;
    const startAngle = currentAngle;
    const endAngle = currentAngle + angle;
    
    const x1 = center + radius * Math.cos((startAngle * Math.PI) / 180);
    const y1 = center + radius * Math.sin((startAngle * Math.PI) / 180);
    const x2 = center + radius * Math.cos((endAngle * Math.PI) / 180);
    const y2 = center + radius * Math.sin((endAngle * Math.PI) / 180);
    
    const largeArcFlag = angle > 180 ? 1 : 0;
    
    const pathData = [
      `M ${center} ${center}`,
      `L ${x1} ${y1}`,
      `A ${radius} ${radius} 0 ${largeArcFlag} 1 ${x2} ${y2}`,
      'Z'
    ].join(' ');
    
    currentAngle += angle;
    
    return (
      <motion.path
        key={index}
        d={pathData}
        fill={item.color}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: index * 0.1 }}
        className="hover:opacity-80 transition-opacity cursor-pointer"
      />
    );
  });
  
  return (
    <svg width={size} height={size} className="drop-shadow-lg">
      {paths}
      {/* Center circle for donut effect */}
      <circle cx={center} cy={center} r={radius * 0.4} fill="rgba(17, 24, 39, 0.8)" />
      <text
        x={center}
        y={center - 5}
        textAnchor="middle"
        className="text-white text-sm font-semibold fill-white"
      >
        {data.length}
      </text>
      <text
        x={center}
        y={center + 10}
        textAnchor="middle"
        className="text-white/60 text-xs fill-white/60"
      >
        Assets
      </text>
    </svg>
  );
};

/**
 * Asset Summary Modal with Pie Chart
 */
export const AssetSummaryModal = ({
  open,
  onOpenChange,
  assets,
  formatNumber,
  formatCurrency,
}: AssetSummaryModalProps) => {
  const [searchQuery, setSearchQuery] = useState('');

  // Generate colors for pie chart
  const colors = [
    '#3b82f6', // blue
    '#8b5cf6', // purple
    '#10b981', // emerald
    '#f59e0b', // amber
    '#ef4444', // red
    '#06b6d4', // cyan
    '#ec4899', // pink
    '#84cc16', // lime
    '#f97316', // orange
    '#6366f1', // indigo
  ];

  // Prepare data for pie chart (top 10 assets by total value)
  const chartData = useMemo(() => {
    const sortedAssets = [...assets]
      .sort((a, b) => b.total - a.total)
      .slice(0, 10);
    
    return sortedAssets.map((asset, index) => ({
      label: asset.asset,
      value: asset.total,
      color: colors[index % colors.length],
    }));
  }, [assets]);

  // Filter assets based on search
  const filteredAssets = useMemo(() => {
    if (!searchQuery) return assets;
    return assets.filter((asset) =>
      asset.asset.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [assets, searchQuery]);

  // Calculate total portfolio value (if we had USD prices, we'd use those)
  const totalValue = useMemo(() => {
    return assets.reduce((sum, asset) => sum + asset.total, 0);
  }, [assets]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden bg-gray-900 border-gray-700 text-white">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold text-white flex items-center gap-2">
            <span>Asset Portfolio</span>
            <span className="text-lg text-white/60 font-normal">
              ({assets.length} {assets.length === 1 ? 'asset' : 'assets'})
            </span>
          </DialogTitle>
        </DialogHeader>

        <div className="flex flex-col lg:flex-row gap-6 overflow-hidden">
          {/* Left Side - Pie Chart */}
          <div className="flex-shrink-0 lg:w-1/3 flex flex-col items-center justify-center p-6 bg-white/5 rounded-xl border border-white/10">
            <h3 className="text-lg font-semibold text-white mb-4">Asset Distribution</h3>
            <PieChart data={chartData} size={220} />
            
            {/* Legend */}
            <div className="mt-6 w-full space-y-2 max-h-48 overflow-y-auto custom-scrollbar">
              {chartData.map((item, index) => (
                <div key={index} className="flex items-center gap-2 text-sm">
                  <div
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: item.color }}
                  />
                  <span className="text-white/80 flex-1">{item.label}</span>
                  <span className="text-white/60">
                    {((item.value / totalValue) * 100).toFixed(1)}%
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Right Side - Asset List */}
          <div className="flex-1 flex flex-col overflow-hidden">
            {/* Search Bar */}
            <div className="relative mb-4">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-white/40" />
              <input
                type="text"
                placeholder="Search assets..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 bg-white/5 border border-white/10 rounded-lg text-white placeholder-white/40 text-sm focus:outline-none focus:border-white/20 focus:bg-white/10 transition-all"
              />
            </div>

            {/* Asset List */}
            <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar space-y-3">
              {filteredAssets.length === 0 ? (
                <div className="text-center py-12">
                  <p className="text-white/60">No assets match your search</p>
                </div>
              ) : (
                filteredAssets.map((asset, index) => (
                  <AssetCard
                    key={asset.asset}
                    asset={asset}
                    formatNumber={formatNumber}
                    formatCurrency={formatCurrency}
                    index={index}
                  />
                ))
              )}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

