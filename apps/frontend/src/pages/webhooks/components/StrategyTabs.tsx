import React from 'react';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '../../../components/ui/tabs';

interface StrategyTabsProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
  rulesContent: React.ReactNode;
  actionsContent: React.ReactNode;
  monitorContent: React.ReactNode;
}

export default function StrategyTabs({
  activeTab,
  onTabChange,
  rulesContent,
  actionsContent,
  monitorContent
}: StrategyTabsProps) {
  return (
    <Tabs value={activeTab} onValueChange={onTabChange} className="w-full h-full flex flex-col">
      <TabsList className="bg-white/5 border-b border-gray-700/50 rounded-none">
        <TabsTrigger value="rules" className="data-[state=active]:bg-blue-500/20 text-white">
          Rules
        </TabsTrigger>
        <TabsTrigger value="actions" className="data-[state=active]:bg-blue-500/20 text-white">
          Actions
        </TabsTrigger>
        <TabsTrigger value="monitor" className="data-[state=active]:bg-blue-500/20 text-white">
          Monitor
        </TabsTrigger>
      </TabsList>

      <TabsContent value="rules" className="flex-1 mt-0 p-4">
        {rulesContent}
      </TabsContent>

      <TabsContent value="actions" className="flex-1 mt-0 p-4">
        {actionsContent}
      </TabsContent>

      <TabsContent value="monitor" className="flex-1 mt-0 p-4">
        {monitorContent}
      </TabsContent>
    </Tabs>
  );
}

