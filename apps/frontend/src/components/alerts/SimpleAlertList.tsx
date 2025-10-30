import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Bell, Trash2, Clock } from 'lucide-react';

interface SimpleAlert {
  id: string;
  symbol: string;
  condition: string;
  value: number;
  timeframe: string;
  status: string;
  created_at: string;
  message: string;
}

export default function SimpleAlertList() {
  const [alerts, setAlerts] = useState<SimpleAlert[]>([]);

  useEffect(() => {
    // Load alerts from localStorage
    const storedAlerts = JSON.parse(localStorage.getItem('simple_alerts') || '[]');
    setAlerts(storedAlerts);
  }, []);

  const deleteAlert = (alertId: string) => {
    const updatedAlerts = alerts.filter(alert => alert.id !== alertId);
    setAlerts(updatedAlerts);
    localStorage.setItem('simple_alerts', JSON.stringify(updatedAlerts));
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-800';
      case 'paused': return 'bg-yellow-100 text-yellow-800';
      case 'triggered': return 'bg-blue-100 text-blue-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getConditionIcon = (condition: string) => {
    switch (condition) {
      case 'price_above': return '📈';
      case 'price_below': return '📉';
      case 'price_increases': return '🚀';
      case 'price_decreases': return '📉';
      default: return '🔔';
    }
  };

  if (alerts.length === 0) {
    return (
      <Card className="w-full">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="w-5 h-5 text-blue-600" />
            Your Alerts
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center text-gray-500 py-8">
            <Bell className="w-12 h-12 mx-auto mb-4 text-gray-300" />
            <p>No alerts created yet</p>
            <p className="text-sm">Create your first alert to get started!</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Bell className="w-5 h-5 text-blue-600" />
          Your Alerts ({alerts.length})
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {alerts.map((alert) => (
            <div key={alert.id} className="border rounded-lg p-3 bg-gray-50">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-lg">{getConditionIcon(alert.condition)}</span>
                    <span className="font-medium text-sm">{alert.symbol}</span>
                    <Badge className={`text-xs ${getStatusColor(alert.status)}`}>
                      {alert.status}
                    </Badge>
                  </div>
                  <p className="text-sm text-gray-700 mb-1">{alert.message}</p>
                  <div className="flex items-center gap-2 text-xs text-gray-500">
                    <Clock className="w-3 h-3" />
                    <span>Created: {new Date(alert.created_at).toLocaleString()}</span>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => deleteAlert(alert.id)}
                  className="text-red-500 hover:text-red-700"
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

