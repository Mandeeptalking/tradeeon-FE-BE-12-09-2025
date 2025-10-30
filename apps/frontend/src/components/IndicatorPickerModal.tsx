import React, { useState } from 'react';
import { X, Plus, Settings, Eye, EyeOff, Trash2 } from 'lucide-react';
import { IndicatorType, IndicatorInstance, INDICATOR_CONFIGS, createIndicatorKey } from '@/indicators/registry';

interface IndicatorPickerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAddIndicator: (instance: IndicatorInstance) => void;
  activeIndicators: IndicatorInstance[];
  onRemoveIndicator: (key: string) => void;
  onToggleIndicator: (key: string) => void;
}

const IndicatorPickerModal: React.FC<IndicatorPickerModalProps> = ({
  isOpen,
  onClose,
  onAddIndicator,
  activeIndicators,
  onRemoveIndicator,
  onToggleIndicator,
}) => {
  const [selectedType, setSelectedType] = useState<IndicatorType | null>(null);
  const [params, setParams] = useState<Record<string, number | string>>({});
  const [showSettings, setShowSettings] = useState(false);

  if (!isOpen) return null;

  const handleTypeSelect = (type: IndicatorType) => {
    setSelectedType(type);
    const config = INDICATOR_CONFIGS[type];
    setParams({ ...config.defaultParams });
    setShowSettings(true);
  };

  const handleParamChange = (key: string, value: string | number) => {
    setParams(prev => ({
      ...prev,
      [key]: value,
    }));
  };

  const handleAddIndicator = () => {
    if (!selectedType) return;

    const instance: IndicatorInstance = {
      key: createIndicatorKey(selectedType, params),
      id: selectedType,
      params,
      pane: INDICATOR_CONFIGS[selectedType].pane === 'main' ? 'main' : 'new-sub',
    };

    onAddIndicator(instance);
    
    // Reset form
    setSelectedType(null);
    setParams({});
    setShowSettings(false);
  };

  const getIndicatorDisplayName = (instance: IndicatorInstance): string => {
    const config = INDICATOR_CONFIGS[instance.id];
    const paramValues = Object.values(instance.params).join(',');
    return `${config.name}(${paramValues})`;
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-4xl max-h-[80vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold text-gray-900">Add Indicators</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Available Indicators */}
          <div>
            <h3 className="text-lg font-medium text-gray-900 mb-4">Available Indicators</h3>
            <div className="space-y-3">
              {Object.entries(INDICATOR_CONFIGS).map(([type, config]) => (
                <button
                  key={type}
                  onClick={() => handleTypeSelect(type as IndicatorType)}
                  className="w-full p-4 border border-gray-200 rounded-lg hover:bg-gray-50 text-left"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-medium text-gray-900">{config.name}</div>
                      <div className="text-sm text-gray-500">{config.description}</div>
                      <div className="text-xs text-gray-400 mt-1">
                        {config.category === 'overlay' ? 'Overlay' : 'Oscillator'} • 
                        {config.outputs.join(', ')}
                      </div>
                    </div>
                    <Plus className="h-5 w-5 text-gray-400" />
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Settings Panel */}
          <div>
            <h3 className="text-lg font-medium text-gray-900 mb-4">Settings</h3>
            
            {selectedType && showSettings ? (
              <div className="space-y-4">
                <div className="p-4 bg-gray-50 rounded-lg">
                  <div className="font-medium text-gray-900 mb-2">
                    {INDICATOR_CONFIGS[selectedType].name}
                  </div>
                  <div className="text-sm text-gray-600">
                    {INDICATOR_CONFIGS[selectedType].description}
                  </div>
                </div>

                <div className="space-y-3">
                  {Object.entries(INDICATOR_CONFIGS[selectedType].defaultParams).map(([key, defaultValue]) => (
                    <div key={key}>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        {INDICATOR_CONFIGS[selectedType].paramLabels[key]}
                      </label>
                      {key === 'showMA' ? (
                        <select
                          value={params[key] || defaultValue}
                          onChange={(e) => handleParamChange(key, parseInt(e.target.value))}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                        >
                          <option value={0}>Hide</option>
                          <option value={1}>Show</option>
                        </select>
                      ) : (
                        <input
                          type="number"
                          value={params[key] || defaultValue}
                          onChange={(e) => handleParamChange(key, parseFloat(e.target.value) || defaultValue)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                          min="1"
                          max="200"
                        />
                      )}
                    </div>
                  ))}
                </div>

                <button
                  onClick={handleAddIndicator}
                  className="w-full px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 font-medium"
                >
                  Add {INDICATOR_CONFIGS[selectedType].name}
                </button>
              </div>
            ) : (
              <div className="text-center text-gray-500 py-8">
                Select an indicator to configure
              </div>
            )}
          </div>
        </div>

        {/* Active Indicators */}
        {activeIndicators.length > 0 && (
          <div className="mt-8 pt-6 border-t">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Active Indicators</h3>
            <div className="flex flex-wrap gap-2">
              {activeIndicators.map((indicator) => (
                <div
                  key={indicator.key}
                  className="flex items-center space-x-2 px-3 py-2 bg-gray-100 rounded-lg text-sm"
                >
                  <span className="text-gray-700">
                    {getIndicatorDisplayName(indicator)}
                  </span>
                  <button
                    onClick={() => onToggleIndicator(indicator.key)}
                    className="text-gray-500 hover:text-gray-700"
                    title="Toggle visibility"
                  >
                    <Eye className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => onRemoveIndicator(indicator.key)}
                    className="text-red-500 hover:text-red-700"
                    title="Remove indicator"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default IndicatorPickerModal;


