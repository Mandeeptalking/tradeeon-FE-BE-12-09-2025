import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import TradingConfiguration from '../components/TradingConfiguration';
import MainConditionBuilder from '../components/MainConditionBuilder';
import CleanCharts from './CleanCharts';
import { 
  BarChart3, 
  Settings, 
  Play, 
  Pause, 
  Save, 
  Eye,
  Zap,
  Target,
  Filter,
  Maximize2,
  Minimize2
} from 'lucide-react';

export default function VisualStrategyBuilder() {
  const [selectedPairs, setSelectedPairs] = useState(['BTCUSDT']);
  const [selectedExchanges, setSelectedExchanges] = useState(['Binance']);
  const [selectedMarkets, setSelectedMarkets] = useState(['Spot']);
  const [selectedPositionTypes, setSelectedPositionTypes] = useState(['Long']);
  const [capital, setCapital] = useState(10000);
  const [tradeAmount, setTradeAmount] = useState(100);
  const [tradingConditions, setTradingConditions] = useState<any>(null);
  const [activeTab, setActiveTab] = useState('conditions');
  const [chartSymbol, setChartSymbol] = useState('BTCUSDT');
  const [isChartFullscreen, setIsChartFullscreen] = useState(false);
  const [layoutMode, setLayoutMode] = useState<'tabs' | 'split'>('tabs');

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Trading Configuration Header */}
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
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
              <BarChart3 className="w-8 h-8 text-blue-600" />
              Visual Strategy Builder
            </h1>
            <p className="text-gray-600 mt-2">
              Build trading strategies with live chart integration and visual condition creation
            </p>
          </div>
          <div className="flex gap-3">
            <Button 
              variant="outline" 
              onClick={() => setLayoutMode(layoutMode === 'tabs' ? 'split' : 'tabs')}
            >
              {layoutMode === 'tabs' ? (
                <>
                  <Maximize2 className="w-4 h-4 mr-2" />
                  Split View
                </>
              ) : (
                <>
                  <Minimize2 className="w-4 h-4 mr-2" />
                  Tab View
                </>
              )}
            </Button>
            <Button variant="outline">
              <Eye className="w-4 h-4 mr-2" />
              Preview
            </Button>
            <Button variant="outline">
              <Play className="w-4 h-4 mr-2" />
              Test
            </Button>
            <Button className="bg-blue-600 hover:bg-blue-700">
              <Save className="w-4 h-4 mr-2" />
              Save Strategy
            </Button>
          </div>
        </div>

        {/* Layout Mode Selection */}
        {layoutMode === 'split' ? (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Left Side - Condition Builder */}
            <div>
              <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <Target className="w-5 h-5 text-blue-600" />
                Condition Builder
              </h3>
              <MainConditionBuilder onConditionsChange={setTradingConditions} />
            </div>
            
            {/* Right Side - Live Chart */}
            <div>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold flex items-center gap-2">
                  <BarChart3 className="w-5 h-5 text-blue-600" />
                  Live Chart
                </h3>
                <div className="flex items-center gap-2">
                  <select
                    value={chartSymbol}
                    onChange={(e) => setChartSymbol(e.target.value)}
                    className="px-3 py-1 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    {selectedPairs.map(pair => (
                      <option key={pair} value={pair}>{pair}</option>
                    ))}
                  </select>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setIsChartFullscreen(!isChartFullscreen)}
                  >
                    {isChartFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
                  </Button>
                </div>
              </div>
              <div className={`${isChartFullscreen ? 'fixed inset-0 z-50 bg-white' : 'relative'}`}>
                {isChartFullscreen && (
                  <div className="absolute top-4 right-4 z-10">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setIsChartFullscreen(false)}
                    >
                      <Minimize2 className="w-4 h-4 mr-1" />
                      Exit Fullscreen
                    </Button>
                  </div>
                )}
                <div className={`${isChartFullscreen ? 'h-screen p-4' : 'h-96 border rounded-lg'}`}>
                  <CleanCharts />
                </div>
              </div>
            </div>
          </div>
        ) : (
          /* Main Tabs */
          <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="conditions">Condition Builder</TabsTrigger>
              <TabsTrigger value="charts">Live Charts</TabsTrigger>
              <TabsTrigger value="testing">Strategy Testing</TabsTrigger>
            </TabsList>

          <TabsContent value="conditions" className="space-y-6">
            {/* Visual Condition Builder */}
            <VisualConditionBuilder onConditionsChange={setTradingConditions} />
          </TabsContent>

          <TabsContent value="charts" className="space-y-6">
            {/* Live Chart Integration */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2">
                    <BarChart3 className="w-5 h-5 text-blue-600" />
                    Live Chart with Indicators
                  </CardTitle>
                  <div className="flex items-center gap-2">
                    <select
                      value={chartSymbol}
                      onChange={(e) => setChartSymbol(e.target.value)}
                      className="px-3 py-1 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      {selectedPairs.map(pair => (
                        <option key={pair} value={pair}>{pair}</option>
                      ))}
                    </select>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setIsChartFullscreen(!isChartFullscreen)}
                    >
                      {isChartFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className={`${isChartFullscreen ? 'fixed inset-0 z-50 bg-white' : 'relative'}`}>
                  {isChartFullscreen && (
                    <div className="absolute top-4 right-4 z-10">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setIsChartFullscreen(false)}
                      >
                        <Minimize2 className="w-4 h-4 mr-1" />
                        Exit Fullscreen
                      </Button>
                    </div>
                  )}
                  <div className={`${isChartFullscreen ? 'h-screen p-4' : 'h-96'}`}>
                    <CleanCharts />
                  </div>
                </div>
              </CardContent>
            </Card>
            
            {/* Chart Features Info */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Chart Features</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                  <div className="bg-blue-50 p-4 rounded border border-blue-200">
                    <Target className="w-6 h-6 mb-2 text-blue-600" />
                    <p className="font-medium text-blue-800">Add Indicators</p>
                    <p className="text-blue-600">Click the indicators button to add technical indicators to the chart</p>
                  </div>
                  <div className="bg-green-50 p-4 rounded border border-green-200">
                    <Filter className="w-6 h-6 mb-2 text-green-600" />
                    <p className="font-medium text-green-800">Visual Conditions</p>
                    <p className="text-green-600">Build conditions based on the indicators shown on the chart</p>
                  </div>
                  <div className="bg-purple-50 p-4 rounded border border-purple-200">
                    <Zap className="w-6 h-6 mb-2 text-purple-600" />
                    <p className="font-medium text-purple-800">Real-time Data</p>
                    <p className="text-purple-600">Live market data with real-time indicator calculations</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="testing" className="space-y-6">
            {/* Strategy Testing */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Settings className="w-5 h-5 text-purple-600" />
                  Strategy Testing & Backtesting
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="bg-gray-100 rounded-lg p-8 text-center">
                  <Settings className="w-16 h-16 mx-auto mb-4 text-gray-400" />
                  <h3 className="text-lg font-semibold text-gray-700 mb-2">
                    Strategy Testing Coming Soon
                  </h3>
                  <p className="text-gray-600 mb-4">
                    Backtest your strategies with historical data and optimize parameters
                  </p>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-gray-600">
                    <div className="bg-white p-3 rounded border">
                      <p className="font-medium">Historical Backtesting</p>
                      <p>Test strategies on past data</p>
                    </div>
                    <div className="bg-white p-3 rounded border">
                      <p className="font-medium">Performance Analytics</p>
                      <p>Detailed performance metrics</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
          </Tabs>
        )}

        {/* Current Strategy Summary */}
        {tradingConditions && (
          <Card className="mt-6">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Target className="w-5 h-5 text-blue-600" />
                Current Strategy Summary
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-red-50 p-3 rounded border border-red-200">
                  <h4 className="font-medium text-red-800 mb-1">Primary Conditions</h4>
                  <p className="text-2xl font-bold text-red-600">
                    {tradingConditions?.primaryConditions?.length || 0}
                  </p>
                  <p className="text-sm text-red-600">Entry Triggers</p>
                </div>
                <div className="bg-green-50 p-3 rounded border border-green-200">
                  <h4 className="font-medium text-green-800 mb-1">Supporting Conditions</h4>
                  <p className="text-2xl font-bold text-green-600">
                    {tradingConditions?.supportingConditions?.length || 0}
                  </p>
                  <p className="text-sm text-green-600">Filters</p>
                </div>
                <div className="bg-blue-50 p-3 rounded border border-blue-200">
                  <h4 className="font-medium text-blue-800 mb-1">Logic</h4>
                  <p className="text-2xl font-bold text-blue-600">
                    {tradingConditions?.logicOperator || 'AND'}
                  </p>
                  <p className="text-sm text-blue-600">Operator</p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
