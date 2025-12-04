import React, { useState, useCallback, useEffect } from 'react';
import {
  Bot,
  Play,
  Pause,
  Shield,
  Activity,
  DollarSign,
  TrendingUp,
  Target,
  BarChart3,
  Layers,
  Sparkles,
  Gauge,
  LineChart,
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  Save,
  CheckCircle,
} from 'lucide-react';
import { useThemeStore } from '../../store/theme';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '../../components/ui/dialog';
import BotConfiguration, { type BotConfigurationData } from '../../components/bots/BotConfiguration';
import EntryConditions, { type EntryConditionsData } from '../../components/bots/EntryConditions';
import DCASettings, { type DCASettingsData } from '../../components/bots/DCASettings';
import AdvancedFeatures, { type AdvancedFeaturesData } from '../../components/bots/AdvancedFeatures';
import BotSummary from '../../components/bots/BotSummary';

interface DCABotConfig {
  // Bot Configuration (from reusable component)
  botConfig: BotConfigurationData;
  
  // DCA Specific Configuration
  baseOrderSize: number;
  dcaInterval: number; // minutes (legacy - kept for backward compatibility)
  priceDropPercent: number; // % drop to trigger DCA (legacy - kept for backward compatibility)
  maxOrders: number; // legacy - kept for backward compatibility
  
  // DCA Settings (new component)
  dcaSettings: DCASettingsData;
  
  // Advanced Features
  advancedFeatures: AdvancedFeaturesData;
  
  // Entry Conditions
  entryConditions: EntryConditionsData;
}

const DCABot: React.FC = () => {
  const { theme } = useThemeStore();
  const isDark = theme === 'dark';

  const [tradingMode, setTradingMode] = useState<'live' | 'paper'>('paper');
  const [isActive, setIsActive] = useState(false);
  // Use Set to allow multiple sections open at once
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set(['bot-config']));
  const [expandedEntryCondition, setExpandedEntryCondition] = useState<string | null>(null);
  const [showSummaryDialog, setShowSummaryDialog] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const [createSuccess, setCreateSuccess] = useState(false);

  const [config, setConfig] = useState<DCABotConfig>({
    botConfig: {
      botName: 'My DCA Bot',
      exchange: '',
      market: 'spot', // Default to spot
      direction: 'long', // Default direction
      pairs: [], // Will be validated
      pairMode: 'single', // Default to single pair mode
    },
    baseOrderSize: 100,
    dcaInterval: 60,
    priceDropPercent: 5,
    maxOrders: 10,
    dcaSettings: {
      enabled: true,
      ruleType: 'down_from_last_entry',
      downFromLastEntryPercent: 5,
      amountType: 'fixed',
      fixedAmount: 100,
      maxDcaPerPosition: 5,
      maxDcaAcrossAllPositions: 20,
      cooldownValue: 0,
      cooldownUnit: 'minutes',
      waitForPreviousDca: false,
      stopDcaOnLoss: false,
    },
    advancedFeatures: {
      enableMarketRegime: false,
      enableDynamicScaling: false,
      enableProfitTaking: false,
      enableEmergencyBrake: false,
      marketRegimeConfig: {
        regimeTimeframe: '1d',
        pauseConditions: {
          belowMovingAverage: false,
          maPeriod: 200,
          rsiThreshold: 30,
          consecutivePeriods: 7,
          useTimeframeScaling: true,
        },
        resumeConditions: {
          volumeDecreaseThreshold: 20,
          consolidationPeriods: 5,
          priceRangePercent: 5,
          useTimeframeScaling: true,
        },
        allowEntryOverride: false,
        notifications: false,
      },
      dynamicScalingConfig: {
        volatilityMultiplier: {
          lowVolatility: 1.2,
          normalVolatility: 1.0,
          highVolatility: 0.7,
        },
        supportResistanceMultiplier: {
          nearStrongSupport: 1.5,
          neutralZone: 1.0,
          nearResistance: 0.5,
        },
        fearGreedIndex: {
          extremeFear: 1.8,
          neutral: 1.0,
          extremeGreed: 0.5,
        },
        volumeProfileWeight: false,
      },
      profitStrategyConfig: {
        partialTargets: [],
        trailingStop: {
          enabled: false,
          activationProfit: 10,
          trailingDistance: 5,
          onlyUp: true,
        },
        takeProfitAndRestart: {
          enabled: false,
          profitTarget: 30,
          useOriginalCapital: true,
        },
        timeBasedExit: {
          enabled: false,
          maxHoldDays: 30,
          minProfit: 10,
        },
      },
      emergencyBrakeConfig: {
        circuitBreaker: {
          enabled: false,
          flashCrashPercent: 10,
          timeWindowMinutes: 5,
        },
        marketWideCrashDetection: {
          enabled: false,
          correlationThreshold: 0.8,
          marketDropPercent: 15,
        },
        recoveryMode: {
          enabled: false,
          stabilizationBars: 10,
          resumeAfterStabilized: true,
        },
      },
    },
    entryConditions: {
      entryType: 'immediate',
      orderType: 'market',
      limitPrice: undefined,
      limitPrices: undefined,
      limitPricePercent: undefined,
      enabled: false,
      conditions: [],
      logicGate: 'AND',
    },
  });

  const toggleSection = useCallback((id: string) => {
    setExpandedSections((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      return newSet;
    });
  }, []);

  const ConfigSection = ({
    id,
    title,
    icon: Icon,
    description,
    children,
    defaultOpen = false,
  }: {
    id: string;
    title: string;
    icon: any;
    description: string;
    children: React.ReactNode;
    defaultOpen?: boolean;
  }) => {
    // Initialize section as open if defaultOpen is true
    useEffect(() => {
      if (defaultOpen && !expandedSections.has(id)) {
        setExpandedSections((prev) => new Set(prev).add(id));
      }
    }, [defaultOpen, id]);

    const isOpen = expandedSections.has(id);

    return (
      <div
        className={`rounded-xl border transition-all duration-200 ${
          isDark
            ? 'border-gray-700/50 bg-gray-800/30'
            : 'border-gray-200 bg-white'
        } ${isOpen ? 'ring-2 ring-blue-500/50 shadow-lg' : ''}`}
      >
        <button
          type="button"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            toggleSection(id);
          }}
          className="w-full p-4 flex items-center justify-between hover:bg-opacity-50 transition-all duration-200"
        >
          <div className="flex items-center gap-3">
            <div
              className={`p-2 rounded-lg ${
                isDark ? 'bg-blue-500/20' : 'bg-blue-100'
              }`}
            >
              <Icon className={`w-5 h-5 ${isDark ? 'text-blue-400' : 'text-blue-600'}`} />
            </div>
            <div className="text-left">
              <h3 className={`font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                {title}
              </h3>
              <p className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-600'} mt-0.5`}>
                {description}
              </p>
            </div>
          </div>
          <div className={`transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}>
            <ChevronDown className={`w-5 h-5 ${isDark ? 'text-gray-400' : 'text-gray-600'}`} />
          </div>
        </button>
        {isOpen && (
          <div className="px-4 pb-4 border-t border-gray-700/30 dark:border-gray-700/30 animate-in slide-in-from-top-2 duration-200">
            {children}
          </div>
        )}
      </div>
    );
  };

  const handleEntryConditionsChange = useCallback((newConditions: EntryConditionsData | ((prev: EntryConditionsData) => EntryConditionsData)) => {
    setConfig((prev) => ({
      ...prev,
      entryConditions: typeof newConditions === 'function' ? newConditions(prev.entryConditions) : newConditions,
    }));
  }, []);

  const handleDCASettingsChange = useCallback((newSettings: DCASettingsData | ((prev: DCASettingsData) => DCASettingsData)) => {
    setConfig((prev) => ({
      ...prev,
      dcaSettings: typeof newSettings === 'function' ? newSettings(prev.dcaSettings) : newSettings,
    }));
  }, []);

  const handleCreateBot = useCallback(async () => {
    // Validation
    if (!config.botConfig.botName || !config.botConfig.botName.trim()) {
      setCreateError('Bot name is required');
      return;
    }
    if (!config.botConfig.exchange) {
      setCreateError('Exchange is required');
      return;
    }
    if (config.botConfig.pairs.length === 0) {
      setCreateError('At least one trading pair is required');
      return;
    }
    if (!config.advancedFeatures.enableProfitTaking) {
      setCreateError('Profit Taking Strategy is required. Please enable it in Advanced Features.');
      return;
    }

    setIsCreating(true);
    setCreateError(null);
    setCreateSuccess(false);

    try {
      // Get API base URL
      const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';
      
      // Get auth token
      const { supabase } = await import('../../lib/supabase');
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;

      if (!token) {
        throw new Error('Authentication required. Please sign in.');
      }

      // Prepare bot config for API
      const botConfigPayload = {
        name: config.botConfig.botName,
        exchange: config.botConfig.exchange,
        market: config.botConfig.market || 'spot',
        direction: config.botConfig.direction || 'long',
        selectedPairs: config.botConfig.pairs,
        pairMode: config.botConfig.pairMode,
        baseOrderSize: config.baseOrderSize,
        entryConditions: config.entryConditions,
        dcaSettings: config.dcaSettings,
        advancedFeatures: config.advancedFeatures,
        tradingMode: tradingMode,
        // Legacy fields for backward compatibility
        symbol: config.botConfig.pairs[0] || '',
        interval: '1h',
        timeframe: '1h',
      };

      const response = await fetch(`${API_BASE_URL}/bots/dca-bots`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(botConfigPayload),
      });

      if (!response.ok) {
        if (response.status === 401) {
          throw new Error('Authentication required. Please sign in.');
        }
        const errorData = await response.json().catch(() => ({ detail: 'Failed to create bot' }));
        throw new Error(errorData.detail || errorData.message || 'Failed to create bot');
      }

      const result = await response.json();
      
      if (result.success) {
        setCreateSuccess(true);
        // Close dialog after 2 seconds and redirect or refresh
        setTimeout(() => {
          setShowSummaryDialog(false);
          // Optionally redirect to bots list or refresh page
          window.location.href = '/app/bots';
        }, 2000);
      } else {
        throw new Error(result.message || 'Failed to create bot');
      }
    } catch (error: any) {
      console.error('Error creating bot:', error);
      setCreateError(error.message || 'Failed to create bot. Please try again.');
    } finally {
      setIsCreating(false);
    }
  }, [config, tradingMode]);

  return (
    <div
      className={`min-h-screen pb-20 ${
        isDark ? 'bg-slate-950' : 'bg-gray-50'
      } transition-colors duration-200`}
    >
      <div className="mx-auto max-w-7xl px-6 pt-8 pb-12">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div
                className={`p-3 rounded-xl ${
                  isDark ? 'bg-blue-500/20' : 'bg-blue-100'
                }`}
              >
                <Bot className={`w-6 h-6 ${isDark ? 'text-blue-400' : 'text-blue-600'}`} />
              </div>
              <div>
                <h1 className={`text-3xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                  DCA Bot
                </h1>
                <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'} mt-1`}>
                  Advanced Dollar Cost Averaging Trading Bot
                </p>
              </div>
            </div>

            {/* Trading Mode Toggle & Start Button */}
            <div className="flex items-center gap-4">
              <div
                className={`flex items-center gap-2 px-4 py-2 rounded-lg border ${
                  isDark
                    ? 'border-gray-700 bg-gray-800/50'
                    : 'border-gray-200 bg-white'
                }`}
              >
                <div
                  className={`flex items-center gap-2 ${
                    tradingMode === 'paper' ? 'opacity-50' : ''
                  }`}
                >
                  <Shield className="w-4 h-4 text-emerald-400" />
                  <span className={`text-sm font-medium ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                    Paper
                  </span>
                </div>
                <button
                  onClick={() => setTradingMode(tradingMode === 'live' ? 'paper' : 'live')}
                  className={`relative w-12 h-6 rounded-full transition-colors ${
                    tradingMode === 'live'
                      ? 'bg-emerald-500'
                      : isDark
                      ? 'bg-gray-700'
                      : 'bg-gray-300'
                  }`}
                >
                  <div
                    className={`absolute top-1 left-1 w-4 h-4 rounded-full bg-white transition-transform ${
                      tradingMode === 'live' ? 'translate-x-6' : ''
                    }`}
                  />
                </button>
                <div
                  className={`flex items-center gap-2 ${
                    tradingMode === 'live' ? '' : 'opacity-50'
                  }`}
                >
                  <Activity className="w-4 h-4 text-rose-400" />
                  <span className={`text-sm font-medium ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                    Live
                  </span>
                </div>
              </div>

              <Button
                onClick={() => setIsActive(!isActive)}
                size="lg"
                className={`${
                  isActive
                    ? 'bg-rose-500 hover:bg-rose-600'
                    : 'bg-emerald-500 hover:bg-emerald-600'
                } text-white`}
                disabled={!config.botConfig.exchange || config.botConfig.pairs.length === 0}
              >
                {isActive ? (
                  <>
                    <Pause className="w-4 h-4 mr-2" />
                    Stop Bot
                  </>
                ) : (
                  <>
                    <Play className="w-4 h-4 mr-2" />
                    Start Bot
                  </>
                )}
              </Button>
            </div>
          </div>

          {/* Status Banner */}
          {isActive && (
            <div
              className={`rounded-xl border ${
                isDark
                  ? 'border-emerald-500/30 bg-emerald-500/10'
                  : 'border-emerald-200 bg-emerald-50'
              } p-4 flex items-center gap-3`}
            >
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse" />
                <span className={`font-medium ${isDark ? 'text-emerald-400' : 'text-emerald-700'}`}>
                  Bot is {tradingMode === 'live' ? 'actively trading' : 'running in paper mode'}
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Main Content */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column - Configuration */}
          <div className="lg:col-span-2 space-y-4">
            {/* Bot Configuration */}
            <ConfigSection
              id="bot-config"
              title="Bot Configuration"
              icon={Bot}
              description="Set up your bot's core trading parameters"
              defaultOpen={true}
            >
              <BotConfiguration
                config={config.botConfig}
                onChange={(newConfig) =>
                  setConfig((prev) => ({ ...prev, botConfig: newConfig }))
                }
                showTitle={false}
              />
            </ConfigSection>

            {/* Entry Conditions */}
            <ConfigSection
              id="entry-conditions"
              title="Entry Conditions"
              icon={Target}
              description="Define when the bot should start trading"
            >
              <EntryConditions
                key="entry-conditions-component"
                conditions={config.entryConditions}
                onChange={handleEntryConditionsChange}
                showTitle={false}
                selectedPairs={config.botConfig.pairs}
                expandedConditionId={expandedEntryCondition}
                onExpandedChange={setExpandedEntryCondition}
              />
            </ConfigSection>

            {/* DCA Settings */}
            <ConfigSection
              id="dca-settings"
              title="DCA Settings"
              icon={Layers}
              description="Configure dollar cost averaging intervals and rules"
            >
              <DCASettings
                key="dca-settings-component"
                value={config.dcaSettings}
                onChange={handleDCASettingsChange}
                baseOrderCurrency="USDT"
                baseOrderSize={config.baseOrderSize}
                pairMode={config.botConfig.pairMode}
                numberOfPairs={config.botConfig.pairs.length}
                onBaseOrderSizeChange={(size) =>
                  setConfig((prev) => ({ ...prev, baseOrderSize: size }))
                }
              />
            </ConfigSection>

            {/* Advanced Features */}
            <AdvancedFeatures
              value={config.advancedFeatures}
              onChange={(features) =>
                setConfig((prev) => ({
                  ...prev,
                  advancedFeatures: typeof features === 'function' ? features(prev.advancedFeatures) : features,
                }))
              }
              baseOrderCurrency="USDT"
              entryConditions={config.entryConditions}
            />
          </div>

          {/* Right Column - Summary & Stats */}
          <div className="space-y-4">
            <BotSummary
              botConfig={config.botConfig}
              entryConditions={config.entryConditions}
              dcaSettings={config.dcaSettings}
              advancedFeatures={config.advancedFeatures}
              baseOrderSize={config.baseOrderSize}
              isDark={isDark}
            />
          </div>
        </div>

        {/* Save Bot Button - Fixed at bottom */}
        <div className={`fixed bottom-0 left-0 right-0 ${isDark ? 'bg-slate-950' : 'bg-gray-50'} border-t ${isDark ? 'border-gray-800' : 'border-gray-200'} p-4 z-10`}>
          <div className="max-w-7xl mx-auto flex justify-end">
            <Button
              onClick={() => setShowSummaryDialog(true)}
              className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium flex items-center gap-2"
            >
              <Save className="w-4 h-4" />
              Save Bot
            </Button>
          </div>
        </div>
      </div>

      {/* Summary Dialog */}
      <Dialog open={showSummaryDialog} onOpenChange={setShowSummaryDialog}>
        <DialogContent className={`max-w-4xl max-h-[90vh] overflow-y-auto ${isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
          <DialogHeader>
            <DialogTitle className={isDark ? 'text-white' : 'text-gray-900'}>
              Bot Summary & Create
            </DialogTitle>
            <DialogDescription className={isDark ? 'text-gray-400' : 'text-gray-600'}>
              Review your bot configuration before creating it
            </DialogDescription>
          </DialogHeader>

          <div className="mt-4">
            <BotSummary
              botConfig={config.botConfig}
              entryConditions={config.entryConditions}
              dcaSettings={config.dcaSettings}
              advancedFeatures={config.advancedFeatures}
              baseOrderSize={config.baseOrderSize}
              isDark={isDark}
            />
          </div>

          {createError && (
            <div className={`mt-4 p-3 rounded-lg ${isDark ? 'bg-red-900/20 border border-red-800' : 'bg-red-50 border border-red-200'}`}>
              <div className="flex items-center gap-2">
                <AlertTriangle className={`w-5 h-5 ${isDark ? 'text-red-400' : 'text-red-600'}`} />
                <span className={`text-sm ${isDark ? 'text-red-300' : 'text-red-800'}`}>
                  {createError}
                </span>
              </div>
            </div>
          )}

          {createSuccess && (
            <div className={`mt-4 p-3 rounded-lg ${isDark ? 'bg-green-900/20 border border-green-800' : 'bg-green-50 border border-green-200'}`}>
              <div className="flex items-center gap-2">
                <CheckCircle className={`w-5 h-5 ${isDark ? 'text-green-400' : 'text-green-600'}`} />
                <span className={`text-sm ${isDark ? 'text-green-300' : 'text-green-800'}`}>
                  Bot created successfully! You can now start it from the bots list.
                </span>
              </div>
            </div>
          )}

          <DialogFooter className="mt-6">
            <Button
              variant="outline"
              onClick={() => {
                setShowSummaryDialog(false);
                setCreateError(null);
                setCreateSuccess(false);
              }}
              disabled={isCreating}
              className={isDark ? 'border-gray-700 text-gray-300 hover:bg-gray-700' : ''}
            >
              Cancel
            </Button>
            <Button
              onClick={handleCreateBot}
              disabled={isCreating || createSuccess}
              className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium flex items-center gap-2 disabled:opacity-50"
            >
              {isCreating ? (
                <>
                  <Activity className="w-4 h-4 animate-spin" />
                  Creating...
                </>
              ) : createSuccess ? (
                <>
                  <CheckCircle className="w-4 h-4" />
                  Created
                </>
              ) : (
                <>
                  <Bot className="w-4 h-4" />
                  Create Bot
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default DCABot;

