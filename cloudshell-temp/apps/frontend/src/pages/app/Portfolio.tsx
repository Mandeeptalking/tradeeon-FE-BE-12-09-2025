import { useState, useEffect } from 'react';
import { Search, Filter } from 'lucide-react';
import { usePortfolioOverview, useEquityCurve, useAllocation, useHoldings } from '../../lib/api/portfolio';
import DateRangePicker from '../../components/inputs/DateRangePicker';
import KpiStrip from '../../components/portfolio/KpiStrip';
import EquityArea from '../../components/portfolio/EquityArea';
import AllocationDonut from '../../components/portfolio/AllocationDonut';
import HoldingsTable from '../../components/portfolio/HoldingsTable';

const Portfolio = () => {
  const [selectedRange, setSelectedRange] = useState<'1D' | '1W' | '1M' | '3M' | 'YTD' | '1Y' | 'All' | 'Custom'>('1M');
  const [customRange, setCustomRange] = useState({ from: '', to: '' });
  const [selectedExchange, setSelectedExchange] = useState('ALL');
  const [searchTerm, setSearchTerm] = useState('');

  // Calculate date range
  const getDateRange = () => {
    const now = new Date();
    const to = now.toISOString().split('T')[0];
    
    switch (selectedRange) {
      case '1D':
        const yesterday = new Date(now);
        yesterday.setDate(yesterday.getDate() - 1);
        return { from: yesterday.toISOString().split('T')[0], to };
      case '1W':
        const weekAgo = new Date(now);
        weekAgo.setDate(weekAgo.getDate() - 7);
        return { from: weekAgo.toISOString().split('T')[0], to };
      case '1M':
        const monthAgo = new Date(now);
        monthAgo.setMonth(monthAgo.getMonth() - 1);
        return { from: monthAgo.toISOString().split('T')[0], to };
      case '3M':
        const threeMonthsAgo = new Date(now);
        threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);
        return { from: threeMonthsAgo.toISOString().split('T')[0], to };
      case 'YTD':
        const yearStart = new Date(now.getFullYear(), 0, 1);
        return { from: yearStart.toISOString().split('T')[0], to };
      case '1Y':
        const yearAgo = new Date(now);
        yearAgo.setFullYear(yearAgo.getFullYear() - 1);
        return { from: yearAgo.toISOString().split('T')[0], to };
      case 'Custom':
        return customRange.from && customRange.to ? customRange : { from: to, to };
      case 'All':
        const allTime = new Date('2020-01-01');
        return { from: allTime.toISOString().split('T')[0], to };
      default:
        return { from: to, to };
    }
  };

  const dateRange = getDateRange();
  const filters = {
    from: dateRange.from,
    to: dateRange.to,
    exchange: selectedExchange,
    as_of: dateRange.to,
  };

  // Fetch data
  const { data: overview, isLoading: overviewLoading } = usePortfolioOverview(filters);
  const { data: equityCurve, isLoading: equityLoading } = useEquityCurve(filters);
  const { data: allocation, isLoading: allocationLoading } = useAllocation(filters);
  const { data: holdings, isLoading: holdingsLoading } = useHoldings(filters);

  // Initialize custom range
  useEffect(() => {
    if (selectedRange === 'Custom' && !customRange.from) {
      const now = new Date();
      const monthAgo = new Date(now);
      monthAgo.setMonth(monthAgo.getMonth() - 1);
      setCustomRange({
        from: monthAgo.toISOString().split('T')[0],
        to: now.toISOString().split('T')[0],
      });
    }
  }, [selectedRange, customRange.from]);

  const handleCustomRangeChange = (from: string, to: string) => {
    setCustomRange({ from, to });
  };

  const handleExportCSV = () => {
    if (!holdings) return;
    
    const csvContent = [
      ['Symbol', 'Exchange', 'Quantity', 'Average Price', 'Last Price', 'Day P&L', 'Total P&L', 'Weight %'].join(','),
      ...holdings.map(holding => [
        holding.symbol,
        holding.exchange,
        holding.qty.toFixed(4),
        holding.avg.toFixed(2),
        holding.ltp.toFixed(2),
        holding.pnl_day.toFixed(2),
        holding.pnl_total.toFixed(2),
        (holding.weight * 100).toFixed(1)
      ].join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `portfolio-${dateRange.from}-to-${dateRange.to}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const rangeOptions = ['1D', '1W', '1M', '3M', 'YTD', '1Y', 'All', 'Custom'];
  const exchangeOptions = [
    { value: 'ALL', label: 'All Exchanges' },
    { value: 'BINANCE', label: 'Binance' },
    { value: 'COINBASE', label: 'Coinbase Pro' },
    { value: 'KRAKEN', label: 'Kraken' },
    { value: 'ZERODHA', label: 'Zerodha' },
  ];

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Portfolio</h1>
          <p className="text-gray-600">
            Your holdings, performance, and allocation. Clean and focused.
          </p>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 mb-6">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between space-y-4 lg:space-y-0 lg:space-x-6">
            {/* Range Filters */}
            <div className="flex items-center space-x-2">
              <span className="text-sm font-medium text-gray-700">Range:</span>
              <div className="flex space-x-1 bg-gray-100 rounded-lg p-1">
                {rangeOptions.map((range) => (
                  <button
                    key={range}
                    onClick={() => setSelectedRange(range as any)}
                    className={`px-3 py-1 text-sm font-medium rounded-md transition-colors ${
                      selectedRange === range
                        ? 'bg-white text-gray-900 shadow-sm'
                        : 'text-gray-600 hover:text-gray-900'
                    }`}
                  >
                    {range}
                  </button>
                ))}
              </div>
              {selectedRange === 'Custom' && (
                <DateRangePicker
                  from={customRange.from}
                  to={customRange.to}
                  onChange={handleCustomRangeChange}
                />
              )}
            </div>

            {/* Exchange Filter */}
            <div className="flex items-center space-x-2">
              <Filter className="h-4 w-4 text-gray-500" />
              <select
                value={selectedExchange}
                onChange={(e) => setSelectedExchange(e.target.value)}
                className="px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {exchangeOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Search */}
            <div className="flex items-center space-x-2">
              <Search className="h-4 w-4 text-gray-500" />
              <input
                type="text"
                placeholder="Search symbols..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 w-64"
              />
            </div>
          </div>
        </div>

        {/* KPI Strip */}
        {overview && (
          <KpiStrip
            equity={overview.equity}
            pnlDay={overview.pnl_day}
            pnlTotal={overview.pnl_total}
            winRate={overview.win_rate}
            isLoading={overviewLoading}
          />
        )}

        {/* Charts Row */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          <EquityArea
            data={equityCurve || []}
            isLoading={equityLoading}
          />
          <AllocationDonut
            data={allocation || []}
            isLoading={allocationLoading}
          />
        </div>

        {/* Holdings Table */}
        <HoldingsTable
          data={holdings || []}
          isLoading={holdingsLoading}
          onExport={handleExportCSV}
        />
      </div>
    </div>
  );
};

export default Portfolio;


