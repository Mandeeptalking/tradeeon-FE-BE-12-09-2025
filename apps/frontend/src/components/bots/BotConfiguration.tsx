import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  Settings,
  TrendingUp,
  TrendingDown,
  X,
  Plus,
  Search,
  ChevronDown,
  AlertCircle,
  Star,
  Clock,
} from 'lucide-react';
import { useThemeStore } from '../../store/theme';
import { Input } from '../ui/input';
import { Button } from '../ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../ui/select';
import { connectionsApi } from '../../lib/api/connections';
import type { Connection } from '../../types/connections';
import { logger } from '../../utils/logger';

export interface BotConfigurationData {
  botName: string;
  exchange: string;
  market: 'spot' | 'futures';
  direction: 'long' | 'short';
  pairs: string[];
  pairMode: 'single' | 'multiple';
}

export interface BotConfigurationProps {
  config: BotConfigurationData;
  onChange: (config: BotConfigurationData) => void;
  className?: string;
  showTitle?: boolean;
}

// Fetch trading pairs from Binance API
const fetchBinancePairs = async (): Promise<string[]> => {
  try {
    const response = await fetch('https://api.binance.com/api/v3/exchangeInfo');
    const data = await response.json();
    return data.symbols
      .filter((s: any) => s.status === 'TRADING')
      .map((s: any) => s.symbol)
      .sort();
  } catch (error) {
    logger.error('Failed to fetch Binance pairs:', error);
    return ['BTCUSDT', 'ETHUSDT', 'BNBUSDT', 'ADAUSDT', 'SOLUSDT'];
  }
};

const BotConfiguration: React.FC<BotConfigurationProps> = ({
  config,
  onChange,
  className = '',
  showTitle = true,
}) => {
  const { theme } = useThemeStore();
  const isDark = theme === 'dark';
  const dropdownRef = useRef<HTMLDivElement>(null);

  const [connections, setConnections] = useState<Connection[]>([]);
  const [loadingConnections, setLoadingConnections] = useState(true);
  const [availablePairs, setAvailablePairs] = useState<string[]>([]);
  const [loadingPairs, setLoadingPairs] = useState(false);
  const [showPairDropdown, setShowPairDropdown] = useState(false);
  const [pairSearch, setPairSearch] = useState('');
  const [selectedQuoteCurrency, setSelectedQuoteCurrency] = useState<string>('');
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const pairListRef = useRef<HTMLDivElement>(null);

  // Validation errors
  const [errors, setErrors] = useState<{
    exchange?: string;
    direction?: string;
    pairs?: string;
  }>({});

  // Fetch connections on mount
  useEffect(() => {
    const loadConnections = async () => {
      try {
        setLoadingConnections(true);
        const conns = await connectionsApi.listConnections();
        const connectedExchanges = conns.filter(c => c.status === 'connected');
        setConnections(connectedExchanges);
        
        // Set default exchange if none selected and we have connections
        if (!config.exchange && connectedExchanges.length > 0) {
          const firstConnected = connectedExchanges[0];
          const displayName = firstConnected.nickname 
            ? `${firstConnected.nickname} | ${firstConnected.exchange} Spot`
            : `${firstConnected.exchange} Spot`;
          
          onChange({
            ...config,
            exchange: displayName,
            market: 'spot', // Default to spot
            pairMode: 'single', // Default to single pair mode
            direction: 'long', // Default direction
          });
        }
      } catch (error) {
        logger.error('Failed to load connections:', error);
      } finally {
        setLoadingConnections(false);
      }
    };

    loadConnections();
  }, []);

  // Fetch pairs when exchange changes
  useEffect(() => {
    const loadPairs = async () => {
      if (!config.exchange) return;
      
      try {
        setLoadingPairs(true);
        const pairs = await fetchBinancePairs();
        setAvailablePairs(pairs);
      } catch (error) {
        logger.error('Failed to load pairs:', error);
      } finally {
        setLoadingPairs(false);
      }
    };

    loadPairs();
  }, [config.exchange]);

  // Focus search input when dropdown opens
  useEffect(() => {
    if (showPairDropdown && searchInputRef.current) {
      setTimeout(() => {
        searchInputRef.current?.focus();
      }, 100);
    }
  }, [showPairDropdown]);

  // Keyboard navigation
  useEffect(() => {
    if (!showPairDropdown) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setHighlightedIndex((prev) => 
          prev < filteredPairs.length - 1 ? prev + 1 : prev
        );
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setHighlightedIndex((prev) => (prev > 0 ? prev - 1 : -1));
      } else if (e.key === 'Enter' && highlightedIndex >= 0 && highlightedIndex < filteredPairs.length) {
        e.preventDefault();
        const pair = filteredPairs[highlightedIndex];
        if (pair) {
          let newPairs: string[];
          if (config.pairMode === 'single') {
            newPairs = [pair];
            setShowPairDropdown(false);
          } else {
            newPairs = config.pairs.includes(pair)
              ? config.pairs
              : [...config.pairs, pair];
          }
          const newConfig = { ...config, pairs: newPairs };
          onChange(newConfig);
          validateConfig(newConfig);
          if (config.pairMode === 'single') {
            setPairSearch('');
            setHighlightedIndex(-1);
          }
        }
      } else if (e.key === 'Escape') {
        setShowPairDropdown(false);
        setHighlightedIndex(-1);
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [showPairDropdown, filteredPairs, highlightedIndex, config, onChange]);

  // Scroll highlighted item into view
  useEffect(() => {
    if (highlightedIndex >= 0 && pairListRef.current) {
      const items = pairListRef.current.querySelectorAll('button');
      if (items[highlightedIndex]) {
        items[highlightedIndex].scrollIntoView({ block: 'nearest', behavior: 'smooth' });
      }
    }
  }, [highlightedIndex]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowPairDropdown(false);
        setHighlightedIndex(-1);
      }
    };

    if (showPairDropdown) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => {
        document.removeEventListener('mousedown', handleClickOutside);
      };
    }
  }, [showPairDropdown]);

  // Reset highlighted index when search changes
  useEffect(() => {
    setHighlightedIndex(-1);
  }, [pairSearch, selectedQuoteCurrency]);

  // Validate configuration
  const validateConfig = (newConfig: BotConfigurationData): boolean => {
    const newErrors: typeof errors = {};

    // Validate exchange
    const connectedExchanges = connections.filter(c => c.status === 'connected');
    if (connectedExchanges.length === 0) {
      newErrors.exchange = 'No connected exchanges found. Please connect an exchange first.';
    } else if (!newConfig.exchange) {
      newErrors.exchange = 'Please select an exchange';
    }

    // Validate direction (only for futures)
    if (newConfig.market === 'futures' && !newConfig.direction) {
      newErrors.direction = 'Please select a direction for futures trading';
    }

    // Validate pairs
    if (newConfig.pairs.length === 0) {
      newErrors.pairs = 'Please select at least one trading pair';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Format exchange options from connections
  const getExchangeOptions = () => {
    const options: Array<{ value: string; label: string; market: 'spot' | 'futures' }> = [];
    
    connections.forEach((conn) => {
      if (conn.status === 'connected') {
        // Add Spot option
        const spotLabel = conn.nickname 
          ? `${conn.nickname} | ${conn.exchange} Spot`
          : `${conn.exchange} Spot`;
        options.push({
          value: `${conn.id}_spot`,
          label: spotLabel,
          market: 'spot',
        });
        
        // Add Futures option if trading is enabled
        if (conn.features.trading) {
          const futuresLabel = conn.nickname
            ? `${conn.nickname} | ${conn.exchange} Futures`
            : `${conn.exchange} Futures`;
          options.push({
            value: `${conn.id}_futures`,
            label: futuresLabel,
            market: 'futures',
          });
        }
      }
    });

    return options;
  };

  // Handle exchange change
  const handleExchangeChange = (value: string) => {
    const options = getExchangeOptions();
    const selectedOption = options.find(opt => opt.value === value);
    
    if (selectedOption) {
      const newConfig = {
        ...config,
        exchange: selectedOption.label,
        market: selectedOption.market,
        // Reset direction if switching to spot
        direction: selectedOption.market === 'spot' ? 'long' : config.direction,
      };
      
      onChange(newConfig);
      validateConfig(newConfig);
    }
  };

  // Handle market type change
  const handleMarketChange = (market: 'spot' | 'futures') => {
    // Update exchange label to reflect market type
    const currentExchange = config.exchange.split('|')[0]?.trim() || '';
    const exchangeName = config.exchange.split('|')[1]?.trim().split(' ')[0] || '';
    
    // Find the connection ID from current exchange
    const connectionId = connections.find(conn => {
      const connLabel = conn.nickname 
        ? `${conn.nickname} | ${conn.exchange}`
        : conn.exchange;
      return config.exchange.includes(connLabel);
    })?.id;

    if (connectionId) {
      const options = getExchangeOptions();
      const matchingOption = options.find(
        opt => opt.value === `${connectionId}_${market}`
      );
      
      if (matchingOption) {
        const newConfig = {
          ...config,
          market,
          exchange: matchingOption.label,
          direction: market === 'spot' ? 'long' : config.direction,
        };
        onChange(newConfig);
        validateConfig(newConfig);
      }
    }
  };

  // Handle direction change
  const handleDirectionChange = (direction: 'long' | 'short') => {
    const newConfig = { ...config, direction };
    onChange(newConfig);
    validateConfig(newConfig);
  };

  // Popular pairs (most traded)
  const popularPairs = useMemo(() => {
    return ['BTCUSDT', 'ETHUSDT', 'BNBUSDT', 'ADAUSDT', 'SOLUSDT', 'XRPUSDT', 'DOGEUSDT', 'MATICUSDT'];
  }, []);

  // Filter pairs based on search and quote currency with better matching
  const filteredPairs = useMemo(() => {
    const searchLower = pairSearch.toLowerCase().trim();
    
    return availablePairs.filter((pair) => {
      // Quote currency filter
      const matchesQuote = !selectedQuoteCurrency || pair.endsWith(selectedQuoteCurrency);
      if (!matchesQuote) return false;

      // If no search, return all
      if (!searchLower) return true;

      // Format pair for display
      const formatted = formatPairDisplay(pair);
      const formattedLower = formatted.toLowerCase();
      
      // Check if search matches:
      // 1. Full pair symbol (BTCUSDT)
      // 2. Formatted pair (BTC/USDT)
      // 3. Base currency (BTC)
      // 4. Quote currency (USDT)
      const base = pair.slice(0, -4).toLowerCase();
      const quote = pair.slice(-4).toLowerCase();
      
      return (
        pair.toLowerCase().includes(searchLower) ||
        formattedLower.includes(searchLower) ||
        base.includes(searchLower) ||
        quote.includes(searchLower)
      );
    }).sort((a, b) => {
      // Sort: popular pairs first, then alphabetically
      const aIsPopular = popularPairs.includes(a);
      const bIsPopular = popularPairs.includes(b);
      
      if (aIsPopular && !bIsPopular) return -1;
      if (!aIsPopular && bIsPopular) return 1;
      
      return a.localeCompare(b);
    });
  }, [availablePairs, pairSearch, selectedQuoteCurrency, popularPairs]);

  // Highlight matching text in pair
  const highlightMatch = (pair: string, search: string) => {
    if (!search.trim()) return formatPairDisplay(pair);
    
    const formatted = formatPairDisplay(pair);
    const searchLower = search.toLowerCase();
    const formattedLower = formatted.toLowerCase();
    
    // Find match position
    const index = formattedLower.indexOf(searchLower);
    if (index === -1) return formatted;
    
    const before = formatted.substring(0, index);
    const match = formatted.substring(index, index + search.length);
    const after = formatted.substring(index + search.length);
    
    return (
      <>
        {before}
        <span className="bg-yellow-400/30 dark:bg-yellow-500/30 font-semibold">{match}</span>
        {after}
      </>
    );
  };

  // Get unique quote currencies from pairs
  const quoteCurrencies = Array.from(
    new Set(availablePairs.map((p) => p.slice(-4)).filter((q) => ['USDT', 'BUSD', 'BTC', 'ETH'].includes(q)))
  ).sort();

  const handleAddPair = (pair: string) => {
    let newPairs: string[];
    
    if (config.pairMode === 'single') {
      newPairs = [pair];
      setShowPairDropdown(false);
    } else {
      newPairs = config.pairs.includes(pair)
        ? config.pairs
        : [...config.pairs, pair];
    }
    
    const newConfig = { ...config, pairs: newPairs };
    onChange(newConfig);
    validateConfig(newConfig);
    
    if (config.pairMode === 'single') {
      setPairSearch('');
      setHighlightedIndex(-1);
    }
  };

  const handleClearSearch = () => {
    setPairSearch('');
    setSelectedQuoteCurrency('');
    setHighlightedIndex(-1);
    searchInputRef.current?.focus();
  };

  const handleRemovePair = (pair: string) => {
    const newPairs = config.pairs.filter((p) => p !== pair);
    const newConfig = { ...config, pairs: newPairs };
    onChange(newConfig);
    validateConfig(newConfig);
  };

  const handlePairModeChange = (mode: 'single' | 'multiple') => {
    let newPairs = config.pairs;
    
    if (mode === 'single' && config.pairs.length > 1) {
      newPairs = [config.pairs[0]];
    }
    
    const newConfig = { ...config, pairMode: mode, pairs: newPairs };
    onChange(newConfig);
    validateConfig(newConfig);
  };

  const formatPairDisplay = (pair: string) => {
    // Convert BTCUSDT to BTC/USDT format
    if (pair.length >= 6) {
      const quote = pair.slice(-4);
      const base = pair.slice(0, -4);
      return `${base}/${quote}`;
    }
    return pair;
  };

  // Get current exchange value for select
  const getCurrentExchangeValue = () => {
    if (!config.exchange) return '';
    
    // Find matching connection
    const connection = connections.find(conn => {
      const connLabel = conn.nickname 
        ? `${conn.nickname} | ${conn.exchange}`
        : conn.exchange;
      return config.exchange.includes(connLabel);
    });
    
    if (connection) {
      return `${connection.id}_${config.market}`;
    }
    
    return '';
  };

  const exchangeOptions = getExchangeOptions();
  const connectedExchanges = connections.filter(c => c.status === 'connected');

  return (
    <div className={`space-y-4 ${className}`}>
      {showTitle && (
        <div className="flex items-center gap-3 mb-4">
          <div className={`p-2 rounded-lg ${isDark ? 'bg-blue-500/20' : 'bg-blue-100'}`}>
            <Settings className={`w-5 h-5 ${isDark ? 'text-blue-400' : 'text-blue-600'}`} />
          </div>
          <div>
            <h3 className={`font-semibold text-lg ${isDark ? 'text-white' : 'text-gray-900'}`}>
              Bot Configuration
            </h3>
            <p className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-600'} mt-0.5`}>
              Configure your bot's core trading parameters
            </p>
          </div>
        </div>
      )}

      {/* Bot Name */}
      <div>
        <label className={`text-sm font-medium ${isDark ? 'text-gray-300' : 'text-gray-700'} mb-2 block`}>
          Bot Name
        </label>
        <Input
          value={config.botName}
          onChange={(e) => onChange({ ...config, botName: e.target.value })}
          className={isDark ? 'bg-gray-800 border-gray-700 text-white' : ''}
          placeholder="My Trading Bot"
        />
      </div>

      {/* Exchange and Market Type */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className={`text-sm font-medium ${isDark ? 'text-gray-300' : 'text-gray-700'} mb-2 block`}>
            Exchange <span className="text-red-500">*</span>
          </label>
          <Select
            value={getCurrentExchangeValue()}
            onValueChange={handleExchangeChange}
            disabled={loadingConnections || connectedExchanges.length === 0}
          >
            <SelectTrigger 
              className={`${isDark ? 'bg-gray-800 border-gray-700 text-white' : ''} ${
                errors.exchange ? 'border-red-500' : ''
              }`}
            >
              <SelectValue placeholder={loadingConnections ? 'Loading...' : connectedExchanges.length === 0 ? 'No connections' : 'Select exchange'} />
            </SelectTrigger>
            <SelectContent>
              {exchangeOptions.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
              {connectedExchanges.length === 0 && !loadingConnections && (
                <SelectItem value="no-connections" disabled>
                  No connected exchanges available
                </SelectItem>
              )}
            </SelectContent>
          </Select>
          {errors.exchange && (
            <div className="flex items-center gap-1 mt-1">
              <AlertCircle className="w-3 h-3 text-red-500" />
              <p className={`text-xs text-red-500`}>{errors.exchange}</p>
            </div>
          )}
          {connectedExchanges.length === 0 && !loadingConnections && (
            <p className={`text-xs mt-1 ${isDark ? 'text-amber-400' : 'text-amber-600'}`}>
              Connect an exchange first
            </p>
          )}
        </div>

        <div>
          <label className={`text-sm font-medium ${isDark ? 'text-gray-300' : 'text-gray-700'} mb-2 block`}>
            Market Type
          </label>
          <Select
            value={config.market}
            onValueChange={handleMarketChange}
            disabled={!config.exchange}
          >
            <SelectTrigger className={isDark ? 'bg-gray-800 border-gray-700 text-white' : ''}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="spot">Spot</SelectItem>
              <SelectItem value="futures">Futures</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Direction - Only show for Futures */}
      {config.market === 'futures' && (
        <div>
          <label className={`text-sm font-medium ${isDark ? 'text-gray-300' : 'text-gray-700'} mb-2 block`}>
            Direction <span className="text-red-500">*</span>
          </label>
          <div className="flex gap-2">
            <Button
              type="button"
              variant={config.direction === 'long' ? 'default' : 'outline'}
              onClick={() => handleDirectionChange('long')}
              className="flex-1"
            >
              <TrendingUp className="w-4 h-4 mr-2" />
              Long
            </Button>
            <Button
              type="button"
              variant={config.direction === 'short' ? 'default' : 'outline'}
              onClick={() => handleDirectionChange('short')}
              className="flex-1"
            >
              <TrendingDown className="w-4 h-4 mr-2" />
              Short
            </Button>
          </div>
          {errors.direction && (
            <div className="flex items-center gap-1 mt-1">
              <AlertCircle className="w-3 h-3 text-red-500" />
              <p className={`text-xs text-red-500`}>{errors.direction}</p>
            </div>
          )}
        </div>
      )}

      {/* Pair Mode Toggle */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <label className={`text-sm font-medium ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
            Trading Pairs <span className="text-red-500">*</span>
          </label>
          <div className="flex gap-2">
            <Button
              type="button"
              variant={config.pairMode === 'single' ? 'default' : 'outline'}
              size="sm"
              onClick={() => handlePairModeChange('single')}
            >
              Single
            </Button>
            <Button
              type="button"
              variant={config.pairMode === 'multiple' ? 'default' : 'outline'}
              size="sm"
              onClick={() => handlePairModeChange('multiple')}
            >
              Multiple
            </Button>
          </div>
        </div>

        {/* Selected Pairs */}
        {config.pairs.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-2">
            {config.pairs.map((pair) => (
              <div
                key={pair}
                className={`px-3 py-1.5 rounded-lg border flex items-center gap-2 ${
                  isDark
                    ? 'border-gray-700 bg-gray-800 text-white'
                    : 'border-gray-200 bg-white text-gray-900'
                }`}
              >
                <span className="text-sm font-medium">{formatPairDisplay(pair)}</span>
                <button
                  onClick={() => handleRemovePair(pair)}
                  className={`hover:opacity-70 transition-opacity ${
                    isDark ? 'text-gray-400' : 'text-gray-600'
                  }`}
                  type="button"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Add Pair Button and Dropdown */}
        <div className="relative" ref={dropdownRef}>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setShowPairDropdown(!showPairDropdown)}
            className="w-full justify-between"
            disabled={!config.exchange}
          >
            <span className="flex items-center gap-2">
              <Plus className="w-4 h-4" />
              Add {config.pairMode === 'single' ? 'Pair' : 'Pairs'}
            </span>
            <ChevronDown className={`w-4 h-4 transition-transform ${showPairDropdown ? 'rotate-180' : ''}`} />
          </Button>

          {showPairDropdown && (
            <div
              className={`absolute z-50 w-full mt-2 rounded-lg border shadow-xl ${
                isDark
                  ? 'bg-gray-800 border-gray-700'
                  : 'bg-white border-gray-200'
              } max-h-96 overflow-hidden flex flex-col`}
            >
              {/* Search and Filter */}
              <div className="p-3 border-b border-gray-700/50 space-y-3">
                <div className="relative">
                  <Search className={`absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 ${
                    isDark ? 'text-gray-400' : 'text-gray-500'
                  }`} />
                  <Input
                    ref={searchInputRef}
                    value={pairSearch}
                    onChange={(e) => setPairSearch(e.target.value)}
                    placeholder="Search by symbol (BTC), pair (BTC/USDT), or quote (USDT)..."
                    className={`pl-9 pr-9 ${isDark ? 'bg-gray-900 border-gray-700 text-white' : ''}`}
                    onKeyDown={(e) => {
                      if (e.key === 'Escape') {
                        setShowPairDropdown(false);
                      }
                    }}
                  />
                  {pairSearch && (
                    <button
                      type="button"
                      onClick={handleClearSearch}
                      className={`absolute right-3 top-1/2 transform -translate-y-1/2 ${
                        isDark ? 'text-gray-400 hover:text-gray-300' : 'text-gray-500 hover:text-gray-700'
                      }`}
                    >
                      <X className="w-4 h-4" />
                    </button>
                  )}
                </div>
                
                {/* Quick filters and stats */}
                <div className="flex items-center justify-between">
                  {quoteCurrencies.length > 0 && (
                    <div className="flex gap-2 flex-wrap flex-1">
                      <Button
                        type="button"
                        variant={selectedQuoteCurrency === '' ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => {
                          setSelectedQuoteCurrency('');
                          setHighlightedIndex(-1);
                        }}
                      >
                        All
                      </Button>
                      {quoteCurrencies.map((quote) => (
                        <Button
                          key={quote}
                          type="button"
                          variant={selectedQuoteCurrency === quote ? 'default' : 'outline'}
                          size="sm"
                          onClick={() => {
                            setSelectedQuoteCurrency(quote);
                            setHighlightedIndex(-1);
                          }}
                        >
                          {quote}
                        </Button>
                      ))}
                    </div>
                  )}
                  <div className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-600'} ml-2`}>
                    {filteredPairs.length} {filteredPairs.length === 1 ? 'pair' : 'pairs'}
                  </div>
                </div>
              </div>

              {/* Pairs List */}
              <div ref={pairListRef} className="overflow-y-auto max-h-64">
                {loadingPairs ? (
                  <div className={`p-4 text-center ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                    <div className="flex items-center justify-center gap-2">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-500"></div>
                      Loading pairs...
                    </div>
                  </div>
                ) : filteredPairs.length === 0 ? (
                  <div className={`p-4 text-center ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                    <p className="mb-1">No pairs found</p>
                    {pairSearch && (
                      <p className="text-xs">Try a different search term</p>
                    )}
                  </div>
                ) : (
                  <>
                    {/* Popular pairs section (only if no search) */}
                    {!pairSearch && !selectedQuoteCurrency && (
                      <div className={`px-3 py-2 border-b ${isDark ? 'border-gray-700/50' : 'border-gray-200'}`}>
                        <div className="flex items-center gap-2 mb-2">
                          <Star className={`w-3 h-3 ${isDark ? 'text-yellow-400' : 'text-yellow-500'}`} />
                          <span className={`text-xs font-medium ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                            Popular Pairs
                          </span>
                        </div>
                        <div className="flex flex-wrap gap-1">
                          {popularPairs.slice(0, 8).map((pair) => {
                            if (!availablePairs.includes(pair)) return null;
                            const isSelected = config.pairs.includes(pair);
                            return (
                              <button
                                key={pair}
                                type="button"
                                onClick={() => handleAddPair(pair)}
                                className={`px-2 py-1 rounded text-xs transition-colors ${
                                  isSelected
                                    ? isDark
                                      ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
                                      : 'bg-blue-50 text-blue-600 border border-blue-200'
                                    : isDark
                                    ? 'bg-gray-700/50 text-gray-300 hover:bg-gray-700 border border-gray-600'
                                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200 border border-gray-300'
                                }`}
                              >
                                {formatPairDisplay(pair)}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    )}
                    
                    {/* All pairs list */}
                    <div>
                      {filteredPairs.map((pair, index) => {
                        const isSelected = config.pairs.includes(pair);
                        const isDisabled = config.pairMode === 'single' && config.pairs.length > 0 && !isSelected;
                        const isHighlighted = index === highlightedIndex;
                        const isPopular = popularPairs.includes(pair);
                        
                        return (
                          <button
                            key={pair}
                            type="button"
                            onClick={() => !isDisabled && handleAddPair(pair)}
                            disabled={isDisabled}
                            className={`w-full text-left px-4 py-2.5 transition-colors ${
                              isHighlighted
                                ? isDark
                                  ? 'bg-blue-500/30 border-l-2 border-blue-400'
                                  : 'bg-blue-100 border-l-2 border-blue-500'
                                : isSelected
                                ? isDark
                                  ? 'bg-blue-500/20 text-blue-400'
                                  : 'bg-blue-50 text-blue-600'
                                : isDisabled
                                ? isDark
                                  ? 'text-gray-600 cursor-not-allowed opacity-50'
                                  : 'text-gray-400 cursor-not-allowed opacity-50'
                                : isDark
                                ? 'text-gray-300 hover:bg-gray-700/50'
                                : 'text-gray-900 hover:bg-gray-50'
                            }`}
                          >
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                {isPopular && !pairSearch && (
                                  <Star className={`w-3 h-3 ${isDark ? 'text-yellow-400' : 'text-yellow-500'}`} />
                                )}
                                <span className="font-medium">
                                  {highlightMatch(pair, pairSearch)}
                                </span>
                              </div>
                              <div className="flex items-center gap-2">
                                {isSelected && (
                                  <span className={`text-xs px-2 py-0.5 rounded ${
                                    isDark ? 'bg-blue-500/20 text-blue-400' : 'bg-blue-100 text-blue-600'
                                  }`}>
                                    Selected
                                  </span>
                                )}
                                {isHighlighted && (
                                  <span className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                                    Press Enter
                                  </span>
                                )}
                              </div>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </>
                )}
              </div>
              
              {/* Footer hint */}
              {filteredPairs.length > 0 && (
                <div className={`px-3 py-2 border-t ${isDark ? 'border-gray-700/50 bg-gray-900/50' : 'border-gray-200 bg-gray-50'} text-xs ${isDark ? 'text-gray-500' : 'text-gray-600'}`}>
                  <div className="flex items-center justify-between">
                    <span>Use ↑↓ to navigate, Enter to select</span>
                    <span>ESC to close</span>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {errors.pairs && (
          <div className="flex items-center gap-1 mt-1">
            <AlertCircle className="w-3 h-3 text-red-500" />
            <p className={`text-xs text-red-500`}>{errors.pairs}</p>
          </div>
        )}
        {config.pairs.length === 0 && !errors.pairs && (
          <p className={`text-xs mt-2 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
            {config.pairMode === 'single'
              ? 'Select one trading pair to start'
              : 'Select one or more trading pairs to start'}
          </p>
        )}
      </div>
    </div>
  );
};

export default BotConfiguration;
