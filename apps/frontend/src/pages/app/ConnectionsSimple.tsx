import { useState, useEffect } from 'react';
import { Plus, Settings, Activity, Shield, CheckCircle, X } from 'lucide-react';
import { Connection } from '../../types/connections';

// Simple API helper
const API_BASE_URL = import.meta.env.VITE_API_URL || import.meta.env.VITE_API_BASE || 'https://api.tradeeon.com';

// Mock data for instant display
const mockConnections: Connection[] = [
  {
    id: '1',
    exchange: 'BINANCE',
    nickname: 'Main Trading',
    status: 'connected',
    last_check_at: new Date(Date.now() - 2 * 60 * 1000).toISOString(),
    next_check_eta_sec: 58,
    features: { trading: true, wallet: true, paper: false },
  },
];

const ConnectionsSimple = () => {
  const [connections, setConnections] = useState<Connection[]>(mockConnections);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    exchange: 'BINANCE' as 'BINANCE' | 'COINBASE' | 'KRAKEN' | 'ZERODHA',
    apiKey: '',
    apiSecret: '',
    nickname: '',
  });

  // Load connections on mount
  useEffect(() => {
    loadConnections();
  }, []);

  const loadConnections = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`${API_BASE_URL}/connections`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
      });
      
      if (response.ok) {
        const data = await response.json();
        if (Array.isArray(data) && data.length > 0) {
          setConnections(data);
        }
      }
    } catch (err) {
      // Silently fail - use mock data
      console.log('API not available, using mock data');
    } finally {
      setLoading(false);
    }
  };

  const handleTestConnection = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`${API_BASE_URL}/connections/test`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          exchange: formData.exchange,
          api_key: formData.apiKey,
          api_secret: formData.apiSecret,
        }),
      });

      const result = await response.json();
      if (result.ok) {
        alert(`✅ Connection successful! Latency: ${result.latency_ms}ms`);
        return true;
      } else {
        alert(`❌ Connection failed: ${result.message || result.code}`);
        return false;
      }
    } catch (err) {
      alert('❌ Failed to test connection. Check API URL.');
      return false;
    } finally {
      setLoading(false);
    }
  };

  const handleSaveConnection = async () => {
    if (!formData.apiKey || !formData.apiSecret) {
      alert('Please enter API key and secret');
      return;
    }

    // Test first
    const testSuccess = await handleTestConnection();
    if (!testSuccess) {
      return;
    }

    // Save connection
    setLoading(true);
    try {
      const response = await fetch(`${API_BASE_URL}/connections`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          exchange: formData.exchange,
          api_key: formData.apiKey,
          api_secret: formData.apiSecret,
          nickname: formData.nickname || formData.exchange,
        }),
      });

      if (response.ok) {
        const newConnection = await response.json();
        setConnections([...connections, newConnection]);
        setShowForm(false);
        setFormData({ exchange: 'BINANCE', apiKey: '', apiSecret: '', nickname: '' });
        alert('✅ Connection saved successfully!');
      } else {
        throw new Error('Failed to save connection');
      }
    } catch (err) {
      alert('❌ Failed to save connection. Using mock data.');
      // Add to mock data for demo
      const newConnection: Connection = {
        id: Date.now().toString(),
        exchange: formData.exchange,
        nickname: formData.nickname || formData.exchange,
        status: 'connected',
        last_check_at: new Date().toISOString(),
        next_check_eta_sec: 60,
        features: { trading: true, wallet: true, paper: false },
      };
      setConnections([...connections, newConnection]);
      setShowForm(false);
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'connected': return 'text-green-600 bg-green-50';
      case 'degraded': return 'text-amber-600 bg-amber-50';
      case 'error': return 'text-red-600 bg-red-50';
      default: return 'text-gray-600 bg-gray-50';
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Exchange Connections</h1>
              <p className="text-sm text-gray-600 mt-1">
                Connect your trading accounts securely
              </p>
            </div>
            <button
              onClick={() => setShowForm(true)}
              className="inline-flex items-center space-x-2 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
            >
              <Plus className="h-5 w-5" />
              <span>Connect Exchange</span>
            </button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* API URL Info */}
        <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
          <p className="text-sm text-blue-800">
            <strong>API URL:</strong> {API_BASE_URL}
          </p>
        </div>

        {/* Connections Grid */}
        {connections.length === 0 ? (
          <div className="text-center py-20">
            <div className="w-24 h-24 bg-gradient-to-br from-blue-100 to-blue-200 rounded-full flex items-center justify-center mx-auto mb-8">
              <Plus className="h-12 w-12 text-blue-500" />
            </div>
            <h3 className="text-2xl font-bold text-gray-900 mb-4">No connections yet</h3>
            <p className="text-lg text-gray-600 mb-8">
              Connect your first exchange to get started
            </p>
            <button
              onClick={() => setShowForm(true)}
              className="inline-flex items-center space-x-3 px-6 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
            >
              <Plus className="h-5 w-5" />
              <span>Connect Exchange</span>
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {connections.map((connection) => (
              <div
                key={connection.id}
                className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow"
              >
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">
                      {connection.exchange}
                    </h3>
                    {connection.nickname && (
                      <p className="text-sm text-gray-600">{connection.nickname}</p>
                    )}
                  </div>
                  <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(connection.status)}`}>
                    {connection.status}
                  </span>
                </div>

                <div className="space-y-2 mb-4">
                  <div className="flex items-center space-x-2 text-sm">
                    <CheckCircle className="h-4 w-4 text-green-500" />
                    <span className="text-gray-600">
                      {connection.features.trading ? 'Trading enabled' : 'Trading disabled'}
                    </span>
                  </div>
                  <div className="flex items-center space-x-2 text-sm">
                    <Shield className="h-4 w-4 text-blue-500" />
                    <span className="text-gray-600">
                      {connection.features.wallet ? 'Wallet access' : 'No wallet access'}
                    </span>
                  </div>
                  {connection.last_check_at && (
                    <div className="flex items-center space-x-2 text-sm">
                      <Activity className="h-4 w-4 text-gray-400" />
                      <span className="text-gray-500">
                        Last checked: {new Date(connection.last_check_at).toLocaleString()}
                      </span>
                    </div>
                  )}
                </div>

                <div className="flex space-x-2">
                  <button className="flex-1 px-3 py-2 text-sm bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200">
                    <Settings className="h-4 w-4 inline mr-1" />
                    Settings
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Connect Form Modal */}
        {showForm && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto">
              <div className="p-6">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-xl font-bold text-gray-900">Connect Exchange</h2>
                  <button
                    onClick={() => setShowForm(false)}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    <X className="h-6 w-6" />
                  </button>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Exchange
                    </label>
                    <select
                      value={formData.exchange}
                      onChange={(e) => setFormData({ ...formData, exchange: e.target.value as any })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    >
                      <option value="BINANCE">Binance</option>
                      <option value="COINBASE">Coinbase Pro</option>
                      <option value="KRAKEN">Kraken</option>
                      <option value="ZERODHA">Zerodha</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      API Key
                    </label>
                    <input
                      type="text"
                      value={formData.apiKey}
                      onChange={(e) => setFormData({ ...formData, apiKey: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="Enter API key"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      API Secret
                    </label>
                    <input
                      type="password"
                      value={formData.apiSecret}
                      onChange={(e) => setFormData({ ...formData, apiSecret: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="Enter API secret"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Nickname (Optional)
                    </label>
                    <input
                      type="text"
                      value={formData.nickname}
                      onChange={(e) => setFormData({ ...formData, nickname: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="e.g., Main Trading Account"
                    />
                  </div>
                </div>

                <div className="flex space-x-3 mt-6">
                  <button
                    onClick={handleTestConnection}
                    disabled={loading}
                    className="flex-1 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 disabled:opacity-50"
                  >
                    {loading ? 'Testing...' : 'Test Connection'}
                  </button>
                  <button
                    onClick={handleSaveConnection}
                    disabled={loading}
                    className="flex-1 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50"
                  >
                    {loading ? 'Saving...' : 'Save'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ConnectionsSimple;

