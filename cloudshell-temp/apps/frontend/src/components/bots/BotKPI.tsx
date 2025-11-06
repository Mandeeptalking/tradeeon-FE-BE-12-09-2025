import { TrendingUp, Wallet2, BarChart3, Clock } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Skeleton } from '../ui/skeleton';
import type { BotKPIs } from '../../lib/api/bots';

interface BotKPIProps {
  kpis: BotKPIs | null;
  isLoading: boolean;
}

export default function BotKPI({ kpis, isLoading }: BotKPIProps) {
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const formatPercentage = (pct: number) => {
    const sign = pct >= 0 ? '+' : '';
    return `${sign}${pct.toFixed(2)}%`;
  };

  const kpiCards = [
    {
      title: 'Total Capital Deployed',
      value: kpis ? formatCurrency(kpis.totalCapitalDeployed) : '₹0',
      icon: Wallet2,
      color: 'text-blue-600',
      bgColor: 'bg-blue-50',
    },
    {
      title: 'Active Bots',
      value: kpis ? kpis.activeBots.toString() : '0',
      icon: BarChart3,
      color: 'text-green-600',
      bgColor: 'bg-green-50',
    },
    {
      title: '24h P&L',
      value: kpis ? `${formatCurrency(kpis.pnl24h)} (${formatPercentage(kpis.pnl24hPct)})` : '₹0 (0%)',
      icon: TrendingUp,
      color: kpis && kpis.pnl24h >= 0 ? 'text-green-600' : 'text-red-600',
      bgColor: kpis && kpis.pnl24h >= 0 ? 'bg-green-50' : 'bg-red-50',
    },
    {
      title: 'Realized P&L (MTD)',
      value: kpis ? formatCurrency(kpis.realizedPnlMtd) : '₹0',
      icon: Clock,
      color: kpis && kpis.realizedPnlMtd >= 0 ? 'text-green-600' : 'text-red-600',
      bgColor: kpis && kpis.realizedPnlMtd >= 0 ? 'bg-green-50' : 'bg-red-50',
    },
  ];

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4 mb-6">
        {Array.from({ length: 4 }).map((_, index) => (
          <Card key={index}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                <Skeleton className="h-4 w-24" />
              </CardTitle>
              <Skeleton className="h-4 w-4 rounded" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-8 w-20 mb-1" />
              <Skeleton className="h-3 w-16" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4 mb-6">
      {kpiCards.map((card, index) => (
        <Card key={index} className="transition-all duration-200 hover:shadow-md">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {card.title}
            </CardTitle>
            <div className={`p-2 rounded-lg ${card.bgColor}`}>
              <card.icon className={`h-4 w-4 ${card.color}`} />
            </div>
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${card.color}`}>
              {card.value}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {index === 0 && 'Across all active bots'}
              {index === 1 && 'Currently running'}
              {index === 2 && 'Last 24 hours'}
              {index === 3 && 'Month to date'}
            </p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}


