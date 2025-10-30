import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../../../components/ui/dialog';
import { Button } from '../../../components/ui/button';
import { Input } from '../../../components/ui/input';
import { Label } from '../../../components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../../components/ui/select';
import { useWebhookStrategyStore } from '../../../state/useWebhookStrategyStore';

interface AddStrategyDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function AddStrategyDialog({ open, onOpenChange }: AddStrategyDialogProps) {
  const { addStrategy } = useWebhookStrategyStore();
  const [name, setName] = useState('');
  const [mode, setMode] = useState<'paper' | 'live'>('paper');
  const [status, setStatus] = useState<'active' | 'paused'>('paused');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (name.trim()) {
      addStrategy({ name: name.trim(), mode, status });
      setName('');
      setMode('paper');
      setStatus('paused');
      onOpenChange(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-gray-800 border-gray-700 text-white">
        <DialogHeader>
          <DialogTitle className="text-white">Add New Strategy</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="name" className="text-gray-300">Strategy Name</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Enter strategy name"
                className="bg-white/5 border-gray-600 text-white placeholder-gray-400"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="mode" className="text-gray-300">Mode</Label>
              <Select value={mode} onValueChange={(value: 'paper' | 'live') => setMode(value)}>
                <SelectTrigger className="bg-white/5 border-gray-600 text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-gray-800 border-gray-600">
                  <SelectItem value="paper" className="text-white hover:bg-gray-700">
                    Paper Trading
                  </SelectItem>
                  <SelectItem value="live" className="text-white hover:bg-gray-700">
                    Live Trading
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="status" className="text-gray-300">Initial Status</Label>
              <Select value={status} onValueChange={(value: 'active' | 'paused') => setStatus(value)}>
                <SelectTrigger className="bg-white/5 border-gray-600 text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-gray-800 border-gray-600">
                  <SelectItem value="paused" className="text-white hover:bg-gray-700">
                    Paused
                  </SelectItem>
                  <SelectItem value="active" className="text-white hover:bg-gray-700">
                    Active
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="border-gray-600 text-gray-300 hover:bg-white/10"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              className="bg-blue-500 hover:bg-blue-600 text-white"
              disabled={!name.trim()}
            >
              Create Strategy
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

