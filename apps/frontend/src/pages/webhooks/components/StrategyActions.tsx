import React from 'react';
import { Zap } from 'lucide-react';

export default function StrategyActions() {
  return (
    <div className="h-full flex items-center justify-center">
      <div className="text-center">
        <div className="mx-auto w-24 h-24 bg-purple-500/20 border border-purple-500/50 rounded-full flex items-center justify-center mb-4">
          <Zap className="w-12 h-12 text-purple-400" />
        </div>
        <h3 className="text-xl font-semibold text-white mb-2">Strategy Actions</h3>
        <p className="text-gray-300 mb-6 max-w-md mx-auto">
          Configure what happens when your strategy rules are triggered.
        </p>
        <p className="text-gray-400 text-sm">Coming soon...</p>
      </div>
    </div>
  );
}

