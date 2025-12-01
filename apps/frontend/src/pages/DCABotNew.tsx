import React from 'react';

const DCABotNew = () => {
  return (
    <div className="min-h-full w-full bg-gray-50 dark:bg-gray-900 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
            DCA Bot New - Test Page
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mb-4">
            This is a test page to verify that the routing and rendering works correctly.
          </p>
          <div className="bg-blue-100 dark:bg-blue-900/30 border border-blue-300 dark:border-blue-700 rounded-lg p-4">
            <p className="text-blue-800 dark:text-blue-300 font-medium">
              ✅ If you can see this, the page is rendering correctly!
            </p>
          </div>
          <div className="mt-4 space-y-2">
            <div className="bg-green-100 dark:bg-green-900/30 border border-green-300 dark:border-green-700 rounded-lg p-3">
              <p className="text-green-800 dark:text-green-300 text-sm">
                Test Item 1: Basic content rendering
              </p>
            </div>
            <div className="bg-yellow-100 dark:bg-yellow-900/30 border border-yellow-300 dark:border-yellow-700 rounded-lg p-3">
              <p className="text-yellow-800 dark:text-yellow-300 text-sm">
                Test Item 2: Dark mode support
              </p>
            </div>
            <div className="bg-purple-100 dark:bg-purple-900/30 border border-purple-300 dark:border-purple-700 rounded-lg p-3">
              <p className="text-purple-800 dark:text-purple-300 text-sm">
                Test Item 3: Layout structure
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DCABotNew;

