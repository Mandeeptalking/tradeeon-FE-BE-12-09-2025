import React, { useEffect, useRef } from 'react';

const WorkingChart: React.FC = () => {
  const chartContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!chartContainerRef.current) return;

    // Create a simple div with some content to test
    const div = document.createElement('div');
    div.innerHTML = `
      <div style="padding: 20px; background: #f0f0f0; border: 1px solid #ccc; border-radius: 8px;">
        <h2>Working Chart Test</h2>
        <p>This is a test to see if React is working properly.</p>
        <p>Current time: ${new Date().toLocaleString()}</p>
        <div style="width: 100%; height: 300px; background: #e0e0e0; display: flex; align-items: center; justify-content: center; border: 1px solid #999;">
          <p>Chart area would go here</p>
        </div>
      </div>
    `;
    
    chartContainerRef.current.appendChild(div);

    return () => {
      if (chartContainerRef.current && div.parentNode) {
        chartContainerRef.current.removeChild(div);
      }
    };
  }, []);

  return (
    <div style={{ padding: '20px', backgroundColor: 'white', minHeight: '100vh' }}>
      <h1>Working Chart Test</h1>
      <div ref={chartContainerRef} />
    </div>
  );
};

export default WorkingChart;

