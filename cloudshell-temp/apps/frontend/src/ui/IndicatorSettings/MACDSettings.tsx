import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';

interface MACDSettingsProps {
  isOpen: boolean;
  onClose: () => void;
  params: {
    fastLength: number;
    slowLength: number;
    signalLength: number;
  };
  onApply: (params: any) => void;
}

const MACDSettings: React.FC<MACDSettingsProps> = ({ 
  isOpen, 
  onClose, 
  params,
  onApply
}) => {
  // Form state (simplified for built-in MACD)
  const [fastLength, setFastLength] = useState(params.fastLength);
  const [slowLength, setSlowLength] = useState(params.slowLength);
  const [signalLength, setSignalLength] = useState(params.signalLength);
  
  useEffect(() => {
    if (isOpen) {
      // Load current params when opening
      setFastLength(params.fastLength);
      setSlowLength(params.slowLength);
      setSignalLength(params.signalLength);
    }
  }, [isOpen, params]);

  if (!isOpen) return null;

  const handleApply = () => {
    const newParams = {
      fastLength,
      slowLength,
      signalLength
    };
    
    console.log('📊 Applying built-in MACD settings:', newParams);
    onApply(newParams);
  };

  const handleReset = () => {
    setFastLength(12);
    setSlowLength(26);
    setSignalLength(9);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200 sticky top-0 bg-white">
          <h3 className="text-lg font-semibold text-gray-800">MACD Settings</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 space-y-4">
          {/* Periods */}
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-600 mb-1">
                Fast Length
              </label>
              <input
                type="number"
                value={fastLength}
                onChange={(e) => setFastLength(parseInt(e.target.value) || 12)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                min="1"
                max="100"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-600 mb-1">
                Slow Length
              </label>
              <input
                type="number"
                value={slowLength}
                onChange={(e) => setSlowLength(parseInt(e.target.value) || 26)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                min="1"
                max="100"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-600 mb-1">
                Signal Length
              </label>
              <input
                type="number"
                value={signalLength}
                onChange={(e) => setSignalLength(parseInt(e.target.value) || 9)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                min="1"
                max="50"
              />
            </div>
          </div>

          <div className="text-sm text-gray-600 bg-blue-50 p-3 rounded-md">
            <p><strong>Note:</strong> Using built-in MACD with histogram bars.</p>
            <p>Fast: EMA({fastLength}), Slow: EMA({slowLength}), Signal: EMA({signalLength})</p>
          </div>
        </div>

        {/* Footer Buttons */}
        <div className="flex items-center justify-between p-4 border-t border-gray-200 bg-gray-50 sticky bottom-0">
          <button
            onClick={handleReset}
            className="px-4 py-2 text-sm text-gray-600 bg-gray-200 rounded-md hover:bg-gray-300 transition-colors"
          >
            Reset to Defaults
          </button>
          <div className="flex space-x-2">
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm text-gray-600 bg-gray-200 rounded-md hover:bg-gray-300 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleApply}
              className="px-4 py-2 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
            >
              Apply
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MACDSettings;
