import React from 'react';
import TradingConfiguration from '../components/TradingConfiguration';
import SetupMainEntryCondition from '../components/strategy/SetupMainEntryCondition';

const StrategyCreationV1: React.FC = () => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900">
      {/* Animated Background */}
      <div className="absolute inset-0">
        <div className="absolute inset-0 bg-gradient-to-r from-blue-500/10 via-purple-500/10 to-emerald-500/10 animate-pulse"></div>
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-blue-500/20 rounded-full blur-3xl animate-float"></div>
        <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-purple-500/20 rounded-full blur-3xl animate-float-delayed"></div>
      </div>

      {/* Header */}
      <div className="relative bg-white/5 backdrop-blur-sm border-b border-gray-700/50">
        <div className="px-4 sm:px-6 lg:px-8">
          <div className="py-2">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-bold text-white">Strategy Creation v1</h1>
                <p className="mt-1 text-xs text-gray-300">
                  Create and manage your trading strategies with advanced condition builders
                </p>
              </div>
              <div className="flex items-center space-x-3">
                <div className="bg-emerald-500/20 text-emerald-300 border border-emerald-500/50 px-2 py-1 rounded-full text-xs font-medium">
                  New Version
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="relative flex">
        {/* Left Content Area */}
        <div className="w-7/10 px-4 sm:px-6 lg:px-8 py-2" style={{width: '70%'}}>
          {/* Trading Configuration */}
          <div className="mb-4">
            <TradingConfiguration />
          </div>

          {/* Setup Main Entry Condition */}
          <div className="mb-6">
            <SetupMainEntryCondition />
          </div>

          {/* Strategy Builder Section */}
          <div className="bg-white/5 backdrop-blur-sm rounded-xl border border-gray-700/50 hover:border-blue-500/50 transition-all duration-300">
            <div className="p-6">
              <div className="text-center py-12">
                <div className="mx-auto w-24 h-24 bg-blue-500/20 border border-blue-500/50 rounded-full flex items-center justify-center mb-4">
                  <svg className="w-12 h-12 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                  </svg>
                </div>
                <h3 className="text-xl font-semibold text-white mb-2">Strategy Builder Coming Soon</h3>
                <p className="text-gray-300 mb-6 max-w-md mx-auto">
                  We're building an intuitive strategy creation interface that will allow you to define complex trading conditions with ease.
                </p>
                <div className="flex items-center justify-center space-x-4 text-sm text-gray-400">
                  <div className="flex items-center">
                    <div className="w-2 h-2 bg-blue-400 rounded-full mr-2"></div>
                    Visual Condition Builder
                  </div>
                  <div className="flex items-center">
                    <div className="w-2 h-2 bg-blue-400 rounded-full mr-2"></div>
                    Multi-Timeframe Analysis
                  </div>
                  <div className="flex items-center">
                    <div className="w-2 h-2 bg-blue-400 rounded-full mr-2"></div>
                    Real-time Testing
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Additional Sections Placeholder */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-8">
            <div className="bg-white/5 backdrop-blur-sm rounded-xl border border-gray-700/50 hover:border-emerald-500/50 transition-all duration-300 p-6">
              <div className="flex items-center mb-4">
                <div className="w-10 h-10 bg-emerald-500/20 border border-emerald-500/50 rounded-lg flex items-center justify-center mr-3">
                  <svg className="w-6 h-6 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                  </svg>
                </div>
                <h4 className="text-lg font-semibold text-white">Performance Analytics</h4>
              </div>
              <p className="text-gray-300 text-sm">Track your strategy performance with detailed analytics and insights.</p>
            </div>

            <div className="bg-white/5 backdrop-blur-sm rounded-xl border border-gray-700/50 hover:border-purple-500/50 transition-all duration-300 p-6">
              <div className="flex items-center mb-4">
                <div className="w-10 h-10 bg-purple-500/20 border border-purple-500/50 rounded-lg flex items-center justify-center mr-3">
                  <svg className="w-6 h-6 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                </div>
                <h4 className="text-lg font-semibold text-white">Backtesting Engine</h4>
              </div>
              <p className="text-gray-300 text-sm">Test your strategies against historical data to validate performance.</p>
            </div>
          </div>
        </div>

        {/* Right Empty Space */}
        <div className="bg-white/5 backdrop-blur-sm border-l border-gray-700/50" style={{width: '30%'}}></div>
      </div>
    </div>
  );
};

export default StrategyCreationV1;
