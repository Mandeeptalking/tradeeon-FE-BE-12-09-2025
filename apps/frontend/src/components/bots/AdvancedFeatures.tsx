import React, { useState, useCallback } from 'react';
import {
  Gauge,
  LineChart,
  TrendingUp,
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  Target,
  DollarSign,
  Zap,
} from 'lucide-react';
import { useThemeStore } from '../../store/theme';
import { Label } from '../ui/label';
import { Input } from '../ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../ui/select';
import Tooltip from '../../components/Tooltip';

export interface AdvancedFeaturesData {
  // Market Regime Detection
  enableMarketRegime: boolean;
  marketRegimeSensitivity?: 'low' | 'medium' | 'high';
  marketRegimeIndicators?: string[]; // e.g., ['volatility', 'trend', 'volume']
  
  // Dynamic Scaling
  enableDynamicScaling: boolean;
  scalingMethod?: 'volatility' | 'momentum' | 'volume';
  minOrderMultiplier?: number; // e.g., 0.5 (50% of base order)
  maxOrderMultiplier?: number; // e.g., 2.0 (200% of base order)
  volatilityPeriod?: number; // Period for volatility calculation
  volatilityThreshold?: number; // Threshold for scaling
  
  // Profit Taking
  enableProfitTaking: boolean;
  profitTargets?: Array<{
    id: string;
    percentage: number; // Profit percentage to take
    amountPercentage: number; // % of position to sell at this target
    enabled: boolean;
  }>;
  trailingStopEnabled?: boolean;
  trailingStopPercentage?: number;
  
  // Emergency Brake
  enableEmergencyBrake: boolean;
  emergencyBrakeType?: 'loss_percent' | 'loss_amount' | 'drawdown_percent';
  emergencyBrakeLossPercent?: number; // Stop if loss exceeds X%
  emergencyBrakeLossAmount?: number; // Stop if loss exceeds X amount
  emergencyBrakeDrawdownPercent?: number; // Stop if drawdown exceeds X%
  emergencyBrakeAction?: 'pause' | 'stop' | 'reduce_size';
}

interface AdvancedFeaturesProps {
  value: AdvancedFeaturesData;
  onChange: (features: AdvancedFeaturesData | ((prev: AdvancedFeaturesData) => AdvancedFeaturesData)) => void;
  baseOrderCurrency?: string;
}

const AdvancedFeatures: React.FC<AdvancedFeaturesProps> = ({
  value,
  onChange,
  baseOrderCurrency = 'USDT',
}) => {
  const { theme } = useThemeStore();
  const isDark = theme === 'dark';
  const [expandedSection, setExpandedSection] = useState<string | null>(null);

  const handleUpdate = useCallback((updates: Partial<AdvancedFeaturesData>) => {
    onChange((prev) => ({ ...prev, ...updates }));
  }, [onChange]);

  const SectionHeader = ({
    id,
    title,
    icon: Icon,
    description,
  }: {
    id: string;
    title: string;
    icon: any;
    description?: string;
  }) => {
    const isOpen = expandedSection === id;
    return (
      <button
        type="button"
        onClick={() => setExpandedSection(isOpen ? null : id)}
        className={`w-full flex items-center justify-between p-3 rounded-lg transition-colors ${
          isDark
            ? 'hover:bg-gray-800/50 border border-gray-700/50'
            : 'hover:bg-gray-50 border border-gray-200'
        }`}
      >
        <div className="flex items-center gap-3">
          <div className={`p-2 rounded-lg ${isDark ? 'bg-gray-800' : 'bg-gray-100'}`}>
            <Icon className={`w-4 h-4 ${isDark ? 'text-gray-400' : 'text-gray-600'}`} />
          </div>
          <div className="text-left">
            <p className={`font-medium text-sm ${isDark ? 'text-white' : 'text-gray-900'}`}>
              {title}
            </p>
            {description && (
              <p className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-600'} mt-0.5`}>
                {description}
              </p>
            )}
          </div>
        </div>
        {isOpen ? (
          <ChevronUp className={`w-4 h-4 ${isDark ? 'text-gray-400' : 'text-gray-600'}`} />
        ) : (
          <ChevronDown className={`w-4 h-4 ${isDark ? 'text-gray-400' : 'text-gray-600'}`} />
        )}
      </button>
    );
  };

  const ToggleSwitch = ({
    enabled,
    onToggle,
    label,
    description,
  }: {
    enabled: boolean;
    onToggle: (enabled: boolean) => void;
    label: string;
    description?: string;
  }) => {
    return (
      <div className="flex items-center justify-between p-3 rounded-lg border border-gray-700/50">
        <div className="flex items-center gap-3">
          <div>
            <p className={`font-medium text-sm ${isDark ? 'text-white' : 'text-gray-900'}`}>
              {label}
            </p>
            {description && (
              <p className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-600'} mt-0.5`}>
                {description}
              </p>
            )}
          </div>
        </div>
        <label className="relative inline-flex items-center cursor-pointer">
          <input
            type="checkbox"
            checked={enabled}
            onChange={(e) => onToggle(e.target.checked)}
            className="sr-only peer"
          />
          <div
            className={`w-11 h-6 rounded-full peer ${
              enabled
                ? 'bg-blue-600'
                : isDark
                ? 'bg-gray-700'
                : 'bg-gray-300'
            } peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all`}
          />
        </label>
      </div>
    );
  };

  return (
    <div className="space-y-4">
      {/* Market Regime Detection */}
      <div>
        <ToggleSwitch
          enabled={value.enableMarketRegime}
          onToggle={(enabled) => handleUpdate({ enableMarketRegime: enabled })}
          label="Market Regime Detection"
          description="Automatically adjust strategy based on market conditions"
        />
        {value.enableMarketRegime && (
          <div className="mt-3 space-y-3 pl-4 border-l-2 border-gray-200 dark:border-gray-700">
            <SectionHeader
              id="market-regime-config"
              title="Market Regime Configuration"
              icon={Gauge}
            />
            {expandedSection === 'market-regime-config' && (
              <div className="mt-3 space-y-3 pl-11">
                <div>
                  <Label className={isDark ? 'text-gray-300' : 'text-gray-700'}>
                    Sensitivity Level
                    <Tooltip content="How quickly the bot adapts to market regime changes" />
                  </Label>
                  <Select
                    value={value.marketRegimeSensitivity || 'medium'}
                    onValueChange={(val) =>
                      handleUpdate({ marketRegimeSensitivity: val as 'low' | 'medium' | 'high' })
                    }
                  >
                    <SelectTrigger className={`mt-1 ${isDark ? 'bg-gray-800 border-gray-700' : ''}`}>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="low">Low - Slow adaptation</SelectItem>
                      <SelectItem value="medium">Medium - Balanced</SelectItem>
                      <SelectItem value="high">High - Fast adaptation</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Dynamic Scaling */}
      <div>
        <ToggleSwitch
          enabled={value.enableDynamicScaling}
          onToggle={(enabled) => handleUpdate({ enableDynamicScaling: enabled })}
          label="Dynamic Scaling"
          description="Adjust order sizes based on volatility"
        />
        {value.enableDynamicScaling && (
          <div className="mt-3 space-y-3 pl-4 border-l-2 border-gray-200 dark:border-gray-700">
            <SectionHeader
              id="dynamic-scaling-config"
              title="Dynamic Scaling Configuration"
              icon={LineChart}
            />
            {expandedSection === 'dynamic-scaling-config' && (
              <div className="mt-3 space-y-3 pl-11">
                <div>
                  <Label className={isDark ? 'text-gray-300' : 'text-gray-700'}>
                    Scaling Method
                    <Tooltip content="Method used to determine order size adjustments" />
                  </Label>
                  <Select
                    value={value.scalingMethod || 'volatility'}
                    onValueChange={(val) =>
                      handleUpdate({ scalingMethod: val as 'volatility' | 'momentum' | 'volume' })
                    }
                  >
                    <SelectTrigger className={`mt-1 ${isDark ? 'bg-gray-800 border-gray-700' : ''}`}>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="volatility">Volatility-based</SelectItem>
                      <SelectItem value="momentum">Momentum-based</SelectItem>
                      <SelectItem value="volume">Volume-based</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label className={isDark ? 'text-gray-300' : 'text-gray-700'}>
                      Min Order Multiplier
                    </Label>
                    <Input
                      type="number"
                      step="0.1"
                      min="0.1"
                      max="1"
                      value={value.minOrderMultiplier || 0.5}
                      onChange={(e) =>
                        handleUpdate({ minOrderMultiplier: parseFloat(e.target.value) || 0.5 })
                      }
                      className={`mt-1 ${isDark ? 'bg-gray-800 border-gray-700' : ''}`}
                    />
                    <p className={`text-xs ${isDark ? 'text-gray-500' : 'text-gray-500'} mt-1`}>
                      Minimum order size as % of base order
                    </p>
                  </div>
                  <div>
                    <Label className={isDark ? 'text-gray-300' : 'text-gray-700'}>
                      Max Order Multiplier
                    </Label>
                    <Input
                      type="number"
                      step="0.1"
                      min="1"
                      max="5"
                      value={value.maxOrderMultiplier || 2.0}
                      onChange={(e) =>
                        handleUpdate({ maxOrderMultiplier: parseFloat(e.target.value) || 2.0 })
                      }
                      className={`mt-1 ${isDark ? 'bg-gray-800 border-gray-700' : ''}`}
                    />
                    <p className={`text-xs ${isDark ? 'text-gray-500' : 'text-gray-500'} mt-1`}>
                      Maximum order size as % of base order
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Profit Taking */}
      <div>
        <ToggleSwitch
          enabled={value.enableProfitTaking}
          onToggle={(enabled) => handleUpdate({ enableProfitTaking: enabled })}
          label="Profit Taking"
          description="Automatically take profits at target levels"
        />
        {value.enableProfitTaking && (
          <div className="mt-3 space-y-3 pl-4 border-l-2 border-gray-200 dark:border-gray-700">
            <SectionHeader
              id="profit-taking-config"
              title="Profit Taking Configuration"
              icon={TrendingUp}
            />
            {expandedSection === 'profit-taking-config' && (
              <div className="mt-3 space-y-3 pl-11">
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={value.trailingStopEnabled || false}
                    onChange={(e) => handleUpdate({ trailingStopEnabled: e.target.checked })}
                    className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700"
                  />
                  <Label className={isDark ? 'text-gray-300' : 'text-gray-700'}>
                    Enable Trailing Stop
                    <Tooltip content="Automatically adjust stop loss as price moves in your favor" />
                  </Label>
                </div>
                {value.trailingStopEnabled && (
                  <div>
                    <Label className={isDark ? 'text-gray-300' : 'text-gray-700'}>
                      Trailing Stop Percentage (%)
                    </Label>
                    <Input
                      type="number"
                      step="0.1"
                      min="0.1"
                      value={value.trailingStopPercentage || 5}
                      onChange={(e) =>
                        handleUpdate({ trailingStopPercentage: parseFloat(e.target.value) || 5 })
                      }
                      className={`mt-1 ${isDark ? 'bg-gray-800 border-gray-700' : ''}`}
                    />
                    <p className={`text-xs ${isDark ? 'text-gray-500' : 'text-gray-500'} mt-1`}>
                      Stop loss trails price by this percentage
                    </p>
                  </div>
                )}
                <div>
                  <Label className={isDark ? 'text-gray-300' : 'text-gray-700'}>
                    Profit Targets
                    <Tooltip content="Configure multiple profit-taking levels" />
                  </Label>
                  <p className={`text-xs ${isDark ? 'text-gray-500' : 'text-gray-500'} mt-1 mb-2`}>
                    Set multiple profit targets to take partial profits
                  </p>
                  {/* Placeholder for profit targets - can be expanded later */}
                  <div className={`p-3 rounded-lg border ${isDark ? 'border-gray-700 bg-gray-800/50' : 'border-gray-200 bg-gray-50'}`}>
                    <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                      Profit targets configuration coming soon
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Emergency Brake */}
      <div>
        <ToggleSwitch
          enabled={value.enableEmergencyBrake}
          onToggle={(enabled) => handleUpdate({ enableEmergencyBrake: enabled })}
          label="Emergency Brake"
          description="Stop trading if losses exceed threshold"
        />
        {value.enableEmergencyBrake && (
          <div className="mt-3 space-y-3 pl-4 border-l-2 border-gray-200 dark:border-gray-700">
            <SectionHeader
              id="emergency-brake-config"
              title="Emergency Brake Configuration"
              icon={AlertTriangle}
            />
            {expandedSection === 'emergency-brake-config' && (
              <div className="mt-3 space-y-3 pl-11">
                <div>
                  <Label className={isDark ? 'text-gray-300' : 'text-gray-700'}>
                    Brake Trigger Type
                    <Tooltip content="What condition triggers the emergency brake" />
                  </Label>
                  <Select
                    value={value.emergencyBrakeType || 'loss_percent'}
                    onValueChange={(val) =>
                      handleUpdate({ emergencyBrakeType: val as 'loss_percent' | 'loss_amount' | 'drawdown_percent' })
                    }
                  >
                    <SelectTrigger className={`mt-1 ${isDark ? 'bg-gray-800 border-gray-700' : ''}`}>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="loss_percent">Loss by Percentage (%)</SelectItem>
                      <SelectItem value="loss_amount">Loss by Amount ({baseOrderCurrency})</SelectItem>
                      <SelectItem value="drawdown_percent">Drawdown by Percentage (%)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                {value.emergencyBrakeType === 'loss_percent' && (
                  <div>
                    <Label className={isDark ? 'text-gray-300' : 'text-gray-700'}>
                      Loss Threshold (%)
                    </Label>
                    <Input
                      type="number"
                      step="0.1"
                      min="0"
                      value={value.emergencyBrakeLossPercent || 20}
                      onChange={(e) =>
                        handleUpdate({ emergencyBrakeLossPercent: parseFloat(e.target.value) || 20 })
                      }
                      className={`mt-1 ${isDark ? 'bg-gray-800 border-gray-700' : ''}`}
                    />
                    <p className={`text-xs ${isDark ? 'text-gray-500' : 'text-gray-500'} mt-1`}>
                      Stop trading when loss exceeds this percentage
                    </p>
                  </div>
                )}
                {value.emergencyBrakeType === 'loss_amount' && (
                  <div>
                    <Label className={isDark ? 'text-gray-300' : 'text-gray-700'}>
                      Loss Threshold ({baseOrderCurrency})
                    </Label>
                    <Input
                      type="number"
                      step="0.01"
                      min="0"
                      value={value.emergencyBrakeLossAmount || 0}
                      onChange={(e) =>
                        handleUpdate({ emergencyBrakeLossAmount: parseFloat(e.target.value) || 0 })
                      }
                      className={`mt-1 ${isDark ? 'bg-gray-800 border-gray-700' : ''}`}
                    />
                    <p className={`text-xs ${isDark ? 'text-gray-500' : 'text-gray-500'} mt-1`}>
                      Stop trading when loss exceeds this amount
                    </p>
                  </div>
                )}
                {value.emergencyBrakeType === 'drawdown_percent' && (
                  <div>
                    <Label className={isDark ? 'text-gray-300' : 'text-gray-700'}>
                      Drawdown Threshold (%)
                    </Label>
                    <Input
                      type="number"
                      step="0.1"
                      min="0"
                      value={value.emergencyBrakeDrawdownPercent || 30}
                      onChange={(e) =>
                        handleUpdate({ emergencyBrakeDrawdownPercent: parseFloat(e.target.value) || 30 })
                      }
                      className={`mt-1 ${isDark ? 'bg-gray-800 border-gray-700' : ''}`}
                    />
                    <p className={`text-xs ${isDark ? 'text-gray-500' : 'text-gray-500'} mt-1`}>
                      Stop trading when drawdown exceeds this percentage
                    </p>
                  </div>
                )}
                <div>
                  <Label className={isDark ? 'text-gray-300' : 'text-gray-700'}>
                    Action When Triggered
                    <Tooltip content="What happens when emergency brake is triggered" />
                  </Label>
                  <Select
                    value={value.emergencyBrakeAction || 'pause'}
                    onValueChange={(val) =>
                      handleUpdate({ emergencyBrakeAction: val as 'pause' | 'stop' | 'reduce_size' })
                    }
                  >
                    <SelectTrigger className={`mt-1 ${isDark ? 'bg-gray-800 border-gray-700' : ''}`}>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="pause">Pause Trading</SelectItem>
                      <SelectItem value="stop">Stop Bot</SelectItem>
                      <SelectItem value="reduce_size">Reduce Position Size</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default AdvancedFeatures;

