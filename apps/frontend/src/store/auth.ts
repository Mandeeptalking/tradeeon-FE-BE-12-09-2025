import { create } from 'zustand'

interface User {
  id: string
  email: string
  name: string
}

interface AuthState {
  user: User | null
  isAuthenticated: boolean
  login: (email: string, password: string) => Promise<boolean>
  logout: () => void
  setUser: (user: User | null) => void
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  isAuthenticated: false,
  
  login: async (email: string, password: string) => {
    // This is now handled by Supabase in the signin page
    // Keep this for backward compatibility
    if (email && password) {
      const user: User = {
        id: '1',
        email,
        name: email.split('@')[0]
      }
      set({ user, isAuthenticated: true })
      return true
    }
    return false
  },
  
  setUser: (user: User | null) => {
    set({ user, isAuthenticated: !!user })
  },
  
  logout: async () => {
    try {
      // Import supabase here to avoid circular dependency
      const { supabase } = await import('../lib/supabase')
      if (supabase) {
        await supabase.auth.signOut()
      }
    } catch (error) {
      console.error('Error signing out:', error)
    } finally {
      set({ user: null, isAuthenticated: false })
    }
  }
}))
