import React, { useState } from 'react';
import { Button } from '../../../components/ui/button';
import { Input } from '../../../components/ui/input';
import { Label } from '../../../components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../../components/ui/select';
import { Switch } from '../../../components/ui/switch';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../../../components/ui/dialog';
import { Plus, Edit, Trash2 } from 'lucide-react';
import { useWebhookStrategyStore, AlertDef, FireMode } from '../../../state/useWebhookStrategyStore';

interface AlertsSectionProps {
  strategyId: string;
}

const timeframes = ['base', '1m', '3m', '5m', '15m', '1h', '4h', '1d'] as const;
const fireModes: { value: FireMode; label: string }[] = [
  { value: 'per_bar', label: 'Per Bar' },
  { value: 'per_close', label: 'Per Bar Close' },
  { value: 'per_tick', label: 'Per Tick' },
];

export default function AlertsSection({ strategyId }: AlertsSectionProps) {
  const { strategies, addAlert, updateAlert, removeAlert } = useWebhookStrategyStore();
  const strategy = strategies.find(s => s.id === strategyId);
  
  const [showDialog, setShowDialog] = useState(false);
  const [editingAlert, setEditingAlert] = useState<AlertDef | null>(null);
  
  const [formData, setFormData] = useState<Partial<AlertDef>>({
    name: '',
    source: 'tradingview',
    fireMode: 'per_close',
    validityBars: 10,
    debounceBars: 3,
    resetOnOpposite: false,
    timeframe: 'base',
  });

  const alerts = strategy?.draft.alerts || [];

  const handleAdd = () => {
    setEditingAlert(null);
    setFormData({
      name: '',
      source: 'tradingview',
      fireMode: 'per_close',
      validityBars: 10,
      debounceBars: 3,
      resetOnOpposite: false,
      timeframe: 'base',
    });
    setShowDialog(true);
  };

  const handleEdit = (alert: AlertDef) => {
    setEditingAlert(alert);
    setFormData(alert);
    setShowDialog(true);
  };

  const handleDelete = (alertId: string) => {
    if (window.confirm('Are you sure you want to delete this alert?')) {
      removeAlert(strategyId, alertId);
    }
  };

  const handleSave = () => {
    if (!formData.name || !formData.fireMode || !formData.timeframe) return;

    const alert: AlertDef = {
      id: editingAlert?.id || `alert_${Date.now()}`,
      name: formData.name,
      source: 'tradingview',
      fireMode: formData.fireMode,
      validityBars: formData.validityBars || 10,
      debounceBars: formData.debounceBars || 3,
      resetOnOpposite: formData.resetOnOpposite || false,
      timeframe: formData.timeframe,
    };

    if (editingAlert) {
      updateAlert(strategyId, alert.id, alert);
    } else {
      addAlert(strategyId, alert);
    }

    setShowDialog(false);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-white">Alerts</h3>
          <p className="text-sm text-gray-400">Configure alerts from TradingView</p>
        </div>
        <Button onClick={handleAdd} className="bg-blue-500 hover:bg-blue-600 text-white">
          <Plus className="w-4 h-4 mr-2" />
          Add Alert
        </Button>
      </div>

      {alerts.length === 0 ? (
        <div className="text-center py-8 bg-white/5 rounded-lg border border-gray-700/50">
          <p className="text-gray-400">No alerts yet</p>
          <p className="text-gray-500 text-sm mt-2">Add your first alert to get started</p>
        </div>
      ) : (
        <div className="space-y-2">
          {alerts.map((alert) => (
            <div
              key={alert.id}
              className="p-4 bg-white/5 rounded-lg border border-gray-700/50 hover:border-gray-600/50 transition-colors"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h4 className="font-medium text-white">{alert.name}</h4>
                    <span className="text-xs text-gray-400">{alert.timeframe}</span>
                    <span className="text-xs text-blue-400">{alert.fireMode}</span>
                  </div>
                  <div className="flex items-center gap-4 text-sm text-gray-400">
                    <span>Validity: {alert.validityBars} bars</span>
                    <span>Debounce: {alert.debounceBars} bars</span>
                    {alert.resetOnOpposite && (
                      <span className="text-yellow-400">Resets on opposite</span>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleEdit(alert)}
                    className="text-blue-400 hover:text-blue-300"
                  >
                    <Edit className="w-4 h-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDelete(alert.id)}
                    className="text-red-400 hover:text-red-300"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add/Edit Dialog */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="bg-gray-800 border-gray-700 text-white max-w-2xl">
          <DialogHeader>
            <DialogTitle className="text-white">
              {editingAlert ? 'Edit Alert' : 'Add Alert'}
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="name" className="text-gray-300">Name</Label>
                <Input
                  id="name"
                  value={formData.name || ''}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="bg-white/5 border-gray-600 text-white"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="timeframe" className="text-gray-300">Timeframe</Label>
                <Select 
                  value={formData.timeframe} 
                  onValueChange={(value) => setFormData({ ...formData, timeframe: value as any })}
                >
                  <SelectTrigger className="bg-white/5 border-gray-600 text-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-gray-800 border-gray-600">
                    {timeframes.map(tf => (
                      <SelectItem key={tf} value={tf} className="text-white hover:bg-gray-700">
                        {tf}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="fireMode" className="text-gray-300">Fire Mode</Label>
                <Select 
                  value={formData.fireMode} 
                  onValueChange={(value) => setFormData({ ...formData, fireMode: value as FireMode })}
                >
                  <SelectTrigger className="bg-white/5 border-gray-600 text-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-gray-800 border-gray-600">
                    {fireModes.map(mode => (
                      <SelectItem key={mode.value} value={mode.value} className="text-white hover:bg-gray-700">
                        {mode.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="validityBars" className="text-gray-300">Validity (bars)</Label>
                <Input
                  id="validityBars"
                  type="number"
                  value={formData.validityBars || ''}
                  onChange={(e) => setFormData({ ...formData, validityBars: parseInt(e.target.value) })}
                  className="bg-white/5 border-gray-600 text-white"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="debounceBars" className="text-gray-300">Debounce (bars)</Label>
                <Input
                  id="debounceBars"
                  type="number"
                  value={formData.debounceBars || ''}
                  onChange={(e) => setFormData({ ...formData, debounceBars: parseInt(e.target.value) })}
                  className="bg-white/5 border-gray-600 text-white"
                />
              </div>
            </div>

            <div className="flex items-center space-x-2">
              <Switch
                id="resetOnOpposite"
                checked={formData.resetOnOpposite || false}
                onCheckedChange={(checked) => setFormData({ ...formData, resetOnOpposite: checked })}
              />
              <Label htmlFor="resetOnOpposite" className="text-gray-300">
                Reset on opposite signal
              </Label>
            </div>

            <div className="bg-blue-900/20 border border-blue-500/30 rounded p-3">
              <p className="text-xs text-blue-300">
                <strong>TradingView Webhook Fields:</strong> strategy_id, ticker, timeframe, side, price, bar_time, key
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowDialog(false)}
              className="border-gray-600 text-gray-300"
            >
              Cancel
            </Button>
            <Button
              onClick={handleSave}
              disabled={!formData.name}
              className="bg-blue-500 hover:bg-blue-600 text-white"
            >
              {editingAlert ? 'Update' : 'Create'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

