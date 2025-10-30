import React from 'react';

/**
 * Minimal test component - just text, no charts
 */
const MinimalTest: React.FC = () => {
  return (
    <div className="min-h-screen bg-white p-8">
      <h1 className="text-3xl font-bold text-gray-900 mb-4">
        Minimal Test Page
      </h1>
      <p className="text-lg text-gray-600 mb-4">
        This is a minimal test page with no charts or complex logic.
      </p>
      <div className="bg-green-100 border border-green-300 rounded-lg p-4">
        <h2 className="text-xl font-semibold text-green-800 mb-2">
          ✅ Page is Working
        </h2>
        <p className="text-green-700">
          If you can see this message, the basic routing and component rendering is working correctly.
        </p>
      </div>
      
      <div className="mt-6 bg-blue-100 border border-blue-300 rounded-lg p-4">
        <h3 className="text-lg font-semibold text-blue-800 mb-2">
          Next Steps:
        </h3>
        <ul className="text-blue-700 list-disc list-inside space-y-1">
          <li>If this page works, the issue is with the chart components</li>
          <li>If this page doesn't work, the issue is with routing or basic React</li>
          <li>Check browser console (F12) for any error messages</li>
        </ul>
      </div>
    </div>
  );
};

export default MinimalTest;

