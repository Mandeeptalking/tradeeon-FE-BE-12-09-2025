import { useState, useEffect, useRef } from 'react';
import { 
  Lock, 
  Eye, 
  EyeOff,
  ArrowRight, 
  ArrowLeft,
  Loader2,
  AlertCircle,
  CheckCircle,
  Shield,
  Key
} from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { logger } from '../utils/logger';
import { sanitizeInput, validatePassword } from '../utils/validation';
import { sanitizeErrorMessage } from '../utils/errorHandler';
import { checkPasswordStrength } from '../utils/passwordStrength';

const ResetPassword = () => {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [focusedField, setFocusedField] = useState<string | null>(null);
  const [passwordStrength, setPasswordStrength] = useState<ReturnType<typeof checkPasswordStrength> | null>(null);
  const [isValidToken, setIsValidToken] = useState<boolean | null>(null);
  const formRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  useEffect(() => {
    // Check if we have a valid reset token in the URL hash
    const checkToken = async () => {
      const hashParams = new URLSearchParams(window.location.hash.substring(1));
      const accessToken = hashParams.get('access_token');
      const type = hashParams.get('type');

      if (type === 'recovery' && accessToken) {
        // Token exists, user can reset password
        setIsValidToken(true);
        logger.debug('Password reset token found');
      } else {
        setIsValidToken(false);
        logger.warn('No valid password reset token found');
      }
    };

    checkToken();
  }, []);

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

  // Check password strength
  useEffect(() => {
    if (password) {
      setPasswordStrength(checkPasswordStrength(password));
    } else {
      setPasswordStrength(null);
    }
  }, [password]);

  const validateForm = (): boolean => {
    const newErrors: string[] = [];

    if (!password.trim()) {
      newErrors.push('Password is required');
    } else {
      const validation = validatePassword(password);
      if (!validation.isValid) {
        newErrors.push(validation.errors[0]);
      }
    }

    if (!confirmPassword.trim()) {
      newErrors.push('Please confirm your password');
    } else if (password !== confirmPassword) {
      newErrors.push('Passwords do not match');
    }

    if (newErrors.length > 0) {
      setError(newErrors[0]);
      return false;
    }

    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!validateForm()) {
      return;
    }

    if (isValidToken === false) {
      setError('Invalid or expired reset link. Please request a new password reset.');
      return;
    }

    setIsLoading(true);

    try {
      const sanitizedPassword = sanitizeInput(password);

      logger.debug('Updating password...');
      
      const { error: updateError } = await supabase.auth.updateUser({
        password: sanitizedPassword
      });

      if (updateError) {
        logger.error('Password update error:', updateError);
        setError(sanitizeErrorMessage(updateError));
        return;
      }

      // Success
      setSuccess(true);
      logger.debug('Password updated successfully');

      // Redirect to sign in after 3 seconds
      setTimeout(() => {
        navigate('/signin', {
          state: {
            message: 'Password reset successfully! Please sign in with your new password.'
          }
        });
      }, 3000);

    } catch (err: any) {
      logger.error('Unexpected error during password reset:', err);
      setError(sanitizeErrorMessage(err));
    } finally {
      setIsLoading(false);
    }
  };

  // Show loading state while checking token
  if (isValidToken === null) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 flex items-center justify-center px-4">
        <div className="text-center">
          <Loader2 className="h-12 w-12 text-blue-400 animate-spin mx-auto mb-4" />
          <p className="text-white/70">Verifying reset link...</p>
        </div>
      </div>
    );
  }

  // Show error if token is invalid
  if (isValidToken === false) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 flex items-center justify-center px-4">
        <div className="max-w-md w-full bg-gray-800/80 backdrop-blur-sm border border-gray-700/50 rounded-2xl p-8 text-center">
          <AlertCircle className="h-16 w-16 text-red-400 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-white mb-2">Invalid Reset Link</h2>
          <p className="text-gray-400 mb-6">
            This password reset link is invalid or has expired. Please request a new one.
          </p>
          <div className="flex flex-col gap-3">
            <Link
              to="/forgot-password"
              className="w-full px-6 py-3 bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600 text-white rounded-lg font-medium transition-all shadow-lg shadow-blue-500/30 flex items-center justify-center gap-2"
            >
              <span>Request New Reset Link</span>
              <ArrowRight className="h-4 w-4" />
            </Link>
            <Link
              to="/signin"
              className="w-full px-4 py-2 text-gray-400 hover:text-white transition-colors text-sm"
            >
              Back to Sign In
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // Success state
  if (success) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 flex items-center justify-center px-4">
        <div className="max-w-md w-full bg-gray-800/80 backdrop-blur-sm border border-gray-700/50 rounded-2xl p-8 text-center">
          <div className="flex justify-center mb-6">
            <div className="relative">
              <CheckCircle className="h-16 w-16 text-green-400" />
              <div className="absolute inset-0 bg-green-400 rounded-full blur-xl opacity-30 animate-pulse" />
            </div>
          </div>
          <h2 className="text-3xl font-bold text-white mb-3">Password Reset!</h2>
          <p className="text-gray-300 mb-6">
            Your password has been successfully reset. Redirecting to sign in...
          </p>
          <Link
            to="/signin"
            className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600 text-white rounded-lg font-medium transition-all shadow-lg shadow-blue-500/30"
          >
            <span>Go to Sign In</span>
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 flex items-center justify-center px-4">
      <div className="max-w-md w-full">
        {/* Back button */}
        <Link 
          to="/signin" 
          className="inline-flex items-center gap-2 text-gray-400 hover:text-white transition-colors mb-6"
        >
          <ArrowLeft className="h-4 w-4" />
          <span>Back to Sign In</span>
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
                <Key className="h-8 w-8 text-blue-400" />
                <div className="absolute inset-0 bg-blue-500/20 rounded-2xl blur-xl" />
              </div>
            </div>
            <h2 className="text-3xl font-bold text-white mb-2">Create New Password</h2>
            <p className="text-gray-400">
              Enter your new password below. Make sure it's strong and secure.
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
            {/* New Password Field */}
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-300 mb-2">
                New Password
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Lock className={`h-5 w-5 ${focusedField === 'password' ? 'text-blue-400' : 'text-gray-500'}`} />
                </div>
                <input
                  id="password"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="new-password"
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    setError(null);
                  }}
                  onFocus={() => setFocusedField('password')}
                  onBlur={() => setFocusedField(null)}
                  required
                  className="w-full pl-10 pr-10 py-3 bg-gray-700/50 border border-gray-600/50 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 transition-all"
                  placeholder="Enter new password"
                  disabled={isLoading}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-300"
                >
                  {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                </button>
              </div>
              
              {/* Password Strength Indicator */}
              {passwordStrength && (
                <div className="mt-2">
                  <div className="flex items-center gap-2 mb-1">
                    <div className={`h-1 flex-1 rounded-full ${
                      passwordStrength.score === 0 ? 'bg-red-500' :
                      passwordStrength.score === 1 ? 'bg-orange-500' :
                      passwordStrength.score === 2 ? 'bg-yellow-500' :
                      'bg-green-500'
                    }`} style={{ width: `${(passwordStrength.score + 1) * 25}%` }} />
                    <span className={`text-xs font-medium ${
                      passwordStrength.score === 0 ? 'text-red-400' :
                      passwordStrength.score === 1 ? 'text-orange-400' :
                      passwordStrength.score === 2 ? 'text-yellow-400' :
                      'text-green-400'
                    }`}>
                      {passwordStrength.label}
                    </span>
                  </div>
                  {passwordStrength.feedback.length > 0 && (
                    <p className="text-xs text-gray-400">{passwordStrength.feedback[0]}</p>
                  )}
                </div>
              )}
            </div>

            {/* Confirm Password Field */}
            <div>
              <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-300 mb-2">
                Confirm New Password
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Lock className={`h-5 w-5 ${focusedField === 'confirmPassword' ? 'text-blue-400' : 'text-gray-500'}`} />
                </div>
                <input
                  id="confirmPassword"
                  name="confirmPassword"
                  type={showConfirmPassword ? 'text' : 'password'}
                  autoComplete="new-password"
                  value={confirmPassword}
                  onChange={(e) => {
                    setConfirmPassword(e.target.value);
                    setError(null);
                  }}
                  onFocus={() => setFocusedField('confirmPassword')}
                  onBlur={() => setFocusedField(null)}
                  required
                  className="w-full pl-10 pr-10 py-3 bg-gray-700/50 border border-gray-600/50 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 transition-all"
                  placeholder="Confirm new password"
                  disabled={isLoading}
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-300"
                >
                  {showConfirmPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                </button>
              </div>
              {confirmPassword && password !== confirmPassword && (
                <p className="mt-1 text-xs text-red-400">Passwords do not match</p>
              )}
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isLoading || !password || !confirmPassword || password !== confirmPassword}
              className="w-full px-6 py-3 bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600 text-white rounded-lg font-medium transition-all shadow-lg shadow-blue-500/30 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {isLoading ? (
                <>
                  <Loader2 className="h-5 w-5 animate-spin" />
                  <span>Resetting Password...</span>
                </>
              ) : (
                <>
                  <span>Reset Password</span>
                  <ArrowRight className="h-5 w-5" />
                </>
              )}
            </button>
          </form>

          {/* Security Note */}
          <div className="mt-6 p-4 bg-blue-500/10 border border-blue-500/20 rounded-lg">
            <div className="flex items-start gap-3">
              <Shield className="h-5 w-5 text-blue-400 flex-shrink-0 mt-0.5" />
              <div className="text-left">
                <p className="text-sm text-blue-300 font-medium mb-1">Security Tips</p>
                <ul className="text-xs text-gray-400 space-y-1 list-disc list-inside">
                  <li>Use at least 8 characters</li>
                  <li>Include uppercase, lowercase, numbers, and symbols</li>
                  <li>Don't reuse passwords from other accounts</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ResetPassword;

