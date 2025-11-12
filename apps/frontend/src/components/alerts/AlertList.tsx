import React, { useEffect, useState } from 'react'
import { Button } from '../ui/button'
import { Badge } from '../ui/badge'
import { Pause, Play, Trash2, Bell, Webhook, TestTube } from 'lucide-react'
import AlertStatusIcon from './AlertStatusIcon'

interface AlertListProps {
  className?: string
}

export default function AlertList({ className }: AlertListProps) {
  const [alerts, setAlerts] = useState<any[]>([])
  const [recent, setRecent] = useState<Record<string, boolean>>({})
  const [simId, setSimId] = useState<string | undefined>()

  useEffect(() => {
    // Load alerts from localStorage instead of API
    // Security: Validate and sanitize stored data
    try {
      const stored = localStorage.getItem('complex_alerts');
      if (!stored) {
        setAlerts([]);
        return;
      }
      
      const parsed = JSON.parse(stored);
      // Validate structure
      if (!Array.isArray(parsed)) {
        setAlerts([]);
        return;
      }
      
      // Sanitize: Remove any sensitive fields that shouldn't be stored
      const sanitized = parsed.map((alert: any) => ({
        id: alert.id,
        name: alert.name,
        status: alert.status,
        // Don't restore sensitive fields like API keys, tokens, etc.
      }));
      
      setAlerts(sanitized);
    } catch (error) {
      // If parsing fails, clear corrupted data
      localStorage.removeItem('complex_alerts');
      setAlerts([]);
    }
  }, [])

  const handleToggleStatus = async (alert: any) => {
    const newStatus = alert.status === 'active' ? 'paused' : 'active'
    // Update in localStorage (sanitized)
    try {
      const stored = localStorage.getItem('complex_alerts') || '[]';
      const storedAlerts = JSON.parse(stored);
      const updatedAlerts = storedAlerts.map((a: any) => 
        a.id === alert.id ? { ...a, status: newStatus } : a
      );
      // Only store non-sensitive fields
      const sanitized = updatedAlerts.map((a: any) => ({
        id: a.id,
        name: a.name,
        status: a.status,
      }));
      localStorage.setItem('complex_alerts', JSON.stringify(sanitized));
      setAlerts(sanitized);
    } catch (error) {
      // If update fails, clear corrupted data
      localStorage.removeItem('complex_alerts');
      setAlerts([]);
    }
  }

  const handleDelete = async (alertId: string) => {
    if (window.confirm('Are you sure you want to delete this alert?')) {
      // Remove from localStorage
      try {
        const stored = localStorage.getItem('complex_alerts') || '[]';
        const storedAlerts = JSON.parse(stored);
        const updatedAlerts = storedAlerts.filter((a: any) => a.id !== alertId);
        localStorage.setItem('complex_alerts', JSON.stringify(updatedAlerts));
        setAlerts(updatedAlerts);
      } catch (error) {
        // If delete fails, clear corrupted data
        localStorage.removeItem('complex_alerts');
        setAlerts([]);
      }
    }
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return <Badge variant="default" className="bg-green-100 text-green-800">Active</Badge>
      case 'paused':
        return <Badge variant="secondary" className="bg-gray-100 text-gray-800">Paused</Badge>
      default:
        return <Badge variant="outline">{status}</Badge>
    }
  }

  const getActionIcon = (action: any) => {
    switch (action.type) {
      case 'notify':
        return <Bell className="w-4 h-4 text-blue-500" />
      case 'webhook':
        return <Webhook className="w-4 h-4 text-purple-500" />
      default:
        return <Bell className="w-4 h-4 text-gray-500" />
    }
  }

  const getConditionSummary = (condition: any) => {
    if (condition.type === 'indicator') {
      return `${condition.indicator} ${condition.operator} ${condition.compareValue || 'value'}`
    } else if (condition.type === 'price') {
      return `Price ${condition.operator} ${condition.compareValue || 'value'}`
    } else if (condition.type === 'volume') {
      return `Volume ${condition.operator} ${condition.compareValue || 'value'}`
    }
    return 'Condition'
  }

  const formatDate = (dateString?: string) => {
    if (!dateString) return 'Never'
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }


  if (alerts.length === 0) {
    return (
      <div className={`p-4 ${className}`}>
        <div className="text-center py-8">
          <Bell className="w-12 h-12 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No alerts yet</h3>
          <p className="text-sm text-gray-500">Create your first alert to get started</p>
        </div>
      </div>
    )
  }

  return (
    <div className={`p-4 ${className}`}>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-gray-900">Alerts</h2>
        <Badge variant="outline">{alerts.length} alert{alerts.length !== 1 ? 's' : ''}</Badge>
      </div>

      <div className="space-y-3">
        {alerts.map((alert) => (
          <div key={alert.id} className="p-4 border rounded-lg bg-white hover:bg-gray-50 transition-colors">
            <div className="flex items-start justify-between mb-3">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <AlertStatusIcon status={alert.status} recent={recent[alert.id]} />
                  <span className="font-medium text-gray-900">{alert.symbol}</span>
                  <Badge variant="outline" className="text-xs">{alert.base_timeframe}</Badge>
                  {getStatusBadge(alert.status)}
                  {getActionIcon(alert.action)}
                </div>
                
                <div className="text-sm text-gray-600 mb-2">
                  <div className="flex items-center gap-1">
                    <span>When</span>
                    {alert.conditions.map((condition, index) => (
                      <React.Fragment key={condition.id}>
                        {index > 0 && (
                          <span className="font-medium text-gray-800">
                            {alert.logic.toLowerCase()}
                          </span>
                        )}
                        <span>{getConditionSummary(condition)}</span>
                      </React.Fragment>
                    ))}
                  </div>
                </div>

                <div className="text-xs text-gray-500">
                  Created: {formatDate(alert.created_at)}
                  {alert.last_triggered_at && (
                    <span className="ml-3">Last triggered: {formatDate(alert.last_triggered_at)}</span>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-1 ml-4">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setSimId(alert.id)}
                  className="text-blue-600 hover:text-blue-700"
                >
                  <TestTube className="w-4 h-4 mr-1" />
                  Test
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleToggleStatus(alert)}
                >
                  {alert.status === 'active' ? (
                    <Pause className="w-4 h-4" />
                  ) : (
                    <Play className="w-4 h-4" />
                  )}
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleDelete(alert.id)}
                  className="text-red-600 hover:text-red-700"
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </div>
        ))}
      </div>
      
    </div>
  )
}
