import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuthStore } from '../store/auth';
import { CheckCircle, XCircle, Loader2 } from 'lucide-react';

const AuthCallback = () => {
  const navigate = useNavigate();
  const { setUser } = useAuthStore();
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState<string>('');

  useEffect(() => {
    const handleAuthCallback = async () => {
      try {
        // Supabase automatically processes hash fragments when getSession() is called
        // First, let Supabase process the hash fragment
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        
        // Also check URL hash for error parameters
        const hashParams = new URLSearchParams(window.location.hash.substring(1));
        const error = hashParams.get('error');
        const errorDescription = hashParams.get('error_description');
        const accessToken = hashParams.get('access_token');

        // Check for errors first
        if (error) {
          console.error('Auth callback error:', error, errorDescription);
          setStatus('error');
          
          // Provide more specific error messages
          let errorMsg = errorDescription || 'An error occurred during email verification';
          if (error === 'server_error' && errorDescription?.includes('confirming')) {
            errorMsg = 'Failed to confirm email. The verification link may have expired or already been used. Please try signing up again or request a new confirmation email.';
          }
          
          setMessage(errorMsg);
          
          // Redirect to signin after 5 seconds
          setTimeout(() => {
            navigate('/signin', { 
              state: { 
                error: 'Email verification failed. Please try signing up again.' 
              } 
            });
          }, 5000);
          return;
        }

        // If we have a session, check if email is verified
        if (session?.user) {
          // Check if email is verified
          const isEmailVerified = session.user.email_confirmed_at !== null && session.user.email_confirmed_at !== undefined;
          
          if (isEmailVerified) {
            console.log('✅ Email verified successfully');
            setStatus('success');
            setMessage('Email verified successfully! Redirecting to your dashboard...');
            
            // Set user in auth store
            setUser({
              id: session.user.id,
              email: session.user.email || '',
              name: session.user.user_metadata?.first_name || session.user.email?.split('@')[0] || ''
            });

            // Redirect to app after 2 seconds
            setTimeout(() => {
              navigate('/app');
            }, 2000);
          } else {
            // Session exists but email not verified - might be a timing issue
            // Wait a moment and check again
            await new Promise(resolve => setTimeout(resolve, 1000));
            const { data: { session: retrySession } } = await supabase.auth.getSession();
            if (retrySession?.user?.email_confirmed_at) {
              setStatus('success');
              setMessage('Email verified successfully! Redirecting to your dashboard...');
              setUser({
                id: retrySession.user.id,
                email: retrySession.user.email || '',
                name: retrySession.user.user_metadata?.first_name || retrySession.user.email?.split('@')[0] || ''
              });
              setTimeout(() => navigate('/app'), 2000);
            } else {
              throw new Error('Email verification token received but email is still not verified. Please try again.');
            }
          }
        } else if (accessToken) {
          // We have an access token but no session - try to get session again
          console.log('Access token found, waiting for session...');
          await new Promise(resolve => setTimeout(resolve, 1000));
          const { data: { session: retrySession } } = await supabase.auth.getSession();
          if (retrySession?.user) {
            const isEmailVerified = retrySession.user.email_confirmed_at !== null && retrySession.user.email_confirmed_at !== undefined;
            if (isEmailVerified) {
              setStatus('success');
              setMessage('Email verified successfully! Redirecting to your dashboard...');
              setUser({
                id: retrySession.user.id,
                email: retrySession.user.email || '',
                name: retrySession.user.user_metadata?.first_name || retrySession.user.email?.split('@')[0] || ''
              });
              setTimeout(() => navigate('/app'), 2000);
            } else {
              throw new Error('Email verification incomplete. Please try again.');
            }
          } else {
            throw new Error('Failed to create session. Please try signing up again.');
          }
        } else {
          // No token and no session - might be a direct visit or expired token
          setStatus('error');
          setMessage('Invalid or expired verification link. Please check your email and try again, or sign up again.');
          
          setTimeout(() => {
            navigate('/signin');
          }, 5000);
        }
      } catch (err: any) {
        console.error('Error handling auth callback:', err);
        setStatus('error');
        setMessage(err.message || 'An error occurred during email verification');
        
        setTimeout(() => {
          navigate('/signin', { 
            state: { 
              error: 'Email verification failed. Please try signing up again.' 
            } 
          });
        }, 5000);
      }
    };

    handleAuthCallback();
  }, [navigate, setUser]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 flex items-center justify-center px-4">
      <div className="max-w-md w-full bg-gray-800/80 backdrop-blur-sm border border-gray-700/50 rounded-2xl p-8 text-center">
        {status === 'loading' && (
          <>
            <Loader2 className="h-16 w-16 text-blue-400 animate-spin mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-white mb-2">Verifying your email...</h2>
            <p className="text-gray-400">Please wait while we confirm your email address.</p>
          </>
        )}
        
        {status === 'success' && (
          <>
            <CheckCircle className="h-16 w-16 text-green-400 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-white mb-2">Email Verified!</h2>
            <p className="text-gray-400">{message}</p>
          </>
        )}
        
        {status === 'error' && (
          <>
            <XCircle className="h-16 w-16 text-red-400 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-white mb-2">Verification Failed</h2>
            <p className="text-gray-400 mb-4">{message}</p>
            <p className="text-sm text-gray-500">Redirecting to sign in page...</p>
          </>
        )}
      </div>
    </div>
  );
};

export default AuthCallback;

