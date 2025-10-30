import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link, Plus, Settings, Activity, Shield, CheckCircle } from 'lucide-react';
import { Connection } from '../../types/connections';
import { connectionsApi } from '../../lib/api/connections';
import ExchangeCard from '../../components/connections/ExchangeCard';
import ConnectExchangeDrawer from '../../components/connections/ConnectExchangeDrawer';
import RotateKeysModal from '../../components/connections/RotateKeysModal';
import RevokeModal from '../../components/connections/RevokeModal';
import toast from 'react-hot-toast';

const Connections = () => {
  const queryClient = useQueryClient();
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [selectedConnection, setSelectedConnection] = useState<Connection | null>(null);
  const [isRotateModalOpen, setIsRotateModalOpen] = useState(false);
  const [isRevokeModalOpen, setIsRevokeModalOpen] = useState(false);

  // React Query for live data
  const { data: connections = [], isLoading } = useQuery({
    queryKey: ['connections'],
    queryFn: connectionsApi.listConnections,
    refetchInterval: 30000, // 30 seconds
  });

  const { data: auditEvents = [] } = useQuery({
    queryKey: ['audit-events'],
    queryFn: connectionsApi.getAuditEvents,
  });

  // Mutations
  const revokeMutation = useMutation({
    mutationFn: connectionsApi.revokeConnection,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['connections'] });
      queryClient.invalidateQueries({ queryKey: ['audit-events'] });
      toast.success('Connection revoked successfully');
    },
    onError: () => {
      toast.error('Failed to revoke connection');
    },
  });

  const handleConnectionAdded = () => {
    queryClient.invalidateQueries({ queryKey: ['connections'] });
    queryClient.invalidateQueries({ queryKey: ['audit-events'] });
  };

  const handleEditConnection = (connection: Connection) => {
    setSelectedConnection(connection);
    setIsDrawerOpen(true);
  };

  const handleRotateKeys = (connection: Connection) => {
    setSelectedConnection(connection);
    setIsRotateModalOpen(true);
  };

  const handleTestConnection = async (connection: Connection) => {
    // This is handled in the ExchangeCard component
    console.log('Test connection for:', connection.exchange);
  };

  const handleRevokeConnection = (connection: Connection) => {
    setSelectedConnection(connection);
    setIsRevokeModalOpen(true);
  };

  const handleRotateSuccess = () => {
    queryClient.invalidateQueries({ queryKey: ['connections'] });
    queryClient.invalidateQueries({ queryKey: ['audit-events'] });
  };

  const handleRevokeSuccess = () => {
    revokeMutation.mutate(selectedConnection!.id);
    setIsRevokeModalOpen(false);
    setSelectedConnection(null);
  };

  const getConnectionStats = () => {
    const connected = connections.filter(c => c.status === 'connected').length;
    const degraded = connections.filter(c => c.status === 'degraded').length;
    const errors = connections.filter(c => c.status === 'error').length;
    const total = connections.length;
    
    return { connected, degraded, errors, total };
  };

  const stats = getConnectionStats();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 p-8">
        <div className="max-w-7xl mx-auto">
          {/* Loading skeletons */}
          <div className="animate-pulse">
            <div className="h-8 bg-gray-200 rounded w-64 mb-2"></div>
            <div className="h-4 bg-gray-200 rounded w-96 mb-8"></div>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              <div className="lg:col-span-1 space-y-6">
                <div className="h-64 bg-gray-200 rounded-2xl"></div>
                <div className="h-48 bg-gray-200 rounded-2xl"></div>
              </div>
              <div className="lg:col-span-2">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {[1, 2, 3].map(i => (
                    <div key={i} className="h-64 bg-gray-200 rounded-2xl"></div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 overflow-y-auto">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-xl font-bold text-gray-900">Exchange Connections</h1>
              <p className="text-sm text-gray-600 mt-1">
                Securely connect your trading accounts. Your keys are encrypted at rest and you maintain full control.
              </p>
            </div>
            <button
              onClick={() => setIsDrawerOpen(true)}
              className="inline-flex items-center space-x-2 px-3 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors text-sm"
            >
              <Plus className="h-4 w-4" />
              <span>Connect Exchange</span>
            </button>
          </div>

          {/* Status Summary */}
          <div className="mt-3 flex items-center space-x-4">
            <div className="flex items-center space-x-1">
              <CheckCircle className="h-3 w-3 text-green-500" />
              <span className="text-xs text-gray-600">
                {stats.connected} connected
              </span>
            </div>
            {stats.degraded > 0 && (
              <div className="flex items-center space-x-1">
                <Settings className="h-3 w-3 text-amber-500" />
                <span className="text-xs text-gray-600">
                  {stats.degraded} needs action
                </span>
              </div>
            )}
            {stats.errors > 0 && (
              <div className="flex items-center space-x-1">
                <Activity className="h-3 w-3 text-red-500" />
                <span className="text-xs text-gray-600">
                  {stats.errors} errors
                </span>
              </div>
            )}
            <div className="flex items-center space-x-1">
              <Shield className="h-3 w-3 text-blue-500" />
              <span className="text-xs text-gray-600">
                {stats.total} total
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {connections.length === 0 ? (
          /* Empty State */
          <div className="text-center py-20">
            <div className="w-24 h-24 bg-gradient-to-br from-blue-100 to-blue-200 rounded-full flex items-center justify-center mx-auto mb-8">
              <Link className="h-12 w-12 text-blue-500" />
            </div>
            <h3 className="text-2xl font-bold text-gray-900 mb-4">No connections yet</h3>
            <p className="text-lg text-gray-600 mb-8 max-w-md mx-auto">
              Connect your first exchange to start trading with Tradeeon's advanced features.
            </p>
            <button
              onClick={() => setIsDrawerOpen(true)}
              className="inline-flex items-center space-x-3 px-6 py-3 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-lg hover:from-blue-600 hover:to-blue-700 transition-all duration-200"
            >
              <Plus className="h-5 w-5" />
              <span>Get Started</span>
            </button>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Connections Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
              {connections.map((connection) => (
                <ExchangeCard
                  key={connection.id}
                  connection={connection}
                  onEdit={() => handleEditConnection(connection)}
                  onRotate={() => handleRotateKeys(connection)}
                  onTest={() => handleTestConnection(connection)}
                  onRevoke={() => handleRevokeConnection(connection)}
                  onRefresh={() => queryClient.invalidateQueries({ queryKey: ['connections'] })}
                />
              ))}
            </div>

            {/* Bottom Row - Security & FAQ */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {/* Security & Trust Section */}
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                <div className="bg-gradient-to-r from-blue-500 to-blue-600 px-4 py-3">
                  <div className="flex items-center space-x-2">
                    <Shield className="h-5 w-5 text-white" />
                    <div>
                      <h3 className="text-sm font-bold text-white">Security & Trust</h3>
                      <p className="text-xs text-blue-100">Enterprise-grade security</p>
                    </div>
                  </div>
                </div>
                
                <div className="p-4">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="text-center">
                      <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-2">
                        <Shield className="h-4 w-4 text-green-600" />
                      </div>
                      <h4 className="text-xs font-semibold text-gray-900 mb-1">AES-256</h4>
                      <p className="text-xs text-gray-600">Encrypted</p>
                    </div>
                    
                    <div className="text-center">
                      <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-2">
                        <Settings className="h-4 w-4 text-blue-600" />
                      </div>
                      <h4 className="text-xs font-semibold text-gray-900 mb-1">Scoped</h4>
                      <p className="text-xs text-gray-600">Permissions</p>
                    </div>
                    
                    <div className="text-center">
                      <div className="w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-2">
                        <Activity className="h-4 w-4 text-purple-600" />
                      </div>
                      <h4 className="text-xs font-semibold text-gray-900 mb-1">Full</h4>
                      <p className="text-xs text-gray-600">Control</p>
                    </div>
                    
                    <div className="text-center">
                      <div className="w-8 h-8 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-2">
                        <CheckCircle className="h-4 w-4 text-amber-600" />
                      </div>
                      <h4 className="text-xs font-semibold text-gray-900 mb-1">Regular</h4>
                      <p className="text-xs text-gray-600">Rotation</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* FAQ Section */}
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
                <div className="flex items-center space-x-2 mb-3">
                  <Shield className="h-4 w-4 text-blue-500" />
                  <h3 className="text-sm font-semibold text-gray-900">FAQ</h3>
                </div>
                
                <div className="space-y-2">
                  <div className="text-xs">
                    <div className="font-medium text-gray-900 mb-1">Where are my keys stored?</div>
                    <div className="text-gray-600">Encrypted on secure servers</div>
                  </div>
                  
                  <div className="text-xs">
                    <div className="font-medium text-gray-900 mb-1">What permissions needed?</div>
                    <div className="text-gray-600">Trading & wallet access only</div>
                  </div>
                  
                  <div className="text-xs">
                    <div className="font-medium text-gray-900 mb-1">How to rotate keys?</div>
                    <div className="text-gray-600">Use the rotate button on cards</div>
                  </div>
                  
                  <div className="text-xs">
                    <div className="font-medium text-gray-900 mb-1">Auto trading?</div>
                    <div className="text-gray-600">Only with your explicit consent</div>
                  </div>
                </div>
              </div>
            </div>

            {/* Recent Activity - Compact */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-semibold text-gray-900">Recent Activity</h3>
                <button className="text-xs text-blue-600 hover:text-blue-700 font-medium">
                  View All →
                </button>
              </div>
              
              <div className="space-y-2">
                {auditEvents.slice(0, 2).map((event) => (
                  <div key={event.id} className="flex items-center space-x-3 p-2 bg-gray-50 rounded-lg">
                    <div className="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center">
                      <Activity className="h-3 w-3 text-blue-600" />
                    </div>
                    <div className="flex-1">
                      <p className="text-xs font-medium text-gray-900">{event.action}</p>
                      <p className="text-xs text-gray-600">{event.details}</p>
                    </div>
                    <div className="text-xs text-gray-500">
                      {new Date(event.timestamp).toLocaleDateString()}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Connect Exchange Drawer */}
      <ConnectExchangeDrawer
        isOpen={isDrawerOpen}
        onClose={() => {
          setIsDrawerOpen(false);
          setSelectedConnection(null);
        }}
        onConnected={handleConnectionAdded}
        initialConnection={selectedConnection}
      />

      {/* Rotate Keys Modal */}
      <RotateKeysModal
        isOpen={isRotateModalOpen}
        onClose={() => {
          setIsRotateModalOpen(false);
          setSelectedConnection(null);
        }}
        connection={selectedConnection}
        onSuccess={handleRotateSuccess}
      />

      {/* Revoke Modal */}
      <RevokeModal
        isOpen={isRevokeModalOpen}
        onClose={() => {
          setIsRevokeModalOpen(false);
          setSelectedConnection(null);
        }}
        connection={selectedConnection}
        onSuccess={handleRevokeSuccess}
      />
    </div>
  );
};

export default Connections;
