import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { 
  Plus, 
  Edit, 
  Trash2, 
  Play, 
  Pause, 
  Settings,
  BarChart3,
  TrendingUp,
  Calendar,
  DollarSign
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import { StrategyManager as StrategyEngine, Strategy } from '../lib/strategyEngine';
import { EXAMPLE_STRATEGIES } from '../lib/exampleStrategies';
import StrategyBuilder from './StrategyBuilder';
import StrategyLibrary from './StrategyLibrary';

export default function StrategyManager() {
  const [activeTab, setActiveTab] = useState('library');
  const [strategies, setStrategies] = useState<Strategy[]>([]);
  const [selectedStrategy, setSelectedStrategy] = useState<Strategy | null>(null);
  const [showBuilder, setShowBuilder] = useState(false);
  const [editingStrategy, setEditingStrategy] = useState<Strategy | null>(null);

  // Initialize with example strategies
  useEffect(() => {
    const manager = new StrategyEngine();
    EXAMPLE_STRATEGIES.forEach(strategy => {
      manager.addStrategy(strategy);
    });
    setStrategies(manager.getAllStrategies());
  }, []);

  const handleLoadFromLibrary = (strategy: Strategy) => {
    const manager = new StrategyEngine();
    strategies.forEach(s => manager.addStrategy(s));
    
    // Create a copy with new ID
    const newStrategy = {
      ...strategy,
      id: `strategy_${Date.now()}`,
      name: `${strategy.name} (Copy)`,
      is_active: false,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    
    manager.addStrategy(newStrategy);
    setStrategies(manager.getAllStrategies());
    toast.success(`Loaded strategy: ${newStrategy.name}`);
  };

  const handleCreateNew = () => {
    const newStrategy: Strategy = {
      id: `strategy_${Date.now()}`,
      name: 'New Strategy',
      description: '',
      symbol: 'BTCUSDT',
      timeframe: '4h',
      conditions: [],
      entry_actions: [],
      exit_actions: [],
      risk_management: {
        stop_loss: 2,
        take_profit: 4,
        max_position_size: 100,
        max_daily_trades: 10
      },
      is_active: false,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    
    setEditingStrategy(newStrategy);
    setShowBuilder(true);
    setActiveTab('builder');
  };

  const handleEditStrategy = (strategy: Strategy) => {
    setEditingStrategy(strategy);
    setShowBuilder(true);
    setActiveTab('builder');
  };

  const handleDeleteStrategy = (strategyId: string) => {
    if (window.confirm('Are you sure you want to delete this strategy?')) {
      const manager = new StrategyEngine();
      strategies.forEach(s => {
        if (s.id !== strategyId) {
          manager.addStrategy(s);
        }
      });
      setStrategies(manager.getAllStrategies());
      toast.success('Strategy deleted successfully');
    }
  };

  const handleToggleStrategy = (strategyId: string) => {
    const manager = new StrategyEngine();
    strategies.forEach(s => manager.addStrategy(s));
    
    const strategy = manager.getStrategy(strategyId);
    if (strategy) {
      manager.updateStrategy(strategyId, { is_active: !strategy.is_active });
      setStrategies(manager.getAllStrategies());
      toast.success(`Strategy ${strategy.is_active ? 'deactivated' : 'activated'}`);
    }
  };

  const handleSaveStrategy = (strategy: Strategy) => {
    const manager = new StrategyEngine();
    strategies.forEach(s => manager.addStrategy(s));
    
    if (editingStrategy) {
      // Update existing
      manager.updateStrategy(strategy.id, strategy);
      toast.success('Strategy updated successfully');
    } else {
      // Add new
      manager.addStrategy(strategy);
      toast.success('Strategy created successfully');
    }
    
    setStrategies(manager.getAllStrategies());
    setShowBuilder(false);
    setEditingStrategy(null);
    setActiveTab('my-strategies');
  };

  const handleCloseBuilder = () => {
    setShowBuilder(false);
    setEditingStrategy(null);
    setActiveTab('my-strategies');
  };

  const activeStrategies = strategies.filter(s => s.is_active);
  const inactiveStrategies = strategies.filter(s => !s.is_active);

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Strategy Manager</h1>
          <p className="text-gray-600 mt-2">Create, manage, and monitor your trading strategies</p>
        </div>
        <Button onClick={handleCreateNew}>
          <Plus className="w-4 h-4 mr-2" />
          New Strategy
        </Button>
      </div>

      {/* Strategy Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Strategies</p>
                <p className="text-2xl font-bold">{strategies.length}</p>
              </div>
              <BarChart3 className="h-8 w-8 text-gray-400" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Active Strategies</p>
                <p className="text-2xl font-bold text-green-600">{activeStrategies.length}</p>
              </div>
              <TrendingUp className="h-8 w-8 text-gray-400" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Inactive Strategies</p>
                <p className="text-2xl font-bold text-gray-600">{inactiveStrategies.length}</p>
              </div>
              <Pause className="h-8 w-8 text-gray-400" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Example Strategies</p>
                <p className="text-2xl font-bold text-blue-600">{EXAMPLE_STRATEGIES.length}</p>
              </div>
              <Calendar className="h-8 w-8 text-gray-400" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content */}
      {showBuilder ? (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-bold">
              {editingStrategy ? 'Edit Strategy' : 'Create New Strategy'}
            </h2>
            <Button variant="outline" onClick={handleCloseBuilder}>
              Close Builder
            </Button>
          </div>
          <StrategyBuilder 
            initialStrategy={editingStrategy}
            onSave={handleSaveStrategy}
            onCancel={handleCloseBuilder}
          />
        </div>
      ) : (
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="library">Strategy Library</TabsTrigger>
            <TabsTrigger value="my-strategies">My Strategies</TabsTrigger>
            <TabsTrigger value="active">Active Strategies</TabsTrigger>
          </TabsList>

          {/* Strategy Library Tab */}
          <TabsContent value="library" className="space-y-4">
            <StrategyLibrary onLoadStrategy={handleLoadFromLibrary} />
          </TabsContent>

          {/* My Strategies Tab */}
          <TabsContent value="my-strategies" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {strategies.map((strategy) => (
                <Card key={strategy.id} className="hover:shadow-lg transition-shadow">
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div>
                        <CardTitle className="text-lg">{strategy.name}</CardTitle>
                        <div className="flex items-center gap-2 mt-2">
                          <Badge variant="outline">{strategy.symbol}</Badge>
                          <Badge variant="outline">{strategy.timeframe}</Badge>
                          <Badge variant={strategy.is_active ? 'default' : 'secondary'}>
                            {strategy.is_active ? 'Active' : 'Inactive'}
                          </Badge>
                        </div>
                      </div>
                    </div>
                  </CardHeader>
                  
                  <CardContent className="space-y-4">
                    <p className="text-sm text-gray-600 line-clamp-2">
                      {strategy.description || 'No description provided'}
                    </p>
                    
                    {/* Strategy Stats */}
                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-gray-600">Conditions</span>
                        <span className="font-medium">{strategy.conditions.length}</span>
                      </div>
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-gray-600">Stop Loss</span>
                        <span className="font-medium">{strategy.risk_management.stop_loss}%</span>
                      </div>
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-gray-600">Take Profit</span>
                        <span className="font-medium">{strategy.risk_management.take_profit}%</span>
                      </div>
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-gray-600">Created</span>
                        <span className="font-medium">
                          {new Date(strategy.created_at).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                    
                    {/* Action Buttons */}
                    <div className="flex gap-2 pt-2">
                      <Button 
                        size="sm" 
                        variant="outline"
                        onClick={() => handleToggleStrategy(strategy.id)}
                        className="flex-1"
                      >
                        {strategy.is_active ? (
                          <>
                            <Pause className="w-4 h-4 mr-1" />
                            Deactivate
                          </>
                        ) : (
                          <>
                            <Play className="w-4 h-4 mr-1" />
                            Activate
                          </>
                        )}
                      </Button>
                      <Button 
                        size="sm" 
                        variant="outline"
                        onClick={() => handleEditStrategy(strategy)}
                      >
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button 
                        size="sm" 
                        variant="outline"
                        onClick={() => handleDeleteStrategy(strategy.id)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
            
            {strategies.length === 0 && (
              <Card>
                <CardContent className="text-center py-12">
                  <Settings className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-gray-600 mb-2">No strategies created yet</h3>
                  <p className="text-gray-500 mb-4">Start by loading a strategy from the library or creating a new one</p>
                  <Button onClick={handleCreateNew}>
                    <Plus className="w-4 h-4 mr-2" />
                    Create Your First Strategy
                  </Button>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* Active Strategies Tab */}
          <TabsContent value="active" className="space-y-4">
            {activeStrategies.length > 0 ? (
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {activeStrategies.map((strategy) => (
                    <Card key={strategy.id} className="border-green-200 bg-green-50">
                      <CardHeader>
                        <div className="flex items-start justify-between">
                          <div>
                            <CardTitle className="text-lg text-green-900">{strategy.name}</CardTitle>
                            <div className="flex items-center gap-2 mt-2">
                              <Badge variant="default" className="bg-green-600">Active</Badge>
                              <Badge variant="outline">{strategy.symbol}</Badge>
                              <Badge variant="outline">{strategy.timeframe}</Badge>
                            </div>
                          </div>
                        </div>
                      </CardHeader>
                      
                      <CardContent className="space-y-4">
                        <p className="text-sm text-green-700">
                          {strategy.description || 'No description provided'}
                        </p>
                        
                        {/* Performance Metrics (placeholder) */}
                        <div className="space-y-2">
                          <div className="flex items-center justify-between text-sm">
                            <span className="text-green-700">Status</span>
                            <span className="font-medium text-green-600">Running</span>
                          </div>
                          <div className="flex items-center justify-between text-sm">
                            <span className="text-green-700">Trades Today</span>
                            <span className="font-medium">0</span>
                          </div>
                          <div className="flex items-center justify-between text-sm">
                            <span className="text-green-700">P&L Today</span>
                            <span className="font-medium text-green-600">$0.00</span>
                          </div>
                        </div>
                        
                        {/* Action Buttons */}
                        <div className="flex gap-2 pt-2">
                          <Button 
                            size="sm" 
                            variant="outline"
                            onClick={() => handleToggleStrategy(strategy.id)}
                            className="flex-1"
                          >
                            <Pause className="w-4 h-4 mr-1" />
                            Stop
                          </Button>
                          <Button 
                            size="sm" 
                            variant="outline"
                            onClick={() => handleEditStrategy(strategy)}
                          >
                            <Settings className="w-4 h-4" />
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            ) : (
              <Card>
                <CardContent className="text-center py-12">
                  <Play className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-gray-600 mb-2">No active strategies</h3>
                  <p className="text-gray-500 mb-4">Activate a strategy to start automated trading</p>
                  <Button onClick={() => setActiveTab('my-strategies')}>
                    View My Strategies
                  </Button>
                </CardContent>
              </Card>
            )}
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
}



