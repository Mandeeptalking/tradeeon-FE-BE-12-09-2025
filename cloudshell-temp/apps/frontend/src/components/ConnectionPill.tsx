import React from 'react';
import { ConnectionState } from '@/types/market';
import { Wifi, WifiOff, RotateCcw } from 'lucide-react';

interface ConnectionPillProps {
  state: ConnectionState;
}

const ConnectionPill: React.FC<ConnectionPillProps> = ({ state }) => {
  const getStateConfig = () => {
    switch (state) {
      case 'connected':
        return {
          icon: Wifi,
          text: 'LIVE',
          className: 'bg-green-100 text-green-800 border-green-200 animate-pulse',
          iconClassName: 'text-green-600 animate-pulse'
        };
      case 'reconnecting':
        return {
          icon: RotateCcw,
          text: 'Connecting...',
          className: 'bg-amber-100 text-amber-800 border-amber-200',
          iconClassName: 'text-amber-600 animate-spin'
        };
      case 'disconnected':
        return {
          icon: WifiOff,
          text: 'Offline',
          className: 'bg-red-100 text-red-800 border-red-200',
          iconClassName: 'text-red-600'
        };
    }
  };

  const config = getStateConfig();
  const Icon = config.icon;

  return (
    <div className={`inline-flex items-center space-x-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${config.className}`}>
      <Icon className={`h-3 w-3 ${config.iconClassName}`} />
      <span>{config.text}</span>
    </div>
  );
};

export default ConnectionPill;
