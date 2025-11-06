import React, { useState, useEffect } from 'react';
import { X, Settings, Trash2 } from 'lucide-react';
import { PaneId, IndicatorInst, getIndicatorMetadata } from '@/canvas/indicators';

interface IndicatorSettingsModalProps {
  isOpen: boolean;
  paneId: PaneId;
  indicators: IndicatorInst[];
  onClose: () => void;
  onUpdateIndicator: (id: string, updates: { params?: any; style?: any }) => void;
  onRemoveIndicator: (id: string) => void;
}

const IndicatorSettingsModal: React.FC<IndicatorSettingsModalProps> = ({
  isOpen,
  paneId,
  indicators,
  onClose,
  onUpdateIndicator,
  onRemoveIndicator
}) => {
  const [selectedIndicatorId, setSelectedIndicatorId] = useState<string | null>(null);
  const [tempParams, setTempParams] = useState<any>({});
  const [tempStyle, setTempStyle] = useState<any>({});

  useEffect(() => {
    if (isOpen && indicators.length > 0) {
      setSelectedIndicatorId(indicators[0].id);
    }
  }, [isOpen, indicators]);

  useEffect(() => {
    const selectedIndicator = indicators.find(ind => ind.id === selectedIndicatorId);
    if (selectedIndicator) {
      setTempParams({ ...selectedIndicator.params });
      setTempStyle({ ...selectedIndicator.style });
    }
  }, [selectedIndicatorId, indicators]);

  if (!isOpen) return null;

  const selectedIndicator = indicators.find(ind => ind.id === selectedIndicatorId);
  const metadata = selectedIndicator ? getIndicatorMetadata(selectedIndicator.name) : null;

  const handleSave = () => {
    if (selectedIndicatorId) {
      onUpdateIndicator(selectedIndicatorId, {
        params: tempParams,
        style: tempStyle
      });
    }
    onClose();
  };

  const handleRemove = () => {
    if (selectedIndicatorId) {
      onRemoveIndicator(selectedIndicatorId);
      onClose();
    }
  };

  const renderParamInput = (key: string, config: any) => {
    const value = tempParams[key];

    switch (config.type) {
      case 'number':
        return (
          <input
            type="number"
            value={value || config.min || 0}
            onChange={(e) => setTempParams(prev => ({ 
              ...prev, 
              [key]: parseInt(e.target.value) || config.min || 0 
            }))}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            min={config.min}
            max={config.max}
            step={config.step}
          />
        );
      case 'select':
        return (
          <select
            value={value || config.options[0]}
            onChange={(e) => setTempParams(prev => ({ ...prev, [key]: e.target.value }))}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            {config.options.map((option: string) => (
              <option key={option} value={option}>
                {option === 'hlc3' ? 'HLC3' : option === 'ohlc4' ? 'OHLC4' : option.toUpperCase()}
              </option>
            ))}
          </select>
        );
      case 'boolean':
        return (
          <input
            type="checkbox"
            checked={value !== false}
            onChange={(e) => setTempParams(prev => ({ ...prev, [key]: e.target.checked }))}
            className="rounded border-gray-300 text-blue-600 shadow-sm focus:border-blue-300 focus:ring focus:ring-blue-200 focus:ring-opacity-50"
          />
        );
      default:
        return null;
    }
  };

  return (
    <div 
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
      onClick={onClose}
    >
      <div 
        className="bg-white rounded-lg p-6 w-[600px] max-h-[80vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-between items-center mb-6">
          <div className="flex items-center space-x-3">
            <Settings className="w-5 h-5 text-gray-600" />
            <h3 className="text-xl font-semibold text-gray-900">
              {paneId.toUpperCase()} Indicator Settings
            </h3>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="w-5 h-5" />
          </button>
        </div>

        {indicators.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            No indicators in this pane
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Indicator Selection */}
            <div className="lg:col-span-1">
              <h4 className="text-sm font-semibold text-gray-700 mb-3">Select Indicator</h4>
              <div className="space-y-2">
                {indicators.map((indicator) => (
                  <button
                    key={indicator.id}
                    onClick={() => setSelectedIndicatorId(indicator.id)}
                    className={`w-full p-3 rounded-lg border text-left transition-colors ${
                      selectedIndicatorId === indicator.id
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="font-medium text-gray-900">{indicator.name}</div>
                        <div className="text-xs text-gray-500 mt-1">
                          Length: {indicator.params.length}
                        </div>
                      </div>
                      <div 
                        className="w-4 h-4 rounded-full border-2 border-white shadow-sm"
                        style={{ backgroundColor: indicator.style.color }}
                      />
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Settings Panel */}
            <div className="lg:col-span-2">
              {selectedIndicator && metadata && (
                <>
                  <div className="flex justify-between items-center mb-4">
                    <h4 className="text-sm font-semibold text-gray-700">
                      {metadata.name} Settings
                    </h4>
                    <button
                      onClick={handleRemove}
                      className="flex items-center space-x-1 px-2 py-1 text-red-600 hover:bg-red-50 rounded-md transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                      <span className="text-sm">Remove</span>
                    </button>
                  </div>

                  <div className="space-y-4">
                    {/* Style Settings */}
                    <div className="border-b pb-4">
                      <h5 className="text-sm font-medium text-gray-700 mb-3">Appearance</h5>
                      
                      {/* ADX-specific multi-line controls */}
                      {selectedIndicator.name === 'ADX' ? (
                        <div className="space-y-4">
                          {/* DI+ Settings */}
                          <div className="border border-gray-200 rounded-lg p-3">
                            <div className="flex items-center justify-between mb-2">
                              <label className="text-sm font-medium text-gray-700">DI+ (Positive Directional)</label>
                              <input
                                type="checkbox"
                                checked={tempStyle.showDiPlus !== false}
                                onChange={(e) => setTempStyle(prev => ({ ...prev, showDiPlus: e.target.checked }))}
                                className="rounded border-gray-300 text-green-600 shadow-sm focus:border-green-300 focus:ring focus:ring-green-200 focus:ring-opacity-50"
                              />
                            </div>
                            {tempStyle.showDiPlus !== false && (
                              <div className="grid grid-cols-3 gap-2">
                                <div>
                                  <label className="block text-xs text-gray-600 mb-1">Color</label>
                                  <input
                                    type="color"
                                    value={tempStyle.diPlusColor || '#4CAF50'}
                                    onChange={(e) => setTempStyle(prev => ({ ...prev, diPlusColor: e.target.value }))}
                                    className="w-full h-8 border border-gray-300 rounded cursor-pointer"
                                  />
                                </div>
                                <div>
                                  <label className="block text-xs text-gray-600 mb-1">Width</label>
                                  <input
                                    type="number"
                                    value={tempStyle.diPlusWidth || 1.5}
                                    onChange={(e) => setTempStyle(prev => ({ ...prev, diPlusWidth: parseFloat(e.target.value) || 1.5 }))}
                                    className="w-full px-2 py-1 text-xs border border-gray-300 rounded"
                                    min="0.5"
                                    max="5"
                                    step="0.5"
                                  />
                                </div>
                                <div>
                                  <label className="block text-xs text-gray-600 mb-1">Style</label>
                                  <select
                                    value={tempStyle.diPlusStyle || 'solid'}
                                    onChange={(e) => setTempStyle(prev => ({ ...prev, diPlusStyle: e.target.value }))}
                                    className="w-full px-2 py-1 text-xs border border-gray-300 rounded"
                                  >
                                    <option value="solid">Solid</option>
                                    <option value="dashed">Dashed</option>
                                  </select>
                                </div>
                              </div>
                            )}
                          </div>

                          {/* DI- Settings */}
                          <div className="border border-gray-200 rounded-lg p-3">
                            <div className="flex items-center justify-between mb-2">
                              <label className="text-sm font-medium text-gray-700">DI- (Negative Directional)</label>
                              <input
                                type="checkbox"
                                checked={tempStyle.showDiMinus !== false}
                                onChange={(e) => setTempStyle(prev => ({ ...prev, showDiMinus: e.target.checked }))}
                                className="rounded border-gray-300 text-red-600 shadow-sm focus:border-red-300 focus:ring focus:ring-red-200 focus:ring-opacity-50"
                              />
                            </div>
                            {tempStyle.showDiMinus !== false && (
                              <div className="grid grid-cols-3 gap-2">
                                <div>
                                  <label className="block text-xs text-gray-600 mb-1">Color</label>
                                  <input
                                    type="color"
                                    value={tempStyle.diMinusColor || '#F44336'}
                                    onChange={(e) => setTempStyle(prev => ({ ...prev, diMinusColor: e.target.value }))}
                                    className="w-full h-8 border border-gray-300 rounded cursor-pointer"
                                  />
                                </div>
                                <div>
                                  <label className="block text-xs text-gray-600 mb-1">Width</label>
                                  <input
                                    type="number"
                                    value={tempStyle.diMinusWidth || 1.5}
                                    onChange={(e) => setTempStyle(prev => ({ ...prev, diMinusWidth: parseFloat(e.target.value) || 1.5 }))}
                                    className="w-full px-2 py-1 text-xs border border-gray-300 rounded"
                                    min="0.5"
                                    max="5"
                                    step="0.5"
                                  />
                                </div>
                                <div>
                                  <label className="block text-xs text-gray-600 mb-1">Style</label>
                                  <select
                                    value={tempStyle.diMinusStyle || 'solid'}
                                    onChange={(e) => setTempStyle(prev => ({ ...prev, diMinusStyle: e.target.value }))}
                                    className="w-full px-2 py-1 text-xs border border-gray-300 rounded"
                                  >
                                    <option value="solid">Solid</option>
                                    <option value="dashed">Dashed</option>
                                  </select>
                                </div>
                              </div>
                            )}
                          </div>

                          {/* ADX Settings */}
                          <div className="border border-gray-200 rounded-lg p-3">
                            <div className="flex items-center justify-between mb-2">
                              <label className="text-sm font-medium text-gray-700">ADX (Average Directional Index)</label>
                              <input
                                type="checkbox"
                                checked={tempStyle.showAdx !== false}
                                onChange={(e) => setTempStyle(prev => ({ ...prev, showAdx: e.target.checked }))}
                                className="rounded border-gray-300 text-blue-600 shadow-sm focus:border-blue-300 focus:ring focus:ring-blue-200 focus:ring-opacity-50"
                              />
                            </div>
                            {tempStyle.showAdx !== false && (
                              <div className="grid grid-cols-3 gap-2">
                                <div>
                                  <label className="block text-xs text-gray-600 mb-1">Color</label>
                                  <input
                                    type="color"
                                    value={tempStyle.adxColor || '#1976D2'}
                                    onChange={(e) => setTempStyle(prev => ({ ...prev, adxColor: e.target.value }))}
                                    className="w-full h-8 border border-gray-300 rounded cursor-pointer"
                                  />
                                </div>
                                <div>
                                  <label className="block text-xs text-gray-600 mb-1">Width</label>
                                  <input
                                    type="number"
                                    value={tempStyle.adxWidth || 2}
                                    onChange={(e) => setTempStyle(prev => ({ ...prev, adxWidth: parseFloat(e.target.value) || 2 }))}
                                    className="w-full px-2 py-1 text-xs border border-gray-300 rounded"
                                    min="0.5"
                                    max="5"
                                    step="0.5"
                                  />
                                </div>
                                <div>
                                  <label className="block text-xs text-gray-600 mb-1">Style</label>
                                  <select
                                    value={tempStyle.adxStyle || 'solid'}
                                    onChange={(e) => setTempStyle(prev => ({ ...prev, adxStyle: e.target.value }))}
                                    className="w-full px-2 py-1 text-xs border border-gray-300 rounded"
                                  >
                                    <option value="solid">Solid</option>
                                    <option value="dashed">Dashed</option>
                                  </select>
                                </div>
                              </div>
                            )}
                          </div>

                          {/* Threshold Settings */}
                          <div className="border border-gray-200 rounded-lg p-3">
                            <div className="flex items-center justify-between mb-2">
                              <label className="text-sm font-medium text-gray-700">Threshold Level</label>
                              <input
                                type="checkbox"
                                checked={tempStyle.showThreshold !== false}
                                onChange={(e) => setTempStyle(prev => ({ ...prev, showThreshold: e.target.checked }))}
                                className="rounded border-gray-300 text-gray-600 shadow-sm focus:border-gray-300 focus:ring focus:ring-gray-200 focus:ring-opacity-50"
                              />
                            </div>
                            {tempStyle.showThreshold !== false && (
                              <div className="grid grid-cols-2 gap-2">
                                <div>
                                  <label className="block text-xs text-gray-600 mb-1">Color</label>
                                  <input
                                    type="color"
                                    value={tempStyle.thresholdColor || 'rgba(0, 0, 0, 0.5)'}
                                    onChange={(e) => setTempStyle(prev => ({ ...prev, thresholdColor: e.target.value }))}
                                    className="w-full h-8 border border-gray-300 rounded cursor-pointer"
                                  />
                                </div>
                                <div>
                                  <label className="block text-xs text-gray-600 mb-1">Width</label>
                                  <input
                                    type="number"
                                    value={tempStyle.thresholdWidth || 1}
                                    onChange={(e) => setTempStyle(prev => ({ ...prev, thresholdWidth: parseFloat(e.target.value) || 1 }))}
                                    className="w-full px-2 py-1 text-xs border border-gray-300 rounded"
                                    min="0.5"
                                    max="3"
                                    step="0.5"
                                  />
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      ) : (
                        /* Default single-line controls for other indicators */
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Color</label>
                            <input
                              type="color"
                              value={tempStyle.color || '#000000'}
                              onChange={(e) => setTempStyle(prev => ({ ...prev, color: e.target.value }))}
                              className="w-full h-10 border border-gray-300 rounded-md cursor-pointer"
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Line Width</label>
                            <input
                              type="number"
                              value={tempStyle.width || 1}
                              onChange={(e) => setTempStyle(prev => ({ ...prev, width: parseFloat(e.target.value) || 1 }))}
                              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                              min="0.5"
                              max="5"
                              step="0.5"
                            />
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Parameter Settings */}
                    <div>
                      <h5 className="text-sm font-medium text-gray-700 mb-3">Parameters</h5>
                      <div className="grid grid-cols-1 gap-4">
                        {Object.entries(metadata.paramConfig).map(([key, config]) => (
                          <div key={key} className={config.type === 'boolean' ? 'flex items-center space-x-2' : ''}>
                            <label className={`text-sm font-medium text-gray-700 ${
                              config.type === 'boolean' ? 'order-2' : 'block mb-1'
                            }`}>
                              {config.label}
                            </label>
                            {config.type === 'boolean' ? (
                              <div className="order-1">
                                {renderParamInput(key, config)}
                              </div>
                            ) : (
                              renderParamInput(key, config)
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex justify-end space-x-3 mt-6 pt-4 border-t">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-600 border border-gray-300 rounded-md hover:bg-gray-50"
          >
            Cancel
          </button>
          {selectedIndicator && (
            <button
              onClick={handleSave}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
            >
              Apply Changes
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default IndicatorSettingsModal;

