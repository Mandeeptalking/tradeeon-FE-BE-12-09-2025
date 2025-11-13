import { useEffect, useMemo, useState } from 'react';
import {
  Plug,
  ShieldCheck,
  Clipboard,
  CheckCircle2,
  RefreshCcw,
  Sparkles,
  Link as LinkIcon,
  Pause,
  Play,
  Trash2,
  MoreVertical,
} from 'lucide-react';
import { connectionsApi } from '../../lib/api/connections';
import type { Connection, ConnectionGuidance } from '../../types/connections';
import ConnectExchangeDrawer from '../../components/connections/ConnectExchangeDrawer';
import { logger } from '../../utils/logger';

type StatusStyle = {
  label: string;
  pill: string;
  text: string;
  iconColor: string;
};

const statusStyles: Record<Connection['status'], StatusStyle> = {
  connected: {
    label: 'Connected',
    pill: 'bg-emerald-500/10 text-emerald-400 ring-1 ring-inset ring-emerald-500/40',
    text: 'text-emerald-400',
    iconColor: 'text-emerald-400',
  },
  degraded: {
    label: 'Attention',
    pill: 'bg-amber-500/10 text-amber-300 ring-1 ring-inset ring-amber-500/40',
    text: 'text-amber-300',
    iconColor: 'text-amber-300',
  },
  error: {
    label: 'Error',
    pill: 'bg-rose-500/10 text-rose-300 ring-1 ring-inset ring-rose-500/40',
    text: 'text-rose-300',
    iconColor: 'text-rose-300',
  },
  not_connected: {
    label: 'Not Connected',
    pill: 'bg-slate-500/10 text-slate-300 ring-1 ring-inset ring-slate-500/40',
    text: 'text-slate-300',
    iconColor: 'text-slate-300',
  },
};

const exchangeMeta: Record<string, { name: string; badge: string }> = {
  BINANCE: { name: 'Binance', badge: '🟡' },
  COINBASE: { name: 'Coinbase Pro', badge: '🔵' },
  KRAKEN: { name: 'Kraken', badge: '🟣' },
  ZERODHA: { name: 'Zerodha', badge: '🟢' },
};

const FALLBACK_BINANCE_GUIDANCE: ConnectionGuidance = {
  exchange: 'BINANCE',
  whitelist_ip: '52.77.227.148',
  required_permissions: [
    'Enable Reading (spot)',
    'Enable Spot & Margin trading',
    'Optional: Enable Futures trading (if you plan to trade Futures)',
    'Do NOT enable Withdrawals',
  ],
  recommendations: [
    '⚠️ CRITICAL: You MUST whitelist IP 52.77.227.148 before enabling trading permissions.',
    'Binance will revoke unrestricted API keys with trading permissions for security.',
    'In Binance API Management, select "Restrict access to trusted IPs only" and add 52.77.227.148.',
    'Generate a fresh API key pair dedicated to Tradeeon.',
    'Label the API key clearly so you can rotate or revoke it later.',
  ],
  testing_notes: [
    'Connection test calls Binance spot `/api/v3/account` and futures `/fapi/v1/account` endpoints.',
    '⚠️ IMPORTANT: Unrestricted IP access with trading permissions will be revoked by Binance.',
    'You MUST whitelist IP 52.77.227.148 before testing or Binance may revoke your key.',
    'If you receive IP whitelist errors, confirm 52.77.227.148 is whitelisted for this key.',
    'Invalid credential errors usually indicate key/secret mismatch or missing permissions.',
  ],
};

const ConnectionsPage = () => {
  const [connections, setConnections] = useState<Connection[]>([]);
  const [guidance, setGuidance] = useState<ConnectionGuidance[]>([]);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [editingConnection, setEditingConnection] = useState<Connection | null>(null);
  const [copySuccess, setCopySuccess] = useState(false);
  const [loadingConnections, setLoadingConnections] = useState(true);
  const [showMenuFor, setShowMenuFor] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [pausingId, setPausingId] = useState<string | null>(null);

  useEffect(() => {
    refreshConnections();
    loadGuidance();
  }, []);

  const refreshConnections = async () => {
    setLoadingConnections(true);
    try {
      const data = await connectionsApi.listConnections();
      setConnections(data);
    } finally {
      setLoadingConnections(false);
    }
  };

  const loadGuidance = async () => {
    const info = await connectionsApi.getGuidance();
    setGuidance(info);
  };

  const binanceGuidance = useMemo(
    () => guidance.find((item) => item.exchange === 'BINANCE'),
    [guidance],
  );

  const handleCopyIp = async (ip?: string) => {
    if (!ip) return;
    try {
      await navigator.clipboard.writeText(ip);
      setCopySuccess(true);
      setTimeout(() => setCopySuccess(false), 2000);
    } catch (error) {
      logger.error('Failed to copy IP:', error);
    }
  };

  const handleConnected = (connection: Connection) => {
    setConnections((prev) => {
      const existingIndex = prev.findIndex((item) => item.id === connection.id);
      if (existingIndex >= 0) {
        const next = [...prev];
        next[existingIndex] = connection;
        return next;
      }
      return [...prev, connection];
    });
    setEditingConnection(null); // Clear editing state
  };

  const handleEditConnection = (connection: Connection) => {
    setEditingConnection(connection);
    setIsDrawerOpen(true);
  };

  const handleCloseDrawer = () => {
    setIsDrawerOpen(false);
    setEditingConnection(null);
  };

  const handlePauseConnection = async (connectionId: string) => {
    try {
      setPausingId(connectionId);
      await connectionsApi.pauseConnection(connectionId);
      await refreshConnections();
      setShowMenuFor(null);
    } catch (error: any) {
      logger.error('Failed to pause connection:', error);
      alert(`Failed to pause connection: ${error.message || 'Unknown error'}`);
    } finally {
      setPausingId(null);
    }
  };

  const handleResumeConnection = async (connectionId: string) => {
    try {
      setPausingId(connectionId);
      await connectionsApi.resumeConnection(connectionId);
      await refreshConnections();
      setShowMenuFor(null);
    } catch (error: any) {
      logger.error('Failed to resume connection:', error);
      alert(`Failed to resume connection: ${error.message || 'Unknown error'}`);
    } finally {
      setPausingId(null);
    }
  };

  const handleDeleteConnection = async (connectionId: string) => {
    if (!confirm('Are you sure you want to delete this connection? This action cannot be undone.')) {
      return;
    }

    try {
      setDeletingId(connectionId);
      await connectionsApi.deleteConnection(connectionId);
      await refreshConnections();
      setShowMenuFor(null);
    } catch (error: any) {
      logger.error('Failed to delete connection:', error);
      alert(`Failed to delete connection: ${error.message || 'Unknown error'}`);
    } finally {
      setDeletingId(null);
    }
  };

  const ConnectionCard = ({ connection }: { connection: Connection }) => {
    const metadata = exchangeMeta[connection.exchange] || {
      name: connection.exchange,
      badge: '🔗',
    };
    const status = statusStyles[connection.status];
    const isPaused = connection.status === 'not_connected';
    const isMenuOpen = showMenuFor === connection.id;
    const isProcessing = deletingId === connection.id || pausingId === connection.id;

    return (
      <div className="group relative flex items-center justify-between rounded-2xl border border-white/10 bg-white/[0.04] px-5 py-4 backdrop-blur transition hover:border-white/20 hover:bg-white/[0.06] overflow-visible">
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-white/10 text-2xl flex-shrink-0">
            {metadata.badge}
          </div>
          <div className="flex flex-col min-w-0">
            <span className="text-base font-semibold text-white">{metadata.name}</span>
            {connection.nickname && (
              <span className="text-sm text-white/60 truncate">{connection.nickname}</span>
            )}
          </div>
        </div>
        <div className="flex items-center gap-3 flex-shrink-0">
          <div className={`flex items-center gap-2 rounded-full px-3 py-1 text-sm font-medium ${status.pill}`}>
            <span className={`${status.iconColor}`}>●</span>
            <span>{status.label}</span>
          </div>
          
          {/* Actions Menu */}
          <div className="relative z-50">
            <button
              onClick={() => setShowMenuFor(isMenuOpen ? null : connection.id)}
              disabled={isProcessing}
              className="p-2 hover:bg-white/10 rounded-lg disabled:opacity-50 transition-colors"
              title="More options"
            >
              <MoreVertical className="h-4 w-4 text-white/60 hover:text-white/80" />
            </button>
            
            {isMenuOpen && (
              <>
                {/* Backdrop to close menu */}
                <div
                  className="fixed inset-0 z-40"
                  onClick={() => setShowMenuFor(null)}
                />
                {/* Menu */}
                <div className="absolute right-0 top-full mt-2 z-50 min-w-[180px] rounded-lg border border-white/10 bg-slate-800 shadow-xl py-1 overflow-hidden">
                  <button
                    onClick={() => {
                      handleEditConnection(connection);
                      setShowMenuFor(null);
                    }}
                    className="w-full flex items-center gap-2 px-3 py-2 text-sm text-white/80 hover:bg-white/10 transition-colors"
                  >
                    <span>✏️</span>
                    <span>Edit</span>
                  </button>
                  
                  {isPaused ? (
                    <button
                      onClick={() => handleResumeConnection(connection.id)}
                      disabled={isProcessing}
                      className="w-full flex items-center gap-2 px-3 py-2 text-sm text-white/80 hover:bg-white/10 transition-colors disabled:opacity-50"
                    >
                      {pausingId === connection.id ? (
                        <>
                          <RefreshCcw className="h-4 w-4 animate-spin" />
                          <span>Resuming...</span>
                        </>
                      ) : (
                        <>
                          <Play className="h-4 w-4" />
                          <span>Resume</span>
                        </>
                      )}
                    </button>
                  ) : (
                    <button
                      onClick={() => handlePauseConnection(connection.id)}
                      disabled={isProcessing}
                      className="w-full flex items-center gap-2 px-3 py-2 text-sm text-white/80 hover:bg-white/10 transition-colors disabled:opacity-50"
                    >
                      {pausingId === connection.id ? (
                        <>
                          <RefreshCcw className="h-4 w-4 animate-spin" />
                          <span>Pausing...</span>
                        </>
                      ) : (
                        <>
                          <Pause className="h-4 w-4" />
                          <span>Pause</span>
                        </>
                      )}
                    </button>
                  )}
                  
                  <div className="my-1 h-px bg-white/10" />
                  
                  <button
                    onClick={() => handleDeleteConnection(connection.id)}
                    disabled={isProcessing}
                    className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-400 hover:bg-red-500/10 transition-colors disabled:opacity-50"
                  >
                    {deletingId === connection.id ? (
                      <>
                        <RefreshCcw className="h-4 w-4 animate-spin" />
                        <span>Deleting...</span>
                      </>
                    ) : (
                      <>
                        <Trash2 className="h-4 w-4" />
                        <span>Delete</span>
                      </>
                    )}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-slate-950 pb-20">
      <div className="mx-auto max-w-6xl px-6 pt-12">
        <header className="flex flex-col gap-6 rounded-3xl border border-white/10 bg-gradient-to-br from-slate-900 via-slate-900 to-slate-950 p-8 shadow-2xl shadow-blue-500/10">
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border border-blue-400/20 bg-blue-500/10 px-3 py-1 text-sm text-blue-200">
                <Sparkles className="h-4 w-4" />
                Exchange Connections
              </div>
              <h1 className="mt-4 text-3xl font-semibold text-white md:text-4xl">
                Connect your exchange securely
              </h1>
              <p className="mt-3 max-w-2xl text-base text-white/70">
                Review the whitelist IP, required Binance permissions, and be ready to connect with complete confidence before your first live attempt.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setIsDrawerOpen(true)}
              className="inline-flex items-center gap-2 rounded-full bg-blue-500 px-5 py-2 text-sm font-semibold text-white shadow-lg shadow-blue-500/30 transition hover:bg-blue-600"
            >
              <Plug className="h-4 w-4" />
              Connect Exchange
            </button>
          </div>

          <div className="grid gap-5 md:grid-cols-3">
            <div className="col-span-1 rounded-2xl border border-white/10 bg-white/[0.04] p-6">
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-semibold uppercase tracking-wide text-white/60">
                  Whitelist IP
                </h2>
                <ShieldCheck className="h-4 w-4 text-green-300" />
              </div>
              <p className="mt-3 text-2xl font-bold text-white">
                {binanceGuidance?.whitelist_ip ?? FALLBACK_BINANCE_GUIDANCE.whitelist_ip}
              </p>
              <p className="mt-2 text-sm text-white/60">
                Add this IP to Binance API key restrictions before testing your first connection.
              </p>
              <button
                type="button"
                onClick={() =>
                  handleCopyIp(binanceGuidance?.whitelist_ip ?? FALLBACK_BINANCE_GUIDANCE.whitelist_ip)
                }
                className="mt-4 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm font-medium text-white transition hover:bg-white/10"
              >
                {copySuccess ? (
                  <>
                    <CheckCircle2 className="h-4 w-4 text-emerald-300" />
                    Copied
                  </>
                ) : (
                  <>
                    <Clipboard className="h-4 w-4" />
                    Copy IP
                  </>
                )}
              </button>
            </div>

            <div className="col-span-1 rounded-2xl border border-white/10 bg-white/[0.04] p-6">
              <h2 className="text-sm font-semibold uppercase tracking-wide text-white/60">
                Required Binance permissions
              </h2>
              <ul className="mt-3 space-y-2 text-sm text-white/80">
                {(binanceGuidance?.required_permissions ?? FALLBACK_BINANCE_GUIDANCE.required_permissions).map(
                  (item) => (
                    <li key={item} className="flex items-start gap-2">
                      <span className="mt-1 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-blue-300" />
                      <span>{item}</span>
                    </li>
                  ),
                )}
              </ul>
            </div>

            <div className="col-span-1 rounded-2xl border border-white/10 bg-white/[0.04] p-6">
              <h2 className="text-sm font-semibold uppercase tracking-wide text-white/60">
                Before you test
              </h2>
              <ul className="mt-3 space-y-2 text-sm text-white/80">
                {(binanceGuidance?.recommendations ?? FALLBACK_BINANCE_GUIDANCE.recommendations).map((tip) => (
                  <li key={tip} className="flex items-start gap-2">
                    <span className="mt-1 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-emerald-300" />
                    <span>{tip}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          <div className="mt-5 rounded-2xl border border-white/10 bg-white/[0.03] p-6">
            <h3 className="text-sm font-semibold uppercase tracking-wide text-white/60">
              How the connection test works
            </h3>
            <ul className="mt-3 grid gap-2 text-sm text-white/75 md:grid-cols-2">
              {(binanceGuidance?.testing_notes ?? FALLBACK_BINANCE_GUIDANCE.testing_notes).map((note) => (
                <li key={note} className="flex items-start gap-2">
                  <span className="mt-1 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-sky-300" />
                  <span>{note}</span>
                </li>
              ))}
            </ul>
          </div>
        </header>

        <section className="mt-10">
          <div className="mb-6 flex items-center justify-between">
            <div>
              <h2 className="text-xl font-semibold text-white">Connection status</h2>
              <p className="mt-1 text-sm text-white/60">
                Track which exchanges are ready before your first Binance sync.
              </p>
            </div>
            <button
              type="button"
              onClick={refreshConnections}
              className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-xs font-medium text-white transition hover:bg-white/10"
            >
              <RefreshCcw className="h-3.5 w-3.5" />
              Refresh
            </button>
          </div>

          {loadingConnections ? (
            <div className="flex h-32 items-center justify-center rounded-3xl border border-white/10 bg-white/[0.03]">
              <div className="flex items-center gap-2 text-sm text-white/70">
                <div className="h-3 w-3 animate-ping rounded-full bg-blue-400" />
                Loading connections…
              </div>
            </div>
          ) : connections.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-4 rounded-3xl border border-dashed border-white/10 bg-white/[0.02] px-8 py-16 text-center text-white/60">
              <LinkIcon className="h-8 w-8 text-white/40" />
              <div className="space-y-2">
                <p className="text-lg font-semibold text-white">No exchanges linked yet</p>
                <p className="text-sm text-white/60">
                  When you connect Binance, it will appear here with its live connection status.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsDrawerOpen(true)}
                className="inline-flex items-center gap-2 rounded-full bg-blue-500 px-5 py-2 text-sm font-semibold text-white shadow-lg shadow-blue-500/30 transition hover:bg-blue-600"
              >
                <Plug className="h-4 w-4" />
                Connect Binance
              </button>
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              {connections.map((connection) => (
                <ConnectionCard key={connection.id} connection={connection} />
              ))}
            </div>
          )}
        </section>
      </div>

      <ConnectExchangeDrawer
        isOpen={isDrawerOpen}
        onClose={handleCloseDrawer}
        onConnected={handleConnected}
        initialConnection={editingConnection}
      />
    </div>
  );
};

export default ConnectionsPage;

