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
        const { data: { session }, error } = await supabase.auth.getSession()
        
        if (!mounted) return
        
        if (error) {
          console.error('Error getting session:', error)
          setInitialized(true)
          return
        }

        if (session?.user) {
          setUser({
            id: session.user.id,
            email: session.user.email || '',
            name: session.user.user_metadata?.first_name || session.user.email?.split('@')[0] || ''
          })
        }
        setInitialized(true)
      } catch (error) {
        console.error('Error in getInitialSession:', error)
        if (mounted) {
          setInitialized(true)
        }
      }
    }

    getInitialSession()

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
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

    return () => {
      mounted = false
      subscription.unsubscribe()
    }
  }, [setUser])

  return initialized
}


