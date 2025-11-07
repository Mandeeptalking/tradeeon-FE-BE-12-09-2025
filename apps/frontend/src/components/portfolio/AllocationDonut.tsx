import { PieChart as PieChartIcon } from 'lucide-react';
import { useState } from 'react';

interface AllocationDonutProps {
  data: Array<{ label: string; value: number }>;
  isLoading?: boolean;
}

const AllocationDonut = ({ data, isLoading }: AllocationDonutProps) => {
  const [viewBy, setViewBy] = useState<'symbol' | 'exchange'>('symbol');

  const COLORS = [
    '#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', 
    '#06B6D4', '#84CC16', '#F97316', '#EC4899', '#6366F1'
  ];

  const formatPercent = (value: number) => {
    return `${(value * 100).toFixed(1)}%`;
  };

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-white border border-gray-200 rounded-lg shadow-lg p-3">
          <p className="text-sm font-medium text-gray-900">{data.label}</p>
          <p className="text-lg font-semibold text-gray-900">
            {formatPercent(data.value)}
          </p>
        </div>
      );
    }
    return null;
  };

  if (isLoading) {
    return (
      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-2">
            <PieChartIcon className="h-5 w-5 text-blue-500" />
            <h3 className="text-lg font-semibold text-gray-900">Allocation</h3>
          </div>
        </div>
        <div className="h-64 flex items-center justify-center">
          <div className="animate-pulse">
            <div className="h-48 w-48 bg-gray-200 rounded-full"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-2">
          <PieChartIcon className="h-5 w-5 text-blue-500" />
          <h3 className="text-lg font-semibold text-gray-900">Allocation</h3>
        </div>
        
        <div className="flex space-x-1 bg-gray-100 rounded-lg p-1">
          <button
            onClick={() => setViewBy('symbol')}
            className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${
              viewBy === 'symbol'
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            By Symbol
          </button>
          <button
            onClick={() => setViewBy('exchange')}
            className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${
              viewBy === 'exchange'
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            By Exchange
          </button>
        </div>
      </div>
      
      <div className="h-64 flex flex-col items-center justify-center">
        <svg width="200" height="200" viewBox="0 0 200 200" className="mb-4">
          {(() => {
            const total = data.reduce((sum, d) => sum + d.value, 0);
            let currentAngle = -90;
            return data.map((item, index) => {
              const percentage = item.value / total;
              const angle = percentage * 360;
              const startAngle = currentAngle;
              const endAngle = currentAngle + angle;
              currentAngle = endAngle;
              
              const startAngleRad = (startAngle * Math.PI) / 180;
              const endAngleRad = (endAngle * Math.PI) / 180;
              const innerRadius = 60;
              const outerRadius = 100;
              const cx = 100;
              const cy = 100;
              
              const x1 = cx + innerRadius * Math.cos(startAngleRad);
              const y1 = cy + innerRadius * Math.sin(startAngleRad);
              const x2 = cx + outerRadius * Math.cos(startAngleRad);
              const y2 = cy + outerRadius * Math.sin(startAngleRad);
              const x3 = cx + outerRadius * Math.cos(endAngleRad);
              const y3 = cy + outerRadius * Math.sin(endAngleRad);
              const x4 = cx + innerRadius * Math.cos(endAngleRad);
              const y4 = cy + innerRadius * Math.sin(endAngleRad);
              
              const largeArc = angle > 180 ? 1 : 0;
              
              return (
                <path
                  key={index}
                  d={`M ${x1} ${y1} L ${x2} ${y2} A ${outerRadius} ${outerRadius} 0 ${largeArc} 1 ${x3} ${y3} L ${x4} ${y4} A ${innerRadius} ${innerRadius} 0 ${largeArc} 0 ${x1} ${y1} Z`}
                  fill={COLORS[index % COLORS.length]}
                />
              );
            });
          })()}
        </svg>
        <div className="flex flex-wrap justify-center gap-2 text-sm">
          {data.map((item, index) => (
            <div key={index} className="flex items-center space-x-2">
              <div 
                className="w-3 h-3 rounded" 
                style={{ backgroundColor: COLORS[index % COLORS.length] }}
              />
              <span className="text-gray-600">
                {item.label} ({formatPercent(item.value)})
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default AllocationDonut;
