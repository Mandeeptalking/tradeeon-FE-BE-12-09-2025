import React, { useState } from 'react';
import StrategyList from './components/StrategyList';
import StrategyTabs from './components/StrategyTabs';
import StrategyRules from './components/StrategyRules';
import StrategyActions from './components/StrategyActions';
import StrategyMonitor from './components/StrategyMonitor';
import AddStrategyDialog from './components/AddStrategyDialog';
import { useWebhookStrategyStore } from '../../state/useWebhookStrategyStore';

export default function WebhookStrategiesPage() {
  const [activeTab, setActiveTab] = useState('rules');
  const [showAddDialog, setShowAddDialog] = useState(false);
  const { selectedStrategyId, strategies } = useWebhookStrategyStore();

  const selectedStrategy = strategies.find(s => s.id === selectedStrategyId);

  return (
    <div className="h-screen flex overflow-hidden bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900">
      {/* Left Sidebar - Strategy List */}
      <div className="w-80 flex-shrink-0">
        <StrategyList onAddStrategy={() => setShowAddDialog(true)} />
      </div>

      {/* Right Content Area */}
      <div className="flex-1 flex flex-col bg-white/5 backdrop-blur-sm">
        {/* Header */}
        <div className="p-4 border-b border-gray-700/50 bg-white/5 backdrop-blur-sm">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-xl font-semibold text-white">
                {selectedStrategy ? selectedStrategy.name : 'Webhook Strategies'}
              </h1>
              <p className="text-sm text-gray-400 mt-1">
                {selectedStrategy
                  ? `Configure rules, actions, and monitor your ${selectedStrategy.mode} strategy`
                  : 'Select a strategy to get started'}
              </p>
            </div>
          </div>
        </div>

        {/* Content Tabs */}
        <div className="flex-1 overflow-hidden">
          {selectedStrategy && selectedStrategyId ? (
            <StrategyTabs
              activeTab={activeTab}
              onTabChange={setActiveTab}
              rulesContent={<StrategyRules strategyId={selectedStrategyId} />}
              actionsContent={<StrategyActions />}
              monitorContent={<StrategyMonitor />}
            />
          ) : (
            <div className="h-full flex items-center justify-center">
              <div className="text-center">
                <div className="mx-auto w-24 h-24 bg-blue-500/20 border border-blue-500/50 rounded-full flex items-center justify-center mb-4">
                  <svg className="w-12 h-12 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                </div>
                <h3 className="text-xl font-semibold text-white mb-2">No Strategy Selected</h3>
                <p className="text-gray-300 mb-6 max-w-md mx-auto">
                  Select a strategy from the sidebar or create a new one to get started
                </p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Add Strategy Dialog */}
      <AddStrategyDialog open={showAddDialog} onOpenChange={setShowAddDialog} />
    </div>
  );
}
