import React from 'react';
import { Button } from '../../../components/ui/button';
import { Badge } from '../../../components/ui/badge';
import { Plus, Play, Pause, Trash2 } from 'lucide-react';
import { useWebhookStrategyStore } from '../../../state/useWebhookStrategyStore';

interface StrategyListProps {
  onAddStrategy: () => void;
}

export default function StrategyList({ onAddStrategy }: StrategyListProps) {
  const { strategies, selectedStrategyId, selectStrategy, deleteStrategy, updateStrategy } = useWebhookStrategyStore();

  const selectedStrategy = strategies.find(s => s.id === selectedStrategyId);

  const handleDelete = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (window.confirm('Are you sure you want to delete this strategy?')) {
      deleteStrategy(id);
    }
  };

  const handleToggleStatus = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const strategy = strategies.find(s => s.id === id);
    if (strategy) {
      updateStrategy(id, { status: strategy.status === 'active' ? 'paused' : 'active' });
    }
  };

  return (
    <div className="h-full flex flex-col bg-white/5 backdrop-blur-sm border-r border-gray-700/50">
      {/* Header */}
      <div className="p-4 border-b border-gray-700/50">
        <h2 className="text-lg font-semibold text-white mb-3">Strategies</h2>
        <Button
          onClick={onAddStrategy}
          className="w-full bg-blue-500 hover:bg-blue-600 text-white"
        >
          <Plus className="w-4 h-4 mr-2" />
          New Strategy
        </Button>
      </div>

      {/* Strategy List */}
      <div className="flex-1 overflow-y-auto p-2">
        {strategies.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-gray-400 text-sm">No strategies yet</p>
            <p className="text-gray-500 text-xs mt-2">Create your first strategy to get started</p>
          </div>
        ) : (
          <div className="space-y-2">
            {strategies.map((strategy) => (
              <div
                key={strategy.id}
                onClick={() => selectStrategy(strategy.id)}
                className={`p-3 rounded-lg cursor-pointer transition-all border ${
                  selectedStrategyId === strategy.id
                    ? 'bg-blue-500/20 border-blue-500/50'
                    : 'bg-white/5 border-gray-700/50 hover:bg-white/10'
                }`}
              >
                <div className="flex items-start justify-between mb-2">
                  <h3 className="text-sm font-medium text-white">{strategy.name}</h3>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={(e) => handleToggleStatus(strategy.id, e)}
                      className="p-1 rounded hover:bg-white/10 transition-colors"
                    >
                      {strategy.status === 'active' ? (
                        <Pause className="w-3 h-3 text-yellow-400" />
                      ) : (
                        <Play className="w-3 h-3 text-green-400" />
                      )}
                    </button>
                    <button
                      onClick={(e) => handleDelete(strategy.id, e)}
                      className="p-1 rounded hover:bg-red-500/20 transition-colors"
                    >
                      <Trash2 className="w-3 h-3 text-red-400" />
                    </button>
                  </div>
                </div>
                
                <div className="flex items-center gap-2 mb-2">
                  <Badge
                    variant="outline"
                    className={`text-xs ${
                      strategy.mode === 'live'
                        ? 'border-red-500/50 text-red-300'
                        : 'border-blue-500/50 text-blue-300'
                    }`}
                  >
                    {strategy.mode}
                  </Badge>
                  <Badge
                    variant="outline"
                    className={`text-xs ${
                      strategy.status === 'active'
                        ? 'border-green-500/50 text-green-300'
                        : 'border-yellow-500/50 text-yellow-300'
                    }`}
                  >
                    {strategy.status}
                  </Badge>
                </div>

                {strategy.lastTriggered && (
                  <p className="text-xs text-gray-400 mt-1">
                    Last: {new Date(strategy.lastTriggered).toLocaleDateString()}
                  </p>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

