import { AuditEvent } from '../../types/connections';
import {
  Activity,
  CheckCircle,
  TestTube,
  RotateCcw,
  Trash2,
  XCircle,
  Clock,
} from 'lucide-react';

interface AuditMiniListProps {
  events: AuditEvent[];
}

const AuditMiniList = ({ events }: AuditMiniListProps) => {
  const getActionInfo = (action: string) => {
    const actions = {
      connected: { icon: CheckCircle, color: 'text-green-500', label: 'Connected' },
      tested: { icon: TestTube, color: 'text-blue-500', label: 'Tested' },
      rotated: { icon: RotateCcw, color: 'text-purple-500', label: 'Keys Rotated' },
      revoked: { icon: Trash2, color: 'text-red-500', label: 'Revoked' },
      error: { icon: XCircle, color: 'text-red-500', label: 'Error' },
    };
    return actions[action as keyof typeof actions] || { icon: Activity, color: 'text-gray-500', label: action };
  };

  const formatTimeAgo = (timestamp: string) => {
    const now = new Date();
    const past = new Date(timestamp);
    const diffMs = now.getTime() - past.getTime();
    const diffMins = Math.floor(diffMs / (1000 * 60));
    
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    const diffDays = Math.floor(diffHours / 24);
    return `${diffDays}d ago`;
  };

  return (
    <div className="bg-white rounded-2xl border border-gray-200 p-6">
      <div className="flex items-center space-x-2 mb-4">
        <Activity className="h-5 w-5 text-blue-500" />
        <h3 className="text-lg font-semibold text-gray-900">Recent Activity</h3>
      </div>

      {events.length === 0 ? (
        <div className="text-center py-6">
          <Clock className="h-8 w-8 text-gray-300 mx-auto mb-2" />
          <p className="text-sm text-gray-500">No recent activity</p>
        </div>
      ) : (
        <div className="space-y-3">
          {events.slice(0, 3).map((event) => {
            const actionInfo = getActionInfo(event.action);
            return (
              <div key={event.id} className="flex items-start space-x-3">
                <div className={`p-1.5 rounded-lg bg-gray-50`}>
                  <actionInfo.icon className={`h-3 w-3 ${actionInfo.color}`} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center space-x-2">
                    <span className="text-sm font-medium text-gray-900">
                      {actionInfo.label}
                    </span>
                    <span className="text-xs text-gray-500">
                      {formatTimeAgo(event.timestamp)}
                    </span>
                  </div>
                  {event.details && (
                    <p className="text-xs text-gray-600 mt-1">{event.details}</p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {events.length > 3 && (
        <div className="mt-4 pt-3 border-t border-gray-200">
          <button className="text-xs text-blue-600 hover:text-blue-700 font-medium">
            View all activity →
          </button>
        </div>
      )}
    </div>
  );
};

export default AuditMiniList;


