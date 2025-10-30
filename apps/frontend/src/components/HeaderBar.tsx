import React, { useState, useEffect } from 'react';
import { Search, ChevronDown, BarChart3 } from 'lucide-react';
import { useChartStore } from '@/store/chartStore';
import { fetchSymbols } from '@/lib/binance';
import { INTERVALS, INTERVAL_SHORT_LABELS } from '@/lib/timeframes';
import ConnectionPill from './ConnectionPill';
import { SymbolInfo } from '@/types/market';

const HeaderBar: React.FC = () => {
  const {
    filteredSymbols,
    showAllQuotes,
    symbol,
    interval,
    connectionState,
    setSymbols,
    setShowAllQuotes,
    setSymbol,
    setInterval,
  } = useChartStore();

  const [searchQuery, setSearchQuery] = useState('');
  const [isSymbolDropdownOpen, setIsSymbolDropdownOpen] = useState(false);
  const [isIntervalDropdownOpen, setIsIntervalDropdownOpen] = useState(false);

  // Load symbols on mount
  useEffect(() => {
    const loadSymbols = async () => {
      try {
        const symbolsData = await fetchSymbols();
        setSymbols(symbolsData);
      } catch (error) {
        console.error('Failed to load symbols:', error);
      }
    };

    loadSymbols();
  }, [setSymbols]);

  // Filter symbols based on search query
  const filteredSymbolsList = filteredSymbols.filter(s =>
    s.symbol.toLowerCase().includes(searchQuery.toLowerCase()) ||
    s.baseAsset.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleSymbolSelect = (selectedSymbol: string) => {
    setSymbol(selectedSymbol);
    setIsSymbolDropdownOpen(false);
    setSearchQuery('');
  };

  const handleIntervalSelect = (selectedInterval: string) => {
    setInterval(selectedInterval as any);
    setIsIntervalDropdownOpen(false);
  };

  const toggleShowAllQuotes = () => {
    setShowAllQuotes(!showAllQuotes);
  };

  return (
    <div className="bg-white border-b border-gray-200 px-4 py-3 shadow-sm">
      <div className="flex items-center justify-between">
        {/* Left: Logo and Title */}
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2">
            <BarChart3 className="h-6 w-6 text-blue-600" />
            <h1 className="text-lg font-semibold text-gray-900">Live Charts</h1>
          </div>
        </div>

        {/* Center: Symbol and Interval Selectors */}
        <div className="flex items-center space-x-4">
          {/* Symbol Selector */}
          <div className="relative">
            <button
              onClick={() => setIsSymbolDropdownOpen(!isSymbolDropdownOpen)}
              className="flex items-center space-x-2 px-3 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 min-w-[120px]"
            >
              <Search className="h-4 w-4 text-gray-400" />
              <span className="text-sm font-medium">{symbol}</span>
              <ChevronDown className="h-4 w-4 text-gray-400" />
            </button>

            {isSymbolDropdownOpen && (
              <div className="absolute top-full left-0 mt-1 w-80 bg-white border border-gray-200 rounded-lg shadow-lg z-50">
                <div className="p-3 border-b border-gray-200">
                  <input
                    type="text"
                    placeholder="Search symbols..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    autoFocus
                  />
                  <div className="mt-2 flex items-center">
                    <input
                      type="checkbox"
                      id="showAllQuotes"
                      checked={showAllQuotes}
                      onChange={toggleShowAllQuotes}
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                    />
                    <label htmlFor="showAllQuotes" className="ml-2 text-xs text-gray-600">
                      Show all quote assets
                    </label>
                  </div>
                </div>
                <div className="max-h-60 overflow-y-auto">
                  {filteredSymbolsList.map((symbolInfo: SymbolInfo) => (
                    <button
                      key={symbolInfo.symbol}
                      onClick={() => handleSymbolSelect(symbolInfo.symbol)}
                      className={`w-full px-3 py-2 text-left text-sm hover:bg-gray-50 ${
                        symbol === symbolInfo.symbol ? 'bg-blue-50 text-blue-700' : 'text-gray-700'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-medium">{symbolInfo.symbol}</span>
                        <span className="text-xs text-gray-500">
                          {symbolInfo.baseAsset}/{symbolInfo.quoteAsset}
                        </span>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Interval Selector */}
          <div className="relative">
            <button
              onClick={() => setIsIntervalDropdownOpen(!isIntervalDropdownOpen)}
              className="flex items-center space-x-2 px-3 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <span className="text-sm font-medium">{INTERVAL_SHORT_LABELS[interval]}</span>
              <ChevronDown className="h-4 w-4 text-gray-400" />
            </button>

            {isIntervalDropdownOpen && (
              <div className="absolute top-full left-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-50">
                <div className="py-1">
                  {INTERVALS.map((int) => (
                    <button
                      key={int}
                      onClick={() => handleIntervalSelect(int)}
                      className={`w-full px-3 py-2 text-left text-sm hover:bg-gray-50 ${
                        interval === int ? 'bg-blue-50 text-blue-700' : 'text-gray-700'
                      }`}
                    >
                      {INTERVAL_SHORT_LABELS[int]}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right: Connection Status */}
        <div className="flex items-center space-x-4">
          <ConnectionPill state={connectionState} />
        </div>
      </div>
    </div>
  );
};

export default HeaderBar;
