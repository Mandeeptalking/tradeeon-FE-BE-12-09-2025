#!/usr/bin/env python3
"""
Script to set up Supabase database tables for alerts system
"""

import os
import requests
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

def setup_database():
    print("🚀 Setting up Supabase database tables...")
    
    # Get Supabase credentials
    supabase_url = os.getenv("SUPABASE_URL")
    supabase_key = os.getenv("SUPABASE_SERVICE_ROLE_KEY")
    
    if not supabase_url or not supabase_key:
        print("❌ Missing Supabase credentials. Please set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY environment variables.")
        return False
    
    # Headers for Supabase API
    headers = {
        "apikey": supabase_key,
        "Authorization": f"Bearer {supabase_key}",
        "Content-Type": "application/json"
    }
    
    # SQL commands to create tables
    sql_commands = [
        # Create alerts table
        """
        create table if not exists public.alerts (
          alert_id uuid primary key default gen_random_uuid(),
          user_id uuid not null references auth.users(id) on delete cascade,
          symbol text not null,
          base_timeframe text not null,
          conditions jsonb not null,
          logic text not null default 'AND',
          action jsonb not null default '{}'::jsonb,
          status text not null default 'active',
          created_at timestamptz not null default now(),
          last_triggered_at timestamptz
        );
        """,
        
        # Create alerts_log table
        """
        create table if not exists public.alerts_log (
          id bigserial primary key,
          alert_id uuid not null references public.alerts(alert_id) on delete cascade,
          triggered_at timestamptz not null default now(),
          payload jsonb not null
        );
        """,
        
        # Create indexes
        "create index if not exists alerts_user_idx on public.alerts (user_id);",
        "create index if not exists alerts_symbol_idx on public.alerts (symbol);",
        "create index if not exists alerts_log_alert_idx on public.alerts_log (alert_id);",
        
        # Enable RLS
        "alter table public.alerts enable row level security;",
        "alter table public.alerts_log enable row level security;",
        
        # Create RLS policies
        """
        drop policy if exists "alerts_owner_rw" on public.alerts;
        create policy "alerts_owner_rw"
        on public.alerts
        for all
        using (auth.uid() = user_id)
        with check (auth.uid() = user_id);
        """,
        
        """
        drop policy if exists "alerts_log_owner_r" on public.alerts_log;
        create policy "alerts_log_owner_r"
        on public.alerts_log
        for select
        using (
          exists (
            select 1 from public.alerts a
            where a.alert_id = alerts_log.alert_id and a.user_id = auth.uid()
          )
        );
        """
    ]
    
    try:
        for i, sql in enumerate(sql_commands, 1):
            print(f"📊 Executing SQL command {i}/{len(sql_commands)}...")
            
            # Execute SQL via Supabase REST API
            response = requests.post(
                f"{supabase_url}/rest/v1/rpc/exec_sql",
                headers=headers,
                json={"sql": sql.strip()}
            )
            
            if response.status_code == 200:
                print(f"   ✅ Command {i} executed successfully")
            else:
                print(f"   ❌ Command {i} failed: {response.status_code} - {response.text}")
                # Continue with other commands even if one fails
        
        print("✅ Database setup completed!")
        return True
        
    except Exception as e:
        print(f"❌ Error setting up database: {e}")
        return False

if __name__ == "__main__":
    setup_database()

