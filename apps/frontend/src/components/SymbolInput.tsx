import React, { useState, useEffect, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Badge } from './ui/badge';
import { Search, Check, X, AlertCircle } from 'lucide-react';
import { fetchAllSymbols, validateSymbol } from '../lib/api/analytics';

interface SymbolInputProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
}

const SymbolInput: React.FC<SymbolInputProps> = ({
  label,
  value,
  onChange,
  placeholder = "BTCUSDT",
  className = ""
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [isValidating, setIsValidating] = useState(false);
  const [isValid, setIsValid] = useState<boolean | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Fetch all available symbols
  const { data: allSymbols = [] } = useQuery<string[]>({
    queryKey: ['symbols'],
    queryFn: fetchAllSymbols,
    staleTime: 5 * 60 * 1000, // 5 minutes
    retry: 2,
  });

  // Filter symbols based on search term
  const filteredSymbols = allSymbols.filter(symbol =>
    symbol.toLowerCase().includes(searchTerm.toLowerCase())
  ).slice(0, 20); // Limit to 20 results for performance

  // Validate symbol when it changes
  useEffect(() => {
    const validateCurrentSymbol = async () => {
      if (!value || value.length < 3) {
        setIsValid(null);
        return;
      }

      setIsValidating(true);
      try {
        const valid = await validateSymbol(value);
        setIsValid(valid);
      } catch (error) {
        setIsValid(false);
      } finally {
        setIsValidating(false);
      }
    };

    const timeoutId = setTimeout(validateCurrentSymbol, 500); // Debounce validation
    return () => clearTimeout(timeoutId);
  }, [value]);

  // Handle input change
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value.toUpperCase();
    onChange(newValue);
    setSearchTerm(newValue);
    setIsOpen(newValue.length > 0);
  };

  // Handle symbol selection
  const handleSymbolSelect = (symbol: string) => {
    onChange(symbol);
    setSearchTerm('');
    setIsOpen(false);
    inputRef.current?.blur();
  };

  // Handle click outside to close dropdown
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node) &&
        !inputRef.current?.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className={`relative ${className}`}>
      <Label htmlFor={label.toLowerCase()}>{label}</Label>
      <div className="relative mt-1">
        <Input
          ref={inputRef}
          id={label.toLowerCase()}
          value={value}
          onChange={handleInputChange}
          placeholder={placeholder}
          className={`pr-10 ${
            isValid === true ? 'border-green-500 focus:border-green-500' :
            isValid === false ? 'border-red-500 focus:border-red-500' :
            'border-gray-300'
          }`}
          onFocus={() => {
            if (value.length > 0) {
              setSearchTerm(value);
              setIsOpen(true);
            }
          }}
        />
        
        {/* Validation Icon */}
        <div className="absolute inset-y-0 right-0 pr-3 flex items-center">
          {isValidating ? (
            <div className="animate-spin h-4 w-4 border-2 border-blue-500 border-t-transparent rounded-full"></div>
          ) : isValid === true ? (
            <Check className="h-4 w-4 text-green-500" />
          ) : isValid === false ? (
            <X className="h-4 w-4 text-red-500" />
          ) : (
            <Search className="h-4 w-4 text-gray-400" />
          )}
        </div>
      </div>

      {/* Validation Message */}
      {isValid === false && (
        <div className="mt-1 flex items-center space-x-1 text-sm text-red-600">
          <AlertCircle className="h-3 w-3" />
          <span>Symbol not found or invalid</span>
        </div>
      )}

      {/* Symbol Suggestions Dropdown */}
      {isOpen && filteredSymbols.length > 0 && (
        <div
          ref={dropdownRef}
          className="absolute z-50 mt-1 w-full bg-white border border-gray-300 rounded-md shadow-lg max-h-60 overflow-y-auto"
        >
          {filteredSymbols.map((symbol) => (
            <button
              key={symbol}
              onClick={() => handleSymbolSelect(symbol)}
              className="w-full text-left px-4 py-2 hover:bg-gray-100 focus:bg-gray-100 focus:outline-none text-sm"
            >
              <div className="flex items-center justify-between">
                <span className="font-medium">{symbol}</span>
                <Badge variant="secondary" className="text-xs">
                  {symbol.endsWith('USDT') ? 'USDT' : 
                   symbol.endsWith('BTC') ? 'BTC' :
                   symbol.endsWith('ETH') ? 'ETH' : 'Other'}
                </Badge>
              </div>
            </button>
          ))}
          
          {searchTerm && !filteredSymbols.some(s => s === searchTerm) && searchTerm.length >= 3 && (
            <div className="px-4 py-2 text-sm text-gray-500 border-t">
              <div className="flex items-center space-x-2">
                <Search className="h-3 w-3" />
                <span>Type to search symbols...</span>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default SymbolInput;

