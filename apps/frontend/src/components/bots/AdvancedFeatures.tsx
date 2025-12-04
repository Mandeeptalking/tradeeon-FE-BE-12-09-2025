import React, { useState, useCallback, useRef, useEffect } from 'react';
import {
  AlertTriangle,
  Plus,
  X,
} from 'lucide-react';
import { useThemeStore } from '../../store/theme';
import Tooltip from '../../components/Tooltip';
import type { EntryConditionsData } from './EntryConditions';

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
    fearGreedMultiplier?: {
      extremeFear?: number;
      neutral?: number;
      extremeGreed?: number;
    };
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
  entryConditions?: EntryConditionsData; // For conflict detection
}

// Conflict detection function - matches original implementation logic
const detectConflicts = (
  entryConditions: EntryConditionsData | undefined,
  marketRegimeConfig: AdvancedFeaturesData['marketRegimeConfig']
): string[] => {
  if (!entryConditions || !marketRegimeConfig || !marketRegimeConfig.pauseConditions) {
    return [];
  }

  const conflicts: string[] = [];
  const pauseConditions = marketRegimeConfig.pauseConditions;

  // Check each entry condition for conflicts
  entryConditions.conditions?.forEach((condition) => {
    if (!condition.enabled) return;

    const indicator = condition.indicator?.toLowerCase() || '';
    const operator = condition.operator?.toLowerCase() || '';

    // Check for RSI conflict
    if (pauseConditions.rsiThreshold !== undefined && indicator === 'rsi') {
      const entryValue = condition.value || condition.compareValue || condition.oversoldLevel;
      const belowOperators = [
        'crosses_below',
        'crosses_below_oversold',
        'below',
        'less_than',
        '<',
        '<=',
        'less',
      ];
      
      if (belowOperators.some(op => operator.includes(op))) {
        if (entryValue !== undefined && entryValue <= pauseConditions.rsiThreshold) {
          conflicts.push(
            `Entry condition "RSI ${operator} ${entryValue}" conflicts with pause condition "RSI < ${pauseConditions.rsiThreshold}"`
          );
        }
      }
    }

    // Check for Moving Average conflict
    if (pauseConditions.belowMovingAverage && pauseConditions.maPeriod !== undefined) {
      const entryMaPeriod = condition.maPeriod || condition.period;
      
      if (entryMaPeriod !== undefined) {
        const periodDiff = Math.abs(entryMaPeriod - pauseConditions.maPeriod);
        const periodMatch = periodDiff <= Math.max(10, pauseConditions.maPeriod * 0.1);
        
        if (periodMatch) {
          const isPriceIndicator = indicator === 'price' || indicator === '';
          const isMaIndicator = ['ema', 'sma', 'wma', 'tema', 'kama', 'mama', 'vwma', 'hull'].includes(indicator);
          
          if (isPriceIndicator || isMaIndicator) {
            const belowOperators = [
              'crosses_below',
              'crosses_below_level',
              'below',
              'less_than',
              '<',
              '<=',
              'less',
            ];
            
            if (belowOperators.some(op => operator.includes(op))) {
              conflicts.push(
                `Entry condition "Price ${operator} MA(${entryMaPeriod})" conflicts with pause condition "Price below MA(${pauseConditions.maPeriod})"`
              );
            }
          }
        }
      }
    }
  });

  return conflicts;
};

export default function AdvancedFeatures({
  value,
  onChange,
  baseOrderCurrency = 'USDT',
  entryConditions,
}: AdvancedFeaturesProps) {
  const { isDark } = useThemeStore();

  const handleUpdate = useCallback((updates: Partial<AdvancedFeaturesData>) => {
    onChange((prev) => ({ ...prev, ...updates }));
  }, [onChange]);

  // Local state for input focus management
  const [localValues, setLocalValues] = useState<{ [key: string]: number | string }>({});
  const focusedInputRef = useRef<string | null>(null);
  const debounceTimersRef = useRef<{ [key: string]: NodeJS.Timeout }>({});

  // Sync props to local state when not focused
  useEffect(() => {
    if (focusedInputRef.current === null) {
      setLocalValues({
        maPeriod: value.marketRegimeConfig?.pauseConditions?.maPeriod ?? 200,
        rsiThreshold: value.marketRegimeConfig?.pauseConditions?.rsiThreshold ?? 30,
        consecutivePeriods: value.marketRegimeConfig?.pauseConditions?.consecutivePeriods ?? 7,
        volumeDecreaseThreshold: value.marketRegimeConfig?.resumeConditions?.volumeDecreaseThreshold ?? 20,
        consolidationPeriods: value.marketRegimeConfig?.resumeConditions?.consolidationPeriods ?? 5,
        priceRangePercent: value.marketRegimeConfig?.resumeConditions?.priceRangePercent ?? 5,
        lowVolatility: value.dynamicScalingConfig?.volatilityMultiplier?.lowVolatility ?? 1.2,
        normalVolatility: value.dynamicScalingConfig?.volatilityMultiplier?.normalVolatility ?? 1.0,
        highVolatility: value.dynamicScalingConfig?.volatilityMultiplier?.highVolatility ?? 0.7,
        nearStrongSupport: value.dynamicScalingConfig?.supportResistanceMultiplier?.nearStrongSupport ?? 1.5,
        neutralZone: value.dynamicScalingConfig?.supportResistanceMultiplier?.neutralZone ?? 1.0,
        nearResistance: value.dynamicScalingConfig?.supportResistanceMultiplier?.nearResistance ?? 0.5,
        extremeFear: value.dynamicScalingConfig?.fearGreedMultiplier?.extremeFear ?? 1.5,
        neutral: value.dynamicScalingConfig?.fearGreedMultiplier?.neutral ?? 1.0,
        extremeGreed: value.dynamicScalingConfig?.fearGreedMultiplier?.extremeGreed ?? 0.5,
        activationProfit: value.profitStrategyConfig?.trailingStop?.activationProfit ?? 10,
        trailingDistance: value.profitStrategyConfig?.trailingStop?.trailingDistance ?? 5,
        profitTarget: value.profitStrategyConfig?.takeProfitAndRestart?.profitTarget ?? 30,
        maxHoldDays: value.profitStrategyConfig?.timeBasedExit?.maxHoldDays ?? 30,
        minProfit: value.profitStrategyConfig?.timeBasedExit?.minProfit ?? 10,
        flashCrashPercent: value.emergencyBrakeConfig?.circuitBreaker?.flashCrashPercent ?? 10,
        timeWindowMinutes: value.emergencyBrakeConfig?.circuitBreaker?.timeWindowMinutes ?? 5,
        correlationThreshold: value.emergencyBrakeConfig?.marketWideCrashDetection?.correlationThreshold ?? 0.8,
        marketDropPercent: value.emergencyBrakeConfig?.marketWideCrashDetection?.marketDropPercent ?? 15,
        stabilizationBars: value.emergencyBrakeConfig?.recoveryMode?.stabilizationBars ?? 10,
      });
    }
  }, [value]);

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

  const handleInputBlur = useCallback((field: string, updateCallback: (val: number) => void) => {
    focusedInputRef.current = null;
    const timerKey = `advanced-${field}`;
    if (debounceTimersRef.current[timerKey]) {
      clearTimeout(debounceTimersRef.current[timerKey]);
    }
    const numValue = parseFloat(localValues[field] as string) || 0;
    updateCallback(numValue);
    delete debounceTimersRef.current[timerKey];
  }, [localValues]);

  // Profit targets local state
  const [localProfitTargets, setLocalProfitTargets] = useState<{ [key: string]: string }>({});
  const profitTargetTimersRef = useRef<{ [key: string]: NodeJS.Timeout }>({});

  const addProfitTarget = useCallback(() => {
    const currentTargets = value.profitStrategyConfig?.partialTargets || [];
    handleUpdate({
      profitStrategyConfig: {
        ...value.profitStrategyConfig,
        partialTargets: [...currentTargets, { profitPercent: 0, sellPercent: 0 }],
      },
    });
  }, [value.profitStrategyConfig, handleUpdate]);

  const removeProfitTarget = useCallback((index: number) => {
    const currentTargets = value.profitStrategyConfig?.partialTargets || [];
    const newTargets = currentTargets.filter((_, i) => i !== index);
    handleUpdate({
      profitStrategyConfig: {
        ...value.profitStrategyConfig,
        partialTargets: newTargets,
      },
    });
  }, [value.profitStrategyConfig, handleUpdate]);

  const updateProfitTarget = useCallback((index: number, field: 'profitPercent' | 'sellPercent', val: number, immediate = false) => {
    const currentTargets = value.profitStrategyConfig?.partialTargets || [];
    const newTargets = [...currentTargets];
    if (newTargets[index]) {
      newTargets[index] = { ...newTargets[index], [field]: val };
      handleUpdate({
        profitStrategyConfig: {
          ...value.profitStrategyConfig,
          partialTargets: newTargets,
        },
      });
    }
  }, [value.profitStrategyConfig, handleUpdate]);

  const totalSellPercent = (value.profitStrategyConfig?.partialTargets || []).reduce(
    (sum, t) => sum + (t.sellPercent || 0),
    0
  );

  // Detect conflicts between entry conditions and market regime pause conditions
  const conflictDetails = detectConflicts(entryConditions, value.marketRegimeConfig);
  const showConflictWarning = value.enableMarketRegime && conflictDetails.length > 0;

  return (
    <div className="space-y-4">
      {/* Market Regime Detection */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <h2 className="text-base font-semibold text-gray-900 dark:text-white">🧠 Smart Market Regime Detection</h2>
            <span className="text-xs px-2 py-0.5 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 rounded">Phase 1</span>
            <Tooltip
              content={
                "Market Regime Detection automatically pauses/resumes your bot based on market conditions:\n\n" +
                "⏸️ PAUSE Conditions (Bear Market):\n" +
                "• Price below Moving Average + RSI below threshold\n" +
                "• Volume decrease + consolidation\n" +
                "Bot stops buying when bear market detected\n\n" +
                "▶️ RESUME Conditions (Accumulation Zone):\n" +
                "• Volume decreases (selling pressure reduces)\n" +
                "• Price consolidates in range\n" +
                "Bot resumes when accumulation detected\n\n" +
                "⚠️ Important: If pause conditions conflict with your entry conditions (e.g., you want to buy below 200 EMA but pause triggers below 200 MA), pause will override entry. The conflict warning will alert you to this."
              }
            />
          </div>
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={value.enableMarketRegime}
              onChange={(e) => handleUpdate({ enableMarketRegime: e.target.checked })}
              className="sr-only peer"
            />
            <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600"></div>
          </label>
        </div>
        
        {value.enableMarketRegime && (
          <div className="space-y-4 pt-3 border-t border-gray-200 dark:border-gray-700">
            {/* Timeframe Selection */}
            <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-3 border border-blue-200 dark:border-blue-800">
              <div className="mb-2">
                <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Chart Timeframe for Market Analysis
                </label>
                <select
                  value={value.marketRegimeConfig?.regimeTimeframe || '1d'}
                  onChange={(e) =>
                    handleUpdate({
                      marketRegimeConfig: {
                        ...value.marketRegimeConfig,
                        regimeTimeframe: e.target.value as '1h' | '4h' | '1d' | '1w',
                      },
                    })
                  }
                  className="w-full px-3 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="1h">1 Hour</option>
                  <option value="4h">4 Hours</option>
                  <option value="1d">1 Day (Recommended)</option>
                  <option value="1w">1 Week</option>
                </select>
                <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  Select the chart timeframe used to analyze market trends and cycles. <strong>Recommendation:</strong> Use daily (1d) or higher for more reliable signals.
                </div>
              </div>
              <div className="flex items-center gap-2 mt-2">
                <input
                  type="checkbox"
                  checked={value.marketRegimeConfig?.pauseConditions?.useTimeframeScaling || false}
                  onChange={(e) =>
                    handleUpdate({
                      marketRegimeConfig: {
                        ...value.marketRegimeConfig,
                        pauseConditions: {
                          ...value.marketRegimeConfig?.pauseConditions,
                          useTimeframeScaling: e.target.checked,
                        },
                      },
                    })
                  }
                  className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700"
                />
                <label className="text-xs font-medium text-gray-700 dark:text-gray-300">
                  Auto-scale periods based on timeframe (recommended)
                </label>
              </div>
            </div>

            {/* Conflict Resolution */}
            {showConflictWarning && conflictDetails.length > 0 && (
              <div className="bg-orange-50 dark:bg-orange-900/20 rounded-lg p-3 border border-orange-200 dark:border-orange-800 mb-3">
                <div className="flex items-start gap-2">
                  <AlertTriangle className="w-4 h-4 text-orange-600 dark:text-orange-400 mt-0.5 flex-shrink-0" />
                  <div className="flex-1">
                    <div className="text-xs font-semibold text-orange-800 dark:text-orange-300 mb-2">
                      ⚠️ Conflict Detected: Entry conditions conflict with pause conditions
                    </div>
                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={value.marketRegimeConfig?.allowEntryOverride || false}
                        onChange={(e) =>
                          handleUpdate({
                            marketRegimeConfig: {
                              ...value.marketRegimeConfig,
                              allowEntryOverride: e.target.checked,
                            },
                          })
                        }
                        className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700"
                      />
                      <label className="text-xs text-orange-700 dark:text-orange-400">
                        Allow entry conditions to override pause (when entry condition triggers, bot will trade even if pause condition is active)
                      </label>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Pause Conditions */}
            <div>
              <h3 className="text-sm font-medium text-gray-900 dark:text-white mb-2">Pause Conditions (Bear Market Detection)</h3>
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
                  <label className="text-xs font-medium text-gray-700 dark:text-gray-300">
                    Pause when price is below Moving Average
                  </label>
                </div>
                
                {value.marketRegimeConfig?.pauseConditions?.belowMovingAverage && (
                  <div className="space-y-2">
                    <div>
                      <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                        MA Period
                      </label>
                      <input
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
                        onBlur={() => handleInputBlur('maPeriod', (val) =>
                          handleUpdate({
                            marketRegimeConfig: {
                              ...value.marketRegimeConfig,
                              pauseConditions: {
                                ...value.marketRegimeConfig?.pauseConditions,
                                maPeriod: val,
                              },
                            },
                          })
                        )}
                        className="w-full px-3 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                        RSI Threshold
                      </label>
                      <input
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
                        onBlur={() => handleInputBlur('rsiThreshold', (val) =>
                          handleUpdate({
                            marketRegimeConfig: {
                              ...value.marketRegimeConfig,
                              pauseConditions: {
                                ...value.marketRegimeConfig?.pauseConditions,
                                rsiThreshold: val,
                              },
                            },
                          })
                        )}
                        className="w-full px-3 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Consecutive Periods Below Threshold
                      </label>
                      <input
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
                        onBlur={() => handleInputBlur('consecutivePeriods', (val) =>
                          handleUpdate({
                            marketRegimeConfig: {
                              ...value.marketRegimeConfig,
                              pauseConditions: {
                                ...value.marketRegimeConfig?.pauseConditions,
                                consecutivePeriods: val,
                              },
                            },
                          })
                        )}
                        className="w-full px-3 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Resume Conditions */}
            <div>
              <h3 className="text-sm font-medium text-gray-900 dark:text-white mb-2">Resume Conditions (Accumulation Zone Detection)</h3>
              <div className="space-y-3 pl-4 border-l-2 border-green-200 dark:border-green-800">
                <div>
                  <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Volume Decrease Threshold (%)
                  </label>
                  <input
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
                    onBlur={() => handleInputBlur('volumeDecreaseThreshold', (val) =>
                      handleUpdate({
                        marketRegimeConfig: {
                          ...value.marketRegimeConfig,
                          resumeConditions: {
                            ...value.marketRegimeConfig?.resumeConditions,
                            volumeDecreaseThreshold: val,
                          },
                        },
                      })
                    )}
                    className="w-full px-3 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Consolidation Periods
                  </label>
                  <input
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
                    onBlur={() => handleInputBlur('consolidationPeriods', (val) =>
                      handleUpdate({
                        marketRegimeConfig: {
                          ...value.marketRegimeConfig,
                          resumeConditions: {
                            ...value.marketRegimeConfig?.resumeConditions,
                            consolidationPeriods: val,
                          },
                        },
                      })
                    )}
                    className="w-full px-3 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Price Range (%) - Consolidation Zone
                  </label>
                  <input
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
                    onBlur={() => handleInputBlur('priceRangePercent', (val) =>
                      handleUpdate({
                        marketRegimeConfig: {
                          ...value.marketRegimeConfig,
                          resumeConditions: {
                            ...value.marketRegimeConfig?.resumeConditions,
                            priceRangePercent: val,
                          },
                        },
                      })
                    )}
                    className="w-full px-3 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
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
              <label className="text-xs font-medium text-gray-700 dark:text-gray-300">
                Enable notifications for regime changes
              </label>
            </div>
          </div>
        )}
      </div>

      {/* Dynamic DCA Amount Scaling */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <h2 className="text-base font-semibold text-gray-900 dark:text-white">📈 Dynamic DCA Amount Scaling</h2>
            <span className="text-xs px-2 py-0.5 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 rounded">Phase 1</span>
            <Tooltip
              content={
                "Dynamically adjusts DCA amounts based on market conditions:\n\n" +
                "📊 Volatility-Based Scaling:\n" +
                "• Low Volatility: Increase DCA (better prices expected)\n" +
                "• High Volatility: Decrease DCA (reduce risk)\n" +
                "Uses ATR (Average True Range) to measure volatility\n\n" +
                "🎯 Support/Resistance Awareness:\n" +
                "• Near Strong Support: Increase DCA (higher chance of bounce)\n" +
                "• Near Resistance: Decrease DCA (higher chance of rejection)\n\n" +
                "😱 Fear & Greed Index:\n" +
                "• Extreme Fear: Increase DCA (buying opportunity)\n" +
                "• Extreme Greed: Decrease DCA (overbought market)\n\n" +
                "All multipliers combine together to create the final DCA amount."
              }
            />
          </div>
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={value.enableDynamicScaling}
              onChange={(e) => handleUpdate({ enableDynamicScaling: e.target.checked })}
              className="sr-only peer"
            />
            <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600"></div>
          </label>
        </div>
        
        {value.enableDynamicScaling && (
          <div className="space-y-4 pt-3 border-t border-gray-200 dark:border-gray-700">
            {/* Volatility Scaling */}
            <div>
              <h3 className="text-sm font-medium text-gray-900 dark:text-white mb-2">Volatility-Based Scaling</h3>
              <div className="space-y-3 pl-4 border-l-2 border-purple-200 dark:border-purple-800">
                <div className="text-xs text-gray-600 dark:text-gray-400 mb-2">
                  Adjust DCA amount based on market volatility (ATR-based)
                </div>
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Low Volatility Multiplier
                    </label>
                    <input
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
                      onBlur={() => handleInputBlur('lowVolatility', (val) =>
                        handleUpdate({
                          dynamicScalingConfig: {
                            ...value.dynamicScalingConfig,
                            volatilityMultiplier: {
                              ...value.dynamicScalingConfig?.volatilityMultiplier,
                              lowVolatility: val,
                            },
                          },
                        })
                      )}
                      className="w-full px-3 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">Increase DCA in low volatility</div>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Normal Volatility
                    </label>
                    <input
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
                      onBlur={() => handleInputBlur('normalVolatility', (val) =>
                        handleUpdate({
                          dynamicScalingConfig: {
                            ...value.dynamicScalingConfig,
                            volatilityMultiplier: {
                              ...value.dynamicScalingConfig?.volatilityMultiplier,
                              normalVolatility: val,
                            },
                          },
                        })
                      )}
                      className="w-full px-3 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">Base multiplier</div>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                      High Volatility Multiplier
                    </label>
                    <input
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
                      onBlur={() => handleInputBlur('highVolatility', (val) =>
                        handleUpdate({
                          dynamicScalingConfig: {
                            ...value.dynamicScalingConfig,
                            volatilityMultiplier: {
                              ...value.dynamicScalingConfig?.volatilityMultiplier,
                              highVolatility: val,
                            },
                          },
                        })
                      )}
                      className="w-full px-3 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">Reduce DCA in high volatility</div>
                  </div>
                </div>
              </div>
            </div>

            {/* Support/Resistance Scaling */}
            <div>
              <h3 className="text-sm font-medium text-gray-900 dark:text-white mb-2">Support/Resistance Awareness</h3>
              <div className="space-y-3 pl-4 border-l-2 border-blue-200 dark:border-blue-800">
                <div className="text-xs text-gray-600 dark:text-gray-400 mb-2">
                  Adjust DCA size based on proximity to support/resistance levels
                </div>
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Near Strong Support
                    </label>
                    <input
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
                      onBlur={() => handleInputBlur('nearStrongSupport', (val) =>
                        handleUpdate({
                          dynamicScalingConfig: {
                            ...value.dynamicScalingConfig,
                            supportResistanceMultiplier: {
                              ...value.dynamicScalingConfig?.supportResistanceMultiplier,
                              nearStrongSupport: val,
                            },
                          },
                        })
                      )}
                      className="w-full px-3 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">Increase near support</div>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Neutral Zone
                    </label>
                    <input
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
                      onBlur={() => handleInputBlur('neutralZone', (val) =>
                        handleUpdate({
                          dynamicScalingConfig: {
                            ...value.dynamicScalingConfig,
                            supportResistanceMultiplier: {
                              ...value.dynamicScalingConfig?.supportResistanceMultiplier,
                              neutralZone: val,
                            },
                          },
                        })
                      )}
                      className="w-full px-3 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">Base multiplier</div>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Near Resistance
                    </label>
                    <input
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
                      onBlur={() => handleInputBlur('nearResistance', (val) =>
                        handleUpdate({
                          dynamicScalingConfig: {
                            ...value.dynamicScalingConfig,
                            supportResistanceMultiplier: {
                              ...value.dynamicScalingConfig?.supportResistanceMultiplier,
                              nearResistance: val,
                            },
                          },
                        })
                      )}
                      className="w-full px-3 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">Reduce near resistance</div>
                  </div>
                </div>
              </div>
            </div>

            {/* Fear & Greed Index */}
            <div>
              <h3 className="text-sm font-medium text-gray-900 dark:text-white mb-2">Fear & Greed Index Scaling</h3>
              <div className="space-y-3 pl-4 border-l-2 border-yellow-200 dark:border-yellow-800">
                <div className="text-xs text-gray-600 dark:text-gray-400 mb-2">
                  Scale DCA based on market sentiment (Crypto Fear & Greed Index)
                </div>
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Extreme Fear Multiplier
                    </label>
                    <input
                      type="number"
                      step="0.1"
                      value={localValues.extremeFear ?? value.dynamicScalingConfig?.fearGreedMultiplier?.extremeFear ?? 1.5}
                      onChange={(e) =>
                        handleTextInputChange('extremeFear', e.target.value, (val) =>
                          handleUpdate({
                            dynamicScalingConfig: {
                              ...value.dynamicScalingConfig,
                              fearGreedMultiplier: {
                                ...value.dynamicScalingConfig?.fearGreedMultiplier,
                                extremeFear: val,
                              },
                            },
                          })
                        )
                      }
                      onFocus={() => handleInputFocus('extremeFear')}
                      onBlur={() => handleInputBlur('extremeFear', (val) =>
                        handleUpdate({
                          dynamicScalingConfig: {
                            ...value.dynamicScalingConfig,
                            fearGreedMultiplier: {
                              ...value.dynamicScalingConfig?.fearGreedMultiplier,
                              extremeFear: val,
                            },
                          },
                        })
                      )}
                      className="w-full px-3 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">Increase DCA in extreme fear</div>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Neutral
                    </label>
                    <input
                      type="number"
                      step="0.1"
                      value={localValues.neutral ?? value.dynamicScalingConfig?.fearGreedMultiplier?.neutral ?? 1.0}
                      onChange={(e) =>
                        handleTextInputChange('neutral', e.target.value, (val) =>
                          handleUpdate({
                            dynamicScalingConfig: {
                              ...value.dynamicScalingConfig,
                              fearGreedMultiplier: {
                                ...value.dynamicScalingConfig?.fearGreedMultiplier,
                                neutral: val,
                              },
                            },
                          })
                        )
                      }
                      onFocus={() => handleInputFocus('neutral')}
                      onBlur={() => handleInputBlur('neutral', (val) =>
                        handleUpdate({
                          dynamicScalingConfig: {
                            ...value.dynamicScalingConfig,
                            fearGreedMultiplier: {
                              ...value.dynamicScalingConfig?.fearGreedMultiplier,
                              neutral: val,
                            },
                          },
                        })
                      )}
                      className="w-full px-3 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">Base multiplier</div>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Extreme Greed Multiplier
                    </label>
                    <input
                      type="number"
                      step="0.1"
                      value={localValues.extremeGreed ?? value.dynamicScalingConfig?.fearGreedMultiplier?.extremeGreed ?? 0.5}
                      onChange={(e) =>
                        handleTextInputChange('extremeGreed', e.target.value, (val) =>
                          handleUpdate({
                            dynamicScalingConfig: {
                              ...value.dynamicScalingConfig,
                              fearGreedMultiplier: {
                                ...value.dynamicScalingConfig?.fearGreedMultiplier,
                                extremeGreed: val,
                              },
                            },
                          })
                        )
                      }
                      onFocus={() => handleInputFocus('extremeGreed')}
                      onBlur={() => handleInputBlur('extremeGreed', (val) =>
                        handleUpdate({
                          dynamicScalingConfig: {
                            ...value.dynamicScalingConfig,
                            fearGreedMultiplier: {
                              ...value.dynamicScalingConfig?.fearGreedMultiplier,
                              extremeGreed: val,
                            },
                          },
                        })
                      )}
                      className="w-full px-3 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">Reduce DCA in extreme greed</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Intelligent Profit Taking Strategy */}
      <div className={`bg-white dark:bg-gray-800 rounded-lg border ${!value.enableProfitTaking ? 'border-red-300 dark:border-red-700' : 'border-gray-200 dark:border-gray-700'} p-4`}>
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <h2 className="text-base font-semibold text-gray-900 dark:text-white">💰 Intelligent Profit Taking Strategy</h2>
            <span className="text-xs px-2 py-0.5 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 rounded">Phase 1</span>
            {!value.enableProfitTaking && (
              <span className="text-xs px-2 py-0.5 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 rounded font-medium">
                ⚠️ Required
              </span>
            )}
            <Tooltip
              content={
                "Automatically take profits at optimal points:\n\n" +
                "🎯 Partial Profit Targets:\n" +
                "Sell X% of position when profit reaches Y%\n" +
                "Example: Sell 25% at 15% profit, sell 50% at 25% profit\n\n" +
                "📈 Trailing Stop Loss:\n" +
                "• Activates after position reaches X% profit\n" +
                "• Maintains stop X% below peak price\n" +
                "• 'Only Up' mode: Stop never moves down (locks profits)\n\n" +
                "🎯 Take Profit & Restart:\n" +
                "Close entire position at target % and immediately restart with original capital\n\n" +
                "⏰ Time-Based Exit:\n" +
                "Close position after X days if profitable and meets minimum profit requirement"
              }
            />
          </div>
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={value.enableProfitTaking}
              onChange={(e) => handleUpdate({ enableProfitTaking: e.target.checked })}
              className="sr-only peer"
            />
            <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600"></div>
          </label>
        </div>
        
        {!value.enableProfitTaking && (
          <div className="mt-3 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
            <div className="flex items-start gap-2">
              <AlertTriangle className="h-5 w-5 text-red-600 dark:text-red-400 mt-0.5 flex-shrink-0" />
              <div className="text-sm text-red-800 dark:text-red-300">
                <strong className="font-semibold">Required:</strong> You must enable and configure the Intelligent Profit Taking Strategy before creating a bot. This ensures your bot has a proper exit strategy to manage risk and take profits.
              </div>
            </div>
          </div>
        )}
        
        {value.enableProfitTaking && (
          <div className="space-y-4 pt-3 border-t border-gray-200 dark:border-gray-700">
            {/* Partial Profit Targets */}
            <div>
              <h3 className="text-sm font-medium text-gray-900 dark:text-white mb-2">Partial Profit Targets</h3>
              <div className="space-y-3 pl-4 border-l-2 border-green-200 dark:border-green-800">
                <div className="text-xs text-gray-600 dark:text-gray-400 mb-2">
                  Automatically sell X% of position at Y% profit
                </div>
                {(value.profitStrategyConfig?.partialTargets || []).map((target, index) => (
                  <div key={index} className="grid grid-cols-2 gap-3 bg-gray-50 dark:bg-gray-900/50 p-3 rounded">
                    <div>
                      <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                        At Profit (%)
                      </label>
                      <input
                        type="number"
                        step="0.1"
                        value={localProfitTargets[`profit-${index}`] ?? target.profitPercent ?? 0}
                        onChange={(e) => {
                          const inputValue = e.target.value;
                          setLocalProfitTargets((prev) => ({ ...prev, [`profit-${index}`]: inputValue }));
                          const timerKey = `profit-target-${index}-profitPercent`;
                          if (profitTargetTimersRef.current[timerKey]) {
                            clearTimeout(profitTargetTimersRef.current[timerKey]);
                          }
                          profitTargetTimersRef.current[timerKey] = setTimeout(() => {
                            updateProfitTarget(index, 'profitPercent', parseFloat(inputValue) || 0, true);
                            delete profitTargetTimersRef.current[timerKey];
                          }, 300);
                        }}
                        onFocus={() => {
                          setLocalProfitTargets((prev) => ({ ...prev, [`profit-${index}`]: target.profitPercent?.toString() ?? '0' }));
                        }}
                        className="w-full px-3 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Sell (%)
                      </label>
                      <input
                        type="number"
                        step="0.1"
                        value={localProfitTargets[`sell-${index}`] ?? target.sellPercent ?? 0}
                        onChange={(e) => {
                          const inputValue = e.target.value;
                          setLocalProfitTargets((prev) => ({ ...prev, [`sell-${index}`]: inputValue }));
                          const timerKey = `profit-target-${index}-sellPercent`;
                          if (profitTargetTimersRef.current[timerKey]) {
                            clearTimeout(profitTargetTimersRef.current[timerKey]);
                          }
                          profitTargetTimersRef.current[timerKey] = setTimeout(() => {
                            updateProfitTarget(index, 'sellPercent', parseFloat(inputValue) || 0, true);
                            delete profitTargetTimersRef.current[timerKey];
                          }, 300);
                        }}
                        onFocus={() => {
                          setLocalProfitTargets((prev) => ({ ...prev, [`sell-${index}`]: target.sellPercent?.toString() ?? '0' }));
                        }}
                        className="w-full px-3 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    {(value.profitStrategyConfig?.partialTargets || []).length > 1 && (
                      <div className="col-span-2 flex justify-end">
                        <button
                          onClick={() => removeProfitTarget(index)}
                          className="text-xs px-2 py-1 text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    )}
                  </div>
                ))}
                <button
                  onClick={addProfitTarget}
                  className="text-xs px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded transition-colors"
                >
                  + Add Target
                </button>
                {/* Show total percentage */}
                <div className="mt-2 p-2 bg-gray-100 dark:bg-gray-800 rounded text-xs">
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600 dark:text-gray-400">Total Sell %:</span>
                    <span className={`font-semibold ${
                      Math.abs(totalSellPercent - 100) < 0.01
                        ? 'text-green-600 dark:text-green-400'
                        : 'text-red-600 dark:text-red-400'
                    }`}>
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
              <h3 className="text-sm font-medium text-gray-900 dark:text-white mb-2">Trailing Stop Loss (Only Up)</h3>
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
                  <label className="text-xs font-medium text-gray-700 dark:text-gray-300">
                    Enable trailing stop loss
                  </label>
                </div>
                
                {value.profitStrategyConfig?.trailingStop?.enabled && (
                  <div className="space-y-2">
                    <div>
                      <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Activation Profit (%)
                      </label>
                      <input
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
                        onBlur={() => handleInputBlur('activationProfit', (val) =>
                          handleUpdate({
                            profitStrategyConfig: {
                              ...value.profitStrategyConfig,
                              trailingStop: {
                                ...value.profitStrategyConfig?.trailingStop,
                                activationProfit: val,
                              },
                            },
                          })
                        )}
                        className="w-full px-3 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                      <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                        Start trailing after position reaches this profit %
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Trailing Distance (%)
                      </label>
                      <input
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
                        onBlur={() => handleInputBlur('trailingDistance', (val) =>
                          handleUpdate({
                            profitStrategyConfig: {
                              ...value.profitStrategyConfig,
                              trailingStop: {
                                ...value.profitStrategyConfig?.trailingStop,
                                trailingDistance: val,
                              },
                            },
                          })
                        )}
                        className="w-full px-3 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                      <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                        Maintain stop loss X% below peak price
                      </div>
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
                      <label className="text-xs font-medium text-gray-700 dark:text-gray-300">
                        Only Up mode (stop never moves down, locks profits)
                      </label>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Take Profit & Restart */}
            <div>
              <h3 className="text-sm font-medium text-gray-900 dark:text-white mb-2">Take Profit & Restart</h3>
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
                  <label className="text-xs font-medium text-gray-700 dark:text-gray-300">
                    Enable take profit and restart strategy
                  </label>
                </div>
                
                {value.profitStrategyConfig?.takeProfitAndRestart?.enabled && (
                  <div className="space-y-2">
                    <div>
                      <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Profit Target (%)
                      </label>
                      <input
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
                        onBlur={() => handleInputBlur('profitTarget', (val) =>
                          handleUpdate({
                            profitStrategyConfig: {
                              ...value.profitStrategyConfig,
                              takeProfitAndRestart: {
                                ...value.profitStrategyConfig?.takeProfitAndRestart,
                                profitTarget: val,
                              },
                            },
                          })
                        )}
                        className="w-full px-3 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
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
                      <label className="text-xs font-medium text-gray-700 dark:text-gray-300">
                        Use original capital amount when restarting
                      </label>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Time-Based Exit */}
            <div>
              <h3 className="text-sm font-medium text-gray-900 dark:text-white mb-2">Time-Based Exit</h3>
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
                  <label className="text-xs font-medium text-gray-700 dark:text-gray-300">
                    Enable time-based exit
                  </label>
                </div>
                
                {value.profitStrategyConfig?.timeBasedExit?.enabled && (
                  <div className="space-y-2">
                    <div>
                      <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Max Hold Days
                      </label>
                      <input
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
                        onBlur={() => handleInputBlur('maxHoldDays', (val) =>
                          handleUpdate({
                            profitStrategyConfig: {
                              ...value.profitStrategyConfig,
                              timeBasedExit: {
                                ...value.profitStrategyConfig?.timeBasedExit,
                                maxHoldDays: val,
                              },
                            },
                          })
                        )}
                        className="w-full px-3 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Minimum Profit Required (%)
                      </label>
                      <input
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
                        onBlur={() => handleInputBlur('minProfit', (val) =>
                          handleUpdate({
                            profitStrategyConfig: {
                              ...value.profitStrategyConfig,
                              timeBasedExit: {
                                ...value.profitStrategyConfig?.timeBasedExit,
                                minProfit: val,
                              },
                            },
                          })
                        )}
                        className="w-full px-3 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                      <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                        Only exit if position shows at least this profit %
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Emergency Brake System */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <h2 className="text-base font-semibold text-gray-900 dark:text-white">🚨 Emergency Brake System</h2>
            <span className="text-xs px-2 py-0.5 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 rounded">Phase 1</span>
            <Tooltip
              content={
                "Emergency safety features to protect your capital:\n\n" +
                "⚡ Circuit Breaker (Flash Crash Detection):\n" +
                "Pauses all DCAs if price drops X% within Y minutes\n" +
                "Example: 10% drop in 5 minutes = flash crash detected\n\n" +
                "📉 Market-Wide Crash Detection:\n" +
                "Detects when entire market crashes together\n" +
                "Uses correlation analysis: if multiple pairs drop together, pause bot\n\n" +
                "🔄 Recovery Mode:\n" +
                "Automatically resumes DCAs after market stabilizes\n" +
                "Requires X consecutive stable bars before resuming\n\n" +
                "⚠️ Manual Panic Button:\n" +
                "Always available in dashboard - pause all DCAs instantly"
              }
            />
          </div>
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={value.enableEmergencyBrake}
              onChange={(e) => handleUpdate({ enableEmergencyBrake: e.target.checked })}
              className="sr-only peer"
            />
            <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-red-300 dark:peer-focus:ring-red-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-red-600"></div>
          </label>
        </div>
        
        {value.enableEmergencyBrake && (
          <div className="space-y-4 pt-3 border-t border-gray-200 dark:border-gray-700">
            {/* Circuit Breaker */}
            <div>
              <h3 className="text-sm font-medium text-gray-900 dark:text-white mb-2">Circuit Breaker (Flash Crash Detection)</h3>
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
                  <label className="text-xs font-medium text-gray-700 dark:text-gray-300">
                    Pause all DCAs on flash crash detection
                  </label>
                </div>
                
                {value.emergencyBrakeConfig?.circuitBreaker?.enabled && (
                  <div className="space-y-2">
                    <div>
                      <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Flash Crash Threshold (%)
                      </label>
                      <input
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
                        onBlur={() => handleInputBlur('flashCrashPercent', (val) =>
                          handleUpdate({
                            emergencyBrakeConfig: {
                              ...value.emergencyBrakeConfig,
                              circuitBreaker: {
                                ...value.emergencyBrakeConfig?.circuitBreaker,
                                flashCrashPercent: val,
                              },
                            },
                          })
                        )}
                        className="w-full px-3 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                      <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                        Pause if price drops this % in time window
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Time Window (minutes)
                      </label>
                      <input
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
                        onBlur={() => handleInputBlur('timeWindowMinutes', (val) =>
                          handleUpdate({
                            emergencyBrakeConfig: {
                              ...value.emergencyBrakeConfig,
                              circuitBreaker: {
                                ...value.emergencyBrakeConfig?.circuitBreaker,
                                timeWindowMinutes: val,
                              },
                            },
                          })
                        )}
                        className="w-full px-3 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Market-Wide Crash Detection */}
            <div>
              <h3 className="text-sm font-medium text-gray-900 dark:text-white mb-2">Market-Wide Crash Detection</h3>
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
                  <label className="text-xs font-medium text-gray-700 dark:text-gray-300">
                    Pause when entire market crashes (correlation-based)
                  </label>
                </div>
                
                {value.emergencyBrakeConfig?.marketWideCrashDetection?.enabled && (
                  <div className="space-y-2">
                    <div>
                      <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Correlation Threshold
                      </label>
                      <input
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
                        onBlur={() => handleInputBlur('correlationThreshold', (val) =>
                          handleUpdate({
                            emergencyBrakeConfig: {
                              ...value.emergencyBrakeConfig,
                              marketWideCrashDetection: {
                                ...value.emergencyBrakeConfig?.marketWideCrashDetection,
                                correlationThreshold: val,
                              },
                            },
                          })
                        )}
                        className="w-full px-3 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                      <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                        Pause if market correlation drops below this threshold
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Market Drop Threshold (%)
                      </label>
                      <input
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
                        onBlur={() => handleInputBlur('marketDropPercent', (val) =>
                          handleUpdate({
                            emergencyBrakeConfig: {
                              ...value.emergencyBrakeConfig,
                              marketWideCrashDetection: {
                                ...value.emergencyBrakeConfig?.marketWideCrashDetection,
                                marketDropPercent: val,
                              },
                            },
                          })
                        )}
                        className="w-full px-3 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                      <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                        Pause if overall market drops this %
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Recovery Mode */}
            <div>
              <h3 className="text-sm font-medium text-gray-900 dark:text-white mb-2">Recovery Mode</h3>
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
                  <label className="text-xs font-medium text-gray-700 dark:text-gray-300">
                    Automatically resume DCAs after market stabilizes
                  </label>
                </div>
                
                {value.emergencyBrakeConfig?.recoveryMode?.enabled && (
                  <div className="space-y-2">
                    <div>
                      <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Stabilization Bars
                      </label>
                      <input
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
                        onBlur={() => handleInputBlur('stabilizationBars', (val) =>
                          handleUpdate({
                            emergencyBrakeConfig: {
                              ...value.emergencyBrakeConfig,
                              recoveryMode: {
                                ...value.emergencyBrakeConfig?.recoveryMode,
                                stabilizationBars: val,
                              },
                            },
                          })
                        )}
                        className="w-full px-3 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                      <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                        Number of stable bars required before resuming
                      </div>
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
                      <label className="text-xs font-medium text-gray-700 dark:text-gray-300">
                        Automatically resume after stabilization (or require manual resume)
                      </label>
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="bg-yellow-50 dark:bg-yellow-900/20 rounded-lg p-3 border border-yellow-200 dark:border-yellow-800">
              <div className="flex items-start gap-2">
                <span className="text-yellow-600 dark:text-yellow-400 text-lg">⚠️</span>
                <div className="text-xs text-yellow-800 dark:text-yellow-300">
                  <strong>Manual Panic Button:</strong> This feature is always enabled. When active, you can pause all DCAs instantly from the dashboard with one click, regardless of other settings.
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
