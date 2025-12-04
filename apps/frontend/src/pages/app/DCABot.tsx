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
} from 'lucide-react';
import { useThemeStore } from '../../store/theme';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import BotConfiguration, { type BotConfigurationData } from '../../components/bots/BotConfiguration';
import EntryConditions, { type EntryConditionsData } from '../../components/bots/EntryConditions';
import DCASettings, { type DCASettingsData } from '../../components/bots/DCASettings';
import AdvancedFeatures, { type AdvancedFeaturesData } from '../../components/bots/AdvancedFeatures';

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
            <ConfigSection
              id="advanced-features"
              title="Advanced Features"
              icon={Sparkles}
              description="Market regime detection, dynamic scaling, profit taking"
            >
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
            </ConfigSection>
          </div>

          {/* Right Column - Summary & Stats */}
          <div className="space-y-4">
            {/* Bot Summary */}
            <div
              className={`rounded-xl border p-6 ${
                isDark
                  ? 'border-gray-700/50 bg-gray-800/30'
                  : 'border-gray-200 bg-white'
              }`}
            >
              <h3 className={`font-semibold mb-4 ${isDark ? 'text-white' : 'text-gray-900'}`}>
                Bot Summary
              </h3>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                    Status
                  </span>
                  <div className="flex items-center gap-2">
                    <div
                      className={`w-2 h-2 rounded-full ${
                        isActive ? 'bg-emerald-400' : 'bg-gray-400'
                      }`}
                    />
                    <span className={`text-sm font-medium ${isDark ? 'text-white' : 'text-gray-900'}`}>
                      {isActive ? 'Active' : 'Inactive'}
                    </span>
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <span className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                    Mode
                  </span>
                  <span
                    className={`text-sm font-medium ${
                      tradingMode === 'live'
                        ? 'text-rose-400'
                        : isDark
                        ? 'text-emerald-400'
                        : 'text-emerald-600'
                    }`}
                  >
                    {tradingMode === 'live' ? 'Live' : 'Paper'}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                    Exchange
                  </span>
                  <span className={`text-sm font-medium ${isDark ? 'text-white' : 'text-gray-900'}`}>
                    {config.botConfig.exchange || 'Not set'}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                    Pairs
                  </span>
                  <span className={`text-sm font-medium ${isDark ? 'text-white' : 'text-gray-900'}`}>
                    {config.botConfig.pairs.length}
                  </span>
                </div>
              </div>
            </div>

            {/* Quick Stats Placeholder */}
            <div
              className={`rounded-xl border p-6 ${
                isDark
                  ? 'border-gray-700/50 bg-gray-800/30'
                  : 'border-gray-200 bg-white'
              }`}
            >
              <h3 className={`font-semibold mb-4 ${isDark ? 'text-white' : 'text-gray-900'}`}>
                Performance
              </h3>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                    Total Invested
                  </span>
                  <span className={`text-sm font-medium ${isDark ? 'text-white' : 'text-gray-900'}`}>
                    $0.00
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                    Current Value
                  </span>
                  <span className={`text-sm font-medium ${isDark ? 'text-white' : 'text-gray-900'}`}>
                    $0.00
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                    Orders Placed
                  </span>
                  <span className={`text-sm font-medium ${isDark ? 'text-white' : 'text-gray-900'}`}>
                    0
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DCABot;

