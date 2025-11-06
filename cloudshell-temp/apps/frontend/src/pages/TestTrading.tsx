import { useState } from 'react';
import DebugConsole from '../components/DebugConsole';

const TestTrading = () => {
  const [count, setCount] = useState(0);

  return (
    <div className="min-h-screen bg-gray-900 text-white p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-8">Test Trading Page</h1>
        
        <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
          <h2 className="text-xl font-semibold mb-4">Basic Functionality Test</h2>
          
          <div className="space-y-4">
            <div>
              <p className="text-gray-300 mb-2">Counter Test:</p>
              <button 
                onClick={() => setCount(count + 1)}
                className="bg-blue-500 hover:bg-blue-600 px-4 py-2 rounded text-white"
              >
                Count: {count}
              </button>
            </div>
            
            <div>
              <p className="text-gray-300 mb-2">Current Time:</p>
              <p className="text-green-400">{new Date().toLocaleString()}</p>
            </div>
            
            <div>
              <p className="text-gray-300 mb-2">Environment:</p>
              <p className="text-blue-400">React + TypeScript + TailwindCSS</p>
            </div>
          </div>
        </div>
        
        <div className="mt-6 bg-green-800 rounded-lg p-6 border border-green-700">
          <h3 className="text-lg font-semibold text-green-200 mb-2">✅ Page Loaded Successfully!</h3>
          <p className="text-green-300">
            If you can see this, the routing and basic React functionality is working.
            The issue might be with the chart component or WebSocket connection.
          </p>
        </div>
      </div>
      
      <DebugConsole />
    </div>
  );
};

export default TestTrading;
