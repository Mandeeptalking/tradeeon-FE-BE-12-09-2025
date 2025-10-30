import React, { useState } from 'react';
import { Button } from '../../../components/ui/button';
import { Input } from '../../../components/ui/input';
import { Label } from '../../../components/ui/label';
import { Switch } from '../../../components/ui/switch';
import { ChevronUp, ChevronDown, X } from 'lucide-react';
import { useWebhookStrategyStore, OrchestrationDef, Pattern } from '../../../state/useWebhookStrategyStore';

interface OrchestrationSectionProps {
  strategyId: string;
}

const patterns: { value: Pattern; label: string; description: string }[] = [
  { value: 'ALL', label: 'ALL', description: 'All alerts must fire' },
  { value: 'SEQUENCE', label: 'SEQUENCE', description: 'Alerts must fire in order' },
  { value: 'N_OF_M', label: 'N of M', description: 'N alerts from the group must fire' },
];

export default function OrchestrationSection({ strategyId }: OrchestrationSectionProps) {
  const { strategies, setOrchestration } = useWebhookStrategyStore();
  const strategy = strategies.find(s => s.id === strategyId);
  
  const alerts = strategy?.draft.alerts || [];
  const orchestration = strategy?.draft.orchestration || { pattern: 'ALL', alertIds: [], simultaneous: false };

  const [localNOfM, setLocalNOfM] = useState(
    orchestration.pattern === 'N_OF_M' ? orchestration.n : 2
  );
  const [localWindowBars, setLocalWindowBars] = useState(
    orchestration.pattern === 'N_OF_M' ? orchestration.sharedWindowBars : 10
  );

  const handlePatternChange = (pattern: Pattern) => {
    switch (pattern) {
      case 'ALL':
        setOrchestration(strategyId, {
          pattern: 'ALL',
          alertIds: alerts.map(a => a.id),
          simultaneous: false,
        });
        break;
      case 'SEQUENCE':
        setOrchestration(strategyId, {
          pattern: 'SEQUENCE',
          steps: alerts.slice(0, 3).map(alert => ({
            alertId: alert.id,
            windowBars: 10,
          })),
        });
        break;
      case 'N_OF_M':
        setOrchestration(strategyId, {
          pattern: 'N_OF_M',
          group: alerts.map(alert => ({ alertId: alert.id })),
          n: localNOfM,
          sharedWindowBars: localWindowBars,
        });
        break;
    }
  };

  const handleAllChange = (simultaneous: boolean) => {
    if (orchestration.pattern === 'ALL') {
      setOrchestration(strategyId, { ...orchestration, simultaneous });
    }
  };

  const handleSequenceStepChange = (index: number, field: 'alertId' | 'windowBars', value: any) => {
    if (orchestration.pattern === 'SEQUENCE') {
      const newSteps = [...orchestration.steps];
      newSteps[index] = { ...newSteps[index], [field]: value };
      setOrchestration(strategyId, { ...orchestration, steps: newSteps });
    }
  };

  const handleMoveStep = (index: number, direction: 'up' | 'down') => {
    if (orchestration.pattern === 'SEQUENCE') {
      const newSteps = [...orchestration.steps];
      const newIndex = direction === 'up' ? index - 1 : index + 1;
      if (newIndex >= 0 && newIndex < newSteps.length) {
        [newSteps[index], newSteps[newIndex]] = [newSteps[newIndex], newSteps[index]];
        setOrchestration(strategyId, { ...orchestration, steps: newSteps });
      }
    }
  };

  const handleRemoveStep = (index: number) => {
    if (orchestration.pattern === 'SEQUENCE') {
      const newSteps = orchestration.steps.filter((_, i) => i !== index);
      setOrchestration(strategyId, { ...orchestration, steps: newSteps });
    }
  };

  const handleAddStep = () => {
    if (orchestration.pattern === 'SEQUENCE') {
      const firstAvailableAlert = alerts.find(
        alert => !orchestration.steps.some(step => step.alertId === alert.id)
      );
      if (firstAvailableAlert) {
        setOrchestration(strategyId, {
          ...orchestration,
          steps: [
            ...orchestration.steps,
            { alertId: firstAvailableAlert.id, windowBars: 10 },
          ],
        });
      }
    }
  };

  const handleNOfMChange = (field: 'n' | 'sharedWindowBars', value: number) => {
    if (orchestration.pattern === 'N_OF_M') {
      const newValue = field === 'n' ? value : value;
      if (field === 'n') {
        setLocalNOfM(value);
        setOrchestration(strategyId, { ...orchestration, n: value });
      } else {
        setLocalWindowBars(value);
        setOrchestration(strategyId, { ...orchestration, sharedWindowBars: value });
      }
    }
  };

  if (alerts.length === 0) {
    return (
      <div className="space-y-4">
        <div>
          <h3 className="text-lg font-semibold text-white">Orchestration</h3>
          <p className="text-sm text-gray-400">Define how alerts should be combined</p>
        </div>
        <div className="text-center py-8 bg-white/5 rounded-lg border border-gray-700/50">
          <p className="text-gray-400">Add alerts first to configure orchestration</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-lg font-semibold text-white">Orchestration</h3>
        <p className="text-sm text-gray-400">Define how alerts should be combined</p>
      </div>

      {/* Pattern Selection */}
      <div className="flex gap-2">
        {patterns.map((pattern) => (
          <button
            key={pattern.value}
            onClick={() => handlePatternChange(pattern.value)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              orchestration.pattern === pattern.value
                ? 'bg-blue-500 text-white'
                : 'bg-white/5 text-gray-300 hover:bg-white/10'
            }`}
          >
            {pattern.label}
          </button>
        ))}
      </div>

      {/* Pattern-specific config */}
      <div className="p-4 bg-white/5 rounded-lg border border-gray-700/50">
        {orchestration.pattern === 'ALL' && (
          <div className="space-y-4">
            <div className="flex items-center space-x-2">
              <Switch
                checked={orchestration.simultaneous || false}
                onCheckedChange={handleAllChange}
              />
              <Label className="text-gray-300">
                Require simultaneity (same bar only)
              </Label>
            </div>
            <div className="flex flex-wrap gap-2">
              {alerts.map(alert => (
                <div
                  key={alert.id}
                  className="px-3 py-1 bg-blue-500/20 border border-blue-500/50 rounded-full text-sm text-blue-300"
                >
                  {alert.name}
                </div>
              ))}
            </div>
          </div>
        )}

        {orchestration.pattern === 'SEQUENCE' && (
          <div className="space-y-3">
            {orchestration.steps.map((step, index) => {
              const alert = alerts.find(a => a.id === step.alertId);
              return (
                <div
                  key={index}
                  className="flex items-center gap-2 p-3 bg-gray-800/30 rounded border border-gray-700/50"
                >
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleMoveStep(index, 'up')}
                    disabled={index === 0}
                    className="text-gray-400 hover:text-white"
                  >
                    <ChevronUp className="w-4 h-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleMoveStep(index, 'down')}
                    disabled={index === orchestration.steps.length - 1}
                    className="text-gray-400 hover:text-white"
                  >
                    <ChevronDown className="w-4 h-4" />
                  </Button>
                  <span className="text-sm text-gray-400">{index + 1}.</span>
                  <span className="text-sm text-white flex-1">{alert?.name || 'Unknown'}</span>
                  <div className="flex items-center gap-2">
                    <Label className="text-xs text-gray-400">within</Label>
                    <Input
                      type="number"
                      value={step.windowBars}
                      onChange={(e) =>
                        handleSequenceStepChange(index, 'windowBars', parseInt(e.target.value))
                      }
                      className="w-20 h-8 bg-white/5 border-gray-600 text-white text-sm"
                    />
                    <Label className="text-xs text-gray-400">bars</Label>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleRemoveStep(index)}
                    className="text-red-400 hover:text-red-300"
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              );
            })}
            <Button
              onClick={handleAddStep}
              variant="outline"
              size="sm"
              className="w-full border-gray-600 text-gray-300 hover:bg-white/10"
            >
              + Add Step
            </Button>
          </div>
        )}

        {orchestration.pattern === 'N_OF_M' && (
          <div className="space-y-4">
            <div className="flex items-center gap-4">
              <Label className="text-gray-300">Need</Label>
              <Input
                type="number"
                value={localNOfM}
                onChange={(e) => handleNOfMChange('n', parseInt(e.target.value))}
                className="w-20 bg-white/5 border-gray-600 text-white"
                min={1}
                max={alerts.length}
              />
              <Label className="text-gray-300">of {alerts.length} alerts</Label>
            </div>
            <div className="flex items-center gap-4">
              <Label className="text-gray-300">within</Label>
              <Input
                type="number"
                value={localWindowBars}
                onChange={(e) => handleNOfMChange('sharedWindowBars', parseInt(e.target.value))}
                className="w-20 bg-white/5 border-gray-600 text-white"
              />
              <Label className="text-gray-300">bars</Label>
            </div>
            <div className="flex flex-wrap gap-2">
              {alerts.map(alert => (
                <div
                  key={alert.id}
                  className="px-3 py-1 bg-purple-500/20 border border-purple-500/50 rounded-full text-sm text-purple-300"
                >
                  {alert.name}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

