import * as React from "react";
import { addMarker, clearMarkers } from "../lib/chart/markers";
import { supabase } from "../lib/supabase";
import { logger } from "../utils/logger";

export function useAlertMarkers(symbol: string, timeframe: string) {
  React.useEffect(() => {
    let sub: any;

    async function loadExisting() {
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL?.trim();
      const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY?.trim();
      if (!supabaseUrl || !supabaseKey || !supabaseUrl.startsWith('http')) {
        logger.warn('Supabase not properly configured, skipping alert markers');
        return;
      }
      try {
        const { data, error } = await supabase
          .from("alerts_log")
          .select("alert_id, triggered_at, payload")
          .limit(200)
          .order("triggered_at", { ascending: false });
        
        if (!error && data) {
          data.forEach((r: any) =>
            addMarker({
              id: r.alert_id + r.triggered_at,
              symbol,
              timeframe,
              time: r.triggered_at,
              type: "alert",
              color: "#f43f5e",
              label: "⚡",
            })
          );
        }
      } catch (err) {
        logger.warn('Failed to load existing alert markers:', err);
      }
    }

    // Live channel if enabled
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL?.trim();
    const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY?.trim();
    if (supabaseUrl && supabaseKey && supabaseUrl.startsWith('http') && supabase.channel) {
      try {
        sub = supabase
          .channel("alert_triggers")
          .on("postgres_changes", { 
            event: "INSERT", 
            schema: "public", 
            table: "alerts_log" 
          }, (payload) => {
            const r = payload.new;
            addMarker({
              id: r.alert_id + r.triggered_at,
              symbol,
              timeframe,
              time: r.triggered_at,
              type: "alert",
              color: "#f43f5e",
              label: "⚡",
            });
          })
          .subscribe();
      } catch (err) {
        logger.warn('Failed to subscribe to alert triggers:', err);
      }
    }

    loadExisting();
    
    return () => {
      clearMarkers();
      sub?.unsubscribe();
    };
  }, [symbol, timeframe]);
}



