import React from 'react';
import HeaderBar from '@/components/HeaderBar';
import ChartHost from '@/components/ChartHost';

const LiveChartPage: React.FC = () => {
  return (
    <div className="h-screen flex flex-col bg-white">
      {/* Header Bar */}
      <HeaderBar />
      
      {/* Chart Area */}
      <div className="flex-1 overflow-hidden">
        <ChartHost />
      </div>
    </div>
  );
};

export default LiveChartPage;
