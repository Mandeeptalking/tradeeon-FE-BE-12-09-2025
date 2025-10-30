import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Bot as BotIcon, Home, ChevronRight } from 'lucide-react';
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
  createBot,
  updateBotStatus,
  duplicateBot,
  deleteBot,
  getKPIs,
  filterBots,
} from '../lib/api/bots';
import type { Bot, BotFilters as BotFiltersType, BotKPIs, BotStatus, BotType, CreateBotPayload } from '../lib/api/bots';

export default function BotsPage() {
  const { toast } = useToast();
  
  // State
  const [bots, setBots] = useState<Bot[]>([]);
  const [filteredBots, setFilteredBots] = useState<Bot[]>([]);
  const [kpis, setKPIs] = useState<BotKPIs | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [filters, setFilters] = useState<BotFiltersType>(() => {
    const saved = localStorage.getItem('bots.filters');
    return saved ? JSON.parse(saved) : { search: '', exchange: 'All', status: 'All' };
  });
  const [showCreateSheet, setShowCreateSheet] = useState(false);
  const [preselectedType, setPreselectedType] = useState<BotType | undefined>();

  // Load bots data
  const loadBots = async () => {
    try {
      setIsLoading(true);
      const botsData = await listBots(filters);
      setBots(botsData);
      setFilteredBots(filterBots(botsData, filters));
      setKPIs(getKPIs(botsData));
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to load bots data',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Initial load
  useEffect(() => {
    loadBots();
  }, []);

  // Update filtered bots when filters change
  useEffect(() => {
    setFilteredBots(filterBots(bots, filters));
  }, [bots, filters]);

  // Handlers
  const handleFiltersChange = (newFilters: BotFiltersType) => {
    setFilters(newFilters);
  };

  const handleStatusChange = async (botId: string, status: BotStatus) => {
    try {
      // Optimistic update
      setBots(prevBots => 
        prevBots.map(bot => 
          bot.bot_id === botId ? { ...bot, status } : bot
        )
      );

      await updateBotStatus(botId, status);
      
      toast({
        title: 'Success',
        description: `Bot ${status === 'running' ? 'started' : status === 'paused' ? 'paused' : 'stopped'} successfully`,
      });
      
      // Refresh KPIs
      setKPIs(getKPIs(bots));
    } catch (error) {
      // Rollback on error
      loadBots();
      toast({
        title: 'Error',
        description: 'Failed to update bot status',
        variant: 'destructive',
      });
    }
  };

  const handleDuplicate = async (botId: string) => {
    try {
      const duplicatedBot = await duplicateBot(botId);
      setBots(prevBots => [...prevBots, duplicatedBot]);
      
      toast({
        title: 'Success',
        description: 'Bot duplicated successfully',
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to duplicate bot',
        variant: 'destructive',
      });
    }
  };

  const handleDelete = async (botId: string) => {
    try {
      // Optimistic update
      setBots(prevBots => prevBots.filter(bot => bot.bot_id !== botId));
      
      await deleteBot(botId);
      
      toast({
        title: 'Success',
        description: 'Bot deleted successfully',
      });
      
      // Refresh KPIs
      const remainingBots = bots.filter(bot => bot.bot_id !== botId);
      setKPIs(getKPIs(remainingBots));
    } catch (error) {
      // Rollback on error
      loadBots();
      toast({
        title: 'Error',
        description: 'Failed to delete bot',
        variant: 'destructive',
      });
    }
  };

  const handleCreateBot = async (payload: CreateBotPayload) => {
    try {
      const newBot = await createBot(payload);
      setBots(prevBots => [...prevBots, newBot]);
      
      toast({
        title: 'Success',
        description: `${payload.name} created successfully`,
      });
      
      // Refresh KPIs
      setKPIs(getKPIs([...bots, newBot]));
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to create bot',
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

        <Button
          onClick={() => setShowCreateSheet(true)}
          className="bg-primary hover:bg-primary/90"
        >
          <Plus className="h-4 w-4 mr-2" />
          Create Bot
        </Button>
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
                Active Bots ({filteredBots.length})
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
                    onStatusChange={handleStatusChange}
                    onDuplicate={handleDuplicate}
                    onDelete={handleDelete}
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
                <h3 className="text-xl font-semibold">No active bots</h3>
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

