import { useState, useRef, useEffect } from 'react';
import { 
  Mail, 
  ArrowRight, 
  ArrowLeft,
  Loader2,
  AlertCircle,
  CheckCircle,
  Shield,
  RefreshCw
} from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { logger } from '../utils/logger';
import { sanitizeInput } from '../utils/validation';
import { sanitizeErrorMessage } from '../utils/errorHandler';

const ForgotPassword = () => {
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [focusedField, setFocusedField] = useState<string | null>(null);
  const [isResending, setIsResending] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);
  const formRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  // Rate limiting constants
  const RESEND_LIMIT = 3; // Max 3 resends per hour
  const RESEND_WINDOW = 60 * 60 * 1000; // 1 hour in milliseconds
  const STORAGE_KEY = 'password_reset_attempts';

  useEffect(() => {
    // 3D card effect
    const handleMouseMove = (e: MouseEvent) => {
      if (formRef.current) {
        const rect = formRef.current.getBoundingClientRect();
        const x = (e.clientX - rect.left) / rect.width - 0.5;
        const y = (e.clientY - rect.top) / rect.height - 0.5;
        
        formRef.current.style.transform = `
          perspective(1000px) 
          rotateY(${x * 5}deg) 
          rotateX(${-y * 5}deg)
          translateZ(20px)
        `;
      }
    };

    const form = formRef.current;
    if (form) {
      form.addEventListener('mousemove', handleMouseMove);
      return () => form.removeEventListener('mousemove', handleMouseMove);
    }
  }, []);

  // Countdown timer for resend cooldown
  useEffect(() => {
    if (resendCooldown > 0) {
      const timer = setInterval(() => {
        setResendCooldown((prev) => {
          if (prev <= 1) {
            clearInterval(timer);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
      return () => clearInterval(timer);
    }
  }, [resendCooldown]);

  // Check cooldown on mount
  useEffect(() => {
    const attempts = getRecentAttempts();
    if (attempts.length > 0) {
      const lastAttempt = attempts[attempts.length - 1];
      const timeSinceLastAttempt = Date.now() - lastAttempt;
      const remainingCooldown = Math.max(0, RESEND_WINDOW - timeSinceLastAttempt);
      if (remainingCooldown > 0) {
        setResendCooldown(Math.ceil(remainingCooldown / 1000));
      }
    }
  }, []);

  const getRecentAttempts = (): number[] => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (!stored) return [];
      const attempts = JSON.parse(stored) as number[];
      const now = Date.now();
      return attempts.filter((timestamp) => now - timestamp < RESEND_WINDOW);
    } catch {
      return [];
    }
  };

  const recordAttempt = () => {
    try {
      const attempts = getRecentAttempts();
      attempts.push(Date.now());
      localStorage.setItem(STORAGE_KEY, JSON.stringify(attempts));
    } catch (error) {
      logger.error('Failed to record password reset attempt:', error);
    }
  };

  const checkResendCooldown = (): boolean => {
    const attempts = getRecentAttempts();
    if (attempts.length >= RESEND_LIMIT) {
      const oldestAttempt = attempts[0];
      const timeSinceOldest = Date.now() - oldestAttempt;
      if (timeSinceOldest < RESEND_WINDOW) {
        return false; // Still in cooldown
      }
    }
    return true; // Can resend
  };

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    if (mins > 0) {
      return `${mins}m ${secs}s`;
    }
    return `${secs}s`;
  };

  const validateEmail = (emailValue: string): boolean => {
    if (!emailValue.trim()) {
      setError('Email is required');
      return false;
    }
    if (!/\S+@\S+\.\S+/.test(emailValue)) {
      setError('Please enter a valid email address');
      return false;
    }
    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const sanitizedEmail = sanitizeInput(email).trim().toLowerCase();
    
    if (!validateEmail(sanitizedEmail)) {
      return;
    }

    // Check rate limiting
    if (!checkResendCooldown()) {
      const attempts = getRecentAttempts();
      const oldestAttempt = attempts[0];
      const timeSinceOldest = Date.now() - oldestAttempt;
      const remainingTime = Math.ceil((RESEND_WINDOW - timeSinceOldest) / 1000);
      setError(`Too many password reset requests. Please try again in ${formatTime(remainingTime)}.`);
      setResendCooldown(remainingTime);
      return;
    }

    setIsLoading(true);

    try {
      logger.debug('Sending password reset email to:', sanitizedEmail);
      
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(sanitizedEmail, {
        redirectTo: `${window.location.origin}/auth/reset-password`,
      });

      if (resetError) {
        logger.error('Password reset error:', resetError);
        // Don't reveal if email exists or not (security best practice)
        const errorMessage = sanitizeErrorMessage(resetError);
        setError(errorMessage);
        return;
      }

      // Success - record attempt and show success message
      recordAttempt();
      setSuccess(true);
      logger.debug('Password reset email sent successfully');
      
    } catch (err: any) {
      logger.error('Unexpected error during password reset:', err);
      setError(sanitizeErrorMessage(err));
    } finally {
      setIsLoading(false);
    }
  };

  const handleResend = async () => {
    if (resendCooldown > 0 || !checkResendCooldown()) {
      return;
    }

    const sanitizedEmail = sanitizeInput(email).trim().toLowerCase();
    if (!validateEmail(sanitizedEmail)) {
      return;
    }

    setIsResending(true);
    setError(null);

    try {
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(sanitizedEmail, {
        redirectTo: `${window.location.origin}/auth/reset-password`,
      });

      if (resetError) {
        setError(sanitizeErrorMessage(resetError));
        return;
      }

      recordAttempt();
      const attempts = getRecentAttempts();
      if (attempts.length >= RESEND_LIMIT) {
        setResendCooldown(Math.ceil(RESEND_WINDOW / 1000));
      }
      
      // Show success toast or message
      setSuccess(true);
    } catch (err: any) {
      logger.error('Error resending password reset:', err);
      setError(sanitizeErrorMessage(err));
    } finally {
      setIsResending(false);
    }
  };

  if (success) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 flex items-center justify-center px-4">
        <div 
          ref={formRef}
          className="max-w-md w-full bg-gray-800/80 backdrop-blur-sm border border-gray-700/50 rounded-2xl p-8 shadow-2xl transition-transform"
        >
          <div className="text-center">
            <div className="flex justify-center mb-6">
              <div className="relative">
                <CheckCircle className="h-16 w-16 text-green-400" />
                <div className="absolute inset-0 bg-green-400 rounded-full blur-xl opacity-30 animate-pulse" />
              </div>
            </div>
            
            <h2 className="text-3xl font-bold text-white mb-3">Check Your Email</h2>
            <p className="text-gray-300 mb-6">
              We've sent password reset instructions to <strong className="text-white">{email}</strong>
            </p>
            
            <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-4 mb-6">
              <div className="flex items-start gap-3">
                <Mail className="h-5 w-5 text-blue-400 flex-shrink-0 mt-0.5" />
                <div className="text-left">
                  <p className="text-sm text-blue-300 font-medium mb-1">What's next?</p>
                  <ul className="text-xs text-gray-400 space-y-1 list-disc list-inside">
                    <li>Check your inbox (and spam folder)</li>
                    <li>Click the reset link in the email</li>
                    <li>Create a new password</li>
                    <li>Sign in with your new password</li>
                  </ul>
                </div>
              </div>
            </div>

            {resendCooldown > 0 ? (
              <p className="text-sm text-gray-400 mb-4">
                Resend available in {formatTime(resendCooldown)}
              </p>
            ) : (
              <button
                onClick={handleResend}
                disabled={isResending}
                className="w-full mb-4 px-4 py-2 bg-gray-700/50 hover:bg-gray-700/70 text-gray-300 rounded-lg text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {isResending ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span>Resending...</span>
                  </>
                ) : (
                  <>
                    <RefreshCw className="h-4 w-4" />
                    <span>Resend Email</span>
                  </>
                )}
              </button>
            )}

            <div className="flex flex-col gap-3">
              <button
                onClick={() => navigate('/signin')}
                className="w-full px-6 py-3 bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600 text-white rounded-lg font-medium transition-all shadow-lg shadow-blue-500/30 flex items-center justify-center gap-2"
              >
                <span>Back to Sign In</span>
                <ArrowRight className="h-4 w-4" />
              </button>
              
              <button
                onClick={() => {
                  setSuccess(false);
                  setEmail('');
                  setError(null);
                }}
                className="w-full px-4 py-2 text-gray-400 hover:text-white transition-colors text-sm"
              >
                Use a different email
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 flex items-center justify-center px-4">
      <div className="max-w-md w-full">
        {/* Back to home button */}
        <Link 
          to="/" 
          className="inline-flex items-center gap-2 text-gray-400 hover:text-white transition-colors mb-6"
        >
          <ArrowLeft className="h-4 w-4" />
          <span>Back to Home</span>
        </Link>

        {/* Form Card */}
        <div 
          ref={formRef}
          className="bg-gray-800/80 backdrop-blur-sm border border-gray-700/50 rounded-2xl p-8 shadow-2xl transition-transform"
        >
          {/* Header */}
          <div className="text-center mb-8">
            <div className="flex justify-center mb-4">
              <div className="relative p-4 bg-gradient-to-br from-blue-500/20 to-cyan-500/20 rounded-2xl">
                <Shield className="h-8 w-8 text-blue-400" />
                <div className="absolute inset-0 bg-blue-500/20 rounded-2xl blur-xl" />
              </div>
            </div>
            <h2 className="text-3xl font-bold text-white mb-2">Reset Password</h2>
            <p className="text-gray-400">
              Enter your email address and we'll send you instructions to reset your password.
            </p>
          </div>

          {/* Error Message */}
          {error && (
            <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 rounded-lg flex items-start gap-3">
              <AlertCircle className="h-5 w-5 text-red-400 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-red-300">{error}</p>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Email Field */}
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-300 mb-2">
                Email Address
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Mail className={`h-5 w-5 ${focusedField === 'email' ? 'text-blue-400' : 'text-gray-500'}`} />
                </div>
                <input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    setError(null);
                  }}
                  onFocus={() => setFocusedField('email')}
                  onBlur={() => setFocusedField(null)}
                  required
                  className="w-full pl-10 pr-4 py-3 bg-gray-700/50 border border-gray-600/50 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 transition-all"
                  placeholder="you@example.com"
                  disabled={isLoading}
                />
              </div>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isLoading}
              className="w-full px-6 py-3 bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600 text-white rounded-lg font-medium transition-all shadow-lg shadow-blue-500/30 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {isLoading ? (
                <>
                  <Loader2 className="h-5 w-5 animate-spin" />
                  <span>Sending...</span>
                </>
              ) : (
                <>
                  <span>Send Reset Instructions</span>
                  <ArrowRight className="h-5 w-5" />
                </>
              )}
            </button>
          </form>

          {/* Help Text */}
          <div className="mt-6 p-4 bg-blue-500/10 border border-blue-500/20 rounded-lg">
            <div className="flex items-start gap-3">
              <Shield className="h-5 w-5 text-blue-400 flex-shrink-0 mt-0.5" />
              <div className="text-left">
                <p className="text-sm text-blue-300 font-medium mb-1">Security Note</p>
                <p className="text-xs text-gray-400">
                  For security reasons, we don't reveal whether an email exists in our system. If the email is registered, you'll receive reset instructions.
                </p>
              </div>
            </div>
          </div>

          {/* Sign In Link */}
          <div className="mt-6 text-center">
            <p className="text-sm text-gray-400">
              Remember your password?{' '}
              <Link to="/signin" className="text-blue-400 hover:text-blue-300 font-medium transition-colors">
                Sign in here
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ForgotPassword;
