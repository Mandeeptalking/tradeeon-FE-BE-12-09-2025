import { useEffect } from 'react'
import { useAuthStore } from '../store/auth'
import { supabase } from '../lib/supabase'

export const useAuth = () => {
  const { setUser, logout } = useAuthStore()

  useEffect(() => {
    // Get initial session
    const getInitialSession = async () => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession()
        
        if (error) {
          console.error('Error getting session:', error)
          return
        }

        if (session?.user) {
          setUser({
            id: session.user.id,
            email: session.user.email || '',
            name: session.user.user_metadata?.first_name || session.user.email?.split('@')[0] || ''
          })
        }
      } catch (error) {
        console.error('Error in getInitialSession:', error)
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
      subscription.unsubscribe()
    }
  }, [setUser])

  return { logout }
}


