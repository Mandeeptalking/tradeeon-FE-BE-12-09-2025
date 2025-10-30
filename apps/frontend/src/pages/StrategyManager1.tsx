import React, { useState } from 'react';
import TradingConfiguration from '../components/TradingConfiguration';
import MainConditionBuilder from '../components/MainConditionBuilder';

export default function StrategyManager1() {
  const [selectedPairs, setSelectedPairs] = useState(['BTCUSDT']);
  const [selectedExchanges, setSelectedExchanges] = useState(['Binance']);
  const [selectedMarkets, setSelectedMarkets] = useState(['Spot']);
  const [selectedPositionTypes, setSelectedPositionTypes] = useState(['Long']);
  const [capital, setCapital] = useState(10000);
  const [tradeAmount, setTradeAmount] = useState(100);
  const [mainCondition, setMainCondition] = useState<any>(null);

  return (
    <div>
      {/* Trading Configuration Component */}
      <TradingConfiguration
        selectedPairs={selectedPairs}
        selectedExchanges={selectedExchanges}
        selectedMarkets={selectedMarkets}
        selectedPositionTypes={selectedPositionTypes}
        capital={capital}
        tradeAmount={tradeAmount}
        onPairsChange={setSelectedPairs}
        onExchangesChange={setSelectedExchanges}
        onMarketsChange={setSelectedMarkets}
        onPositionTypesChange={setSelectedPositionTypes}
        onCapitalChange={setCapital}
        onTradeAmountChange={setTradeAmount}
      />

      {/* Main Content */}
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold">Strategy Manager</h1>
            <p className="text-gray-600 mt-2">Manage your trading strategies</p>
          </div>
        </div>

        {/* Main Condition Builder */}
        <div className="mb-6">
          <MainConditionBuilder onConditionChange={setMainCondition} />
        </div>

        {/* Debug info to show selected values */}
        <div className="bg-gray-50 rounded-lg p-4">
          <h3 className="font-semibold mb-2">Current Selection:</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div>
              <p><strong>Pairs:</strong> {selectedPairs.join(', ')}</p>
              <p><strong>Exchanges:</strong> {selectedExchanges.join(', ')}</p>
              <p><strong>Markets:</strong> {selectedMarkets.join(', ')}</p>
              <p><strong>Position Types:</strong> {selectedPositionTypes.join(', ')}</p>
            </div>
            <div>
              <p><strong>Capital:</strong> ${capital.toLocaleString()}</p>
              <p><strong>Trade Amount:</strong> ${tradeAmount}</p>
              {mainCondition && (
                <p><strong>Main Condition:</strong> {mainCondition?.description || 'No condition set'}</p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
