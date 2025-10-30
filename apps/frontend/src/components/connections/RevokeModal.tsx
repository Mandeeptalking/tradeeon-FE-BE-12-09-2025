import { useState } from 'react';
import { X, Trash2, AlertTriangle } from 'lucide-react';
import { Connection } from '../../types/connections';
import { connectionsApi } from '../../lib/api/connections';
import toast from 'react-hot-toast';

interface RevokeModalProps {
  isOpen: boolean;
  onClose: () => void;
  connection: Connection | null;
  onSuccess: () => void;
}

const RevokeModal = ({ isOpen, onClose, connection, onSuccess }: RevokeModalProps) => {
  const [confirmText, setConfirmText] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const expectedText = connection?.exchange || '';

  const handleRevoke = async () => {
    if (!connection || confirmText !== expectedText) return;

    setIsLoading(true);
    try {
      await connectionsApi.revokeConnection(connection.id);
      toast.success('Connection revoked successfully');
      onSuccess();
      onClose();
      setConfirmText('');
    } catch (error) {
      toast.error('Failed to revoke connection');
      console.error('Revoke connection error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    onClose();
    setConfirmText('');
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
              <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center">
                <Trash2 className="h-5 w-5 text-red-600" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-gray-900">Revoke Connection</h2>
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
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <div className="flex items-start space-x-3">
                <AlertTriangle className="h-5 w-5 text-red-600 mt-0.5" />
                <div>
                  <h3 className="text-sm font-semibold text-red-800">This action cannot be undone</h3>
                  <p className="text-sm text-red-700 mt-1">
                    Revoking will pause affected bots and stop new orders. You can reconnect anytime.
                  </p>
                </div>
              </div>
            </div>

            {/* Confirmation */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Type <span className="font-mono font-bold">{expectedText}</span> to confirm:
              </label>
              <input
                type="text"
                value={confirmText}
                onChange={(e) => setConfirmText(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg font-mono"
                placeholder={expectedText}
                autoComplete="off"
              />
            </div>

            {/* Effects */}
            <div className="bg-gray-50 rounded-lg p-4">
              <h4 className="text-sm font-semibold text-gray-900 mb-2">What happens when you revoke:</h4>
              <ul className="text-sm text-gray-600 space-y-1">
                <li>• All bots using this exchange will be paused</li>
                <li>• New orders will be blocked</li>
                <li>• Historical data remains available</li>
                <li>• You can reconnect with new keys anytime</li>
              </ul>
            </div>
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
                onClick={handleRevoke}
                disabled={isLoading || confirmText !== expectedText}
                className="flex-1 px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 disabled:opacity-50"
              >
                {isLoading ? 'Revoking...' : 'Revoke Connection'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RevokeModal;


