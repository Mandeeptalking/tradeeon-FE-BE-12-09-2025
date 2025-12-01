import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Settings, TrendingUp, TrendingDown, ChevronDown, ChevronUp, Check, X, Info, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';
import Tooltip from '../components/Tooltip';
import { logger } from '../utils/logger';
import { authenticatedFetch } from '../lib/api/auth';
import { connectionsApi } from '../lib/api/connections';
import type { Connection } from '../types/connections';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '../components/ui/dialog';

const AVAILABLE_EXCHANGES = ['Binance', 'Coinbase', 'Kraken'];

// Security: Enforce HTTPS in production
function getApiBaseUrl(): string {
  const apiUrl = import.meta.env.VITE_API_URL;
  
  if (import.meta.env.PROD) {
    if (!apiUrl || !apiUrl.startsWith('https://')) {
      throw new Error('API URL must use HTTPS in production');
    }
    return apiUrl;
  }
  
  return apiUrl || 'http://localhost:8000';
}

// Exchange pair fetching functions
const fetchBinancePairs = async (): Promise<string[]> => {
  try {
    const response = await fetch('https://api.binance.com/api/v3/exchangeInfo');
    const data = await response.json();
    return data.symbols
      .filter((s: any) => s.status === 'TRADING')
      .map((s: any) => s.symbol);
  } catch (error) {
    logger.error('Failed to fetch Binance pairs:', error);
    return ['BTCUSDT', 'ETHUSDT', 'BNBUSDT']; // Fallback
  }
};

export default function DCABot() {
  const navigate = useNavigate();
  // Trading mode: test (paper trading) or live (real trading)
  const [tradingMode, setTradingMode] = useState<'test' | 'live'>('test');
  // Modal state for live trading confirmation
  const [showLiveTradingModal, setShowLiveTradingModal] = useState(false);
  // Modal state for bot creation summary
  const [showBotSummaryModal, setShowBotSummaryModal] = useState(false);
  // Store bot config for summary modal
  const [pendingBotConfig, setPendingBotConfig] = useState<any>(null);
  
  const [botName, setBotName] = useState('ETH/USDT Classic trading');
  const [market, setMarket] = useState<'spot' | 'futures'>('spot');
  const [direction, setDirection] = useState<'long' | 'short'>('long');
  const [pair, setPair] = useState('ETH/USDT');
  const [selectedPairs, setSelectedPairs] = useState<string[]>(['ETH/USDT']);
  const [exchange, setExchange] = useState('My Binance | Binance Spot');
  const [botType, setBotType] = useState<'single' | 'multi'>('single');
  const [profitCurrency, setProfitCurrency] = useState<'quote' | 'base'>('quote');
  
  // Connection status
  const [connections, setConnections] = useState<Connection[]>([]);
  const [connectionsLoading, setConnectionsLoading] = useState(true);
  
  // Store multi-pair selections separately
  const [multiPairSelection, setMultiPairSelection] = useState<string[]>([]);
  
  // Entry orders - default to quote currency
  const [baseOrderSize, setBaseOrderSize] = useState(20);
  const [baseOrderCurrency, setBaseOrderCurrency] = useState(pair.split('/')[1] || 'USDT');
  const [startOrderType, setStartOrderType] = useState<'market' | 'limit'>('market');
  const [tradeStartCondition, setTradeStartCondition] = useState(false);
  
  // Trading Conditions
  const [conditionType, setConditionType] = useState<string>('RSI Conditions');
  
  // Condition Playbook Types
  interface ConditionPlaybookItem {
    id: string;
    conditionType: string;
    condition: {
      indicator: string;
      operator: string;
      value: number;
      timeframe: string;
      period?: number;
      maType?: string;
      fastMA?: number;
      slowMA?: number;
      priceMaType?: string;
      maLength?: number;
      pricePercentage?: number;
      macdComponent?: string;
      fastPeriod?: number;
      slowPeriod?: number;
      signalPeriod?: number;
      mfiPeriod?: number;
      cciPeriod?: number;
      lowerBound?: number; // For "between" operator
      upperBound?: number; // For "between" operator
    };
    logic?: 'AND' | 'OR';
    priority: number; // Order in which condition should be evaluated
    validityDuration?: number; // How long (in bars/minutes) condition stays valid
    validityDurationUnit?: 'bars' | 'minutes'; // Unit for validity duration
    enabled: boolean;
  }
  
  const [conditionPlaybook, setConditionPlaybook] = useState<ConditionPlaybookItem[]>([]);
  const [playbookGateLogic, setPlaybookGateLogic] = useState<'ALL' | 'ANY'>('ALL'); // ALL = all must be true, ANY = at least one
  const [playbookEvaluationOrder, setPlaybookEvaluationOrder] = useState<'priority' | 'sequential'>('priority');
  const [showPlaybookBuilder, setShowPlaybookBuilder] = useState(false);
  const [editingConditionId, setEditingConditionId] = useState<string | null>(null);
  const [showConditionsInfo, setShowConditionsInfo] = useState(false);
  const [showDcaRulesInfo, setShowDcaRulesInfo] = useState(false);
  
  // DCA Rules
  const [dcaRuleType, setDcaRuleType] = useState<string>('down_from_last_entry');
  const [dcaRules, setDcaRules] = useState({
    downFromLastEntryPercent: 2.0,
    downFromAveragePricePercent: 5.0,
    lossByPercent: 10.0,
    lossByAmount: 100.0,
    customCondition: false,
    // DCA Limits
    maxDcaPerPosition: 5,
    maxDcaAcrossAllPositions: 20,
    // DCA Spacing & Timing
    dcaCooldownValue: 0,
    dcaCooldownUnit: 'minutes', // 'minutes' or 'bars'
    waitForPreviousDca: false,
    // Position Limits
    maxTotalInvestmentPerPosition: 1000,
    stopDcaOnLoss: false,
    stopDcaOnLossType: 'percent', // 'percent' or 'amount'
    stopDcaOnLossPercent: 20.0,
    stopDcaOnLossAmount: 200.0
  });
  const [dcaCustomCondition, setDcaCustomCondition] = useState<{
    conditionType: string;
    condition: {
      indicator: string;
      operator: string;
      value: number;
      timeframe: string;
      period?: number;
      maType?: string;
      fastMA?: number;
      slowMA?: number;
      priceMaType?: string;
      maLength?: number;
      pricePercentage?: number;
      macdComponent?: string;
      fastPeriod?: number;
      slowPeriod?: number;
      signalPeriod?: number;
      mfiPeriod?: number;
      cciPeriod?: number;
      lowerBound?: number;
      upperBound?: number;
    };
  } | null>(null);
  
  // Bot status and statistics
  const [botStatus, setBotStatus] = useState<{
    status?: string;
    balance?: number;
    current_balance?: number;
    totalPnl?: number;
    total_pnl?: number;
    returnPct?: number;
    total_return_pct?: number;
    openPositions?: number;
    positions?: Record<string, any>;
    paused?: boolean;
    initial_balance?: number;
    total_invested?: number;
    total_position_value?: number;
  } | null>(null);
  const [botId, setBotId] = useState<string | null>(null);
  const [statusPolling, setStatusPolling] = useState(false);
  const statusPollingRef = useRef(false); // Ref to track polling state without dependency issues
  
  // Conflict detection
  const [showConflictWarning, setShowConflictWarning] = useState(false);
  const [conflictDetails, setConflictDetails] = useState<string[]>([]);
  
  // DCA Amount
  const [dcaAmountType, setDcaAmountType] = useState<'fixed' | 'percentage'>('fixed');
  const [dcaAmount, setDcaAmount] = useState(100.0);
  const [dcaAmountPercentage, setDcaAmountPercentage] = useState(10.0);
  const [dcaMultiplier, setDcaMultiplier] = useState(1.0);

  // Phase 1: Smart Market Regime Detection
  const [marketRegimeConfig, setMarketRegimeConfig] = useState({
    enabled: false,
    regimeTimeframe: '1d', // Timeframe for regime analysis (can be different from trading timeframe)
    allowEntryOverride: false, // Allow entry conditions to override pause when they trigger
    pauseConditions: {
      belowMovingAverage: true,
      maPeriod: 200, // Periods (not days) - will scale based on regimeTimeframe
      rsiThreshold: 30,
      consecutivePeriods: 7, // Changed from "days" to "periods"
      useTimeframeScaling: true // If true, treats consecutivePeriods as "days equivalent"
    },
    resumeConditions: {
      volumeDecreaseThreshold: 20, // % decrease in volume
      consolidationPeriods: 5, // Changed from "days" to "periods"
      useTimeframeScaling: true,
      priceRangePercent: 5 // ±5% consolidation
    },
    notifications: true
  });

  // Phase 1: Dynamic DCA Amount Scaling
  const [dynamicScalingConfig, setDynamicScalingConfig] = useState({
    enabled: false,
    volatilityMultiplier: {
      lowVolatility: 1.2,
      normalVolatility: 1.0,
      highVolatility: 0.7
    },
    supportResistanceMultiplier: {
      nearStrongSupport: 1.5,
      neutralZone: 1.0,
      nearResistance: 0.5
    },
    volumeProfileWeight: false,
    fearGreedIndex: {
      extremeFear: 1.8,
      neutral: 1.0,
      extremeGreed: 0.5
    }
  });

  // Phase 1: Intelligent Profit Taking Strategy
  const [profitStrategyConfig, setProfitStrategyConfig] = useState({
    enabled: false,
    partialTargets: [
      { profitPercent: 15, sellPercent: 25 },
      { profitPercent: 25, sellPercent: 50 }
    ],
    trailingStop: {
      enabled: false,
      activationProfit: 10, // Start trailing after +10%
      trailingDistance: 5, // Maintain 5% below peak
      onlyUp: true
    },
    takeProfitAndRestart: {
      enabled: false,
      profitTarget: 30,
      useOriginalCapital: true
    },
    timeBasedExit: {
      enabled: false,
      maxHoldDays: 30,
      minProfit: 10 // Only exit if at least 10% profit
    }
  });

  // Phase 1: Emergency Brake System
  const [emergencyBrakeConfig, setEmergencyBrakeConfig] = useState({
    enabled: false,
    circuitBreaker: {
      enabled: true,
      flashCrashPercent: 10, // 10% drop
      timeWindowMinutes: 5
    },
    marketWideCrashDetection: {
      enabled: true,
      correlationThreshold: 0.8, // 80% correlation drop
      marketDropPercent: 15
    },
    recoveryMode: {
      enabled: true,
      stabilizationBars: 10,
      resumeAfterStabilized: true
    }
  });
  
  // Helper function to update a condition in the playbook
  const updatePlaybookCondition = (id: string, updates: Partial<ConditionPlaybookItem>) => {
    setConditionPlaybook(conditionPlaybook.map(item => 
      item.id === id ? { ...item, ...updates } : item
    ));
  };
  
  // Helper function to save current condition to playbook
  const saveConditionToPlaybook = (id: string) => {
    updatePlaybookCondition(id, {
      condition: { ...entryCondition },
      conditionType: conditionType
    });
    setEditingConditionId(null);
  };
  
  const [entryCondition, setEntryCondition] = useState<{
    indicator: string;
    operator: string;
    value: number;
    timeframe: string;
    period?: number;
    maType?: string;
    fastMA?: number;
    slowMA?: number;
    // Price Action fields
    priceMaType?: string;
    maLength?: number;
    pricePercentage?: number;
    // MACD fields
    macdComponent?: string;
    fastPeriod?: number;
    slowPeriod?: number;
    signalPeriod?: number;
    // MFI fields
    mfiPeriod?: number;
    // CCI fields
    cciPeriod?: number;
    // Between operator fields
    lowerBound?: number;
    upperBound?: number;
  }>({
    indicator: 'RSI',
    operator: 'crosses_below',
    value: 30,
    timeframe: '1m',
    period: 14,
    maType: 'EMA',
    fastMA: 9,
    slowMA: 26,
    // Price Action defaults
    priceMaType: 'EMA',
    maLength: 20,
    pricePercentage: 1.0,
    // MACD defaults
    macdComponent: 'histogram',
    fastPeriod: 12,
    slowPeriod: 26,
    signalPeriod: 9,
    // MFI defaults
    mfiPeriod: 14,
    // CCI defaults
    cciPeriod: 14,
    // Between operator defaults
    lowerBound: 25,
    upperBound: 35
  });
  
  // Available pairs for dropdown
  const [helperPairs, setHelperPairs] = useState<string[]>([]);
  const [allPairs, setAllPairs] = useState<string[]>([]);
  const [showPairsDropdown, setShowPairsDropdown] = useState(false);
  const [pairSearch, setPairSearch] = useState('');
  const [loadingPairs, setLoadingPairs] = useState(false);
  const [selectedQuoteCurrency, setSelectedQuoteCurrency] = useState<string>('');

  // Load all pairs when dropdown opens
  useEffect(() => {
    if (showPairsDropdown && allPairs.length === 0 && !loadingPairs) {
      const loadAllPairs = async () => {
        setLoadingPairs(true);
        try {
          const pairs = await fetchBinancePairs();
          setAllPairs(pairs);
          setHelperPairs(pairs);
        } catch (error) {
          console.error('Failed to load pairs:', error);
          setHelperPairs(['BTCUSDT', 'ETHUSDT', 'BNBUSDT']); // Fallback
        } finally {
          setLoadingPairs(false);
        }
      };
      loadAllPairs();
    }
  }, [showPairsDropdown, allPairs.length, loadingPairs]);

  // Filter pairs based on search and quote currency
  useEffect(() => {
    if (allPairs.length > 0) {
      let filtered = allPairs;
      
      // Filter by quote currency first
      if (selectedQuoteCurrency) {
        filtered = filtered.filter(p => p.endsWith(selectedQuoteCurrency));
      }
      
      // Then filter by search
      if (pairSearch) {
        filtered = filtered.filter(p => 
          p.toLowerCase().includes(pairSearch.toLowerCase())
        );
      }
      
      setHelperPairs(filtered);
    }
  }, [pairSearch, allPairs, selectedQuoteCurrency]);

  // Update base order currency to quote currency when pair changes
  useEffect(() => {
    const quoteCurrency = pair.split('/')[1];
    if (quoteCurrency) {
      setBaseOrderCurrency(quoteCurrency);
    }
  }, [pair]);

  // Fetch connections on mount
  useEffect(() => {
    const fetchConnections = async () => {
      try {
        setConnectionsLoading(true);
        const conns = await connectionsApi.listConnections();
        setConnections(conns);
      } catch (error) {
        logger.error('Failed to fetch connections:', error);
        setConnections([]);
      } finally {
        setConnectionsLoading(false);
      }
    };
    fetchConnections();
  }, []);

  // Check if selected exchange has valid connection
  const getConnectionStatus = (): { isValid: boolean; connection?: Connection } => {
    // In test mode, always return valid - no connection check needed for paper trading
    if (tradingMode === 'test') {
      return { isValid: true };
    }
    
    // While loading, don't show warnings
    if (connectionsLoading) {
      return { isValid: true };
    }
    
    // Extract exchange name from selection (e.g., "My Binance | Binance Spot" -> "BINANCE")
    const exchangeMap: Record<string, string> = {
      'My Binance | Binance Spot': 'BINANCE',
      'My Binance | Binance Futures': 'BINANCE',
      'My Coinbase | Coinbase': 'COINBASE',
      'My Kraken | Kraken': 'KRAKEN',
    };
    
    const exchangeCode = exchangeMap[exchange];
    if (!exchangeCode) {
      return { isValid: false };
    }
    
    // Find active connection for this exchange
    const connection = connections.find(
      (conn) => conn.exchange === exchangeCode && 
      (conn.status === 'connected' || conn.status === 'degraded')
    );
    
    return {
      isValid: !!connection,
      connection
    };
  };

  const connectionStatus = getConnectionStatus();

  const handlePairClick = (pairSymbol: string) => {
    const normalizedPair = pairSymbol.replace('USDT', '/USDT');
    if (selectedPairs.includes(normalizedPair)) {
      // Deselect if already selected
      const newPairs = selectedPairs.filter(p => p !== normalizedPair);
      setSelectedPairs(newPairs);
      if (newPairs.length > 0) {
        setPair(newPairs[0]);
      }
    } else {
      // Add to selection
      const newPairs = [...selectedPairs, normalizedPair];
      setSelectedPairs(newPairs);
      setPair(normalizedPair);
      
      // If in multi-pair mode, save the selection
      if (botType === 'multi') {
        setMultiPairSelection(newPairs);
      }
    }
    setShowPairsDropdown(false);
    setPairSearch('');
  };

  const handleRemovePair = (pairToRemove: string) => {
    const newPairs = selectedPairs.filter(p => p !== pairToRemove);
    setSelectedPairs(newPairs);
    if (newPairs.length > 0) {
      setPair(newPairs[0]);
    }
    
    // If in multi-pair mode, save the updated selection
    if (botType === 'multi') {
      setMultiPairSelection(newPairs);
    }
  };

  const handleBotTypeChange = (newType: 'single' | 'multi') => {
    if (newType === 'single') {
      // Switching to single-pair: save current multi-pair selection and show only the first pair
      if (botType === 'multi') {
        setMultiPairSelection(selectedPairs);
      }
      setSelectedPairs([pair]);
    } else {
      // Switching to multi-pair: restore previous multi-pair selection or keep current pair
      if (multiPairSelection.length > 0) {
        setSelectedPairs(multiPairSelection);
        setPair(multiPairSelection[0]);
      } else {
        setSelectedPairs([pair]);
      }
    }
    setBotType(newType);
  };

  // Validation function
  const validateBotConfig = (): { valid: boolean; errors: string[] } => {
    const errors: string[] = [];
    
    // Validate base order size
    if (!baseOrderSize || baseOrderSize <= 0) {
      errors.push('Base order size must be greater than 0');
    }
    if (baseOrderSize < 1) {
      errors.push('Base order size must be at least 1');
    }
    
    // Validate DCA amount
    if (dcaAmountType === 'percentage') {
      if (!dcaAmountPercentage || dcaAmountPercentage <= 0 || dcaAmountPercentage > 100) {
        errors.push('DCA amount percentage must be between 1% and 100%');
      }
    } else {
      if (!dcaAmount || dcaAmount <= 0) {
        errors.push('DCA fixed amount must be greater than 0');
      }
    }
    
    // Validate max total investment
    if (dcaRules.maxTotalInvestmentPerPosition <= 0) {
      errors.push('Max total investment per position must be greater than 0');
    }
    
    // Validate Take Profit Strategy - REQUIRED (must be enabled and configured)
    if (!profitStrategyConfig.enabled) {
      errors.push('Intelligent Profit Taking Strategy is not enabled. This strategy is mandatory for all bots to ensure proper risk management and profit-taking. Please enable "Intelligent Profit Taking Strategy" toggle and configure at least one profit target (Partial Targets, Trailing Stop, Take Profit & Restart, or Time-Based Exit).');
    } else {
      // Check if at least one TP target is configured
      const hasPartialTargets = profitStrategyConfig.partialTargets && 
        profitStrategyConfig.partialTargets.length > 0 &&
        profitStrategyConfig.partialTargets.some(t => t.profitPercent > 0 && t.sellPercent > 0);
      
      const hasTrailingStop = profitStrategyConfig.trailingStop && profitStrategyConfig.trailingStop.enabled;
      const hasTakeProfitRestart = profitStrategyConfig.takeProfitAndRestart && profitStrategyConfig.takeProfitAndRestart.enabled;
      const hasTimeBasedExit = profitStrategyConfig.timeBasedExit && profitStrategyConfig.timeBasedExit.enabled;
      
      if (!hasPartialTargets && !hasTrailingStop && !hasTakeProfitRestart && !hasTimeBasedExit) {
        errors.push('Intelligent Profit Taking Strategy is enabled but no profit targets are configured. Please configure at least one profit target (Partial Targets, Trailing Stop, Take Profit & Restart, or Time-Based Exit) before creating the bot.');
      }
      
      // Validate partial targets percentages sum to 100% if partial targets are configured
      if (hasPartialTargets) {
        const totalSellPercent = profitStrategyConfig.partialTargets.reduce(
          (sum, target) => sum + (target.sellPercent || 0), 
          0
        );
        
        if (Math.abs(totalSellPercent - 100) > 0.01) { // Allow small floating point differences
          errors.push(`Take Profit sell percentages must total 100%. Current total: ${totalSellPercent.toFixed(2)}%. Please adjust your targets so they sum to exactly 100%.`);
        }
        
        // Validate individual targets
        profitStrategyConfig.partialTargets.forEach((target, index) => {
          if (target.profitPercent <= 0) {
            errors.push(`Take Profit Target ${index + 1}: Profit % must be greater than 0`);
          }
          if (target.sellPercent <= 0 || target.sellPercent > 100) {
            errors.push(`Take Profit Target ${index + 1}: Sell % must be between 1% and 100%`);
          }
        });
      }
    }
    
    // Validate selected pairs
    if (selectedPairs.length === 0) {
      errors.push('At least one trading pair must be selected');
    }
    
    // Validate bot name
    if (!botName || botName.trim().length === 0) {
      errors.push('Bot name is required');
    }
    
    return {
      valid: errors.length === 0,
      errors
    };
  };

  const handleStartBot = () => {
    // Validate bot configuration first
    const validation = validateBotConfig();
    if (!validation.valid) {
      // Check if the error is about TP strategy
      const hasTpError = validation.errors.some(err => 
        err.includes('Intelligent Profit Taking Strategy') || 
        err.includes('Take Profit') ||
        err.includes('profit target')
      );
      
      if (hasTpError) {
        toast.error('⚠️ Profit Taking Strategy Required', {
          description: validation.errors.join('\n\n') + '\n\n💡 Why is this required?\nThe Intelligent Profit Taking Strategy is mandatory to ensure your bot has a proper exit strategy. Without it, your bot would hold positions indefinitely without taking profits, which increases risk.',
          duration: 8000
        });
      } else {
        toast.error('Please fix the following errors:', {
          description: validation.errors.join('\n'),
          duration: 5000
        });
      }
      return;
    }
    
    // Show summary modal first instead of creating bot directly
    // Prepare bot config for summary display
    // IMPORTANT: conditionConfig must be null when tradeStartCondition is false (Immediate mode)
    let conditionConfig: any = null;
    
    // Only set conditionConfig if Start Mode is "Wait for Signal" (tradeStartCondition = true)
    // When Immediate mode, conditionConfig stays null - no entry conditions needed
    if (tradeStartCondition) {
      if (showPlaybookBuilder && conditionPlaybook.length > 0) {
        conditionConfig = {
          mode: 'playbook',
          gateLogic: playbookGateLogic,
          conditions: conditionPlaybook.filter(c => c.enabled).length
        };
      } else if (conditionType) {
        conditionConfig = {
          mode: 'simple',
          conditionType: conditionType,
          condition: {
            ...entryCondition,
            operator: entryCondition.operator,
            value: entryCondition.value,
            period: entryCondition.period
          }
        };
      }
    } else {
      // Explicitly set to null for Immediate mode to ensure no conditions are shown
      conditionConfig = null;
    }

    const dcaRulesConfig: any = {
      ruleType: dcaRuleType,
      maxDcaPerPosition: dcaRules.maxDcaPerPosition,
      dcaCooldownValue: dcaRules.dcaCooldownValue,
      dcaCooldownUnit: dcaRules.dcaCooldownUnit
    };

    const phase1Config = {
      marketRegime: marketRegimeConfig.enabled,
      dynamicScaling: dynamicScalingConfig.enabled,
      profitStrategy: profitStrategyConfig.enabled,
      emergencyBrake: emergencyBrakeConfig.enabled
    };

    const configForSummary = {
      botName,
      direction,
      pair: botType === 'single' ? pair : `${selectedPairs.length} pairs`,
      selectedPairs,
      exchange,
      botType,
      profitCurrency,
      baseOrderSize,
      baseOrderCurrency,
      startOrderType,
      tradeStartCondition,
      conditionConfig,
      dcaRules: dcaRulesConfig,
      phase1Features: phase1Config,
      tradingMode
    };

    setPendingBotConfig(configForSummary);
    setShowBotSummaryModal(true);
  };

  const handleConfirmBotCreation = async () => {
    if (!pendingBotConfig) return;
    
    // Validate again before creating (double-check)
    const validation = validateBotConfig();
    if (!validation.valid) {
      // Check if the error is about TP strategy
      const hasTpError = validation.errors.some(err => 
        err.includes('Intelligent Profit Taking Strategy') || 
        err.includes('Take Profit') ||
        err.includes('profit target') ||
        err.includes('Profit Taking Strategy')
      );
      
      if (hasTpError) {
        // Format error message for better readability
        const formattedErrors = validation.errors.map(err => {
          // Replace newlines with spaces for toast display
          return err.replace(/\n/g, ' ').trim();
        }).join('\n\n');
        
        toast.error('⚠️ Profit Taking Strategy Required', {
          description: formattedErrors + '\n\n💡 Why is this required?\nThe Intelligent Profit Taking Strategy is mandatory to ensure your bot has a proper exit strategy. Without it, your bot would hold positions indefinitely without taking profits, which increases risk.',
          duration: 10000
        });
      } else {
        toast.error('Please fix the following errors:', {
          description: validation.errors.join('\n'),
          duration: 5000
        });
      }
      return;
    }
    
    // Close modal
    setShowBotSummaryModal(false);
    
    // Now create the bot (use the full logic from original handleStartBot)
    await createBotWithConfig();
  };

  const createBotWithConfig = async () => {
    // Prepare condition data based on mode (full config for API)
    // IMPORTANT: conditionConfig must be null when tradeStartCondition is false (Immediate mode)
    let conditionConfig: any = null;
    
    // Only set conditionConfig if Start Mode is "Wait for Signal" (tradeStartCondition = true)
    // When Immediate mode, conditionConfig stays null - bot will place orders immediately
    if (tradeStartCondition) {
      if (showPlaybookBuilder && conditionPlaybook.length > 0) {
      // Playbook mode
      conditionConfig = {
        mode: 'playbook',
        gateLogic: playbookGateLogic,
        evaluationOrder: playbookEvaluationOrder,
        conditions: conditionPlaybook
          .filter(c => c.enabled) // Only include enabled conditions
          .map(c => ({
            id: c.id,
            conditionType: c.conditionType,
            condition: {
              ...c.condition,
              type: c.conditionType === 'Price Action' ? 'price' : 'indicator',
              indicator: c.condition.indicator || 
                (c.conditionType === 'RSI Conditions' ? 'RSI' :
                 c.conditionType === 'MFI Conditions' ? 'MFI' :
                 c.conditionType === 'CCI Conditions' ? 'CCI' :
                 c.conditionType === 'Moving Average (MA)' ? c.condition.maType || 'EMA' :
                 c.conditionType === 'MACD Conditions' ? 'MACD' : 'RSI'),
              component: c.conditionType === 'MACD Conditions' ? c.condition.macdComponent || 'histogram' : 
                        c.conditionType === 'Moving Average (MA)' ? 'Fast' : undefined,
              compareWith: 'value', // Always compare with value for DCA bot conditions
              compareValue: c.condition.value, // Map 'value' to 'compareValue'
            },
            logic: c.logic || 'AND',
            priority: c.priority,
            validityDuration: c.validityDuration,
            validityDurationUnit: c.validityDurationUnit || 'bars',
            enabled: c.enabled
          }))
      };
    } else if (tradeStartCondition && conditionType) {
      // Simple mode - only set if tradeStartCondition is true
      conditionConfig = {
        mode: 'simple',
        conditionType: conditionType,
        condition: {
          ...entryCondition,
          type: conditionType === 'Price Action' ? 'price' : 'indicator',
          indicator: entryCondition.indicator || 
            (conditionType === 'RSI Conditions' ? 'RSI' :
             conditionType === 'MFI Conditions' ? 'MFI' :
             conditionType === 'CCI Conditions' ? 'CCI' :
             conditionType === 'Moving Average (MA)' ? entryCondition.maType || 'EMA' :
             conditionType === 'MACD Conditions' ? 'MACD' : 'RSI'),
          component: conditionType === 'MACD Conditions' ? entryCondition.macdComponent || 'histogram' : 
                    conditionType === 'Moving Average (MA)' ? 'Fast' : undefined,
          compareWith: 'value', // Always compare with value for DCA bot conditions
          compareValue: entryCondition.value, // Map 'value' to 'compareValue'
        }
      };
    } else {
      // Explicitly set to null for Immediate mode (tradeStartCondition = false)
      // This ensures no entry conditions are sent to backend
      conditionConfig = null;
    }

    // Prepare DCA Rules config
    const dcaRulesConfig: any = {
      ruleType: dcaRuleType,
      // DCA Limits
      maxDcaPerPosition: dcaRules.maxDcaPerPosition,
      maxDcaAcrossAllPositions: dcaRules.maxDcaAcrossAllPositions,
      // DCA Spacing & Timing
      dcaCooldownValue: dcaRules.dcaCooldownValue,
      dcaCooldownUnit: dcaRules.dcaCooldownUnit,
      waitForPreviousDca: dcaRules.waitForPreviousDca,
      // Position Investment Limits
      maxTotalInvestmentPerPosition: dcaRules.maxTotalInvestmentPerPosition,
      stopDcaOnLoss: dcaRules.stopDcaOnLoss,
      stopDcaOnLossType: dcaRules.stopDcaOnLossType,
      stopDcaOnLossPercent: dcaRules.stopDcaOnLossPercent,
      stopDcaOnLossAmount: dcaRules.stopDcaOnLossAmount
    };
    
    if (dcaRuleType === 'down_from_last_entry') {
      dcaRulesConfig.percentage = dcaRules.downFromLastEntryPercent;
    } else if (dcaRuleType === 'down_from_average') {
      dcaRulesConfig.percentage = dcaRules.downFromAveragePricePercent;
    } else if (dcaRuleType === 'loss_by_percent') {
      dcaRulesConfig.lossPercent = dcaRules.lossByPercent;
    } else if (dcaRuleType === 'loss_by_amount') {
      dcaRulesConfig.lossAmount = dcaRules.lossByAmount;
    } else if (dcaRuleType === 'custom' && dcaCustomCondition) {
      dcaRulesConfig.customCondition = {
        conditionType: dcaCustomCondition.conditionType,
        condition: {
          ...dcaCustomCondition.condition,
          type: dcaCustomCondition.conditionType === 'Price Action' ? 'price' : 'indicator',
          indicator: dcaCustomCondition.condition.indicator || 
            (dcaCustomCondition.conditionType === 'RSI Conditions' ? 'RSI' :
             dcaCustomCondition.conditionType === 'MFI Conditions' ? 'MFI' :
             dcaCustomCondition.conditionType === 'CCI Conditions' ? 'CCI' :
             dcaCustomCondition.conditionType === 'Moving Average (MA)' ? dcaCustomCondition.condition.maType || 'EMA' :
             dcaCustomCondition.conditionType === 'MACD Conditions' ? 'MACD' : 'RSI'),
          component: dcaCustomCondition.conditionType === 'MACD Conditions' ? dcaCustomCondition.condition.macdComponent || 'histogram' : 
                    dcaCustomCondition.conditionType === 'Moving Average (MA)' ? 'Fast' : undefined,
          compareWith: 'value', // Always compare with value for DCA bot conditions
          compareValue: dcaCustomCondition.condition.value, // Map 'value' to 'compareValue'
        }
      };
    }

    // Prepare DCA Amount config
    const dcaAmountConfig = {
      amountType: dcaAmountType,
      fixedAmount: dcaAmountType === 'fixed' ? dcaAmount : undefined,
      percentage: dcaAmountType === 'percentage' ? dcaAmountPercentage : undefined,
      multiplier: dcaMultiplier
    };

    // Phase 1: Advanced Features Config
    const phase1Config = {
      marketRegime: marketRegimeConfig.enabled ? marketRegimeConfig : null,
      dynamicScaling: dynamicScalingConfig.enabled ? dynamicScalingConfig : null,
      profitStrategy: profitStrategyConfig.enabled ? profitStrategyConfig : null,
      emergencyBrake: emergencyBrakeConfig.enabled ? emergencyBrakeConfig : null
    };

    const botConfig = {
      botName,
      direction,
      pair,
      selectedPairs,
      exchange,
      botType,
      profitCurrency,
      baseOrderSize,
      baseOrderCurrency,
      startOrderType,
      tradeStartCondition: tradeStartCondition, // true = wait for signal, false = open immediately
      conditionConfig, // Include playbook or simple condition config
      dcaRules: dcaRulesConfig, // Include DCA rules config
      dcaAmount: dcaAmountConfig, // Include DCA amount config
      phase1Features: phase1Config, // Phase 1 advanced features
      tradingMode: tradingMode, // 'test' or 'live'
      useLiveData: true // Always use live market data for both test and live modes
    };

    logger.debug('Bot config:', botConfig);
    
    try {
      // Verify session before making request
      const { supabase } = await import('../lib/supabase');
      const { data: { session: preSession }, error: preSessionError } = await supabase.auth.getSession();
      
      if (preSessionError || !preSession) {
        logger.error('No valid session before bot creation:', preSessionError);
        toast.error('Your session has expired. Please sign in again.');
        return;
      }
      
      logger.debug('Session verified before bot creation request');
      
      // Send to backend API
      const API_BASE_URL = getApiBaseUrl();
      const response = await authenticatedFetch(`${API_BASE_URL}/bots/dca-bots`, {
        method: 'POST',
        body: JSON.stringify(botConfig)
      });
      
      // Verify session is still valid after request
      const { data: { session: postSession }, error: postSessionError } = await supabase.auth.getSession();
      if (postSessionError || !postSession) {
        logger.error('Session lost during bot creation request:', postSessionError);
        toast.error('Your session expired during the request. Please sign in again.');
        return;
      }
      
      if (!response.ok) {
        // Handle authentication errors
        if (response.status === 401) {
          logger.error('Authentication failed during bot creation (401 response)');
          toast.error('Your session has expired. Please sign in again.');
          return;
        }
        
        const error = await response.json().catch(() => ({ detail: 'Failed to create bot' }));
        logger.error('Bot creation failed:', error);
        throw new Error(error.detail || 'Failed to create bot');
      }
      
      const result = await response.json();
      logger.debug('Bot created successfully:', result);
      
      const createdBotId = result.bot?.bot_id || result.bot_id;
      setBotId(createdBotId);
      
      if (createdBotId) {
        toast.success('DCA Bot created successfully! You can start it from the Bots page.');
        logger.debug('Bot created:', result);
        
        // Verify session and auth state before navigating
        try {
          const { supabase } = await import('../lib/supabase');
          const { useAuthStore } = await import('../store/auth');
          
          // Check Supabase session
          const { data: { session }, error: sessionError } = await supabase.auth.getSession();
          
          if (sessionError) {
            logger.error('Session error after bot creation:', sessionError);
            toast.error('Session error. Please refresh the page.');
            return;
          }
          
          if (!session) {
            logger.error('No session found after bot creation');
            toast.error('Your session expired. Please sign in again.');
            return;
          }
          
          // Verify auth store state
          const authState = useAuthStore.getState();
          if (!authState.isAuthenticated || !authState.user) {
            logger.warn('Auth store not authenticated, updating from session');
            // Update auth store from session
            useAuthStore.getState().setUser({
              id: session.user.id,
              email: session.user.email || '',
              name: session.user.user_metadata?.first_name || session.user.email?.split('@')[0] || ''
            });
          }
          
          logger.debug('Session and auth state verified, navigating to bots page');
          
          // Small delay to ensure state is updated, then navigate
          setTimeout(() => {
            // Double-check auth state before navigation
            const currentAuthState = useAuthStore.getState();
            if (currentAuthState.isAuthenticated) {
              navigate('/app/bots', { replace: true });
            } else {
              logger.error('Auth state lost before navigation');
              toast.error('Authentication lost. Please sign in again.');
            }
          }, 1000);
        } catch (sessionCheckError) {
          logger.error('Error checking session before navigation:', sessionCheckError);
          toast.error('Unable to verify session. Please refresh the page.');
        }
      } else {
        toast.success('DCA Bot created successfully with Phase 1 features!');
      }
    } catch (error: any) {
      logger.error('Error creating bot:', error);
      toast.error(`Failed to create bot: ${error.message}`);
    }
  };
  
  // Poll bot status - use ref to avoid dependency issues
  const pollBotStatus = useCallback(async (id: string) => {
    if (!statusPollingRef.current) return; // Stop if polling disabled
    
    try {
      const API_BASE_URL = getApiBaseUrl();
      const response = await authenticatedFetch(`${API_BASE_URL}/bots/dca-bots/status/${id}`, {
        method: 'GET',
      });
      if (response.ok) {
        const status = await response.json();
        setBotStatus(status);
        
        // Continue polling if running and still enabled
        if (statusPollingRef.current && status.status === 'running') {
          setTimeout(() => {
            pollBotStatus(id);
          }, 5000); // Poll every 5 seconds
        }
      } else if (response.status === 401) {
        logger.warn('Authentication failed while polling bot status');
        // Stop polling on auth error
        statusPollingRef.current = false;
      }
    } catch (error) {
      logger.error('Error fetching bot status:', error);
    }
  }, []);
  
  // Check for conflicts between entry conditions and pause conditions
  useEffect(() => {
    const conflicts: string[] = [];
    
    if (!marketRegimeConfig.enabled) {
      setShowConflictWarning(false);
      setConflictDetails([]);
      return;
    }
    
    const pauseConditions = marketRegimeConfig.pauseConditions;
    const rsiThreshold = pauseConditions.rsiThreshold || 30;
    
    // Helper function to check a single condition for conflicts
    const checkConditionConflict = (condition: any, conditionType: string, idx?: number) => {
      const label = idx !== undefined ? `Condition #${idx + 1}` : 'Entry condition';
      
      // 1. Check Moving Average conflicts
      if (pauseConditions.belowMovingAverage && conditionType === 'Moving Average (MA)') {
        const maPeriod = pauseConditions.maPeriod;
        const entryMaPeriod = condition.period || 50;
        
        if ((condition.operator === 'below' || condition.operator === 'crosses_below') && 
            entryMaPeriod <= maPeriod) {
          conflicts.push(`${label} buys when price is below ${entryMaPeriod}-period ${condition.maType || 'EMA'}, but Market Regime pauses when price is below ${maPeriod}-period MA (bear market detected)`);
        }
      }
      
      // 2. Check RSI conflicts (pause requires BOTH below MA AND RSI below threshold)
      // So if entry wants to buy when RSI is low, and price could be below MA, there's a conflict
      if (pauseConditions.belowMovingAverage && conditionType === 'RSI Conditions') {
        const entryRsiValue = condition.value || condition.rsiValue || 0;
        const entryOperator = condition.operator || '';
        
        // If entry wants to buy when RSI is below or equal to threshold (oversold buying)
        // AND pause condition includes RSI below threshold, there's potential conflict
        // (Pause requires: price < MA AND RSI < threshold)
        if ((entryOperator === 'below' || entryOperator === 'less_than' || 
             entryOperator === 'crosses_below' || entryOperator === 'crosses') &&
            entryRsiValue <= rsiThreshold) {
          conflicts.push(`${label} buys when RSI is ${entryOperator === 'crosses_below' ? 'crossing below' : 'below'} ${entryRsiValue} (oversold), but Market Regime pauses when BOTH price is below ${pauseConditions.maPeriod}-period MA AND RSI is below ${rsiThreshold}. If price is also below MA, this creates a conflict.`);
        }
      }
      
      // 3. Check Price Action conflicts (price below certain level vs pause on volume/consolidation)
      // Note: Price action conflicts are less direct, but we can warn if user wants to buy during downtrend
      if (conditionType === 'Price Action' && condition.operator === 'below') {
        conflicts.push(`${label} buys when price is below ${condition.value}, but Market Regime may pause during bear market conditions. Consider enabling override if you want to accumulate during dips.`);
      }
    };
    
    // Check simple mode condition
    if (tradeStartCondition && conditionType) {
      checkConditionConflict(entryCondition, conditionType);
    }
    
    // Check playbook conditions
    if (showPlaybookBuilder && conditionPlaybook.length > 0) {
      conditionPlaybook.forEach((cond, idx) => {
        if (cond.enabled) {
          checkConditionConflict(cond.condition, cond.conditionType, idx + 1);
        }
      });
    }
    
    // If override is enabled, conflicts are resolved
    if (conflicts.length > 0 && marketRegimeConfig.allowEntryOverride) {
      // Conflicts exist but override is enabled - show as resolved
      setConflictDetails(conflicts);
      setShowConflictWarning(true); // Keep warning but will show as resolved
    } else if (conflicts.length > 0) {
      // Conflicts exist and override is NOT enabled - show warning
      setConflictDetails(conflicts);
      setShowConflictWarning(true);
    } else {
      // No conflicts
      setShowConflictWarning(false);
      setConflictDetails([]);
    }
  }, [marketRegimeConfig, conditionType, entryCondition, showPlaybookBuilder, conditionPlaybook]);
  
  // Auto-pause status polling when component unmounts
  useEffect(() => {
    return () => {
      setStatusPolling(false);
      statusPollingRef.current = false;
    };
  }, []);
  
  // Sync ref with state
  useEffect(() => {
    statusPollingRef.current = statusPolling;
  }, [statusPolling]);

  // Debug: Log component render
  useEffect(() => {
    logger.debug('DCABot component mounted');
  }, []);
  
  return (
    <div className="h-full w-full overflow-y-auto bg-gray-50 dark:bg-gray-900 p-6">
      <div className="flex gap-6 max-w-7xl mx-auto">
        {/* Left Content Area */}
        <div className="flex-1 min-w-0">
            {/* Trading Mode Toggle - At the top */}
            <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4 mb-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Trading Mode:</span>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setTradingMode('test')}
                      className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors flex items-center gap-2 ${
                        tradingMode === 'test'
                          ? 'bg-blue-600 text-white shadow-md'
                          : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                      }`}
                    >
                      <span>🧪</span>
                      <span>Test Mode</span>
                    </button>
                    <button
                      onClick={() => {
                        // Show custom modal instead of browser alert
                        setShowLiveTradingModal(true);
                      }}
                      className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors flex items-center gap-2 ${
                        tradingMode === 'live'
                          ? 'bg-red-600 text-white shadow-md'
                          : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                      }`}
                    >
                      <span>🔴</span>
                      <span>Live Mode</span>
                    </button>
                  </div>
                </div>
                <div className={`px-3 py-1.5 rounded-lg text-xs font-medium flex items-center gap-2 ${
                  tradingMode === 'test'
                    ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400'
                    : 'bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-400'
                }`}>
                  {tradingMode === 'test' ? (
                    <>
                      <span>📊</span>
                      <span>Paper trading with live market data</span>
                    </>
                  ) : (
                    <>
                      <AlertTriangle className="w-3 h-3" />
                      <span>Real money - trades will execute</span>
                    </>
                  )}
                </div>
              </div>
            </div>
            
            {/* Main Section */}
            <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4 mb-4">
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-base font-semibold text-gray-900 dark:text-white">Main</h2>
              </div>

              <div className="grid grid-cols-2 gap-4">
                {/* Name */}
                <div>
                  <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                    Name
                  </label>
                  <input
                    type="text"
                    value={botName}
                    onChange={(e) => setBotName(e.target.value)}
                    className="w-full px-3 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                {/* Exchange */}
                <div>
                  <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                    Exchange
                  </label>
                  <select
                    value={exchange}
                    onChange={(e) => setExchange(e.target.value)}
                    className="w-full px-3 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="My Binance | Binance Spot">My Binance | Binance Spot</option>
                    <option value="My Coinbase | Coinbase">My Coinbase | Coinbase</option>
                    <option value="My Kraken | Kraken">My Kraken | Kraken</option>
                  </select>
                  {/* Only show connection status in live mode */}
                  {tradingMode === 'live' && (
                    <>
                      {!connectionsLoading && !connectionStatus.isValid && (
                        <p className="text-xs text-red-600 dark:text-red-400 mt-0.5">
                          ⚠️ No active connection found. Please connect your {exchange.split('|')[0].trim()} account in the Connections page.
                        </p>
                      )}
                      {!connectionsLoading && connectionStatus.isValid && connectionStatus.connection?.status === 'degraded' && (
                        <p className="text-xs text-amber-600 dark:text-amber-400 mt-0.5">
                          ⚠️ Connection status: Attention required. Some features may be limited.
                        </p>
                      )}
                      {!connectionsLoading && connectionStatus.isValid && connectionStatus.connection?.status === 'connected' && (
                        <p className="text-xs text-green-600 dark:text-green-400 mt-0.5">
                          ✓ Connection active ({connectionStatus.connection?.nickname || 'Connected'})
                        </p>
                      )}
                    </>
                  )}
                  {/* In test mode, show nothing - no connection validation needed */}
                </div>

                {/* Market */}
                <div>
                  <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                    Market
                  </label>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setMarket('spot')}
                      className={`flex-1 px-2 py-1.5 rounded border-2 transition-all text-xs ${
                        market === 'spot'
                          ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400 font-semibold'
                          : 'border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:border-blue-400'
                      }`}
                    >
                      Spot
                    </button>
                    <button
                      onClick={() => setMarket('futures')}
                      className={`flex-1 px-2 py-1.5 rounded border-2 transition-all text-xs ${
                        market === 'futures'
                          ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400 font-semibold'
                          : 'border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:border-blue-400'
                      }`}
                    >
                      Futures
                    </button>
                  </div>
                </div>

                {/* Direction */}
                {market === 'futures' && (
                  <div>
                  <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                    Direction
                  </label>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setDirection('long')}
                      className={`flex-1 px-2 py-1.5 rounded border-2 transition-all text-xs ${
                        direction === 'long'
                          ? 'border-green-500 bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400 font-semibold'
                          : 'border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:border-green-400'
                      }`}
                    >
                      Long
                    </button>
                    <button
                      onClick={() => setDirection('short')}
                      className={`flex-1 px-2 py-1.5 rounded border-2 transition-all text-xs ${
                        direction === 'short'
                          ? 'border-red-500 bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400 font-semibold'
                          : 'border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:border-red-400'
                      }`}
                    >
                      Short
                    </button>
                  </div>
                  </div>
                )}

                {/* Pair */}
                <div>
                  <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                    Pair {selectedPairs.length > 1 && <span className="text-blue-500">({selectedPairs.length})</span>}
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      value={pair}
                      readOnly
                      onFocus={() => setShowPairsDropdown(true)}
                      placeholder={selectedPairs.length > 1 ? `${selectedPairs.length} pairs selected` : "Select pair..."}
                      className="w-full px-2 py-1.5 pr-8 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
                    />
                    <button
                      onClick={() => setShowPairsDropdown(!showPairsDropdown)}
                      className="absolute right-2 top-1/2 transform -translate-y-1/2 p-1 hover:bg-gray-50 dark:hover:bg-gray-700 rounded transition-colors"
                    >
                      <ChevronDown className={`w-3 h-3 text-gray-600 dark:text-gray-400 transition-transform ${showPairsDropdown ? 'rotate-180' : ''}`} />
                    </button>
                    {showPairsDropdown && (
                      <div className="absolute z-10 w-full mt-1 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg shadow-lg max-h-80 overflow-y-auto">
                        <div className="p-2 border-b border-gray-200 dark:border-gray-700">
                          <input
                            type="text"
                            placeholder="Search pairs..."
                            value={pairSearch}
                            onChange={(e) => setPairSearch(e.target.value)}
                            className="w-full px-2 py-1 text-xs border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                          />
                        </div>
                        <div className="px-2 py-2 border-b border-gray-200 dark:border-gray-700">
                          <div className="flex flex-wrap gap-1">
                            {['USDT', 'USDC', 'BTC', 'ETH', 'BNB', 'FDUSD'].map((currency) => (
                              <button
                                key={currency}
                                onClick={() => setSelectedQuoteCurrency(selectedQuoteCurrency === currency ? '' : currency)}
                                className={`px-2 py-1 text-xs rounded border transition-colors ${
                                  selectedQuoteCurrency === currency
                                    ? 'bg-blue-500 text-white border-blue-600'
                                    : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 border-gray-300 dark:border-gray-600 hover:bg-gray-200 dark:hover:bg-gray-600'
                                }`}
                              >
                                {currency}
                              </button>
                            ))}
                          </div>
                        </div>
                        <div className="py-1">
                          {loadingPairs ? (
                            <div className="p-4 text-center text-gray-500 dark:text-gray-400 text-xs">
                              Loading pairs...
                            </div>
                          ) : helperPairs.length === 0 ? (
                            <div className="p-4 text-center text-gray-500 dark:text-gray-400 text-xs">
                              No pairs found
                            </div>
                          ) : (
                            helperPairs.map((p) => {
                              const normalizedPair = p.replace('USDT', '/USDT');
                              const isSelected = selectedPairs.includes(normalizedPair);
                              return (
                                <button
                                  key={p}
                                  onClick={() => handlePairClick(p)}
                                  className={`w-full text-left px-3 py-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 text-xs flex items-center justify-between ${
                                    isSelected ? 'bg-blue-50 dark:bg-blue-900/20' : ''
                                  }`}
                                >
                                  <span>{normalizedPair}</span>
                                  {isSelected && <Check className="w-3 h-3 text-blue-500" />}
                                </button>
                              );
                            })
                          )}
                          {helperPairs.length > 0 && !loadingPairs && (
                            <div className="px-3 py-2 text-xs text-gray-500 dark:text-gray-400 border-t border-gray-200 dark:border-gray-700">
                              Showing {helperPairs.length} of {allPairs.length} pairs
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                  {/* Selected Pairs Display */}
                  {selectedPairs.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-1">
                      {selectedPairs.map((p) => (
                        <span
                          key={p}
                          className={`inline-flex items-center gap-1 px-2 py-0.5 text-xs rounded-full ${
                            selectedPairs.length > 1
                              ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300'
                              : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
                          }`}
                        >
                          {p}
                          <button
                            onClick={() => handleRemovePair(p)}
                            className="hover:text-red-600 dark:hover:text-red-400"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                {/* Bot Type */}
                <div>
                  <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                    Bot type
                  </label>
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleBotTypeChange('single')}
                      className={`flex-1 px-2 py-1.5 rounded border-2 transition-all text-xs ${
                        botType === 'single'
                          ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400 font-semibold'
                          : 'border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:border-blue-400'
                      }`}
                    >
                      Single-pair
                    </button>
                    <button
                      onClick={() => handleBotTypeChange('multi')}
                      className={`flex-1 px-2 py-1.5 rounded border-2 transition-all text-xs ${
                        botType === 'multi'
                          ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400 font-semibold'
                          : 'border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:border-blue-400'
                      }`}
                    >
                      Multi-pair
                    </button>
                  </div>
                </div>

                {/* Profit Currency */}
                <div>
                  <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                    Profit currency
                  </label>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setProfitCurrency('quote')}
                      className={`flex-1 px-2 py-1.5 rounded border-2 transition-all text-xs ${
                        profitCurrency === 'quote'
                          ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400 font-semibold'
                          : 'border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:border-blue-400'
                      }`}
                    >
                      Quote (USDT)
                    </button>
                    <button
                      onClick={() => setProfitCurrency('base')}
                      className={`flex-1 px-2 py-1.5 rounded border-2 transition-all text-xs ${
                        profitCurrency === 'base'
                          ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400 font-semibold'
                          : 'border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:border-blue-400'
                      }`}
                    >
                      Base ({pair.split('/')[0]})
                    </button>
                  </div>
                </div>

              </div>
            </div>

            {/* Entry Orders Section */}
            <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4 mb-4">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-base font-semibold text-gray-900 dark:text-white">Entry orders</h2>
              </div>

              <div className="space-y-6">
                {/* Base Order and Order Type - Side by Side */}
                <div className="grid grid-cols-2 gap-6">
                  {/* Base Order Size */}
                  <div>
                    <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-4">Base order</h3>
                    <div>
                      <div className="flex gap-2">
                        <input
                          type="number"
                          value={baseOrderSize}
                          onChange={(e) => setBaseOrderSize(Number(e.target.value))}
                          className="flex-1 px-2 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                        {/* Show USDT only for multi-pair, show both for single-pair */}
                        {botType === 'single' ? (
                          <>
                            <button
                              onClick={() => setBaseOrderCurrency(pair.split('/')[1])}
                              className={`px-2 py-1.5 rounded border-2 transition-all text-xs ${
                                baseOrderCurrency === pair.split('/')[1]
                                  ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400 font-semibold'
                                  : 'border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:border-blue-400'
                              }`}
                            >
                              {pair.split('/')[1]}
                            </button>
                            <button
                              onClick={() => setBaseOrderCurrency(pair.split('/')[0])}
                              className={`px-2 py-1.5 rounded border-2 transition-all text-xs ${
                                baseOrderCurrency === pair.split('/')[0]
                                  ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400 font-semibold'
                                  : 'border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:border-blue-400'
                              }`}
                            >
                              {pair.split('/')[0]}
                            </button>
                          </>
                        ) : (
                          <button
                            onClick={() => setBaseOrderCurrency('USDT')}
                            className={`px-2 py-1.5 rounded border-2 transition-all text-xs border-blue-500 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400 font-semibold`}
                          >
                            USDT
                          </button>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Start Order Type */}
                  <div>
                    <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-4">Order type</h3>
                    <div className="flex gap-2">
                        <button
                          onClick={() => setStartOrderType('market')}
                          className={`flex-1 px-2 py-1.5 rounded border-2 transition-all text-xs ${
                            startOrderType === 'market'
                              ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400 font-semibold'
                              : 'border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:border-blue-400'
                          }`}
                        >
                          Market
                        </button>
                        <button
                          onClick={() => setStartOrderType('limit')}
                          className={`flex-1 px-2 py-1.5 rounded border-2 transition-all text-xs ${
                            startOrderType === 'limit'
                              ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400 font-semibold'
                              : 'border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:border-blue-400'
                          }`}
                        >
                          Limit
                        </button>
                      </div>
                  </div>
                </div>

                {/* Trading Conditions */}
                <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                          Trading conditions
                        </label>
                        <button
                          onClick={() => setShowConditionsInfo(true)}
                          className="text-blue-500 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 transition-colors"
                          title="Learn how conditions work"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                        </button>
                      </div>
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        For example: RSI, QFL, MACD, TradingView custom signals, etc.
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-gray-500 dark:text-gray-400">Simple</span>
                      <button
                        onClick={() => setShowPlaybookBuilder(!showPlaybookBuilder)}
                        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                          showPlaybookBuilder ? 'bg-blue-600' : 'bg-gray-300 dark:bg-gray-600'
                        }`}
                      >
                        <span
                          className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                            showPlaybookBuilder ? 'translate-x-6' : 'translate-x-1'
                          }`}
                        />
                      </button>
                      <span className="text-xs text-gray-500 dark:text-gray-400">Playbook</span>
                    </div>
                  </div>
                  {!showPlaybookBuilder ? (
                    <>
                    <div className="space-y-2">
                      <label className="text-xs font-medium text-gray-600 dark:text-gray-300 mb-1 block">
                        Trading Condition
                      </label>
                      <div className="flex items-center gap-3">
                        <label className="relative inline-flex items-center cursor-pointer">
                          <input
                            type="checkbox"
                            checked={tradeStartCondition}
                            onChange={(e) => setTradeStartCondition(e.target.checked)}
                            className="sr-only peer"
                          />
                          <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:decoration-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600"></div>
                        </label>
                        <span className="text-sm text-gray-700 dark:text-gray-300">
                          {tradeStartCondition ? '⏳ Wait for Signal' : '⚡ Place Order Immediately'}
                        </span>
                      </div>
                    </div>
                  
                    {tradeStartCondition && (
                    <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-3 space-y-3 mt-3">
                      {/* Condition Type Dropdown */}
                      <div>
                        <label className="text-xs font-medium text-gray-600 dark:text-gray-300 mb-1 block">
                          Condition Type
                        </label>
                        <select
                          value={conditionType}
                          onChange={(e) => setConditionType(e.target.value)}
                          className="w-full px-2 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                          <option value="RSI Conditions">RSI Conditions</option>
                          <option value="MFI Conditions">MFI Conditions</option>
                          <option value="CCI Conditions">CCI Conditions</option>
                          <option value="Moving Average (MA)">Moving Average (MA)</option>
                          <option value="MACD Conditions">MACD Conditions</option>
                          <option value="Price Action">Price Action</option>
                          <option value="Volume" disabled>Volume (Coming Soon)</option>
                          <option value="Custom Indicator" disabled>Custom Indicator (Coming Soon)</option>
                        </select>
                      </div>
                      
                      {/* RSI Condition Builder - Show only when RSI Conditions is selected */}
                      {conditionType === 'RSI Conditions' && (
                        <>
                          {/* Special Info Banner for "Between" Operator */}
                          {entryCondition.operator === 'between' && (
                            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 border border-blue-200 dark:border-blue-700 rounded-lg p-4 mb-3">
                              <div className="flex items-start gap-3">
                                <Info className="w-5 h-5 text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0" />
                                <div className="flex-1">
                                  <h4 className="text-sm font-semibold text-blue-900 dark:text-blue-100 mb-2 flex items-center gap-2">
                                    🎯 RSI "Between" Operator
                                    <span className="px-2 py-0.5 bg-blue-200 dark:bg-blue-800 text-blue-800 dark:text-blue-200 rounded text-xs font-bold">NEW</span>
                                  </h4>
                                  <p className="text-xs text-blue-800 dark:text-blue-200 mb-2">
                                    <strong>Catches consolidation ranges!</strong> Perfect for accumulation zones after RSI goes oversold.
                                  </p>
                                  <div className="text-xs text-blue-700 dark:text-blue-300 space-y-1">
                                    <p><strong>When it triggers:</strong></p>
                                    <ul className="list-disc list-inside ml-2 space-y-0.5">
                                      <li>RSI consolidates in your range (e.g., 25-35)</li>
                                      <li>Market makes up its mind before next move</li>
                                      <li>Better entry prices than "crosses below"</li>
                                    </ul>
                                    <p className="mt-2"><strong>Example:</strong> If RSI = 28, 30, 32 → ✅ Triggers (all in range 25-35)</p>
                                  </div>
                                  <div className="mt-3 pt-3 border-t border-blue-200 dark:border-blue-700">
                                    <p className="text-xs text-blue-700 dark:text-blue-300">
                                      💡 <strong>Pro Tip:</strong> Use with "RSI crosses above 32" using OR logic to catch both consolidation AND bounce scenarios!
                                    </p>
                                  </div>
                                </div>
                              </div>
                            </div>
                          )}
                          <div className={`grid gap-3 ${entryCondition.operator === 'between' ? 'grid-cols-5' : 'grid-cols-4'}`}>
                            <div>
                              <label className="text-xs font-medium text-gray-600 dark:text-gray-300 mb-1 block">
                                RSI Period
                              </label>
                              <input
                              type="number"
                              min="1"
                              max="100"
                              value={entryCondition.period || 14}
                              onChange={(e) => setEntryCondition({...entryCondition, period: Number(e.target.value)})}
                              className="w-full px-2 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                              placeholder="14"
                            />
                          </div>
                          <div>
                            <label className="text-xs font-medium text-gray-600 dark:text-gray-300 mb-1 block">
                              Timeframe
                            </label>
                            <select
                              value={entryCondition.timeframe}
                              onChange={(e) => setEntryCondition({...entryCondition, timeframe: e.target.value})}
                              className="w-full px-2 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                            >
                              <option value="1m">1m</option>
                              <option value="5m">5m</option>
                              <option value="15m">15m</option>
                              <option value="1h">1h</option>
                              <option value="4h">4h</option>
                              <option value="1d">1d</option>
                            </select>
                          </div>
                          <div>
                            <label className="text-xs font-medium text-gray-600 dark:text-gray-300 mb-1 block">
                              Condition
                            </label>
                            <select
                              value={entryCondition.operator}
                              onChange={(e) => setEntryCondition({...entryCondition, operator: e.target.value})}
                              className="w-full px-2 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                            >
                              <option value="crosses_below">Crosses below</option>
                              <option value="crosses_above">Crosses above</option>
                              <option value="less_than">Less than</option>
                              <option value="greater_than">Greater than</option>
                              <option value="equals">Equals</option>
                              <option value="between">🎯 Between ⭐ NEW</option>
                            </select>
                          </div>
                          {entryCondition.operator === 'between' ? (
                            <>
                              <div>
                                <label className="text-xs font-medium text-gray-600 dark:text-gray-300 mb-1 block">
                                  Lower Bound
                                </label>
                                <input
                                  type="number"
                                  min="0"
                                  max="100"
                                  value={entryCondition.lowerBound || 25}
                                  onChange={(e) => setEntryCondition({...entryCondition, lowerBound: Number(e.target.value)})}
                                  className="w-full px-2 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                                  placeholder="25"
                                />
                              </div>
                              <div>
                                <label className="text-xs font-medium text-gray-600 dark:text-gray-300 mb-1 block">
                                  Upper Bound
                                </label>
                                <input
                                  type="number"
                                  min="0"
                                  max="100"
                                  value={entryCondition.upperBound || 35}
                                  onChange={(e) => setEntryCondition({...entryCondition, upperBound: Number(e.target.value)})}
                                  className="w-full px-2 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                                  placeholder="35"
                                />
                              </div>
                            </>
                          ) : (
                            <div>
                              <label className="text-xs font-medium text-gray-600 dark:text-gray-300 mb-1 block">
                                RSI Value
                              </label>
                              <input
                                type="number"
                                min="0"
                                max="100"
                                value={entryCondition.value}
                                onChange={(e) => setEntryCondition({...entryCondition, value: Number(e.target.value)})}
                                className="w-full px-2 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                                placeholder="30"
                              />
                            </div>
                          )}
                          </div>
                        </>
                      )}

                      {/* MFI Condition Builder - Show only when MFI Conditions is selected */}
                      {conditionType === 'MFI Conditions' && (
                        <div className="grid grid-cols-4 gap-3">
                          <div>
                            <label className="text-xs font-medium text-gray-600 dark:text-gray-300 mb-1 block">
                              MFI Period
                            </label>
                            <input
                              type="number"
                              min="1"
                              max="100"
                              value={entryCondition.mfiPeriod || 14}
                              onChange={(e) => setEntryCondition({...entryCondition, mfiPeriod: Number(e.target.value)})}
                              className="w-full px-2 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                              placeholder="14"
                            />
                          </div>
                          <div>
                            <label className="text-xs font-medium text-gray-600 dark:text-gray-300 mb-1 block">
                              Timeframe
                            </label>
                            <select
                              value={entryCondition.timeframe}
                              onChange={(e) => setEntryCondition({...entryCondition, timeframe: e.target.value})}
                              className="w-full px-2 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                            >
                              <option value="1m">1m</option>
                              <option value="3m">3m</option>
                              <option value="5m">5m</option>
                              <option value="15m">15m</option>
                              <option value="30m">30m</option>
                              <option value="1h">1h</option>
                              <option value="2h">2h</option>
                              <option value="4h">4h</option>
                              <option value="6h">6h</option>
                              <option value="12h">12h</option>
                              <option value="1d">1d</option>
                            </select>
                          </div>
                          <div>
                            <label className="text-xs font-medium text-gray-600 dark:text-gray-300 mb-1 block">
                              Condition
                            </label>
                            <select
                              value={entryCondition.operator}
                              onChange={(e) => setEntryCondition({...entryCondition, operator: e.target.value})}
                              className="w-full px-2 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                            >
                              <option value="crosses_below">Crosses below</option>
                              <option value="crosses_above">Crosses above</option>
                              <option value="less_than">Less than</option>
                              <option value="greater_than">Greater than</option>
                              <option value="equals">Equals</option>
                            </select>
                          </div>
                          <div>
                            <label className="text-xs font-medium text-gray-600 dark:text-gray-300 mb-1 block">
                              MFI Value
                            </label>
                            <input
                              type="number"
                              min="0"
                              max="100"
                              value={entryCondition.value}
                              onChange={(e) => setEntryCondition({...entryCondition, value: Number(e.target.value)})}
                              className="w-full px-2 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                              placeholder="20"
                            />
                          </div>
                        </div>
                      )}

                      {/* CCI Condition Builder - Show only when CCI Conditions is selected */}
                      {conditionType === 'CCI Conditions' && (
                        <div className="grid grid-cols-4 gap-3">
                          <div>
                            <label className="text-xs font-medium text-gray-600 dark:text-gray-300 mb-1 block">
                              CCI Period
                            </label>
                            <input
                              type="number"
                              min="1"
                              max="100"
                              value={entryCondition.cciPeriod || 14}
                              onChange={(e) => setEntryCondition({...entryCondition, cciPeriod: Number(e.target.value)})}
                              className="w-full px-2 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                              placeholder="14"
                            />
                          </div>
                          <div>
                            <label className="text-xs font-medium text-gray-600 dark:text-gray-300 mb-1 block">
                              Timeframe
                            </label>
                            <select
                              value={entryCondition.timeframe}
                              onChange={(e) => setEntryCondition({...entryCondition, timeframe: e.target.value})}
                              className="w-full px-2 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                            >
                              <option value="1m">1m</option>
                              <option value="3m">3m</option>
                              <option value="5m">5m</option>
                              <option value="15m">15m</option>
                              <option value="30m">30m</option>
                              <option value="1h">1h</option>
                              <option value="2h">2h</option>
                              <option value="4h">4h</option>
                              <option value="6h">6h</option>
                              <option value="12h">12h</option>
                              <option value="1d">1d</option>
                            </select>
                          </div>
                          <div>
                            <label className="text-xs font-medium text-gray-600 dark:text-gray-300 mb-1 block">
                              Condition
                            </label>
                            <select
                              value={entryCondition.operator}
                              onChange={(e) => setEntryCondition({...entryCondition, operator: e.target.value})}
                              className="w-full px-2 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                            >
                              <option value="crosses_below">Crosses below</option>
                              <option value="crosses_above">Crosses above</option>
                              <option value="less_than">Less than</option>
                              <option value="greater_than">Greater than</option>
                              <option value="equals">Equals</option>
                            </select>
                          </div>
                          <div>
                            <label className="text-xs font-medium text-gray-600 dark:text-gray-300 mb-1 block">
                              CCI Value
                            </label>
                            <input
                              type="number"
                              min="-200"
                              max="200"
                              step="1"
                              value={entryCondition.value}
                              onChange={(e) => setEntryCondition({...entryCondition, value: Number(e.target.value)})}
                              className="w-full px-2 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                              placeholder="-100"
                            />
                          </div>
                        </div>
                      )}

                      {/* Moving Average Condition Builder - Show only when MA is selected */}
                      {conditionType === 'Moving Average (MA)' && (
                        <div className="space-y-3">
                          {/* MA Type */}
                          <div>
                            <label className="text-xs font-medium text-gray-600 dark:text-gray-300 mb-1 block">
                              MA Type
                            </label>
                            <select
                              value={entryCondition.maType || 'EMA'}
                              onChange={(e) => setEntryCondition({...entryCondition, maType: e.target.value})}
                              className="w-full px-2 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                            >
                              <option value="SMA">SMA - Simple Moving Average</option>
                              <option value="EMA">EMA - Exponential Moving Average</option>
                              <option value="WMA">WMA - Weighted Moving Average</option>
                              <option value="TEMA">TEMA - Triple Exponential Moving Average</option>
                              <option value="KAMA">KAMA - Kaufman Adaptive Moving Average</option>
                              <option value="MAMA">MAMA - MESA Adaptive Moving Average</option>
                              <option value="VWMA">VWMA - Volume Weighted Moving Average</option>
                              <option value="Hull">Hull MA - Hull Moving Average</option>
                            </select>
                          </div>

                          {/* Fast MA, Slow MA, Condition, Timeframe - In one row */}
                          <div className="grid grid-cols-4 gap-3">
                            <div>
                              <label className="text-xs font-medium text-gray-600 dark:text-gray-300 mb-1 block">
                                Fast MA
                              </label>
                              <input
                                type="number"
                                min="1"
                                max="200"
                                value={entryCondition.fastMA || 9}
                                onChange={(e) => setEntryCondition({...entryCondition, fastMA: Number(e.target.value)})}
                                className="w-full px-2 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                                placeholder="9"
                              />
                            </div>
                            <div>
                              <label className="text-xs font-medium text-gray-600 dark:text-gray-300 mb-1 block">
                                Slow MA
                              </label>
                              <input
                                type="number"
                                min="1"
                                max="200"
                                value={entryCondition.slowMA || 26}
                                onChange={(e) => setEntryCondition({...entryCondition, slowMA: Number(e.target.value)})}
                                className="w-full px-2 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                                placeholder="26"
                              />
                            </div>
                            <div>
                              <label className="text-xs font-medium text-gray-600 dark:text-gray-300 mb-1 block">
                                Condition
                              </label>
                              <select
                                value={entryCondition.operator}
                                onChange={(e) => setEntryCondition({...entryCondition, operator: e.target.value})}
                                className="w-full px-2 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                              >
                                <option value="crosses_up">Crossing Up</option>
                                <option value="crosses_down">Crossing Down</option>
                                <option value="above">Above</option>
                                <option value="below">Below</option>
                              </select>
                            </div>
                            <div>
                              <label className="text-xs font-medium text-gray-600 dark:text-gray-300 mb-1 block">
                                Timeframe
                              </label>
                              <select
                                value={entryCondition.timeframe}
                                onChange={(e) => setEntryCondition({...entryCondition, timeframe: e.target.value})}
                                className="w-full px-2 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                              >
                                <option value="1m">1m</option>
                                <option value="3m">3m</option>
                                <option value="5m">5m</option>
                                <option value="15m">15m</option>
                                <option value="30m">30m</option>
                                <option value="1h">1h</option>
                                <option value="2h">2h</option>
                                <option value="4h">4h</option>
                                <option value="6h">6h</option>
                                <option value="12h">12h</option>
                                <option value="1d">1d</option>
                              </select>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* MACD Condition Builder - Show only when MACD is selected */}
                      {conditionType === 'MACD Conditions' && (
                        <div className="space-y-3">
                          {/* MACD Component Selection */}
                          <div>
                            <label className="text-xs font-medium text-gray-600 dark:text-gray-300 mb-1 block">
                              Component
                            </label>
                            <select
                              value={entryCondition.macdComponent || 'histogram'}
                              onChange={(e) => setEntryCondition({...entryCondition, macdComponent: e.target.value})}
                              className="w-full px-2 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                            >
                              <option value="macd_line">MACD Line</option>
                              <option value="signal_line">Signal Line</option>
                              <option value="histogram">Histogram</option>
                              <option value="zero_line">Zero Line</option>
                            </select>
                          </div>

                          {/* MACD Periods Configuration */}
                          <div className="grid grid-cols-3 gap-3">
                            <div>
                              <label className="text-xs font-medium text-gray-600 dark:text-gray-300 mb-1 block">
                                Fast Period
                              </label>
                              <input
                                type="number"
                                min="1"
                                max="50"
                                value={entryCondition.fastPeriod || 12}
                                onChange={(e) => setEntryCondition({...entryCondition, fastPeriod: Number(e.target.value)})}
                                className="w-full px-2 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                                placeholder="12"
                              />
                            </div>
                            <div>
                              <label className="text-xs font-medium text-gray-600 dark:text-gray-300 mb-1 block">
                                Slow Period
                              </label>
                              <input
                                type="number"
                                min="1"
                                max="100"
                                value={entryCondition.slowPeriod || 26}
                                onChange={(e) => setEntryCondition({...entryCondition, slowPeriod: Number(e.target.value)})}
                                className="w-full px-2 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                                placeholder="26"
                              />
                            </div>
                            <div>
                              <label className="text-xs font-medium text-gray-600 dark:text-gray-300 mb-1 block">
                                Signal Period
                              </label>
                              <input
                                type="number"
                                min="1"
                                max="50"
                                value={entryCondition.signalPeriod || 9}
                                onChange={(e) => setEntryCondition({...entryCondition, signalPeriod: Number(e.target.value)})}
                                className="w-full px-2 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                                placeholder="9"
                              />
                            </div>
                          </div>

                          {/* Condition, Value, Timeframe - In one row */}
                          <div className="grid grid-cols-3 gap-3">
                            <div>
                              <label className="text-xs font-medium text-gray-600 dark:text-gray-300 mb-1 block">
                                Condition
                              </label>
                              <select
                                value={entryCondition.operator}
                                onChange={(e) => setEntryCondition({...entryCondition, operator: e.target.value})}
                                className="w-full px-2 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                              >
                                <option value="crosses_above">Crosses Above</option>
                                <option value="crosses_below">Crosses Below</option>
                                <option value="greater_than">Greater Than</option>
                                <option value="less_than">Less Than</option>
                                <option value="equals">Equals</option>
                              </select>
                            </div>
                            <div>
                              <label className="text-xs font-medium text-gray-600 dark:text-gray-300 mb-1 block">
                                Value
                              </label>
                              <input
                                type="number"
                                step="0.01"
                                value={entryCondition.value}
                                onChange={(e) => setEntryCondition({...entryCondition, value: Number(e.target.value)})}
                                className="w-full px-2 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                                placeholder="0"
                              />
                            </div>
                            <div>
                              <label className="text-xs font-medium text-gray-600 dark:text-gray-300 mb-1 block">
                                Timeframe
                              </label>
                              <select
                                value={entryCondition.timeframe}
                                onChange={(e) => setEntryCondition({...entryCondition, timeframe: e.target.value})}
                                className="w-full px-2 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                              >
                                <option value="1m">1m</option>
                                <option value="3m">3m</option>
                                <option value="5m">5m</option>
                                <option value="15m">15m</option>
                                <option value="30m">30m</option>
                                <option value="1h">1h</option>
                                <option value="2h">2h</option>
                                <option value="4h">4h</option>
                                <option value="6h">6h</option>
                                <option value="12h">12h</option>
                                <option value="1d">1d</option>
                              </select>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Price Action Condition Builder - Show only when Price Action is selected */}
                      {conditionType === 'Price Action' && (
                        <div className="space-y-3">
                          {/* MA Type for Price Action */}
                          <div>
                            <label className="text-xs font-medium text-gray-600 dark:text-gray-300 mb-1 block">
                              MA Type
                            </label>
                            <select
                              value={entryCondition.priceMaType || 'EMA'}
                              onChange={(e) => setEntryCondition({...entryCondition, priceMaType: e.target.value})}
                              className="w-full px-2 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                            >
                              <option value="SMA">SMA - Simple Moving Average</option>
                              <option value="EMA">EMA - Exponential Moving Average</option>
                              <option value="WMA">WMA - Weighted Moving Average</option>
                              <option value="TEMA">TEMA - Triple Exponential Moving Average</option>
                              <option value="KAMA">KAMA - Kaufman Adaptive Moving Average</option>
                              <option value="MAMA">MAMA - MESA Adaptive Moving Average</option>
                              <option value="VWMA">VWMA - Volume Weighted Moving Average</option>
                              <option value="Hull">Hull MA - Hull Moving Average</option>
                            </select>
                          </div>

                          {/* MA Length, Condition, Percentage, Timeframe - In one row */}
                          <div className="grid grid-cols-4 gap-3">
                            <div>
                              <label className="text-xs font-medium text-gray-600 dark:text-gray-300 mb-1 block">
                                MA Length
                              </label>
                              <input
                                type="number"
                                min="1"
                                max="200"
                                value={entryCondition.maLength || 20}
                                onChange={(e) => setEntryCondition({...entryCondition, maLength: Number(e.target.value)})}
                                className="w-full px-2 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                                placeholder="20"
                              />
                            </div>
                            <div>
                              <label className="text-xs font-medium text-gray-600 dark:text-gray-300 mb-1 block">
                                Condition
                              </label>
                              <select
                                value={entryCondition.operator}
                                onChange={(e) => setEntryCondition({...entryCondition, operator: e.target.value})}
                                className="w-full px-2 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                              >
                                <option value="closes_above">Closes Above</option>
                                <option value="closes_below">Closes Below</option>
                                <option value="crosses_above">Crosses Above</option>
                                <option value="crosses_below">Crosses Below</option>
                              </select>
                            </div>
                            <div>
                              <label className="text-xs font-medium text-gray-600 dark:text-gray-300 mb-1 block">
                                Percentage (%)
                              </label>
                              <input
                                type="number"
                                min="0"
                                max="100"
                                step="0.1"
                                value={entryCondition.pricePercentage || 1.0}
                                onChange={(e) => setEntryCondition({...entryCondition, pricePercentage: Number(e.target.value)})}
                                className="w-full px-2 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                                placeholder="1.0"
                              />
                            </div>
                            <div>
                              <label className="text-xs font-medium text-gray-600 dark:text-gray-300 mb-1 block">
                                Timeframe
                              </label>
                              <select
                                value={entryCondition.timeframe}
                                onChange={(e) => setEntryCondition({...entryCondition, timeframe: e.target.value})}
                                className="w-full px-2 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                              >
                                <option value="1m">1m</option>
                                <option value="3m">3m</option>
                                <option value="5m">5m</option>
                                <option value="15m">15m</option>
                                <option value="30m">30m</option>
                                <option value="1h">1h</option>
                                <option value="2h">2h</option>
                                <option value="4h">4h</option>
                                <option value="6h">6h</option>
                                <option value="12h">12h</option>
                                <option value="1d">1d</option>
                              </select>
                            </div>
                          </div>
                        </div>
                      )}
                      
                      {/* Condition Preview */}
                      {conditionType === 'RSI Conditions' && (
                        <div className="text-xs text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20 rounded p-2">
                          📊 RSI Condition: RSI{entryCondition.period && `(${entryCondition.period})`} {entryCondition.operator.replace('_', ' ')} {entryCondition.value} on {entryCondition.timeframe}
                        </div>
                      )}
                      {conditionType === 'MFI Conditions' && (
                        <div className="text-xs text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20 rounded p-2">
                          📊 MFI Condition: MFI{entryCondition.mfiPeriod && `(${entryCondition.mfiPeriod})`} {entryCondition.operator.replace('_', ' ')} {entryCondition.value} on {entryCondition.timeframe}
                        </div>
                      )}
                      {conditionType === 'CCI Conditions' && (
                        <div className="text-xs text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20 rounded p-2">
                          📊 CCI Condition: CCI{entryCondition.cciPeriod && `(${entryCondition.cciPeriod})`} {entryCondition.operator.replace('_', ' ')} {entryCondition.value} on {entryCondition.timeframe}
                        </div>
                      )}
                      {conditionType === 'Moving Average (MA)' && (
                        <div className="text-xs text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20 rounded p-2">
                          📊 MA Condition: {entryCondition.maType || 'EMA'} Fast({entryCondition.fastMA || 9}) {entryCondition.operator.replace('_', ' ')} Slow({entryCondition.slowMA || 26}) on {entryCondition.timeframe}
                        </div>
                      )}
                      {conditionType === 'MACD Conditions' && (
                        <div className="text-xs text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20 rounded p-2">
                          📊 MACD Condition: {entryCondition.macdComponent || 'Histogram'} ({entryCondition.fastPeriod || 12}/{entryCondition.slowPeriod || 26}/{entryCondition.signalPeriod || 9}) {entryCondition.operator.replace('_', ' ')} {entryCondition.value} on {entryCondition.timeframe}
                        </div>
                      )}
                      {conditionType === 'Price Action' && (
                        <div className="text-xs text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20 rounded p-2">
                          📊 Price Action: Price {entryCondition.operator.replace('_', ' ')} {entryCondition.pricePercentage || 1.0}% of {entryCondition.priceMaType || 'EMA'}({entryCondition.maLength || 20}) on {entryCondition.timeframe}
                        </div>
                      )}
                    </div>
                  )}
                    </>
                  ) : (
                    /* Condition Playbook Builder */
                    <div className="space-y-4 mt-4">
                      {/* Playbook Settings */}
                      <div className="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-4 space-y-3">
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <label className="text-xs font-medium text-gray-600 dark:text-gray-300 mb-1 block">
                              Gate Logic
                            </label>
                            <select
                              value={playbookGateLogic}
                              onChange={(e) => setPlaybookGateLogic(e.target.value as 'ALL' | 'ANY')}
                              className="w-full px-2 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                            >
                              <option value="ALL">ALL must be true</option>
                              <option value="ANY">ANY can be true</option>
                            </select>
                            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                              {playbookGateLogic === 'ALL' ? 'All conditions must be true to enter trade' : 'At least one condition must be true to enter trade'}
                            </p>
                          </div>
                          <div>
                            <label className="text-xs font-medium text-gray-600 dark:text-gray-300 mb-1 block">
                              Evaluation Order
                            </label>
                            <select
                              value={playbookEvaluationOrder}
                              onChange={(e) => setPlaybookEvaluationOrder(e.target.value as 'priority' | 'sequential')}
                              className="w-full px-2 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                            >
                              <option value="priority">By Priority</option>
                              <option value="sequential">Sequential</option>
                            </select>
                            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                              How conditions are evaluated
                            </p>
                          </div>
                        </div>
                      </div>

                      {/* Add Condition Button */}
                      <button
                        onClick={() => {
                          const newCondition: ConditionPlaybookItem = {
                            id: `cond-${Date.now()}`,
                            conditionType: 'RSI Conditions',
                            condition: { ...entryCondition },
                            priority: conditionPlaybook.length + 1,
                            enabled: true
                          };
                          setConditionPlaybook([...conditionPlaybook, newCondition]);
                        }}
                        className="w-full px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors"
                      >
                        + Add Condition
                      </button>

                      {/* Condition List */}
                      {conditionPlaybook.length > 0 && (
                        <div className="space-y-3">
                          {[...conditionPlaybook].sort((a, b) => a.priority - b.priority).map((item, index) => {
                            const actualIndex = conditionPlaybook.findIndex(c => c.id === item.id);
                            return (
                            <div key={item.id} className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4">
                              <div className="flex items-start justify-between mb-3">
                                <div className="flex items-center gap-2">
                                  <div className="flex items-center gap-1">
                                    <button
                                      onClick={() => {
                                        const updated = [...conditionPlaybook];
                                        if (item.priority > 1) {
                                          updated[actualIndex].priority = item.priority - 1;
                                          // Swap with condition that has priority - 1
                                          const swapIndex = updated.findIndex(c => c.id !== item.id && c.priority === item.priority - 1);
                                          if (swapIndex !== -1) {
                                            updated[swapIndex].priority = item.priority;
                                          }
                                        }
                                        setConditionPlaybook(updated);
                                      }}
                                      disabled={item.priority === 1}
                                      className="px-1.5 py-0.5 text-xs bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed rounded"
                                      title="Move up"
                                    >
                                      ↑
                                    </button>
                                    <span className="text-xs font-medium text-gray-500 dark:text-gray-400 min-w-[80px]">
                                      Priority: {item.priority}
                                    </span>
                                    <button
                                      onClick={() => {
                                        const updated = [...conditionPlaybook];
                                        const maxPriority = Math.max(...conditionPlaybook.map(c => c.priority));
                                        if (item.priority < maxPriority) {
                                          updated[actualIndex].priority = item.priority + 1;
                                          // Swap with condition that has priority + 1
                                          const swapIndex = updated.findIndex(c => c.id !== item.id && c.priority === item.priority + 1);
                                          if (swapIndex !== -1) {
                                            updated[swapIndex].priority = item.priority;
                                          }
                                        }
                                        setConditionPlaybook(updated);
                                      }}
                                      disabled={item.priority >= Math.max(...conditionPlaybook.map(c => c.priority))}
                                      className="px-1.5 py-0.5 text-xs bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed rounded"
                                      title="Move down"
                                    >
                                      ↓
                                    </button>
                                  </div>
                                  {index > 0 && (
                                    <select
                                      value={item.logic || 'AND'}
                                      onChange={(e) => {
                                        const updated = [...conditionPlaybook];
                                        updated[actualIndex].logic = e.target.value as 'AND' | 'OR';
                                        setConditionPlaybook(updated);
                                      }}
                                      className="text-xs px-2 py-1 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300"
                                    >
                                      <option value="AND">AND</option>
                                      <option value="OR">OR</option>
                                    </select>
                                  )}
                                </div>
                                <div className="flex items-center gap-2">
                                  <label className="flex items-center gap-1 text-xs text-gray-600 dark:text-gray-400">
                                    <input
                                      type="checkbox"
                                      checked={item.enabled}
                                      onChange={(e) => {
                                        const updated = [...conditionPlaybook];
                                        updated[actualIndex].enabled = e.target.checked;
                                        setConditionPlaybook(updated);
                                      }}
                                      className="rounded"
                                    />
                                    Enabled
                                  </label>
                                  <button
                                    onClick={() => {
                                      setConditionPlaybook(conditionPlaybook.filter(c => c.id !== item.id));
                                    }}
                                    className="text-red-500 hover:text-red-700 text-sm"
                                  >
                                    ✕
                                  </button>
                                </div>
                              </div>

                              {/* Condition Type Selector */}
                              <div className="mb-3">
                                <label className="text-xs font-medium text-gray-600 dark:text-gray-300 mb-1 block">
                                  Condition Type
                                </label>
                                <select
                                  value={item.conditionType}
                                  onChange={(e) => {
                                    const updated = [...conditionPlaybook];
                                    updated[actualIndex].conditionType = e.target.value;
                                    setConditionPlaybook(updated);
                                  }}
                                  className="w-full px-2 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                                >
                                  <option value="RSI Conditions">RSI Conditions</option>
                                  <option value="MFI Conditions">MFI Conditions</option>
                                  <option value="CCI Conditions">CCI Conditions</option>
                                  <option value="Moving Average (MA)">Moving Average (MA)</option>
                                  <option value="MACD Conditions">MACD Conditions</option>
                                  <option value="Price Action">Price Action</option>
                                </select>
                              </div>

                              {/* Priority and Validity Duration */}
                              <div className="grid grid-cols-3 gap-3 mb-3">
                                <div>
                                  <label className="text-xs font-medium text-gray-600 dark:text-gray-300 mb-1 block">
                                    Priority
                                  </label>
                                  <input
                                    type="number"
                                    min="1"
                                    value={item.priority}
                                    onChange={(e) => {
                                      const updated = [...conditionPlaybook];
                                      updated[actualIndex].priority = Number(e.target.value);
                                      setConditionPlaybook(updated);
                                    }}
                                    className="w-full px-2 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                                  />
                                </div>
                                <div>
                                  <label className="text-xs font-medium text-gray-600 dark:text-gray-300 mb-1 block">
                                    Valid For
                                  </label>
                                  <input
                                    type="number"
                                    min="0"
                                    value={item.validityDuration || ''}
                                    onChange={(e) => {
                                      const updated = [...conditionPlaybook];
                                      updated[actualIndex].validityDuration = e.target.value ? Number(e.target.value) : undefined;
                                      setConditionPlaybook(updated);
                                    }}
                                    className="w-full px-2 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    placeholder="0 (unlimited)"
                                  />
                                </div>
                                <div>
                                  <label className="text-xs font-medium text-gray-600 dark:text-gray-300 mb-1 block">
                                    Unit
                                  </label>
                                  <select
                                    value={item.validityDurationUnit || 'bars'}
                                    onChange={(e) => {
                                      const updated = [...conditionPlaybook];
                                      updated[actualIndex].validityDurationUnit = e.target.value as 'bars' | 'minutes';
                                      setConditionPlaybook(updated);
                                    }}
                                    className="w-full px-2 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                                  >
                                    <option value="bars">Bars</option>
                                    <option value="minutes">Minutes</option>
                                  </select>
                                </div>
                              </div>

                              {/* Condition Configuration */}
                              <div className="border-t border-gray-200 dark:border-gray-700 pt-3">
                                {editingConditionId === item.id ? (
                                  /* Show condition builder when editing */
                                  <div className="space-y-3">
                                    {/* Condition Type Selector */}
                                    <div>
                                      <label className="text-xs font-medium text-gray-600 dark:text-gray-300 mb-1 block">
                                        Condition Type
                                      </label>
                                      <select
                                        value={conditionType}
                                        onChange={(e) => {
                                          setConditionType(e.target.value);
                                          // Reset condition when type changes
                                          if (e.target.value !== conditionType) {
                                            setEntryCondition({
                                              indicator: 'RSI',
                                              operator: 'crosses_below',
                                              value: 30,
                                              timeframe: '1m',
                                              period: 14,
                                              lowerBound: 25,
                                              upperBound: 35
                                            });
                                          }
                                        }}
                                        className="w-full px-2 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                                      >
                                        <option value="RSI Conditions">RSI Conditions</option>
                                        <option value="MFI Conditions">MFI Conditions</option>
                                        <option value="CCI Conditions">CCI Conditions</option>
                                        <option value="Moving Average (MA)">Moving Average (MA)</option>
                                        <option value="MACD Conditions">MACD Conditions</option>
                                        <option value="Price Action">Price Action</option>
                                      </select>
                                    </div>
                                    
                                    {/* Condition Builder - Reuse the existing condition builders */}
                                    {conditionType === 'RSI Conditions' && (
                                      <>
                                        {/* Special Info Banner for "Between" Operator */}
                                        {entryCondition.operator === 'between' && (
                                          <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 border border-blue-200 dark:border-blue-700 rounded-lg p-4 mb-3">
                                            <div className="flex items-start gap-3">
                                              <Info className="w-5 h-5 text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0" />
                                              <div className="flex-1">
                                                <h4 className="text-sm font-semibold text-blue-900 dark:text-blue-100 mb-2 flex items-center gap-2">
                                                  🎯 RSI "Between" Operator
                                                  <span className="px-2 py-0.5 bg-blue-200 dark:bg-blue-800 text-blue-800 dark:text-blue-200 rounded text-xs font-bold">NEW</span>
                                                </h4>
                                                <p className="text-xs text-blue-800 dark:text-blue-200 mb-2">
                                                  <strong>Catches consolidation ranges!</strong> Perfect for accumulation zones after RSI goes oversold.
                                                </p>
                                                <div className="text-xs text-blue-700 dark:text-blue-300 space-y-1">
                                                  <p><strong>When it triggers:</strong></p>
                                                  <ul className="list-disc list-inside ml-2 space-y-0.5">
                                                    <li>RSI consolidates in your range (e.g., 25-35)</li>
                                                    <li>Market makes up its mind before next move</li>
                                                    <li>Better entry prices than "crosses below"</li>
                                                  </ul>
                                                  <p className="mt-2"><strong>Example:</strong> If RSI = 28, 30, 32 → ✅ Triggers (all in range 25-35)</p>
                                                </div>
                                              </div>
                                            </div>
                                          </div>
                                        )}
                                        <div className={`grid gap-3 ${entryCondition.operator === 'between' ? 'grid-cols-5' : 'grid-cols-4'}`}>
                                          <div>
                                            <label htmlFor="rsi-period" className="text-xs font-medium text-gray-600 dark:text-gray-300 mb-1 block">RSI Period</label>
                                            <input id="rsi-period" name="rsi-period" type="number" min="1" max="100" value={entryCondition.period || 14} onChange={(e) => setEntryCondition({...entryCondition, period: Number(e.target.value)})} className="w-full px-2 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="14" />
                                          </div>
                                          <div>
                                            <label htmlFor="rsi-timeframe" className="text-xs font-medium text-gray-600 dark:text-gray-300 mb-1 block">Timeframe</label>
                                            <select id="rsi-timeframe" name="rsi-timeframe" value={entryCondition.timeframe} onChange={(e) => setEntryCondition({...entryCondition, timeframe: e.target.value})} className="w-full px-2 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500">
                                            <option value="1m">1m</option><option value="3m">3m</option><option value="5m">5m</option><option value="15m">15m</option><option value="30m">30m</option><option value="1h">1h</option><option value="2h">2h</option><option value="4h">4h</option><option value="6h">6h</option><option value="12h">12h</option><option value="1d">1d</option>
                                          </select>
                                        </div>
                                        <div>
                                          <label htmlFor="rsi-condition" className="text-xs font-medium text-gray-600 dark:text-gray-300 mb-1 block">Condition</label>
                                          <select id="rsi-condition" name="rsi-condition" value={entryCondition.operator} onChange={(e) => setEntryCondition({...entryCondition, operator: e.target.value})} className="w-full px-2 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500">
                                            <option value="crosses_below">Crosses below</option><option value="crosses_above">Crosses above</option><option value="less_than">Less than</option><option value="greater_than">Greater than</option><option value="equals">Equals</option>
                                            <option value="between">🎯 Between ⭐ NEW</option>
                                          </select>
                                        </div>
                                        {entryCondition.operator === 'between' ? (
                                          <>
                                            <div>
                                              <label htmlFor="rsi-lower-bound" className="text-xs font-medium text-gray-600 dark:text-gray-300 mb-1 block">Lower Bound</label>
                                              <input id="rsi-lower-bound" name="rsi-lower-bound" type="number" min="0" max="100" value={entryCondition.lowerBound || 25} onChange={(e) => setEntryCondition({...entryCondition, lowerBound: Number(e.target.value)})} className="w-full px-2 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="25" />
                                            </div>
                                            <div>
                                              <label htmlFor="rsi-upper-bound" className="text-xs font-medium text-gray-600 dark:text-gray-300 mb-1 block">Upper Bound</label>
                                              <input id="rsi-upper-bound" name="rsi-upper-bound" type="number" min="0" max="100" value={entryCondition.upperBound || 35} onChange={(e) => setEntryCondition({...entryCondition, upperBound: Number(e.target.value)})} className="w-full px-2 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="35" />
                                            </div>
                                          </>
                                        ) : (
                                          <div>
                                            <label htmlFor="rsi-value" className="text-xs font-medium text-gray-600 dark:text-gray-300 mb-1 block">RSI Value</label>
                                            <input id="rsi-value" name="rsi-value" type="number" min="0" max="100" value={entryCondition.value} onChange={(e) => setEntryCondition({...entryCondition, value: Number(e.target.value)})} className="w-full px-2 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="30" />
                                          </div>
                                        )}
                                      </div>
                                      </>
                                    )}
                                    {conditionType === 'MFI Conditions' && (
                                      <div className="grid grid-cols-4 gap-3">
                                        <div>
                                          <label htmlFor="mfi-period" className="text-xs font-medium text-gray-600 dark:text-gray-300 mb-1 block">MFI Period</label>
                                          <input id="mfi-period" name="mfi-period" type="number" min="1" max="100" value={entryCondition.mfiPeriod || 14} onChange={(e) => setEntryCondition({...entryCondition, mfiPeriod: Number(e.target.value)})} className="w-full px-2 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="14" />
                                        </div>
                                        <div>
                                          <label htmlFor="mfi-timeframe" className="text-xs font-medium text-gray-600 dark:text-gray-300 mb-1 block">Timeframe</label>
                                          <select id="mfi-timeframe" name="mfi-timeframe" value={entryCondition.timeframe} onChange={(e) => setEntryCondition({...entryCondition, timeframe: e.target.value})} className="w-full px-2 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500">
                                            <option value="1m">1m</option><option value="3m">3m</option><option value="5m">5m</option><option value="15m">15m</option><option value="30m">30m</option><option value="1h">1h</option><option value="2h">2h</option><option value="4h">4h</option><option value="6h">6h</option><option value="12h">12h</option><option value="1d">1d</option>
                                          </select>
                                        </div>
                                        <div>
                                          <label htmlFor="mfi-condition" className="text-xs font-medium text-gray-600 dark:text-gray-300 mb-1 block">Condition</label>
                                          <select id="mfi-condition" name="mfi-condition" value={entryCondition.operator} onChange={(e) => setEntryCondition({...entryCondition, operator: e.target.value})} className="w-full px-2 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500">
                                            <option value="crosses_below">Crosses below</option><option value="crosses_above">Crosses above</option><option value="less_than">Less than</option><option value="greater_than">Greater than</option><option value="equals">Equals</option>
                                          </select>
                                        </div>
                                        <div>
                                          <label htmlFor="mfi-value" className="text-xs font-medium text-gray-600 dark:text-gray-300 mb-1 block">MFI Value</label>
                                          <input id="mfi-value" name="mfi-value" type="number" min="0" max="100" value={entryCondition.value} onChange={(e) => setEntryCondition({...entryCondition, value: Number(e.target.value)})} className="w-full px-2 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="20" />
                                        </div>
                                      </div>
                                    )}
                                    {conditionType === 'CCI Conditions' && (
                                      <div className="grid grid-cols-4 gap-3">
                                        <div>
                                          <label htmlFor="cci-period" className="text-xs font-medium text-gray-600 dark:text-gray-300 mb-1 block">CCI Period</label>
                                          <input id="cci-period" name="cci-period" type="number" min="1" max="100" value={entryCondition.cciPeriod || 14} onChange={(e) => setEntryCondition({...entryCondition, cciPeriod: Number(e.target.value)})} className="w-full px-2 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="14" />
                                        </div>
                                        <div>
                                          <label htmlFor="cci-timeframe" className="text-xs font-medium text-gray-600 dark:text-gray-300 mb-1 block">Timeframe</label>
                                          <select id="cci-timeframe" name="cci-timeframe" value={entryCondition.timeframe} onChange={(e) => setEntryCondition({...entryCondition, timeframe: e.target.value})} className="w-full px-2 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500">
                                            <option value="1m">1m</option><option value="3m">3m</option><option value="5m">5m</option><option value="15m">15m</option><option value="30m">30m</option><option value="1h">1h</option><option value="2h">2h</option><option value="4h">4h</option><option value="6h">6h</option><option value="12h">12h</option><option value="1d">1d</option>
                                          </select>
                                        </div>
                                        <div>
                                          <label htmlFor="cci-condition" className="text-xs font-medium text-gray-600 dark:text-gray-300 mb-1 block">Condition</label>
                                          <select id="cci-condition" name="cci-condition" value={entryCondition.operator} onChange={(e) => setEntryCondition({...entryCondition, operator: e.target.value})} className="w-full px-2 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500">
                                            <option value="crosses_below">Crosses below</option><option value="crosses_above">Crosses above</option><option value="less_than">Less than</option><option value="greater_than">Greater than</option><option value="equals">Equals</option>
                                          </select>
                                        </div>
                                        <div>
                                          <label htmlFor="cci-value" className="text-xs font-medium text-gray-600 dark:text-gray-300 mb-1 block">CCI Value</label>
                                          <input id="cci-value" name="cci-value" type="number" min="-200" max="200" step="1" value={entryCondition.value} onChange={(e) => setEntryCondition({...entryCondition, value: Number(e.target.value)})} className="w-full px-2 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="-100" />
                                        </div>
                                      </div>
                                    )}
                                    {conditionType === 'Moving Average (MA)' && (
                                      <div className="space-y-3">
                                        <div>
                                          <label htmlFor="ma-type" className="text-xs font-medium text-gray-600 dark:text-gray-300 mb-1 block">MA Type</label>
                                          <select id="ma-type" name="ma-type" value={entryCondition.maType || 'EMA'} onChange={(e) => setEntryCondition({...entryCondition, maType: e.target.value})} className="w-full px-2 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500">
                                            <option value="SMA">SMA</option><option value="EMA">EMA</option><option value="WMA">WMA</option><option value="TEMA">TEMA</option><option value="KAMA">KAMA</option><option value="MAMA">MAMA</option><option value="VWMA">VWMA</option><option value="Hull">Hull</option>
                                          </select>
                                        </div>
                                        <div className="grid grid-cols-4 gap-3">
                                          <div>
                                            <label htmlFor="ma-fast" className="text-xs font-medium text-gray-600 dark:text-gray-300 mb-1 block">Fast MA</label>
                                            <input id="ma-fast" name="ma-fast" type="number" min="1" max="100" value={entryCondition.fastMA || 9} onChange={(e) => setEntryCondition({...entryCondition, fastMA: Number(e.target.value)})} className="w-full px-2 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="9" />
                                          </div>
                                          <div>
                                            <label htmlFor="ma-slow" className="text-xs font-medium text-gray-600 dark:text-gray-300 mb-1 block">Slow MA</label>
                                            <input id="ma-slow" name="ma-slow" type="number" min="1" max="200" value={entryCondition.slowMA || 26} onChange={(e) => setEntryCondition({...entryCondition, slowMA: Number(e.target.value)})} className="w-full px-2 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="26" />
                                          </div>
                                          <div>
                                            <label className="text-xs font-medium text-gray-600 dark:text-gray-300 mb-1 block">Condition</label>
                                            <select value={entryCondition.operator} onChange={(e) => setEntryCondition({...entryCondition, operator: e.target.value})} className="w-full px-2 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500">
                                              <option value="crosses_above">Crosses Above</option><option value="crosses_below">Crosses Below</option><option value="greater_than">Greater Than</option><option value="less_than">Less Than</option>
                                            </select>
                                          </div>
                                          <div>
                                            <label className="text-xs font-medium text-gray-600 dark:text-gray-300 mb-1 block">Timeframe</label>
                                            <select value={entryCondition.timeframe} onChange={(e) => setEntryCondition({...entryCondition, timeframe: e.target.value})} className="w-full px-2 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500">
                                              <option value="1m">1m</option><option value="3m">3m</option><option value="5m">5m</option><option value="15m">15m</option><option value="30m">30m</option><option value="1h">1h</option><option value="2h">2h</option><option value="4h">4h</option><option value="6h">6h</option><option value="12h">12h</option><option value="1d">1d</option>
                                            </select>
                                          </div>
                                        </div>
                                      </div>
                                    )}
                                    {conditionType === 'MACD Conditions' && (
                                      <div className="space-y-3">
                                        <div>
                                          <label htmlFor="macd-component" className="text-xs font-medium text-gray-600 dark:text-gray-300 mb-1 block">Component</label>
                                          <select id="macd-component" name="macd-component" value={entryCondition.macdComponent || 'histogram'} onChange={(e) => setEntryCondition({...entryCondition, macdComponent: e.target.value})} className="w-full px-2 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500">
                                            <option value="macd_line">MACD Line</option><option value="signal_line">Signal Line</option><option value="histogram">Histogram</option><option value="zero_line">Zero Line</option>
                                          </select>
                                        </div>
                                        <div className="grid grid-cols-3 gap-3">
                                          <div>
                                            <label htmlFor="macd-fast-period" className="text-xs font-medium text-gray-600 dark:text-gray-300 mb-1 block">Fast Period</label>
                                            <input id="macd-fast-period" name="macd-fast-period" type="number" min="1" max="50" value={entryCondition.fastPeriod || 12} onChange={(e) => setEntryCondition({...entryCondition, fastPeriod: Number(e.target.value)})} className="w-full px-2 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="12" />
                                          </div>
                                          <div>
                                            <label htmlFor="macd-slow-period" className="text-xs font-medium text-gray-600 dark:text-gray-300 mb-1 block">Slow Period</label>
                                            <input id="macd-slow-period" name="macd-slow-period" type="number" min="1" max="100" value={entryCondition.slowPeriod || 26} onChange={(e) => setEntryCondition({...entryCondition, slowPeriod: Number(e.target.value)})} className="w-full px-2 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="26" />
                                          </div>
                                          <div>
                                            <label htmlFor="macd-signal-period" className="text-xs font-medium text-gray-600 dark:text-gray-300 mb-1 block">Signal Period</label>
                                            <input id="macd-signal-period" name="macd-signal-period" type="number" min="1" max="50" value={entryCondition.signalPeriod || 9} onChange={(e) => setEntryCondition({...entryCondition, signalPeriod: Number(e.target.value)})} className="w-full px-2 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="9" />
                                          </div>
                                        </div>
                                        <div className="grid grid-cols-3 gap-3">
                                          <div>
                                            <label htmlFor="macd-condition" className="text-xs font-medium text-gray-600 dark:text-gray-300 mb-1 block">Condition</label>
                                            <select id="macd-condition" name="macd-condition" value={entryCondition.operator} onChange={(e) => setEntryCondition({...entryCondition, operator: e.target.value})} className="w-full px-2 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500">
                                              <option value="crosses_above">Crosses Above</option><option value="crosses_below">Crosses Below</option><option value="greater_than">Greater Than</option><option value="less_than">Less Than</option><option value="equals">Equals</option>
                                            </select>
                                          </div>
                                          <div>
                                            <label htmlFor="macd-value" className="text-xs font-medium text-gray-600 dark:text-gray-300 mb-1 block">Value</label>
                                            <input id="macd-value" name="macd-value" type="number" step="0.01" value={entryCondition.value} onChange={(e) => setEntryCondition({...entryCondition, value: Number(e.target.value)})} className="w-full px-2 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="0" />
                                          </div>
                                          <div>
                                            <label htmlFor="macd-timeframe" className="text-xs font-medium text-gray-600 dark:text-gray-300 mb-1 block">Timeframe</label>
                                            <select id="macd-timeframe" name="macd-timeframe" value={entryCondition.timeframe} onChange={(e) => setEntryCondition({...entryCondition, timeframe: e.target.value})} className="w-full px-2 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500">
                                              <option value="1m">1m</option><option value="3m">3m</option><option value="5m">5m</option><option value="15m">15m</option><option value="30m">30m</option><option value="1h">1h</option><option value="2h">2h</option><option value="4h">4h</option><option value="6h">6h</option><option value="12h">12h</option><option value="1d">1d</option>
                                            </select>
                                          </div>
                                        </div>
                                      </div>
                                    )}
                                    {conditionType === 'Price Action' && (
                                      <div className="space-y-3">
                                        <div>
                                          <label htmlFor="price-ma-type" className="text-xs font-medium text-gray-600 dark:text-gray-300 mb-1 block">MA Type</label>
                                          <select id="price-ma-type" name="price-ma-type" value={entryCondition.priceMaType || 'EMA'} onChange={(e) => setEntryCondition({...entryCondition, priceMaType: e.target.value})} className="w-full px-2 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500">
                                            <option value="EMA">EMA</option><option value="SMA">SMA</option><option value="WMA">WMA</option><option value="TEMA">TEMA</option><option value="KAMA">KAMA</option><option value="MAMA">MAMA</option><option value="VWMA">VWMA</option><option value="Hull">Hull</option>
                                          </select>
                                        </div>
                                        <div className="grid grid-cols-4 gap-3">
                                          <div>
                                            <label htmlFor="price-ma-length" className="text-xs font-medium text-gray-600 dark:text-gray-300 mb-1 block">MA Length</label>
                                            <input id="price-ma-length" name="price-ma-length" type="number" min="1" max="200" value={entryCondition.maLength || 20} onChange={(e) => setEntryCondition({...entryCondition, maLength: Number(e.target.value)})} className="w-full px-2 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="20" />
                                          </div>
                                          <div>
                                            <label htmlFor="price-percentage" className="text-xs font-medium text-gray-600 dark:text-gray-300 mb-1 block">Percentage</label>
                                            <input id="price-percentage" name="price-percentage" type="number" step="0.1" value={entryCondition.pricePercentage || 1.0} onChange={(e) => setEntryCondition({...entryCondition, pricePercentage: Number(e.target.value)})} className="w-full px-2 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="1.0" />
                                          </div>
                                          <div>
                                            <label className="text-xs font-medium text-gray-600 dark:text-gray-300 mb-1 block">Condition</label>
                                            <select value={entryCondition.operator} onChange={(e) => setEntryCondition({...entryCondition, operator: e.target.value})} className="w-full px-2 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500">
                                              <option value="crosses_above">Crosses Above</option><option value="crosses_below">Crosses Below</option><option value="greater_than">Greater Than</option><option value="less_than">Less Than</option>
                                            </select>
                                          </div>
                                          <div>
                                            <label className="text-xs font-medium text-gray-600 dark:text-gray-300 mb-1 block">Timeframe</label>
                                            <select value={entryCondition.timeframe} onChange={(e) => setEntryCondition({...entryCondition, timeframe: e.target.value})} className="w-full px-2 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500">
                                              <option value="1m">1m</option><option value="3m">3m</option><option value="5m">5m</option><option value="15m">15m</option><option value="30m">30m</option><option value="1h">1h</option><option value="2h">2h</option><option value="4h">4h</option><option value="6h">6h</option><option value="12h">12h</option><option value="1d">1d</option>
                                            </select>
                                          </div>
                                        </div>
                                      </div>
                                    )}
                                    
                                    <div className="flex gap-2">
                                      <button
                                        onClick={() => saveConditionToPlaybook(item.id)}
                                        className="flex-1 px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded transition-colors"
                                      >
                                        Save Condition
                                      </button>
                                      <button
                                        onClick={() => {
                                          setEditingConditionId(null);
                                          setEntryCondition(item.condition);
                                          setConditionType(item.conditionType);
                                        }}
                                        className="px-3 py-2 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 text-sm font-medium rounded transition-colors"
                                      >
                                        Cancel
                                      </button>
                                    </div>
                                  </div>
                                ) : (
                                  /* Show condition summary when not editing */
                                  <div className="text-xs text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-gray-900/50 rounded p-2 flex items-center justify-between">
                                    <span>
                                      {item.conditionType === 'RSI Conditions' && `RSI(${item.condition.period || 14}) ${item.condition.operator.replace('_', ' ')} ${item.condition.value} on ${item.condition.timeframe}`}
                                      {item.conditionType === 'MFI Conditions' && `MFI(${item.condition.mfiPeriod || 14}) ${item.condition.operator.replace('_', ' ')} ${item.condition.value} on ${item.condition.timeframe}`}
                                      {item.conditionType === 'CCI Conditions' && `CCI(${item.condition.cciPeriod || 14}) ${item.condition.operator.replace('_', ' ')} ${item.condition.value} on ${item.condition.timeframe}`}
                                      {item.conditionType === 'Moving Average (MA)' && `${item.condition.maType || 'EMA'} Fast(${item.condition.fastMA || 9}) ${item.condition.operator.replace('_', ' ')} Slow(${item.condition.slowMA || 26}) on ${item.condition.timeframe}`}
                                      {item.conditionType === 'MACD Conditions' && `${item.condition.macdComponent || 'Histogram'} (${item.condition.fastPeriod || 12}/${item.condition.slowPeriod || 26}/${item.condition.signalPeriod || 9}) ${item.condition.operator.replace('_', ' ')} ${item.condition.value} on ${item.condition.timeframe}`}
                                      {item.conditionType === 'Price Action' && `Price ${item.condition.operator.replace('_', ' ')} ${item.condition.pricePercentage || 1.0}% of ${item.condition.priceMaType || 'EMA'}(${item.condition.maLength || 20}) on ${item.condition.timeframe}`}
                                      {item.validityDuration && ` • Valid for ${item.validityDuration} ${item.validityDurationUnit || 'bars'}`}
                                    </span>
                                    <button
                                      onClick={() => {
                                        setEditingConditionId(item.id);
                                        setEntryCondition(item.condition);
                                        setConditionType(item.conditionType);
                                      }}
                                      className="ml-2 px-2 py-1 text-xs bg-blue-600 hover:bg-blue-700 text-white rounded transition-colors"
                                    >
                                      Edit
                                    </button>
                                  </div>
                                )}
                              </div>
                            </div>
                            );
                          })}
                        </div>
                      )}

                      {conditionPlaybook.length === 0 && (
                        <div className="text-center py-8 text-gray-500 dark:text-gray-400 text-sm">
                          No conditions added yet. Click "+ Add Condition" to create your first condition.
                        </div>
                      )}

                      {/* Playbook Summary */}
                      {conditionPlaybook.length > 0 && (
                        <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4 border border-blue-200 dark:border-blue-800 space-y-3">
                          <div className="text-xs font-medium text-blue-700 dark:text-blue-400">
                            Playbook Summary
                          </div>
                          <div className="text-xs text-blue-600 dark:text-blue-400">
                            <div className="mb-2">
                              <strong>Gate Logic:</strong> {playbookGateLogic === 'ALL' ? 'ALL conditions must be true' : 'ANY condition can be true'} to enter trade
                            </div>
                            <div className="mb-2">
                              <strong>Evaluation:</strong> {playbookEvaluationOrder === 'priority' ? 'By priority order' : 'Sequential (left to right)'}
                            </div>
                            <div className="mb-2">
                              <strong>Enabled Conditions:</strong> {conditionPlaybook.filter(c => c.enabled).length} / {conditionPlaybook.length}
                            </div>
                          </div>
                          
                          {/* Visual Condition Flow */}
                          <div className="pt-2 border-t border-blue-200 dark:border-blue-800">
                            <div className="text-xs font-medium text-blue-700 dark:text-blue-400 mb-2">
                              Condition Flow:
                            </div>
                            <div className="flex flex-wrap items-center gap-2 text-xs">
                              {[...conditionPlaybook].sort((a, b) => a.priority - b.priority).map((item, idx) => (
                                <div key={item.id} className="flex items-center gap-2">
                                  {idx > 0 && (
                                    <span className="text-blue-600 dark:text-blue-400 font-bold">
                                      {item.logic || 'AND'}
                                    </span>
                                  )}
                                  <div className={`px-2 py-1 rounded ${item.enabled ? 'bg-blue-600 text-white' : 'bg-gray-300 dark:bg-gray-600 text-gray-600 dark:text-gray-400'}`}>
                                    #{item.priority} {item.enabled ? '✓' : '○'}
                                  </div>
                                  {item.validityDuration && (
                                    <span className="text-gray-500 dark:text-gray-400 text-[10px]">
                                      ({item.validityDuration}{item.validityDurationUnit === 'minutes' ? 'm' : 'bars'})
                                    </span>
                                  )}
                                </div>
                              ))}
                            </div>
                            <div className="mt-2 text-xs text-gray-600 dark:text-gray-400">
                              {playbookGateLogic === 'ALL' ? (
                                <span>Enter trade when <strong>ALL</strong> enabled conditions are true</span>
                              ) : (
                                <span>Enter trade when <strong>ANY</strong> enabled condition is true</span>
                              )}
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* DCA Rules and Amount Section - Two Column Layout */}
            <div className="grid grid-cols-2 gap-4 mb-4">
              {/* DCA Rules Section - Left */}
              <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <h2 className="text-base font-semibold text-gray-900 dark:text-white">DCA Rules</h2>
                    <Tooltip
                      content={
                        "DCA Rules determine WHEN to trigger a DCA buy order:\n\n" +
                        "• Down from Last Entry: Buy when price drops X% from your last DCA entry price\n" +
                        "• Down from Average: Buy when price drops X% from your average entry price\n" +
                        "• Loss by Percent: Buy when position shows X% loss\n" +
                        "• Loss by Amount: Buy when position loss exceeds $X\n" +
                        "• Custom Condition: Buy when a custom indicator condition triggers\n\n" +
                        "⚠️ Important: DCA Rules only trigger AFTER you have an open position. For the FIRST trade, use 'Trading Mode' setting."
                      }
                    />
                  </div>
                </div>
                
                <div className="space-y-4">
                <div>
                  <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-2">
                    When to Start DCA
                  </label>
                  <select
                    value={dcaRuleType}
                    onChange={(e) => setDcaRuleType(e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="down_from_last_entry">DCA when position is down by % from Last Entry Price</option>
                    <option value="down_from_average">DCA when position is down by % from Average Price</option>
                    <option value="loss_by_percent">DCA when position is in loss by %</option>
                    <option value="loss_by_amount">DCA when position is in loss by amount</option>
                    <option value="custom">Custom DCA condition</option>
                  </select>
                </div>

                {/* DCA Rule Inputs */}
                {dcaRuleType === 'down_from_last_entry' && (
                  <div>
                    <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                      Down Percentage from Last Entry Price (%)
                    </label>
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        step="0.1"
                        min="0"
                        value={dcaRules.downFromLastEntryPercent}
                        onChange={(e) => setDcaRules({...dcaRules, downFromLastEntryPercent: parseFloat(e.target.value) || 0})}
                        className="flex-1 px-3 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                      <span className="text-sm text-gray-600 dark:text-gray-400">%</span>
                    </div>
                  </div>
                )}

                {dcaRuleType === 'down_from_average' && (
                  <div>
                    <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                      Down Percentage from Average Price (%)
                    </label>
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        step="0.1"
                        min="0"
                        value={dcaRules.downFromAveragePricePercent}
                        onChange={(e) => setDcaRules({...dcaRules, downFromAveragePricePercent: parseFloat(e.target.value) || 0})}
                        className="flex-1 px-3 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                      <span className="text-sm text-gray-600 dark:text-gray-400">%</span>
                    </div>
                  </div>
                )}

                {dcaRuleType === 'loss_by_percent' && (
                  <div>
                    <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                      Loss Percentage (%)
                    </label>
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        step="0.1"
                        min="0"
                        value={dcaRules.lossByPercent}
                        onChange={(e) => setDcaRules({...dcaRules, lossByPercent: parseFloat(e.target.value) || 0})}
                        className="flex-1 px-3 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                      <span className="text-sm text-gray-600 dark:text-gray-400">%</span>
                    </div>
                  </div>
                )}

                {dcaRuleType === 'loss_by_amount' && (
                  <div>
                    <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                      Loss Amount ({baseOrderCurrency})
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={dcaRules.lossByAmount}
                      onChange={(e) => setDcaRules({...dcaRules, lossByAmount: parseFloat(e.target.value) || 0})}
                      className="w-full px-3 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                )}

                {/* DCA Limits */}
                <div className="pt-3 border-t border-gray-200 dark:border-gray-700 space-y-4">
                  <h3 className="text-sm font-semibold text-gray-900 dark:text-white">DCA Limits</h3>
                  
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                        Max DCA per Position
                      </label>
                      <input
                        type="number"
                        step="1"
                        min="1"
                        max="100"
                        value={dcaRules.maxDcaPerPosition}
                        onChange={(e) => setDcaRules({...dcaRules, maxDcaPerPosition: parseInt(e.target.value) || 1})}
                        className="w-full px-3 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="5"
                      />
                      <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                        Maximum DCA orders for a single position
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                        Max DCA Across All Positions
                      </label>
                      <input
                        type="number"
                        step="1"
                        min="1"
                        max="1000"
                        value={dcaRules.maxDcaAcrossAllPositions}
                        onChange={(e) => setDcaRules({...dcaRules, maxDcaAcrossAllPositions: parseInt(e.target.value) || 1})}
                        className="w-full px-3 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="20"
                      />
                      <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                        Total DCA orders across all open positions
                      </div>
                    </div>
                  </div>
                </div>

                {/* DCA Spacing & Timing */}
                <div className="pt-3 border-t border-gray-200 dark:border-gray-700 space-y-4">
                  <h3 className="text-sm font-semibold text-gray-900 dark:text-white">DCA Spacing & Timing</h3>
                  
                  <div>
                    <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                      DCA Cooldown Period
                    </label>
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        step="1"
                        min="0"
                        value={dcaRules.dcaCooldownValue}
                        onChange={(e) => setDcaRules({...dcaRules, dcaCooldownValue: parseInt(e.target.value) || 0})}
                        className="flex-1 px-3 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="0"
                      />
                      <select
                        value={dcaRules.dcaCooldownUnit}
                        onChange={(e) => setDcaRules({...dcaRules, dcaCooldownUnit: e.target.value as 'minutes' | 'bars'})}
                        className="px-3 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="minutes">Minutes</option>
                        <option value="bars">Bars</option>
                      </select>
                    </div>
                    <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                      Wait period after a DCA before allowing another one. Choose minutes (real-time) or bars (candlesticks).
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={dcaRules.waitForPreviousDca}
                      onChange={(e) => setDcaRules({...dcaRules, waitForPreviousDca: e.target.checked})}
                      className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700"
                    />
                    <label className="text-xs font-medium text-gray-700 dark:text-gray-300">
                      Wait for previous DCA to execute before placing next
                    </label>
                  </div>
                </div>

                {/* Position Investment Limits */}
                <div className="pt-3 border-t border-gray-200 dark:border-gray-700 space-y-4">
                  <h3 className="text-sm font-semibold text-gray-900 dark:text-white">Position Investment Limits</h3>
                  
                  <div>
                    <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                      Max Total Investment per Position ({baseOrderCurrency})
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={dcaRules.maxTotalInvestmentPerPosition}
                      onChange={(e) => setDcaRules({...dcaRules, maxTotalInvestmentPerPosition: parseFloat(e.target.value) || 0})}
                      className="w-full px-3 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="1000"
                    />
                    <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                      Stop DCA when total invested in position reaches this amount
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={dcaRules.stopDcaOnLoss}
                      onChange={(e) => setDcaRules({...dcaRules, stopDcaOnLoss: e.target.checked})}
                      className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700"
                    />
                    <label className="text-xs font-medium text-gray-700 dark:text-gray-300">
                      Stop DCA when position loss exceeds threshold
                    </label>
                  </div>

                  {dcaRules.stopDcaOnLoss && (
                    <div className="space-y-3 pl-6 border-l-2 border-gray-200 dark:border-gray-700">
                      <div>
                        <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                          Loss Threshold Type
                        </label>
                        <select
                          value={dcaRules.stopDcaOnLossType}
                          onChange={(e) => setDcaRules({...dcaRules, stopDcaOnLossType: e.target.value as 'percent' | 'amount'})}
                          className="w-full px-3 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                          <option value="percent">By Percentage (%)</option>
                          <option value="amount">By Amount ({baseOrderCurrency})</option>
                        </select>
                      </div>

                      {dcaRules.stopDcaOnLossType === 'percent' ? (
                        <div>
                          <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                            Stop DCA at Loss (%)
                          </label>
                          <div className="flex items-center gap-2">
                            <input
                              type="number"
                              step="0.1"
                              min="0"
                              value={dcaRules.stopDcaOnLossPercent}
                              onChange={(e) => setDcaRules({...dcaRules, stopDcaOnLossPercent: parseFloat(e.target.value) || 0})}
                              className="flex-1 px-3 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                              placeholder="20"
                            />
                            <span className="text-sm text-gray-600 dark:text-gray-400">%</span>
                          </div>
                          <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                            Stop DCA when position shows this % unrealized loss
                          </div>
                        </div>
                      ) : (
                        <div>
                          <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                            Stop DCA at Loss ({baseOrderCurrency})
                          </label>
                          <input
                            type="number"
                            step="0.01"
                            min="0"
                            value={dcaRules.stopDcaOnLossAmount}
                            onChange={(e) => setDcaRules({...dcaRules, stopDcaOnLossAmount: parseFloat(e.target.value) || 0})}
                            className="w-full px-3 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                            placeholder="200"
                          />
                          <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                            Stop DCA when position shows this amount of unrealized loss
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {dcaRuleType === 'custom' && (
                  <div className="space-y-3">
                    <div className="text-xs text-gray-600 dark:text-gray-400">
                      Create a custom condition using indicators to trigger DCA orders
                    </div>
                    {/* Custom Condition Builder - Similar to Trading Conditions but without Playbook */}
                    <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 bg-gray-50 dark:bg-gray-900/50">
                      {!dcaCustomCondition ? (
                        <button
                          onClick={() => setDcaCustomCondition({
                            conditionType: 'RSI Conditions',
                            condition: {
                              indicator: 'RSI',
                              operator: 'crosses_below',
                              value: 30,
                              timeframe: '1h',
                              period: 14
                            }
                          })}
                          className="w-full px-4 py-2 text-sm bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
                        >
                          + Add Custom Condition
                        </button>
                      ) : (
                        <div className="space-y-4">
                          {/* Condition Type Selector */}
                          <div>
                            <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                              Condition Type
                            </label>
                            <select
                              value={dcaCustomCondition.conditionType}
                              onChange={(e) => {
                                const newType = e.target.value;
                                const defaultCondition: any = {
                                  indicator: newType === 'RSI Conditions' ? 'RSI' :
                                            newType === 'MFI Conditions' ? 'MFI' :
                                            newType === 'CCI Conditions' ? 'CCI' :
                                            newType === 'Moving Average (MA)' ? 'EMA' :
                                            newType === 'MACD Conditions' ? 'MACD' : 'RSI',
                                  operator: 'crosses_below',
                                  value: 30,
                                  timeframe: '1h',
                                  period: 14
                                };
                                
                                if (newType === 'Moving Average (MA)') {
                                  defaultCondition.maType = 'EMA';
                                  defaultCondition.fastMA = 10;
                                  defaultCondition.slowMA = 20;
                                } else if (newType === 'MACD Conditions') {
                                  defaultCondition.fastPeriod = 12;
                                  defaultCondition.slowPeriod = 26;
                                  defaultCondition.signalPeriod = 9;
                                  defaultCondition.macdComponent = 'histogram';
                                }
                                
                                setDcaCustomCondition({
                                  conditionType: newType,
                                  condition: defaultCondition
                                });
                              }}
                              className="w-full px-3 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                            >
                              <option value="RSI Conditions">RSI Conditions</option>
                              <option value="MFI Conditions">MFI Conditions</option>
                              <option value="CCI Conditions">CCI Conditions</option>
                              <option value="Moving Average (MA)">Moving Average (MA)</option>
                              <option value="MACD Conditions">MACD Conditions</option>
                              <option value="Price Action">Price Action</option>
                            </select>
                          </div>

                          {/* RSI Condition Builder */}
                          {dcaCustomCondition.conditionType === 'RSI Conditions' && (
                            <>
                              {/* Special Info Banner for "Between" Operator */}
                              {dcaCustomCondition.condition.operator === 'between' && (
                                <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 border border-blue-200 dark:border-blue-700 rounded-lg p-4 mb-3">
                                  <div className="flex items-start gap-3">
                                    <Info className="w-5 h-5 text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0" />
                                    <div className="flex-1">
                                      <h4 className="text-sm font-semibold text-blue-900 dark:text-blue-100 mb-2 flex items-center gap-2">
                                        🎯 RSI "Between" Operator
                                        <span className="px-2 py-0.5 bg-blue-200 dark:bg-blue-800 text-blue-800 dark:text-blue-200 rounded text-xs font-bold">NEW</span>
                                      </h4>
                                      <p className="text-xs text-blue-800 dark:text-blue-200 mb-2">
                                        <strong>Catches consolidation ranges!</strong> Perfect for accumulation zones after RSI goes oversold.
                                      </p>
                                      <div className="text-xs text-blue-700 dark:text-blue-300 space-y-1">
                                        <p><strong>When it triggers:</strong></p>
                                        <ul className="list-disc list-inside ml-2 space-y-0.5">
                                          <li>RSI consolidates in your range (e.g., 25-35)</li>
                                          <li>Market makes up its mind before next move</li>
                                          <li>Better entry prices than "crosses below"</li>
                                        </ul>
                                        <p className="mt-2"><strong>Example:</strong> If RSI = 28, 30, 32 → ✅ Triggers (all in range 25-35)</p>
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              )}
                              <div className={`grid gap-3 ${dcaCustomCondition.condition.operator === 'between' ? 'grid-cols-5' : 'grid-cols-4'}`}>
                                <div>
                                  <label className="text-xs font-medium text-gray-600 dark:text-gray-300 mb-1 block">RSI Period</label>
                                  <input 
                                    type="number" 
                                    min="1" 
                                    max="100" 
                                    value={dcaCustomCondition.condition.period || 14} 
                                  onChange={(e) => setDcaCustomCondition({
                                    ...dcaCustomCondition,
                                    condition: {...dcaCustomCondition.condition, period: Number(e.target.value)}
                                  })} 
                                  className="w-full px-2 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500" 
                                  placeholder="14" 
                                />
                              </div>
                              <div>
                                <label className="text-xs font-medium text-gray-600 dark:text-gray-300 mb-1 block">Timeframe</label>
                                <select 
                                  value={dcaCustomCondition.condition.timeframe} 
                                  onChange={(e) => setDcaCustomCondition({
                                    ...dcaCustomCondition,
                                    condition: {...dcaCustomCondition.condition, timeframe: e.target.value}
                                  })} 
                                  className="w-full px-2 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                                >
                                  <option value="1m">1m</option><option value="3m">3m</option><option value="5m">5m</option><option value="15m">15m</option><option value="30m">30m</option><option value="1h">1h</option><option value="2h">2h</option><option value="4h">4h</option><option value="6h">6h</option><option value="12h">12h</option><option value="1d">1d</option>
                                </select>
                              </div>
                              <div>
                                <label className="text-xs font-medium text-gray-600 dark:text-gray-300 mb-1 block">Condition</label>
                                <select 
                                  value={dcaCustomCondition.condition.operator} 
                                  onChange={(e) => setDcaCustomCondition({
                                    ...dcaCustomCondition,
                                    condition: {...dcaCustomCondition.condition, operator: e.target.value}
                                  })} 
                                  className="w-full px-2 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                                >
                                  <option value="crosses_below">Crosses below</option>
                                  <option value="crosses_above">Crosses above</option>
                                  <option value="less_than">Less than</option>
                                  <option value="greater_than">Greater than</option>
                                  <option value="equals">Equals</option>
                                  <option value="between">🎯 Between ⭐ NEW</option>
                                </select>
                              </div>
                              {dcaCustomCondition.condition.operator === 'between' ? (
                                <>
                                  <div>
                                    <label className="text-xs font-medium text-gray-600 dark:text-gray-300 mb-1 block">Lower Bound</label>
                                    <input 
                                      type="number" 
                                      min="0" 
                                      max="100" 
                                      value={dcaCustomCondition.condition.lowerBound || 25} 
                                      onChange={(e) => setDcaCustomCondition({
                                        ...dcaCustomCondition,
                                        condition: {...dcaCustomCondition.condition, lowerBound: Number(e.target.value)}
                                      })} 
                                      className="w-full px-2 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500" 
                                      placeholder="25" 
                                    />
                                  </div>
                                  <div>
                                    <label className="text-xs font-medium text-gray-600 dark:text-gray-300 mb-1 block">Upper Bound</label>
                                    <input 
                                      type="number" 
                                      min="0" 
                                      max="100" 
                                      value={dcaCustomCondition.condition.upperBound || 35} 
                                      onChange={(e) => setDcaCustomCondition({
                                        ...dcaCustomCondition,
                                        condition: {...dcaCustomCondition.condition, upperBound: Number(e.target.value)}
                                      })} 
                                      className="w-full px-2 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500" 
                                      placeholder="35" 
                                    />
                                  </div>
                                </>
                              ) : (
                                <div>
                                  <label className="text-xs font-medium text-gray-600 dark:text-gray-300 mb-1 block">RSI Value</label>
                                  <input 
                                    type="number" 
                                    min="0" 
                                    max="100" 
                                    value={dcaCustomCondition.condition.value} 
                                    onChange={(e) => setDcaCustomCondition({
                                      ...dcaCustomCondition,
                                      condition: {...dcaCustomCondition.condition, value: Number(e.target.value)}
                                    })} 
                                    className="w-full px-2 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500" 
                                    placeholder="30" 
                                  />
                                </div>
                              )}
                            </div>
                            </>
                          )}

                          {/* MFI Condition Builder */}
                          {dcaCustomCondition.conditionType === 'MFI Conditions' && (
                            <div className="grid grid-cols-2 gap-3">
                              <div>
                                <label className="text-xs font-medium text-gray-600 dark:text-gray-300 mb-1 block">MFI Period</label>
                                <input 
                                  type="number" 
                                  min="1" 
                                  max="100" 
                                  value={dcaCustomCondition.condition.mfiPeriod || 14} 
                                  onChange={(e) => setDcaCustomCondition({
                                    ...dcaCustomCondition,
                                    condition: {...dcaCustomCondition.condition, mfiPeriod: Number(e.target.value)}
                                  })} 
                                  className="w-full px-2 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500" 
                                  placeholder="14" 
                                />
                              </div>
                              <div>
                                <label className="text-xs font-medium text-gray-600 dark:text-gray-300 mb-1 block">Timeframe</label>
                                <select 
                                  value={dcaCustomCondition.condition.timeframe} 
                                  onChange={(e) => setDcaCustomCondition({
                                    ...dcaCustomCondition,
                                    condition: {...dcaCustomCondition.condition, timeframe: e.target.value}
                                  })} 
                                  className="w-full px-2 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                                >
                                  <option value="1m">1m</option><option value="3m">3m</option><option value="5m">5m</option><option value="15m">15m</option><option value="30m">30m</option><option value="1h">1h</option><option value="2h">2h</option><option value="4h">4h</option><option value="6h">6h</option><option value="12h">12h</option><option value="1d">1d</option>
                                </select>
                              </div>
                              <div>
                                <label className="text-xs font-medium text-gray-600 dark:text-gray-300 mb-1 block">Condition</label>
                                <select 
                                  value={dcaCustomCondition.condition.operator} 
                                  onChange={(e) => setDcaCustomCondition({
                                    ...dcaCustomCondition,
                                    condition: {...dcaCustomCondition.condition, operator: e.target.value}
                                  })} 
                                  className="w-full px-2 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                                >
                                  <option value="crosses_below">Crosses below</option>
                                  <option value="crosses_above">Crosses above</option>
                                  <option value="less_than">Less than</option>
                                  <option value="greater_than">Greater than</option>
                                  <option value="equals">Equals</option>
                                </select>
                              </div>
                              <div>
                                <label className="text-xs font-medium text-gray-600 dark:text-gray-300 mb-1 block">MFI Value</label>
                                <input 
                                  type="number" 
                                  min="0" 
                                  max="100" 
                                  value={dcaCustomCondition.condition.value} 
                                  onChange={(e) => setDcaCustomCondition({
                                    ...dcaCustomCondition,
                                    condition: {...dcaCustomCondition.condition, value: Number(e.target.value)}
                                  })} 
                                  className="w-full px-2 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500" 
                                  placeholder="30" 
                                />
                              </div>
                            </div>
                          )}

                          {/* CCI Condition Builder */}
                          {dcaCustomCondition.conditionType === 'CCI Conditions' && (
                            <div className="grid grid-cols-2 gap-3">
                              <div>
                                <label className="text-xs font-medium text-gray-600 dark:text-gray-300 mb-1 block">CCI Period</label>
                                <input 
                                  type="number" 
                                  min="1" 
                                  max="100" 
                                  value={dcaCustomCondition.condition.cciPeriod || 14} 
                                  onChange={(e) => setDcaCustomCondition({
                                    ...dcaCustomCondition,
                                    condition: {...dcaCustomCondition.condition, cciPeriod: Number(e.target.value)}
                                  })} 
                                  className="w-full px-2 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500" 
                                  placeholder="14" 
                                />
                              </div>
                              <div>
                                <label className="text-xs font-medium text-gray-600 dark:text-gray-300 mb-1 block">Timeframe</label>
                                <select 
                                  value={dcaCustomCondition.condition.timeframe} 
                                  onChange={(e) => setDcaCustomCondition({
                                    ...dcaCustomCondition,
                                    condition: {...dcaCustomCondition.condition, timeframe: e.target.value}
                                  })} 
                                  className="w-full px-2 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                                >
                                  <option value="1m">1m</option><option value="3m">3m</option><option value="5m">5m</option><option value="15m">15m</option><option value="30m">30m</option><option value="1h">1h</option><option value="2h">2h</option><option value="4h">4h</option><option value="6h">6h</option><option value="12h">12h</option><option value="1d">1d</option>
                                </select>
                              </div>
                              <div>
                                <label className="text-xs font-medium text-gray-600 dark:text-gray-300 mb-1 block">Condition</label>
                                <select 
                                  value={dcaCustomCondition.condition.operator} 
                                  onChange={(e) => setDcaCustomCondition({
                                    ...dcaCustomCondition,
                                    condition: {...dcaCustomCondition.condition, operator: e.target.value}
                                  })} 
                                  className="w-full px-2 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                                >
                                  <option value="crosses_below">Crosses below</option>
                                  <option value="crosses_above">Crosses above</option>
                                  <option value="less_than">Less than</option>
                                  <option value="greater_than">Greater than</option>
                                  <option value="equals">Equals</option>
                                </select>
                              </div>
                              <div>
                                <label className="text-xs font-medium text-gray-600 dark:text-gray-300 mb-1 block">CCI Value</label>
                                <input 
                                  type="number" 
                                  min="-100" 
                                  max="100" 
                                  value={dcaCustomCondition.condition.value} 
                                  onChange={(e) => setDcaCustomCondition({
                                    ...dcaCustomCondition,
                                    condition: {...dcaCustomCondition.condition, value: Number(e.target.value)}
                                  })} 
                                  className="w-full px-2 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500" 
                                  placeholder="0" 
                                />
                              </div>
                            </div>
                          )}

                          {/* Other condition types can be added similarly */}
                          {(dcaCustomCondition.conditionType === 'Moving Average (MA)' || 
                            dcaCustomCondition.conditionType === 'MACD Conditions' || 
                            dcaCustomCondition.conditionType === 'Price Action') && (
                            <div className="text-xs text-gray-500 dark:text-gray-400 italic bg-yellow-50 dark:bg-yellow-900/20 p-2 rounded">
                              Full builder for {dcaCustomCondition.conditionType} coming soon - use Trading Conditions section for full configuration
                            </div>
                          )}
                          
                          <div className="flex gap-2 pt-2 border-t border-gray-200 dark:border-gray-700">
                            <button
                              onClick={() => setDcaCustomCondition(null)}
                              className="flex-1 px-4 py-2 text-sm bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-lg transition-colors"
                            >
                              Remove Condition
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}
                </div>
              </div>

              {/* DCA Amount Section - Right */}
              <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <h2 className="text-base font-semibold text-gray-900 dark:text-white">DCA Amount</h2>
                    <Tooltip
                      content={
                        "DCA Amount determines HOW MUCH to buy in each DCA order:\n\n" +
                        "• Fixed Amount: Buy the same $ amount every time\n" +
                        "• Percentage of Base Order: Buy X% of your base order size\n\n" +
                        "💡 DCA Multiplier:\n" +
                        "Each subsequent DCA is multiplied by this factor.\n" +
                        "Example: Base=100, %=10%, Multiplier=1.5x\n" +
                        "  - 1st DCA: 100 × 10% × 1.5 = $15\n" +
                        "  - 2nd DCA: 100 × 10% × 1.5² = $22.50\n" +
                        "  - 3rd DCA: 100 × 10% × 1.5³ = $33.75\n\n" +
                        "This creates an exponential increase in DCA size, allowing you to buy more at lower prices."
                      }
                    />
                  </div>
                </div>
                
                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Amount Type
                    </label>
                    <select
                      value={dcaAmountType}
                      onChange={(e) => setDcaAmountType(e.target.value as 'fixed' | 'percentage')}
                      className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="fixed">Fixed Amount</option>
                      <option value="percentage">Percentage of Base Order</option>
                    </select>
                  </div>

                  {dcaAmountType === 'fixed' && (
                    <div>
                      <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                        DCA Amount ({baseOrderCurrency})
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        value={dcaAmount}
                        onChange={(e) => setDcaAmount(parseFloat(e.target.value) || 0)}
                        className="w-full px-3 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="100"
                      />
                    </div>
                  )}

                  {dcaAmountType === 'percentage' && (
                    <div>
                      <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                        DCA Percentage (%)
                      </label>
                      <div className="flex items-center gap-2">
                        <input
                          type="number"
                          step="0.1"
                          min="0"
                          max="100"
                          value={dcaAmountPercentage}
                          onChange={(e) => setDcaAmountPercentage(parseFloat(e.target.value) || 0)}
                          className="flex-1 px-3 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                          placeholder="10"
                        />
                        <span className="text-sm text-gray-600 dark:text-gray-400">%</span>
                      </div>
                      <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                        Percentage of base order size ({baseOrderSize} {baseOrderCurrency})
                      </div>
                      <div className="text-xs text-blue-600 dark:text-blue-400 mt-1 bg-blue-50 dark:bg-blue-900/20 p-2 rounded">
                        💡 Calculation: Base Order ({baseOrderSize}) × {dcaAmountPercentage}% = {(baseOrderSize * dcaAmountPercentage / 100).toFixed(2)} {baseOrderCurrency} base amount
                      </div>
                    </div>
                  )}

                  {dcaAmountType === 'fixed' && (
                    <div className="text-xs text-blue-600 dark:text-blue-400 mt-1 bg-blue-50 dark:bg-blue-900/20 p-2 rounded">
                      💡 Calculation: Fixed amount ({dcaAmount} {baseOrderCurrency}) used as base
                    </div>
                  )}

                  <div>
                    <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                      DCA Multiplier
                    </label>
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        step="0.1"
                        min="0.1"
                        value={dcaMultiplier}
                        onChange={(e) => setDcaMultiplier(parseFloat(e.target.value) || 1.0)}
                        className="flex-1 px-3 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="1.0"
                      />
                    </div>
                    <div className="text-xs text-gray-500 dark:text-gray-400 mt-1 mb-2">
                      Multiplies each DCA order amount. Values:
                    </div>
                    <div className="text-xs text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20 p-2 rounded space-y-1">
                      <div>• <strong>1.0</strong> = Same amount each time</div>
                      <div>• <strong>&gt; 1.0</strong> = Increase each DCA (e.g., 1.2 = +20% per DCA)</div>
                      <div>• <strong>&lt; 1.0</strong> = Decrease each DCA (e.g., 0.8 = -20% per DCA)</div>
                      {dcaAmountType === 'percentage' && (
                        <div className="mt-2 pt-2 border-t border-blue-200 dark:border-blue-800">
                          <strong>Example with {dcaAmountPercentage}% and {dcaMultiplier}x:</strong>
                          <div className="mt-1">
                            <div>1st DCA: {(baseOrderSize * dcaAmountPercentage / 100 * dcaMultiplier).toFixed(2)} {baseOrderCurrency}</div>
                            <div>2nd DCA: {(baseOrderSize * dcaAmountPercentage / 100 * dcaMultiplier * dcaMultiplier).toFixed(2)} {baseOrderCurrency}</div>
                            <div>3rd DCA: {(baseOrderSize * dcaAmountPercentage / 100 * dcaMultiplier * dcaMultiplier * dcaMultiplier).toFixed(2)} {baseOrderCurrency}</div>
                          </div>
                        </div>
                      )}
                      {dcaAmountType === 'fixed' && (
                        <div className="mt-2 pt-2 border-t border-blue-200 dark:border-blue-800">
                          <strong>Example with {dcaAmount} {baseOrderCurrency} and {dcaMultiplier}x:</strong>
                          <div className="mt-1">
                            <div>1st DCA: {(dcaAmount * dcaMultiplier).toFixed(2)} {baseOrderCurrency}</div>
                            <div>2nd DCA: {(dcaAmount * dcaMultiplier * dcaMultiplier).toFixed(2)} {baseOrderCurrency}</div>
                            <div>3rd DCA: {(dcaAmount * dcaMultiplier * dcaMultiplier * dcaMultiplier).toFixed(2)} {baseOrderCurrency}</div>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Phase 1: Advanced Features Section */}
            <div className="space-y-4 mb-4">
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
                      checked={marketRegimeConfig.enabled}
                      onChange={(e) => setMarketRegimeConfig({...marketRegimeConfig, enabled: e.target.checked})}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600"></div>
                  </label>
                </div>
                
                {marketRegimeConfig.enabled && (
                  <div className="space-y-4 pt-3 border-t border-gray-200 dark:border-gray-700">
                    {/* Timeframe Selection for Regime Analysis */}
                    <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-3 border border-blue-200 dark:border-blue-800">
                      <div className="mb-2">
                        <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                          Chart Timeframe for Market Analysis
                        </label>
                        <select
                          value={marketRegimeConfig.regimeTimeframe}
                          onChange={(e) => setMarketRegimeConfig({...marketRegimeConfig, regimeTimeframe: e.target.value})}
                          className="w-full px-3 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                          <option value="1m">1 Minute</option>
                          <option value="5m">5 Minutes</option>
                          <option value="15m">15 Minutes</option>
                          <option value="1h">1 Hour</option>
                          <option value="4h">4 Hours</option>
                          <option value="1d">1 Day (Recommended)</option>
                          <option value="1w">1 Week</option>
                        </select>
                        <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                          Select the chart timeframe used to analyze market trends and cycles. <strong>Recommendation:</strong> Use daily (1d) or higher for more reliable signals. Smaller timeframes react faster but may trigger on market noise.
                        </div>
                      </div>
                      <div className="flex items-center gap-2 mt-2">
                        <input
                          type="checkbox"
                          checked={marketRegimeConfig.pauseConditions.useTimeframeScaling}
                          onChange={(e) => setMarketRegimeConfig({
                            ...marketRegimeConfig,
                            pauseConditions: {...marketRegimeConfig.pauseConditions, useTimeframeScaling: e.target.checked}
                          })}
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
                                checked={marketRegimeConfig.allowEntryOverride}
                                onChange={(e) => setMarketRegimeConfig({
                                  ...marketRegimeConfig,
                                  allowEntryOverride: e.target.checked
                                })}
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
                            checked={marketRegimeConfig.pauseConditions.belowMovingAverage}
                            onChange={(e) => setMarketRegimeConfig({
                              ...marketRegimeConfig,
                              pauseConditions: {...marketRegimeConfig.pauseConditions, belowMovingAverage: e.target.checked}
                            })}
                            className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700"
                          />
                          <label className="text-xs text-gray-700 dark:text-gray-300">
                            Pause when price is below Moving Average
                          </label>
                        </div>
                        
                        {marketRegimeConfig.pauseConditions.belowMovingAverage && (
                          <div className="space-y-2">
                            <div>
                              <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                                MA Period {marketRegimeConfig.regimeTimeframe === '1d' ? '(days)' : `(periods in ${marketRegimeConfig.regimeTimeframe})`}
                              </label>
                              <input
                                type="number"
                                value={marketRegimeConfig.pauseConditions.maPeriod}
                                onChange={(e) => setMarketRegimeConfig({
                                  ...marketRegimeConfig,
                                  pauseConditions: {...marketRegimeConfig.pauseConditions, maPeriod: parseInt(e.target.value) || 200}
                                })}
                                className="w-full px-3 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                              />
                              <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                                {(() => {
                                  const tf = marketRegimeConfig.regimeTimeframe;
                                  if (tf === '1d') return `${marketRegimeConfig.pauseConditions.maPeriod} days = ${marketRegimeConfig.pauseConditions.maPeriod} periods`;
                                  if (tf === '1h') return `${marketRegimeConfig.pauseConditions.maPeriod} periods × 1h = ~${(marketRegimeConfig.pauseConditions.maPeriod / 24).toFixed(1)} days`;
                                  if (tf === '4h') return `${marketRegimeConfig.pauseConditions.maPeriod} periods × 4h = ~${(marketRegimeConfig.pauseConditions.maPeriod * 4 / 24).toFixed(1)} days`;
                                  if (tf === '1w') return `${marketRegimeConfig.pauseConditions.maPeriod} periods × 1 week = ${marketRegimeConfig.pauseConditions.maPeriod} weeks`;
                                  return `${marketRegimeConfig.pauseConditions.maPeriod} ${tf} periods`;
                                })()}
                                {marketRegimeConfig.regimeTimeframe === '1d' ? ' (Standard: 200-day MA)' : '. Recommendation: Adjust for timeframe (e.g., 50 for 1h = ~2 days)'}
                              </div>
                            </div>
                            <div>
                              <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                                RSI Threshold
                              </label>
                              <input
                                type="number"
                                step="0.1"
                                value={marketRegimeConfig.pauseConditions.rsiThreshold}
                                onChange={(e) => setMarketRegimeConfig({
                                  ...marketRegimeConfig,
                                  pauseConditions: {...marketRegimeConfig.pauseConditions, rsiThreshold: parseFloat(e.target.value) || 30}
                                })}
                                className="w-full px-3 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                              />
                              <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                                RSI below this value indicates oversold conditions (works the same for all timeframes)
                              </div>
                            </div>
                            <div>
                              <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                                Consecutive {marketRegimeConfig.regimeTimeframe === '1d' ? 'Days' : 'Periods'} Below Threshold
                              </label>
                              <input
                                type="number"
                                value={marketRegimeConfig.pauseConditions.consecutivePeriods}
                                onChange={(e) => setMarketRegimeConfig({
                                  ...marketRegimeConfig,
                                  pauseConditions: {...marketRegimeConfig.pauseConditions, consecutivePeriods: parseInt(e.target.value) || 7}
                                })}
                                className="w-full px-3 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                              />
                              <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                                {(() => {
                                  const periods = marketRegimeConfig.pauseConditions.consecutivePeriods;
                                  const tf = marketRegimeConfig.regimeTimeframe;
                                  if (tf === '1d') return `Pause after ${periods} consecutive days of bearish conditions`;
                                  if (tf === '1h' && marketRegimeConfig.pauseConditions.useTimeframeScaling) {
                                    return `${periods} periods × 1h = ${periods} hours (~${(periods / 24).toFixed(2)} days). Pause after ${periods} consecutive ${tf} bars with bearish conditions`;
                                  }
                                  if (tf === '4h' && marketRegimeConfig.pauseConditions.useTimeframeScaling) {
                                    return `${periods} periods × 4h = ${periods * 4} hours (~${(periods * 4 / 24).toFixed(2)} days). Pause after ${periods} consecutive ${tf} bars`;
                                  }
                                  return `Pause after ${periods} consecutive ${tf} periods with bearish conditions`;
                                })()}
                              </div>
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
                            value={marketRegimeConfig.resumeConditions.volumeDecreaseThreshold}
                            onChange={(e) => setMarketRegimeConfig({
                              ...marketRegimeConfig,
                              resumeConditions: {...marketRegimeConfig.resumeConditions, volumeDecreaseThreshold: parseFloat(e.target.value) || 20}
                            })}
                            className="w-full px-3 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                          />
                          <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                            Resume when volume decreases by this % (accumulation signal - works the same for all timeframes)
                          </div>
                        </div>
                        
                        <div>
                          <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                            Consolidation {marketRegimeConfig.regimeTimeframe === '1d' ? 'Days' : 'Periods'}
                          </label>
                          <input
                            type="number"
                            value={marketRegimeConfig.resumeConditions.consolidationPeriods}
                            onChange={(e) => setMarketRegimeConfig({
                              ...marketRegimeConfig,
                              resumeConditions: {...marketRegimeConfig.resumeConditions, consolidationPeriods: parseInt(e.target.value) || 5}
                            })}
                            className="w-full px-3 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                          />
                          <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                            {(() => {
                              const periods = marketRegimeConfig.resumeConditions.consolidationPeriods;
                              const tf = marketRegimeConfig.regimeTimeframe;
                              if (tf === '1d') return `Resume after ${periods} days of price consolidation`;
                              if (tf === '1h' && marketRegimeConfig.resumeConditions.useTimeframeScaling) {
                                return `${periods} periods × 1h = ${periods} hours (~${(periods / 24).toFixed(2)} days). Resume after ${periods} consecutive ${tf} bars in consolidation`;
                              }
                              if (tf === '4h' && marketRegimeConfig.resumeConditions.useTimeframeScaling) {
                                return `${periods} periods × 4h = ${periods * 4} hours (~${(periods * 4 / 24).toFixed(2)} days). Resume after ${periods} consecutive ${tf} bars`;
                              }
                              return `Resume after ${periods} consecutive ${tf} periods in consolidation range`;
                            })()}
                          </div>
                        </div>
                        
                        <div>
                          <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                            Price Range (%) - Consolidation Zone
                          </label>
                          <input
                            type="number"
                            step="0.1"
                            value={marketRegimeConfig.resumeConditions.priceRangePercent}
                            onChange={(e) => setMarketRegimeConfig({
                              ...marketRegimeConfig,
                              resumeConditions: {...marketRegimeConfig.resumeConditions, priceRangePercent: parseFloat(e.target.value) || 5}
                            })}
                            className="w-full px-3 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                          />
                          <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                            Price must stay within ±X% range for consolidation detection (works the same for all timeframes)
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={marketRegimeConfig.notifications}
                        onChange={(e) => setMarketRegimeConfig({...marketRegimeConfig, notifications: e.target.checked})}
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
                    <h2 className="text-base font-semibold text-gray-900 dark:text-white">📊 Dynamic DCA Amount Scaling</h2>
                    <span className="text-xs px-2 py-0.5 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 rounded">Phase 1</span>
                    <Tooltip
                      content={
                        "Dynamically adjusts DCA amounts based on market conditions:\n\n" +
                        "📊 Volatility-Based Scaling:\n" +
                        "• Low Volatility: Increase DCA (better prices expected)\n" +
                        "• High Volatility: Decrease DCA (reduce risk)\n" +
                        "Uses ATR (Average True Range) to measure volatility\n\n" +
                        "📍 Support/Resistance Awareness:\n" +
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
                      checked={dynamicScalingConfig.enabled}
                      onChange={(e) => setDynamicScalingConfig({...dynamicScalingConfig, enabled: e.target.checked})}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600"></div>
                  </label>
                </div>
                
                {dynamicScalingConfig.enabled && (
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
                              value={dynamicScalingConfig.volatilityMultiplier.lowVolatility}
                              onChange={(e) => setDynamicScalingConfig({
                                ...dynamicScalingConfig,
                                volatilityMultiplier: {...dynamicScalingConfig.volatilityMultiplier, lowVolatility: parseFloat(e.target.value) || 1.2}
                              })}
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
                              value={dynamicScalingConfig.volatilityMultiplier.normalVolatility}
                              onChange={(e) => setDynamicScalingConfig({
                                ...dynamicScalingConfig,
                                volatilityMultiplier: {...dynamicScalingConfig.volatilityMultiplier, normalVolatility: parseFloat(e.target.value) || 1.0}
                              })}
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
                              value={dynamicScalingConfig.volatilityMultiplier.highVolatility}
                              onChange={(e) => setDynamicScalingConfig({
                                ...dynamicScalingConfig,
                                volatilityMultiplier: {...dynamicScalingConfig.volatilityMultiplier, highVolatility: parseFloat(e.target.value) || 0.7}
                              })}
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
                              value={dynamicScalingConfig.supportResistanceMultiplier.nearStrongSupport}
                              onChange={(e) => setDynamicScalingConfig({
                                ...dynamicScalingConfig,
                                supportResistanceMultiplier: {...dynamicScalingConfig.supportResistanceMultiplier, nearStrongSupport: parseFloat(e.target.value) || 1.5}
                              })}
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
                              value={dynamicScalingConfig.supportResistanceMultiplier.neutralZone}
                              onChange={(e) => setDynamicScalingConfig({
                                ...dynamicScalingConfig,
                                supportResistanceMultiplier: {...dynamicScalingConfig.supportResistanceMultiplier, neutralZone: parseFloat(e.target.value) || 1.0}
                              })}
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
                              value={dynamicScalingConfig.supportResistanceMultiplier.nearResistance}
                              onChange={(e) => setDynamicScalingConfig({
                                ...dynamicScalingConfig,
                                supportResistanceMultiplier: {...dynamicScalingConfig.supportResistanceMultiplier, nearResistance: parseFloat(e.target.value) || 0.5}
                              })}
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
                              value={dynamicScalingConfig.fearGreedIndex.extremeFear}
                              onChange={(e) => setDynamicScalingConfig({
                                ...dynamicScalingConfig,
                                fearGreedIndex: {...dynamicScalingConfig.fearGreedIndex, extremeFear: parseFloat(e.target.value) || 1.8}
                              })}
                              className="w-full px-3 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                            <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">Scale up in extreme fear</div>
                          </div>
                          <div>
                            <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                              Neutral
                            </label>
                            <input
                              type="number"
                              step="0.1"
                              value={dynamicScalingConfig.fearGreedIndex.neutral}
                              onChange={(e) => setDynamicScalingConfig({
                                ...dynamicScalingConfig,
                                fearGreedIndex: {...dynamicScalingConfig.fearGreedIndex, neutral: parseFloat(e.target.value) || 1.0}
                              })}
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
                              value={dynamicScalingConfig.fearGreedIndex.extremeGreed}
                              onChange={(e) => setDynamicScalingConfig({
                                ...dynamicScalingConfig,
                                fearGreedIndex: {...dynamicScalingConfig.fearGreedIndex, extremeGreed: parseFloat(e.target.value) || 0.5}
                              })}
                              className="w-full px-3 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                            <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">Scale down in extreme greed</div>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={dynamicScalingConfig.volumeProfileWeight}
                        onChange={(e) => setDynamicScalingConfig({...dynamicScalingConfig, volumeProfileWeight: e.target.checked})}
                        className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700"
                      />
                      <label className="text-xs font-medium text-gray-700 dark:text-gray-300">
                        Use volume profile data for scaling (increase DCAs at high-volume nodes)
                      </label>
                    </div>
                  </div>
                )}
              </div>

              {/* Intelligent Profit Taking Strategy */}
              <div className={`bg-white dark:bg-gray-800 rounded-lg border ${!profitStrategyConfig.enabled ? 'border-red-300 dark:border-red-700' : 'border-gray-200 dark:border-gray-700'} p-4`}>
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <h2 className="text-base font-semibold text-gray-900 dark:text-white">💰 Intelligent Profit Taking Strategy</h2>
                    <span className="text-xs px-2 py-0.5 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 rounded">Phase 1</span>
                    {!profitStrategyConfig.enabled && (
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
                        "🔄 Take Profit & Restart:\n" +
                        "Close entire position at target % and immediately restart with original capital\n\n" +
                        "⏰ Time-Based Exit:\n" +
                        "Close position after X days if profitable and meets minimum profit requirement"
                      }
                    />
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={profitStrategyConfig.enabled}
                      onChange={(e) => setProfitStrategyConfig({...profitStrategyConfig, enabled: e.target.checked})}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600"></div>
                  </label>
                </div>
                
                {!profitStrategyConfig.enabled && (
                  <div className="mt-3 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                    <div className="flex items-start gap-2">
                      <AlertTriangle className="h-5 w-5 text-red-600 dark:text-red-400 mt-0.5 flex-shrink-0" />
                      <div className="text-sm text-red-800 dark:text-red-300">
                        <strong className="font-semibold">Required:</strong> You must enable and configure the Intelligent Profit Taking Strategy before creating a bot. This ensures your bot has a proper exit strategy to manage risk and take profits.
                      </div>
                    </div>
                  </div>
                )}
                
                {profitStrategyConfig.enabled && (
                  <div className="space-y-4 pt-3 border-t border-gray-200 dark:border-gray-700">
                    {/* Partial Profit Targets */}
                    <div>
                      <h3 className="text-sm font-medium text-gray-900 dark:text-white mb-2">Partial Profit Targets</h3>
                      <div className="space-y-3 pl-4 border-l-2 border-green-200 dark:border-green-800">
                        <div className="text-xs text-gray-600 dark:text-gray-400 mb-2">
                          Automatically sell X% of position at Y% profit
                        </div>
                        {profitStrategyConfig.partialTargets.map((target, index) => (
                          <div key={index} className="grid grid-cols-2 gap-3 bg-gray-50 dark:bg-gray-900/50 p-3 rounded">
                            <div>
                              <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                                At Profit (%)
                              </label>
                              <input
                                type="number"
                                step="0.1"
                                value={target.profitPercent}
                                onChange={(e) => {
                                  const newTargets = [...profitStrategyConfig.partialTargets];
                                  newTargets[index].profitPercent = parseFloat(e.target.value) || 0;
                                  setProfitStrategyConfig({...profitStrategyConfig, partialTargets: newTargets});
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
                                value={target.sellPercent}
                                onChange={(e) => {
                                  const newTargets = [...profitStrategyConfig.partialTargets];
                                  newTargets[index].sellPercent = parseFloat(e.target.value) || 0;
                                  setProfitStrategyConfig({...profitStrategyConfig, partialTargets: newTargets});
                                }}
                                className="w-full px-3 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                              />
                            </div>
                          </div>
                        ))}
                        <button
                          onClick={() => setProfitStrategyConfig({
                            ...profitStrategyConfig,
                            partialTargets: [...profitStrategyConfig.partialTargets, { profitPercent: 0, sellPercent: 0 }]
                          })}
                          className="text-xs px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded transition-colors"
                        >
                          + Add Target
                        </button>
                        {/* Show total percentage */}
                        <div className="mt-2 p-2 bg-gray-100 dark:bg-gray-800 rounded text-xs">
                          <div className="flex justify-between items-center">
                            <span className="text-gray-600 dark:text-gray-400">Total Sell %:</span>
                            <span className={`font-semibold ${
                              Math.abs(profitStrategyConfig.partialTargets.reduce((sum, t) => sum + (t.sellPercent || 0), 0) - 100) < 0.01
                                ? 'text-green-600 dark:text-green-400'
                                : 'text-red-600 dark:text-red-400'
                            }`}>
                              {profitStrategyConfig.partialTargets.reduce((sum, t) => sum + (t.sellPercent || 0), 0).toFixed(2)}%
                            </span>
                          </div>
                          {Math.abs(profitStrategyConfig.partialTargets.reduce((sum, t) => sum + (t.sellPercent || 0), 0) - 100) >= 0.01 && (
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
                            checked={profitStrategyConfig.trailingStop.enabled}
                            onChange={(e) => setProfitStrategyConfig({
                              ...profitStrategyConfig,
                              trailingStop: {...profitStrategyConfig.trailingStop, enabled: e.target.checked}
                            })}
                            className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700"
                          />
                          <label className="text-xs font-medium text-gray-700 dark:text-gray-300">
                            Enable trailing stop loss
                          </label>
                        </div>
                        
                        {profitStrategyConfig.trailingStop.enabled && (
                          <div className="space-y-2">
                            <div>
                              <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                                Activation Profit (%)
                              </label>
                              <input
                                type="number"
                                step="0.1"
                                value={profitStrategyConfig.trailingStop.activationProfit}
                                onChange={(e) => setProfitStrategyConfig({
                                  ...profitStrategyConfig,
                                  trailingStop: {...profitStrategyConfig.trailingStop, activationProfit: parseFloat(e.target.value) || 10}
                                })}
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
                                value={profitStrategyConfig.trailingStop.trailingDistance}
                                onChange={(e) => setProfitStrategyConfig({
                                  ...profitStrategyConfig,
                                  trailingStop: {...profitStrategyConfig.trailingStop, trailingDistance: parseFloat(e.target.value) || 5}
                                })}
                                className="w-full px-3 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                              />
                              <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                                Maintain stop loss X% below peak price
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <input
                                type="checkbox"
                                checked={profitStrategyConfig.trailingStop.onlyUp}
                                onChange={(e) => setProfitStrategyConfig({
                                  ...profitStrategyConfig,
                                  trailingStop: {...profitStrategyConfig.trailingStop, onlyUp: e.target.checked}
                                })}
                                className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700"
                              />
                              <label className="text-xs font-medium text-gray-700 dark:text-gray-300">
                                Only move up (never down) - lock in profits
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
                            checked={profitStrategyConfig.takeProfitAndRestart.enabled}
                            onChange={(e) => setProfitStrategyConfig({
                              ...profitStrategyConfig,
                              takeProfitAndRestart: {...profitStrategyConfig.takeProfitAndRestart, enabled: e.target.checked}
                            })}
                            className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700"
                          />
                          <label className="text-xs font-medium text-gray-700 dark:text-gray-300">
                            Close position at target and immediately restart
                          </label>
                        </div>
                        
                        {profitStrategyConfig.takeProfitAndRestart.enabled && (
                          <div className="space-y-2">
                            <div>
                              <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                                Profit Target (%)
                              </label>
                              <input
                                type="number"
                                step="0.1"
                                value={profitStrategyConfig.takeProfitAndRestart.profitTarget}
                                onChange={(e) => setProfitStrategyConfig({
                                  ...profitStrategyConfig,
                                  takeProfitAndRestart: {...profitStrategyConfig.takeProfitAndRestart, profitTarget: parseFloat(e.target.value) || 30}
                                })}
                                className="w-full px-3 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                              />
                            </div>
                            <div className="flex items-center gap-2">
                              <input
                                type="checkbox"
                                checked={profitStrategyConfig.takeProfitAndRestart.useOriginalCapital}
                                onChange={(e) => setProfitStrategyConfig({
                                  ...profitStrategyConfig,
                                  takeProfitAndRestart: {...profitStrategyConfig.takeProfitAndRestart, useOriginalCapital: e.target.checked}
                                })}
                                className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700"
                              />
                              <label className="text-xs font-medium text-gray-700 dark:text-gray-300">
                                Use original capital amount (not total position value)
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
                            checked={profitStrategyConfig.timeBasedExit.enabled}
                            onChange={(e) => setProfitStrategyConfig({
                              ...profitStrategyConfig,
                              timeBasedExit: {...profitStrategyConfig.timeBasedExit, enabled: e.target.checked}
                            })}
                            className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700"
                          />
                          <label className="text-xs font-medium text-gray-700 dark:text-gray-300">
                            Exit position after X days if profitable
                          </label>
                        </div>
                        
                        {profitStrategyConfig.timeBasedExit.enabled && (
                          <div className="space-y-2">
                            <div>
                              <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                                Max Hold Days
                              </label>
                              <input
                                type="number"
                                value={profitStrategyConfig.timeBasedExit.maxHoldDays}
                                onChange={(e) => setProfitStrategyConfig({
                                  ...profitStrategyConfig,
                                  timeBasedExit: {...profitStrategyConfig.timeBasedExit, maxHoldDays: parseInt(e.target.value) || 30}
                                })}
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
                                value={profitStrategyConfig.timeBasedExit.minProfit}
                                onChange={(e) => setProfitStrategyConfig({
                                  ...profitStrategyConfig,
                                  timeBasedExit: {...profitStrategyConfig.timeBasedExit, minProfit: parseFloat(e.target.value) || 10}
                                })}
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
                      checked={emergencyBrakeConfig.enabled}
                      onChange={(e) => setEmergencyBrakeConfig({...emergencyBrakeConfig, enabled: e.target.checked})}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-red-300 dark:peer-focus:ring-red-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-red-600"></div>
                  </label>
                </div>
                
                {emergencyBrakeConfig.enabled && (
                  <div className="space-y-4 pt-3 border-t border-gray-200 dark:border-gray-700">
                    {/* Circuit Breaker */}
                    <div>
                      <h3 className="text-sm font-medium text-gray-900 dark:text-white mb-2">Circuit Breaker (Flash Crash Detection)</h3>
                      <div className="space-y-3 pl-4 border-l-2 border-red-200 dark:border-red-800">
                        <div className="flex items-center gap-2">
                          <input
                            type="checkbox"
                            checked={emergencyBrakeConfig.circuitBreaker.enabled}
                            onChange={(e) => setEmergencyBrakeConfig({
                              ...emergencyBrakeConfig,
                              circuitBreaker: {...emergencyBrakeConfig.circuitBreaker, enabled: e.target.checked}
                            })}
                            className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700"
                          />
                          <label className="text-xs font-medium text-gray-700 dark:text-gray-300">
                            Pause all DCAs on flash crash detection
                          </label>
                        </div>
                        
                        {emergencyBrakeConfig.circuitBreaker.enabled && (
                          <div className="space-y-2">
                            <div>
                              <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                                Flash Crash Threshold (%)
                              </label>
                              <input
                                type="number"
                                step="0.1"
                                value={emergencyBrakeConfig.circuitBreaker.flashCrashPercent}
                                onChange={(e) => setEmergencyBrakeConfig({
                                  ...emergencyBrakeConfig,
                                  circuitBreaker: {...emergencyBrakeConfig.circuitBreaker, flashCrashPercent: parseFloat(e.target.value) || 10}
                                })}
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
                                value={emergencyBrakeConfig.circuitBreaker.timeWindowMinutes}
                                onChange={(e) => setEmergencyBrakeConfig({
                                  ...emergencyBrakeConfig,
                                  circuitBreaker: {...emergencyBrakeConfig.circuitBreaker, timeWindowMinutes: parseInt(e.target.value) || 5}
                                })}
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
                            checked={emergencyBrakeConfig.marketWideCrashDetection.enabled}
                            onChange={(e) => setEmergencyBrakeConfig({
                              ...emergencyBrakeConfig,
                              marketWideCrashDetection: {...emergencyBrakeConfig.marketWideCrashDetection, enabled: e.target.checked}
                            })}
                            className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700"
                          />
                          <label className="text-xs font-medium text-gray-700 dark:text-gray-300">
                            Pause when entire market crashes (correlation-based)
                          </label>
                        </div>
                        
                        {emergencyBrakeConfig.marketWideCrashDetection.enabled && (
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
                                value={emergencyBrakeConfig.marketWideCrashDetection.correlationThreshold}
                                onChange={(e) => setEmergencyBrakeConfig({
                                  ...emergencyBrakeConfig,
                                  marketWideCrashDetection: {...emergencyBrakeConfig.marketWideCrashDetection, correlationThreshold: parseFloat(e.target.value) || 0.8}
                                })}
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
                                value={emergencyBrakeConfig.marketWideCrashDetection.marketDropPercent}
                                onChange={(e) => setEmergencyBrakeConfig({
                                  ...emergencyBrakeConfig,
                                  marketWideCrashDetection: {...emergencyBrakeConfig.marketWideCrashDetection, marketDropPercent: parseFloat(e.target.value) || 15}
                                })}
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
                            checked={emergencyBrakeConfig.recoveryMode.enabled}
                            onChange={(e) => setEmergencyBrakeConfig({
                              ...emergencyBrakeConfig,
                              recoveryMode: {...emergencyBrakeConfig.recoveryMode, enabled: e.target.checked}
                            })}
                            className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700"
                          />
                          <label className="text-xs font-medium text-gray-700 dark:text-gray-300">
                            Automatically resume DCAs after market stabilizes
                          </label>
                        </div>
                        
                        {emergencyBrakeConfig.recoveryMode.enabled && (
                          <div className="space-y-2">
                            <div>
                              <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                                Stabilization Bars
                              </label>
                              <input
                                type="number"
                                value={emergencyBrakeConfig.recoveryMode.stabilizationBars}
                                onChange={(e) => setEmergencyBrakeConfig({
                                  ...emergencyBrakeConfig,
                                  recoveryMode: {...emergencyBrakeConfig.recoveryMode, stabilizationBars: parseInt(e.target.value) || 10}
                                })}
                                className="w-full px-3 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                              />
                              <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                                Number of stable bars required before resuming
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <input
                                type="checkbox"
                                checked={emergencyBrakeConfig.recoveryMode.resumeAfterStabilized}
                                onChange={(e) => setEmergencyBrakeConfig({
                                  ...emergencyBrakeConfig,
                                  recoveryMode: {...emergencyBrakeConfig.recoveryMode, resumeAfterStabilized: e.target.checked}
                                })}
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

            {/* Action Button */}
            <div className="flex justify-end gap-3">
              <button
                className="px-6 py-3 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors font-medium"
              >
                Cancel
              </button>
              <button
                onClick={handleStartBot}
                className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors font-medium"
              >
                Start bot
              </button>
            </div>
        </div>

        {/* Right Summary Panel */}
        <div className="w-96 flex-shrink-0">
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4 sticky top-6 max-h-[calc(100vh-2rem)] overflow-y-auto">
            <h3 className="text-base font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
              <span>📋</span>
              <span>Bot Summary</span>
            </h3>
            
            <div className="space-y-4">
              {/* Trading Mode */}
              <div className="pb-3 border-b border-gray-200 dark:border-gray-700">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Trading Mode</span>
                  <span className={`px-2 py-1 text-xs font-medium rounded ${
                    tradingMode === 'test'
                      ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-400'
                      : 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-400'
                  }`}>
                    {tradingMode === 'test' ? '🧪 Test' : '🔴 Live'}
                  </span>
                </div>
                <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  {tradingMode === 'test' 
                    ? '📊 Paper trading with live market data'
                    : '⚠️ Real money trading'}
                </div>
              </div>

              {/* Bot Configuration */}
              <div className="space-y-2 pb-3 border-b border-gray-200 dark:border-gray-700">
                <div className="text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wide mb-2">Configuration</div>
                
                {/* Bot Name */}
                <div className="flex items-center justify-between">
                  <span className="text-xs text-gray-600 dark:text-gray-400">Bot Name</span>
                  <span className="text-xs font-medium text-gray-900 dark:text-white truncate ml-2 max-w-[60%]">{botName}</span>
                </div>

                {/* Symbol/Pair */}
                <div className="flex items-center justify-between">
                  <span className="text-xs text-gray-600 dark:text-gray-400">Symbol</span>
                  <span className="text-xs font-medium text-gray-900 dark:text-white">
                    {botType === 'single' ? pair : `${selectedPairs.length} pairs`}
                  </span>
                </div>
                {botType === 'multi' && selectedPairs.length > 0 && (
                  <div className="text-xs text-gray-500 dark:text-gray-400 pl-2">
                    {selectedPairs.slice(0, 3).join(', ')}{selectedPairs.length > 3 ? '...' : ''}
                  </div>
                )}

                {/* Exchange */}
                <div className="flex items-center justify-between">
                  <span className="text-xs text-gray-600 dark:text-gray-400">Exchange</span>
                  <span className="text-xs font-medium text-gray-900 dark:text-white truncate ml-2 max-w-[60%]">{exchange}</span>
                </div>

                {/* Market */}
                <div className="flex items-center justify-between">
                  <span className="text-xs text-gray-600 dark:text-gray-400">Market</span>
                  <span className="text-xs font-medium text-gray-900 dark:text-white capitalize">{market}</span>
                </div>

                {/* Bot Type */}
                <div className="flex items-center justify-between">
                  <span className="text-xs text-gray-600 dark:text-gray-400">Bot Type</span>
                  <span className="text-xs font-medium text-gray-900 dark:text-white capitalize">
                    {botType === 'single' ? 'Single-pair' : 'Multi-pair'}
                  </span>
                </div>

                {/* Profit Currency */}
                <div className="flex items-center justify-between">
                  <span className="text-xs text-gray-600 dark:text-gray-400">Profit Currency</span>
                  <span className="text-xs font-medium text-gray-900 dark:text-white">
                    {profitCurrency === 'quote' ? 'Quote (USDT)' : 'Base'}
                  </span>
                </div>
              </div>

              {/* Trading Settings */}
              <div className="space-y-2 pb-3 border-b border-gray-200 dark:border-gray-700">
                <div className="text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wide mb-2">Trading Settings</div>
                
                {/* Initial Balance */}
                <div className="flex items-center justify-between">
                  <span className="text-xs text-gray-600 dark:text-gray-400">Initial Balance</span>
                  <span className="text-xs font-medium text-gray-900 dark:text-white">
                    {botStatus?.initial_balance 
                      ? `$${(botStatus.initial_balance).toFixed(2)} USDT` 
                      : '$10,000.00 USDT'}
                  </span>
                </div>

                {/* Base Order Size */}
                <div className="flex items-center justify-between">
                  <span className="text-xs text-gray-600 dark:text-gray-400">Base Order</span>
                  <span className="text-xs font-medium text-gray-900 dark:text-white">{baseOrderSize} {baseOrderCurrency}</span>
                </div>

                {/* Order Type */}
                <div className="flex items-center justify-between">
                  <span className="text-xs text-gray-600 dark:text-gray-400">Order Type</span>
                  <span className="text-xs font-medium text-gray-900 dark:text-white capitalize">{startOrderType}</span>
                </div>

                {/* Trading Start Condition */}
                <div className="flex items-center justify-between">
                  <span className="text-xs text-gray-600 dark:text-gray-400">Start Mode</span>
                  <span className="text-xs font-medium text-gray-900 dark:text-white">
                    {tradeStartCondition ? '⏳ Wait for Signal' : '⚡ Immediate'}
                  </span>
                </div>
              </div>

              {/* Entry Conditions */}
              <div className="space-y-2 pb-3 border-b border-gray-200 dark:border-gray-700">
                <div className="text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wide mb-2">Entry Conditions</div>
                
                {showPlaybookBuilder ? (
                  <>
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-gray-600 dark:text-gray-400">Mode</span>
                      <span className="text-xs font-medium text-gray-900 dark:text-white">Playbook</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-gray-600 dark:text-gray-400">Logic</span>
                      <span className="text-xs font-medium text-gray-900 dark:text-white">
                        {playbookGateLogic === 'ALL' ? 'ALL (AND)' : 'ANY (OR)'}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-gray-600 dark:text-gray-400">Conditions</span>
                      <span className="text-xs font-medium text-gray-900 dark:text-white">
                        {conditionPlaybook.filter(c => c.enabled).length} enabled
                      </span>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-gray-600 dark:text-gray-400">Mode</span>
                      <span className="text-xs font-medium text-gray-900 dark:text-white">Simple</span>
                    </div>
                    {entryCondition && (
                      <div className="text-xs text-gray-500 dark:text-gray-400 pl-2">
                        {entryCondition.indicator} {entryCondition.operator} {entryCondition.value}
                      </div>
                    )}
                  </>
                )}
              </div>

              {/* DCA Rules */}
              <div className="space-y-2 pb-3 border-b border-gray-200 dark:border-gray-700">
                <div className="text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wide mb-2">DCA Rules</div>
                
                <div className="flex items-center justify-between">
                  <span className="text-xs text-gray-600 dark:text-gray-400">Trigger</span>
                  <span className="text-xs font-medium text-gray-900 dark:text-white capitalize">
                    {dcaRuleType === 'down_from_last_entry' ? 'Down from Last Entry' :
                     dcaRuleType === 'down_from_average' ? 'Down from Average' :
                     dcaRuleType === 'loss_by_percent' ? 'Loss by %' :
                     dcaRuleType === 'loss_by_amount' ? 'Loss by Amount' :
                     'Custom'}
                  </span>
                </div>

                {dcaRuleType === 'down_from_last_entry' && (
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-gray-600 dark:text-gray-400">Threshold</span>
                    <span className="text-xs font-medium text-gray-900 dark:text-white">
                      {dcaRules.downFromLastEntryPercent}%
                    </span>
                  </div>
                )}

                {dcaRuleType === 'down_from_average' && (
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-gray-600 dark:text-gray-400">Threshold</span>
                    <span className="text-xs font-medium text-gray-900 dark:text-white">
                      {dcaRules.downFromAveragePricePercent}%
                    </span>
                  </div>
                )}

                <div className="flex items-center justify-between">
                  <span className="text-xs text-gray-600 dark:text-gray-400">Max DCA/Position</span>
                  <span className="text-xs font-medium text-gray-900 dark:text-white">{dcaRules.maxDcaPerPosition}</span>
                </div>

                {dcaRules.dcaCooldownValue > 0 && (
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-gray-600 dark:text-gray-400">Cooldown</span>
                    <span className="text-xs font-medium text-gray-900 dark:text-white">
                      {dcaRules.dcaCooldownValue} {dcaRules.dcaCooldownUnit}
                    </span>
                  </div>
                )}
              </div>

              {/* Phase 1 Features */}
              <div className="space-y-2 pb-3 border-b border-gray-200 dark:border-gray-700">
                <div className="text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wide mb-2">Advanced Features</div>
                
                {/* Market Regime Detection */}
                <div className="flex items-center justify-between">
                  <span className="text-xs text-gray-600 dark:text-gray-400">Market Regime</span>
                  <span className={`text-xs font-medium ${
                    marketRegimeConfig.enabled 
                      ? 'text-green-600 dark:text-green-400' 
                      : 'text-gray-400 dark:text-gray-500'
                  }`}>
                    {marketRegimeConfig.enabled ? '✅ Enabled' : '❌ Disabled'}
                  </span>
                </div>
                {marketRegimeConfig.enabled && (
                  <div className="text-xs text-gray-500 dark:text-gray-400 pl-2 text-[10px]">
                    {marketRegimeConfig.regimeTimeframe} • MA{marketRegimeConfig.pauseConditions.maPeriod} • RSI{marketRegimeConfig.pauseConditions.rsiThreshold}
                  </div>
                )}

                {/* Dynamic Scaling */}
                <div className="flex items-center justify-between">
                  <span className="text-xs text-gray-600 dark:text-gray-400">Dynamic Scaling</span>
                  <span className={`text-xs font-medium ${
                    dynamicScalingConfig.enabled 
                      ? 'text-green-600 dark:text-green-400' 
                      : 'text-gray-400 dark:text-gray-500'
                  }`}>
                    {dynamicScalingConfig.enabled ? '✅ Enabled' : '❌ Disabled'}
                  </span>
                </div>
                {dynamicScalingConfig.enabled && (
                  <div className="text-xs text-gray-500 dark:text-gray-400 pl-2 text-[10px]">
                    Volatility • S/R • Fear & Greed
                  </div>
                )}

                {/* Profit Strategy */}
                <div className="flex items-center justify-between">
                  <span className="text-xs text-gray-600 dark:text-gray-400">Profit Strategy</span>
                  <span className={`text-xs font-medium ${
                    profitStrategyConfig.enabled 
                      ? 'text-green-600 dark:text-green-400' 
                      : 'text-gray-400 dark:text-gray-500'
                  }`}>
                    {profitStrategyConfig.enabled ? '✅ Enabled' : '❌ Disabled'}
                  </span>
                </div>
                {profitStrategyConfig.enabled && (
                  <div className="text-xs text-gray-500 dark:text-gray-400 pl-2 text-[10px]">
                    {profitStrategyConfig.partialTargets.length > 0 && 'Partial • '}
                    {profitStrategyConfig.trailingStop.enabled && 'Trailing • '}
                    {profitStrategyConfig.takeProfitAndRestart.enabled && 'TP & Restart • '}
                    {profitStrategyConfig.timeBasedExit.enabled && 'Time-based'}
                  </div>
                )}

                {/* Emergency Brake */}
                <div className="flex items-center justify-between">
                  <span className="text-xs text-gray-600 dark:text-gray-400">Emergency Brake</span>
                  <span className={`text-xs font-medium ${
                    emergencyBrakeConfig.enabled 
                      ? 'text-green-600 dark:text-green-400' 
                      : 'text-gray-400 dark:text-gray-500'
                  }`}>
                    {emergencyBrakeConfig.enabled ? '✅ Enabled' : '❌ Disabled'}
                  </span>
                </div>
                {emergencyBrakeConfig.enabled && (
                  <div className="text-xs text-gray-500 dark:text-gray-400 pl-2 text-[10px]">
                    {emergencyBrakeConfig.circuitBreaker.enabled && 'Circuit Breaker • '}
                    {emergencyBrakeConfig.marketWideCrashDetection.enabled && 'Market Crash • '}
                    {emergencyBrakeConfig.recoveryMode.enabled && 'Recovery'}
                  </div>
                )}
              </div>

              {/* Conflict Warning / Resolved */}
              {showConflictWarning && conflictDetails.length > 0 && (
                <div className={`rounded-lg p-3 mt-4 border ${
                  marketRegimeConfig.allowEntryOverride
                    ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800'
                    : 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800'
                }`}>
                  <div className="flex items-start gap-2">
                    {marketRegimeConfig.allowEntryOverride ? (
                      <Check className="w-4 h-4 text-green-600 dark:text-green-400 mt-0.5 flex-shrink-0" />
                    ) : (
                      <AlertTriangle className="w-4 h-4 text-red-600 dark:text-red-400 mt-0.5 flex-shrink-0" />
                    )}
                    <div className="flex-1">
                      {marketRegimeConfig.allowEntryOverride ? (
                        <>
                          <div className="text-xs font-semibold text-green-800 dark:text-green-300 mb-1">
                            ✅ Conflict Resolved
                          </div>
                          <div className="text-xs text-green-700 dark:text-green-400 mb-2">
                            Entry conditions will override pause conditions when they trigger.
                          </div>
                          <div className="text-xs text-green-600 dark:text-green-400 space-y-1 opacity-75">
                            <div className="font-medium mb-1">Detected conflicts (resolved):</div>
                            {conflictDetails.map((conflict, idx) => (
                              <div key={idx}>• {conflict}</div>
                            ))}
                          </div>
                        </>
                      ) : (
                        <>
                          <div className="text-xs font-semibold text-red-800 dark:text-red-300 mb-1">
                            ⚠️ Potential Conflict Detected
                          </div>
                          <div className="text-xs text-red-700 dark:text-red-400 space-y-1">
                            {conflictDetails.map((conflict, idx) => (
                              <div key={idx}>• {conflict}</div>
                            ))}
                          </div>
                          <div className="text-xs text-red-600 dark:text-red-400 mt-2">
                            <strong>Solution:</strong> Enable "Allow entry conditions to override pause" in Market Regime Detection section above. This will let your entry conditions trigger trades even when pause condition is active.
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Bot Status (if running) */}
              {botStatus && botId && (
                <div className="border-t border-gray-200 dark:border-gray-700 pt-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-semibold text-gray-900 dark:text-white">Bot Status</span>
                    <span className={`text-xs px-2 py-1 rounded ${
                      botStatus.status === 'running' ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400' :
                      'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
                    }`}>
                      {botStatus.status === 'running' ? '🟢 Running' : botStatus.status || 'Inactive'}
                    </span>
                  </div>
                  
                  {botStatus.balance !== undefined && (
                    <>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <div className="text-xs text-gray-600 dark:text-gray-400 mb-1">Current Balance</div>
                          <div className="text-sm font-semibold text-gray-900 dark:text-white">
                            ${(botStatus.current_balance || botStatus.balance || 0).toFixed(2)} USDT
                          </div>
                        </div>
                        <div>
                          <div className="text-xs text-gray-600 dark:text-gray-400 mb-1">Total P&L</div>
                          <div className={`text-sm font-semibold ${
                            (botStatus.totalPnl || botStatus.total_pnl || 0) >= 0 
                              ? 'text-green-600 dark:text-green-400' 
                              : 'text-red-600 dark:text-red-400'
                          }`}>
                            ${(botStatus.totalPnl || botStatus.total_pnl || 0).toFixed(2)} ({(botStatus.returnPct || botStatus.total_return_pct || 0).toFixed(2)}%)
                          </div>
                        </div>
                      </div>
                      
                      {(botStatus.initial_balance || botStatus.total_invested) && (
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <div className="text-xs text-gray-600 dark:text-gray-400 mb-1">Invested</div>
                            <div className="text-sm font-semibold text-gray-900 dark:text-white">
                              ${(botStatus.total_invested || 0).toFixed(2)} USDT
                            </div>
                          </div>
                          <div>
                            <div className="text-xs text-gray-600 dark:text-gray-400 mb-1">Position Value</div>
                            <div className="text-sm font-semibold text-gray-900 dark:text-white">
                              ${(botStatus.total_position_value || 0).toFixed(2)} USDT
                            </div>
                          </div>
                        </div>
                      )}
                      
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <div className="text-xs text-gray-600 dark:text-gray-400 mb-1">Open Positions</div>
                          <div className="text-sm font-semibold text-gray-900 dark:text-white">
                            {botStatus.openPositions || 0}
                          </div>
                        </div>
                        <div>
                          <div className="text-xs text-gray-600 dark:text-gray-400 mb-1">Max Amount</div>
                          <div className="text-sm font-semibold text-gray-900 dark:text-white">
                            ${baseOrderSize} USDT
                          </div>
                        </div>
                      </div>
                      
                      {botStatus.positions && Object.keys(botStatus.positions).length > 0 && (
                        <div className="border-t border-gray-200 dark:border-gray-700 pt-2">
                          <div className="text-xs text-gray-600 dark:text-gray-400 mb-2">Positions</div>
                          {Object.entries(botStatus.positions).map(([pair, pos]: [string, any]) => (
                            <div key={pair} className="text-xs mb-1">
                              <div className="font-medium text-gray-900 dark:text-white">{pair}</div>
                              <div className="text-gray-600 dark:text-gray-400">
                                {pos.avg_entry_price?.toFixed(2)} → {pos.pnl_percent?.toFixed(2)}% ({pos.pnl_amount?.toFixed(2)})
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </>
                  )}
                  
                  {botStatus.paused && (
                    <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-2">
                      <div className="text-xs text-yellow-800 dark:text-yellow-400">
                        ⏸️ Bot is paused by Market Regime Detection
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Warning (when bot not running) */}
              {!botStatus && (
                <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-3 mt-4">
                  <div className="text-xs text-blue-800 dark:text-blue-300">
                    💡 Bot will start in paper trading mode. Click "Start bot" to begin.
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Conditions Info Modal */}
      {showConditionsInfo && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setShowConditionsInfo(false)}>
          <div className="bg-white dark:bg-gray-800 rounded-lg max-w-3xl w-full max-h-[90vh] overflow-y-auto shadow-xl" onClick={(e) => e.stopPropagation()}>
            <div className="sticky top-0 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-6 py-4 flex items-center justify-between">
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">How Conditions Work</h2>
              <button
                onClick={() => setShowConditionsInfo(false)}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            <div className="px-6 py-6 space-y-6">
              {/* Overview */}
              <div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
                  <span className="w-2 h-2 bg-blue-500 rounded-full"></span>
                  Overview
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
                  Trading conditions are rules that determine when your bot should enter a trade. You can use simple single conditions or create a complex playbook with multiple conditions combined with AND/OR logic.
                </p>
              </div>

              {/* Simple Mode */}
              <div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
                  <span className="w-2 h-2 bg-green-500 rounded-full"></span>
                  Simple Mode
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed mb-2">
                  In Simple Mode, you set a single condition that must be true for the bot to enter a trade.
                </p>
                <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-4 mt-3">
                  <p className="text-sm text-green-800 dark:text-green-300 font-medium mb-1">Example:</p>
                  <p className="text-sm text-green-700 dark:text-green-400">RSI crosses below 30 → Bot enters trade when RSI drops below 30</p>
                </div>
              </div>

              {/* Playbook Mode */}
              <div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
                  <span className="w-2 h-2 bg-purple-500 rounded-full"></span>
                  Playbook Mode
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed mb-3">
                  Playbook Mode allows you to create complex trading strategies with multiple conditions, priority-based evaluation, and custom logic.
                </p>
                
                <div className="space-y-4">
                  {/* Gate Logic */}
                  <div className="border-l-4 border-blue-500 pl-4">
                    <h4 className="text-base font-semibold text-gray-900 dark:text-white mb-2">Gate Logic</h4>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                      Determines how conditions must be satisfied for trade entry:
                    </p>
                    <ul className="space-y-2 text-sm text-gray-600 dark:text-gray-400">
                      <li className="flex items-start gap-2">
                        <span className="font-semibold text-blue-600 dark:text-blue-400">• ALL:</span>
                        <span>All enabled conditions must be true simultaneously. More conservative, requires all signals to align.</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="font-semibold text-blue-600 dark:text-blue-400">• ANY:</span>
                        <span>At least one enabled condition needs to be true. More flexible, trades on any matching condition.</span>
                      </li>
                    </ul>
                    <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-3 mt-3">
                      <p className="text-xs text-blue-800 dark:text-blue-300 font-medium mb-1">Example (ALL):</p>
                      <p className="text-xs text-blue-700 dark:text-blue-400">RSI &lt; 30 AND MACD crosses above 0 AND Price &gt; EMA → All three must be true</p>
                    </div>
                  </div>

                  {/* Priority System */}
                  <div className="border-l-4 border-purple-500 pl-4">
                    <h4 className="text-base font-semibold text-gray-900 dark:text-white mb-2">Priority System</h4>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                      Each condition has a priority number (1, 2, 3...) that determines the order of evaluation:
                    </p>
                    <ul className="space-y-2 text-sm text-gray-600 dark:text-gray-400">
                      <li className="flex items-start gap-2">
                        <span className="font-semibold text-purple-600 dark:text-purple-400">• Priority 1:</span>
                        <span>Evaluated first (most important condition)</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="font-semibold text-purple-600 dark:text-purple-400">• Priority 2+:</span>
                        <span>Evaluated after previous priorities</span>
                      </li>
                    </ul>
                    <div className="bg-purple-50 dark:bg-purple-900/20 rounded-lg p-3 mt-3">
                      <p className="text-xs text-purple-800 dark:text-purple-300 font-medium mb-1">Example:</p>
                      <p className="text-xs text-purple-700 dark:text-purple-400">Priority 1: RSI &lt; 30 → Priority 2: MACD crosses → Priority 3: Volume spike</p>
                      <p className="text-xs text-purple-600 dark:text-purple-400 mt-1">Bot checks conditions in this order: 1st, then 2nd, then 3rd</p>
                    </div>
                  </div>

                  {/* AND/OR Logic */}
                  <div className="border-l-4 border-orange-500 pl-4">
                    <h4 className="text-base font-semibold text-gray-900 dark:text-white mb-2">AND/OR Logic</h4>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                      Choose how conditions connect to each other:
                    </p>
                    <ul className="space-y-2 text-sm text-gray-600 dark:text-gray-400">
                      <li className="flex items-start gap-2">
                        <span className="font-semibold text-orange-600 dark:text-orange-400">• AND:</span>
                        <span>Both this condition AND the previous one must be true</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="font-semibold text-orange-600 dark:text-orange-400">• OR:</span>
                        <span>Either this condition OR the previous one (or both) can be true</span>
                      </li>
                    </ul>
                    <div className="bg-orange-50 dark:bg-orange-900/20 rounded-lg p-3 mt-3">
                      <p className="text-xs text-orange-800 dark:text-orange-300 font-medium mb-1">Example:</p>
                      <p className="text-xs text-orange-700 dark:text-orange-400">Condition 1: RSI &lt; 30</p>
                      <p className="text-xs text-orange-700 dark:text-orange-400">AND Condition 2: MACD crosses above</p>
                      <p className="text-xs text-orange-600 dark:text-orange-400 mt-1">Both must be true together</p>
                    </div>
                  </div>

                  {/* Validity Duration */}
                  <div className="border-l-4 border-teal-500 pl-4">
                    <h4 className="text-base font-semibold text-gray-900 dark:text-white mb-2">Validity Duration</h4>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                      Set how long a condition remains valid after it becomes true:
                    </p>
                    <ul className="space-y-2 text-sm text-gray-600 dark:text-gray-400">
                      <li className="flex items-start gap-2">
                        <span className="font-semibold text-teal-600 dark:text-teal-400">• Bars:</span>
                        <span>Condition stays valid for X number of candlesticks/bars (e.g., 5 bars = valid for 5 candles)</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="font-semibold text-teal-600 dark:text-teal-400">• Minutes:</span>
                        <span>Condition stays valid for X minutes of real-time (e.g., 15 minutes)</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="font-semibold text-teal-600 dark:text-teal-400">• 0 or Empty:</span>
                        <span>Condition stays valid indefinitely until it becomes false</span>
                      </li>
                    </ul>
                    <div className="bg-teal-50 dark:bg-teal-900/20 rounded-lg p-3 mt-3">
                      <p className="text-xs text-teal-800 dark:text-teal-300 font-medium mb-1">Example:</p>
                      <p className="text-xs text-teal-700 dark:text-teal-400">RSI &lt; 30, Valid for 3 bars</p>
                      <p className="text-xs text-teal-600 dark:text-teal-400 mt-1">If RSI drops below 30, this condition stays true for the next 3 candlesticks, even if RSI rises above 30</p>
                    </div>
                  </div>

                  {/* Evaluation Order */}
                  <div className="border-l-4 border-indigo-500 pl-4">
                    <h4 className="text-base font-semibold text-gray-900 dark:text-white mb-2">Evaluation Order</h4>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                      How the bot processes conditions:
                    </p>
                    <ul className="space-y-2 text-sm text-gray-600 dark:text-gray-400">
                      <li className="flex items-start gap-2">
                        <span className="font-semibold text-indigo-600 dark:text-indigo-400">• By Priority:</span>
                        <span>Conditions are evaluated in priority order (1, 2, 3...), regardless of their position in the list</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="font-semibold text-indigo-600 dark:text-indigo-400">• Sequential:</span>
                        <span>Conditions are evaluated from top to bottom in the order they appear</span>
                      </li>
                    </ul>
                  </div>

                  {/* Enabled/Disabled */}
                  <div className="border-l-4 border-gray-500 pl-4">
                    <h4 className="text-base font-semibold text-gray-900 dark:text-white mb-2">Enable/Disable Conditions</h4>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                      You can temporarily disable conditions without deleting them:
                    </p>
                    <ul className="space-y-2 text-sm text-gray-600 dark:text-gray-400">
                      <li className="flex items-start gap-2">
                        <span className="font-semibold">• Enabled (✓):</span>
                        <span>Condition is active and will be evaluated</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="font-semibold">• Disabled (○):</span>
                        <span>Condition is ignored, won't affect trade entry logic</span>
                      </li>
                    </ul>
                  </div>

                  {/* Real-World Example */}
                  <div className="bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20 rounded-lg p-5 border border-blue-200 dark:border-blue-800">
                    <h4 className="text-base font-semibold text-gray-900 dark:text-white mb-3">💡 Real-World Example</h4>
                    <div className="space-y-3 text-sm">
                      <div className="bg-white dark:bg-gray-800 rounded p-3">
                        <p className="font-semibold text-gray-900 dark:text-white mb-2">Strategy: "RSI Oversold + MACD Reversal"</p>
                        <ul className="space-y-1.5 text-gray-600 dark:text-gray-400">
                          <li>• <strong>Gate Logic:</strong> ALL conditions must be true</li>
                          <li>• <strong>Priority 1:</strong> RSI &lt; 30 (valid for 5 bars)</li>
                          <li>• <strong>Priority 2:</strong> AND MACD histogram crosses above 0</li>
                          <li>• <strong>Priority 3:</strong> AND Price &gt; EMA(20)</li>
                        </ul>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-2 pt-2 border-t border-gray-200 dark:border-gray-700">
                          <strong>How it works:</strong> Bot waits for RSI to drop below 30. Once true, it stays valid for 5 bars. During those 5 bars, if MACD histogram crosses above 0 AND price is above EMA(20), the bot enters the trade.
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Tips */}
                  <div className="bg-yellow-50 dark:bg-yellow-900/20 rounded-lg p-4 border border-yellow-200 dark:border-yellow-800">
                    <h4 className="text-base font-semibold text-yellow-900 dark:text-yellow-300 mb-2">⚠️ Tips & Best Practices</h4>
                    <ul className="space-y-2 text-sm text-yellow-800 dark:text-yellow-400">
                      <li>• Start with simple conditions and gradually build complexity</li>
                      <li>• Use validity duration for conditions that might flicker (quick true/false)</li>
                      <li>• Priority matters: Put your most important condition first</li>
                      <li>• Test your playbook thoroughly before going live</li>
                      <li>• Use "ALL" for conservative strategies, "ANY" for more active trading</li>
                      <li>• You can enable/disable conditions without losing your setup</li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>

            <div className="sticky bottom-0 bg-gray-50 dark:bg-gray-900 border-t border-gray-200 dark:border-gray-700 px-6 py-4 flex justify-end">
              <button
                onClick={() => setShowConditionsInfo(false)}
                className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors font-medium"
              >
                Got it!
              </button>
            </div>
          </div>
        </div>
      )}

      {/* DCA Rules & Amount Info Modal */}
      {showDcaRulesInfo && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setShowDcaRulesInfo(false)}>
          <div className="bg-white dark:bg-gray-800 rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto shadow-xl" onClick={(e) => e.stopPropagation()}>
            <div className="sticky top-0 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-6 py-4 flex items-center justify-between">
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">How DCA Rules & Amount Work</h2>
              <button
                onClick={() => setShowDcaRulesInfo(false)}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            <div className="px-6 py-6 space-y-6">
              {/* Overview */}
              <div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
                  <span className="w-2 h-2 bg-blue-500 rounded-full"></span>
                  Overview
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
                  DCA (Dollar Cost Averaging) allows your bot to automatically buy more of an asset when the price drops, averaging down your entry price. The <strong>DCA Rules</strong> determine <em>when</em> to trigger a DCA order, while <strong>DCA Amount</strong> determines <em>how much</em> to buy each time.
                </p>
              </div>

              {/* DCA Rules Section */}
              <div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
                  <span className="w-2 h-2 bg-green-500 rounded-full"></span>
                  DCA Rules - When to Trigger
                </h3>
                
                <div className="space-y-4">
                  {/* When to Start DCA */}
                  <div className="border-l-4 border-blue-500 pl-4">
                    <h4 className="text-base font-semibold text-gray-900 dark:text-white mb-2">When to Start DCA</h4>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                      Choose when the bot should place a DCA order:
                    </p>
                    <ul className="space-y-2 text-sm text-gray-600 dark:text-gray-400 mb-3">
                      <li className="flex items-start gap-2">
                        <span className="font-semibold text-blue-600 dark:text-blue-400">• Down from Last Entry Price:</span>
                        <span>Triggers when price drops X% from your most recent order (base or DCA). Best for consistent averaging.</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="font-semibold text-blue-600 dark:text-blue-400">• Down from Average Price:</span>
                        <span>Triggers when price drops X% from your average purchase price. Helps maintain average entry.</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="font-semibold text-blue-600 dark:text-blue-400">• Loss by Percentage:</span>
                        <span>Triggers when your position shows X% unrealized loss. Protects against deep drawdowns.</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="font-semibold text-blue-600 dark:text-blue-400">• Loss by Amount:</span>
                        <span>Triggers when your position shows X amount of unrealized loss (in quote currency).</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="font-semibold text-blue-600 dark:text-blue-400">• Custom Condition:</span>
                        <span>Use technical indicators (RSI, MACD, etc.) to trigger DCAs based on market signals.</span>
                      </li>
                    </ul>
                    <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-3 mt-3">
                      <p className="text-xs text-blue-800 dark:text-blue-300 font-medium mb-1">Example:</p>
                      <p className="text-xs text-blue-700 dark:text-blue-400">"Down 2% from Last Entry" → If last order was at $100, DCA triggers when price reaches $98</p>
                    </div>
                  </div>

                  {/* DCA Limits */}
                  <div className="border-l-4 border-purple-500 pl-4">
                    <h4 className="text-base font-semibold text-gray-900 dark:text-white mb-2">DCA Limits</h4>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                      Control how many DCA orders can be placed:
                    </p>
                    <ul className="space-y-2 text-sm text-gray-600 dark:text-gray-400">
                      <li className="flex items-start gap-2">
                        <span className="font-semibold text-purple-600 dark:text-purple-400">• Max DCA per Position:</span>
                        <span>Maximum number of DCA orders for a single position. Prevents over-averaging on one trade.</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="font-semibold text-purple-600 dark:text-purple-400">• Max DCA Across All Positions:</span>
                        <span>Total DCA orders across all your open positions. Manages capital allocation across multiple trades.</span>
                      </li>
                    </ul>
                    <div className="bg-purple-50 dark:bg-purple-900/20 rounded-lg p-3 mt-3">
                      <p className="text-xs text-purple-800 dark:text-purple-300 font-medium mb-1">Example:</p>
                      <p className="text-xs text-purple-700 dark:text-purple-400">Max 5 DCA per position → After 5 DCAs on one position, no more DCAs will trigger for that trade</p>
                    </div>
                  </div>

                  {/* DCA Spacing & Timing */}
                  <div className="border-l-4 border-orange-500 pl-4">
                    <h4 className="text-base font-semibold text-gray-900 dark:text-white mb-2">DCA Spacing & Timing</h4>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                      Control the frequency and spacing of DCA orders:
                    </p>
                    <ul className="space-y-2 text-sm text-gray-600 dark:text-gray-400">
                      <li className="flex items-start gap-2">
                        <span className="font-semibold text-orange-600 dark:text-orange-400">• DCA Cooldown Period:</span>
                        <span>Wait period after a DCA before allowing another one. Can be set in <strong>minutes</strong> (real-time) or <strong>bars</strong> (number of candlesticks). Set to 0 to disable cooldown.</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="font-semibold text-orange-600 dark:text-orange-400">• Wait for Previous DCA:</span>
                        <span>Ensures each DCA order executes before placing the next one (sequential execution).</span>
                      </li>
                    </ul>
                  </div>

                  {/* Position Investment Limits */}
                  <div className="border-l-4 border-red-500 pl-4">
                    <h4 className="text-base font-semibold text-gray-900 dark:text-white mb-2">Position Investment Limits</h4>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                      Protect your capital by limiting how much you invest in a single position:
                    </p>
                    <ul className="space-y-2 text-sm text-gray-600 dark:text-gray-400">
                      <li className="flex items-start gap-2">
                        <span className="font-semibold text-red-600 dark:text-red-400">• Max Total Investment per Position:</span>
                        <span>Stops DCA when total invested (base + all DCAs) reaches this amount. Critical capital protection.</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="font-semibold text-red-600 dark:text-red-400">• Stop DCA on Loss:</span>
                        <span>When position loss exceeds threshold (percentage or amount), stops DCAs to prevent further losses. Emergency stop loss for DCA. Choose between percentage-based or amount-based threshold.</span>
                      </li>
                    </ul>
                  </div>
                </div>
              </div>

              {/* DCA Amount Section */}
              <div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
                  <span className="w-2 h-2 bg-teal-500 rounded-full"></span>
                  DCA Amount - How Much to Buy
                </h3>
                
                <div className="space-y-4">
                  {/* Amount Type */}
                  <div className="border-l-4 border-teal-500 pl-4">
                    <h4 className="text-base font-semibold text-gray-900 dark:text-white mb-2">Amount Type</h4>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                      Choose how to calculate each DCA order size:
                    </p>
                    <ul className="space-y-2 text-sm text-gray-600 dark:text-gray-400">
                      <li className="flex items-start gap-2">
                        <span className="font-semibold text-teal-600 dark:text-teal-400">• Fixed Amount:</span>
                        <span>Each DCA buys a fixed amount (e.g., always $100). Simple and predictable.</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="font-semibold text-teal-600 dark:text-teal-400">• Percentage of Base Order:</span>
                        <span>Each DCA is calculated as a percentage of your base order size. Scales with your position size.</span>
                      </li>
                    </ul>
                    <div className="bg-teal-50 dark:bg-teal-900/20 rounded-lg p-3 mt-3">
                      <p className="text-xs text-teal-800 dark:text-teal-300 font-medium mb-1">Example (Percentage):</p>
                      <p className="text-xs text-teal-700 dark:text-teal-400">Base Order: 100 USDT, DCA Percentage: 10%</p>
                      <p className="text-xs text-teal-600 dark:text-teal-400 mt-1">Each DCA = 100 × 10% = 10 USDT</p>
                    </div>
                  </div>

                  {/* DCA Multiplier */}
                  <div className="border-l-4 border-indigo-500 pl-4">
                    <h4 className="text-base font-semibold text-gray-900 dark:text-white mb-2">DCA Multiplier</h4>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                      The multiplier <strong>compounds</strong> with each DCA order, creating a progressive scaling pattern:
                    </p>
                    
                    <div className="bg-indigo-50 dark:bg-indigo-900/20 rounded-lg p-4 mb-3">
                      <p className="text-xs text-indigo-800 dark:text-indigo-300 font-medium mb-2">📊 How Multiplier Works:</p>
                      <ul className="space-y-1 text-xs text-indigo-700 dark:text-indigo-400">
                        <li><strong>Multiplier = 1.0:</strong> Same amount each time (10 USDT, 10 USDT, 10 USDT...)</li>
                        <li><strong>Multiplier = 1.2:</strong> Increases by 20% each time (12 USDT, 14.4 USDT, 17.28 USDT...)</li>
                        <li><strong>Multiplier = 0.8:</strong> Decreases by 20% each time (8 USDT, 6.4 USDT, 5.12 USDT...)</li>
                      </ul>
                    </div>

                    <div className="bg-gray-50 dark:bg-gray-900/50 rounded-lg p-4">
                      <p className="text-xs font-semibold text-gray-900 dark:text-white mb-2">Formula:</p>
                      <p className="text-xs text-gray-600 dark:text-gray-400 font-mono bg-white dark:bg-gray-800 p-2 rounded mb-2">
                        DCA Order #N = Base Amount × (Multiplier)^N
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400 italic">
                        Where N is the DCA order number (1st, 2nd, 3rd...)
                      </p>
                    </div>
                  </div>

                  {/* Combined Example */}
                  <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 rounded-lg p-5 border border-blue-200 dark:border-blue-800">
                    <h4 className="text-base font-semibold text-gray-900 dark:text-white mb-3">💡 Complete Example: Rules + Amount</h4>
                    <div className="space-y-3 text-sm">
                      <div className="bg-white dark:bg-gray-800 rounded p-3">
                        <p className="font-semibold text-gray-900 dark:text-white mb-2">Setup:</p>
                        <ul className="space-y-1.5 text-gray-600 dark:text-gray-400">
                          <li>• <strong>Base Order:</strong> 100 USDT</li>
                          <li>• <strong>DCA Rule:</strong> Down 2% from Last Entry</li>
                          <li>• <strong>DCA Amount Type:</strong> Percentage (10%)</li>
                          <li>• <strong>DCA Multiplier:</strong> 1.2x</li>
                          <li>• <strong>Max DCA per Position:</strong> 5</li>
                        </ul>
                        <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-700">
                          <p className="text-xs font-semibold text-gray-900 dark:text-white mb-2">How it works:</p>
                          <ol className="space-y-1 text-xs text-gray-600 dark:text-gray-400 list-decimal list-inside">
                            <li>Bot places <strong>Base Order</strong>: 100 USDT at $10,000</li>
                            <li>Price drops to $9,800 (-2%) → <strong>1st DCA</strong> triggers</li>
                            <li>1st DCA = 100 × 10% × 1.2 = <strong>12 USDT</strong> at $9,800</li>
                            <li>Price drops to $9,604 (-2% from last) → <strong>2nd DCA</strong> triggers</li>
                            <li>2nd DCA = 100 × 10% × 1.2² = <strong>14.4 USDT</strong> at $9,604</li>
                            <li>Price drops to $9,412 (-2% from last) → <strong>3rd DCA</strong> triggers</li>
                            <li>3rd DCA = 100 × 10% × 1.2³ = <strong>17.28 USDT</strong> at $9,412</li>
                            <li>This continues until <strong>5 DCAs</strong> are reached (max limit)</li>
                          </ol>
                        </div>
                        <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-700 bg-green-50 dark:bg-green-900/20 rounded p-2">
                          <p className="text-xs text-green-800 dark:text-green-300 font-medium">Result:</p>
                          <p className="text-xs text-green-700 dark:text-green-400 mt-1">
                            Average entry price improves with each DCA, and position grows progressively (12 → 14.4 → 17.28...)
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Percentage vs Fixed */}
                  <div className="border-l-4 border-yellow-500 pl-4">
                    <h4 className="text-base font-semibold text-gray-900 dark:text-white mb-2">Percentage vs Fixed Amount</h4>
                    <div className="grid grid-cols-2 gap-3 mt-3">
                      <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-3">
                        <p className="text-xs font-semibold text-blue-800 dark:text-blue-300 mb-1">✅ Percentage (Recommended)</p>
                        <ul className="text-xs text-blue-700 dark:text-blue-400 space-y-1">
                          <li>• Scales with base order</li>
                          <li>• Consistent risk per trade</li>
                          <li>• Adapts if base changes</li>
                        </ul>
                      </div>
                      <div className="bg-gray-50 dark:bg-gray-900/50 rounded-lg p-3">
                        <p className="text-xs font-semibold text-gray-800 dark:text-gray-300 mb-1">⚪ Fixed Amount</p>
                        <ul className="text-xs text-gray-700 dark:text-gray-400 space-y-1">
                          <li>• Same amount every time</li>
                          <li>• Predictable costs</li>
                          <li>• Good for small accounts</li>
                        </ul>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* How They Work Together */}
              <div className="bg-gradient-to-r from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20 rounded-lg p-5 border border-purple-200 dark:border-purple-800">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
                  <span className="w-2 h-2 bg-purple-500 rounded-full"></span>
                  How DCA Rules & Amount Work Together
                </h3>
                <div className="space-y-3 text-sm text-gray-600 dark:text-gray-400">
                  <p>
                    <strong>Step 1 - Trigger Check:</strong> The bot continuously monitors price. When a DCA Rule condition is met (e.g., "down 2% from last entry"), it triggers.
                  </p>
                  <p>
                    <strong>Step 2 - Rule Validation:</strong> Before placing the order, the bot checks:
                  </p>
                  <ul className="list-disc list-inside ml-4 space-y-1">
                    <li>Is "When to Start DCA" condition met? (e.g., down 2% from last entry)</li>
                    <li>Has cooldown period expired? (if cooldown is set - checked in minutes or bars based on your setting)</li>
                    <li>Are DCA limits respected? (max per position, max total)</li>
                    <li>Is position within investment limits? (max investment, profit/loss stops)</li>
                  </ul>
                  <p>
                    <strong>Step 3 - Amount Calculation:</strong> If all rules pass, the bot calculates:
                  </p>
                  <div className="bg-white dark:bg-gray-800 rounded p-3 font-mono text-xs">
                    <p>Base Amount = (Fixed Amount) OR (Base Order × Percentage%)</p>
                    <p className="mt-1">Final DCA Amount = Base Amount × (Multiplier)^DCA_Number</p>
                  </div>
                  <p>
                    <strong>Step 4 - Order Execution:</strong> The calculated amount is placed as a DCA order, and the cycle repeats when the next rule trigger occurs.
                  </p>
                </div>
              </div>

              {/* Tips */}
              <div className="bg-yellow-50 dark:bg-yellow-900/20 rounded-lg p-4 border border-yellow-200 dark:border-yellow-800">
                <h4 className="text-base font-semibold text-yellow-900 dark:text-yellow-300 mb-2">⚠️ Tips & Best Practices</h4>
                <ul className="space-y-2 text-sm text-yellow-800 dark:text-yellow-400">
                  <li>• <strong>Set realistic limits:</strong> Max DCA per position prevents over-commitment to one trade</li>
                  <li>• <strong>Use multipliers carefully:</strong> 1.2x grows quickly - calculate total investment beforehand</li>
                  <li>• <strong>Combine price and time spacing:</strong> Prevents too-frequent orders during volatile periods</li>
                  <li>• <strong>Set max investment limits:</strong> Critical for capital protection, especially with multipliers</li>
                  <li>• <strong>Test with small amounts first:</strong> Verify your rules work as expected before scaling up</li>
                  <li>• <strong>Monitor average entry:</strong> DCA should improve your average, not worsen it</li>
                  <li>• <strong>Stop on profit is wise:</strong> Don't average down when already profitable</li>
                  <li>• <strong>Use stop on loss:</strong> Prevents unlimited averaging on a bad trade</li>
                </ul>
              </div>
            </div>

            <div className="sticky bottom-0 bg-gray-50 dark:bg-gray-900 border-t border-gray-200 dark:border-gray-700 px-6 py-4 flex justify-end">
              <button
                onClick={() => setShowDcaRulesInfo(false)}
                className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors font-medium"
              >
                Got it!
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Live Trading Confirmation Modal */}
      <Dialog open={showLiveTradingModal} onOpenChange={setShowLiveTradingModal}>
        <DialogContent className="sm:max-w-md bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700">
          <DialogHeader>
            <div className="flex items-center gap-3 mb-2">
              <div className="flex-shrink-0 w-10 h-10 rounded-full bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
                <AlertTriangle className="h-6 w-6 text-amber-600 dark:text-amber-400" />
              </div>
              <DialogTitle className="text-xl font-semibold text-gray-900 dark:text-white">
                Enable Live Trading?
              </DialogTitle>
            </div>
            <DialogDescription className="text-sm text-gray-600 dark:text-gray-300 pt-2">
              <p className="mb-3">
                <strong className="text-amber-600 dark:text-amber-400">Warning:</strong> Live mode will trade with real money.
              </p>
              <p>
                Are you sure you want to enable live trading? This action cannot be undone easily and will execute real trades on your connected exchange.
              </p>
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex gap-3 sm:justify-end mt-4">
            <button
              onClick={() => setShowLiveTradingModal(false)}
              className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={() => {
                setTradingMode('live');
                setShowLiveTradingModal(false);
                toast.success('Live trading mode enabled');
              }}
              className="px-4 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded-lg transition-colors shadow-sm"
            >
              Enable Live Trading
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Bot Creation Summary Modal */}
      <Dialog open={showBotSummaryModal} onOpenChange={setShowBotSummaryModal}>
        <DialogContent className="sm:max-w-2xl bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-xl font-semibold text-gray-900 dark:text-white flex items-center gap-2">
              <span>📋</span>
              <span>Bot Configuration Summary</span>
            </DialogTitle>
            <DialogDescription className="text-sm text-gray-600 dark:text-gray-300 pt-2">
              Review your bot configuration before creating it.
            </DialogDescription>
          </DialogHeader>
          
          {pendingBotConfig && (
            <div className="space-y-4 py-4">
              {/* Trading Mode */}
              <div className="bg-gray-50 dark:bg-gray-900/50 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">Trading Mode</span>
                  <span className={`px-2 py-1 text-xs font-medium rounded ${
                    pendingBotConfig.tradingMode === 'test'
                      ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-400'
                      : 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-400'
                  }`}>
                    {pendingBotConfig.tradingMode === 'test' ? '🧪 Test Mode' : '🔴 Live Mode'}
                  </span>
                </div>
                <div className="text-xs text-gray-500 dark:text-gray-400">
                  {pendingBotConfig.tradingMode === 'test' 
                    ? 'Paper trading with live market data'
                    : '⚠️ Real money trading - trades will execute on your exchange'}
                </div>
              </div>

              {/* Bot Configuration */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <div className="text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wide mb-2">Configuration</div>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-600 dark:text-gray-400">Bot Name:</span>
                      <span className="font-medium text-gray-900 dark:text-white">{pendingBotConfig.botName}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600 dark:text-gray-400">Symbol:</span>
                      <span className="font-medium text-gray-900 dark:text-white">{pendingBotConfig.pair}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600 dark:text-gray-400">Exchange:</span>
                      <span className="font-medium text-gray-900 dark:text-white truncate ml-2 max-w-[60%]">{pendingBotConfig.exchange}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600 dark:text-gray-400">Bot Type:</span>
                      <span className="font-medium text-gray-900 dark:text-white capitalize">
                        {pendingBotConfig.botType === 'single' ? 'Single-pair' : 'Multi-pair'}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600 dark:text-gray-400">Base Order:</span>
                      <span className="font-medium text-gray-900 dark:text-white">
                        {pendingBotConfig.baseOrderSize} {pendingBotConfig.baseOrderCurrency}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600 dark:text-gray-400">Order Type:</span>
                      <span className="font-medium text-gray-900 dark:text-white capitalize">{pendingBotConfig.startOrderType}</span>
                    </div>
                  </div>
                </div>

                <div>
                  <div className="text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wide mb-2">Settings</div>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-600 dark:text-gray-400">Start Mode:</span>
                      <span className="font-medium text-gray-900 dark:text-white">
                        {pendingBotConfig.tradeStartCondition ? '⏳ Wait for Signal' : '⚡ Immediate'}
                      </span>
                    </div>
                    {pendingBotConfig.tradeStartCondition && pendingBotConfig.conditionConfig && (
                      <div className="flex justify-between">
                        <span className="text-gray-600 dark:text-gray-400">Entry Conditions:</span>
                        <span className="font-medium text-gray-900 dark:text-white">
                          {pendingBotConfig.conditionConfig.mode === 'playbook' 
                            ? `Playbook (${pendingBotConfig.conditionConfig.conditions?.length || 0} conditions)`
                            : pendingBotConfig.conditionConfig.conditionType === 'RSI Conditions' && pendingBotConfig.conditionConfig.condition
                            ? `RSI(${pendingBotConfig.conditionConfig.condition.period || 14}) ${pendingBotConfig.conditionConfig.condition.operator?.replace('_', ' ') || ''} ${pendingBotConfig.conditionConfig.condition.value || ''}`
                            : pendingBotConfig.conditionConfig.conditionType || 'Simple'}
                        </span>
                      </div>
                    )}
                    <div className="flex justify-between">
                      <span className="text-gray-600 dark:text-gray-400">DCA Trigger:</span>
                      <span className="font-medium text-gray-900 dark:text-white capitalize">
                        {pendingBotConfig.dcaRules.ruleType === 'down_from_last_entry' ? 'Down from Last Entry' :
                         pendingBotConfig.dcaRules.ruleType === 'down_from_average' ? 'Down from Average' :
                         pendingBotConfig.dcaRules.ruleType === 'loss_by_percent' ? 'Loss by %' :
                         pendingBotConfig.dcaRules.ruleType === 'loss_by_amount' ? 'Loss by Amount' :
                         'Custom'}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600 dark:text-gray-400">Max DCA/Position:</span>
                      <span className="font-medium text-gray-900 dark:text-white">{pendingBotConfig.dcaRules.maxDcaPerPosition}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Phase 1 Features */}
              <div className="bg-gray-50 dark:bg-gray-900/50 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
                <div className="text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wide mb-3">Advanced Features</div>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div className="flex items-center justify-between">
                    <span className="text-gray-600 dark:text-gray-400">Market Regime:</span>
                    <span className={`font-medium ${
                      pendingBotConfig.phase1Features.marketRegime 
                        ? 'text-green-600 dark:text-green-400' 
                        : 'text-gray-400 dark:text-gray-500'
                    }`}>
                      {pendingBotConfig.phase1Features.marketRegime ? '✅ Enabled' : '❌ Disabled'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-gray-600 dark:text-gray-400">Dynamic Scaling:</span>
                    <span className={`font-medium ${
                      pendingBotConfig.phase1Features.dynamicScaling 
                        ? 'text-green-600 dark:text-green-400' 
                        : 'text-gray-400 dark:text-gray-500'
                    }`}>
                      {pendingBotConfig.phase1Features.dynamicScaling ? '✅ Enabled' : '❌ Disabled'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-gray-600 dark:text-gray-400">Profit Strategy:</span>
                    <span className={`font-medium ${
                      pendingBotConfig.phase1Features.profitStrategy 
                        ? 'text-green-600 dark:text-green-400' 
                        : 'text-gray-400 dark:text-gray-500'
                    }`}>
                      {pendingBotConfig.phase1Features.profitStrategy ? '✅ Enabled' : '❌ Disabled'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-gray-600 dark:text-gray-400">Emergency Brake:</span>
                    <span className={`font-medium ${
                      pendingBotConfig.phase1Features.emergencyBrake 
                        ? 'text-green-600 dark:text-green-400' 
                        : 'text-gray-400 dark:text-gray-500'
                    }`}>
                      {pendingBotConfig.phase1Features.emergencyBrake ? '✅ Enabled' : '❌ Disabled'}
                    </span>
                  </div>
                </div>
              </div>

              {pendingBotConfig.tradingMode === 'live' && (
                <div className="bg-red-50 dark:bg-red-900/20 rounded-lg p-3 border border-red-200 dark:border-red-800">
                  <div className="flex items-start gap-2">
                    <AlertTriangle className="h-5 w-5 text-red-600 dark:text-red-400 mt-0.5 flex-shrink-0" />
                    <div className="text-sm text-red-800 dark:text-red-300">
                      <strong>Live Trading Warning:</strong> This bot will trade with real money. Make sure you've reviewed all settings and are ready to start trading.
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          <DialogFooter className="flex gap-3 sm:justify-end mt-4">
            <button
              onClick={() => setShowBotSummaryModal(false)}
              className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleConfirmBotCreation}
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors shadow-sm"
            >
              Create & Start Bot
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
}