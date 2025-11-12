import { useEffect, useState } from 'react'
import { useAuthStore } from '../store/auth'
import { supabase } from '../lib/supabase'
import { logger } from '../utils/logger'

export const useAuth = () => {
  const { setUser, logout } = useAuthStore()
  const [initialized, setInitialized] = useState(false)

  useEffect(() => {
    let mounted = true
    
    // Get initial session synchronously
    const getInitialSession = async () => {
      try {
        // Check if supabase is properly configured (not dummy client)
        const supabaseUrl = import.meta.env.VITE_SUPABASE_URL?.trim();
        const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY?.trim();
        if (!supabaseUrl || !supabaseKey || !supabaseUrl.startsWith('http')) {
          logger.warn('⚠️ Supabase not properly configured')
          if (mounted) {
            setInitialized(true)
          }
          return
        }

        logger.debug('🔍 Checking for existing session...');
        const { data: { session }, error } = await supabase.auth.getSession()
        
        if (!mounted) return
        
        if (error) {
          logger.error('❌ Error getting session:', error)
          if (mounted) {
            setInitialized(true)
          }
          return
        }

        if (session?.user) {
          // Check if email is verified
          const isEmailVerified = session.user.email_confirmed_at !== null && session.user.email_confirmed_at !== undefined;
          
          if (isEmailVerified) {
            logger.debug('✅ Session found (email verified):', { userId: session.user.id, email: session.user.email });
            setUser({
              id: session.user.id,
              email: session.user.email || '',
              name: session.user.user_metadata?.first_name || session.user.email?.split('@')[0] || ''
            })
          } else {
            logger.warn('⚠️ Session found but email not verified:', { userId: session.user.id, email: session.user.email });
            // Don't set user if email is not verified - user needs to verify first
            // Sign out the user to clear the unverified session
            await supabase.auth.signOut();
          }
        } else {
          logger.debug('ℹ️ No active session found');
        }
        if (mounted) {
          setInitialized(true)
        }
      } catch (error) {
        logger.error('❌ Error in getInitialSession:', error)
        if (mounted) {
          setInitialized(true)
        }
      }
    }

    getInitialSession()

        // Listen for auth changes (only if supabase is properly configured)
        let subscription: { unsubscribe: () => void } | null = null
        const supabaseUrl = import.meta.env.VITE_SUPABASE_URL?.trim();
        const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY?.trim();
        if (supabaseUrl && supabaseKey && supabaseUrl.startsWith('http')) {
          try {
            logger.debug('👂 Setting up auth state change listener...');
            const { data: { subscription: sub } } = supabase.auth.onAuthStateChange(
              async (event, session) => {
                logger.debug('🔄 Auth state changed:', event, { hasSession: !!session, userId: session?.user?.id });
                
                if (!mounted) return
                
                if (event === 'SIGNED_IN' && session?.user) {
                  // Check if email is verified before setting user
                  const isEmailVerified = session.user.email_confirmed_at !== null && session.user.email_confirmed_at !== undefined;
                  if (isEmailVerified) {
                    logger.debug('✅ User signed in via listener (email verified):', session.user.id);
                    setUser({
                      id: session.user.id,
                      email: session.user.email || '',
                      name: session.user.user_metadata?.first_name || session.user.email?.split('@')[0] || ''
                    })
                  } else {
                    logger.warn('⚠️ Sign in attempted but email not verified - signing out');
                    // Sign out the user immediately - they need to verify email first
                    try {
                      await supabase.auth.signOut();
                      logger.debug('✅ Unverified session cleared');
                    } catch (signOutError) {
                      logger.error('❌ Error signing out unverified user:', signOutError);
                    }
                  }
                } else if (event === 'SIGNED_OUT') {
                  logger.debug('👋 User signed out');
                  setUser(null)
                } else if (event === 'TOKEN_REFRESHED' && session?.user) {
                  // Check if email is verified before setting user
                  const isEmailVerified = session.user.email_confirmed_at !== null && session.user.email_confirmed_at !== undefined;
                  if (isEmailVerified) {
                    setUser({
                      id: session.user.id,
                      email: session.user.email || '',
                      name: session.user.user_metadata?.first_name || session.user.email?.split('@')[0] || ''
                    })
                  } else {
                    // Email not verified - sign out
                    await supabase.auth.signOut();
                  }
                } else if (event === 'USER_UPDATED' && session?.user) {
                  // Check if email was just verified
                  const isEmailVerified = session.user.email_confirmed_at !== null && session.user.email_confirmed_at !== undefined;
                  if (isEmailVerified) {
                    logger.debug('✅ Email verified - setting user');
                    setUser({
                      id: session.user.id,
                      email: session.user.email || '',
                      name: session.user.user_metadata?.first_name || session.user.email?.split('@')[0] || ''
                    })
                  }
                }
              }
            )
            subscription = sub
            logger.debug('✅ Auth listener set up successfully');
          } catch (error) {
            logger.error('❌ Error setting up auth listener:', error)
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


