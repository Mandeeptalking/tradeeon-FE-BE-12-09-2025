import React, { useState, useCallback, useRef, useEffect } from 'react';
import {
  Gauge,
  LineChart,
  TrendingUp,
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  Plus,
  X,
  Clock,
} from 'lucide-react';
import { useThemeStore } from '../../store/theme';
import { Label } from '../ui/label';
import { Input } from '../ui/input';
import { Button } from '../ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../ui/select';
import Tooltip from '../../components/Tooltip';

export interface ProfitTarget {
  profitPercent: number;
  sellPercent: number;
}

export interface AdvancedFeaturesData {
  // Market Regime Detection
  enableMarketRegime: boolean;
  marketRegimeConfig?: {
    regimeTimeframe?: '1h' | '4h' | '1d' | '1w';
    pauseConditions?: {
      belowMovingAverage?: boolean;
      maPeriod?: number;
      rsiThreshold?: number;
      consecutivePeriods?: number;
      useTimeframeScaling?: boolean;
    };
    resumeConditions?: {
      volumeDecreaseThreshold?: number;
      consolidationPeriods?: number;
      priceRangePercent?: number;
      useTimeframeScaling?: boolean;
    };
    allowEntryOverride?: boolean;
    notifications?: boolean;
  };
  
  // Dynamic Scaling
  enableDynamicScaling: boolean;
  dynamicScalingConfig?: {
    volatilityMultiplier?: {
      lowVolatility?: number;
      normalVolatility?: number;
      highVolatility?: number;
    };
    supportResistanceMultiplier?: {
      nearStrongSupport?: number;
      neutralZone?: number;
      nearResistance?: number;
    };
    fearGreedIndex?: {
      extremeFear?: number;
      neutral?: number;
      extremeGreed?: number;
    };
    volumeProfileWeight?: boolean;
  };
  
  // Profit Taking
  enableProfitTaking: boolean;
  profitStrategyConfig?: {
    partialTargets?: ProfitTarget[];
    trailingStop?: {
      enabled?: boolean;
      activationProfit?: number;
      trailingDistance?: number;
      onlyUp?: boolean;
    };
    takeProfitAndRestart?: {
      enabled?: boolean;
      profitTarget?: number;
      useOriginalCapital?: boolean;
    };
    timeBasedExit?: {
      enabled?: boolean;
      maxHoldDays?: number;
      minProfit?: number;
    };
  };
  
  // Emergency Brake
  enableEmergencyBrake: boolean;
  emergencyBrakeConfig?: {
    circuitBreaker?: {
      enabled?: boolean;
      flashCrashPercent?: number;
      timeWindowMinutes?: number;
    };
    marketWideCrashDetection?: {
      enabled?: boolean;
      correlationThreshold?: number;
      marketDropPercent?: number;
    };
    recoveryMode?: {
      enabled?: boolean;
      stabilizationBars?: number;
      resumeAfterStabilized?: boolean;
    };
  };
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
  // Use ref to persist expanded sections across re-renders
  const expandedSectionsRef = useRef<Set<string>>(new Set());
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set());
  
  // Local state for text inputs to prevent focus loss
  const [localValues, setLocalValues] = useState<{ [key: string]: number | string }>({});
  const focusedInputRef = useRef<string | null>(null);
  const debounceTimersRef = useRef<{ [key: string]: NodeJS.Timeout }>({});

  // Initialize local values from props
  useEffect(() => {
    const updates: { [key: string]: number | string } = {};
    
    // Market Regime
    if (focusedInputRef.current !== 'maPeriod') {
      updates.maPeriod = value.marketRegimeConfig?.pauseConditions?.maPeriod ?? 200;
    }
    if (focusedInputRef.current !== 'rsiThreshold') {
      updates.rsiThreshold = value.marketRegimeConfig?.pauseConditions?.rsiThreshold ?? 30;
    }
    if (focusedInputRef.current !== 'consecutivePeriods') {
      updates.consecutivePeriods = value.marketRegimeConfig?.pauseConditions?.consecutivePeriods ?? 7;
    }
    if (focusedInputRef.current !== 'volumeDecreaseThreshold') {
      updates.volumeDecreaseThreshold = value.marketRegimeConfig?.resumeConditions?.volumeDecreaseThreshold ?? 20;
    }
    if (focusedInputRef.current !== 'consolidationPeriods') {
      updates.consolidationPeriods = value.marketRegimeConfig?.resumeConditions?.consolidationPeriods ?? 5;
    }
    if (focusedInputRef.current !== 'priceRangePercent') {
      updates.priceRangePercent = value.marketRegimeConfig?.resumeConditions?.priceRangePercent ?? 5;
    }
    
    // Dynamic Scaling
    if (focusedInputRef.current !== 'lowVolatility') {
      updates.lowVolatility = value.dynamicScalingConfig?.volatilityMultiplier?.lowVolatility ?? 1.2;
    }
    if (focusedInputRef.current !== 'normalVolatility') {
      updates.normalVolatility = value.dynamicScalingConfig?.volatilityMultiplier?.normalVolatility ?? 1.0;
    }
    if (focusedInputRef.current !== 'highVolatility') {
      updates.highVolatility = value.dynamicScalingConfig?.volatilityMultiplier?.highVolatility ?? 0.7;
    }
    if (focusedInputRef.current !== 'nearStrongSupport') {
      updates.nearStrongSupport = value.dynamicScalingConfig?.supportResistanceMultiplier?.nearStrongSupport ?? 1.5;
    }
    if (focusedInputRef.current !== 'neutralZone') {
      updates.neutralZone = value.dynamicScalingConfig?.supportResistanceMultiplier?.neutralZone ?? 1.0;
    }
    if (focusedInputRef.current !== 'nearResistance') {
      updates.nearResistance = value.dynamicScalingConfig?.supportResistanceMultiplier?.nearResistance ?? 0.5;
    }
    if (focusedInputRef.current !== 'extremeFear') {
      updates.extremeFear = value.dynamicScalingConfig?.fearGreedIndex?.extremeFear ?? 1.8;
    }
    if (focusedInputRef.current !== 'neutral') {
      updates.neutral = value.dynamicScalingConfig?.fearGreedIndex?.neutral ?? 1.0;
    }
    if (focusedInputRef.current !== 'extremeGreed') {
      updates.extremeGreed = value.dynamicScalingConfig?.fearGreedIndex?.extremeGreed ?? 0.5;
    }
    
    // Profit Taking
    if (focusedInputRef.current !== 'activationProfit') {
      updates.activationProfit = value.profitStrategyConfig?.trailingStop?.activationProfit ?? 10;
    }
    if (focusedInputRef.current !== 'trailingDistance') {
      updates.trailingDistance = value.profitStrategyConfig?.trailingStop?.trailingDistance ?? 5;
    }
    if (focusedInputRef.current !== 'profitTarget') {
      updates.profitTarget = value.profitStrategyConfig?.takeProfitAndRestart?.profitTarget ?? 30;
    }
    if (focusedInputRef.current !== 'maxHoldDays') {
      updates.maxHoldDays = value.profitStrategyConfig?.timeBasedExit?.maxHoldDays ?? 30;
    }
    if (focusedInputRef.current !== 'minProfit') {
      updates.minProfit = value.profitStrategyConfig?.timeBasedExit?.minProfit ?? 10;
    }
    
    // Emergency Brake
    if (focusedInputRef.current !== 'flashCrashPercent') {
      updates.flashCrashPercent = value.emergencyBrakeConfig?.circuitBreaker?.flashCrashPercent ?? 10;
    }
    if (focusedInputRef.current !== 'timeWindowMinutes') {
      updates.timeWindowMinutes = value.emergencyBrakeConfig?.circuitBreaker?.timeWindowMinutes ?? 5;
    }
    if (focusedInputRef.current !== 'correlationThreshold') {
      updates.correlationThreshold = value.emergencyBrakeConfig?.marketWideCrashDetection?.correlationThreshold ?? 0.8;
    }
    if (focusedInputRef.current !== 'marketDropPercent') {
      updates.marketDropPercent = value.emergencyBrakeConfig?.marketWideCrashDetection?.marketDropPercent ?? 15;
    }
    if (focusedInputRef.current !== 'stabilizationBars') {
      updates.stabilizationBars = value.emergencyBrakeConfig?.recoveryMode?.stabilizationBars ?? 10;
    }
    
    setLocalValues((prev) => ({ ...prev, ...updates }));
  }, [value]);

  // Cleanup timers on unmount
  useEffect(() => {
    return () => {
      Object.values(debounceTimersRef.current).forEach(timer => clearTimeout(timer));
    };
  }, []);

  const handleUpdate = useCallback((updates: Partial<AdvancedFeaturesData>) => {
    onChange((prev) => ({ ...prev, ...updates }));
  }, [onChange]);

  const handleTextInputChange = useCallback((field: string, inputValue: string, updateCallback: (val: number) => void) => {
    setLocalValues((prev) => ({ ...prev, [field]: inputValue }));
    
    const timerKey = `advanced-${field}`;
    if (debounceTimersRef.current[timerKey]) {
      clearTimeout(debounceTimersRef.current[timerKey]);
    }

    debounceTimersRef.current[timerKey] = setTimeout(() => {
      const numValue = parseFloat(inputValue) || 0;
      updateCallback(numValue);
      delete debounceTimersRef.current[timerKey];
    }, 300);
  }, []);

  const handleInputFocus = useCallback((field: string) => {
    focusedInputRef.current = field;
  }, []);

  const handleInputBlur = useCallback((field: string) => {
    const timerKey = `advanced-${field}`;
    if (debounceTimersRef.current[timerKey]) {
      clearTimeout(debounceTimersRef.current[timerKey]);
      const currentValue = localValues[field];
      if (currentValue !== undefined) {
        const numValue = typeof currentValue === 'string' ? parseFloat(currentValue) || 0 : currentValue;
        // This will be handled by the specific update callback
      }
      delete debounceTimersRef.current[timerKey];
    }
    focusedInputRef.current = null;
  }, [localValues]);

  const toggleSection = useCallback((id: string) => {
    setExpandedSections((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      expandedSectionsRef.current = newSet;
      return newSet;
    });
  }, []);

  const isSectionExpanded = useCallback((id: string) => {
    return expandedSections.has(id);
  }, [expandedSections]);

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
    const isOpen = isSectionExpanded(id);
    return (
      <button
        type="button"
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          toggleSection(id);
        }}
        className={`w-full flex items-center justify-between p-3 rounded-lg transition-all duration-200 ${
          isOpen
            ? isDark
              ? 'bg-gray-800/70 border-gray-600'
              : 'bg-gray-100 border-gray-300'
            : isDark
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
        <div className={`transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}>
          <ChevronDown className={`w-4 h-4 ${isDark ? 'text-gray-400' : 'text-gray-600'}`} />
        </div>
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
      <div className={`flex items-center justify-between p-4 rounded-lg border transition-all duration-200 ${
        enabled 
          ? isDark ? 'border-blue-500/30 bg-blue-500/5' : 'border-blue-200 bg-blue-50/50'
          : isDark ? 'border-gray-700/50 bg-gray-800/30' : 'border-gray-200 bg-white'
      }`}>
        <div className="flex items-center gap-3 flex-1">
          <div className="flex-1">
            <p className={`font-semibold text-sm ${isDark ? 'text-white' : 'text-gray-900'}`}>
              {label}
            </p>
            {description && (
              <p className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-600'} mt-1`}>
                {description}
              </p>
            )}
          </div>
        </div>
        <label className="relative inline-flex items-center cursor-pointer ml-4 flex-shrink-0">
          <input
            type="checkbox"
            checked={enabled}
            onChange={(e) => {
              e.stopPropagation();
              onToggle(e.target.checked);
            }}
            className="sr-only peer"
          />
          <div
            className={`w-12 h-6 rounded-full peer transition-colors duration-200 ${
              enabled
                ? 'bg-blue-600'
                : isDark
                ? 'bg-gray-700'
                : 'bg-gray-300'
            } peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all after:shadow-sm`}
          />
        </label>
      </div>
    );
  };

  const addProfitTarget = useCallback(() => {
    const newTargets = [
      ...(value.profitStrategyConfig?.partialTargets || []),
      { profitPercent: 0, sellPercent: 0 }
    ];
    handleUpdate({
      profitStrategyConfig: {
        ...value.profitStrategyConfig,
        partialTargets: newTargets,
      },
    });
  }, [value.profitStrategyConfig, handleUpdate]);

  const removeProfitTarget = useCallback((index: number) => {
    const newTargets = (value.profitStrategyConfig?.partialTargets || []).filter((_, i) => i !== index);
    handleUpdate({
      profitStrategyConfig: {
        ...value.profitStrategyConfig,
        partialTargets: newTargets,
      },
    });
  }, [value.profitStrategyConfig, handleUpdate]);

  const updateProfitTarget = useCallback((index: number, field: 'profitPercent' | 'sellPercent', val: number) => {
    const newTargets = [...(value.profitStrategyConfig?.partialTargets || [])];
    newTargets[index] = { ...newTargets[index], [field]: val };
    handleUpdate({
      profitStrategyConfig: {
        ...value.profitStrategyConfig,
        partialTargets: newTargets,
      },
    });
  }, [value.profitStrategyConfig, handleUpdate]);

  const totalSellPercent = (value.profitStrategyConfig?.partialTargets || []).reduce(
    (sum, t) => sum + (t.sellPercent || 0),
    0
  );

  return (
    <div className="space-y-4">
      {/* Main feature toggles - these stay expanded when enabled */}
      {/* Market Regime Detection */}
      <div>
        <ToggleSwitch
          enabled={value.enableMarketRegime}
          onToggle={(enabled) => handleUpdate({ enableMarketRegime: enabled })}
          label="Market Regime Detection"
          description="Automatically adjust strategy based on market conditions"
        />
        {value.enableMarketRegime && (
          <div className="mt-3 space-y-3 pl-4 border-l-2 border-purple-200 dark:border-purple-800 transition-all duration-200">
            <SectionHeader
              id="market-regime-config"
              title="Market Regime Configuration"
              icon={Gauge}
            />
            {isSectionExpanded('market-regime-config') && (
              <div className="mt-3 space-y-4 pl-11 animate-in slide-in-from-top-2 duration-200">
                <div>
                  <Label className={isDark ? 'text-gray-300' : 'text-gray-700'}>
                    Regime Timeframe
                    <Tooltip content="Timeframe used for market regime detection" />
                  </Label>
                  <Select
                    value={value.marketRegimeConfig?.regimeTimeframe || '1d'}
                    onValueChange={(val) =>
                      handleUpdate({
                        marketRegimeConfig: {
                          ...value.marketRegimeConfig,
                          regimeTimeframe: val as '1h' | '4h' | '1d' | '1w',
                        },
                      })
                    }
                  >
                    <SelectTrigger className={`mt-1 ${isDark ? 'bg-gray-800 border-gray-700' : ''}`}>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1h">1 Hour</SelectItem>
                      <SelectItem value="4h">4 Hours</SelectItem>
                      <SelectItem value="1d">1 Day</SelectItem>
                      <SelectItem value="1w">1 Week</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Pause Conditions */}
                <div>
                  <h4 className={`text-sm font-medium mb-2 ${isDark ? 'text-white' : 'text-gray-900'}`}>
                    Pause Conditions (Bear Market Detection)
                  </h4>
                  <div className="space-y-3 pl-4 border-l-2 border-red-200 dark:border-red-800">
                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={value.marketRegimeConfig?.pauseConditions?.belowMovingAverage || false}
                        onChange={(e) =>
                          handleUpdate({
                            marketRegimeConfig: {
                              ...value.marketRegimeConfig,
                              pauseConditions: {
                                ...value.marketRegimeConfig?.pauseConditions,
                                belowMovingAverage: e.target.checked,
                              },
                            },
                          })
                        }
                        className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700"
                      />
                      <Label className={isDark ? 'text-gray-300' : 'text-gray-700'}>
                        Pause when price is below Moving Average
                      </Label>
                    </div>
                    
                    {value.marketRegimeConfig?.pauseConditions?.belowMovingAverage && (
                      <div className="space-y-2">
                        <div>
                          <Label className={isDark ? 'text-gray-300' : 'text-gray-700'}>
                            MA Period
                          </Label>
                          <Input
                            key="ma-period-input"
                            type="number"
                            value={localValues.maPeriod ?? value.marketRegimeConfig?.pauseConditions?.maPeriod ?? 200}
                            onChange={(e) =>
                              handleTextInputChange('maPeriod', e.target.value, (val) =>
                                handleUpdate({
                                  marketRegimeConfig: {
                                    ...value.marketRegimeConfig,
                                    pauseConditions: {
                                      ...value.marketRegimeConfig?.pauseConditions,
                                      maPeriod: val,
                                    },
                                  },
                                })
                              )
                            }
                            onFocus={() => handleInputFocus('maPeriod')}
                            onBlur={() => handleInputBlur('maPeriod')}
                            className={`mt-1 ${isDark ? 'bg-gray-800 border-gray-700' : ''}`}
                          />
                        </div>
                        <div>
                          <Label className={isDark ? 'text-gray-300' : 'text-gray-700'}>
                            RSI Threshold
                          </Label>
                          <Input
                            key="rsi-threshold-input"
                            type="number"
                            step="0.1"
                            value={localValues.rsiThreshold ?? value.marketRegimeConfig?.pauseConditions?.rsiThreshold ?? 30}
                            onChange={(e) =>
                              handleTextInputChange('rsiThreshold', e.target.value, (val) =>
                                handleUpdate({
                                  marketRegimeConfig: {
                                    ...value.marketRegimeConfig,
                                    pauseConditions: {
                                      ...value.marketRegimeConfig?.pauseConditions,
                                      rsiThreshold: val,
                                    },
                                  },
                                })
                              )
                            }
                            onFocus={() => handleInputFocus('rsiThreshold')}
                            onBlur={() => handleInputBlur('rsiThreshold')}
                            className={`mt-1 ${isDark ? 'bg-gray-800 border-gray-700' : ''}`}
                          />
                        </div>
                        <div>
                          <Label className={isDark ? 'text-gray-300' : 'text-gray-700'}>
                            Consecutive Periods Below Threshold
                          </Label>
                          <Input
                            key="consecutive-periods-input"
                            type="number"
                            value={localValues.consecutivePeriods ?? value.marketRegimeConfig?.pauseConditions?.consecutivePeriods ?? 7}
                            onChange={(e) =>
                              handleTextInputChange('consecutivePeriods', e.target.value, (val) =>
                                handleUpdate({
                                  marketRegimeConfig: {
                                    ...value.marketRegimeConfig,
                                    pauseConditions: {
                                      ...value.marketRegimeConfig?.pauseConditions,
                                      consecutivePeriods: val,
                                    },
                                  },
                                })
                              )
                            }
                            onFocus={() => handleInputFocus('consecutivePeriods')}
                            onBlur={() => handleInputBlur('consecutivePeriods')}
                            className={`mt-1 ${isDark ? 'bg-gray-800 border-gray-700' : ''}`}
                          />
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Resume Conditions */}
                <div>
                  <h4 className={`text-sm font-medium mb-2 ${isDark ? 'text-white' : 'text-gray-900'}`}>
                    Resume Conditions (Accumulation Zone Detection)
                  </h4>
                  <div className="space-y-3 pl-4 border-l-2 border-green-200 dark:border-green-800">
                    <div>
                      <Label className={isDark ? 'text-gray-300' : 'text-gray-700'}>
                        Volume Decrease Threshold (%)
                      </Label>
                      <Input
                        key="volume-decrease-threshold-input"
                        type="number"
                        step="0.1"
                        value={localValues.volumeDecreaseThreshold ?? value.marketRegimeConfig?.resumeConditions?.volumeDecreaseThreshold ?? 20}
                        onChange={(e) =>
                          handleTextInputChange('volumeDecreaseThreshold', e.target.value, (val) =>
                            handleUpdate({
                              marketRegimeConfig: {
                                ...value.marketRegimeConfig,
                                resumeConditions: {
                                  ...value.marketRegimeConfig?.resumeConditions,
                                  volumeDecreaseThreshold: val,
                                },
                              },
                            })
                          )
                        }
                        onFocus={() => handleInputFocus('volumeDecreaseThreshold')}
                        onBlur={() => handleInputBlur('volumeDecreaseThreshold')}
                        className={`mt-1 ${isDark ? 'bg-gray-800 border-gray-700' : ''}`}
                      />
                    </div>
                    <div>
                      <Label className={isDark ? 'text-gray-300' : 'text-gray-700'}>
                        Consolidation Periods
                      </Label>
                      <Input
                        key="consolidation-periods-input"
                        type="number"
                        value={localValues.consolidationPeriods ?? value.marketRegimeConfig?.resumeConditions?.consolidationPeriods ?? 5}
                        onChange={(e) =>
                          handleTextInputChange('consolidationPeriods', e.target.value, (val) =>
                            handleUpdate({
                              marketRegimeConfig: {
                                ...value.marketRegimeConfig,
                                resumeConditions: {
                                  ...value.marketRegimeConfig?.resumeConditions,
                                  consolidationPeriods: val,
                                },
                              },
                            })
                          )
                        }
                        onFocus={() => handleInputFocus('consolidationPeriods')}
                        onBlur={() => handleInputBlur('consolidationPeriods')}
                        className={`mt-1 ${isDark ? 'bg-gray-800 border-gray-700' : ''}`}
                      />
                    </div>
                    <div>
                      <Label className={isDark ? 'text-gray-300' : 'text-gray-700'}>
                        Price Range (%) - Consolidation Zone
                      </Label>
                      <Input
                        key="price-range-percent-input"
                        type="number"
                        step="0.1"
                        value={localValues.priceRangePercent ?? value.marketRegimeConfig?.resumeConditions?.priceRangePercent ?? 5}
                        onChange={(e) =>
                          handleTextInputChange('priceRangePercent', e.target.value, (val) =>
                            handleUpdate({
                              marketRegimeConfig: {
                                ...value.marketRegimeConfig,
                                resumeConditions: {
                                  ...value.marketRegimeConfig?.resumeConditions,
                                  priceRangePercent: val,
                                },
                              },
                            })
                          )
                        }
                        onFocus={() => handleInputFocus('priceRangePercent')}
                        onBlur={() => handleInputBlur('priceRangePercent')}
                        className={`mt-1 ${isDark ? 'bg-gray-800 border-gray-700' : ''}`}
                      />
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={value.marketRegimeConfig?.notifications || false}
                    onChange={(e) =>
                      handleUpdate({
                        marketRegimeConfig: {
                          ...value.marketRegimeConfig,
                          notifications: e.target.checked,
                        },
                      })
                    }
                    className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700"
                  />
                  <Label className={isDark ? 'text-gray-300' : 'text-gray-700'}>
                    Enable notifications for regime changes
                  </Label>
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
          label="Dynamic DCA Amount Scaling"
          description="Dynamically adjusts DCA amounts based on market conditions"
        />
        {value.enableDynamicScaling && (
          <div className="mt-3 space-y-3 pl-4 border-l-2 border-blue-200 dark:border-blue-800 transition-all duration-200">
            <SectionHeader
              id="dynamic-scaling-config"
              title="Dynamic Scaling Configuration"
              icon={LineChart}
            />
            {isSectionExpanded('dynamic-scaling-config') && (
              <div className="mt-3 space-y-4 pl-11 animate-in slide-in-from-top-2 duration-200">
                {/* Volatility-Based Scaling */}
                <div>
                  <h4 className={`text-sm font-medium mb-2 ${isDark ? 'text-white' : 'text-gray-900'}`}>
                    Volatility-Based Scaling
                  </h4>
                  <div className="space-y-3 pl-4 border-l-2 border-purple-200 dark:border-purple-800">
                    <div className="grid grid-cols-3 gap-3">
                      <div>
                        <Label className={isDark ? 'text-gray-300' : 'text-gray-700'}>
                          Low Volatility Multiplier
                        </Label>
                        <Input
                          key="low-volatility-input"
                          type="number"
                          step="0.1"
                          value={localValues.lowVolatility ?? value.dynamicScalingConfig?.volatilityMultiplier?.lowVolatility ?? 1.2}
                          onChange={(e) =>
                            handleTextInputChange('lowVolatility', e.target.value, (val) =>
                              handleUpdate({
                                dynamicScalingConfig: {
                                  ...value.dynamicScalingConfig,
                                  volatilityMultiplier: {
                                    ...value.dynamicScalingConfig?.volatilityMultiplier,
                                    lowVolatility: val,
                                  },
                                },
                              })
                            )
                          }
                          onFocus={() => handleInputFocus('lowVolatility')}
                          onBlur={() => handleInputBlur('lowVolatility')}
                          className={`mt-1 ${isDark ? 'bg-gray-800 border-gray-700' : ''}`}
                        />
                        <p className={`text-xs ${isDark ? 'text-gray-500' : 'text-gray-500'} mt-1`}>
                          Increase DCA in low volatility
                        </p>
                      </div>
                      <div>
                        <Label className={isDark ? 'text-gray-300' : 'text-gray-700'}>
                          Normal Volatility
                        </Label>
                        <Input
                          key="normal-volatility-input"
                          type="number"
                          step="0.1"
                          value={localValues.normalVolatility ?? value.dynamicScalingConfig?.volatilityMultiplier?.normalVolatility ?? 1.0}
                          onChange={(e) =>
                            handleTextInputChange('normalVolatility', e.target.value, (val) =>
                              handleUpdate({
                                dynamicScalingConfig: {
                                  ...value.dynamicScalingConfig,
                                  volatilityMultiplier: {
                                    ...value.dynamicScalingConfig?.volatilityMultiplier,
                                    normalVolatility: val,
                                  },
                                },
                              })
                            )
                          }
                          onFocus={() => handleInputFocus('normalVolatility')}
                          onBlur={() => handleInputBlur('normalVolatility')}
                          className={`mt-1 ${isDark ? 'bg-gray-800 border-gray-700' : ''}`}
                        />
                        <p className={`text-xs ${isDark ? 'text-gray-500' : 'text-gray-500'} mt-1`}>
                          Base multiplier
                        </p>
                      </div>
                      <div>
                        <Label className={isDark ? 'text-gray-300' : 'text-gray-700'}>
                          High Volatility Multiplier
                        </Label>
                        <Input
                          key="high-volatility-input"
                          type="number"
                          step="0.1"
                          value={localValues.highVolatility ?? value.dynamicScalingConfig?.volatilityMultiplier?.highVolatility ?? 0.7}
                          onChange={(e) =>
                            handleTextInputChange('highVolatility', e.target.value, (val) =>
                              handleUpdate({
                                dynamicScalingConfig: {
                                  ...value.dynamicScalingConfig,
                                  volatilityMultiplier: {
                                    ...value.dynamicScalingConfig?.volatilityMultiplier,
                                    highVolatility: val,
                                  },
                                },
                              })
                            )
                          }
                          onFocus={() => handleInputFocus('highVolatility')}
                          onBlur={() => handleInputBlur('highVolatility')}
                          className={`mt-1 ${isDark ? 'bg-gray-800 border-gray-700' : ''}`}
                        />
                        <p className={`text-xs ${isDark ? 'text-gray-500' : 'text-gray-500'} mt-1`}>
                          Reduce DCA in high volatility
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Support/Resistance Scaling */}
                <div>
                  <h4 className={`text-sm font-medium mb-2 ${isDark ? 'text-white' : 'text-gray-900'}`}>
                    Support/Resistance Awareness
                  </h4>
                  <div className="space-y-3 pl-4 border-l-2 border-blue-200 dark:border-blue-800">
                    <div className="grid grid-cols-3 gap-3">
                      <div>
                        <Label className={isDark ? 'text-gray-300' : 'text-gray-700'}>
                          Near Strong Support
                        </Label>
                        <Input
                          key="near-strong-support-input"
                          type="number"
                          step="0.1"
                          value={localValues.nearStrongSupport ?? value.dynamicScalingConfig?.supportResistanceMultiplier?.nearStrongSupport ?? 1.5}
                          onChange={(e) =>
                            handleTextInputChange('nearStrongSupport', e.target.value, (val) =>
                              handleUpdate({
                                dynamicScalingConfig: {
                                  ...value.dynamicScalingConfig,
                                  supportResistanceMultiplier: {
                                    ...value.dynamicScalingConfig?.supportResistanceMultiplier,
                                    nearStrongSupport: val,
                                  },
                                },
                              })
                            )
                          }
                          onFocus={() => handleInputFocus('nearStrongSupport')}
                          onBlur={() => handleInputBlur('nearStrongSupport')}
                          className={`mt-1 ${isDark ? 'bg-gray-800 border-gray-700' : ''}`}
                        />
                        <p className={`text-xs ${isDark ? 'text-gray-500' : 'text-gray-500'} mt-1`}>
                          Increase near support
                        </p>
                      </div>
                      <div>
                        <Label className={isDark ? 'text-gray-300' : 'text-gray-700'}>
                          Neutral Zone
                        </Label>
                        <Input
                          key="neutral-zone-input"
                          type="number"
                          step="0.1"
                          value={localValues.neutralZone ?? value.dynamicScalingConfig?.supportResistanceMultiplier?.neutralZone ?? 1.0}
                          onChange={(e) =>
                            handleTextInputChange('neutralZone', e.target.value, (val) =>
                              handleUpdate({
                                dynamicScalingConfig: {
                                  ...value.dynamicScalingConfig,
                                  supportResistanceMultiplier: {
                                    ...value.dynamicScalingConfig?.supportResistanceMultiplier,
                                    neutralZone: val,
                                  },
                                },
                              })
                            )
                          }
                          onFocus={() => handleInputFocus('neutralZone')}
                          onBlur={() => handleInputBlur('neutralZone')}
                          className={`mt-1 ${isDark ? 'bg-gray-800 border-gray-700' : ''}`}
                        />
                        <p className={`text-xs ${isDark ? 'text-gray-500' : 'text-gray-500'} mt-1`}>
                          Base multiplier
                        </p>
                      </div>
                      <div>
                        <Label className={isDark ? 'text-gray-300' : 'text-gray-700'}>
                          Near Resistance
                        </Label>
                        <Input
                          key="near-resistance-input"
                          type="number"
                          step="0.1"
                          value={localValues.nearResistance ?? value.dynamicScalingConfig?.supportResistanceMultiplier?.nearResistance ?? 0.5}
                          onChange={(e) =>
                            handleTextInputChange('nearResistance', e.target.value, (val) =>
                              handleUpdate({
                                dynamicScalingConfig: {
                                  ...value.dynamicScalingConfig,
                                  supportResistanceMultiplier: {
                                    ...value.dynamicScalingConfig?.supportResistanceMultiplier,
                                    nearResistance: val,
                                  },
                                },
                              })
                            )
                          }
                          onFocus={() => handleInputFocus('nearResistance')}
                          onBlur={() => handleInputBlur('nearResistance')}
                          className={`mt-1 ${isDark ? 'bg-gray-800 border-gray-700' : ''}`}
                        />
                        <p className={`text-xs ${isDark ? 'text-gray-500' : 'text-gray-500'} mt-1`}>
                          Reduce near resistance
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Fear & Greed Index */}
                <div>
                  <h4 className={`text-sm font-medium mb-2 ${isDark ? 'text-white' : 'text-gray-900'}`}>
                    Fear & Greed Index Scaling
                  </h4>
                  <div className="space-y-3 pl-4 border-l-2 border-yellow-200 dark:border-yellow-800">
                    <div className="grid grid-cols-3 gap-3">
                      <div>
                        <Label className={isDark ? 'text-gray-300' : 'text-gray-700'}>
                          Extreme Fear Multiplier
                        </Label>
                        <Input
                          key="extreme-fear-input"
                          type="number"
                          step="0.1"
                          value={localValues.extremeFear ?? value.dynamicScalingConfig?.fearGreedIndex?.extremeFear ?? 1.8}
                          onChange={(e) =>
                            handleTextInputChange('extremeFear', e.target.value, (val) =>
                              handleUpdate({
                                dynamicScalingConfig: {
                                  ...value.dynamicScalingConfig,
                                  fearGreedIndex: {
                                    ...value.dynamicScalingConfig?.fearGreedIndex,
                                    extremeFear: val,
                                  },
                                },
                              })
                            )
                          }
                          onFocus={() => handleInputFocus('extremeFear')}
                          onBlur={() => handleInputBlur('extremeFear')}
                          className={`mt-1 ${isDark ? 'bg-gray-800 border-gray-700' : ''}`}
                        />
                        <p className={`text-xs ${isDark ? 'text-gray-500' : 'text-gray-500'} mt-1`}>
                          Scale up in extreme fear
                        </p>
                      </div>
                      <div>
                        <Label className={isDark ? 'text-gray-300' : 'text-gray-700'}>
                          Neutral
                        </Label>
                        <Input
                          key="neutral-input"
                          type="number"
                          step="0.1"
                          value={localValues.neutral ?? value.dynamicScalingConfig?.fearGreedIndex?.neutral ?? 1.0}
                          onChange={(e) =>
                            handleTextInputChange('neutral', e.target.value, (val) =>
                              handleUpdate({
                                dynamicScalingConfig: {
                                  ...value.dynamicScalingConfig,
                                  fearGreedIndex: {
                                    ...value.dynamicScalingConfig?.fearGreedIndex,
                                    neutral: val,
                                  },
                                },
                              })
                            )
                          }
                          onFocus={() => handleInputFocus('neutral')}
                          onBlur={() => handleInputBlur('neutral')}
                          className={`mt-1 ${isDark ? 'bg-gray-800 border-gray-700' : ''}`}
                        />
                        <p className={`text-xs ${isDark ? 'text-gray-500' : 'text-gray-500'} mt-1`}>
                          Base multiplier
                        </p>
                      </div>
                      <div>
                        <Label className={isDark ? 'text-gray-300' : 'text-gray-700'}>
                          Extreme Greed Multiplier
                        </Label>
                        <Input
                          key="extreme-greed-input"
                          type="number"
                          step="0.1"
                          value={localValues.extremeGreed ?? value.dynamicScalingConfig?.fearGreedIndex?.extremeGreed ?? 0.5}
                          onChange={(e) =>
                            handleTextInputChange('extremeGreed', e.target.value, (val) =>
                              handleUpdate({
                                dynamicScalingConfig: {
                                  ...value.dynamicScalingConfig,
                                  fearGreedIndex: {
                                    ...value.dynamicScalingConfig?.fearGreedIndex,
                                    extremeGreed: val,
                                  },
                                },
                              })
                            )
                          }
                          onFocus={() => handleInputFocus('extremeGreed')}
                          onBlur={() => handleInputBlur('extremeGreed')}
                          className={`mt-1 ${isDark ? 'bg-gray-800 border-gray-700' : ''}`}
                        />
                        <p className={`text-xs ${isDark ? 'text-gray-500' : 'text-gray-500'} mt-1`}>
                          Scale down in extreme greed
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={value.dynamicScalingConfig?.volumeProfileWeight || false}
                    onChange={(e) =>
                      handleUpdate({
                        dynamicScalingConfig: {
                          ...value.dynamicScalingConfig,
                          volumeProfileWeight: e.target.checked,
                        },
                      })
                    }
                    className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700"
                  />
                  <Label className={isDark ? 'text-gray-300' : 'text-gray-700'}>
                    Use volume profile data for scaling (increase DCAs at high-volume nodes)
                  </Label>
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
          label="Intelligent Profit Taking Strategy"
          description="Automatically take profits at optimal points"
        />
        {value.enableProfitTaking && (
          <div className="mt-3 space-y-3 pl-4 border-l-2 border-green-200 dark:border-green-800 transition-all duration-200">
            <SectionHeader
              id="profit-taking-config"
              title="Profit Taking Configuration"
              icon={TrendingUp}
            />
            {isSectionExpanded('profit-taking-config') && (
              <div className="mt-3 space-y-4 pl-11 animate-in slide-in-from-top-2 duration-200">
                {/* Partial Profit Targets */}
                <div>
                  <h4 className={`text-sm font-medium mb-2 ${isDark ? 'text-white' : 'text-gray-900'}`}>
                    Partial Profit Targets
                  </h4>
                  <div className="space-y-3 pl-4 border-l-2 border-green-200 dark:border-green-800">
                    <p className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                      Automatically sell X% of position at Y% profit
                    </p>
                    {(value.profitStrategyConfig?.partialTargets || []).map((target, index) => (
                      <div
                        key={index}
                        className={`grid grid-cols-2 gap-3 p-3 rounded-lg ${isDark ? 'bg-gray-800/50' : 'bg-gray-50'}`}
                      >
                        <div>
                          <Label className={isDark ? 'text-gray-300' : 'text-gray-700'}>
                            At Profit (%)
                          </Label>
                          <Input
                            key={`profit-target-${index}-profit-input`}
                            type="number"
                            step="0.1"
                            value={target.profitPercent}
                            onChange={(e) =>
                              updateProfitTarget(index, 'profitPercent', parseFloat(e.target.value) || 0)
                            }
                            className={`mt-1 ${isDark ? 'bg-gray-800 border-gray-700' : ''}`}
                          />
                        </div>
                        <div>
                          <Label className={isDark ? 'text-gray-300' : 'text-gray-700'}>
                            Sell (%)
                          </Label>
                          <div className="flex items-center gap-2">
                            <Input
                              key={`profit-target-${index}-sell-input`}
                              type="number"
                              step="0.1"
                              value={target.sellPercent}
                              onChange={(e) =>
                                updateProfitTarget(index, 'sellPercent', parseFloat(e.target.value) || 0)
                              }
                              className={`mt-1 flex-1 ${isDark ? 'bg-gray-800 border-gray-700' : ''}`}
                            />
                            <Button
                              type="button"
                              size="sm"
                              variant="ghost"
                              onClick={() => removeProfitTarget(index)}
                              className="mt-1"
                            >
                              <X className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    ))}
                    <Button
                      type="button"
                      size="sm"
                      onClick={addProfitTarget}
                      className="w-full"
                    >
                      <Plus className="w-4 h-4 mr-1" />
                      Add Target
                    </Button>
                    {/* Show total percentage */}
                    <div className={`p-2 rounded text-xs ${isDark ? 'bg-gray-800' : 'bg-gray-100'}`}>
                      <div className="flex justify-between items-center">
                        <span className={isDark ? 'text-gray-400' : 'text-gray-600'}>Total Sell %:</span>
                        <span
                          className={`font-semibold ${
                            Math.abs(totalSellPercent - 100) < 0.01
                              ? 'text-green-600 dark:text-green-400'
                              : 'text-red-600 dark:text-red-400'
                          }`}
                        >
                          {totalSellPercent.toFixed(2)}%
                        </span>
                      </div>
                      {Math.abs(totalSellPercent - 100) >= 0.01 && (
                        <div className="text-red-600 dark:text-red-400 text-xs mt-1">
                          ⚠️ Total must equal 100%
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Trailing Stop Loss */}
                <div>
                  <h4 className={`text-sm font-medium mb-2 ${isDark ? 'text-white' : 'text-gray-900'}`}>
                    Trailing Stop Loss (Only Up)
                  </h4>
                  <div className="space-y-3 pl-4 border-l-2 border-orange-200 dark:border-orange-800">
                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={value.profitStrategyConfig?.trailingStop?.enabled || false}
                        onChange={(e) =>
                          handleUpdate({
                            profitStrategyConfig: {
                              ...value.profitStrategyConfig,
                              trailingStop: {
                                ...value.profitStrategyConfig?.trailingStop,
                                enabled: e.target.checked,
                              },
                            },
                          })
                        }
                        className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700"
                      />
                      <Label className={isDark ? 'text-gray-300' : 'text-gray-700'}>
                        Enable trailing stop loss
                      </Label>
                    </div>
                    
                    {value.profitStrategyConfig?.trailingStop?.enabled && (
                      <div className="space-y-2">
                        <div>
                          <Label className={isDark ? 'text-gray-300' : 'text-gray-700'}>
                            Activation Profit (%)
                          </Label>
                          <Input
                            key="activation-profit-input"
                            type="number"
                            step="0.1"
                            value={localValues.activationProfit ?? value.profitStrategyConfig?.trailingStop?.activationProfit ?? 10}
                            onChange={(e) =>
                              handleTextInputChange('activationProfit', e.target.value, (val) =>
                                handleUpdate({
                                  profitStrategyConfig: {
                                    ...value.profitStrategyConfig,
                                    trailingStop: {
                                      ...value.profitStrategyConfig?.trailingStop,
                                      activationProfit: val,
                                    },
                                  },
                                })
                              )
                            }
                            onFocus={() => handleInputFocus('activationProfit')}
                            onBlur={() => handleInputBlur('activationProfit')}
                            className={`mt-1 ${isDark ? 'bg-gray-800 border-gray-700' : ''}`}
                          />
                          <p className={`text-xs ${isDark ? 'text-gray-500' : 'text-gray-500'} mt-1`}>
                            Start trailing after position reaches this profit %
                          </p>
                        </div>
                        <div>
                          <Label className={isDark ? 'text-gray-300' : 'text-gray-700'}>
                            Trailing Distance (%)
                          </Label>
                          <Input
                            key="trailing-distance-input"
                            type="number"
                            step="0.1"
                            value={localValues.trailingDistance ?? value.profitStrategyConfig?.trailingStop?.trailingDistance ?? 5}
                            onChange={(e) =>
                              handleTextInputChange('trailingDistance', e.target.value, (val) =>
                                handleUpdate({
                                  profitStrategyConfig: {
                                    ...value.profitStrategyConfig,
                                    trailingStop: {
                                      ...value.profitStrategyConfig?.trailingStop,
                                      trailingDistance: val,
                                    },
                                  },
                                })
                              )
                            }
                            onFocus={() => handleInputFocus('trailingDistance')}
                            onBlur={() => handleInputBlur('trailingDistance')}
                            className={`mt-1 ${isDark ? 'bg-gray-800 border-gray-700' : ''}`}
                          />
                          <p className={`text-xs ${isDark ? 'text-gray-500' : 'text-gray-500'} mt-1`}>
                            Maintain stop loss X% below peak price
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <input
                            type="checkbox"
                            checked={value.profitStrategyConfig?.trailingStop?.onlyUp || false}
                            onChange={(e) =>
                              handleUpdate({
                                profitStrategyConfig: {
                                  ...value.profitStrategyConfig,
                                  trailingStop: {
                                    ...value.profitStrategyConfig?.trailingStop,
                                    onlyUp: e.target.checked,
                                  },
                                },
                              })
                            }
                            className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700"
                          />
                          <Label className={isDark ? 'text-gray-300' : 'text-gray-700'}>
                            Only move up (never down) - lock in profits
                          </Label>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Take Profit & Restart */}
                <div>
                  <h4 className={`text-sm font-medium mb-2 ${isDark ? 'text-white' : 'text-gray-900'}`}>
                    Take Profit & Restart
                  </h4>
                  <div className="space-y-3 pl-4 border-l-2 border-blue-200 dark:border-blue-800">
                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={value.profitStrategyConfig?.takeProfitAndRestart?.enabled || false}
                        onChange={(e) =>
                          handleUpdate({
                            profitStrategyConfig: {
                              ...value.profitStrategyConfig,
                              takeProfitAndRestart: {
                                ...value.profitStrategyConfig?.takeProfitAndRestart,
                                enabled: e.target.checked,
                              },
                            },
                          })
                        }
                        className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700"
                      />
                      <Label className={isDark ? 'text-gray-300' : 'text-gray-700'}>
                        Close position at target and immediately restart
                      </Label>
                    </div>
                    
                    {value.profitStrategyConfig?.takeProfitAndRestart?.enabled && (
                      <div className="space-y-2">
                        <div>
                          <Label className={isDark ? 'text-gray-300' : 'text-gray-700'}>
                            Profit Target (%)
                          </Label>
                          <Input
                            key="profit-target-input"
                            type="number"
                            step="0.1"
                            value={localValues.profitTarget ?? value.profitStrategyConfig?.takeProfitAndRestart?.profitTarget ?? 30}
                            onChange={(e) =>
                              handleTextInputChange('profitTarget', e.target.value, (val) =>
                                handleUpdate({
                                  profitStrategyConfig: {
                                    ...value.profitStrategyConfig,
                                    takeProfitAndRestart: {
                                      ...value.profitStrategyConfig?.takeProfitAndRestart,
                                      profitTarget: val,
                                    },
                                  },
                                })
                              )
                            }
                            onFocus={() => handleInputFocus('profitTarget')}
                            onBlur={() => handleInputBlur('profitTarget')}
                            className={`mt-1 ${isDark ? 'bg-gray-800 border-gray-700' : ''}`}
                          />
                        </div>
                        <div className="flex items-center gap-2">
                          <input
                            type="checkbox"
                            checked={value.profitStrategyConfig?.takeProfitAndRestart?.useOriginalCapital || false}
                            onChange={(e) =>
                              handleUpdate({
                                profitStrategyConfig: {
                                  ...value.profitStrategyConfig,
                                  takeProfitAndRestart: {
                                    ...value.profitStrategyConfig?.takeProfitAndRestart,
                                    useOriginalCapital: e.target.checked,
                                  },
                                },
                              })
                            }
                            className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700"
                          />
                          <Label className={isDark ? 'text-gray-300' : 'text-gray-700'}>
                            Use original capital amount (not total position value)
                          </Label>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Time-Based Exit */}
                <div>
                  <h4 className={`text-sm font-medium mb-2 ${isDark ? 'text-white' : 'text-gray-900'}`}>
                    Time-Based Exit
                  </h4>
                  <div className="space-y-3 pl-4 border-l-2 border-purple-200 dark:border-purple-800">
                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={value.profitStrategyConfig?.timeBasedExit?.enabled || false}
                        onChange={(e) =>
                          handleUpdate({
                            profitStrategyConfig: {
                              ...value.profitStrategyConfig,
                              timeBasedExit: {
                                ...value.profitStrategyConfig?.timeBasedExit,
                                enabled: e.target.checked,
                              },
                            },
                          })
                        }
                        className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700"
                      />
                      <Label className={isDark ? 'text-gray-300' : 'text-gray-700'}>
                        Exit position after X days if profitable
                      </Label>
                    </div>
                    
                    {value.profitStrategyConfig?.timeBasedExit?.enabled && (
                      <div className="space-y-2">
                        <div>
                          <Label className={isDark ? 'text-gray-300' : 'text-gray-700'}>
                            Max Hold Days
                          </Label>
                          <Input
                            key="max-hold-days-input"
                            type="number"
                            value={localValues.maxHoldDays ?? value.profitStrategyConfig?.timeBasedExit?.maxHoldDays ?? 30}
                            onChange={(e) =>
                              handleTextInputChange('maxHoldDays', e.target.value, (val) =>
                                handleUpdate({
                                  profitStrategyConfig: {
                                    ...value.profitStrategyConfig,
                                    timeBasedExit: {
                                      ...value.profitStrategyConfig?.timeBasedExit,
                                      maxHoldDays: val,
                                    },
                                  },
                                })
                              )
                            }
                            onFocus={() => handleInputFocus('maxHoldDays')}
                            onBlur={() => handleInputBlur('maxHoldDays')}
                            className={`mt-1 ${isDark ? 'bg-gray-800 border-gray-700' : ''}`}
                          />
                        </div>
                        <div>
                          <Label className={isDark ? 'text-gray-300' : 'text-gray-700'}>
                            Minimum Profit Required (%)
                          </Label>
                          <Input
                            key="min-profit-input"
                            type="number"
                            step="0.1"
                            value={localValues.minProfit ?? value.profitStrategyConfig?.timeBasedExit?.minProfit ?? 10}
                            onChange={(e) =>
                              handleTextInputChange('minProfit', e.target.value, (val) =>
                                handleUpdate({
                                  profitStrategyConfig: {
                                    ...value.profitStrategyConfig,
                                    timeBasedExit: {
                                      ...value.profitStrategyConfig?.timeBasedExit,
                                      minProfit: val,
                                    },
                                  },
                                })
                              )
                            }
                            onFocus={() => handleInputFocus('minProfit')}
                            onBlur={() => handleInputBlur('minProfit')}
                            className={`mt-1 ${isDark ? 'bg-gray-800 border-gray-700' : ''}`}
                          />
                          <p className={`text-xs ${isDark ? 'text-gray-500' : 'text-gray-500'} mt-1`}>
                            Only exit if position shows at least this profit %
                          </p>
                        </div>
                      </div>
                    )}
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
          label="Emergency Brake System"
          description="Emergency safety features to protect your capital"
        />
        {value.enableEmergencyBrake && (
          <div className="mt-3 space-y-3 pl-4 border-l-2 border-red-200 dark:border-red-800 transition-all duration-200">
            <SectionHeader
              id="emergency-brake-config"
              title="Emergency Brake Configuration"
              icon={AlertTriangle}
            />
            {isSectionExpanded('emergency-brake-config') && (
              <div className="mt-3 space-y-4 pl-11 animate-in slide-in-from-top-2 duration-200">
                {/* Circuit Breaker */}
                <div>
                  <h4 className={`text-sm font-medium mb-2 ${isDark ? 'text-white' : 'text-gray-900'}`}>
                    Circuit Breaker (Flash Crash Detection)
                  </h4>
                  <div className="space-y-3 pl-4 border-l-2 border-red-200 dark:border-red-800">
                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={value.emergencyBrakeConfig?.circuitBreaker?.enabled || false}
                        onChange={(e) =>
                          handleUpdate({
                            emergencyBrakeConfig: {
                              ...value.emergencyBrakeConfig,
                              circuitBreaker: {
                                ...value.emergencyBrakeConfig?.circuitBreaker,
                                enabled: e.target.checked,
                              },
                            },
                          })
                        }
                        className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700"
                      />
                      <Label className={isDark ? 'text-gray-300' : 'text-gray-700'}>
                        Pause all DCAs on flash crash detection
                      </Label>
                    </div>
                    
                    {value.emergencyBrakeConfig?.circuitBreaker?.enabled && (
                      <div className="space-y-2">
                        <div>
                          <Label className={isDark ? 'text-gray-300' : 'text-gray-700'}>
                            Flash Crash Threshold (%)
                          </Label>
                          <Input
                            key="flash-crash-percent-input"
                            type="number"
                            step="0.1"
                            value={localValues.flashCrashPercent ?? value.emergencyBrakeConfig?.circuitBreaker?.flashCrashPercent ?? 10}
                            onChange={(e) =>
                              handleTextInputChange('flashCrashPercent', e.target.value, (val) =>
                                handleUpdate({
                                  emergencyBrakeConfig: {
                                    ...value.emergencyBrakeConfig,
                                    circuitBreaker: {
                                      ...value.emergencyBrakeConfig?.circuitBreaker,
                                      flashCrashPercent: val,
                                    },
                                  },
                                })
                              )
                            }
                            onFocus={() => handleInputFocus('flashCrashPercent')}
                            onBlur={() => handleInputBlur('flashCrashPercent')}
                            className={`mt-1 ${isDark ? 'bg-gray-800 border-gray-700' : ''}`}
                          />
                          <p className={`text-xs ${isDark ? 'text-gray-500' : 'text-gray-500'} mt-1`}>
                            Pause if price drops this % in time window
                          </p>
                        </div>
                        <div>
                          <Label className={isDark ? 'text-gray-300' : 'text-gray-700'}>
                            Time Window (minutes)
                          </Label>
                          <Input
                            key="time-window-minutes-input"
                            type="number"
                            value={localValues.timeWindowMinutes ?? value.emergencyBrakeConfig?.circuitBreaker?.timeWindowMinutes ?? 5}
                            onChange={(e) =>
                              handleTextInputChange('timeWindowMinutes', e.target.value, (val) =>
                                handleUpdate({
                                  emergencyBrakeConfig: {
                                    ...value.emergencyBrakeConfig,
                                    circuitBreaker: {
                                      ...value.emergencyBrakeConfig?.circuitBreaker,
                                      timeWindowMinutes: val,
                                    },
                                  },
                                })
                              )
                            }
                            onFocus={() => handleInputFocus('timeWindowMinutes')}
                            onBlur={() => handleInputBlur('timeWindowMinutes')}
                            className={`mt-1 ${isDark ? 'bg-gray-800 border-gray-700' : ''}`}
                          />
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Market-Wide Crash Detection */}
                <div>
                  <h4 className={`text-sm font-medium mb-2 ${isDark ? 'text-white' : 'text-gray-900'}`}>
                    Market-Wide Crash Detection
                  </h4>
                  <div className="space-y-3 pl-4 border-l-2 border-orange-200 dark:border-orange-800">
                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={value.emergencyBrakeConfig?.marketWideCrashDetection?.enabled || false}
                        onChange={(e) =>
                          handleUpdate({
                            emergencyBrakeConfig: {
                              ...value.emergencyBrakeConfig,
                              marketWideCrashDetection: {
                                ...value.emergencyBrakeConfig?.marketWideCrashDetection,
                                enabled: e.target.checked,
                              },
                            },
                          })
                        }
                        className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700"
                      />
                      <Label className={isDark ? 'text-gray-300' : 'text-gray-700'}>
                        Pause when entire market crashes (correlation-based)
                      </Label>
                    </div>
                    
                    {value.emergencyBrakeConfig?.marketWideCrashDetection?.enabled && (
                      <div className="space-y-2">
                        <div>
                          <Label className={isDark ? 'text-gray-300' : 'text-gray-700'}>
                            Correlation Threshold
                          </Label>
                          <Input
                            key="correlation-threshold-input"
                            type="number"
                            step="0.1"
                            min="0"
                            max="1"
                            value={localValues.correlationThreshold ?? value.emergencyBrakeConfig?.marketWideCrashDetection?.correlationThreshold ?? 0.8}
                            onChange={(e) =>
                              handleTextInputChange('correlationThreshold', e.target.value, (val) =>
                                handleUpdate({
                                  emergencyBrakeConfig: {
                                    ...value.emergencyBrakeConfig,
                                    marketWideCrashDetection: {
                                      ...value.emergencyBrakeConfig?.marketWideCrashDetection,
                                      correlationThreshold: val,
                                    },
                                  },
                                })
                              )
                            }
                            onFocus={() => handleInputFocus('correlationThreshold')}
                            onBlur={() => handleInputBlur('correlationThreshold')}
                            className={`mt-1 ${isDark ? 'bg-gray-800 border-gray-700' : ''}`}
                          />
                          <p className={`text-xs ${isDark ? 'text-gray-500' : 'text-gray-500'} mt-1`}>
                            Pause if market correlation drops below this threshold
                          </p>
                        </div>
                        <div>
                          <Label className={isDark ? 'text-gray-300' : 'text-gray-700'}>
                            Market Drop Threshold (%)
                          </Label>
                          <Input
                            key="market-drop-percent-input"
                            type="number"
                            step="0.1"
                            value={localValues.marketDropPercent ?? value.emergencyBrakeConfig?.marketWideCrashDetection?.marketDropPercent ?? 15}
                            onChange={(e) =>
                              handleTextInputChange('marketDropPercent', e.target.value, (val) =>
                                handleUpdate({
                                  emergencyBrakeConfig: {
                                    ...value.emergencyBrakeConfig,
                                    marketWideCrashDetection: {
                                      ...value.emergencyBrakeConfig?.marketWideCrashDetection,
                                      marketDropPercent: val,
                                    },
                                  },
                                })
                              )
                            }
                            onFocus={() => handleInputFocus('marketDropPercent')}
                            onBlur={() => handleInputBlur('marketDropPercent')}
                            className={`mt-1 ${isDark ? 'bg-gray-800 border-gray-700' : ''}`}
                          />
                          <p className={`text-xs ${isDark ? 'text-gray-500' : 'text-gray-500'} mt-1`}>
                            Pause if overall market drops this %
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Recovery Mode */}
                <div>
                  <h4 className={`text-sm font-medium mb-2 ${isDark ? 'text-white' : 'text-gray-900'}`}>
                    Recovery Mode
                  </h4>
                  <div className="space-y-3 pl-4 border-l-2 border-green-200 dark:border-green-800">
                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={value.emergencyBrakeConfig?.recoveryMode?.enabled || false}
                        onChange={(e) =>
                          handleUpdate({
                            emergencyBrakeConfig: {
                              ...value.emergencyBrakeConfig,
                              recoveryMode: {
                                ...value.emergencyBrakeConfig?.recoveryMode,
                                enabled: e.target.checked,
                              },
                            },
                          })
                        }
                        className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700"
                      />
                      <Label className={isDark ? 'text-gray-300' : 'text-gray-700'}>
                        Automatically resume DCAs after market stabilizes
                      </Label>
                    </div>
                    
                    {value.emergencyBrakeConfig?.recoveryMode?.enabled && (
                      <div className="space-y-2">
                        <div>
                          <Label className={isDark ? 'text-gray-300' : 'text-gray-700'}>
                            Stabilization Bars
                          </Label>
                          <Input
                            key="stabilization-bars-input"
                            type="number"
                            value={localValues.stabilizationBars ?? value.emergencyBrakeConfig?.recoveryMode?.stabilizationBars ?? 10}
                            onChange={(e) =>
                              handleTextInputChange('stabilizationBars', e.target.value, (val) =>
                                handleUpdate({
                                  emergencyBrakeConfig: {
                                    ...value.emergencyBrakeConfig,
                                    recoveryMode: {
                                      ...value.emergencyBrakeConfig?.recoveryMode,
                                      stabilizationBars: val,
                                    },
                                  },
                                })
                              )
                            }
                            onFocus={() => handleInputFocus('stabilizationBars')}
                            onBlur={() => handleInputBlur('stabilizationBars')}
                            className={`mt-1 ${isDark ? 'bg-gray-800 border-gray-700' : ''}`}
                          />
                          <p className={`text-xs ${isDark ? 'text-gray-500' : 'text-gray-500'} mt-1`}>
                            Number of stable bars required before resuming
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <input
                            type="checkbox"
                            checked={value.emergencyBrakeConfig?.recoveryMode?.resumeAfterStabilized || false}
                            onChange={(e) =>
                              handleUpdate({
                                emergencyBrakeConfig: {
                                  ...value.emergencyBrakeConfig,
                                  recoveryMode: {
                                    ...value.emergencyBrakeConfig?.recoveryMode,
                                    resumeAfterStabilized: e.target.checked,
                                  },
                                },
                              })
                            }
                            className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700"
                          />
                          <Label className={isDark ? 'text-gray-300' : 'text-gray-700'}>
                            Automatically resume after stabilization (or require manual resume)
                          </Label>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                <div className={`p-3 rounded-lg border ${isDark ? 'bg-yellow-900/20 border-yellow-800' : 'bg-yellow-50 border-yellow-200'}`}>
                  <div className="flex items-start gap-2">
                    <AlertTriangle className={`w-5 h-5 ${isDark ? 'text-yellow-400' : 'text-yellow-600'}`} />
                    <div className={`text-xs ${isDark ? 'text-yellow-300' : 'text-yellow-800'}`}>
                      <strong>Manual Panic Button:</strong> This feature is always enabled. When active, you can pause all DCAs instantly from the dashboard with one click, regardless of other settings.
                    </div>
                  </div>
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
