import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Bot as BotIcon, Home, ChevronRight, RefreshCw } from 'lucide-react';
import { Button } from '../components/ui/button';
import { Separator } from '../components/ui/separator';
import { useToast } from '../hooks/use-toast';
import BotKPI from '../components/bots/BotKPI';
import BotFilters from '../components/bots/BotFilters';
import BotCard from '../components/bots/BotCard';
import BotTemplates from '../components/bots/BotTemplates';
import BotCreateSheet from '../components/bots/BotCreateSheet';
import {
  listBots,
  startBot,
  resumeBot,
  pauseBot,
  stopBot,
  deleteBot,
  duplicateBot,
  getKPIs,
  filterBots,
} from '../lib/api/bots';
import type { Bot, BotFilters as BotFiltersType, BotKPIs, BotType, CreateBotPayload } from '../lib/api/bots';

export default function BotsPage() {
  const { toast } = useToast();
  
  // State
  const [bots, setBots] = useState<Bot[]>([]);
  const [filteredBots, setFilteredBots] = useState<Bot[]>([]);
  const [kpis, setKPIs] = useState<BotKPIs | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [filters, setFilters] = useState<BotFiltersType>(() => {
    const saved = localStorage.getItem('bots.filters');
    return saved ? JSON.parse(saved) : { search: '', exchange: 'All', status: 'All' };
  });
  const [showCreateSheet, setShowCreateSheet] = useState(false);
  const [preselectedType, setPreselectedType] = useState<BotType | undefined>();

  // Load bots data from Supabase via API
  const loadBots = useCallback(async (showLoading = true) => {
    try {
      if (showLoading) {
        setIsLoading(true);
      } else {
        setIsRefreshing(true);
      }
      
      const botsData = await listBots(filters);
      setBots(botsData);
      setFilteredBots(filterBots(botsData, filters));
      setKPIs(getKPIs(botsData));
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to load bots data',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [filters, toast]);

  // Initial load
  useEffect(() => {
    loadBots();
  }, [loadBots]);

  // Update filtered bots when filters change
  useEffect(() => {
    setFilteredBots(filterBots(bots, filters));
  }, [bots, filters]);

  // Save filters to localStorage
  useEffect(() => {
    localStorage.setItem('bots.filters', JSON.stringify(filters));
  }, [filters]);

  // Handlers
  const handleFiltersChange = (newFilters: BotFiltersType) => {
    setFilters(newFilters);
  };

  const handleStart = async (botId: string) => {
    try {
      await startBot(botId);
      toast({
        title: 'Success',
        description: 'Bot started successfully',
      });
      await loadBots(false);
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to start bot',
        variant: 'destructive',
      });
      await loadBots(false);
    }
  };

  const handleResume = async (botId: string) => {
    try {
      await resumeBot(botId);
      toast({
        title: 'Success',
        description: 'Bot resumed successfully',
      });
      await loadBots(false);
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to resume bot',
        variant: 'destructive',
      });
      await loadBots(false);
    }
  };

  const handlePause = async (botId: string) => {
    try {
      await pauseBot(botId);
      toast({
        title: 'Success',
        description: 'Bot paused successfully',
      });
      await loadBots(false);
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to pause bot',
        variant: 'destructive',
      });
      await loadBots(false);
    }
  };

  const handleStop = async (botId: string) => {
    try {
      await stopBot(botId);
      toast({
        title: 'Success',
        description: 'Bot stopped successfully',
      });
      await loadBots(false);
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to stop bot',
        variant: 'destructive',
      });
      await loadBots(false);
    }
  };

  const handleDelete = async (botId: string) => {
    try {
      await deleteBot(botId);
      toast({
        title: 'Success',
        description: 'Bot deleted successfully',
      });
      await loadBots(false);
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to delete bot',
        variant: 'destructive',
      });
      await loadBots(false);
    }
  };

  const handleDuplicate = async (botId: string) => {
    try {
      const duplicatedBot = await duplicateBot(botId);
      toast({
        title: 'Success',
        description: 'Bot duplicated successfully',
      });
      await loadBots(false);
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to duplicate bot',
        variant: 'destructive',
      });
    }
  };

  const handleCreateBot = async (payload: CreateBotPayload) => {
    try {
      // Bot creation is handled in DCABot page
      // This is just for the create sheet - redirect to DCA bot page
      window.location.href = '/dca-bot';
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to create bot',
        variant: 'destructive',
      });
    }
  };

  const handleCreateFromTemplate = (type: BotType) => {
    setPreselectedType(type);
    setShowCreateSheet(true);
  };

  const handleEdit = (_botId: string) => {
    toast({
      title: 'Edit Bot',
      description: 'Edit functionality coming soon',
    });
  };

  const handleView = (_botId: string) => {
    toast({
      title: 'View Bot',
      description: 'Bot details view coming soon',
    });
  };

  const handleRefresh = () => {
    loadBots(false);
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="space-y-1">
          {/* Breadcrumb */}
          <div className="flex items-center space-x-1 text-sm text-muted-foreground mb-2">
            <Home className="h-4 w-4" />
            <ChevronRight className="h-4 w-4" />
            <span>Bots</span>
          </div>
          
          <h1 className="text-2xl md:text-3xl font-semibold text-foreground">
            Trading Bots
          </h1>
          <p className="text-muted-foreground">
            Manage your automated trading strategies
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            onClick={handleRefresh}
            disabled={isRefreshing}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Button
            onClick={() => setShowCreateSheet(true)}
            className="bg-primary hover:bg-primary/90"
          >
            <Plus className="h-4 w-4 mr-2" />
            Create Bot
          </Button>
        </div>
      </div>

      <Separator />

      {/* KPIs */}
      <BotKPI kpis={kpis} isLoading={isLoading} />

      {/* Filters */}
      <BotFilters
        filters={filters}
        onFiltersChange={handleFiltersChange}
      />

      {/* Content */}
      <div className="min-h-[400px]">
        {isLoading ? (
          // Loading Skeletons
          <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
            {Array.from({ length: 6 }).map((_, index) => (
              <div key={index} className="h-64 bg-muted animate-pulse rounded-2xl" />
            ))}
          </div>
        ) : filteredBots.length > 0 ? (
          // Active Bots Grid
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold">
                Your Bots ({filteredBots.length})
              </h2>
            </div>
            
            <motion.div 
              className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6"
              layout
            >
              <AnimatePresence>
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
              </AnimatePresence>
            </motion.div>
          </div>
        ) : (
          // Empty State
          <div className="text-center space-y-8 py-12">
            <div className="space-y-4">
              <div className="mx-auto w-24 h-24 bg-muted rounded-full flex items-center justify-center">
                <BotIcon className="h-12 w-12 text-muted-foreground" />
              </div>
              <div className="space-y-2">
                <h3 className="text-xl font-semibold">No bots found</h3>
                <p className="text-muted-foreground max-w-md mx-auto">
                  Get started by creating your first trading bot. Choose from our templates or build a custom strategy.
                </p>
              </div>
              <Button
                onClick={() => setShowCreateSheet(true)}
                className="bg-primary hover:bg-primary/90"
              >
                <Plus className="h-4 w-4 mr-2" />
                Create Your First Bot
              </Button>
            </div>

            <Separator className="max-w-md mx-auto" />

            {/* Templates */}
            <BotTemplates onCreateBot={handleCreateFromTemplate} />
          </div>
        )}
      </div>

      {/* Create Bot Sheet */}
      <BotCreateSheet
        isOpen={showCreateSheet}
        onClose={() => {
          setShowCreateSheet(false);
          setPreselectedType(undefined);
        }}
        onCreateBot={handleCreateBot}
        preselectedType={preselectedType}
      />
    </div>
  );
}
