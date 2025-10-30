import { useState, useEffect } from 'react';
import { Search, X, Filter } from 'lucide-react';
import { Input } from '../ui/input';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../ui/select';
import type { BotFilters } from '../../lib/api/bots';

interface BotFiltersProps {
  filters: BotFilters;
  onFiltersChange: (filters: BotFilters) => void;
  className?: string;
}

const EXCHANGES = ['All', 'Binance', 'Zerodha', 'KuCoin'];
const STATUSES = ['All', 'Running', 'Paused', 'Stopped'];
const POPULAR_PAIRS = ['BTCUSDT', 'ETHUSDT', 'NIFTY50', 'SOLUSDT', 'ADAUSDT'];

export default function BotFilters({ filters, onFiltersChange, className = '' }: BotFiltersProps) {
  const [searchTerm, setSearchTerm] = useState(filters.search);

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => {
      onFiltersChange({ ...filters, search: searchTerm });
    }, 250);

    return () => clearTimeout(timer);
  }, [searchTerm]);

  // Persist filters to localStorage
  useEffect(() => {
    localStorage.setItem('bots.filters', JSON.stringify(filters));
  }, [filters]);

  const handleExchangeChange = (exchange: string) => {
    onFiltersChange({ ...filters, exchange });
  };

  const handleStatusChange = (status: string) => {
    onFiltersChange({ ...filters, status });
  };

  const handlePairClick = (pair: string) => {
    setSearchTerm(pair);
    onFiltersChange({ ...filters, search: pair });
  };

  const handleClearAll = () => {
    setSearchTerm('');
    onFiltersChange({ search: '', exchange: 'All', status: 'All' });
  };

  const hasActiveFilters = filters.search || filters.exchange !== 'All' || filters.status !== 'All';

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Search and Dropdowns */}
      <div className="flex flex-col sm:flex-row gap-4">
        {/* Search Input */}
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search bots or pairs..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 pr-10"
          />
          {searchTerm && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setSearchTerm('')}
              className="absolute right-1 top-1/2 transform -translate-y-1/2 h-6 w-6 p-0 hover:bg-muted"
            >
              <X className="h-3 w-3" />
            </Button>
          )}
        </div>

        {/* Exchange Filter */}
        <Select value={filters.exchange} onValueChange={handleExchangeChange}>
          <SelectTrigger className="w-full sm:w-[140px]">
            <SelectValue placeholder="Exchange" />
          </SelectTrigger>
          <SelectContent>
            {EXCHANGES.map((exchange) => (
              <SelectItem key={exchange} value={exchange}>
                {exchange}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Status Filter */}
        <Select value={filters.status} onValueChange={handleStatusChange}>
          <SelectTrigger className="w-full sm:w-[120px]">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            {STATUSES.map((status) => (
              <SelectItem key={status} value={status}>
                {status}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Clear All */}
        {hasActiveFilters && (
          <Button
            variant="outline"
            size="sm"
            onClick={handleClearAll}
            className="w-full sm:w-auto"
          >
            <Filter className="h-4 w-4 mr-2" />
            Clear All
          </Button>
        )}
      </div>

      {/* Popular Pairs Tags */}
      <div className="flex flex-wrap gap-2">
        <span className="text-sm text-muted-foreground mr-2">Quick pairs:</span>
        {POPULAR_PAIRS.map((pair) => (
          <Badge
            key={pair}
            variant={filters.search === pair ? 'default' : 'secondary'}
            className="cursor-pointer hover:bg-primary/20 transition-colors"
            onClick={() => handlePairClick(pair)}
          >
            {pair}
          </Badge>
        ))}
      </div>

      {/* Active Filters Display */}
      {hasActiveFilters && (
        <div className="flex flex-wrap gap-2 pt-2 border-t">
          <span className="text-sm text-muted-foreground mr-2">Active filters:</span>
          {filters.search && (
            <Badge variant="outline" className="gap-1">
              Search: {filters.search}
              <X
                className="h-3 w-3 cursor-pointer hover:text-destructive"
                onClick={() => {
                  setSearchTerm('');
                  onFiltersChange({ ...filters, search: '' });
                }}
              />
            </Badge>
          )}
          {filters.exchange !== 'All' && (
            <Badge variant="outline" className="gap-1">
              Exchange: {filters.exchange}
              <X
                className="h-3 w-3 cursor-pointer hover:text-destructive"
                onClick={() => handleExchangeChange('All')}
              />
            </Badge>
          )}
          {filters.status !== 'All' && (
            <Badge variant="outline" className="gap-1">
              Status: {filters.status}
              <X
                className="h-3 w-3 cursor-pointer hover:text-destructive"
                onClick={() => handleStatusChange('All')}
              />
            </Badge>
          )}
        </div>
      )}
    </div>
  );
}


