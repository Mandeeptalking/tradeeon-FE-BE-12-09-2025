import React, { useState, useEffect, useRef } from 'react';

interface TradingConfigurationProps {
  selectedPairs?: string[];
  selectedExchanges?: string[];
  selectedMarkets?: string[];
  selectedPositionTypes?: string[];
  capital?: number;
  tradeAmount?: number;
  onPairsChange?: (pairs: string[]) => void;
  onExchangesChange?: (exchanges: string[]) => void;
  onMarketsChange?: (markets: string[]) => void;
  onPositionTypesChange?: (positionTypes: string[]) => void;
  onCapitalChange?: (capital: number) => void;
  onTradeAmountChange?: (amount: number) => void;
}

// Exchange-specific trading pairs
const EXCHANGE_PAIRS: { [key: string]: string[] } = {
  'Binance': [
    'BTCUSDT', 'ETHUSDT', 'ADAUSDT', 'SOLUSDT', 'XRPUSDT',
    'DOGEUSDT', 'MATICUSDT', 'DOTUSDT', 'AVAXUSDT', 'LINKUSDT',
    'BNBUSDT', 'LTCUSDT', 'UNIUSDT', 'ATOMUSDT', 'NEARUSDT',
    'FTMUSDT', 'ALGOUSDT', 'VETUSDT', 'ICPUSDT', 'FILUSDT'
  ],
  'Coinbase': [
    'BTCUSD', 'ETHUSD', 'ADAUSD', 'SOLUSD', 'XRPUSD',
    'DOGEUSD', 'MATICUSD', 'DOTUSD', 'AVAXUSD', 'LINKUSD',
    'LTCUSD', 'UNIUSD', 'ATOMUSD', 'NEARUSD', 'FTMUSD'
  ],
  'Kraken': [
    'XXBTZUSD', 'XETHZUSD', 'ADAUSD', 'SOLUSD', 'XXRPZUSD',
    'DOGEUSD', 'MATICUSD', 'DOTUSD', 'AVAXUSD', 'LINKUSD',
    'XLTCZUSD', 'UNIUSD', 'ATOMUSD', 'NEARUSD', 'FTMUSD'
  ],
  'KuCoin': [
    'BTCUSDT', 'ETHUSDT', 'ADAUSDT', 'SOLUSDT', 'XRPUSDT',
    'DOGEUSDT', 'MATICUSDT', 'DOTUSDT', 'AVAXUSDT', 'LINKUSDT',
    'BNBUSDT', 'LTCUSDT', 'UNIUSDT', 'ATOMUSDT', 'NEARUSDT'
  ],
  'Bybit': [
    'BTCUSDT', 'ETHUSDT', 'ADAUSDT', 'SOLUSDT', 'XRPUSDT',
    'DOGEUSDT', 'MATICUSDT', 'DOTUSDT', 'AVAXUSDT', 'LINKUSDT',
    'BNBUSDT', 'LTCUSDT', 'UNIUSDT', 'ATOMUSDT', 'NEARUSDT'
  ]
};

const AVAILABLE_EXCHANGES = [
  'Binance', 'Coinbase', 'Kraken', 'KuCoin', 'Bybit'
];

const AVAILABLE_MARKETS = [
  'Spot', 'Futures'
];

const AVAILABLE_POSITION_TYPES = [
  'Long', 'Short'
];

export default function TradingConfiguration({
  selectedPairs = ['BTCUSDT'],
  selectedExchanges = ['Binance'],
  selectedMarkets = ['Spot'],
  selectedPositionTypes = ['Long'],
  capital = 10000,
  tradeAmount = 100,
  onPairsChange,
  onExchangesChange,
  onMarketsChange,
  onPositionTypesChange,
  onCapitalChange,
  onTradeAmountChange
}: TradingConfigurationProps) {
  const [pairs, setPairs] = useState<string[]>(selectedPairs);
  const [exchanges, setExchanges] = useState<string[]>(selectedExchanges);
  const [markets, setMarkets] = useState<string[]>(selectedMarkets);
  const [positionTypes, setPositionTypes] = useState<string[]>(selectedPositionTypes);
  const [capitalValue, setCapitalValue] = useState(capital);
  const [tradeAmountValue, setTradeAmountValue] = useState(tradeAmount);
  const [showPairDropdown, setShowPairDropdown] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowPairDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Get available pairs for selected exchanges
  const getAvailablePairs = () => {
    const allPairs = new Set<string>();
    exchanges.forEach(exchange => {
      EXCHANGE_PAIRS[exchange]?.forEach(pair => allPairs.add(pair));
    });
    return Array.from(allPairs).sort();
  };

  const availablePairs = getAvailablePairs();

  const handlePairToggle = (pair: string) => {
    const newPairs = pairs.includes(pair)
      ? pairs.filter(p => p !== pair)
      : [...pairs, pair];
    setPairs(newPairs);
    onPairsChange?.(newPairs);
  };

  const handleExchangeToggle = (exchange: string) => {
    const newExchanges = exchanges.includes(exchange)
      ? exchanges.filter(e => e !== exchange)
      : [...exchanges, exchange];
    setExchanges(newExchanges);
    onExchangesChange?.(newExchanges);
    
    // Filter pairs to only include those available in selected exchanges
    const newAvailablePairs = new Set<string>();
    newExchanges.forEach(ex => {
      EXCHANGE_PAIRS[ex]?.forEach(pair => newAvailablePairs.add(pair));
    });
    
    const filteredPairs = pairs.filter(pair => newAvailablePairs.has(pair));
    if (filteredPairs.length !== pairs.length) {
      setPairs(filteredPairs);
      onPairsChange?.(filteredPairs);
    }
  };

  const handleMarketToggle = (market: string) => {
    const newMarkets = markets.includes(market)
      ? markets.filter(m => m !== market)
      : [...markets, market];
    setMarkets(newMarkets);
    onMarketsChange?.(newMarkets);
  };

  const handlePositionTypeToggle = (positionType: string) => {
    const newPositionTypes = positionTypes.includes(positionType)
      ? positionTypes.filter(p => p !== positionType)
      : [...positionTypes, positionType];
    setPositionTypes(newPositionTypes);
    onPositionTypesChange?.(newPositionTypes);
  };

  const handleCapitalChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseFloat(e.target.value) || 0;
    setCapitalValue(value);
    onCapitalChange?.(value);
  };

  const handleTradeAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseFloat(e.target.value) || 0;
    setTradeAmountValue(value);
    onTradeAmountChange?.(value);
  };

  return (
    <div className="bg-white border-b border-gray-200 p-4">
      <div className="container mx-auto">
        {/* Section Header */}
        <div className="mb-4">
          <h2 className="text-lg font-semibold text-gray-900">Trading Configuration</h2>
          <p className="text-sm text-gray-600 mt-1">Configure your trading parameters for strategy execution</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-6 gap-4">
          
          {/* Exchange Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Exchanges
            </label>
            <div className="flex flex-wrap gap-1">
              {AVAILABLE_EXCHANGES.map(exchange => (
                <button
                  key={exchange}
                  onClick={() => handleExchangeToggle(exchange)}
                  className={`px-2 py-1 text-xs rounded-md border transition-colors ${
                    exchanges.includes(exchange)
                      ? 'bg-green-100 border-green-300 text-green-700'
                      : 'bg-gray-50 border-gray-300 text-gray-600 hover:bg-gray-100'
                  }`}
                >
                  {exchange}
                </button>
              ))}
            </div>
            <div className="mt-1 text-xs text-gray-500">
              {exchanges.length} exchange{exchanges.length !== 1 ? 's' : ''} selected
            </div>
          </div>

          {/* Trading Pairs Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Trading Pairs
            </label>
            <div className="relative" ref={dropdownRef}>
              <button
                onClick={() => setShowPairDropdown(!showPairDropdown)}
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md bg-white text-left focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 flex items-center justify-between"
              >
                <span>
                  {pairs.length === 0 ? 'Select pairs...' : 
                   pairs.length === 1 ? pairs[0] : 
                   `${pairs.length} pairs selected`}
                </span>
                <svg className={`w-4 h-4 transition-transform ${showPairDropdown ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>
              
              {showPairDropdown && (
                <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-48 overflow-y-auto">
                  {availablePairs.map(pair => (
                    <label key={pair} className="flex items-center px-3 py-2 hover:bg-gray-50 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={pairs.includes(pair)}
                        onChange={() => handlePairToggle(pair)}
                        className="mr-2 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      />
                      <span className="text-sm">{pair}</span>
                    </label>
                  ))}
                  {availablePairs.length === 0 && (
                    <div className="px-3 py-2 text-sm text-gray-500">
                      No pairs available for selected exchanges
                    </div>
                  )}
                </div>
              )}
            </div>
            <div className="mt-1 text-xs text-gray-500">
              {pairs.length} pair{pairs.length !== 1 ? 's' : ''} selected
              {exchanges.length > 0 && (
                <span> • Available in {exchanges.length} exchange{exchanges.length !== 1 ? 's' : ''}</span>
              )}
            </div>
          </div>

          {/* Capital Amount */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Total Capital
            </label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500 text-sm">$</span>
              <input
                type="number"
                value={capitalValue}
                onChange={handleCapitalChange}
                className="w-full pl-8 pr-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="10000"
              />
            </div>
            <div className="mt-1 text-xs text-gray-500">
              Available capital for trading
            </div>
          </div>

          {/* Trade Amount */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Trade Amount
            </label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500 text-sm">$</span>
              <input
                type="number"
                value={tradeAmountValue}
                onChange={handleTradeAmountChange}
                className="w-full pl-8 pr-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="100"
              />
            </div>
            <div className="mt-1 text-xs text-gray-500">
              Amount per trade
            </div>
          </div>

          {/* Markets Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Markets
            </label>
            <div className="flex flex-wrap gap-1">
              {AVAILABLE_MARKETS.map(market => (
                <button
                  key={market}
                  onClick={() => handleMarketToggle(market)}
                  className={`px-2 py-1 text-xs rounded-md border transition-colors ${
                    markets.includes(market)
                      ? 'bg-blue-100 border-blue-300 text-blue-700'
                      : 'bg-gray-50 border-gray-300 text-gray-600 hover:bg-gray-100'
                  }`}
                >
                  {market}
                </button>
              ))}
            </div>
            <div className="mt-1 text-xs text-gray-500">
              {markets.length} market{markets.length !== 1 ? 's' : ''} selected
            </div>
          </div>

          {/* Position Types (only show if Futures is selected) */}
          {markets.includes('Futures') && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Position Types
              </label>
              <div className="flex flex-wrap gap-1">
                {AVAILABLE_POSITION_TYPES.map(positionType => (
                  <button
                    key={positionType}
                    onClick={() => handlePositionTypeToggle(positionType)}
                    className={`px-2 py-1 text-xs rounded-md border transition-colors ${
                      positionTypes.includes(positionType)
                        ? positionType === 'Long' 
                          ? 'bg-green-100 border-green-300 text-green-700'
                          : 'bg-red-100 border-red-300 text-red-700'
                        : 'bg-gray-50 border-gray-300 text-gray-600 hover:bg-gray-100'
                    }`}
                  >
                    {positionType}
                  </button>
                ))}
              </div>
              <div className="mt-1 text-xs text-gray-500">
                {positionTypes.length} position type{positionTypes.length !== 1 ? 's' : ''} selected
              </div>
            </div>
          )}
        </div>

        {/* Summary Row */}
        <div className="mt-4 pt-4 border-t border-gray-100">
          <div className="flex items-center justify-between text-sm text-gray-600">
            <div className="flex items-center gap-4">
              <span>
                <strong>{pairs.length}</strong> pair{pairs.length !== 1 ? 's' : ''}: {pairs.slice(0, 3).join(', ')}{pairs.length > 3 && '...'}
              </span>
              <span>•</span>
              <span>
                <strong>{exchanges.length}</strong> exchange{exchanges.length !== 1 ? 's' : ''}: {exchanges.join(', ')}
              </span>
              <span>•</span>
              <span>
                <strong>{markets.length}</strong> market{markets.length !== 1 ? 's' : ''}: {markets.join(', ')}
              </span>
              {markets.includes('Futures') && positionTypes.length > 0 && (
                <>
                  <span>•</span>
                  <span>
                    <strong>{positionTypes.length}</strong> position{positionTypes.length !== 1 ? 's' : ''}: {positionTypes.join(', ')}
                  </span>
                </>
              )}
            </div>
            <div className="flex items-center gap-4">
              <span>
                Capital: <strong>${capitalValue.toLocaleString()}</strong>
              </span>
              <span>•</span>
              <span>
                Trade Size: <strong>${tradeAmountValue}</strong>
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
