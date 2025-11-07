import { useState } from 'react';
import { Download, Search, Eye, MoreHorizontal } from 'lucide-react';
import { Holding } from '../../lib/api/portfolio';

interface HoldingsTableProps {
  data: Holding[];
  isLoading?: boolean;
  onExport?: () => void;
}

const HoldingsTable = ({ data, isLoading, onExport }: HoldingsTableProps) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [density, setDensity] = useState<'compact' | 'comfortable'>('comfortable');

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(value);
  };

  const formatPercent = (value: number) => {
    return `${(value * 100).toFixed(1)}%`;
  };

  const getPnlColor = (value: number) => {
    if (value > 0) return 'text-green-600';
    if (value < 0) return 'text-red-600';
    return 'text-gray-600';
  };

  const getSparklineColor = (data: number[]) => {
    if (data.length < 2) return '#6B7280';
    const first = data[0];
    const last = data[data.length - 1];
    return last > first ? '#10B981' : '#EF4444';
  };

  const filteredData = data.filter(holding =>
    holding.symbol.toLowerCase().includes(searchTerm.toLowerCase()) ||
    holding.exchange.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const Sparkline = ({ data }: { data: number[] }) => {
    if (!data || data.length === 0) return <div className="h-8 w-20" />;
    
    const color = getSparklineColor(data);
    const max = Math.max(...data);
    const min = Math.min(...data);
    const range = max - min || 1;
    const width = 80;
    const height = 32;
    
    const points = data.map((value, index) => {
      const x = (index / (data.length - 1 || 1)) * width;
      const y = height - ((value - min) / range) * height;
      return `${x},${y}`;
    }).join(' ');
    
    return (
      <div className="h-8 w-20">
        <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} className="overflow-visible">
          <polyline
            fill="none"
            stroke={color}
            strokeWidth="1.5"
            points={points}
          />
        </svg>
      </div>
    );
  };

  if (isLoading) {
    return (
      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900">Holdings</h3>
        </div>
        <div className="space-y-3">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="animate-pulse">
              <div className="h-12 bg-gray-200 rounded"></div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900">Holdings</h3>
        <button
          onClick={onExport}
          className="flex items-center space-x-2 px-3 py-2 text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
          title="Download current table as CSV"
        >
          <Download className="h-4 w-4" />
          <span>Export CSV</span>
        </button>
      </div>

      {/* Table Controls */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search symbols..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 pr-4 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 w-64"
            />
          </div>
        </div>
        
        <div className="flex items-center space-x-2">
          <span className="text-sm text-gray-600">Density:</span>
          <div className="flex space-x-1 bg-gray-100 rounded-lg p-1">
            <button
              onClick={() => setDensity('compact')}
              className={`px-2 py-1 text-xs font-medium rounded transition-colors ${
                density === 'compact'
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Compact
            </button>
            <button
              onClick={() => setDensity('comfortable')}
              className={`px-2 py-1 text-xs font-medium rounded transition-colors ${
                density === 'comfortable'
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Comfortable
            </button>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-gray-200">
              <th className="text-left py-3 px-4 text-sm font-medium text-gray-600">Symbol</th>
              <th className="text-left py-3 px-4 text-sm font-medium text-gray-600">Qty</th>
              <th className="text-left py-3 px-4 text-sm font-medium text-gray-600">Avg</th>
              <th className="text-left py-3 px-4 text-sm font-medium text-gray-600">LTP</th>
              <th className="text-left py-3 px-4 text-sm font-medium text-gray-600">Day P&L</th>
              <th className="text-left py-3 px-4 text-sm font-medium text-gray-600">Total P&L</th>
              <th className="text-left py-3 px-4 text-sm font-medium text-gray-600">Weight</th>
              <th className="text-left py-3 px-4 text-sm font-medium text-gray-600">7D</th>
              <th className="text-left py-3 px-4 text-sm font-medium text-gray-600">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredData.length === 0 ? (
              <tr>
                <td colSpan={9} className="text-center py-12 text-gray-500">
                  No positions in this range.
                </td>
              </tr>
            ) : (
              filteredData.map((holding) => (
                <tr
                  key={`${holding.symbol}-${holding.exchange}`}
                  className={`border-b border-gray-100 hover:bg-gray-50 ${
                    density === 'compact' ? 'py-2' : 'py-3'
                  }`}
                >
                  <td className="px-4">
                    <div>
                      <div className="font-medium text-gray-900">{holding.symbol}</div>
                      <div className="text-sm text-gray-500">{holding.exchange}</div>
                    </div>
                  </td>
                  <td className="px-4 text-sm text-gray-900">
                    {holding.qty.toFixed(4)}
                  </td>
                  <td className="px-4 text-sm text-gray-900">
                    {formatCurrency(holding.avg)}
                  </td>
                  <td className="px-4 text-sm text-gray-900">
                    {formatCurrency(holding.ltp)}
                  </td>
                  <td className={`px-4 text-sm font-medium ${getPnlColor(holding.pnl_day)}`}>
                    {formatCurrency(holding.pnl_day)}
                  </td>
                  <td className={`px-4 text-sm font-medium ${getPnlColor(holding.pnl_total)}`}>
                    {formatCurrency(holding.pnl_total)}
                  </td>
                  <td className="px-4 text-sm text-gray-900">
                    {formatPercent(holding.weight)}
                  </td>
                  <td className="px-4">
                    <Sparkline data={holding.spark} />
                  </td>
                  <td className="px-4">
                    <div className="flex items-center space-x-2">
                      <button
                        className="p-1 text-gray-400 hover:text-gray-600 transition-colors"
                        title="View details"
                      >
                        <Eye className="h-4 w-4" />
                      </button>
                      <button
                        className="p-1 text-gray-400 hover:text-gray-600 transition-colors"
                        title="More actions"
                      >
                        <MoreHorizontal className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default HoldingsTable;
