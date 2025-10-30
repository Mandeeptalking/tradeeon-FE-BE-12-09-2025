import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { AlertRow, AlertUpdate, createAlert, listAlerts, updateAlert, deleteAlert } from '../lib/api/alertsApi'
import { toast } from '../components/ui/use-toast'

interface AlertsState {
  alerts: AlertRow[]
  loading: boolean
  error: string | null
  
  // Actions
  fetchAlerts: () => Promise<void>
  addAlert: (payload: Omit<AlertRow, 'alert_id' | 'user_id' | 'created_at' | 'last_triggered_at'>) => Promise<void>
  patchAlert: (alertId: string, payload: AlertUpdate) => Promise<void>
  removeAlert: (alertId: string) => Promise<void>
  clearError: () => void
}

export const useAlertsStore = create<AlertsState>()(
  persist(
    (set, get) => ({
      alerts: [],
      loading: false,
      error: null,

      fetchAlerts: async () => {
        set({ loading: true, error: null })
        try {
          const alerts = await listAlerts()
          set({ alerts, loading: false })
        } catch (error) {
          set({ 
            error: error instanceof Error ? error.message : 'Failed to fetch alerts',
            loading: false 
          })
        }
      },

      addAlert: async (payload) => {
        set({ loading: true, error: null })
        try {
          const newAlert = await createAlert(payload)
          set(state => ({ 
            alerts: [newAlert, ...state.alerts],
            loading: false 
          }))
          toast({ title: "Alert created successfully" })
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Failed to create alert'
          set({ 
            error: errorMessage,
            loading: false 
          })
          toast({ 
            title: "Create failed", 
            description: errorMessage, 
            variant: "destructive" 
          })
          throw error
        }
      },

      patchAlert: async (alertId, payload) => {
        set({ loading: true, error: null })
        try {
          const updatedAlert = await updateAlert(alertId, payload)
          set(state => ({
            alerts: state.alerts.map(alert => 
              alert.alert_id === alertId ? updatedAlert : alert
            ),
            loading: false
          }))
          toast({ title: "Alert updated successfully" })
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Failed to update alert'
          set({ 
            error: errorMessage,
            loading: false 
          })
          toast({ 
            title: "Update failed", 
            description: errorMessage, 
            variant: "destructive" 
          })
          throw error
        }
      },

      removeAlert: async (alertId) => {
        set({ loading: true, error: null })
        try {
          await deleteAlert(alertId)
          set(state => ({
            alerts: state.alerts.filter(alert => alert.alert_id !== alertId),
            loading: false
          }))
          toast({ title: "Alert deleted successfully" })
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Failed to delete alert'
          set({ 
            error: errorMessage,
            loading: false 
          })
          toast({ 
            title: "Delete failed", 
            description: errorMessage, 
            variant: "destructive" 
          })
          throw error
        }
      },

      clearError: () => set({ error: null })
    }),
    {
      name: 'alerts-storage',
      partialize: (state) => ({ alerts: state.alerts })
    }
  )
)


