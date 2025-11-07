import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuthStore } from '../store/auth';

const SignIn = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();
  const { setUser } = useAuthStore();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    if (!supabase) {
      setError('Authentication service is not configured');
      setLoading(false);
      return;
    }

    try {
      console.log('🔐 Attempting sign-in...');
      const { data, error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (signInError) {
        console.error('❌ Sign-in error:', signInError);
        setError(signInError.message);
        setLoading(false);
        return;
      }

      console.log('✅ Sign-in successful:', { user: data.user?.id, session: !!data.session });

      // Check if user exists
      if (!data.user) {
        console.error('❌ Sign-in succeeded but no user data returned');
        setError('Sign-in failed: No user data received. Please try again.');
        setLoading(false);
        return;
      }

      // Wait for session to be fully established
      if (data.session) {
        console.log('✅ Session available, setting user and navigating...');
        setUser({
          id: data.user.id,
          email: data.user.email || email,
          name: data.user.user_metadata?.first_name || email.split('@')[0],
        });
        // Small delay to ensure state is updated
        setTimeout(() => {
          console.log('🚀 Navigating to /app');
          setLoading(false);
          navigate('/app');
        }, 100);
        // Don't set loading to false in finally - we're handling it in setTimeout
        return;
      } else {
        // Session might not be immediately available, wait a bit
        console.log('⏳ Waiting for session...');
        // Capture supabase and user data for use in setTimeout callback
        const supabaseClient = supabase;
        const userData = data.user;
        if (!supabaseClient) {
          setError('Authentication service is not configured');
          setLoading(false);
          return;
        }
        setTimeout(async () => {
          try {
            const { data: { session }, error: sessionError } = await supabaseClient.auth.getSession();
            if (sessionError) {
              console.error('❌ Error getting session:', sessionError);
              setError('Failed to retrieve session. Please try again.');
              setLoading(false);
              return;
            }
            if (session) {
              console.log('✅ Session retrieved, setting user and navigating...');
              setUser({
                id: userData.id,
                email: userData.email || email,
                name: userData.user_metadata?.first_name || email.split('@')[0],
              });
              setLoading(false);
              navigate('/app');
            } else {
              console.error('❌ Session not available after waiting');
              setError('Session not available. Please try again.');
              setLoading(false);
            }
          } catch (err: any) {
            console.error('❌ Error in session retrieval:', err);
            setError('Failed to retrieve session. Please try again.');
            setLoading(false);
          }
        }, 500);
        // Don't set loading to false in finally - we're handling it in setTimeout
        return;
      }
    } catch (err: any) {
      setError(err.message || 'An error occurred');
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 p-4">
      <div className="w-full max-w-md">
        <div className="bg-white/10 backdrop-blur-lg rounded-2xl shadow-2xl p-8 border border-white/20">
          <h1 className="text-3xl font-bold text-white mb-2">Sign In</h1>
          <p className="text-gray-400 mb-6">Welcome back to Tradeeon</p>

          {error && (
            <div className="bg-red-500/20 border border-red-500 text-red-200 px-4 py-3 rounded-lg mb-4">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Email
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="your@email.com"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Password
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="••••••••"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Signing in...' : 'Sign In'}
            </button>
          </form>

          <div className="mt-6 text-center">
            <p className="text-gray-400">
              Don't have an account?{' '}
              <Link to="/signup" className="text-blue-400 hover:text-blue-300">
                Sign up
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SignIn;
