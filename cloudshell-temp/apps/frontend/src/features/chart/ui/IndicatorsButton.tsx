import React, { useState } from 'react';
import { BarChart3, X, Settings } from 'lucide-react';
import { useChartStore } from '../state/chartState';
import type { RSISettings } from '../state/indicatorRegistry';

interface IndicatorsButtonProps {
  theme: 'dark' | 'light';
  className?: string;
}

const IndicatorsButton: React.FC<IndicatorsButtonProps> = ({ theme, className = '' }) => {
  const [showModal, setShowModal] = useState(false);
  const [showRSISettings, setShowRSISettings] = useState(false);
  
  const {
    activeIndicators,
    addIndicator,
    removeIndicator,
    updateIndicatorSettings,
    getRSISettings,
  } = useChartStore();

  const themeClasses = {
    modal: theme === 'dark' ? 'bg-gray-900 text-white' : 'bg-white text-gray-900',
    header: theme === 'dark' ? 'bg-gray-800 border-gray-700' : 'bg-gray-100 border-gray-300',
    input: theme === 'dark' 
      ? 'bg-gray-700 border-gray-600 text-white focus:ring-blue-500' 
      : 'bg-white border-gray-300 text-gray-900 focus:ring-blue-500',
    select: theme === 'dark' 
      ? 'bg-gray-700 border-gray-600 text-white focus:ring-blue-500' 
      : 'bg-white border-gray-300 text-gray-900 focus:ring-blue-500',
    button: theme === 'dark' 
      ? 'bg-gray-700 hover:bg-gray-600 border-gray-600 text-white' 
      : 'bg-gray-200 hover:bg-gray-300 border-gray-300 text-gray-900',
    card: theme === 'dark' 
      ? 'border-gray-600 hover:bg-gray-800' 
      : 'border-gray-300 hover:bg-gray-50',
    activeCard: theme === 'dark' 
      ? 'border-purple-500 bg-purple-900 bg-opacity-20' 
      : 'border-purple-500 bg-purple-50',
  };

  const handleRSIToggle = () => {
    if (activeIndicators.includes('RSI')) {
      removeIndicator('RSI');
    } else {
      setShowRSISettings(true);
    }
  };

  const handleRSISettingsSubmit = (settings: RSISettings) => {
    if (activeIndicators.includes('RSI')) {
      updateIndicatorSettings('RSI', settings);
    } else {
      addIndicator('RSI', settings);
    }
    setShowRSISettings(false);
    setShowModal(false);
  };

  return (
    <>
      <button
        onClick={() => setShowModal(true)}
        className={`
          flex items-center space-x-2 px-3 py-1.5 rounded-lg text-sm font-medium 
          transition-colors duration-200 border
          ${theme === 'dark' 
            ? 'bg-gray-700 hover:bg-gray-600 border-gray-600 text-white' 
            : 'bg-gray-200 hover:bg-gray-300 border-gray-300 text-gray-900'
          }
          ${className}
        `}
      >
        <BarChart3 className="w-4 h-4" />
        <span>Indicators</span>
        {activeIndicators.length > 0 && (
          <span className="bg-purple-600 text-white text-xs rounded-full px-1.5 py-0.5 min-w-[18px] text-center">
            {activeIndicators.length}
          </span>
        )}
      </button>

      {/* Indicators Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className={`${themeClasses.modal} rounded-lg shadow-xl max-w-md w-full mx-4`}>
            {/* Header */}
            <div className={`${themeClasses.header} border-b px-6 py-4 flex items-center justify-between`}>
              <h2 className="text-lg font-semibold">Technical Indicators</h2>
              <button
                onClick={() => setShowModal(false)}
                className="p-1 rounded hover:bg-opacity-20 hover:bg-gray-500 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Content */}
            <div className="p-6">
              <div className="space-y-4">
                {/* Search Bar */}
                <div className="relative">
                  <input
                    type="text"
                    placeholder="Search indicators..."
                    className={`${themeClasses.input} w-full px-3 py-2 rounded-lg focus:outline-none focus:ring-2`}
                  />
                </div>

                {/* RSI Indicator */}
                <div className="space-y-2">
                  <h3 className={`text-sm font-medium ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                    Momentum Indicators
                  </h3>
                  
                  <div className={`flex items-center justify-between p-3 rounded-lg border ${
                    activeIndicators.includes('RSI') ? themeClasses.activeCard : themeClasses.card
                  } transition-colors cursor-pointer`}>
                    <div className="flex items-center space-x-3">
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                        activeIndicators.includes('RSI') ? 'bg-purple-600' : 'bg-purple-500'
                      }`}>
                        <BarChart3 className="w-4 h-4 text-white" />
                      </div>
                      <div>
                        <div className="flex items-center space-x-2">
                          <span className="font-medium">RSI</span>
                          {activeIndicators.includes('RSI') && (
                            <span className="px-2 py-0.5 bg-green-500 text-white text-xs rounded-full">
                              Active
                            </span>
                          )}
                          {activeIndicators.includes('RSI') && getRSISettings().mode === 'extended' && (
                            <span className="px-2 py-0.5 bg-orange-500 text-white text-xs rounded-full">
                              Extended
                            </span>
                          )}
                        </div>
                        <div className={`text-xs ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                          Relative Strength Index - momentum oscillator
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      {activeIndicators.includes('RSI') && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setShowRSISettings(true);
                          }}
                          className="px-2 py-1 bg-gray-600 text-white text-xs rounded hover:bg-gray-700 transition-colors"
                        >
                          <Settings className="w-3 h-3" />
                        </button>
                      )}
                      <button
                        onClick={handleRSIToggle}
                        className={`px-3 py-1 text-sm rounded transition-colors ${
                          activeIndicators.includes('RSI')
                            ? 'bg-red-600 text-white hover:bg-red-700'
                            : 'bg-purple-600 text-white hover:bg-purple-700'
                        }`}
                      >
                        {activeIndicators.includes('RSI') ? 'Remove' : 'Add'}
                      </button>
                    </div>
                  </div>
                </div>

                {/* Coming Soon */}
                <div className="mt-6">
                  <h3 className={`text-sm font-medium ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'} mb-2`}>
                    Coming Soon
                  </h3>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    {['Moving Average', 'MACD', 'Bollinger Bands', 'Stochastic'].map((indicator) => (
                      <div key={indicator} className={`p-2 rounded border-2 border-dashed ${
                        theme === 'dark' ? 'border-gray-700 text-gray-500' : 'border-gray-300 text-gray-400'
                      }`}>
                        {indicator}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className={`${themeClasses.header} border-t px-6 py-4 flex justify-end`}>
              <button
                onClick={() => setShowModal(false)}
                className={`px-4 py-2 ${themeClasses.button} border rounded-lg text-sm transition-colors`}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* RSI Settings Modal */}
      {showRSISettings && (
        <RSISettingsModal
          theme={theme}
          currentSettings={getRSISettings()}
          onSubmit={handleRSISettingsSubmit}
          onCancel={() => setShowRSISettings(false)}
        />
      )}
    </>
  );
};

// RSI Settings Modal Component
interface RSISettingsModalProps {
  theme: 'dark' | 'light';
  currentSettings: RSISettings;
  onSubmit: (settings: RSISettings) => void;
  onCancel: () => void;
}

const RSISettingsModal: React.FC<RSISettingsModalProps> = ({
  theme,
  currentSettings,
  onSubmit,
  onCancel,
}) => {
  const [settings, setSettings] = useState<RSISettings>(currentSettings);

  const themeClasses = {
    modal: theme === 'dark' ? 'bg-gray-900 text-white' : 'bg-white text-gray-900',
    header: theme === 'dark' ? 'bg-gray-800 border-gray-700' : 'bg-gray-100 border-gray-300',
    input: theme === 'dark' 
      ? 'bg-gray-700 border-gray-600 text-white focus:ring-purple-500' 
      : 'bg-white border-gray-300 text-gray-900 focus:ring-purple-500',
    select: theme === 'dark' 
      ? 'bg-gray-700 border-gray-600 text-white focus:ring-purple-500' 
      : 'bg-white border-gray-300 text-gray-900 focus:ring-purple-500',
    button: theme === 'dark' 
      ? 'bg-gray-700 hover:bg-gray-600 border-gray-600 text-white' 
      : 'bg-gray-200 hover:bg-gray-300 border-gray-300 text-gray-900',
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(settings);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className={`${themeClasses.modal} rounded-lg shadow-xl max-w-lg w-full mx-4`}>
        {/* Header */}
        <div className={`${themeClasses.header} border-b px-6 py-4 flex items-center justify-between`}>
          <h2 className="text-lg font-semibold">RSI Settings</h2>
          <button
            onClick={onCancel}
            className="p-1 rounded hover:bg-opacity-20 hover:bg-gray-500 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <form onSubmit={handleSubmit} className="p-6">
          <div className="space-y-4">
            {/* Length */}
            <div>
              <label className={`block text-sm font-medium mb-1 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                Length
              </label>
              <input
                type="number"
                value={settings.length}
                onChange={(e) => setSettings(prev => ({ ...prev, length: parseInt(e.target.value) || 14 }))}
                min="2"
                max="100"
                className={`${themeClasses.input} w-full px-3 py-2 rounded-lg focus:outline-none focus:ring-2`}
              />
            </div>

            {/* Source */}
            <div>
              <label className={`block text-sm font-medium mb-1 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                Source
              </label>
              <select
                value={settings.source}
                onChange={(e) => setSettings(prev => ({ ...prev, source: e.target.value as any }))}
                className={`${themeClasses.select} w-full px-3 py-2 rounded-lg focus:outline-none focus:ring-2`}
              >
                <option value="close">Close</option>
                <option value="open">Open</option>
                <option value="high">High</option>
                <option value="low">Low</option>
              </select>
            </div>

            {/* Mode */}
            <div>
              <label className={`block text-sm font-medium mb-2 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                Mode
              </label>
              <div className="flex space-x-1 bg-gray-200 dark:bg-gray-700 rounded-lg p-1">
                <button
                  type="button"
                  onClick={() => setSettings(prev => ({ ...prev, mode: 'classic' }))}
                  className={`flex-1 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                    settings.mode === 'classic'
                      ? 'bg-white dark:bg-gray-600 text-gray-900 dark:text-white shadow'
                      : 'text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white'
                  }`}
                >
                  Classic (0-100)
                </button>
                <button
                  type="button"
                  onClick={() => setSettings(prev => ({ ...prev, mode: 'extended' }))}
                  className={`flex-1 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                    settings.mode === 'extended'
                      ? 'bg-white dark:bg-gray-600 text-gray-900 dark:text-white shadow'
                      : 'text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white'
                  }`}
                >
                  Extended
                </button>
              </div>
              <p className={`text-xs mt-1 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                {settings.mode === 'classic' 
                  ? 'Standard RSI bounded between 0-100' 
                  : 'Extended RSI can exceed 100 in strong trends'
                }
              </p>
            </div>

            {/* RSI MA */}
            <div>
              <label className={`block text-sm font-medium mb-1 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                RSI Moving Average (Optional)
              </label>
              <input
                type="number"
                value={settings.ma || ''}
                onChange={(e) => setSettings(prev => ({ ...prev, ma: e.target.value ? parseInt(e.target.value) : null }))}
                min="2"
                max="50"
                placeholder="Leave empty to disable"
                className={`${themeClasses.input} w-full px-3 py-2 rounded-lg focus:outline-none focus:ring-2`}
              />
            </div>

            {/* Thresholds */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className={`block text-sm font-medium mb-1 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                  Overbought
                </label>
                <input
                  type="number"
                  value={settings.overbought}
                  onChange={(e) => setSettings(prev => ({ ...prev, overbought: parseInt(e.target.value) || 70 }))}
                  min="50"
                  max={settings.mode === 'classic' ? '100' : '200'}
                  className={`${themeClasses.input} w-full px-3 py-2 rounded-lg focus:outline-none focus:ring-2`}
                />
              </div>
              <div>
                <label className={`block text-sm font-medium mb-1 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                  Oversold
                </label>
                <input
                  type="number"
                  value={settings.oversold}
                  onChange={(e) => setSettings(prev => ({ ...prev, oversold: parseInt(e.target.value) || 30 }))}
                  min={settings.mode === 'classic' ? '0' : '-100'}
                  max="50"
                  className={`${themeClasses.input} w-full px-3 py-2 rounded-lg focus:outline-none focus:ring-2`}
                />
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="flex justify-end space-x-3 mt-6">
            <button
              type="button"
              onClick={onCancel}
              className={`px-4 py-2 ${themeClasses.button} border rounded-lg text-sm transition-colors`}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-purple-600 text-white rounded-lg text-sm hover:bg-purple-700 transition-colors"
            >
              Apply Settings
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default IndicatorsButton;
