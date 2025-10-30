import * as React from "react";
import { supabase } from "../../lib/supabase";
import { Button } from "../ui/button";
import { Badge } from "../ui/badge";

type LogItem = { id: number; alert_id: string; triggered_at: string; payload: any };

export default function TriggerHistoryPanel() {
  const [logs, setLogs] = React.useState<LogItem[]>([]);
  const [loading, setLoading] = React.useState(false);

  async function loadLogs() {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("alerts_log")
        .select("id, alert_id, triggered_at, payload")
        .order("triggered_at", { ascending: false })
        .limit(100);
      if (!error && data) setLogs(data);
    } catch (err) {
      console.warn('Failed to load alert logs:', err);
    }
    setLoading(false);
  }

  React.useEffect(() => {
    loadLogs();
    
    // Subscribe to real-time updates
    const sub = supabase
      .channel("alert_triggers_history")
      .on("postgres_changes", { 
        event: "INSERT", 
        schema: "public", 
        table: "alerts_log" 
      }, (payload) => {
        const newLog = {
          id: payload.new.id,
          alert_id: payload.new.alert_id,
          triggered_at: payload.new.triggered_at,
          payload: payload.new.payload
        };
        setLogs((prev) => [newLog, ...prev.slice(0, 99)]); // Keep only latest 100
      })
      .subscribe();
    
    return () => sub.unsubscribe();
  }, []);

  return (
    <div className="h-full flex flex-col">
      <div className="flex items-center justify-between mb-2">
        <div className="text-sm font-semibold">Trigger History</div>
        <Button size="sm" variant="secondary" onClick={loadLogs}>
          ⟳ Refresh
        </Button>
      </div>
      {loading && <div className="text-xs opacity-70">Loading logs …</div>}
      <div className="flex-1 overflow-y-auto space-y-2 pr-1">
        {logs.length === 0 && !loading ? (
          <div className="text-xs opacity-70 text-center py-4">
            No trigger history yet
          </div>
        ) : (
          logs.map((log) => (
            <div key={log.id} className="border rounded-lg px-2 py-1 text-xs">
              <div className="flex justify-between">
                <span className="font-medium">{log.alert_id.slice(0, 8)}</span>
                <Badge variant="outline">
                  {new Date(log.triggered_at).toLocaleTimeString()}
                </Badge>
              </div>
              <div className="opacity-80 truncate">
                {JSON.stringify(log.payload?.price || log.payload)}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}



