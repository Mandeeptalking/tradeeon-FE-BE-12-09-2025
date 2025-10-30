import { useState } from 'react';
import { X, Eye, EyeOff, RotateCcw, AlertTriangle } from 'lucide-react';
import { UpsertConnectionBody, Connection } from '../../types/connections';
import { connectionsApi } from '../../lib/api/connections';
import toast from 'react-hot-toast';

interface RotateKeysModalProps {
  isOpen: boolean;
  onClose: () => void;
  connection: Connection | null;
  onSuccess: () => void;
}

const RotateKeysModal = ({ isOpen, onClose, connection, onSuccess }: RotateKeysModalProps) => {
  const [apiKey, setApiKey] = useState('');
  const [apiSecret, setApiSecret] = useState('');
  const [passphrase, setPassphrase] = useState('');
  const [showApiKey, setShowApiKey] = useState(false);
  const [showApiSecret, setShowApiSecret] = useState(false);
  const [showPassphrase, setShowPassphrase] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const exchanges = [
    { value: 'BINANCE', label: 'Binance', logo: '🟡', requiresPassphrase: false },
    { value: 'COINBASE', label: 'Coinbase Pro', logo: '🔵', requiresPassphrase: true },
    { value: 'KRAKEN', label: 'Kraken', logo: '🟣', requiresPassphrase: true },
    { value: 'ZERODHA', label: 'Zerodha', logo: '🟢', requiresPassphrase: false },
  ];

  const selectedExchange = exchanges.find(e => e.value === connection?.exchange);

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!apiKey.trim()) newErrors.apiKey = 'API Key is required';
    if (!apiSecret.trim()) newErrors.apiSecret = 'API Secret is required';
    if (selectedExchange?.requiresPassphrase && !passphrase.trim()) {
      newErrors.passphrase = 'Passphrase is required for this exchange';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleRotate = async () => {
    if (!connection || !validateForm()) return;

    setIsLoading(true);
    try {
      const body: UpsertConnectionBody = {
        exchange: connection.exchange,
        api_key: apiKey,
        api_secret: apiSecret,
        passphrase: selectedExchange?.requiresPassphrase ? passphrase : undefined,
      };

      await connectionsApi.rotateKeys(connection.id, body);
      toast.success('Keys rotated successfully');
      onSuccess();
      onClose();
      resetForm();
    } catch (error) {
      toast.error('Failed to rotate keys');
      console.error('Rotate keys error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const resetForm = () => {
    setApiKey('');
    setApiSecret('');
    setPassphrase('');
    setErrors({});
  };

  const handleClose = () => {
    onClose();
    resetForm();
  };

  if (!isOpen || !connection) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-hidden">
      <div className="absolute inset-0 bg-black/50" onClick={handleClose} />
      <div className="absolute inset-0 flex items-center justify-center p-4">
        <div className="bg-white rounded-xl shadow-xl w-full max-w-md">
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-gray-200">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-amber-100 rounded-full flex items-center justify-center">
                <RotateCcw className="h-5 w-5 text-amber-600" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-gray-900">Rotate API Keys</h2>
                <p className="text-sm text-gray-500">{connection.exchange} • {connection.nickname}</p>
              </div>
            </div>
            <button
              onClick={handleClose}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Content */}
          <div className="p-6 space-y-4">
            {/* Warning */}
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
              <div className="flex items-start space-x-3">
                <AlertTriangle className="h-5 w-5 text-amber-600 mt-0.5" />
                <div>
                  <h3 className="text-sm font-semibold text-amber-800">Why rotate keys?</h3>
                  <p className="text-sm text-amber-700 mt-1">
                    Regular key rotation keeps your accounts secure. This will update your API credentials while keeping your connection nickname.
                  </p>
                </div>
              </div>
            </div>

            {/* Exchange Info */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Exchange
              </label>
              <div className="flex items-center space-x-2 p-3 bg-gray-50 rounded-lg">
                <span className="text-lg">{selectedExchange?.logo}</span>
                <span className="font-medium">{selectedExchange?.label}</span>
              </div>
            </div>

            {/* API Key */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                New API Key *
              </label>
              <div className="relative">
                <input
                  type={showApiKey ? 'text' : 'password'}
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  className={`w-full px-3 py-2 border rounded-lg pr-10 ${
                    errors.apiKey ? 'border-red-300' : 'border-gray-300'
                  }`}
                  placeholder="Enter new API key"
                />
                <button
                  type="button"
                  onClick={() => setShowApiKey(!showApiKey)}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2"
                >
                  {showApiKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              {errors.apiKey && <p className="text-xs text-red-600 mt-1">{errors.apiKey}</p>}
            </div>

            {/* API Secret */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                New API Secret *
              </label>
              <div className="relative">
                <input
                  type={showApiSecret ? 'text' : 'password'}
                  value={apiSecret}
                  onChange={(e) => setApiSecret(e.target.value)}
                  className={`w-full px-3 py-2 border rounded-lg pr-10 ${
                    errors.apiSecret ? 'border-red-300' : 'border-gray-300'
                  }`}
                  placeholder="Enter new API secret"
                />
                <button
                  type="button"
                  onClick={() => setShowApiSecret(!showApiSecret)}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2"
                >
                  {showApiSecret ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              {errors.apiSecret && <p className="text-xs text-red-600 mt-1">{errors.apiSecret}</p>}
            </div>

            {/* Passphrase */}
            {selectedExchange?.requiresPassphrase && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  New Passphrase *
                </label>
                <div className="relative">
                  <input
                    type={showPassphrase ? 'text' : 'password'}
                    value={passphrase}
                    onChange={(e) => setPassphrase(e.target.value)}
                    className={`w-full px-3 py-2 border rounded-lg pr-10 ${
                      errors.passphrase ? 'border-red-300' : 'border-gray-300'
                    }`}
                    placeholder="Enter new passphrase"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassphrase(!showPassphrase)}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2"
                  >
                    {showPassphrase ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                {errors.passphrase && <p className="text-xs text-red-600 mt-1">{errors.passphrase}</p>}
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="p-6 border-t border-gray-200">
            <div className="flex space-x-3">
              <button
                onClick={handleClose}
                className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleRotate}
                disabled={isLoading}
                className="flex-1 px-4 py-2 bg-amber-500 text-white rounded-lg hover:bg-amber-600 disabled:opacity-50"
              >
                {isLoading ? 'Rotating...' : 'Rotate Keys'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RotateKeysModal;
