import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY
)

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
  try {
    const { data: { session } } = await supabase.auth.getSession()
    if (session?.access_token) {
      console.log('Using real Supabase token')
      return session.access_token
    }
  } catch (error) {
    console.warn('Supabase auth error:', error)
  }
  
  // For testing purposes, return a mock token
  console.warn('No authentication token available, using mock token for testing')
  return 'mock-jwt-token-for-testing'
}

// API client functions
export async function createAlert(payload: AlertCreate): Promise<AlertRow> {
  console.log('Creating alert with payload:', payload)
  const token = await getAuthToken()
  console.log('Using token:', token)
  
  const response = await fetch(`${API_BASE_URL}/alerts`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify(payload)
  })
  
  console.log('Response status:', response.status)
  console.log('Response ok:', response.ok)
  
  if (!response.ok) {
    const errorText = await response.text()
    console.error('Error response:', errorText)
    throw new Error(`Failed to create alert: ${response.statusText} - ${errorText}`)
  }
  
  const result = await response.json()
  console.log('Alert created successfully:', result)
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


