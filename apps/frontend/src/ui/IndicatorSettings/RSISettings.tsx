/**
 * RSI Settings Modal
 * 
 * Configurable parameters for RSI indicator:
 * - Length, source, MA settings
 * - Band levels and visual options
 * - Quick presets
 * - Color customization
 */

import React, { useState } from 'react';
import { X, RotateCcw } from 'lucide-react';

interface RSISettingsProps {
  isOpen: boolean;
  onClose: () => void;
  params: any;
  onApply: (newParams: any) => void;
}

const RSISettings: React.FC<RSISettingsProps> = ({ isOpen, onClose, params, onApply }) => {
  const [localParams, setLocalParams] = useState({ ...params });

  if (!isOpen) return null;

  const handleApply = () => {
    onApply(localParams);
    onClose();
  };

  const applyPreset = (preset: any) => {
    setLocalParams({ ...localParams, ...preset });
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-96 max-h-[80vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">RSI Settings</h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Settings Content */}
        <div className="p-4 space-y-4">
          {/* RSI Parameters */}
          <div>
            <h4 className="text-sm font-semibold text-gray-700 mb-3">RSI Parameters</h4>
            
            <div className="space-y-3">
              {/* Length */}
              <div>
                <label className="block text-sm font-medium text-gray-600 mb-1">
                  Length
                </label>
                <input
                  type="number"
                  value={localParams.length || 14}
                  onChange={(e) => setLocalParams({
                    ...localParams,
                    length: parseInt(e.target.value) || 14
                  })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  min="2"
                  max="200"
                />
                <p className="text-xs text-gray-500 mt-1">Period for RSI calculation (2-200)</p>
              </div>

              {/* Source */}
              <div>
                <label className="block text-sm font-medium text-gray-600 mb-1">
                  Source
                </label>
                <select
                  value={localParams.source || 'close'}
                  onChange={(e) => setLocalParams({
                    ...localParams,
                    source: e.target.value
                  })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="close">Close</option>
                  <option value="open">Open</option>
                  <option value="high">High</option>
                  <option value="low">Low</option>
                  <option value="hlc3">HLC3</option>
                  <option value="ohlc4">OHLC4</option>
                  <option value="hl2">HL2</option>
                </select>
              </div>
            </div>
          </div>

          {/* RSI Moving Average */}
          <div>
            <h4 className="text-sm font-semibold text-gray-700 mb-3">RSI Moving Average</h4>
            
            <div className="space-y-3">
              {/* Show MA Toggle */}
              <div>
                <label className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    checked={localParams.showMA !== false}
                    onChange={(e) => setLocalParams({
                      ...localParams,
                      showMA: e.target.checked
                    })}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="text-sm font-medium text-gray-600">Show RSI Moving Average</span>
                </label>
              </div>

              {/* MA Length */}
              {localParams.showMA !== false && (
                <div>
                  <label className="block text-sm font-medium text-gray-600 mb-1">
                    MA Length
                  </label>
                  <input
                    type="number"
                    value={localParams.maLength || 9}
                    onChange={(e) => setLocalParams({
                      ...localParams,
                      maLength: parseInt(e.target.value) || 9
                    })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    min="2"
                    max="200"
                  />
                  <p className="text-xs text-gray-500 mt-1">Period for RSI smoothing (2-200)</p>
                </div>
              )}
            </div>
          </div>

          {/* Band Levels */}
          <div>
            <h4 className="text-sm font-semibold text-gray-700 mb-3">Band Levels</h4>
            
            <div className="space-y-3">
              {/* Show Bands Toggle */}
              <div>
                <label className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    checked={localParams.showBands !== false}
                    onChange={(e) => setLocalParams({
                      ...localParams,
                      showBands: e.target.checked
                    })}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="text-sm font-medium text-gray-600">Show Reference Lines</span>
                </label>
              </div>

              {localParams.showBands !== false && (
                <>
                  {/* Overbought Level */}
                  <div>
                    <label className="block text-sm font-medium text-gray-600 mb-1">
                      Overbought Level
                    </label>
                    <input
                      type="number"
                      value={localParams.overbought || 70}
                      onChange={(e) => setLocalParams({
                        ...localParams,
                        overbought: parseInt(e.target.value) || 70
                      })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      min="50"
                      max="95"
                    />
                  </div>

                  {/* Oversold Level */}
                  <div>
                    <label className="block text-sm font-medium text-gray-600 mb-1">
                      Oversold Level
                    </label>
                    <input
                      type="number"
                      value={localParams.oversold || 30}
                      onChange={(e) => setLocalParams({
                        ...localParams,
                        oversold: parseInt(e.target.value) || 30
                      })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      min="5"
                      max="50"
                    />
                  </div>

                  {/* Background Shading */}
                  <div>
                    <label className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        checked={localParams.showBackground !== false}
                        onChange={(e) => setLocalParams({
                          ...localParams,
                          showBackground: e.target.checked
                        })}
                        className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      />
                      <span className="text-sm font-medium text-gray-600">Background Shading</span>
                    </label>
                  </div>

                  {/* Reference Line Colors */}
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-sm font-medium text-gray-600 mb-1">
                        Overbought Color
                      </label>
                      <input
                        type="color"
                        value={localParams.overboughtColor || '#ef4444'}
                        onChange={(e) => setLocalParams({
                          ...localParams,
                          overboughtColor: e.target.value
                        })}
                        className="w-full h-8 border border-gray-300 rounded-md"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-600 mb-1">
                        Oversold Color
                      </label>
                      <input
                        type="color"
                        value={localParams.oversoldColor || '#22c55e'}
                        onChange={(e) => setLocalParams({
                          ...localParams,
                          oversoldColor: e.target.value
                        })}
                        className="w-full h-8 border border-gray-300 rounded-md"
                      />
                    </div>
                  </div>

                  {/* Line Style */}
                  <div>
                    <label className="block text-sm font-medium text-gray-600 mb-1">
                      Reference Line Style
                    </label>
                    <select
                      value={localParams.lineStyle || 'dash'}
                      onChange={(e) => setLocalParams({
                        ...localParams,
                        lineStyle: e.target.value
                      })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    >
                      <option value="solid">Solid Line</option>
                      <option value="dash">Dashed Line</option>
                      <option value="dot">Dotted Line</option>
                    </select>
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Quick Presets */}
          <div>
            <h4 className="text-sm font-semibold text-gray-700 mb-3">Quick Presets</h4>
            <div className="grid grid-cols-1 gap-2">
              <button
                onClick={() => applyPreset({
                  length: 14, source: 'close', maLength: 9, showMA: true,
                  overbought: 70, oversold: 30, showBands: true, showBackground: true,
                  rsiColor: '#4C84FF', rsiMAColor: '#9094a6',
                  overboughtColor: '#ef4444', oversoldColor: '#22c55e', lineStyle: 'dash'
                })}
                className="px-3 py-2 text-sm bg-gray-100 hover:bg-gray-200 rounded-md border text-left"
              >
                <strong>Classic (14, 70/30)</strong> - Standard RSI with MA(9)
              </button>
              <button
                onClick={() => applyPreset({
                  length: 7, source: 'close', maLength: 5, showMA: true,
                  overbought: 80, oversold: 20, showBands: true, showBackground: true,
                  rsiColor: '#FF6B35', rsiMAColor: '#FFA500',
                  overboughtColor: '#DC143C', oversoldColor: '#32CD32', lineStyle: 'solid'
                })}
                className="px-3 py-2 text-sm bg-gray-100 hover:bg-gray-200 rounded-md border text-left"
              >
                <strong>Swing (7, 80/20)</strong> - Fast RSI for swing trading
              </button>
              <button
                onClick={() => applyPreset({
                  length: 21, source: 'hlc3', maLength: 14, showMA: true,
                  overbought: 60, oversold: 40, showBands: true, showBackground: true,
                  rsiColor: '#8A2BE2', rsiMAColor: '#DDA0DD',
                  overboughtColor: '#FF4500', oversoldColor: '#228B22', lineStyle: 'dot'
                })}
                className="px-3 py-2 text-sm bg-gray-100 hover:bg-gray-200 rounded-md border text-left"
              >
                <strong>Trend (21, 60/40)</strong> - Smooth RSI for trends
              </button>
            </div>
          </div>

          {/* Color Settings */}
          <div>
            <h4 className="text-sm font-semibold text-gray-700 mb-3">Colors</h4>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-gray-600 mb-1">RSI Line</label>
                <input
                  type="color"
                  value={localParams.rsiColor || '#4C84FF'}
                  onChange={(e) => setLocalParams({
                    ...localParams,
                    rsiColor: e.target.value
                  })}
                  className="w-full h-8 border border-gray-300 rounded-md"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-600 mb-1">RSI MA Line</label>
                <input
                  type="color"
                  value={localParams.rsiMAColor || '#9094a6'}
                  onChange={(e) => setLocalParams({
                    ...localParams,
                    rsiMAColor: e.target.value
                  })}
                  className="w-full h-8 border border-gray-300 rounded-md"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-4 border-t border-gray-200 bg-gray-50">
          <button
            onClick={() => applyPreset({
              length: 14, source: 'close', maLength: 9, showMA: true,
              overbought: 70, oversold: 30, showBands: true, showBackground: true,
              rsiColor: '#4C84FF', rsiMAColor: '#9094a6',
              overboughtColor: '#ef4444', oversoldColor: '#22c55e', lineStyle: 'dash'
            })}
            className="flex items-center space-x-2 px-3 py-2 text-sm text-gray-600 hover:text-gray-800 transition-colors"
          >
            <RotateCcw className="w-4 h-4" />
            <span>Reset to Defaults</span>
          </button>
          
          <div className="flex items-center space-x-2">
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleApply}
              className="px-4 py-2 bg-blue-600 text-white text-sm rounded-md hover:bg-blue-700 transition-colors"
            >
              Apply Changes
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RSISettings;
