import React, { useMemo } from 'react';
import AlertsSection from './AlertsSection';
import OrchestrationSection from './OrchestrationSection';
import GateSection from './GateSection';
import PlaybookPreview from './PlaybookPreview';
import { useWebhookStrategyStore } from '../../../state/useWebhookStrategyStore';

interface StrategyRulesProps {
  strategyId: string;
}

export default function StrategyRules({ strategyId }: StrategyRulesProps) {
  const { strategies } = useWebhookStrategyStore();
  const strategy = strategies.find(s => s.id === strategyId);
  
  const playbook = useMemo(() => {
    if (!strategy) return null;
    return strategy.draft;
  }, [strategy]);

  if (!strategy) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-400">No strategy selected</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Alerts Section */}
      <AlertsSection strategyId={strategyId} />

      {/* Divider */}
      <div className="border-t border-gray-700/50"></div>

      {/* Orchestration Section */}
      <OrchestrationSection strategyId={strategyId} />

      {/* Divider */}
      <div className="border-t border-gray-700/50"></div>

      {/* Gate Section */}
      <GateSection strategyId={strategyId} />

      {/* Divider */}
      <div className="border-t border-gray-700/50"></div>

      {/* Preview */}
      {playbook && <PlaybookPreview playbook={playbook} />}
    </div>
  );
}
