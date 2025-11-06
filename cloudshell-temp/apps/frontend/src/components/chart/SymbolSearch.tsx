import React, { useState, useRef, useEffect } from 'react';
import { Search, TrendingUp, X } from 'lucide-react';
import { BINANCE_SYMBOLS, USDT_PAIRS, BTC_PAIRS, ETH_PAIRS, EUR_PAIRS, GBP_PAIRS, USDC_PAIRS, TRY_PAIRS, FDUSD_PAIRS, BNB_PAIRS, searchSymbols, getSymbolInfo } from '../../lib/symbols/binanceSymbols';

interface SymbolSearchProps {
  theme: 'dark' | 'light';
  value: string;
  onChange: (symbol: string) => void;
  className?: string;
}

const SymbolSearch: React.FC<SymbolSearchProps> = ({ 
  theme, 
  value, 
  onChange, 
  className = '' 
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState(value);
  const [filteredPairs, setFilteredPairs] = useState<string[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  
  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Filter pairs based on search term using smart search
  useEffect(() => {
    const results = searchSymbols(searchTerm, 30); // Get up to 30 results
    setFilteredPairs(results);
    setSelectedIndex(-1);
  }, [searchTerm]);

  // Handle keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!isOpen) {
      if (e.key === 'ArrowDown' || e.key === 'Enter') {
        setIsOpen(true);
        e.preventDefault();
      }
      return;
    }

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setSelectedIndex(prev => 
          prev < filteredPairs.length - 1 ? prev + 1 : 0
        );
        break;
      case 'ArrowUp':
        e.preventDefault();
        setSelectedIndex(prev => 
          prev > 0 ? prev - 1 : filteredPairs.length - 1
        );
        break;
      case 'Enter':
        e.preventDefault();
        if (selectedIndex >= 0 && filteredPairs[selectedIndex]) {
          handleSelect(filteredPairs[selectedIndex]);
        } else if (searchTerm) {
          handleSelect(searchTerm.toUpperCase());
        }
        break;
      case 'Escape':
        setIsOpen(false);
        setSelectedIndex(-1);
        inputRef.current?.blur();
        break;
    }
  };

  // Handle pair selection
  const handleSelect = (pair: string) => {
    const upperPair = pair.toUpperCase();
    console.log(`🔍 SymbolSearch: Selecting ${upperPair}`);
    setSearchTerm(upperPair);
    setIsOpen(false);
    setSelectedIndex(-1);
    
    // Call onChange with slight delay to ensure state is updated
    setTimeout(() => {
      onChange(upperPair);
      console.log(`✅ SymbolSearch: Called onChange with ${upperPair}`);
    }, 10);
    
    inputRef.current?.blur();
  };

  // Handle input change
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value.toUpperCase();
    setSearchTerm(newValue);
    if (!isOpen && newValue) {
      setIsOpen(true);
    }
  };

  // Handle input focus
  const handleFocus = () => {
    setIsOpen(true);
  };

  // Handle input blur (with delay for dropdown clicks)
  const handleBlur = () => {
    setTimeout(() => {
      setIsOpen(false);
      setSelectedIndex(-1);
    }, 200); // Increased delay to ensure clicks register
  };

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current && 
        !dropdownRef.current.contains(event.target as Node) &&
        inputRef.current &&
        !inputRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const themeClasses = {
    input: theme === 'dark' 
      ? 'bg-gray-700 border-gray-600 text-white focus:ring-blue-500 focus:border-blue-500' 
      : 'bg-white border-gray-300 text-gray-900 focus:ring-blue-500 focus:border-blue-500',
    dropdown: theme === 'dark' 
      ? 'bg-gray-800 border-gray-600 text-white' 
      : 'bg-white border-gray-300 text-gray-900',
    item: theme === 'dark' 
      ? 'hover:bg-gray-700 text-gray-300' 
      : 'hover:bg-gray-100 text-gray-700',
    selectedItem: theme === 'dark' 
      ? 'bg-blue-600 text-white' 
      : 'bg-blue-500 text-white',
    category: theme === 'dark' 
      ? 'text-gray-400 bg-gray-900' 
      : 'text-gray-600 bg-gray-50',
  };

  return (
    <div className={`relative ${className}`}>
      {/* Search Input */}
      <div className="relative">
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
          <Search className="h-4 w-4 text-gray-400" />
        </div>
        <input
          ref={inputRef}
          type="text"
          value={searchTerm}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          onFocus={handleFocus}
          onBlur={handleBlur}
          placeholder="Search trading pairs..."
          className={`
            ${themeClasses.input} 
            w-full pl-10 pr-10 py-2.5 text-sm rounded-lg border 
            focus:outline-none focus:ring-2 transition-colors
            font-mono tracking-wide
          `}
        />
        {searchTerm && (
          <button
            onClick={() => {
              setSearchTerm('');
              setIsOpen(false);
              inputRef.current?.focus();
            }}
            className="absolute inset-y-0 right-0 pr-3 flex items-center"
          >
            <X className="h-4 w-4 text-gray-400 hover:text-gray-600 transition-colors" />
          </button>
        )}
      </div>

      {/* Dropdown */}
      {isOpen && (
        <div 
          ref={dropdownRef}
          className={`
            absolute top-full left-0 right-0 mt-1 ${themeClasses.dropdown} 
            border rounded-lg shadow-lg z-50 max-h-80 overflow-y-auto
          `}
        >
          {filteredPairs.length > 0 ? (
            <>
              {/* Category Headers */}
              <div className={`${themeClasses.category} px-3 py-2 text-xs font-semibold uppercase tracking-wide border-b flex justify-between items-center`}>
                <span>{!searchTerm ? 'Popular Pairs' : 'Search Results'}</span>
                <span className="text-blue-400">
                  {filteredPairs.length} of {BINANCE_SYMBOLS.length} pairs
                </span>
              </div>
              
              {/* Pairs List */}
              <div className="py-1">
                {filteredPairs.map((pair, index) => {
                  const isSelected = index === selectedIndex;
                  const symbolInfo = getSymbolInfo(pair);
                  
                  return (
                    <button
                      key={pair}
                      onMouseDown={(e) => {
                        e.preventDefault(); // Prevent blur from firing
                        console.log(`🖱️ Clicking on ${pair}`);
                        handleSelect(pair);
                      }}
                      className={`
                        w-full px-3 py-2 text-left text-sm transition-colors flex items-center justify-between
                        ${isSelected ? themeClasses.selectedItem : themeClasses.item}
                      `}
                    >
                      <div className="flex items-center space-x-2">
                        <span className="font-mono font-medium">{pair}</span>
                        {symbolInfo.isPopular && (
                          <TrendingUp className="w-3 h-3 text-orange-400" />
                        )}
                      </div>
                      <div className="text-xs opacity-60">
                        {symbolInfo.category}
                      </div>
                    </button>
                  );
                })}
              </div>
              
              {/* Quick Categories */}
              {!searchTerm && (
                <div className={`${themeClasses.category} border-t px-3 py-2`}>
                  <div className="text-xs font-semibold mb-2">Quick Categories</div>
                  <div className="flex flex-wrap gap-1">
                    <button
                      onMouseDown={() => setSearchTerm('USDT')}
                      className={`px-2 py-1 text-xs rounded ${
                        theme === 'dark' ? 'bg-gray-700 hover:bg-gray-600' : 'bg-gray-200 hover:bg-gray-300'
                      } transition-colors`}
                    >
                      USDT ({USDT_PAIRS.length})
                    </button>
                    <button
                      onMouseDown={() => setSearchTerm('BTC')}
                      className={`px-2 py-1 text-xs rounded ${
                        theme === 'dark' ? 'bg-gray-700 hover:bg-gray-600' : 'bg-gray-200 hover:bg-gray-300'
                      } transition-colors`}
                    >
                      BTC ({BTC_PAIRS.length})
                    </button>
                    <button
                      onMouseDown={() => setSearchTerm('ETH')}
                      className={`px-2 py-1 text-xs rounded ${
                        theme === 'dark' ? 'bg-gray-700 hover:bg-gray-600' : 'bg-gray-200 hover:bg-gray-300'
                      } transition-colors`}
                    >
                      ETH ({ETH_PAIRS.length})
                    </button>
                    <button
                      onMouseDown={() => setSearchTerm('EUR')}
                      className={`px-2 py-1 text-xs rounded ${
                        theme === 'dark' ? 'bg-gray-700 hover:bg-gray-600' : 'bg-gray-200 hover:bg-gray-300'
                      } transition-colors`}
                    >
                      EUR ({EUR_PAIRS.length})
                    </button>
                    <button
                      onMouseDown={() => setSearchTerm('GBP')}
                      className={`px-2 py-1 text-xs rounded ${
                        theme === 'dark' ? 'bg-gray-700 hover:bg-gray-600' : 'bg-gray-200 hover:bg-gray-300'
                      } transition-colors`}
                    >
                      GBP ({GBP_PAIRS.length})
                    </button>
                    <button
                      onMouseDown={() => setSearchTerm('USDC')}
                      className={`px-2 py-1 text-xs rounded ${
                        theme === 'dark' ? 'bg-gray-700 hover:bg-gray-600' : 'bg-gray-200 hover:bg-gray-300'
                      } transition-colors`}
                    >
                      USDC ({USDC_PAIRS.length})
                    </button>
                    <button
                      onMouseDown={() => setSearchTerm('TRY')}
                      className={`px-2 py-1 text-xs rounded ${
                        theme === 'dark' ? 'bg-gray-700 hover:bg-gray-600' : 'bg-gray-200 hover:bg-gray-300'
                      } transition-colors`}
                    >
                      TRY ({TRY_PAIRS.length})
                    </button>
                    <button
                      onMouseDown={() => setSearchTerm('FDUSD')}
                      className={`px-2 py-1 text-xs rounded ${
                        theme === 'dark' ? 'bg-gray-700 hover:bg-gray-600' : 'bg-gray-200 hover:bg-gray-300'
                      } transition-colors`}
                    >
                      FDUSD ({FDUSD_PAIRS.length})
                    </button>
                    <button
                      onMouseDown={() => setSearchTerm('BNB')}
                      className={`px-2 py-1 text-xs rounded ${
                        theme === 'dark' ? 'bg-gray-700 hover:bg-gray-600' : 'bg-gray-200 hover:bg-gray-300'
                      } transition-colors`}
                    >
                      BNB ({BNB_PAIRS.length})
                    </button>
                  </div>
                </div>
              )}
            </>
          ) : (
            <div className="px-3 py-4 text-center text-sm text-gray-500">
              <div className="flex flex-col items-center space-y-2">
                <Search className="w-8 h-8 text-gray-400" />
                <div>No pairs found for "{searchTerm}"</div>
                <div className="text-xs">Try searching for BTC, ETH, or USDT pairs</div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default SymbolSearch;
