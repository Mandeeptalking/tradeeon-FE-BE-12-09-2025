import React, { useState } from 'react';
import { Button } from '../ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Bell, TrendingUp, TrendingDown } from 'lucide-react';

interface SimpleAlertCreatorProps {
  onAlertCreated?: (alert: any) => void;
}

export default function SimpleAlertCreator({ onAlertCreated }: SimpleAlertCreatorProps) {
  const [symbol, setSymbol] = useState('BTCUSDT');
  const [condition, setCondition] = useState('price_above');
  const [value, setValue] = useState('');
  const [timeframe, setTimeframe] = useState('1h');
  const [isCreating, setIsCreating] = useState(false);

  const handleCreateAlert = async () => {
    if (!value || !symbol) {
      alert('Please fill in all fields');
      return;
    }

    setIsCreating(true);
    
    try {
      // Simulate API call with local storage (works without backend)
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Create alert object
      const alertData = {
        id: `alert_${Date.now()}`,
        symbol,
        condition,
        value: parseFloat(value),
        timeframe,
        status: 'active',
        created_at: new Date().toISOString(),
        message: generateAlertMessage()
      };

      // Store in localStorage for persistence
      const existingAlerts = JSON.parse(localStorage.getItem('simple_alerts') || '[]');
      existingAlerts.push(alertData);
      localStorage.setItem('simple_alerts', JSON.stringify(existingAlerts));
      
      // Show success message
      alert(`✅ Alert created successfully!\n\n${alertData.message}`);
      
      // Call callback if provided
      if (onAlertCreated) {
        onAlertCreated(alertData);
      }
      
      // Reset form
      setValue('');
      
    } catch (error) {
      console.error('Error creating alert:', error);
      alert('Failed to create alert. Please try again.');
    } finally {
      setIsCreating(false);
    }
  };

  const generateAlertMessage = () => {
    const conditionText = {
      price_above: `Price goes above $${value}`,
      price_below: `Price goes below $${value}`,
      price_increases: `Price increases by ${value}%`,
      price_decreases: `Price decreases by ${value}%`
    };
    
    return `Alert for ${symbol}: ${conditionText[condition as keyof typeof conditionText]} on ${timeframe} timeframe`;
  };

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Bell className="w-5 h-5 text-blue-600" />
          Create Simple Alert
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Symbol Selection */}
        <div>
          <Label htmlFor="symbol">Trading Pair</Label>
          <Select value={symbol} onValueChange={setSymbol}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="BTCUSDT">BTC/USDT</SelectItem>
              <SelectItem value="ETHUSDT">ETH/USDT</SelectItem>
              <SelectItem value="ADAUSDT">ADA/USDT</SelectItem>
              <SelectItem value="SOLUSDT">SOL/USDT</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Condition Selection */}
        <div>
          <Label htmlFor="condition">Alert Condition</Label>
          <Select value={condition} onValueChange={setCondition}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="price_above">
                <div className="flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-green-600" />
                  Price goes above
                </div>
              </SelectItem>
              <SelectItem value="price_below">
                <div className="flex items-center gap-2">
                  <TrendingDown className="w-4 h-4 text-red-600" />
                  Price goes below
                </div>
              </SelectItem>
              <SelectItem value="price_increases">Price increases by %</SelectItem>
              <SelectItem value="price_decreases">Price decreases by %</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Value Input */}
        <div>
          <Label htmlFor="value">
            {condition.includes('price_') ? 'Price ($)' : 'Percentage (%)'}
          </Label>
          <Input
            id="value"
            type="number"
            placeholder={condition.includes('price_') ? '50000' : '5'}
            value={value}
            onChange={(e) => setValue(e.target.value)}
          />
        </div>

        {/* Timeframe Selection */}
        <div>
          <Label htmlFor="timeframe">Timeframe</Label>
          <Select value={timeframe} onValueChange={setTimeframe}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="1m">1 Minute</SelectItem>
              <SelectItem value="5m">5 Minutes</SelectItem>
              <SelectItem value="15m">15 Minutes</SelectItem>
              <SelectItem value="1h">1 Hour</SelectItem>
              <SelectItem value="4h">4 Hours</SelectItem>
              <SelectItem value="1d">1 Day</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Preview */}
        {value && (
          <div className="bg-blue-50 p-3 rounded-lg border border-blue-200">
            <p className="text-sm text-blue-800 font-medium">Alert Preview:</p>
            <p className="text-sm text-blue-600">{generateAlertMessage()}</p>
          </div>
        )}

        {/* Create Button */}
        <Button 
          onClick={handleCreateAlert}
          disabled={isCreating || !value}
          className="w-full"
        >
          {isCreating ? 'Creating Alert...' : 'Create Alert'}
        </Button>
      </CardContent>
    </Card>
  );
}
