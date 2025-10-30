import React from 'react';
import { Label } from '../../../components/ui/label';
import { Input } from '../../../components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../../components/ui/select';
import { useWebhookStrategyStore, FireMode } from '../../../state/useWebhookStrategyStore';

interface GateSectionProps {
  strategyId: string;
}

const decisionModes: { value: FireMode; label: string; description: string }[] = [
  { value: 'per_bar', label: 'Per Bar', description: 'Decide on each bar' },
  { value: 'per_close', label: 'Per Bar Close', description: 'Decide on bar close' },
  { value: 'per_tick', label: 'Per Tick', description: 'Decide on each tick (high latency)' },
];

export default function GateSection({ strategyId }: GateSectionProps) {
  const { strategies, setGate } = useWebhookStrategyStore();
  const strategy = strategies.find(s => s.id === strategyId);
  
  const gate = strategy?.draft.gate || {
    decisionTiming: 'per_close',
    rearmCooldownBars: 0,
    maxEntriesPerDay: 0,
  };

  const handleChange = (field: string, value: any) => {
    setGate(strategyId, { [field]: value });
  };

  const handleTradingWindowChange = (field: 'start' | 'end', value: string) => {
    setGate(strategyId, {
      tradingWindow: {
        ...gate.tradingWindow,
        [field]: value,
      },
    });
  };

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-lg font-semibold text-white">Gate Settings</h3>
        <p className="text-sm text-gray-400">Control decision timing and limits</p>
      </div>

      <div className="p-4 bg-white/5 rounded-lg border border-gray-700/50 space-y-4">
        {/* Decision Timing */}
        <div className="space-y-2">
          <Label className="text-gray-300">Decision Timing</Label>
          <Select
            value={gate.decisionTiming}
            onValueChange={(value) => handleChange('decisionTiming', value as FireMode)}
          >
            <SelectTrigger className="bg-white/5 border-gray-600 text-white">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-gray-800 border-gray-600">
              {decisionModes.map((mode) => (
                <SelectItem key={mode.value} value={mode.value} className="text-white hover:bg-gray-700">
                  <div>
                    <div className="font-medium">{mode.label}</div>
                    <div className="text-xs text-gray-400">{mode.description}</div>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {gate.decisionTiming === 'per_tick' && (
            <p className="text-xs text-yellow-400 mt-1">
              ⚠️ Per-tick mode requires high-performance runner support
            </p>
          )}
        </div>

        {/* Rearm Cooldown */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label htmlFor="cooldown" className="text-gray-300">Global Re-arm Cooldown</Label>
            <span className="text-xs text-gray-500">Bars after entry</span>
          </div>
          <Input
            id="cooldown"
            type="number"
            value={gate.rearmCooldownBars}
            onChange={(e) => handleChange('rearmCooldownBars', parseInt(e.target.value) || 0)}
            className="bg-white/5 border-gray-600 text-white"
          />
          <p className="text-xs text-gray-400">
            Strategy won&apos;t trigger again for this many bars after a successful entry
          </p>
        </div>

        {/* Max Entries */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label htmlFor="maxEntries" className="text-gray-300">Max Entries Per Day</Label>
            <span className="text-xs text-gray-500">0 = unlimited</span>
          </div>
          <Input
            id="maxEntries"
            type="number"
            value={gate.maxEntriesPerDay}
            onChange={(e) => handleChange('maxEntriesPerDay', parseInt(e.target.value) || 0)}
            className="bg-white/5 border-gray-600 text-white"
          />
          <p className="text-xs text-gray-400">Daily entry quota limit</p>
        </div>

        {/* Trading Window (Optional) */}
        <div className="space-y-2">
          <Label className="text-gray-300">Trading Window (Optional)</Label>
          <div className="flex items-center gap-2">
            <Input
              type="time"
              value={gate.tradingWindow?.start || '09:30'}
              onChange={(e) => handleTradingWindowChange('start', e.target.value)}
              className="bg-white/5 border-gray-600 text-white"
            />
            <span className="text-gray-400">to</span>
            <Input
              type="time"
              value={gate.tradingWindow?.end || '16:00'}
              onChange={(e) => handleTradingWindowChange('end', e.target.value)}
              className="bg-white/5 border-gray-600 text-white"
            />
          </div>
          <p className="text-xs text-gray-400">
            Only trigger within this time range (local timezone)
          </p>
        </div>
      </div>
    </div>
  );
}

