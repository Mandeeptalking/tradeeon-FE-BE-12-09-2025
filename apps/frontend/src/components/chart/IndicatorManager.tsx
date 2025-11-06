import React, { useState } from 'react';
import { Plus, X, Settings, TrendingUp, BarChart3 } from 'lucide-react';
import { 
  AVAILABLE_INDICATORS, 
  INDICATOR_CATEGORIES, 
  getIndicatorMetadata,
  IndicatorName,
  IndicatorCategory 
} from '@/canvas/indicators';

interface IndicatorInstance {
  id: string;
  name: string;
  params: any;
  style: any;
}

interface IndicatorManagerProps {
  indicators: IndicatorInstance[];
  onAddIndicator: (name: string, pane: string, params: any, style: any) => string;
  onRemoveIndicator: (id: string) => void;
  onUpdateIndicator: (id: string, updates: { params?: any; style?: any }) => void;
}

const IndicatorManager: React.FC<IndicatorManagerProps> = ({
  indicators,
  onAddIndicator,
  onRemoveIndicator,
  onUpdateIndicator
}) => {
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<IndicatorCategory>('TREND');
  const [selectedIndicator, setSelectedIndicator] = useState<IndicatorName | null>(null);

  const AddIndicatorModal = () => {
    if (!showAddModal) return null;

    const handleCategorySelect = (category: IndicatorCategory) => {
      setSelectedCategory(category);
      setSelectedIndicator(null);
    };

    const handleIndicatorSelect = (indicatorName: IndicatorName) => {
      setSelectedIndicator(indicatorName);
    };

    const handleAddIndicator = () => {
      if (!selectedIndicator) return;
      
      const metadata = getIndicatorMetadata(selectedIndicator);
      if (!metadata) return;

      const id = onAddIndicator(
        selectedIndicator,
        metadata.pane,
        metadata.defaultParams,
        metadata.defaultStyle
      );

      setShowAddModal(false);
      setSelectedIndicator(null);
    };

    return (
      <div 
        className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
        onClick={() => setShowAddModal(false)}
      >
        <div 
          className="bg-white rounded-lg p-6 w-[500px] max-h-[80vh] overflow-y-auto"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-xl font-semibold text-gray-900">Add Indicator</h3>
            <button 
              onClick={() => setShowAddModal(false)} 
              className="text-gray-400 hover:text-gray-600"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Category Selection */}
          <div className="mb-6">
            <h4 className="text-sm font-semibold text-gray-700 mb-3">Category</h4>
            <div className="grid grid-cols-2 gap-3">
              {Object.entries(INDICATOR_CATEGORIES).map(([key, category]) => (
                <button
                  key={key}
                  onClick={() => handleCategorySelect(key as IndicatorCategory)}
                  className={`p-3 rounded-lg border text-left transition-colors ${
                    selectedCategory === key
                      ? 'border-blue-500 bg-blue-50 text-blue-700'
                      : 'border-gray-200 hover:border-gray-300 text-gray-700'
                  }`}
                >
                  <div className="font-medium">{category.name}</div>
                  <div className="text-xs text-gray-500 mt-1">
                    {category.indicators.length} indicators
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Indicator Selection */}
          <div className="mb-6">
            <h4 className="text-sm font-semibold text-gray-700 mb-3">
              {INDICATOR_CATEGORIES[selectedCategory].name} Indicators
            </h4>
            <div className="space-y-2">
              {INDICATOR_CATEGORIES[selectedCategory].indicators
                .filter(name => name in AVAILABLE_INDICATORS)
                .map((name) => {
                  const metadata = getIndicatorMetadata(name as IndicatorName);
                  if (!metadata) return null;

                  return (
                    <button
                      key={name}
                      onClick={() => handleIndicatorSelect(name as IndicatorName)}
                      className={`w-full p-3 rounded-lg border text-left transition-colors ${
                        selectedIndicator === name
                          ? 'border-blue-500 bg-blue-50'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="font-medium text-gray-900">{metadata.name}</div>
                          <div className="text-sm text-gray-600 mt-1">{metadata.description}</div>
                        </div>
                        <div className="flex items-center space-x-2">
                          {metadata.pane === 'price' ? (
                            <BarChart3 className="w-4 h-4 text-blue-500" />
                          ) : (
                            <TrendingUp className="w-4 h-4 text-purple-500" />
                          )}
                          <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">
                            {metadata.pane}
                          </span>
                        </div>
                      </div>
                    </button>
                  );
                })}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex justify-end space-x-3">
            <button
              onClick={() => setShowAddModal(false)}
              className="px-4 py-2 text-gray-600 border border-gray-300 rounded-md hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              onClick={handleAddIndicator}
              disabled={!selectedIndicator}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Add {selectedIndicator || 'Indicator'}
            </button>
          </div>
        </div>
      </div>
    );
  };

  return (
    <>
      {/* Add Indicator Button */}
      <button
        onClick={() => setShowAddModal(true)}
        className="flex items-center space-x-2 px-3 py-2 bg-blue-600 text-white text-sm rounded-md hover:bg-blue-700 transition-colors"
      >
        <Plus className="w-4 h-4" />
        <span>Add Indicator</span>
      </button>

      {/* Active Indicators */}
      {indicators.length > 0 && (
        <div className="flex items-center space-x-2">
          {indicators.map((indicator) => (
            <div key={indicator.id} className="flex items-center space-x-1 bg-gray-100 rounded-md px-2 py-1">
              <div 
                className="w-3 h-3 rounded-full"
                style={{ backgroundColor: indicator.style.color }}
              ></div>
              <span className="text-xs text-gray-700">{indicator.name}</span>
              <button
                onClick={() => onRemoveIndicator(indicator.id)}
                className="text-gray-400 hover:text-red-500 ml-1"
              >
                <X className="w-3 h-3" />
              </button>
            </div>
          ))}
        </div>
      )}

      <AddIndicatorModal />
    </>
  );
};

export default IndicatorManager;







