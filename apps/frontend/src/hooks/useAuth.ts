import { useEffect, useState } from 'react'
import { useAuthStore } from '../store/auth'
import { supabase } from '../lib/supabase'

export const useAuth = () => {
  const { setUser, logout } = useAuthStore()
  const [initialized, setInitialized] = useState(false)

  useEffect(() => {
    let mounted = true
    
    // Get initial session synchronously
    const getInitialSession = async () => {
      try {
        // Check if supabase is available
        if (!supabase) {
          console.warn('Supabase client not initialized')
          if (mounted) {
            setInitialized(true)
          }
          return
        }

        const { data: { session }, error } = await supabase.auth.getSession()
        
        if (!mounted) return
        
        if (error) {
          console.error('Error getting session:', error)
          if (mounted) {
            setInitialized(true)
          }
          return
        }

        if (session?.user) {
          setUser({
            id: session.user.id,
            email: session.user.email || '',
            name: session.user.user_metadata?.first_name || session.user.email?.split('@')[0] || ''
          })
        }
        if (mounted) {
          setInitialized(true)
        }
      } catch (error) {
        console.error('Error in getInitialSession:', error)
        if (mounted) {
          setInitialized(true)
        }
      }
    }

    getInitialSession()

    // Listen for auth changes (only if supabase is available)
    let subscription: { unsubscribe: () => void } | null = null
    if (supabase) {
      try {
        const { data: { subscription: sub } } = supabase.auth.onAuthStateChange(
          async (event, session) => {
            if (event === 'SIGNED_IN' && session?.user) {
              setUser({
                id: session.user.id,
                email: session.user.email || '',
                name: session.user.user_metadata?.first_name || session.user.email?.split('@')[0] || ''
              })
            } else if (event === 'SIGNED_OUT') {
              setUser(null)
            }
          }
        )
        subscription = sub
      } catch (error) {
        console.error('Error setting up auth listener:', error)
      }
    }

    return () => {
      mounted = false
      if (subscription) {
        subscription.unsubscribe()
      }
    }
  }, [setUser])

  return initialized
}


