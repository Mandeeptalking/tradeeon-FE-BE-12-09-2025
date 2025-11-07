import { supabase } from '../supabase'

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000'

// Types matching backend schemas
export type Operator = ">" | "<" | ">=" | "<=" | "equals" | "crosses_above" | "crosses_below"
export type CompareWith = "value" | "indicator_component" | "price"

export interface IndicatorRef {
  indicator: string
  component?: string
  settings?: Record<string, any>
}

export interface Condition {
  id: string
  type: "indicator" | "price" | "volume"
  operator: Operator
  compareWith: CompareWith
  compareValue?: number
  rhs?: IndicatorRef
  indicator?: string
  component?: string
  settings?: Record<string, any>
  timeframe: string
}

export interface ActionNotify {
  type: "notify"
}

export interface ActionWebhook {
  type: "webhook"
  url: string
}

export interface ActionBot {
  type: "bot"
  bot_id: string
}

export type Action = ActionNotify | ActionWebhook | ActionBot

export interface AlertCreate {
  symbol: string
  base_timeframe: string
  conditions: Condition[]
  logic: "AND" | "OR"
  action: Action
  status: "active" | "paused"
}

export interface AlertRow extends AlertCreate {
  alert_id: string
  user_id: string
  created_at?: string
  last_triggered_at?: string
}

export interface AlertUpdate {
  symbol?: string
  base_timeframe?: string
  conditions?: Condition[]
  logic?: "AND" | "OR"
  action?: Action
  status?: "active" | "paused"
}

export interface AlertLogRow {
  id: number
  alert_id: string
  triggered_at: string
  payload: Record<string, any>
}

// Helper function to get auth token
async function getAuthToken(): Promise<string> {
  if (!supabase) {
    // Supabase not configured, use mock token for testing
    return 'mock-jwt-token-for-testing'
  }
  
  try {
    const { data: { session } } = await supabase.auth.getSession()
    if (session?.access_token) {
      return session.access_token
    }
  } catch (error) {
    // Supabase auth error - return null to force proper auth
    if (import.meta.env.DEV) {
      console.warn('Supabase auth error:', error)
    }
  }
  
  // No valid session - return null to force authentication
  return null
}

// API client functions
export async function createAlert(payload: AlertCreate): Promise<AlertRow> {
  const token = await getAuthToken()
  
  if (!token) {
    throw new Error('Authentication required. Please sign in.')
  }
  
  const response = await fetch(`${API_BASE_URL}/alerts`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify(payload)
  })
  
  if (!response.ok) {
    const errorText = await response.text()
    if (import.meta.env.DEV) {
      console.error('Error response:', errorText)
    }
    throw new Error(`Failed to create alert: ${response.statusText} - ${errorText}`)
  }
  
  const result = await response.json()
  return result
}

export async function listAlerts(): Promise<AlertRow[]> {
  const token = await getAuthToken()
  const response = await fetch(`${API_BASE_URL}/alerts`, {
    headers: {
      'Authorization': `Bearer ${token}`
    }
  })
  
  if (!response.ok) {
    throw new Error(`Failed to fetch alerts: ${response.statusText}`)
  }
  
  return response.json()
}

export async function updateAlert(alertId: string, payload: AlertUpdate): Promise<AlertRow> {
  const token = await getAuthToken()
  const response = await fetch(`${API_BASE_URL}/alerts/${alertId}`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify(payload)
  })
  
  if (!response.ok) {
    throw new Error(`Failed to update alert: ${response.statusText}`)
  }
  
  return response.json()
}

export async function deleteAlert(alertId: string): Promise<void> {
  const token = await getAuthToken()
  const response = await fetch(`${API_BASE_URL}/alerts/${alertId}`, {
    method: 'DELETE',
    headers: {
      'Authorization': `Bearer ${token}`
    }
  })
  
  if (!response.ok) {
    throw new Error(`Failed to delete alert: ${response.statusText}`)
  }
}

export async function getAlertLogs(alertId: string, limit = 50, offset = 0): Promise<AlertLogRow[]> {
  const token = await getAuthToken()
  const response = await fetch(`${API_BASE_URL}/alerts/${alertId}/logs?limit=${limit}&offset=${offset}`, {
    headers: {
      'Authorization': `Bearer ${token}`
    }
  })
  
  if (!response.ok) {
    throw new Error(`Failed to fetch alert logs: ${response.statusText}`)
  }
  
  return response.json()
}

export async function simulateAlert(alertId: string): Promise<any> {
  const token = await getAuthToken()
  const response = await fetch(`${API_BASE_URL}/alerts/${alertId}/simulate`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`
    }
  })
  
  if (!response.ok) {
    throw new Error(`Failed to simulate alert: ${response.statusText}`)
  }
  
  return response.json()
}


