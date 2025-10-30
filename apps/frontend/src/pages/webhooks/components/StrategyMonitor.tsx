import React from 'react';
import { Activity } from 'lucide-react';

export default function StrategyMonitor() {
  return (
    <div className="h-full flex items-center justify-center">
      <div className="text-center">
        <div className="mx-auto w-24 h-24 bg-emerald-500/20 border border-emerald-500/50 rounded-full flex items-center justify-center mb-4">
          <Activity className="w-12 h-12 text-emerald-400" />
        </div>
        <h3 className="text-xl font-semibold text-white mb-2">Live Monitor</h3>
        <p className="text-gray-300 mb-6 max-w-md mx-auto">
          Monitor your strategy in real-time, view execution logs, and track performance metrics.
        </p>
        <p className="text-gray-400 text-sm">Coming soon...</p>
      </div>
    </div>
  );
}

