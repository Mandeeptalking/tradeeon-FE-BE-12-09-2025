import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bot, Plus, Search, RefreshCw, AlertCircle } from 'lucide-react';
import { useThemeStore } from '../../store/theme';
import { Button } from '../../components/ui/button';
import { listBots, type Bot as BotType, type BotFilters, getKPIs, filterBots } from '../../lib/api/bots';
import BotCard from '../../components/bots/BotCard';
import BotFilters from '../../components/bots/BotFilters';
import { useQuery } from '@tanstack/react-query';

const Bots: React.FC = () => {
  const { theme } = useThemeStore();
  const isDark = theme === 'dark';
  const navigate = useNavigate();

  const [filters, setFilters] = useState<BotFilters>(() => {
    const saved = localStorage.getItem('bots.filters');
    return saved ? JSON.parse(saved) : { search: '', exchange: 'All', status: 'All' };
  });

  // Fetch bots using React Query
  const { data: bots = [], isLoading, error, refetch } = useQuery({
    queryKey: ['bots', filters],
    queryFn: () => listBots(filters),
    refetchInterval: 30000, // Refetch every 30 seconds
  });

  // Calculate KPIs
  const kpis = getKPIs(bots);
  const filteredBots = filterBots(bots, filters);

  const handleStart = async (botId: string) => {
    try {
      const { startBot } = await import('../../lib/api/bots');
      await startBot(botId);
      refetch();
    } catch (error: any) {
      console.error('Error starting bot:', error);
      alert(`Failed to start bot: ${error.message}`);
    }
  };

  const handleResume = async (botId: string) => {
    try {
      const { resumeBot } = await import('../../lib/api/bots');
      await resumeBot(botId);
      refetch();
    } catch (error: any) {
      console.error('Error resuming bot:', error);
      alert(`Failed to resume bot: ${error.message}`);
    }
  };

  const handlePause = async (botId: string) => {
    try {
      const { pauseBot } = await import('../../lib/api/bots');
      await pauseBot(botId);
      refetch();
    } catch (error: any) {
      console.error('Error pausing bot:', error);
      alert(`Failed to pause bot: ${error.message}`);
    }
  };

  const handleStop = async (botId: string) => {
    try {
      const { stopBot } = await import('../../lib/api/bots');
      await stopBot(botId);
      refetch();
    } catch (error: any) {
      console.error('Error stopping bot:', error);
      alert(`Failed to stop bot: ${error.message}`);
    }
  };

  const handleDelete = async (botId: string) => {
    if (!confirm('Are you sure you want to delete this bot? This action cannot be undone.')) {
      return;
    }
    try {
      const { deleteBot } = await import('../../lib/api/bots');
      await deleteBot(botId);
      refetch();
    } catch (error: any) {
      console.error('Error deleting bot:', error);
      alert(`Failed to delete bot: ${error.message}`);
    }
  };

  const handleDuplicate = async (botId: string) => {
    try {
      const { duplicateBot } = await import('../../lib/api/bots');
      await duplicateBot(botId);
      refetch();
    } catch (error: any) {
      console.error('Error duplicating bot:', error);
      alert(`Failed to duplicate bot: ${error.message}`);
    }
  };

  const handleEdit = (botId: string) => {
    // Navigate to bot edit page or open edit modal
    navigate(`/app/dcabot?edit=${botId}`);
  };

  const handleView = (botId: string) => {
    // Navigate to bot details page or open view modal
    navigate(`/app/dcabot?view=${botId}`);
  };

  if (error) {
    return (
      <div className={`min-h-screen ${isDark ? 'bg-slate-950' : 'bg-gray-50'} p-6`}>
        <div className={`max-w-7xl mx-auto rounded-lg border p-6 ${isDark ? 'bg-gray-800 border-red-800' : 'bg-white border-red-200'}`}>
          <div className="flex items-center gap-3">
            <AlertCircle className={`w-6 h-6 ${isDark ? 'text-red-400' : 'text-red-600'}`} />
            <div>
              <h3 className={`font-semibold ${isDark ? 'text-red-300' : 'text-red-800'}`}>
                Error Loading Bots
              </h3>
              <p className={`text-sm mt-1 ${isDark ? 'text-red-400' : 'text-red-600'}`}>
                {(error as Error).message || 'Failed to load bots. Please try again.'}
              </p>
            </div>
            <Button
              onClick={() => refetch()}
              className="ml-auto"
              variant="outline"
            >
              <RefreshCw className="w-4 h-4 mr-2" />
              Retry
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen ${isDark ? 'bg-slate-950' : 'bg-gray-50'} pb-20`}>
      <div className="max-w-7xl mx-auto px-6 pt-8 pb-12">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className={`p-3 rounded-xl ${isDark ? 'bg-blue-500/20' : 'bg-blue-100'}`}>
                <Bot className={`w-6 h-6 ${isDark ? 'text-blue-400' : 'text-blue-600'}`} />
              </div>
              <div>
                <h1 className={`text-3xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                  Bots
                </h1>
                <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'} mt-1`}>
                  Manage your trading bots
                </p>
              </div>
            </div>
            <Button
              onClick={() => navigate('/app/dcabot')}
              className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              Create Bot
            </Button>
          </div>
        </div>

        {/* KPIs */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className={`rounded-xl border p-4 ${isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
            <div className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'} mb-1`}>
              Total Capital
            </div>
            <div className={`text-2xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
              ${kpis.totalCapitalDeployed.toFixed(2)}
            </div>
          </div>
          <div className={`rounded-xl border p-4 ${isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
            <div className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'} mb-1`}>
              Active Bots
            </div>
            <div className={`text-2xl font-bold ${isDark ? 'text-emerald-400' : 'text-emerald-600'}`}>
              {kpis.activeBots}
            </div>
          </div>
          <div className={`rounded-xl border p-4 ${isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
            <div className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'} mb-1`}>
              24h P&L
            </div>
            <div className={`text-2xl font-bold ${kpis.pnl24h >= 0 ? (isDark ? 'text-emerald-400' : 'text-emerald-600') : (isDark ? 'text-red-400' : 'text-red-600')}`}>
              ${kpis.pnl24h.toFixed(2)}
            </div>
            <div className={`text-xs mt-1 ${kpis.pnl24hPct >= 0 ? (isDark ? 'text-emerald-400' : 'text-emerald-600') : (isDark ? 'text-red-400' : 'text-red-600')}`}>
              {kpis.pnl24hPct >= 0 ? '+' : ''}{kpis.pnl24hPct.toFixed(2)}%
            </div>
          </div>
          <div className={`rounded-xl border p-4 ${isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
            <div className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'} mb-1`}>
              MTD Realized
            </div>
            <div className={`text-2xl font-bold ${kpis.realizedPnlMtd >= 0 ? (isDark ? 'text-emerald-400' : 'text-emerald-600') : (isDark ? 'text-red-400' : 'text-red-600')}`}>
              ${kpis.realizedPnlMtd.toFixed(2)}
            </div>
          </div>
        </div>

        {/* Filters */}
        <BotFilters filters={filters} onFiltersChange={setFilters} className="mb-6" />

        {/* Bots List */}
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <RefreshCw className={`w-8 h-8 animate-spin ${isDark ? 'text-gray-400' : 'text-gray-600'}`} />
            <span className={`ml-3 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
              Loading bots...
            </span>
          </div>
        ) : filteredBots.length === 0 ? (
          <div className={`rounded-xl border p-12 text-center ${isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
            <Bot className={`w-12 h-12 mx-auto mb-4 ${isDark ? 'text-gray-600' : 'text-gray-400'}`} />
            <h3 className={`text-lg font-semibold mb-2 ${isDark ? 'text-white' : 'text-gray-900'}`}>
              No bots found
            </h3>
            <p className={`text-sm mb-6 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
              {bots.length === 0
                ? "You haven't created any bots yet. Create your first bot to get started!"
                : 'No bots match your current filters. Try adjusting your search criteria.'}
            </p>
            {bots.length === 0 && (
              <Button
                onClick={() => navigate('/app/dcabot')}
                className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium flex items-center gap-2 mx-auto"
              >
                <Plus className="w-4 h-4" />
                Create Your First Bot
              </Button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredBots.map((bot) => (
              <BotCard
                key={bot.bot_id}
                bot={bot}
                onStart={handleStart}
                onResume={handleResume}
                onPause={handlePause}
                onStop={handleStop}
                onDelete={handleDelete}
                onDuplicate={handleDuplicate}
                onEdit={handleEdit}
                onView={handleView}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default Bots;

