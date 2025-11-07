import { TrendingUp } from 'lucide-react';

interface EquityAreaProps {
  data: Array<{ t: string; v: number }>;
  isLoading?: boolean;
}

const EquityArea = ({ data, isLoading }: EquityAreaProps) => {
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  if (isLoading) {
    return (
      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
        <div className="flex items-center space-x-2 mb-4">
          <TrendingUp className="h-5 w-5 text-blue-500" />
          <h3 className="text-lg font-semibold text-gray-900">Equity Curve</h3>
        </div>
        <div className="h-64 flex items-center justify-center">
          <div className="animate-pulse">
            <div className="h-48 w-full bg-gray-200 rounded"></div>
          </div>
        </div>
      </div>
    );
  }

  const maxValue = Math.max(...data.map(d => d.v));
  const minValue = Math.min(...data.map(d => d.v));
  const range = maxValue - minValue || 1;

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
      <div className="flex items-center space-x-2 mb-4">
        <TrendingUp className="h-5 w-5 text-blue-500" />
        <h3 className="text-lg font-semibold text-gray-900">Equity Curve</h3>
      </div>
      
      <div className="h-64 relative border-b border-l border-gray-200">
        <svg className="w-full h-full" viewBox="0 0 400 200" preserveAspectRatio="none">
          <defs>
            <linearGradient id="equityGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.3}/>
              <stop offset="95%" stopColor="#3B82F6" stopOpacity={0}/>
            </linearGradient>
          </defs>
          <polyline
            fill="url(#equityGradient)"
            stroke="#3B82F6"
            strokeWidth="2"
            points={data.map((d, i) => {
              const x = (i / (data.length - 1 || 1)) * 400;
              const y = 200 - ((d.v - minValue) / range) * 200;
              return `${x},${y}`;
            }).join(' ') + ` ${400},200 0,200`}
          />
          <polyline
            fill="none"
            stroke="#3B82F6"
            strokeWidth="2"
            points={data.map((d, i) => {
              const x = (i / (data.length - 1 || 1)) * 400;
              const y = 200 - ((d.v - minValue) / range) * 200;
              return `${x},${y}`;
            }).join(' ')}
          />
        </svg>
        <div className="absolute bottom-0 left-0 right-0 flex justify-between text-xs text-gray-500 px-2">
          <span>{data[0]?.t ? new Date(data[0].t).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : ''}</span>
          <span>{data[data.length - 1]?.t ? new Date(data[data.length - 1].t).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : ''}</span>
        </div>
        <div className="absolute top-0 right-0 text-sm font-semibold text-gray-900 p-2">
          {formatCurrency(maxValue)}
        </div>
      </div>
    </div>
  );
};

export default EquityArea;


