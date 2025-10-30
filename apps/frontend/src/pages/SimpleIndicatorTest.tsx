import React from 'react';

/**
 * Simple test component to verify routing works
 */
const SimpleIndicatorTest: React.FC = () => {
  return (
    <div className="min-h-screen bg-white p-8">
      <h1 className="text-3xl font-bold text-gray-900 mb-4">
        Simple Indicator Test
      </h1>
      <p className="text-lg text-gray-600 mb-4">
        This is a simple test page to verify the routing is working correctly.
      </p>
      <div className="bg-blue-100 border border-blue-300 rounded-lg p-4">
        <h2 className="text-xl font-semibold text-blue-800 mb-2">
          ✅ Page is Loading Successfully
        </h2>
        <p className="text-blue-700">
          If you can see this message, the routing and component rendering is working.
        </p>
      </div>
    </div>
  );
};

export default SimpleIndicatorTest;

