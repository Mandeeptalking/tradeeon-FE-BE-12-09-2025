import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';

// EMA Instance Store
type EmaInstance = { 
  id: string; 
  length: number; 
  color: string; 
  source: 'close' | 'hlc3' | 'ohlc4'
};

// Global EMA instances store
let emaInstances: EmaInstance[] = [];

// Helper functions for EMA store
export const getEMAInstances = (): EmaInstance[] => [...emaInstances];
export const addEMAInstance = (instance: EmaInstance) => {
  emaInstances.push(instance);
  console.log('📊 EMA instances after add:', emaInstances);
};
export const updateEMAInstance = (id: string, updates: Partial<EmaInstance>) => {
  const index = emaInstances.findIndex(ema => ema.id === id);
  if (index !== -1) {
    emaInstances[index] = { ...emaInstances[index], ...updates };
    console.log('🔄 EMA instances after update:', emaInstances);
  }
};
export const removeEMAInstance = (id: string) => {
  emaInstances = emaInstances.filter(ema => ema.id !== id);
  console.log('🗑️ EMA instances after remove:', emaInstances);
};
export const clearAllEMAInstances = () => {
  emaInstances = [];
  console.log('🧹 All EMA instances cleared');
};

interface EMASettingsProps {
  isOpen: boolean;
  onClose: () => void;
  chart: any; // Chart instance
  addEMA: (options: { length: number; color: string; source?: string }) => string | null; // addEMA helper function
  updateEMA: (id: string, options: { length: number; color: string; source?: string }) => boolean; // updateEMA helper function
  onEMAChanged: () => void; // Callback when EMA instances change (for UI refresh)
}

const EMASettings: React.FC<EMASettingsProps> = ({ 
  isOpen, 
  onClose, 
  chart, 
  addEMA,
  updateEMA,
  onEMAChanged
}) => {
  // Form state
  const [length, setLength] = useState(20);
  const [source, setSource] = useState<'close' | 'hlc3' | 'ohlc4'>('close');
  const [color, setColor] = useState('#4C84FF');
  
  useEffect(() => {
    if (!isOpen) {
      // Reset form when closing
      setLength(20);
      setSource('close');
      setColor('#4C84FF');
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleAdd = () => {
    if (!chart) {
      console.error('❌ Chart not available');
      return;
    }

    console.log('➕ Adding EMA:', { length, color, source });
    
    // Call addEMA helper function
    const id = addEMA({ length, color, source });
    
    if (id) {
      console.log('✅ EMA added with ID:', id);
      
      // Add to store
      addEMAInstance({ id, length, color, source });
      onEMAChanged(); // Trigger UI refresh
      onClose();
    } else {
      console.error('❌ Failed to add EMA');
    }
  };

  const handleUpdate = (emaInstance: EmaInstance) => {
    console.log('🔄 Updating EMA:', { id: emaInstance.id, length, color, source });
    
    // Call updateEMA helper function
    const success = updateEMA(emaInstance.id, { length, color, source });
    
    if (success) {
      // Update in store
      updateEMAInstance(emaInstance.id, { length, color, source });
      onEMAChanged(); // Trigger UI refresh
      
      console.log('✅ EMA updated successfully');
      onClose();
    } else {
      console.error('❌ Failed to update EMA');
    }
  };

  const handleRemove = (emaInstance: EmaInstance) => {
    if (!chart) {
      console.error('❌ Chart not available for removal');
      return;
    }

    console.log('🗑️ Removing EMA:', emaInstance.id);
    
    try {
      // Call chart.removeIndicator
      chart.removeIndicator({ id: emaInstance.id });
      
      // Remove from store
      removeEMAInstance(emaInstance.id);
      onEMAChanged(); // Trigger UI refresh
      
      console.log('✅ EMA removed successfully');
      onClose();
      
    } catch (error) {
      console.error('❌ Error removing EMA:', error);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-sm">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-800">EMA Settings</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 space-y-4">
          {/* Current EMA Instances */}
          {emaInstances.length > 0 && (
            <div>
              <label className="block text-sm font-medium text-gray-600 mb-2">
                Current EMAs
              </label>
              <div className="flex flex-wrap gap-2">
                {emaInstances.map((ema) => (
                  <div
                    key={ema.id}
                    className="flex items-center space-x-2 bg-gray-100 rounded-md px-2 py-1 text-sm"
                  >
                    {/* Colored dot */}
                    <div 
                      className="w-3 h-3 rounded-full" 
                      style={{ backgroundColor: ema.color }}
                    />
                    <span>EMA({ema.length})</span>
                    <button
                      onClick={() => handleUpdate(ema)}
                      className="text-blue-500 hover:text-blue-700 text-xs"
                      title="Update this EMA with current form values"
                    >
                      ↻
                    </button>
                    <button
                      onClick={() => handleRemove(ema)}
                      className="text-red-500 hover:text-red-700 text-xs"
                      title="Remove this EMA"
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Length Input */}
          <div>
            <label className="block text-sm font-medium text-gray-600 mb-1">
              Length
            </label>
            <input
              type="number"
              value={length}
              onChange={(e) => setLength(parseInt(e.target.value) || 20)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              min="2"
              max="500"
              placeholder="20"
            />
          </div>

          {/* Source Select */}
          <div>
            <label className="block text-sm font-medium text-gray-600 mb-1">
              Source
            </label>
            <select
              value={source}
              onChange={(e) => setSource(e.target.value as 'close' | 'hlc3' | 'ohlc4')}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="close">Close</option>
              <option value="hlc3">HLC3</option>
              <option value="ohlc4">OHLC4</option>
            </select>
          </div>

          {/* Color Picker */}
          <div>
            <label className="block text-sm font-medium text-gray-600 mb-1">
              Line Color
            </label>
            <input
              type="color"
              value={color}
              onChange={(e) => setColor(e.target.value)}
              className="w-full h-10 border border-gray-300 rounded-md"
            />
          </div>
        </div>

        {/* Footer Buttons */}
        <div className="flex items-center justify-end space-x-2 p-4 border-t border-gray-200 bg-gray-50">
          {/* Always show Add button for multiple EMAs */}
          <button
            onClick={handleAdd}
            className="px-4 py-2 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
          >
            Add EMA
          </button>
        </div>
      </div>
    </div>
  );
};

export default EMASettings;

