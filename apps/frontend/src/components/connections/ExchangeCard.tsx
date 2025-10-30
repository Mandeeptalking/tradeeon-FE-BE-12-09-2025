import { Connection } from '../../types/connections';
import {
  MoreVertical,
  Edit,
  RotateCcw,
  TestTube,
  Trash2,
  Shield,
  CheckCircle,
  AlertTriangle,
  XCircle,
  Pause,
  Clock,
} from 'lucide-react';
import { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import { connectionsApi } from '../../lib/api/connections';

interface ExchangeCardProps {
  connection: Connection;
  onEdit: () => void;
  onRotate: () => void;
  onTest: () => void;
  onRevoke: () => void;
  onRefresh?: () => void;
}

const ExchangeCard = ({ connection, onEdit, onRotate, onRevoke, onRefresh }: ExchangeCardProps) => {
  const [showMenu, setShowMenu] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<'success' | 'warning' | 'error' | null>(null);
  const [countdown, setCountdown] = useState(0);

  // Countdown timer for next refresh
  useEffect(() => {
    if (connection.next_check_eta_sec && connection.next_check_eta_sec > 0) {
      setCountdown(connection.next_check_eta_sec);
      const interval = setInterval(() => {
        setCountdown(prev => {
          if (prev <= 1) {
            onRefresh?.();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
      return () => clearInterval(interval);
    }
  }, [connection.next_check_eta_sec, onRefresh]);

  const handleTest = async () => {
    setIsTesting(true);
    setTestResult(null);
    
    try {
      // In a real app, we'd need to store the API credentials securely
      // For now, we'll just simulate a test
      const result = await connectionsApi.testConnection({
        exchange: connection.exchange,
        api_key: 'test',
        api_secret: 'test',
      });
      
      if (result.ok) {
        setTestResult('success');
        toast.success('Connection test successful');
      } else {
        setTestResult('error');
        toast.error(result.message || 'Connection test failed');
      }
    } catch (error) {
      setTestResult('error');
      toast.error('Connection test failed');
    } finally {
      setIsTesting(false);
      setTimeout(() => setTestResult(null), 3000);
    }
  };

  const getExchangeInfo = (exchange: string) => {
    const exchanges = {
      BINANCE: { name: 'Binance', logo: '🟡', color: 'bg-yellow-500' },
      COINBASE: { name: 'Coinbase Pro', logo: '🔵', color: 'bg-blue-500' },
      KRAKEN: { name: 'Kraken', logo: '🟣', color: 'bg-purple-500' },
      ZERODHA: { name: 'Zerodha', logo: '🟢', color: 'bg-green-500' },
    };
    return exchanges[exchange as keyof typeof exchanges] || { name: exchange, logo: '🔄', color: 'bg-gray-500' };
  };

  const getStatusInfo = (status: string) => {
    const statuses = {
      connected: { icon: CheckCircle, color: 'text-green-500', bg: 'bg-green-50', label: 'Connected' },
      degraded: { icon: AlertTriangle, color: 'text-amber-500', bg: 'bg-amber-50', label: 'Degraded' },
      error: { icon: XCircle, color: 'text-red-500', bg: 'bg-red-50', label: 'Error' },
      not_connected: { icon: Pause, color: 'text-gray-500', bg: 'bg-gray-50', label: 'Not Connected' },
    };
    return statuses[status as keyof typeof statuses] || statuses.not_connected;
  };

  const exchangeInfo = getExchangeInfo(connection.exchange);
  const statusInfo = getStatusInfo(connection.status);

  const formatTimeAgo = (timestamp?: string) => {
    if (!timestamp) return 'Never';
    const now = new Date();
    const past = new Date(timestamp);
    const diffMs = now.getTime() - past.getTime();
    const diffMins = Math.floor(diffMs / (1000 * 60));
    
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    const diffDays = Math.floor(diffHours / 24);
    return `${diffDays}d ago`;
  };

  const formatNextCheck = (etaSec?: number) => {
    if (!etaSec) return 'Unknown';
    if (etaSec < 60) return `~${etaSec}s`;
    const mins = Math.floor(etaSec / 60);
    return `~${mins}m`;
  };

  return (
    <div className="bg-white rounded-2xl border border-gray-200 hover:border-gray-300 hover:shadow-xl transition-all duration-300 overflow-hidden group">
      {/* Header */}
      <div className={`${exchangeInfo.color} p-6 text-white relative group-hover:shadow-lg transition-all duration-300`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="text-2xl">{exchangeInfo.logo}</div>
            <div>
              <h3 className="font-semibold text-lg">{exchangeInfo.name}</h3>
              {connection.nickname && (
                <p className="text-sm opacity-90">{connection.nickname}</p>
              )}
            </div>
          </div>
          <div className="relative">
            <button
              onClick={() => setShowMenu(!showMenu)}
              className="p-1.5 hover:bg-white/20 rounded-lg transition-colors"
            >
              <MoreVertical className="h-4 w-4" />
            </button>
            {showMenu && (
              <div className="absolute right-0 top-10 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-10 min-w-[160px]">
                <button
                  onClick={() => { onEdit(); setShowMenu(false); }}
                  className="w-full flex items-center space-x-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
                >
                  <Edit className="h-4 w-4" />
                  <span>Edit</span>
                </button>
                <button
                  onClick={() => { onRotate(); setShowMenu(false); }}
                  className="w-full flex items-center space-x-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
                >
                  <RotateCcw className="h-4 w-4" />
                  <span>Rotate Keys</span>
                </button>
                <button
                  onClick={() => { handleTest(); setShowMenu(false); }}
                  disabled={isTesting}
                  className="w-full flex items-center space-x-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                >
                  <TestTube className="h-4 w-4" />
                  <span>{isTesting ? 'Testing...' : 'Test Connection'}</span>
                </button>
                <hr className="my-1" />
                <button
                  onClick={() => { onRevoke(); setShowMenu(false); }}
                  className="w-full flex items-center space-x-2 px-3 py-2 text-sm text-red-600 hover:bg-red-50"
                >
                  <Trash2 className="h-4 w-4" />
                  <span>Revoke</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="p-6 space-y-4">
        {/* Status */}
        <div className="flex items-center justify-between">
          <div className={`flex items-center space-x-2 px-2 py-1 rounded-full ${statusInfo.bg}`}>
            <statusInfo.icon className={`h-3 w-3 ${statusInfo.color}`} />
            <span className={`text-xs font-medium ${statusInfo.color}`}>
              {statusInfo.label}
            </span>
            {testResult && (
              <div className={`ml-2 ${
                testResult === 'success' ? 'text-green-500' : 
                testResult === 'warning' ? 'text-amber-500' : 'text-red-500'
              }`}>
                {testResult === 'success' ? '✅' : testResult === 'warning' ? '⚠️' : '❌'}
              </div>
            )}
          </div>
          {connection.notes && (
            <div className="flex items-center space-x-1 text-xs text-amber-600" title={connection.notes}>
              <AlertTriangle className="h-3 w-3" />
              <span className="truncate max-w-20">{connection.notes}</span>
            </div>
          )}
        </div>

        {/* Features */}
        <div className="flex flex-wrap gap-2">
          {connection.features.trading && (
            <span className="px-2 py-1 bg-green-100 text-green-700 text-xs font-medium rounded-full">
              Trading
            </span>
          )}
          {connection.features.wallet && (
            <span className="px-2 py-1 bg-blue-100 text-blue-700 text-xs font-medium rounded-full">
              Wallet
            </span>
          )}
          {connection.features.paper && (
            <span className="px-2 py-1 bg-purple-100 text-purple-700 text-xs font-medium rounded-full">
              Paper
            </span>
          )}
        </div>

        {/* Status Info */}
        {connection.status !== 'not_connected' && (
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs text-gray-500">
              <span>Last check:</span>
              <span>{formatTimeAgo(connection.last_check_at)}</span>
            </div>
            <div className="flex items-center justify-between text-xs text-gray-500">
              <span>Next refresh:</span>
              <div className="flex items-center space-x-1">
                {countdown > 0 ? (
                  <>
                    <Clock className="h-3 w-3" />
                    <span>{countdown}s</span>
                  </>
                ) : (
                  <span>{formatNextCheck(connection.next_check_eta_sec)}</span>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Security Badge */}
        <div className="flex items-center space-x-2 text-xs text-gray-500">
          <Shield className="h-3 w-3" />
          <span>Keys encrypted at rest</span>
        </div>
      </div>
    </div>
  );
};

export default ExchangeCard;
