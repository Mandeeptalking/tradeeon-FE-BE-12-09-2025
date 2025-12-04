import React, { useState, useCallback } from 'react';
import {
  TrendingDown,
  Plus,
  X,
  Info,
  ChevronDown,
  ChevronUp,
  DollarSign,
  AlertTriangle,
  Clock,
  Target,
  GripVertical,
} from 'lucide-react';
import { useThemeStore } from '../../store/theme';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../ui/select';
import { Label } from '../ui/label';

export interface DCALevel {
  id: string;
  priceDropPercent: number;
  orderAmount: number;
  orderAmountType: 'fixed' | 'percentage';
  enabled: boolean;
}

export interface DCASettingsData {
  enabled: boolean;
  ruleType: 'down_from_last_entry' | 'down_from_average' | 'loss_by_percent' | 'loss_by_amount' | 'custom' | 'levels';
  // For rule-based DCA
  downFromLastEntryPercent?: number;
  downFromAveragePricePercent?: number;
  lossByPercent?: number;
  lossByAmount?: number;
  // For levels-based DCA
  levels?: DCALevel[];
  // DCA amount configuration
  amountType: 'fixed' | 'percentage' | 'multiplier';
  fixedAmount?: number;
  percentageAmount?: number;
  multiplier?: number;
  // DCA limits
  maxDcaPerPosition: number;
  maxDcaAcrossAllPositions: number;
  // DCA spacing & timing
  cooldownValue: number;
  cooldownUnit: 'minutes' | 'bars';
  waitForPreviousDca: boolean;
  // Position investment limits
  maxTotalInvestmentPerPosition?: number;
  stopDcaOnLoss: boolean;
  stopDcaOnLossType?: 'percent' | 'amount';
  stopDcaOnLossPercent?: number;
  stopDcaOnLossAmount?: number;
  // Custom condition (for custom rule type)
  customCondition?: any;
}

interface DCASettingsProps {
  value: DCASettingsData;
  onChange: (settings: DCASettingsData | ((prev: DCASettingsData) => DCASettingsData)) => void;
  baseOrderCurrency?: string;
  baseOrderSize?: number;
  pairMode?: 'single' | 'multi';
  numberOfPairs?: number;
  onBaseOrderSizeChange?: (size: number) => void;
}

const DCASettings: React.FC<DCASettingsProps> = ({
  value,
  onChange,
  baseOrderCurrency = 'USDT',
  baseOrderSize = 100,
  pairMode = 'single',
  numberOfPairs = 1,
  onBaseOrderSizeChange,
}) => {
  const { theme } = useThemeStore();
  const isDark = theme === 'dark';
  const [expandedSection, setExpandedSection] = useState<string | null>('amount-config');

  const handleUpdate = useCallback((updates: Partial<DCASettingsData>) => {
    onChange((prev) => ({ ...prev, ...updates }));
  }, [onChange]);

  const addDCALevel = useCallback(() => {
    const newLevel: DCALevel = {
      id: `dca_level_${Date.now()}`,
      priceDropPercent: 5,
      orderAmount: baseOrderSize,
      orderAmountType: 'fixed',
      enabled: true,
    };
    onChange((prev) => ({
      ...prev,
      levels: [...(prev.levels || []), newLevel],
    }));
  }, [baseOrderSize, onChange]);

  const updateDCALevel = useCallback((id: string, updates: Partial<DCALevel>) => {
    onChange((prev) => ({
      ...prev,
      levels: prev.levels?.map((level) =>
        level.id === id ? { ...level, ...updates } : level
      ),
    }));
  }, [onChange]);

  const removeDCALevel = useCallback((id: string) => {
    onChange((prev) => ({
      ...prev,
      levels: prev.levels?.filter((level) => level.id !== id),
    }));
  }, [onChange]);

  const toggleDCALevel = useCallback((id: string) => {
    onChange((prev) => ({
      ...prev,
      levels: prev.levels?.map((level) =>
        level.id === id ? { ...level, enabled: !level.enabled } : level
      ),
    }));
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
            ? 'hover:bg-gray-800/50'
            : 'hover:bg-gray-50'
        }`}
      >
        <div className="flex items-center gap-3">
          <div
            className={`p-2 rounded-lg ${
              isDark ? 'bg-blue-500/20' : 'bg-blue-100'
            }`}
          >
            <Icon className={`w-4 h-4 ${isDark ? 'text-blue-400' : 'text-blue-600'}`} />
          </div>
          <div className="text-left">
            <h4 className={`text-sm font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>
              {title}
            </h4>
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

  return (
    <div
      className={`rounded-xl border p-4 ${
        isDark
          ? 'border-gray-700/50 bg-gray-800/30'
          : 'border-gray-200 bg-white'
      }`}
    >
      {/* Enable/Disable Toggle */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <TrendingDown className={`w-5 h-5 ${isDark ? 'text-gray-400' : 'text-gray-600'}`} />
          <h3 className={`text-lg font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>
            DCA Settings
          </h3>
        </div>
        <label className="relative inline-flex items-center cursor-pointer">
          <input
            type="checkbox"
            checked={value.enabled}
            onChange={(e) => handleUpdate({ enabled: e.target.checked })}
            className="sr-only peer"
          />
          <div
            className={`w-11 h-6 rounded-full peer ${
              value.enabled
                ? 'bg-blue-600'
                : isDark
                ? 'bg-gray-700'
                : 'bg-gray-300'
            } peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all`}
          />
        </label>
      </div>

      {!value.enabled && (
        <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'} mb-4`}>
          DCA settings are disabled. Enable to configure DCA orders.
        </p>
      )}

      {value.enabled && (
        <div className="space-y-4">
          {/* Base and DCA Configuration */}
          {value.ruleType !== 'levels' && (
            <div>
              <SectionHeader
                id="amount-config"
                title="Base and DCA Configuration"
                icon={DollarSign}
                description="Configure base order size and DCA order amounts"
              />
              {expandedSection === 'amount-config' && (
                <div className="mt-3 space-y-3 pl-11">
                  {/* Base Order Size */}
                  <div>
                    <Label className={isDark ? 'text-gray-300' : 'text-gray-700'}>
                      Base Order Size ({baseOrderCurrency})
                    </Label>
                    <Input
                      type="number"
                      step="0.01"
                      min="0"
                      value={baseOrderSize}
                      onChange={(e) => {
                        const newSize = parseFloat(e.target.value) || 0;
                        onBaseOrderSizeChange?.(newSize);
                      }}
                      className={`mt-1 ${isDark ? 'bg-gray-800 border-gray-700' : ''}`}
                    />
                    <p className={`text-xs ${isDark ? 'text-gray-500' : 'text-gray-500'} mt-1`}>
                      Initial order amount per pair
                    </p>
                    {pairMode === 'multi' && numberOfPairs > 1 && (
                      <div className={`mt-2 p-2 rounded-lg ${isDark ? 'bg-blue-500/10 border border-blue-500/20' : 'bg-blue-50 border border-blue-200'}`}>
                        <p className={`text-xs font-medium ${isDark ? 'text-blue-400' : 'text-blue-700'}`}>
                          Total Capital Required: {(baseOrderSize * numberOfPairs).toFixed(2)} {baseOrderCurrency}
                        </p>
                        <p className={`text-xs ${isDark ? 'text-blue-300' : 'text-blue-600'} mt-0.5`}>
                          {baseOrderSize} {baseOrderCurrency} × {numberOfPairs} pairs = {(baseOrderSize * numberOfPairs).toFixed(2)} {baseOrderCurrency}
                        </p>
                      </div>
                    )}
                  </div>

                  {/* DCA Amount Type */}
                  <div>
                    <Label className={isDark ? 'text-gray-300' : 'text-gray-700'}>
                      DCA Amount Type
                    </Label>
                    <Select
                      value={value.amountType}
                      onValueChange={(val) =>
                        handleUpdate({ amountType: val as DCASettingsData['amountType'] })
                      }
                    >
                      <SelectTrigger className={`mt-1 ${isDark ? 'bg-gray-800 border-gray-700' : ''}`}>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="fixed">Fixed Amount</SelectItem>
                        <SelectItem value="percentage">Percentage of Base Order</SelectItem>
                        <SelectItem value="multiplier">Multiplier</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {value.amountType === 'fixed' && (
                    <div>
                      <Label className={isDark ? 'text-gray-300' : 'text-gray-700'}>
                        Fixed DCA Amount ({baseOrderCurrency})
                      </Label>
                      <Input
                        type="number"
                        step="0.01"
                        min="0"
                        value={value.fixedAmount || baseOrderSize}
                        onChange={(e) =>
                          handleUpdate({ fixedAmount: parseFloat(e.target.value) || 0 })
                        }
                        className={`mt-1 ${isDark ? 'bg-gray-800 border-gray-700' : ''}`}
                      />
                      <p className={`text-xs ${isDark ? 'text-gray-500' : 'text-gray-500'} mt-1`}>
                        Fixed amount per DCA order
                      </p>
                    </div>
                  )}

                  {value.amountType === 'percentage' && (
                    <div>
                      <Label className={isDark ? 'text-gray-300' : 'text-gray-700'}>
                        Percentage of Base Order (%)
                      </Label>
                      <div className="flex items-center gap-2 mt-1">
                        <Input
                          type="number"
                          step="0.1"
                          min="0"
                          max="100"
                          value={value.percentageAmount || 100}
                          onChange={(e) =>
                            handleUpdate({ percentageAmount: parseFloat(e.target.value) || 0 })
                          }
                          className={isDark ? 'bg-gray-800 border-gray-700' : ''}
                        />
                        <span className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>%</span>
                      </div>
                      <p className={`text-xs ${isDark ? 'text-gray-500' : 'text-gray-500'} mt-1`}>
                        Percentage of base order size ({baseOrderSize} {baseOrderCurrency})
                        {value.percentageAmount && (
                          <span className="ml-1 font-medium">
                            = {((baseOrderSize * (value.percentageAmount || 100)) / 100).toFixed(2)} {baseOrderCurrency}
                          </span>
                        )}
                      </p>
                    </div>
                  )}

                  {value.amountType === 'multiplier' && (
                    <div>
                      <Label className={isDark ? 'text-gray-300' : 'text-gray-700'}>
                        Multiplier
                      </Label>
                      <Input
                        type="number"
                        step="0.1"
                        min="0"
                        value={value.multiplier || 1}
                        onChange={(e) =>
                          handleUpdate({ multiplier: parseFloat(e.target.value) || 1 })
                        }
                        className={`mt-1 ${isDark ? 'bg-gray-800 border-gray-700' : ''}`}
                      />
                      <p className={`text-xs ${isDark ? 'text-gray-500' : 'text-gray-500'} mt-1`}>
                        Multiply base order size by this value
                        {value.multiplier && (
                          <span className="ml-1 font-medium">
                            = {(baseOrderSize * (value.multiplier || 1)).toFixed(2)} {baseOrderCurrency}
                          </span>
                        )}
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* DCA Rule Type */}
          <div>
            <SectionHeader
              id="rule-type"
              title="DCA Trigger Rule"
              icon={Target}
              description="Choose how DCA orders are triggered"
            />
            {expandedSection === 'rule-type' && (
              <div className="mt-3 space-y-3 pl-11">
                <Select
                  value={value.ruleType}
                  onValueChange={(val) => handleUpdate({ ruleType: val as DCASettingsData['ruleType'] })}
                >
                  <SelectTrigger className={isDark ? 'bg-gray-800 border-gray-700' : ''}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="down_from_last_entry">
                      Down from Last Entry (%)
                    </SelectItem>
                    <SelectItem value="down_from_average">
                      Down from Average Price (%)
                    </SelectItem>
                    <SelectItem value="loss_by_percent">
                      Loss by Percentage (%)
                    </SelectItem>
                    <SelectItem value="loss_by_amount">
                      Loss by Amount ({baseOrderCurrency})
                    </SelectItem>
                    <SelectItem value="levels">
                      Custom Levels
                    </SelectItem>
                    <SelectItem value="custom">
                      Custom Condition
                    </SelectItem>
                  </SelectContent>
                </Select>

                {/* Rule-specific inputs */}
                {value.ruleType === 'down_from_last_entry' && (
                  <div>
                    <Label className={isDark ? 'text-gray-300' : 'text-gray-700'}>
                      Price Drop Percentage (%)
                    </Label>
                    <div className="flex items-center gap-2 mt-1">
                      <Input
                        type="number"
                        step="0.1"
                        min="0"
                        value={value.downFromLastEntryPercent || 5}
                        onChange={(e) =>
                          handleUpdate({ downFromLastEntryPercent: parseFloat(e.target.value) || 0 })
                        }
                        className={isDark ? 'bg-gray-800 border-gray-700' : ''}
                      />
                      <span className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>%</span>
                    </div>
                    <p className={`text-xs ${isDark ? 'text-gray-500' : 'text-gray-500'} mt-1`}>
                      Trigger DCA when price drops by this percentage from the last entry
                    </p>
                  </div>
                )}

                {value.ruleType === 'down_from_average' && (
                  <div>
                    <Label className={isDark ? 'text-gray-300' : 'text-gray-700'}>
                      Down from Average Price (%)
                    </Label>
                    <div className="flex items-center gap-2 mt-1">
                      <Input
                        type="number"
                        step="0.1"
                        min="0"
                        value={value.downFromAveragePricePercent || 5}
                        onChange={(e) =>
                          handleUpdate({ downFromAveragePricePercent: parseFloat(e.target.value) || 0 })
                        }
                        className={isDark ? 'bg-gray-800 border-gray-700' : ''}
                      />
                      <span className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>%</span>
                    </div>
                  </div>
                )}

                {value.ruleType === 'loss_by_percent' && (
                  <div>
                    <Label className={isDark ? 'text-gray-300' : 'text-gray-700'}>
                      Loss Percentage (%)
                    </Label>
                    <div className="flex items-center gap-2 mt-1">
                      <Input
                        type="number"
                        step="0.1"
                        min="0"
                        value={value.lossByPercent || 0}
                        onChange={(e) =>
                          handleUpdate({ lossByPercent: parseFloat(e.target.value) || 0 })
                        }
                        className={isDark ? 'bg-gray-800 border-gray-700' : ''}
                      />
                      <span className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>%</span>
                    </div>
                  </div>
                )}

                {value.ruleType === 'loss_by_amount' && (
                  <div>
                    <Label className={isDark ? 'text-gray-300' : 'text-gray-700'}>
                      Loss Amount ({baseOrderCurrency})
                    </Label>
                    <Input
                      type="number"
                      step="0.01"
                      min="0"
                      value={value.lossByAmount || 0}
                      onChange={(e) =>
                        handleUpdate({ lossByAmount: parseFloat(e.target.value) || 0 })
                      }
                      className={`mt-1 ${isDark ? 'bg-gray-800 border-gray-700' : ''}`}
                    />
                  </div>
                )}
              </div>
            )}
          </div>

          {/* DCA Levels (for levels-based rule type) */}
          {value.ruleType === 'levels' && (
            <div>
              <div className="flex items-center justify-between mb-3">
                <SectionHeader
                  id="dca-levels"
                  title="DCA Levels"
                  icon={GripVertical}
                  description="Configure individual DCA levels"
                />
                <Button
                  type="button"
                  size="sm"
                  onClick={addDCALevel}
                  className="ml-auto"
                >
                  <Plus className="w-4 h-4 mr-1" />
                  Add Level
                </Button>
              </div>
              {expandedSection === 'dca-levels' && (
                <div className="mt-3 space-y-3 pl-11">
                  {value.levels && value.levels.length > 0 ? (
                    value.levels.map((level, index) => (
                      <div
                        key={level.id}
                        className={`p-3 rounded-lg border ${
                          isDark
                            ? 'border-gray-700 bg-gray-800/50'
                            : 'border-gray-200 bg-gray-50'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <span className={`text-xs font-medium ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                              Level {index + 1}
                            </span>
                            <label className="relative inline-flex items-center cursor-pointer">
                              <input
                                type="checkbox"
                                checked={level.enabled}
                                onChange={() => toggleDCALevel(level.id)}
                                className="sr-only peer"
                              />
                              <div
                                className={`w-9 h-5 rounded-full peer ${
                                  level.enabled
                                    ? 'bg-blue-600'
                                    : isDark
                                    ? 'bg-gray-700'
                                    : 'bg-gray-300'
                                } peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all`}
                              />
                            </label>
                          </div>
                          <Button
                            type="button"
                            size="sm"
                            variant="ghost"
                            onClick={() => removeDCALevel(level.id)}
                          >
                            <X className="w-4 h-4" />
                          </Button>
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <Label className={isDark ? 'text-gray-300' : 'text-gray-700'}>
                              Price Drop (%)
                            </Label>
                            <div className="flex items-center gap-2 mt-1">
                              <Input
                                type="number"
                                step="0.1"
                                min="0"
                                value={level.priceDropPercent}
                                onChange={(e) =>
                                  updateDCALevel(level.id, {
                                    priceDropPercent: parseFloat(e.target.value) || 0,
                                  })
                                }
                                className={isDark ? 'bg-gray-800 border-gray-700' : ''}
                              />
                              <span className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>%</span>
                            </div>
                          </div>
                          <div>
                            <Label className={isDark ? 'text-gray-300' : 'text-gray-700'}>
                              Order Amount Type
                            </Label>
                            <Select
                              value={level.orderAmountType}
                              onValueChange={(val) =>
                                updateDCALevel(level.id, {
                                  orderAmountType: val as 'fixed' | 'percentage',
                                })
                              }
                            >
                              <SelectTrigger className={`mt-1 ${isDark ? 'bg-gray-800 border-gray-700' : ''}`}>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="fixed">Fixed</SelectItem>
                                <SelectItem value="percentage">Percentage</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                        </div>
                        <div className="mt-2">
                          <Label className={isDark ? 'text-gray-300' : 'text-gray-700'}>
                            Order Amount
                            {level.orderAmountType === 'percentage' ? ' (%)' : ` (${baseOrderCurrency})`}
                          </Label>
                          <Input
                            type="number"
                            step={level.orderAmountType === 'percentage' ? '0.1' : '0.01'}
                            min="0"
                            value={level.orderAmount}
                            onChange={(e) =>
                              updateDCALevel(level.id, {
                                orderAmount: parseFloat(e.target.value) || 0,
                              })
                            }
                            className={`mt-1 ${isDark ? 'bg-gray-800 border-gray-700' : ''}`}
                          />
                        </div>
                      </div>
                    ))
                  ) : (
                    <div
                      className={`p-4 text-center rounded-lg border border-dashed ${
                        isDark ? 'border-gray-700' : 'border-gray-300'
                      }`}
                    >
                      <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                        No DCA levels configured. Click "Add Level" to create one.
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}


          {/* DCA Limits */}
          <div>
            <SectionHeader
              id="limits"
              title="DCA Limits"
              icon={AlertTriangle}
              description="Configure maximum DCA orders"
            />
            {expandedSection === 'limits' && (
              <div className="mt-3 space-y-3 pl-11">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label className={isDark ? 'text-gray-300' : 'text-gray-700'}>
                      Max DCA per Position
                    </Label>
                    <Input
                      type="number"
                      step="1"
                      min="1"
                      max="100"
                      value={value.maxDcaPerPosition || 5}
                      onChange={(e) =>
                        handleUpdate({ maxDcaPerPosition: parseInt(e.target.value) || 1 })
                      }
                      className={`mt-1 ${isDark ? 'bg-gray-800 border-gray-700' : ''}`}
                    />
                    <p className={`text-xs ${isDark ? 'text-gray-500' : 'text-gray-500'} mt-1`}>
                      Maximum DCA orders for a single position
                    </p>
                  </div>
                  <div>
                    <Label className={isDark ? 'text-gray-300' : 'text-gray-700'}>
                      Max DCA Across All Positions
                    </Label>
                    <Input
                      type="number"
                      step="1"
                      min="1"
                      max="1000"
                      value={value.maxDcaAcrossAllPositions || 20}
                      onChange={(e) =>
                        handleUpdate({ maxDcaAcrossAllPositions: parseInt(e.target.value) || 1 })
                      }
                      className={`mt-1 ${isDark ? 'bg-gray-800 border-gray-700' : ''}`}
                    />
                    <p className={`text-xs ${isDark ? 'text-gray-500' : 'text-gray-500'} mt-1`}>
                      Total DCA orders across all open positions
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* DCA Spacing & Timing */}
          <div>
            <SectionHeader
              id="timing"
              title="DCA Spacing & Timing"
              icon={Clock}
              description="Configure cooldown periods and timing"
            />
            {expandedSection === 'timing' && (
              <div className="mt-3 space-y-3 pl-11">
                <div>
                  <Label className={isDark ? 'text-gray-300' : 'text-gray-700'}>
                    DCA Cooldown Period
                  </Label>
                  <div className="flex items-center gap-2 mt-1">
                    <Input
                      type="number"
                      step="1"
                      min="0"
                      value={value.cooldownValue || 0}
                      onChange={(e) =>
                        handleUpdate({ cooldownValue: parseInt(e.target.value) || 0 })
                      }
                      className={isDark ? 'bg-gray-800 border-gray-700' : ''}
                    />
                    <Select
                      value={value.cooldownUnit || 'minutes'}
                      onValueChange={(val) =>
                        handleUpdate({ cooldownUnit: val as 'minutes' | 'bars' })
                      }
                    >
                      <SelectTrigger className={isDark ? 'bg-gray-800 border-gray-700' : ''}>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="minutes">Minutes</SelectItem>
                        <SelectItem value="bars">Bars</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <p className={`text-xs ${isDark ? 'text-gray-500' : 'text-gray-500'} mt-1`}>
                    Wait period after a DCA before allowing another one
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={value.waitForPreviousDca || false}
                    onChange={(e) => handleUpdate({ waitForPreviousDca: e.target.checked })}
                    className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700"
                  />
                  <Label className={isDark ? 'text-gray-300' : 'text-gray-700'}>
                    Wait for previous DCA to execute before placing next
                  </Label>
                </div>
              </div>
            )}
          </div>

          {/* Position Investment Limits */}
          <div>
            <SectionHeader
              id="investment-limits"
              title="Position Investment Limits"
              icon={DollarSign}
              description="Configure maximum investment per position"
            />
            {expandedSection === 'investment-limits' && (
              <div className="mt-3 space-y-3 pl-11">
                <div>
                  <Label className={isDark ? 'text-gray-300' : 'text-gray-700'}>
                    Max Total Investment per Position ({baseOrderCurrency})
                  </Label>
                  <Input
                    type="number"
                    step="0.01"
                    min="0"
                    value={value.maxTotalInvestmentPerPosition || 0}
                    onChange={(e) =>
                      handleUpdate({ maxTotalInvestmentPerPosition: parseFloat(e.target.value) || 0 })
                    }
                    className={`mt-1 ${isDark ? 'bg-gray-800 border-gray-700' : ''}`}
                    placeholder="1000"
                  />
                  <p className={`text-xs ${isDark ? 'text-gray-500' : 'text-gray-500'} mt-1`}>
                    Stop DCA when total invested in position reaches this amount
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={value.stopDcaOnLoss || false}
                    onChange={(e) => handleUpdate({ stopDcaOnLoss: e.target.checked })}
                    className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700"
                  />
                  <Label className={isDark ? 'text-gray-300' : 'text-gray-700'}>
                    Stop DCA when position loss exceeds threshold
                  </Label>
                </div>
                {value.stopDcaOnLoss && (
                  <div className="space-y-3 pl-6 border-l-2 border-gray-200 dark:border-gray-700">
                    <div>
                      <Label className={isDark ? 'text-gray-300' : 'text-gray-700'}>
                        Loss Threshold Type
                      </Label>
                      <Select
                        value={value.stopDcaOnLossType || 'percent'}
                        onValueChange={(val) =>
                          handleUpdate({ stopDcaOnLossType: val as 'percent' | 'amount' })
                        }
                      >
                        <SelectTrigger className={`mt-1 ${isDark ? 'bg-gray-800 border-gray-700' : ''}`}>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="percent">By Percentage (%)</SelectItem>
                          <SelectItem value="amount">By Amount ({baseOrderCurrency})</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    {value.stopDcaOnLossType === 'percent' ? (
                      <div>
                        <Label className={isDark ? 'text-gray-300' : 'text-gray-700'}>
                          Stop DCA at Loss (%)
                        </Label>
                        <div className="flex items-center gap-2 mt-1">
                          <Input
                            type="number"
                            step="0.1"
                            min="0"
                            value={value.stopDcaOnLossPercent || 0}
                            onChange={(e) =>
                              handleUpdate({ stopDcaOnLossPercent: parseFloat(e.target.value) || 0 })
                            }
                            className={isDark ? 'bg-gray-800 border-gray-700' : ''}
                          />
                          <span className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>%</span>
                        </div>
                      </div>
                    ) : (
                      <div>
                        <Label className={isDark ? 'text-gray-300' : 'text-gray-700'}>
                          Stop DCA at Loss ({baseOrderCurrency})
                        </Label>
                        <Input
                          type="number"
                          step="0.01"
                          min="0"
                          value={value.stopDcaOnLossAmount || 0}
                          onChange={(e) =>
                            handleUpdate({ stopDcaOnLossAmount: parseFloat(e.target.value) || 0 })
                          }
                          className={`mt-1 ${isDark ? 'bg-gray-800 border-gray-700' : ''}`}
                        />
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default DCASettings;

