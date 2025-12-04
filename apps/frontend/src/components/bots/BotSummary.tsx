import React from 'react';
import {
  Bot,
  Target,
  Layers,
  Sparkles,
  CheckCircle,
  XCircle,
  AlertTriangle,
  DollarSign,
  TrendingUp,
  BarChart3,
  Gauge,
  LineChart,
  AlertCircle,
} from 'lucide-react';
import { useThemeStore } from '../../store/theme';
import type { BotConfigurationData } from './BotConfiguration';
import type { EntryConditionsData } from './EntryConditions';
import type { DCASettingsData } from './DCASettings';
import type { AdvancedFeaturesData } from './AdvancedFeatures';

interface BotSummaryProps {
  botConfig: BotConfigurationData;
  entryConditions: EntryConditionsData;
  dcaSettings: DCASettingsData;
  advancedFeatures: AdvancedFeaturesData;
  baseOrderSize: number;
  isDark: boolean;
}

export default function BotSummary({
  botConfig,
  entryConditions,
  dcaSettings,
  advancedFeatures,
  baseOrderSize,
  isDark,
}: BotSummaryProps) {
  // Calculate total capital required
  const numberOfPairs = botConfig.pairs.length;
  const totalCapitalRequired = botConfig.pairMode === 'multi' && numberOfPairs > 1
    ? baseOrderSize * numberOfPairs
    : baseOrderSize;

  // Count enabled entry conditions
  const enabledConditions = entryConditions?.conditions?.filter(c => c.enabled) || [];
  const conditionCount = enabledConditions.length;

  // Calculate max DCA investment
  const maxDcaPerPosition = dcaSettings.maxDcaPerPosition || 0;
  const dcaAmount = dcaSettings.fixedAmount || dcaSettings.percentageAmount || dcaSettings.multiplierAmount || 0;
  const maxInvestmentPerPosition = baseOrderSize + (maxDcaPerPosition * dcaAmount);
  const maxTotalInvestment = maxInvestmentPerPosition * numberOfPairs;

  // Check if profit taking is enabled (required)
  const profitTakingEnabled = advancedFeatures.enableProfitTaking;
  const profitTakingWarning = !profitTakingEnabled;

  // Count active advanced features
  const activeAdvancedFeatures = [
    advancedFeatures.enableMarketRegime,
    advancedFeatures.enableDynamicScaling,
    advancedFeatures.enableProfitTaking,
    advancedFeatures.enableEmergencyBrake,
  ].filter(Boolean).length;

  return (
    <div className="space-y-4">
      {/* Bot Configuration Summary */}
      <div className={`rounded-lg border p-4 ${isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
        <div className="flex items-center gap-2 mb-3">
          <Bot className={`w-5 h-5 ${isDark ? 'text-blue-400' : 'text-blue-600'}`} />
          <h3 className={`font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>
            Bot Configuration
          </h3>
        </div>
        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className={isDark ? 'text-gray-400' : 'text-gray-600'}>Name:</span>
            <span className={`font-medium ${isDark ? 'text-white' : 'text-gray-900'}`}>
              {botConfig.botName || 'Unnamed Bot'}
            </span>
          </div>
          <div className="flex justify-between">
            <span className={isDark ? 'text-gray-400' : 'text-gray-600'}>Exchange:</span>
            <span className={`font-medium ${isDark ? 'text-white' : 'text-gray-900'}`}>
              {botConfig.exchange || 'Not set'}
            </span>
          </div>
          <div className="flex justify-between">
            <span className={isDark ? 'text-gray-400' : 'text-gray-600'}>Market:</span>
            <span className={`font-medium ${isDark ? 'text-white' : 'text-gray-900'}`}>
              {botConfig.market || 'spot'}
            </span>
          </div>
          <div className="flex justify-between">
            <span className={isDark ? 'text-gray-400' : 'text-gray-600'}>Direction:</span>
            <span className={`font-medium ${isDark ? 'text-white' : 'text-gray-900'}`}>
              {botConfig.direction || 'long'}
            </span>
          </div>
          <div className="flex justify-between">
            <span className={isDark ? 'text-gray-400' : 'text-gray-600'}>Pair Mode:</span>
            <span className={`font-medium ${isDark ? 'text-white' : 'text-gray-900'}`}>
              {botConfig.pairMode === 'multi' ? 'Multiple Pairs' : 'Single Pair'}
            </span>
          </div>
          <div className="flex justify-between">
            <span className={isDark ? 'text-gray-400' : 'text-gray-600'}>Trading Pairs:</span>
            <span className={`font-medium ${isDark ? 'text-white' : 'text-gray-900'}`}>
              {numberOfPairs} {numberOfPairs === 1 ? 'pair' : 'pairs'}
            </span>
          </div>
          {botConfig.pairs.length > 0 && (
            <div className="mt-2 pt-2 border-t border-gray-200 dark:border-gray-700">
              <div className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-600'} mb-1`}>Pairs:</div>
              <div className="flex flex-wrap gap-1">
                {botConfig.pairs.slice(0, 5).map((pair, idx) => (
                  <span
                    key={idx}
                    className={`text-xs px-2 py-0.5 rounded ${isDark ? 'bg-gray-700 text-gray-300' : 'bg-gray-100 text-gray-700'}`}
                  >
                    {pair}
                  </span>
                ))}
                {botConfig.pairs.length > 5 && (
                  <span className={`text-xs px-2 py-0.5 rounded ${isDark ? 'bg-gray-700 text-gray-300' : 'bg-gray-100 text-gray-700'}`}>
                    +{botConfig.pairs.length - 5} more
                  </span>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Entry Conditions Summary */}
      <div className={`rounded-lg border p-4 ${isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
        <div className="flex items-center gap-2 mb-3">
          <Target className={`w-5 h-5 ${isDark ? 'text-green-400' : 'text-green-600'}`} />
          <h3 className={`font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>
            Entry Conditions
          </h3>
        </div>
        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className={isDark ? 'text-gray-400' : 'text-gray-600'}>Conditions:</span>
            <span className={`font-medium ${isDark ? 'text-white' : 'text-gray-900'}`}>
              {conditionCount} {conditionCount === 1 ? 'condition' : 'conditions'}
            </span>
          </div>
          <div className="flex justify-between">
            <span className={isDark ? 'text-gray-400' : 'text-gray-600'}>Logic:</span>
            <span className={`font-medium ${isDark ? 'text-white' : 'text-gray-900'}`}>
              {entryConditions?.gateLogic || 'AND'}
            </span>
          </div>
          {conditionCount === 0 && (
            <div className={`text-xs mt-2 p-2 rounded ${isDark ? 'bg-yellow-900/20 text-yellow-400' : 'bg-yellow-50 text-yellow-800'}`}>
              ⚠️ No entry conditions configured
            </div>
          )}
        </div>
      </div>

      {/* DCA Settings Summary */}
      <div className={`rounded-lg border p-4 ${isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
        <div className="flex items-center gap-2 mb-3">
          <Layers className={`w-5 h-5 ${isDark ? 'text-purple-400' : 'text-purple-600'}`} />
          <h3 className={`font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>
            DCA Settings
          </h3>
        </div>
        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className={isDark ? 'text-gray-400' : 'text-gray-600'}>Base Order:</span>
            <span className={`font-medium ${isDark ? 'text-white' : 'text-gray-900'}`}>
              ${baseOrderSize.toFixed(2)} USDT
            </span>
          </div>
          <div className="flex justify-between">
            <span className={isDark ? 'text-gray-400' : 'text-gray-600'}>DCA Rule:</span>
            <span className={`font-medium ${isDark ? 'text-white' : 'text-gray-900'}`}>
              {dcaSettings.ruleType === 'down_from_last_entry' ? 'Down from Last Entry' :
               dcaSettings.ruleType === 'down_from_average' ? 'Down from Average' :
               dcaSettings.ruleType === 'loss_by_percent' ? 'Loss by %' :
               dcaSettings.ruleType === 'loss_by_amount' ? 'Loss by Amount' :
               dcaSettings.ruleType === 'levels' ? 'Custom Levels' :
               dcaSettings.ruleType === 'custom' ? 'Custom' : 'Not set'}
            </span>
          </div>
          <div className="flex justify-between">
            <span className={isDark ? 'text-gray-400' : 'text-gray-600'}>Max DCA per Position:</span>
            <span className={`font-medium ${isDark ? 'text-white' : 'text-gray-900'}`}>
              {maxDcaPerPosition}
            </span>
          </div>
          <div className="flex justify-between">
            <span className={isDark ? 'text-gray-400' : 'text-gray-600'}>Max Total DCAs:</span>
            <span className={`font-medium ${isDark ? 'text-white' : 'text-gray-900'}`}>
              {dcaSettings.maxDcaAcrossAllPositions || 'Unlimited'}
            </span>
          </div>
        </div>
      </div>

      {/* Advanced Features Summary */}
      <div className={`rounded-lg border p-4 ${isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
        <div className="flex items-center gap-2 mb-3">
          <Sparkles className={`w-5 h-5 ${isDark ? 'text-yellow-400' : 'text-yellow-600'}`} />
          <h3 className={`font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>
            Advanced Features
          </h3>
        </div>
        <div className="space-y-2 text-sm">
          <div className="flex items-center justify-between">
            <span className={isDark ? 'text-gray-400' : 'text-gray-600'}>Market Regime:</span>
            {advancedFeatures.enableMarketRegime ? (
              <CheckCircle className="w-4 h-4 text-green-500" />
            ) : (
              <XCircle className="w-4 h-4 text-gray-400" />
            )}
          </div>
          <div className="flex items-center justify-between">
            <span className={isDark ? 'text-gray-400' : 'text-gray-600'}>Dynamic Scaling:</span>
            {advancedFeatures.enableDynamicScaling ? (
              <CheckCircle className="w-4 h-4 text-green-500" />
            ) : (
              <XCircle className="w-4 h-4 text-gray-400" />
            )}
          </div>
          <div className="flex items-center justify-between">
            <span className={isDark ? 'text-gray-400' : 'text-gray-600'}>Profit Taking:</span>
            {advancedFeatures.enableProfitTaking ? (
              <CheckCircle className="w-4 h-4 text-green-500" />
            ) : (
              <div className="flex items-center gap-1">
                <XCircle className="w-4 h-4 text-red-500" />
                <span className="text-xs text-red-500">Required</span>
              </div>
            )}
          </div>
          <div className="flex items-center justify-between">
            <span className={isDark ? 'text-gray-400' : 'text-gray-600'}>Emergency Brake:</span>
            {advancedFeatures.enableEmergencyBrake ? (
              <CheckCircle className="w-4 h-4 text-green-500" />
            ) : (
              <XCircle className="w-4 h-4 text-gray-400" />
            )}
          </div>
          {profitTakingWarning && (
            <div className={`text-xs mt-2 p-2 rounded ${isDark ? 'bg-red-900/20 text-red-400' : 'bg-red-50 text-red-800'}`}>
              ⚠️ Profit Taking Strategy is required
            </div>
          )}
        </div>
      </div>

      {/* Capital Requirements */}
      <div className={`rounded-lg border p-4 ${isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
        <div className="flex items-center gap-2 mb-3">
          <DollarSign className={`w-5 h-5 ${isDark ? 'text-emerald-400' : 'text-emerald-600'}`} />
          <h3 className={`font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>
            Capital Requirements
          </h3>
        </div>
        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className={isDark ? 'text-gray-400' : 'text-gray-600'}>Base Order per Pair:</span>
            <span className={`font-medium ${isDark ? 'text-white' : 'text-gray-900'}`}>
              ${baseOrderSize.toFixed(2)} USDT
            </span>
          </div>
          {botConfig.pairMode === 'multi' && numberOfPairs > 1 && (
            <div className="flex justify-between">
              <span className={isDark ? 'text-gray-400' : 'text-gray-600'}>Total Capital Required:</span>
              <span className={`font-semibold text-lg ${isDark ? 'text-emerald-400' : 'text-emerald-600'}`}>
                ${totalCapitalRequired.toFixed(2)} USDT
              </span>
            </div>
          )}
          <div className="flex justify-between">
            <span className={isDark ? 'text-gray-400' : 'text-gray-600'}>Max Investment per Position:</span>
            <span className={`font-medium ${isDark ? 'text-white' : 'text-gray-900'}`}>
              ${maxInvestmentPerPosition.toFixed(2)} USDT
            </span>
          </div>
          {botConfig.pairMode === 'multi' && numberOfPairs > 1 && (
            <div className="flex justify-between">
              <span className={isDark ? 'text-gray-400' : 'text-gray-600'}>Max Total Investment:</span>
              <span className={`font-semibold ${isDark ? 'text-orange-400' : 'text-orange-600'}`}>
                ${maxTotalInvestment.toFixed(2)} USDT
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Validation Warnings */}
      {(conditionCount === 0 || profitTakingWarning || !botConfig.exchange || botConfig.pairs.length === 0) && (
        <div className={`rounded-lg border p-4 ${isDark ? 'bg-orange-900/20 border-orange-800' : 'bg-orange-50 border-orange-200'}`}>
          <div className="flex items-start gap-2">
            <AlertTriangle className={`w-5 h-5 ${isDark ? 'text-orange-400' : 'text-orange-600'} mt-0.5 flex-shrink-0`} />
            <div className="flex-1">
              <h4 className={`font-semibold mb-2 ${isDark ? 'text-orange-300' : 'text-orange-800'}`}>
                Configuration Issues
              </h4>
              <ul className={`text-xs space-y-1 ${isDark ? 'text-orange-400' : 'text-orange-700'}`}>
                {!botConfig.exchange && (
                  <li>• Exchange is not selected</li>
                )}
                {botConfig.pairs.length === 0 && (
                  <li>• No trading pairs selected</li>
                )}
                {conditionCount === 0 && (
                  <li>• No entry conditions configured</li>
                )}
                {profitTakingWarning && (
                  <li>• Profit Taking Strategy is required</li>
                )}
              </ul>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

