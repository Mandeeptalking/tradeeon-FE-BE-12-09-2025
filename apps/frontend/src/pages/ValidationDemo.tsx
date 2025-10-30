import React, { useState } from 'react';
import { 
  validateCandle, 
  validateIndicatorSpec, 
  validateIndicatorInstanceMeta, 
  validateIndicatorUpdate,
  validateBatch
} from '../contracts/validation';

const ValidationDemo: React.FC = () => {
  const [testResults, setTestResults] = useState<Array<{
    name: string;
    success: boolean;
    error?: string;
    data?: any;
  }>>([]);

  const runValidationTests = () => {
    const results: Array<{
      name: string;
      success: boolean;
      error?: string;
      data?: any;
    }> = [];

    // Test 1: Valid Candle
    const validCandle = {
      t: Math.floor(Date.now() / 1000),
      o: 100.0,
      h: 105.0,
      l: 95.0,
      c: 102.0,
      v: 1000,
      f: true
    };
    const candleResult = validateCandle(validCandle);
    results.push({
      name: 'Valid Candle',
      success: candleResult.success,
      error: candleResult.error,
      data: candleResult.data
    });

    // Test 2: Invalid Candle (high < open)
    const invalidCandle = {
      t: Math.floor(Date.now() / 1000),
      o: 100.0,
      h: 90.0, // Invalid: high < open
      l: 95.0,
      c: 102.0,
      v: 1000,
      f: true
    };
    const invalidCandleResult = validateCandle(invalidCandle);
    results.push({
      name: 'Invalid Candle (high < open)',
      success: invalidCandleResult.success,
      error: invalidCandleResult.error
    });

    // Test 3: Valid Indicator Spec
    const validSpec = {
      id: 'rsi_14:close@15m',
      name: 'RSI',
      inputs: { period: 14, source: 'close' },
      timeframe: '15m',
      pane: 'new' as const,
      style: { color: '#ff0000' },
      version: '1.0.0'
    };
    const specResult = validateIndicatorSpec(validSpec);
    results.push({
      name: 'Valid Indicator Spec',
      success: specResult.success,
      error: specResult.error,
      data: specResult.data
    });

    // Test 4: Invalid Indicator Spec (wrong timeframe)
    const invalidSpec = {
      id: 'rsi_14:close@15m',
      name: 'RSI',
      inputs: { period: 14, source: 'close' },
      timeframe: '2m', // Invalid timeframe
      pane: 'new' as const
    };
    const invalidSpecResult = validateIndicatorSpec(invalidSpec);
    results.push({
      name: 'Invalid Indicator Spec (wrong timeframe)',
      success: invalidSpecResult.success,
      error: invalidSpecResult.error
    });

    // Test 5: Valid Indicator Instance Meta
    const validMeta = {
      id: 'rsi_14:close@15m',
      outputsMeta: [
        {
          key: 'rsi',
          type: 'line' as const,
          overlay: false,
          levels: [30, 50, 70]
        }
      ],
      warmup: 14,
      defaultPane: 'new' as const
    };
    const metaResult = validateIndicatorInstanceMeta(validMeta);
    results.push({
      name: 'Valid Indicator Instance Meta',
      success: metaResult.success,
      error: metaResult.error,
      data: metaResult.data
    });

    // Test 6: Valid Indicator Update
    const validUpdate = {
      id: 'rsi_14:close@15m',
      points: [
        {
          t: Math.floor(Date.now() / 1000),
          values: { rsi: 65.5 },
          status: 'final' as const
        },
        {
          t: Math.floor(Date.now() / 1000) + 60,
          values: { rsi: 67.2 },
          status: 'final' as const
        }
      ]
    };
    const updateResult = validateIndicatorUpdate(validUpdate);
    results.push({
      name: 'Valid Indicator Update',
      success: updateResult.success,
      error: updateResult.error,
      data: updateResult.data
    });

    // Test 7: Batch Validation
    const batchCandles = [
      {
        t: Math.floor(Date.now() / 1000),
        o: 100.0,
        h: 105.0,
        l: 95.0,
        c: 102.0,
        v: 1000,
        f: true
      },
      {
        t: Math.floor(Date.now() / 1000) + 60,
        o: 102.0,
        h: 108.0,
        l: 98.0,
        c: 106.0,
        v: 1200,
        f: true
      },
      {
        t: Math.floor(Date.now() / 1000) + 120,
        o: 106.0,
        h: 90.0, // Invalid: high < open
        l: 104.0,
        c: 108.0,
        v: 800,
        f: true
      }
    ];
    const batchResult = validateBatch(validateCandle, batchCandles);
    results.push({
      name: 'Batch Validation (3 candles, 1 invalid)',
      success: batchResult.valid.length === 2 && batchResult.invalid.length === 1,
      error: batchResult.invalid.length > 0 ? `Invalid items: ${batchResult.invalid.map(i => `Index ${i.index}: ${i.error}`).join(', ')}` : undefined,
      data: { valid: batchResult.valid.length, invalid: batchResult.invalid.length }
    });

    setTestResults(results);
  };

  return (
    <div className="min-h-screen bg-white p-6">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">Zod Validation Demo</h1>
        
        <div className="mb-8">
          <button
            onClick={runValidationTests}
            className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Run Validation Tests
          </button>
        </div>

        {testResults.length > 0 && (
          <div className="space-y-4">
            <h2 className="text-2xl font-semibold text-gray-800 mb-4">Test Results</h2>
            
            {testResults.map((result, index) => (
              <div
                key={index}
                className={`p-4 rounded-lg border-2 ${
                  result.success 
                    ? 'bg-green-50 border-green-200' 
                    : 'bg-red-50 border-red-200'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-lg font-medium text-gray-900">{result.name}</h3>
                  <span
                    className={`px-3 py-1 rounded-full text-sm font-medium ${
                      result.success
                        ? 'bg-green-100 text-green-800'
                        : 'bg-red-100 text-red-800'
                    }`}
                  >
                    {result.success ? 'PASS' : 'FAIL'}
                  </span>
                </div>
                
                {result.error && (
                  <div className="mt-2 p-3 bg-red-100 border border-red-300 rounded text-red-700">
                    <strong>Error:</strong> {result.error}
                  </div>
                )}
                
                {result.data && (
                  <div className="mt-2 p-3 bg-gray-100 border border-gray-300 rounded">
                    <strong>Data:</strong>
                    <pre className="mt-1 text-sm text-gray-700 overflow-x-auto">
                      {JSON.stringify(result.data, null, 2)}
                    </pre>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        <div className="mt-12 bg-gray-50 p-6 rounded-lg">
          <h2 className="text-xl font-semibold text-gray-800 mb-4">Zod Validation Features</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h3 className="text-lg font-medium text-gray-700 mb-2">✅ What's Validated</h3>
              <ul className="space-y-1 text-sm text-gray-600">
                <li>• Candle data (OHLCV + timestamps)</li>
                <li>• Indicator specifications</li>
                <li>• Indicator instance metadata</li>
                <li>• Indicator data points</li>
                <li>• Indicator updates</li>
                <li>• Batch validation</li>
              </ul>
            </div>
            <div>
              <h3 className="text-lg font-medium text-gray-700 mb-2">🔍 Validation Rules</h3>
              <ul className="space-y-1 text-sm text-gray-600">
                <li>• High ≥ max(open, close)</li>
                <li>• Low ≤ min(open, close)</li>
                <li>• Positive timestamps & prices</li>
                <li>• Valid timeframes & panes</li>
                <li>• Proper enum values</li>
                <li>• Required fields present</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ValidationDemo;

