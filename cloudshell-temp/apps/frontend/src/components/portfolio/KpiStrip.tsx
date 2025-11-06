import { TrendingUp, TrendingDown, DollarSign, Target, Percent } from 'lucide-react';

interface KpiStripProps {
  equity: number;
  pnlDay: number;
  pnlTotal: number;
  winRate?: number;
  isLoading?: boolean;
}

const KpiStrip = ({ equity, pnlDay, pnlTotal, winRate, isLoading }: KpiStripProps) => {
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };


  const getPnlColor = (value: number) => {
    if (value > 0) return 'text-green-600';
    if (value < 0) return 'text-red-600';
    return 'text-gray-600';
  };

  const getPnlIcon = (value: number) => {
    if (value > 0) return <TrendingUp className="h-3 w-3" />;
    if (value < 0) return <TrendingDown className="h-3 w-3" />;
    return null;
  };

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
            <div className="animate-pulse">
              <div className="h-4 bg-gray-200 rounded w-1/3 mb-2"></div>
              <div className="h-8 bg-gray-200 rounded w-2/3"></div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
      {/* Equity */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center space-x-2">
            <DollarSign className="h-4 w-4 text-gray-500" />
            <span className="text-sm font-medium text-gray-600">Equity</span>
          </div>
        </div>
        <div className="text-2xl font-bold text-gray-900">
          {formatCurrency(equity)}
        </div>
      </div>

      {/* Day P&L */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center space-x-2">
            <TrendingUp className="h-4 w-4 text-gray-500" />
            <span className="text-sm font-medium text-gray-600">Day P&L</span>
          </div>
        </div>
        <div className={`text-2xl font-bold flex items-center space-x-1 ${getPnlColor(pnlDay)}`}>
          {getPnlIcon(pnlDay)}
          <span>{formatCurrency(pnlDay)}</span>
        </div>
      </div>

      {/* Total P&L */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center space-x-2">
            <TrendingDown className="h-4 w-4 text-gray-500" />
            <span className="text-sm font-medium text-gray-600">Total P&L</span>
          </div>
        </div>
        <div className={`text-2xl font-bold flex items-center space-x-1 ${getPnlColor(pnlTotal)}`}>
          {getPnlIcon(pnlTotal)}
          <span>{formatCurrency(pnlTotal)}</span>
        </div>
      </div>

      {/* Win Rate */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center space-x-2">
            <Target className="h-4 w-4 text-gray-500" />
            <span className="text-sm font-medium text-gray-600">Win Rate</span>
          </div>
        </div>
        <div className="text-2xl font-bold text-gray-900 flex items-center space-x-1">
          <Percent className="h-5 w-5" />
          <span>{winRate ? `${(winRate * 100).toFixed(1)}%` : 'N/A'}</span>
        </div>
      </div>
    </div>
  );
};

export default KpiStrip;
