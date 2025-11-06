import { useState, useEffect } from 'react';
import { Plus, Edit2, Trash2, CheckCircle, X } from 'lucide-react';
import { authenticatedFetch } from '../../lib/api/auth';

const API_BASE_URL = import.meta.env.VITE_API_URL || import.meta.env.VITE_API_BASE || 'https://api.tradeeon.com';

interface Connection {
  id: string;
  exchange: string;
  apiKey: string;
  apiSecret: string;
  status: 'connected' | 'disconnected';
}

const ConnectionsTest = () => {
  const [connections, setConnections] = useState<Connection[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    exchange: '',
    apiKey: '',
    apiSecret: '',
  });

  useEffect(() => {
    loadConnections();
  }, []);

  const loadConnections = async () => {
    setLoading(true);
    try {
      const response = await authenticatedFetch(`${API_BASE_URL}/connections`, {
        method: 'GET',
      });
      
      if (response.ok) {
        const data = await response.json();
        if (Array.isArray(data) && data.length > 0) {
          setConnections(data);
        }
      }
    } catch (err) {
      console.log('API not available:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleConnect = async () => {
    if (!formData.exchange || !formData.apiKey || !formData.apiSecret) {
      alert('Please fill in all fields');
      return;
    }

    setLoading(true);
    try {
      // Test connection first
      const testResponse = await authenticatedFetch(`${API_BASE_URL}/connections/test`, {
        method: 'POST',
        body: JSON.stringify({
          exchange: formData.exchange.toUpperCase(),
          api_key: formData.apiKey,
          api_secret: formData.apiSecret,
        }),
      });

      const testResult = await testResponse.json();
      if (!testResult.ok) {
        alert(`Connection failed: ${testResult.message || testResult.code}`);
        return;
      }

      // Save connection
      const saveResponse = await authenticatedFetch(`${API_BASE_URL}/connections`, {
        method: 'POST',
        body: JSON.stringify({
          exchange: formData.exchange.toUpperCase(),
          api_key: formData.apiKey,
          api_secret: formData.apiSecret,
          nickname: formData.exchange,
        }),
      });

      if (saveResponse.ok) {
        const newConnection = await saveResponse.json();
        setConnections([...connections, {
          id: newConnection.id || Date.now().toString(),
          exchange: formData.exchange.toUpperCase(),
          apiKey: formData.apiKey.substring(0, 8) + '...',
          apiSecret: '••••••••',
          status: 'connected',
        }]);
        setFormData({ exchange: '', apiKey: '', apiSecret: '' });
        setShowForm(false);
        alert('✅ Connection saved successfully!');
        loadConnections(); // Reload to get from server
      } else {
        throw new Error('Failed to save');
      }
    } catch (err) {
      alert('❌ Failed to save connection');
    } finally {
      setLoading(false);
    }
  };

  const handleDisconnect = async (connectionId: string) => {
    if (!confirm('Are you sure you want to disconnect this exchange?')) {
      return;
    }

    try {
      const response = await authenticatedFetch(`${API_BASE_URL}/connections/${connectionId}`, {
        method: 'DELETE',
      });
      if (response.ok) {
        setConnections(connections.filter(c => c.id !== connectionId));
        alert('✅ Connection disconnected');
      }
    } catch (err) {
      alert('❌ Failed to disconnect');
    }
  };

  return (
    <div style={{ padding: '40px', backgroundColor: '#f0f0f0', minHeight: '100vh' }}>
      <h1 style={{ fontSize: '32px', color: '#000', marginBottom: '20px' }}>
        Exchange Connections
      </h1>
      
      {!showForm && (
        <button
          onClick={() => setShowForm(true)}
          style={{ padding: '10px 20px', backgroundColor: '#0066cc', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', marginBottom: '20px' }}
        >
          <Plus style={{ display: 'inline', marginRight: '8px' }} />
          Connect Exchange
        </button>
      )}

      {showForm && (
        <div style={{ padding: '20px', backgroundColor: '#fff', borderRadius: '8px', maxWidth: '600px', marginBottom: '20px' }}>
          <h2 style={{ marginBottom: '15px' }}>Connect Exchange</h2>
          <input
            type="text"
            placeholder="Exchange Name (e.g., BINANCE)"
            value={formData.exchange}
            onChange={(e) => setFormData({ ...formData, exchange: e.target.value })}
            style={{ width: '100%', padding: '10px', marginBottom: '10px', border: '1px solid #ccc', borderRadius: '4px' }}
          />
          <input
            type="text"
            placeholder="API Key"
            value={formData.apiKey}
            onChange={(e) => setFormData({ ...formData, apiKey: e.target.value })}
            style={{ width: '100%', padding: '10px', marginBottom: '10px', border: '1px solid #ccc', borderRadius: '4px' }}
          />
          <input
            type="password"
            placeholder="API Secret"
            value={formData.apiSecret}
            onChange={(e) => setFormData({ ...formData, apiSecret: e.target.value })}
            style={{ width: '100%', padding: '10px', marginBottom: '10px', border: '1px solid #ccc', borderRadius: '4px' }}
          />
          <div style={{ display: 'flex', gap: '10px' }}>
            <button
              onClick={handleConnect}
              disabled={loading}
              style={{ padding: '10px 20px', backgroundColor: '#0066cc', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', flex: 1 }}
            >
              {loading ? 'Connecting...' : 'Connect'}
            </button>
            <button
              onClick={() => { setShowForm(false); setFormData({ exchange: '', apiKey: '', apiSecret: '' }); }}
              style={{ padding: '10px 20px', backgroundColor: '#ccc', color: '#000', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {connections.length === 0 ? (
        <div style={{ padding: '40px', backgroundColor: '#fff', borderRadius: '8px', maxWidth: '600px', textAlign: 'center' }}>
          <p>No connections yet. Connect your first exchange to get started.</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {connections.map((connection) => (
            <div key={connection.id} style={{ padding: '20px', backgroundColor: '#fff', borderRadius: '8px', maxWidth: '600px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h3 style={{ margin: 0 }}>{connection.exchange}</h3>
                <p style={{ margin: '5px 0', color: '#666', fontSize: '14px' }}>
                  API Key: {connection.apiKey} | Status: {connection.status}
                </p>
              </div>
              <button
                onClick={() => handleDisconnect(connection.id)}
                style={{ padding: '8px 16px', backgroundColor: '#dc2626', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
              >
                <Trash2 style={{ display: 'inline', marginRight: '4px' }} />
                Disconnect
              </button>
            </div>
          ))}
        </div>
      )}

      <div style={{ marginTop: '20px', padding: '20px', backgroundColor: '#e8f4f8', borderRadius: '8px', maxWidth: '600px' }}>
        <p style={{ margin: 0, color: '#0066cc' }}>
          <strong>API URL:</strong> {API_BASE_URL}
        </p>
      </div>
    </div>
  );
};

export default ConnectionsTest;

