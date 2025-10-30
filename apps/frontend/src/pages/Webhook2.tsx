import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { toast } from 'sonner';
import { DollarSign, TrendingUp, RefreshCw, Target, Settings, BarChart3, TrendingDown, Shield, AlertTriangle, Clock, Calendar, AlertCircle } from 'lucide-react';

const AVAILABLE_EXCHANGES = ['Binance', 'Coinbase', 'Kraken'];

// Exchange pair fetching functions
const fetchBinancePairs = async (): Promise<string[]> => {
  try {
    const response = await fetch('https://api.binance.com/api/v3/exchangeInfo');
    const data = await response.json();
    return data.symbols
      .filter((s: any) => s.status === 'TRADING')
      .map((s: any) => s.symbol);
  } catch (error) {
    console.error('Failed to fetch Binance pairs:', error);
    return ['BTCUSDT', 'ETHUSDT', 'BNBUSDT']; // Fallback
  }
};

const AVAILABLE_PAIRS: { [key: string]: () => Promise<string[]> } = {
  'Binance': fetchBinancePairs,
  'Coinbase': async () => ['BTCUSD', 'ETHUSD', 'ADAUSD', 'SOLUSD', 'XRPUSD'],
  'Kraken': async () => ['XXBTZUSD', 'XETHZUSD', 'ADAUSD', 'SOLUSD', 'XXRPZUSD'],
};

export default function Webhook2() {
  const [pairs, setPairs] = useState<string[]>(['BTCUSDT']);
  const [exchanges, setExchanges] = useState<string[]>(['Binance']);
  const [markets, setMarkets] = useState<string[]>(['Spot']);
  const [positionTypes, setPositionTypes] = useState<string[]>(['Long']);
  const [capital, setCapital] = useState(10000);
  const [tradeAmount, setTradeAmount] = useState(100);
  const [searchQuery, setSearchQuery] = useState('');
  const [showSearchResults, setShowSearchResults] = useState(false);
  const [availablePairs, setAvailablePairs] = useState<string[]>([]);
  const [loadingPairs, setLoadingPairs] = useState(false);
  const [selectedQuoteCurrency, setSelectedQuoteCurrency] = useState<string | null>(null);
  const [strategyId, setStrategyId] = useState<string | null>(null);
  const [sharedSecret, setSharedSecret] = useState<string>('');
  const [secretVisible, setSecretVisible] = useState(false);
  
  // Capital Management state
  const [isEditingCapital, setIsEditingCapital] = useState(false);
  const [capitalSettings, setCapitalSettings] = useState({
    startingCapital: capital,
    stepSizePercentage: 10,
    reinvestMode: 100,
    deployCapital: 'Fixed: $100',
    dcaEnabled: true
  });

  // Order and DCA Management state
  const [isEditingOrderDCA, setIsEditingOrderDCA] = useState(false);
  const [orderDCASettings, setOrderDCASettings] = useState({
    orderType: 'AMO Order',
    takeProfitPercent: 6.28,
    dcaConditions: 'From Last Entry',
    dcaPercentage: 5,
    tradingIndex: 'Nifty 50 Stocks',
    dcaAmountType: 'ratio',
    dcaFixedAmount: 10000,
    dcaMultiplier: 1.0,
    dcaOrdersCount: 10,
    dcaPerPosition: 10
  });

  // Risk Management state
  const [isEditingRisk, setIsEditingRisk] = useState(false);
  const [riskSettings, setRiskSettings] = useState({
    stopLossPercent: 50,
    stopLossEnabled: false,
    recoveryDrip: true,
    timeBasedExit: true,
    maxDrawdownStop: true,
    rangeExit: false,
    recoveryDripDays: 30,
    recoveryDripMonths: 15,
    timeBasedExitDays: 0,
    timeBasedExitMonths: 12,
    maxDrawdownPercent: 50,
    rangeExitMonths: 6,
    rangeLowerPercent: -10,
    rangeUpperPercent: 10,
    riskFeaturePriorities: {
      recoveryDrip: 1,
      timeBasedExit: 2,
      maxDrawdownStop: 3,
      rangeExit: 4
    }
  });

  // Trade Management state
  const [isEditingTrade, setIsEditingTrade] = useState(false);
  const [tradeSettings, setTradeSettings] = useState({
    maxNewPositionsPerDay: 1,
    maxDcaExecutionsPerDay: 1,
    dcaNewEntrySameDay: false,
    maxDcaPerStockPerWeek: 1,
    reEntryCooldownDays: 30,
    reEntryCooldownEnabled: false,
    maxOpenPositions: 50,
    dcaPriorityLogic: {
      highestDrawdown: true,
      longestTimeSinceLastDca: false,
      oldestPosition: false
    }
  });

  // Load pairs when exchanges change
  useEffect(() => {
    const loadPairs = async () => {
      if (exchanges.length === 0) {
        setAvailablePairs([]);
        return;
      }

      setLoadingPairs(true);
      try {
        const allPairsSet = new Set<string>();
        
        // Fetch pairs for each selected exchange
        await Promise.all(
          exchanges.map(async (exchange) => {
            const fetchFunction = AVAILABLE_PAIRS[exchange];
            if (fetchFunction) {
              const pairs = await fetchFunction();
              pairs.forEach((pair: string) => allPairsSet.add(pair));
            }
          })
        );

        const sortedPairs = Array.from(allPairsSet).sort();
        setAvailablePairs(sortedPairs);
      } catch (error) {
        console.error('Failed to load trading pairs:', error);
      } finally {
        setLoadingPairs(false);
      }
    };

    loadPairs();
  }, [exchanges]);



  const handleExchangeToggle = (exchange: string) => {
    const newExchanges = exchanges.includes(exchange)
      ? exchanges.filter(e => e !== exchange)
      : [...exchanges, exchange];
    setExchanges(newExchanges);
  };

  const handleMarketToggle = (market: string) => {
    const newMarkets = markets.includes(market) ? markets.filter(m => m !== market) : [...markets, market];
    setMarkets(newMarkets);
  };

  const handlePositionTypeToggle = (positionType: string) => {
    const newPositionTypes = positionTypes.includes(positionType)
      ? positionTypes.filter(p => p !== positionType)
      : [...positionTypes, positionType];
    setPositionTypes(newPositionTypes);
  };

  // Get unique quote currencies
  const quoteCurrencies = useMemo(() => {
    const quotes = new Set<string>();
    availablePairs.forEach(pair => {
      // Extract quote currency (last 3-4 characters)
      const possibleQuotes = ['USDT', 'USDC', 'BUSD', 'BTC', 'ETH', 'BNB', 'EUR', 'GBP'];
      for (const quote of possibleQuotes) {
        if (pair.endsWith(quote)) {
          quotes.add(quote);
          break;
        }
      }
    });
    return Array.from(quotes).sort();
  }, [availablePairs]);

  const filteredPairs = availablePairs.filter(pair => {
    const matchesSearch = pair.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesQuote = selectedQuoteCurrency ? pair.endsWith(selectedQuoteCurrency) : true;
    return matchesSearch && matchesQuote;
  });

  const handleQuoteCurrencySelect = (quote: string | null) => {
    setSelectedQuoteCurrency(quote);
    setSearchQuery(''); // Clear search when filtering by quote
  };

  const handleSearchFocus = () => {
    setShowSearchResults(true);
  };

  const handleSearchBlur = () => {
    // Delay hiding to allow click on results
    setTimeout(() => setShowSearchResults(false), 250);
  };

  const handleSearchChange = (value: string) => {
    setSearchQuery(value);
    setShowSearchResults(true); // Always show dropdown when typing
  };

  const handlePairSelect = (pair: string) => {
    if (!pairs.includes(pair)) {
      setPairs([...pairs, pair]);
    }
    setSearchQuery('');
    setShowSearchResults(false);
  };

  const handlePairRemove = (pair: string) => {
    setPairs(pairs.filter(p => p !== pair));
  };

  const handleSaveStrategy = async () => {
    try {
      // This would call your backend API to save the strategy
      // For now, just mock it
      const mockStrategyId = crypto.randomUUID();
      const mockSecret = 'tv_' + Array.from(crypto.getRandomValues(new Uint8Array(16)))
        .map(b => b.toString(16).padStart(2, '0')).join('');
      
      setStrategyId(mockStrategyId);
      setSharedSecret(mockSecret);
      toast.success('Strategy saved!');
    } catch (error) {
      toast.error('Failed to save strategy');
    }
  };

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast.success(`${label} copied to clipboard`);
  };

  const handleTestWebhook = async () => {
    if (!strategyId || !sharedSecret) {
      toast.error('Please save your strategy first');
      return;
    }

    const testPayload = {
      strategy_id: strategyId,
      source: "tradingview",
      symbol: "BTCUSDT",
      side: "buy",
      price: 50000,
      bar_time: new Date().toISOString(),
      key: sharedSecret
    };

    try {
      const response = await fetch(`/hook/u/${strategyId}/s/${strategyId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(testPayload)
      });
      
      const result = await response.json();
      
      if (result.accepted) {
        toast.success('Accepted → Entered paper position');
      } else {
        toast.error(`Blocked: ${result.reason}`);
      }
    } catch (error) {
      toast.error('Failed to test webhook');
    }
  };

  const webhookUrl = strategyId ? `https://api.tradeeon.xyz/hook/u/${strategyId}/s/${strategyId}` : '';
  const tvTemplate = strategyId && sharedSecret ? JSON.stringify({
    "strategy_id": strategyId,
    "source": "tradingview",
    "symbol": "{{ticker}}",
    "side": "buy",
    "price": "{{close}}",
    "bar_time": "{{time}}",
    "key": sharedSecret
  }, null, 2) : '';

  return (
    <div className="h-screen flex overflow-hidden bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900">
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <div className="p-4 border-b border-gray-700/50 bg-white/5 backdrop-blur-sm">
          <div>
            <h1 className="text-xl font-semibold text-white">Webhook2</h1>
            <p className="text-sm text-gray-400 mt-1">
              Configure trading settings and webhook strategies
            </p>
          </div>
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto bg-white/5 backdrop-blur-sm p-6">
                                           {/* Trading Configuration - Dark Theme */}
            <div className="mb-12 bg-white/5 backdrop-blur-sm rounded-lg border border-gray-700/50 p-6 relative z-10">
            <div className="mb-4">
              <h2 className="text-lg font-semibold text-white">Trading Configuration</h2>
              <p className="text-sm text-gray-400 mt-1">Configure your trading parameters</p>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-6 gap-4">
              {/* Exchanges */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Exchanges</label>
                <div className="flex flex-wrap gap-1">
                  {AVAILABLE_EXCHANGES.map(exchange => (
                    <button
                      key={exchange}
                      onClick={() => handleExchangeToggle(exchange)}
                      className={`px-2 py-1 text-xs rounded-md border transition-colors ${
                        exchanges.includes(exchange)
                          ? 'bg-blue-500/20 border-blue-500/50 text-blue-300'
                          : 'bg-white/5 border-gray-600 text-gray-300 hover:bg-white/10'
                      }`}
                    >
                      {exchange}
                    </button>
                  ))}
                </div>
                <div className="mt-1 text-xs text-gray-400">
                  {exchanges.length} exchange{exchanges.length !== 1 ? 's' : ''} selected
                </div>
              </div>

              {/* Trading Pairs */}
              <div className="md:col-span-2">
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-sm font-medium text-gray-300">Trading Pairs</label>
                  {loadingPairs && (
                    <span className="text-xs text-gray-400">Loading...</span>
                  )}
                </div>

                {/* Quote Currency Quick Filters */}
                {quoteCurrencies.length > 0 && (
                  <div className="mb-2 flex flex-wrap gap-1">
                    <button
                      onClick={() => handleQuoteCurrencySelect(null)}
                      className={`px-2 py-1 text-xs rounded-md border transition-colors ${
                        selectedQuoteCurrency === null
                          ? 'bg-blue-500/20 border-blue-500/50 text-blue-300'
                          : 'bg-white/5 border-gray-600 text-gray-300 hover:bg-white/10'
                      }`}
                    >
                      All
                    </button>
                    {quoteCurrencies.slice(0, 6).map(quote => (
                      <button
                        key={quote}
                        onClick={() => handleQuoteCurrencySelect(quote)}
                        className={`px-2 py-1 text-xs rounded-md border transition-colors ${
                          selectedQuoteCurrency === quote
                            ? 'bg-blue-500/20 border-blue-500/50 text-blue-300'
                            : 'bg-white/5 border-gray-600 text-gray-300 hover:bg-white/10'
                        }`}
                      >
                        {quote}
                      </button>
                    ))}
                  </div>
                )}

                <div className="relative">
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => handleSearchChange(e.target.value)}
                    onFocus={handleSearchFocus}
                    onBlur={handleSearchBlur}
                    placeholder={loadingPairs ? "Loading pairs..." : selectedQuoteCurrency ? `Search ${selectedQuoteCurrency} pairs...` : "Search trading pairs (e.g. BTCUSDT, ETHUSDT)..."}
                    disabled={loadingPairs}
                    className="w-full px-3 py-2 text-sm border border-gray-600 rounded-md bg-white/5 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                  />
                  
                                     {/* Search Results Dropdown */}
                   {showSearchResults && (
                     <div className="absolute z-[9999] w-full mt-1 bg-gray-800 border border-gray-600 rounded-md shadow-lg max-h-64 overflow-y-auto">
                       {filteredPairs.length === 0 ? (
                         <div className="px-3 py-8 text-center text-gray-400 text-sm">
                           {searchQuery ? 'No pairs found. Try a different search.' : 'Start typing to search...'}
                         </div>
                       ) : (
                         <>
                           {filteredPairs.slice(0, 15).map(pair => (
                             <button
                               key={pair}
                               onClick={(e) => {
                                 e.preventDefault();
                                 e.stopPropagation();
                                 handlePairSelect(pair);
                               }}
                               disabled={pairs.includes(pair)}
                               className="w-full text-left px-3 py-2 hover:bg-gray-700 cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-between transition-colors"
                             >
                               <span className="text-sm text-white">{pair}</span>
                               {pairs.includes(pair) && (
                                 <svg className="w-4 h-4 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                   <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                 </svg>
                               )}
                             </button>
                           ))}
                           {filteredPairs.length > 15 && (
                             <div className="px-3 py-2 text-xs text-gray-400 text-center border-t border-gray-700">
                               Showing 15 of {filteredPairs.length} results. Type to narrow your search.
                             </div>
                           )}
                         </>
                       )}
                     </div>
                   )}
                </div>
                
                {/* Selected Pairs Bucket */}
                {pairs.length > 0 && (
                  <div className="mt-3 p-3 bg-gray-800/50 rounded-md border border-gray-700/50">
                    <div className="flex flex-wrap gap-2">
                      {pairs.map(pair => (
                        <div
                          key={pair}
                          className="flex items-center gap-1 px-2 py-1 bg-blue-500/20 border border-blue-500/50 rounded-md"
                        >
                          <span className="text-xs text-blue-300">{pair}</span>
                          <button
                            onClick={() => handlePairRemove(pair)}
                            className="text-blue-300 hover:text-blue-200"
                          >
                            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Markets */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Markets</label>
                <div className="flex flex-wrap gap-1">
                  {['Spot', 'Futures'].map(market => (
                    <button
                      key={market}
                      onClick={() => handleMarketToggle(market)}
                      className={`px-2 py-1 text-xs rounded-md border transition-colors ${
                        markets.includes(market)
                          ? 'bg-purple-500/20 border-purple-500/50 text-purple-300'
                          : 'bg-white/5 border-gray-600 text-gray-300 hover:bg-white/10'
                      }`}
                    >
                      {market}
                    </button>
                  ))}
                </div>
              </div>

              {/* Position Types */}
              {markets.includes('Futures') && (
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Position Types</label>
                  <div className="flex flex-wrap gap-1">
                    {['Long', 'Short'].map(positionType => (
                      <button
                        key={positionType}
                        onClick={() => handlePositionTypeToggle(positionType)}
                        className={`px-2 py-1 text-xs rounded-md border transition-colors ${
                          positionTypes.includes(positionType)
                            ? positionType === 'Long'
                              ? 'bg-green-500/20 border-green-500/50 text-green-300'
                              : 'bg-red-500/20 border-red-500/50 text-red-300'
                            : 'bg-white/5 border-gray-600 text-gray-300 hover:bg-white/10'
                        }`}
                      >
                        {positionType}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Capital */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Capital (USD)</label>
                <input
                  type="number"
                  value={capital}
                  onChange={(e) => setCapital(parseFloat(e.target.value) || 0)}
                  className="w-full px-3 py-2 text-sm border border-gray-600 rounded-md bg-white/5 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {/* Trade Amount */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Trade Amount (USD)</label>
                <input
                  type="number"
                  value={tradeAmount}
                  onChange={(e) => setTradeAmount(parseFloat(e.target.value) || 0)}
                  className="w-full px-3 py-2 text-sm border border-gray-600 rounded-md bg-white/5 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            {/* Save Button */}
            <div className="mt-4 flex justify-end">
              <button
                onClick={handleSaveStrategy}
                className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-md transition-colors"
              >
                Save Configuration
              </button>
            </div>
          </div>

          {/* Capital Management Section */}
          <div className="mb-12 bg-white/5 backdrop-blur-sm rounded-lg border border-gray-700/50 p-6 relative z-10">
            {/* Header */}
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center">
                <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center mr-3">
                  <DollarSign className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-white">Capital Management</h2>
                  <p className="text-sm text-gray-400">Configure capital allocation and deployment</p>
                </div>
              </div>
              <button
                onClick={() => {
                  if (isEditingCapital) {
                    setIsEditingCapital(false);
                    toast.success('Capital settings saved');
                  } else {
                    setIsEditingCapital(true);
                  }
                }}
                className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-md transition-colors text-sm"
              >
                {isEditingCapital ? 'Save Changes' : 'Edit'}
              </button>
            </div>

            {isEditingCapital ? (
              /* Edit Form */
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {/* Starting Capital */}
                <div className="bg-gray-800/50 border border-gray-700/50 rounded-lg p-4">
                  <div className="flex items-center mb-3">
                    <div className="w-6 h-6 bg-blue-600 rounded-md flex items-center justify-center mr-2">
                      <DollarSign className="w-4 h-4 text-white" />
                    </div>
                    <h4 className="text-sm font-medium text-gray-200">Starting Capital</h4>
                  </div>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400">$</span>
                    <input
                      type="number"
                      value={capitalSettings.startingCapital}
                      onChange={(e) => setCapitalSettings({...capitalSettings, startingCapital: Number(e.target.value)})}
                      className="w-full pl-8 pr-4 py-2 bg-white/5 border border-gray-600 rounded-md text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                    />
                  </div>
                </div>

                {/* Step Size */}
                <div className="bg-gray-800/50 border border-gray-700/50 rounded-lg p-4">
                  <div className="flex items-center mb-3">
                    <div className="w-6 h-6 bg-green-600 rounded-md flex items-center justify-center mr-2">
                      <TrendingUp className="w-4 h-4 text-white" />
                    </div>
                    <h4 className="text-sm font-medium text-gray-200">Step Size</h4>
                  </div>
                  <div className="relative">
                    <input
                      type="number"
                      value={capitalSettings.stepSizePercentage}
                      onChange={(e) => setCapitalSettings({...capitalSettings, stepSizePercentage: Number(e.target.value)})}
                      className="w-full px-4 pr-8 py-2 bg-white/5 border border-gray-600 rounded-md text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-green-500 text-sm"
                    />
                    <span className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400">%</span>
                  </div>
                  <div className="mt-2 text-xs text-gray-400">
                    Amount: ${Math.round((capitalSettings.stepSizePercentage / 100) * capitalSettings.startingCapital).toLocaleString()}
                  </div>
                </div>

                {/* Deploy Capital */}
                <div className="bg-gray-800/50 border border-gray-700/50 rounded-lg p-4">
                  <div className="flex items-center mb-3">
                    <div className="w-6 h-6 bg-orange-600 rounded-md flex items-center justify-center mr-2">
                      <Target className="w-4 h-4 text-white" />
                    </div>
                    <h4 className="text-sm font-medium text-gray-200">Deploy Capital</h4>
                  </div>
                  <input
                    type="text"
                    value={capitalSettings.deployCapital}
                    onChange={(e) => setCapitalSettings({...capitalSettings, deployCapital: e.target.value})}
                    className="w-full px-3 py-2 bg-white/5 border border-gray-600 rounded-md text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-orange-500 text-sm"
                    placeholder="e.g., Fixed: $100"
                  />
                </div>
              </div>
            ) : (
              /* Display Mode */
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <div className="bg-gray-800/50 border border-gray-700/50 rounded-lg p-4">
                  <div className="flex items-center mb-2">
                    <DollarSign className="w-5 h-5 text-blue-400 mr-2" />
                    <h4 className="text-sm font-medium text-gray-300">Capital</h4>
                  </div>
                  <div className="text-xl font-bold text-white">${capitalSettings.startingCapital.toLocaleString()}</div>
                  <div className="text-xs text-gray-400 mt-1">Total funds</div>
                </div>

                <div className="bg-gray-800/50 border border-gray-700/50 rounded-lg p-4">
                  <div className="flex items-center mb-2">
                    <TrendingUp className="w-5 h-5 text-green-400 mr-2" />
                    <h4 className="text-sm font-medium text-gray-300">Step Size</h4>
                  </div>
                  <div className="text-xl font-bold text-white">${Math.round((capitalSettings.stepSizePercentage / 100) * capitalSettings.startingCapital).toLocaleString()}</div>
                  <div className="text-xs text-gray-400 mt-1">{capitalSettings.stepSizePercentage}% per trade</div>
                </div>

                <div className="bg-gray-800/50 border border-gray-700/50 rounded-lg p-4">
                  <div className="flex items-center mb-2">
                    <Target className="w-5 h-5 text-orange-400 mr-2" />
                    <h4 className="text-sm font-medium text-gray-300">Deploy</h4>
                  </div>
                  <div className="text-sm font-bold text-white truncate">{capitalSettings.deployCapital}</div>
                  <div className="text-xs text-gray-400 mt-1">Deployment mode</div>
                </div>
              </div>
            )}
          </div>

          {/* Order & DCA Management Section */}
          <div className="mb-12 bg-white/5 backdrop-blur-sm rounded-lg border border-gray-700/50 p-6 relative z-10">
            {/* Header */}
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center">
                <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center mr-3">
                  <Settings className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-white">Order & DCA Management</h2>
                  <p className="text-sm text-gray-400">Configure order execution and DCA settings</p>
                </div>
              </div>
              <button
                onClick={() => {
                  if (isEditingOrderDCA) {
                    setIsEditingOrderDCA(false);
                    toast.success('Order & DCA settings saved');
                  } else {
                    setIsEditingOrderDCA(true);
                  }
                }}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-md transition-colors text-sm"
              >
                {isEditingOrderDCA ? 'Save Changes' : 'Edit'}
              </button>
            </div>

            {isEditingOrderDCA ? (
              /* Edit Form */
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {/* Order Type */}
                <div className="bg-gray-800/50 border border-gray-700/50 rounded-lg p-4">
                  <div className="flex items-center mb-3">
                    <div className="w-6 h-6 bg-green-600 rounded-md flex items-center justify-center mr-2">
                      <Settings className="w-4 h-4 text-white" />
                    </div>
                    <h4 className="text-sm font-medium text-gray-200">Order Type</h4>
                  </div>
                  <select
                    value={orderDCASettings.orderType}
                    onChange={(e) => setOrderDCASettings({...orderDCASettings, orderType: e.target.value})}
                    className="w-full px-3 py-2 bg-white/5 border border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-green-500 text-sm"
                  >
                    <option value="AMO Order">AMO Order</option>
                    <option value="Market Order">Market Order</option>
                  </select>
                </div>

                {/* Take Profit */}
                <div className="bg-gray-800/50 border border-gray-700/50 rounded-lg p-4">
                  <div className="flex items-center mb-3">
                    <div className="w-6 h-6 bg-orange-600 rounded-md flex items-center justify-center mr-2">
                      <Target className="w-4 h-4 text-white" />
                    </div>
                    <h4 className="text-sm font-medium text-gray-200">Take Profit</h4>
                  </div>
                  <div className="relative">
                    <input
                      type="number"
                      step="0.01"
                      value={orderDCASettings.takeProfitPercent}
                      onChange={(e) => setOrderDCASettings({...orderDCASettings, takeProfitPercent: Number(e.target.value)})}
                      className="w-full px-3 pr-8 py-2 bg-white/5 border border-gray-600 rounded-md text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-orange-500 text-sm"
                    />
                    <span className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400">%</span>
                  </div>
                </div>

                {/* DCA Conditions */}
                <div className="bg-gray-800/50 border border-gray-700/50 rounded-lg p-4">
                  <div className="flex items-center mb-3">
                    <div className="w-6 h-6 bg-cyan-600 rounded-md flex items-center justify-center mr-2">
                      <TrendingDown className="w-4 h-4 text-white" />
                    </div>
                    <h4 className="text-sm font-medium text-gray-200">DCA Conditions</h4>
                  </div>
                  <select
                    value={orderDCASettings.dcaConditions}
                    onChange={(e) => setOrderDCASettings({...orderDCASettings, dcaConditions: e.target.value})}
                    className="w-full px-3 py-2 bg-white/5 border border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-cyan-500 text-sm mb-3"
                  >
                    <option value="From Last Entry">From Last Entry</option>
                    <option value="From Average Price">From Average Price</option>
                    <option value="Position Loss">Position Loss</option>
                  </select>
                  <div className="relative">
                    <input
                      type="number"
                      step="0.1"
                      value={orderDCASettings.dcaPercentage}
                      onChange={(e) => setOrderDCASettings({...orderDCASettings, dcaPercentage: Number(e.target.value)})}
                      className="w-full px-3 pr-8 py-2 bg-white/5 border border-gray-600 rounded-md text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-cyan-500 text-sm"
                      placeholder="5"
                    />
                    <span className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400">%</span>
                  </div>
                </div>

                {/* DCA Amount */}
                <div className="bg-gray-800/50 border border-gray-700/50 rounded-lg p-4">
                  <div className="flex items-center mb-3">
                    <div className="w-6 h-6 bg-purple-600 rounded-md flex items-center justify-center mr-2">
                      <DollarSign className="w-4 h-4 text-white" />
                    </div>
                    <h4 className="text-sm font-medium text-gray-200">DCA Amount</h4>
                  </div>
                  <select
                    value={orderDCASettings.dcaAmountType}
                    onChange={(e) => setOrderDCASettings({...orderDCASettings, dcaAmountType: e.target.value})}
                    className="w-full px-3 py-2 bg-white/5 border border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-purple-500 text-sm mb-3"
                  >
                    <option value="ratio">Ratio (Same as Deploy)</option>
                    <option value="fixed">Fixed Amount</option>
                    <option value="multiplier">Multiplier</option>
                  </select>
                  {orderDCASettings.dcaAmountType === 'fixed' && (
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400">$</span>
                      <input
                        type="number"
                        value={orderDCASettings.dcaFixedAmount}
                        onChange={(e) => setOrderDCASettings({...orderDCASettings, dcaFixedAmount: Number(e.target.value)})}
                        className="w-full pl-8 pr-4 py-2 bg-white/5 border border-gray-600 rounded-md text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500 text-sm"
                      />
                    </div>
                  )}
                  {orderDCASettings.dcaAmountType === 'multiplier' && (
                    <div className="relative">
                      <input
                        type="number"
                        step="0.1"
                        value={orderDCASettings.dcaMultiplier}
                        onChange={(e) => setOrderDCASettings({...orderDCASettings, dcaMultiplier: Number(e.target.value)})}
                        className="w-full px-3 pr-6 py-2 bg-white/5 border border-gray-600 rounded-md text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500 text-sm"
                      />
                      <span className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400">x</span>
                    </div>
                  )}
                  {orderDCASettings.dcaAmountType !== 'ratio' && (
                    <div className="mt-3">
                      <label className="block text-xs text-gray-400 mb-1">Max DCA Orders</label>
                      <input
                        type="number"
                        value={orderDCASettings.dcaOrdersCount}
                        onChange={(e) => setOrderDCASettings({...orderDCASettings, dcaOrdersCount: Number(e.target.value)})}
                        className="w-full px-3 py-2 bg-white/5 border border-gray-600 rounded-md text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500 text-sm"
                      />
                    </div>
                  )}
                </div>
              </div>
            ) : (
              /* Display Mode */
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-gray-800/50 border border-gray-700/50 rounded-lg p-4">
                  <div className="flex items-center mb-2">
                    <Settings className="w-5 h-5 text-green-400 mr-2" />
                    <h4 className="text-sm font-medium text-gray-300">Order Type</h4>
                  </div>
                  <div className="text-base font-bold text-white">{orderDCASettings.orderType}</div>
                </div>

                <div className="bg-gray-800/50 border border-gray-700/50 rounded-lg p-4">
                  <div className="flex items-center mb-2">
                    <Target className="w-5 h-5 text-orange-400 mr-2" />
                    <h4 className="text-sm font-medium text-gray-300">Take Profit</h4>
                  </div>
                  <div className="text-lg font-bold text-white">{orderDCASettings.takeProfitPercent}%</div>
                </div>

                <div className="bg-gray-800/50 border border-gray-700/50 rounded-lg p-4">
                  <div className="flex items-center mb-2">
                    <TrendingDown className="w-5 h-5 text-cyan-400 mr-2" />
                    <h4 className="text-sm font-medium text-gray-300">DCA Conditions</h4>
                  </div>
                  <div className="text-base font-bold text-white">{orderDCASettings.dcaConditions}</div>
                  <div className="text-xs text-gray-400 mt-1">{orderDCASettings.dcaPercentage}% trigger</div>
                </div>

                <div className="bg-gray-800/50 border border-gray-700/50 rounded-lg p-4">
                  <div className="flex items-center mb-2">
                    <DollarSign className="w-5 h-5 text-purple-400 mr-2" />
                    <h4 className="text-sm font-medium text-gray-300">DCA Amount</h4>
                  </div>
                  <div className="text-base font-bold text-white">
                    {orderDCASettings.dcaAmountType === 'ratio' ? 'Ratio' : 
                     orderDCASettings.dcaAmountType === 'fixed' ? `$${orderDCASettings.dcaFixedAmount.toLocaleString()}` :
                     `${orderDCASettings.dcaMultiplier}x`}
                  </div>
                  {orderDCASettings.dcaAmountType !== 'ratio' && (
                    <div className="text-xs text-gray-400 mt-1">
                      Max {orderDCASettings.dcaOrdersCount} orders
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Risk Management Section */}
          <div className="mb-12 bg-white/5 backdrop-blur-sm rounded-lg border border-gray-700/50 p-6 relative z-10">
            {/* Header */}
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center">
                <div className="w-8 h-8 bg-red-600 rounded-lg flex items-center justify-center mr-3">
                  <Shield className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-white">Risk Management</h2>
                  <p className="text-sm text-gray-400">Configure risk protection mechanisms</p>
                </div>
              </div>
              <button
                onClick={() => {
                  if (isEditingRisk) {
                    setIsEditingRisk(false);
                    toast.success('Risk settings saved');
                  } else {
                    setIsEditingRisk(true);
                  }
                }}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-md transition-colors text-sm"
              >
                {isEditingRisk ? 'Save Changes' : 'Edit Settings'}
              </button>
            </div>

            {isEditingRisk ? (
              /* Edit Mode - Simplified for space constraints */
              <div className="space-y-4">
                {/* Stop Loss */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="bg-gray-800/50 border border-gray-700/50 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center">
                        <TrendingDown className="w-5 h-5 text-red-400 mr-2" />
                        <h4 className="text-sm font-medium text-gray-200">Stop Loss</h4>
                      </div>
                      <button
                        onClick={() => setRiskSettings({...riskSettings, stopLossEnabled: !riskSettings.stopLossEnabled})}
                        className={`w-12 h-6 rounded-full transition-colors relative ${
                          riskSettings.stopLossEnabled ? 'bg-red-600' : 'bg-gray-600'
                        }`}
                      >
                        <div className={`w-5 h-5 bg-white rounded-full transition-transform absolute top-0.5 ${
                          riskSettings.stopLossEnabled ? 'translate-x-6' : 'translate-x-0.5'
                        }`}></div>
                      </button>
                    </div>
                    {riskSettings.stopLossEnabled && (
                      <input
                        type="number"
                        value={riskSettings.stopLossPercent}
                        onChange={(e) => setRiskSettings({...riskSettings, stopLossPercent: Number(e.target.value)})}
                        className="w-full px-3 py-2 bg-white/5 border border-gray-600 rounded-md text-white text-sm"
                      />
                    )}
                  </div>

                  {/* Lifetime Mode Info */}
                  <div className="bg-gray-800/50 border border-gray-700/50 rounded-lg p-4">
                    <div className="flex items-center mb-2">
                      <Clock className="w-5 h-5 text-indigo-400 mr-2" />
                      <h4 className="text-sm font-medium text-gray-200">Lifetime Mode</h4>
                    </div>
                    <div className="text-sm font-bold text-white">After Full Deploy</div>
                    <div className="text-xs text-gray-400">Features activate after full capital deployment</div>
                  </div>
                </div>

                {/* Risk Features */}
                <div className="bg-gray-800/50 border border-gray-700/50 rounded-lg p-4 space-y-3">
                  <h4 className="text-sm font-medium text-gray-200 mb-3">Risk Management Features</h4>
                  
                  <div className="grid grid-cols-2 gap-3">
                    {/* Recovery Drip */}
                    <div className="bg-white/5 border border-gray-700/50 rounded-lg p-3">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm text-gray-200">💧 Recovery Drip</span>
                        <button
                          onClick={() => setRiskSettings({...riskSettings, recoveryDrip: !riskSettings.recoveryDrip})}
                          className={`w-10 h-5 rounded-full ${riskSettings.recoveryDrip ? 'bg-blue-600' : 'bg-gray-600'}`}
                        >
                          <div className={`w-4 h-4 bg-white rounded-full transition-transform ${
                            riskSettings.recoveryDrip ? 'translate-x-5' : 'translate-x-0.5'
                          }`}></div>
                        </button>
                      </div>
                    </div>

                    {/* Time-Based Exit */}
                    <div className="bg-white/5 border border-gray-700/50 rounded-lg p-3">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm text-gray-200">⏰ Time Exit</span>
                        <button
                          onClick={() => setRiskSettings({...riskSettings, timeBasedExit: !riskSettings.timeBasedExit})}
                          className={`w-10 h-5 rounded-full ${riskSettings.timeBasedExit ? 'bg-purple-600' : 'bg-gray-600'}`}
                        >
                          <div className={`w-4 h-4 bg-white rounded-full transition-transform ${
                            riskSettings.timeBasedExit ? 'translate-x-5' : 'translate-x-0.5'
                          }`}></div>
                        </button>
                      </div>
                    </div>

                    {/* Max Drawdown */}
                    <div className="bg-white/5 border border-gray-700/50 rounded-lg p-3">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm text-gray-200">📉 Max Drawdown</span>
                        <button
                          onClick={() => setRiskSettings({...riskSettings, maxDrawdownStop: !riskSettings.maxDrawdownStop})}
                          className={`w-10 h-5 rounded-full ${riskSettings.maxDrawdownStop ? 'bg-red-600' : 'bg-gray-600'}`}
                        >
                          <div className={`w-4 h-4 bg-white rounded-full transition-transform ${
                            riskSettings.maxDrawdownStop ? 'translate-x-5' : 'translate-x-0.5'
                          }`}></div>
                        </button>
                      </div>
                    </div>

                    {/* Range Exit */}
                    <div className="bg-white/5 border border-gray-700/50 rounded-lg p-3">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm text-gray-200">📊 Range Exit</span>
                        <button
                          onClick={() => setRiskSettings({...riskSettings, rangeExit: !riskSettings.rangeExit})}
                          className={`w-10 h-5 rounded-full ${riskSettings.rangeExit ? 'bg-yellow-600' : 'bg-gray-600'}`}
                        >
                          <div className={`w-4 h-4 bg-white rounded-full transition-transform ${
                            riskSettings.rangeExit ? 'translate-x-5' : 'translate-x-0.5'
                          }`}></div>
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              /* Display Mode */
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="bg-gray-800/50 border border-gray-700/50 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center">
                        <TrendingDown className="w-5 h-5 text-red-400 mr-2" />
                        <h4 className="text-sm font-medium text-gray-200">Stop Loss</h4>
                      </div>
                      <div className={`px-2 py-1 rounded-full text-xs ${
                        riskSettings.stopLossEnabled 
                          ? 'bg-red-500/20 text-red-300' 
                          : 'bg-gray-600 text-gray-400'
                      }`}>
                        {riskSettings.stopLossEnabled ? 'Enabled' : 'Disabled'}
                      </div>
                    </div>
                    {riskSettings.stopLossEnabled ? (
                      <div className="text-lg font-bold text-white">{riskSettings.stopLossPercent}%</div>
                    ) : (
                      <div className="text-sm text-gray-400">Disabled (Recommended for CNC/SPOT)</div>
                    )}
                  </div>

                  <div className="bg-gray-800/50 border border-gray-700/50 rounded-lg p-4">
                    <div className="flex items-center mb-2">
                      <Clock className="w-5 h-5 text-indigo-400 mr-2" />
                      <h4 className="text-sm font-medium text-gray-200">Lifetime Mode</h4>
                    </div>
                    <div className="text-base font-bold text-white">After Full Deploy</div>
                    <div className="text-xs text-gray-400">Features activate after full capital deployment</div>
                  </div>
                </div>

                <div className="bg-gray-800/50 border border-gray-700/50 rounded-lg p-4">
                  <h4 className="text-sm font-medium text-gray-200 mb-3">Active Risk Features</h4>
                  <div className="grid grid-cols-4 gap-3">
                    {[
                      { name: 'Recovery Drip', enabled: riskSettings.recoveryDrip, icon: '💧' },
                      { name: 'Time Exit', enabled: riskSettings.timeBasedExit, icon: '⏰' },
                      { name: 'Max Drawdown', enabled: riskSettings.maxDrawdownStop, icon: '📉' },
                      { name: 'Range Exit', enabled: riskSettings.rangeExit, icon: '📊' }
                    ].map((feature) => (
                      <div key={feature.name} className={`text-center p-3 rounded-lg ${
                        feature.enabled 
                          ? 'bg-green-500/20 border border-green-500/50' 
                          : 'bg-gray-700/50 border border-gray-600/50'
                      }`}>
                        <div className="text-lg mb-1">{feature.icon}</div>
                        <div className="text-xs font-medium text-gray-200">{feature.name}</div>
                        <div className="text-xs text-gray-400">{feature.enabled ? 'Active' : 'Disabled'}</div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Trade Management Section */}
          <div className="mb-12 bg-white/5 backdrop-blur-sm rounded-lg border border-gray-700/50 p-6 relative z-10">
            {/* Header */}
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center">
                <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center mr-3">
                  <Settings className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-white">Trade Management</h2>
                  <p className="text-sm text-gray-400">Execution limits & DCA prioritization</p>
                </div>
              </div>
              <button
                onClick={() => {
                  if (isEditingTrade) {
                    setIsEditingTrade(false);
                    toast.success('Trade settings saved');
                  } else {
                    setIsEditingTrade(true);
                  }
                }}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md transition-colors text-sm"
              >
                {isEditingTrade ? 'Save Changes' : 'Edit'}
              </button>
            </div>

            {isEditingTrade ? (
              /* Edit Mode */
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Daily Limits */}
                <div className="bg-gray-800/50 border border-gray-700/50 rounded-lg p-4">
                  <div className="flex items-center mb-4">
                    <Calendar className="w-5 h-5 text-blue-400 mr-2" />
                    <h4 className="text-sm font-medium text-gray-200">Daily Limits</h4>
                  </div>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <label className="text-sm text-gray-300">Max new positions/day</label>
                      <input
                        type="number"
                        min="1"
                        max="10"
                        value={tradeSettings.maxNewPositionsPerDay}
                        onChange={(e) => setTradeSettings({...tradeSettings, maxNewPositionsPerDay: Number(e.target.value)})}
                        className="w-16 px-2 py-1 bg-white/5 border border-gray-600 rounded text-white text-sm text-center"
                      />
                    </div>
                    <div className="flex items-center justify-between">
                      <label className="text-sm text-gray-300">Max DCA executions/day</label>
                      <input
                        type="number"
                        min="1"
                        max="10"
                        value={tradeSettings.maxDcaExecutionsPerDay}
                        onChange={(e) => setTradeSettings({...tradeSettings, maxDcaExecutionsPerDay: Number(e.target.value)})}
                        className="w-16 px-2 py-1 bg-white/5 border border-gray-600 rounded text-white text-sm text-center"
                      />
                    </div>
                    <div className="flex items-center justify-between">
                      <label className="text-sm text-gray-300">DCA + new entry same day?</label>
                      <div className="flex space-x-1">
                        <button
                          onClick={() => setTradeSettings({...tradeSettings, dcaNewEntrySameDay: true})}
                          className={`w-6 h-6 rounded text-xs ${tradeSettings.dcaNewEntrySameDay ? 'bg-green-600' : 'bg-gray-700'}`}
                        >
                          ✓
                        </button>
                        <button
                          onClick={() => setTradeSettings({...tradeSettings, dcaNewEntrySameDay: false})}
                          className={`w-6 h-6 rounded text-xs ${!tradeSettings.dcaNewEntrySameDay ? 'bg-red-600' : 'bg-gray-700'}`}
                        >
                          ✗
                        </button>
                      </div>
                    </div>
                    <div className="flex items-center justify-between">
                      <label className="text-sm text-gray-300">Max DCA per stock/week</label>
                      <input
                        type="number"
                        min="1"
                        max="7"
                        value={tradeSettings.maxDcaPerStockPerWeek}
                        onChange={(e) => setTradeSettings({...tradeSettings, maxDcaPerStockPerWeek: Number(e.target.value)})}
                        className="w-16 px-2 py-1 bg-white/5 border border-gray-600 rounded text-white text-sm text-center"
                      />
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <label className="text-sm text-gray-300">Re-entry cooldown (days)</label>
                        <button
                          onClick={() => setTradeSettings({...tradeSettings, reEntryCooldownEnabled: !tradeSettings.reEntryCooldownEnabled})}
                          className={`w-10 h-5 rounded-full ${tradeSettings.reEntryCooldownEnabled ? 'bg-blue-600' : 'bg-gray-700'}`}
                        >
                          <div className={`w-4 h-4 bg-white rounded-full transition-transform ${tradeSettings.reEntryCooldownEnabled ? 'translate-x-5' : 'translate-x-0.5'}`}></div>
                        </button>
                      </div>
                      <input
                        type="number"
                        min="0"
                        max="365"
                        value={tradeSettings.reEntryCooldownDays}
                        onChange={(e) => setTradeSettings({...tradeSettings, reEntryCooldownDays: Number(e.target.value)})}
                        disabled={!tradeSettings.reEntryCooldownEnabled}
                        className={`w-16 px-2 py-1 bg-white/5 border border-gray-600 rounded text-white text-sm text-center ${!tradeSettings.reEntryCooldownEnabled ? 'opacity-50' : ''}`}
                      />
                    </div>
                    <div className="flex items-center justify-between">
                      <label className="text-sm text-gray-300">Max open positions</label>
                      <input
                        type="number"
                        min="1"
                        max="100"
                        value={tradeSettings.maxOpenPositions}
                        onChange={(e) => setTradeSettings({...tradeSettings, maxOpenPositions: Number(e.target.value)})}
                        className="w-16 px-2 py-1 bg-white/5 border border-gray-600 rounded text-white text-sm text-center"
                      />
                    </div>
                  </div>
                </div>

                {/* DCA Priority */}
                <div className="bg-gray-800/50 border border-gray-700/50 rounded-lg p-4">
                  <div className="flex items-center mb-4">
                    <BarChart3 className="w-5 h-5 text-purple-400 mr-2" />
                    <h4 className="text-sm font-medium text-gray-200">DCA Priority</h4>
                  </div>
                  <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-3 mb-4">
                    <div className="text-xs text-blue-300">
                      When multiple positions are eligible for DCA today, this setting decides which position gets priority
                    </div>
                  </div>
                  <div className="space-y-3">
                    {/* Highest Drawdown */}
                    <div className="flex items-center justify-between p-3 bg-white/5 border border-gray-700/50 rounded-lg">
                      <div className="flex items-center">
                        <div className="w-6 h-6 bg-red-600 rounded-md flex items-center justify-center mr-3 text-white text-xs">#1</div>
                        <div>
                          <div className="text-sm font-medium text-gray-200">Highest % Drawdown</div>
                          <div className="text-xs text-gray-400">Focus on trades furthest from recovery</div>
                        </div>
                      </div>
                      <button
                        onClick={() => setTradeSettings({...tradeSettings, dcaPriorityLogic: { highestDrawdown: true, longestTimeSinceLastDca: false, oldestPosition: false }})}
                        className={`w-5 h-5 rounded-md border-2 ${tradeSettings.dcaPriorityLogic.highestDrawdown ? 'bg-red-600 border-red-600 text-white' : 'border-gray-600'}`}
                      >
                        {tradeSettings.dcaPriorityLogic.highestDrawdown && '✓'}
                      </button>
                    </div>

                    {/* Longest Since DCA */}
                    <div className="flex items-center justify-between p-3 bg-white/5 border border-gray-700/50 rounded-lg">
                      <div className="flex items-center">
                        <div className="w-6 h-6 bg-orange-600 rounded-md flex items-center justify-center mr-3 text-white text-xs">#2</div>
                        <div>
                          <div className="text-sm font-medium text-gray-200">Longest Since DCA</div>
                          <div className="text-xs text-gray-400">Keeps averaging consistent over time</div>
                        </div>
                      </div>
                      <button
                        onClick={() => setTradeSettings({...tradeSettings, dcaPriorityLogic: { highestDrawdown: false, longestTimeSinceLastDca: true, oldestPosition: false }})}
                        className={`w-5 h-5 rounded-md border-2 ${tradeSettings.dcaPriorityLogic.longestTimeSinceLastDca ? 'bg-orange-600 border-orange-600 text-white' : 'border-gray-600'}`}
                      >
                        {tradeSettings.dcaPriorityLogic.longestTimeSinceLastDca && '✓'}
                      </button>
                    </div>

                    {/* Oldest Position */}
                    <div className="flex items-center justify-between p-3 bg-white/5 border border-gray-700/50 rounded-lg">
                      <div className="flex items-center">
                        <div className="w-6 h-6 bg-blue-600 rounded-md flex items-center justify-center mr-3 text-white text-xs">#3</div>
                        <div>
                          <div className="text-sm font-medium text-gray-200">Oldest Position</div>
                          <div className="text-xs text-gray-400">Ensures older trades don't get stuck</div>
                        </div>
                      </div>
                      <button
                        onClick={() => setTradeSettings({...tradeSettings, dcaPriorityLogic: { highestDrawdown: false, longestTimeSinceLastDca: false, oldestPosition: true }})}
                        className={`w-5 h-5 rounded-md border-2 ${tradeSettings.dcaPriorityLogic.oldestPosition ? 'bg-blue-600 border-blue-600 text-white' : 'border-gray-600'}`}
                      >
                        {tradeSettings.dcaPriorityLogic.oldestPosition && '✓'}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              /* Display Mode */
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="bg-gray-800/50 border border-gray-700/50 rounded-lg p-4">
                  <div className="flex items-center mb-4">
                    <Calendar className="w-5 h-5 text-blue-400 mr-2" />
                    <h4 className="text-sm font-medium text-gray-200">Daily Limits</h4>
                  </div>
                  <div className="space-y-3">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-400">Max new positions/day</span>
                      <span className="text-white font-medium">{tradeSettings.maxNewPositionsPerDay}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-400">Max DCA executions/day</span>
                      <span className="text-white font-medium">{tradeSettings.maxDcaExecutionsPerDay}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-400">DCA + new entry same day?</span>
                      <span className={`font-bold ${tradeSettings.dcaNewEntrySameDay ? 'text-green-400' : 'text-red-400'}`}>
                        {tradeSettings.dcaNewEntrySameDay ? 'Yes' : 'No'}
                      </span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-400">Max DCA per stock/week</span>
                      <span className="text-white font-medium">{tradeSettings.maxDcaPerStockPerWeek}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-400">Re-entry cooldown</span>
                      <span className="text-white font-medium">
                        {tradeSettings.reEntryCooldownEnabled ? `${tradeSettings.reEntryCooldownDays} days` : 'Disabled'}
                      </span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-400">Max open positions</span>
                      <span className="text-white font-medium">{tradeSettings.maxOpenPositions}</span>
                    </div>
                  </div>
                </div>

                <div className="bg-gray-800/50 border border-gray-700/50 rounded-lg p-4">
                  <div className="flex items-center mb-4">
                    <BarChart3 className="w-5 h-5 text-purple-400 mr-2" />
                    <h4 className="text-sm font-medium text-gray-200">DCA Priority</h4>
                  </div>
                  <div className="space-y-2">
                    {tradeSettings.dcaPriorityLogic.highestDrawdown && (
                      <div className="flex items-center p-2 bg-red-500/20 border border-red-500/50 rounded-lg">
                        <div className="w-6 h-6 bg-red-600 rounded-md flex items-center justify-center mr-2 text-white text-xs">#1</div>
                        <span className="text-sm text-gray-200">Highest % Drawdown</span>
                      </div>
                    )}
                    {tradeSettings.dcaPriorityLogic.longestTimeSinceLastDca && (
                      <div className="flex items-center p-2 bg-orange-500/20 border border-orange-500/50 rounded-lg">
                        <div className="w-6 h-6 bg-orange-600 rounded-md flex items-center justify-center mr-2 text-white text-xs">#2</div>
                        <span className="text-sm text-gray-200">Longest Since DCA</span>
                      </div>
                    )}
                    {tradeSettings.dcaPriorityLogic.oldestPosition && (
                      <div className="flex items-center p-2 bg-blue-500/20 border border-blue-500/50 rounded-lg">
                        <div className="w-6 h-6 bg-blue-600 rounded-md flex items-center justify-center mr-2 text-white text-xs">#3</div>
                        <span className="text-sm text-gray-200">Oldest Position</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Webhook Connect Card */}
          {strategyId && (
            <div className="mb-6 bg-white/5 backdrop-blur-sm rounded-lg border border-gray-700/50 p-6 relative z-0">
              <h2 className="text-lg font-semibold text-white mb-4">Webhook Connect</h2>
              
              {/* Webhook URL */}
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-300 mb-2">Webhook URL</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={webhookUrl}
                    readOnly
                    className="flex-1 px-3 py-2 text-sm border border-gray-600 rounded-md bg-white/5 text-white"
                  />
                  <button
                    onClick={() => copyToClipboard(webhookUrl, 'Webhook URL')}
                    className="px-3 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-md transition-colors text-sm"
                  >
                    Copy
                  </button>
                </div>
              </div>

              {/* Shared Secret */}
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-300 mb-2">Shared Secret</label>
                <div className="flex gap-2">
                  <input
                    type={secretVisible ? "text" : "password"}
                    value={secretVisible ? sharedSecret : "••••••••••••"}
                    readOnly
                    className="flex-1 px-3 py-2 text-sm border border-gray-600 rounded-md bg-white/5 text-white"
                  />
                  <button
                    onClick={() => setSecretVisible(!secretVisible)}
                    className="px-3 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-md transition-colors text-sm"
                  >
                    {secretVisible ? 'Hide' : 'Reveal'}
                  </button>
                  <button
                    onClick={() => copyToClipboard(sharedSecret, 'Shared Secret')}
                    className="px-3 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-md transition-colors text-sm"
                  >
                    Copy
                  </button>
                </div>
              </div>

              {/* TV Message Template */}
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-300 mb-2">TradingView Message Template</label>
                <div className="relative">
                  <textarea
                    value={tvTemplate}
                    readOnly
                    rows={8}
                    className="w-full px-3 py-2 text-sm border border-gray-600 rounded-md bg-white/5 text-white font-mono resize-none"
                  />
                  <button
                    onClick={() => copyToClipboard(tvTemplate, 'TV Template')}
                    className="absolute top-2 right-2 px-3 py-1 bg-blue-500 hover:bg-blue-600 text-white rounded-md transition-colors text-xs"
                  >
                    Copy
                  </button>
                </div>
              </div>

              {/* Test Button */}
              <button
                onClick={handleTestWebhook}
                className="w-full px-4 py-2 bg-green-500 hover:bg-green-600 text-white rounded-md transition-colors"
              >
                Test Webhook
              </button>
            </div>
          )}

          {/* Placeholder for future content */}
          <div className="mt-6">
            <div className="p-8 bg-white/5 backdrop-blur-sm rounded-lg border border-gray-700/50">
              <p className="text-gray-400 text-center">
                Additional content will be added here
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
