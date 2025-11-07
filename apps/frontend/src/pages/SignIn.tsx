import { useState, useRef, useEffect } from 'react';
import { 
  Mail, 
  Lock, 
  Eye, 
  EyeOff, 
  ArrowRight, 
  Bot,
  ArrowLeft,
  Loader2,
  Zap,
  Shield,
  TrendingUp
} from 'lucide-react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '../store/auth';
import { supabase } from '../lib/supabase';

const SignIn = () => {
  const [formData, setFormData] = useState({
    email: '',
    password: ''
  });
  const [showPassword, setShowPassword] = useState(false);
  const [focusedField, setFocusedField] = useState<string | null>(null);
  const [hoveredCard, setHoveredCard] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const formRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  const location = useLocation();
  const { setUser } = useAuthStore();

  useEffect(() => {
    // Check for success message from signup
    if (location.state?.message) {
      setSuccessMessage(location.state.message);
      // Clear the message from location state
      window.history.replaceState({}, document.title);
    }
  }, [location.state]);

  useEffect(() => {
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

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const validateForm = () => {
    if (!formData.email.trim()) {
      setError('Email is required');
      return false;
    }
    if (!/\S+@\S+\.\S+/.test(formData.email)) {
      setError('Please enter a valid email address');
      return false;
    }
    if (!formData.password) {
      setError('Password is required');
      return false;
    }
    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      // Check if supabase is properly configured (not dummy client)
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL?.trim();
      const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY?.trim();
      if (!supabaseUrl || !supabaseKey || !supabaseUrl.startsWith('http')) {
        throw new Error('Authentication service is not configured. Please check your environment variables.');
      }

      // Additional check: ensure supabase.auth exists
      if (!supabase || !supabase.auth) {
        throw new Error('Authentication service is not available. Please check your configuration.');
      }

      // Sign in with Supabase
      const { data, error: signInError } = await supabase.auth.signInWithPassword({
        email: formData.email,
        password: formData.password,
      });

      if (signInError) throw signInError;

      // Update the auth store with user data from Supabase
      if (data.user) {
        setUser({
          id: data.user.id,
          email: data.user.email || formData.email,
          name: data.user.user_metadata?.first_name || formData.email.split('@')[0]
        });
      }
      
      // User signed in successfully
      navigate('/app');
    } catch (err: any) {
      setError(err.message || 'An error occurred during signin');
    } finally {
      setIsLoading(false);
    }
  };

  const benefits = [
    {
      icon: Bot,
      title: 'AI-Powered Trading',
      description: 'Advanced algorithms that never sleep',
      color: 'from-blue-500 to-cyan-500'
    },
    {
      icon: Shield,
      title: 'Secure Platform',
      description: 'Bank-level security for your funds',
      color: 'from-purple-500 to-pink-500'
    },
    {
      icon: TrendingUp,
      title: 'Proven Results',
      description: '24/7 profitable trading opportunities',
      color: 'from-emerald-500 to-green-500'
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 relative overflow-hidden">
      {/* Animated Background */}
      <div className="absolute inset-0">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl animate-float"></div>
        <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-purple-500/10 rounded-full blur-3xl animate-float-delayed"></div>
        <div className="absolute top-1/2 left-1/2 w-64 h-64 bg-emerald-500/10 rounded-full blur-3xl animate-float-slow"></div>
      </div>

      {/* Header */}
      <div className="relative z-10 bg-gray-900/80 backdrop-blur-lg border-b border-gray-700/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Logo */}
            <Link to="/" className="flex items-center space-x-2 group">
              <div className="relative">
                <Bot className="h-8 w-8 text-blue-400 transform group-hover:rotate-12 transition-transform duration-300" />
                <div className="absolute -inset-2 bg-blue-400/20 rounded-full blur-lg opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
              </div>
              <span className="text-xl font-bold bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
                TradingBot Pro
              </span>
            </Link>

            {/* Back to Home */}
            <Link 
              to="/"
              className="flex items-center space-x-2 text-gray-300 hover:text-white transition-colors duration-300 group"
            >
              <ArrowLeft className="h-5 w-5 group-hover:-translate-x-1 transition-transform" />
              <span>Back to Home</span>
            </Link>
          </div>
        </div>
      </div>

      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid lg:grid-cols-2 gap-16 items-start">
          {/* Left Column - Benefits */}
          <div className="space-y-8 lg:pt-8">
            <div className="mb-8">
              <h1 className="text-4xl lg:text-5xl font-bold mb-4">
                <span className="bg-gradient-to-r from-white to-gray-300 bg-clip-text text-transparent">
                  Welcome Back to
                </span>
                <br />
                <span className="bg-gradient-to-r from-blue-400 via-purple-400 to-emerald-400 bg-clip-text text-transparent">
                  TradingBot Pro
                </span>
              </h1>
              <p className="text-xl text-gray-400 max-w-2xl">
                Sign in to access your trading dashboard and continue growing your portfolio.
              </p>
            </div>

            <div className="space-y-6">
              {benefits.map((benefit, index) => (
                <div
                  key={index}
                  className="group relative"
                  onMouseEnter={() => setHoveredCard(index)}
                  onMouseLeave={() => setHoveredCard(null)}
                >
                  <div className={`relative bg-gradient-to-br from-gray-800/80 to-gray-900/80 backdrop-blur-sm border border-gray-700/50 rounded-2xl p-6 transform transition-all duration-500 ${
                    hoveredCard === index 
                      ? 'scale-105 shadow-2xl shadow-purple-500/20' 
                      : ''
                  }`}
                  style={{
                    transformStyle: 'preserve-3d',
                    transform: hoveredCard === index 
                      ? 'perspective(1000px) rotateY(-5deg) rotateX(5deg) scale(1.05)' 
                      : 'perspective(1000px) rotateY(0deg) rotateX(0deg) scale(1)'
                  }}>
                    <div className="flex items-center space-x-4">
                      <div className={`inline-flex items-center justify-center w-12 h-12 bg-gradient-to-br ${benefit.color} rounded-xl transform transition-all duration-300 ${
                        hoveredCard === index ? 'rotate-12 scale-110' : ''
                      }`}>
                        <benefit.icon className="h-6 w-6 text-white" />
                      </div>
                      <div>
                        <h3 className="text-xl font-bold text-white mb-1">
                          {benefit.title}
                        </h3>
                        <p className="text-gray-400">
                          {benefit.description}
                        </p>
                      </div>
                    </div>
                    
                    {/* Hover Effect Overlay */}
                    <div className={`absolute inset-0 bg-gradient-to-r ${benefit.color} opacity-0 rounded-2xl transition-opacity duration-300 ${
                      hoveredCard === index ? 'opacity-5' : ''
                    }`}></div>
                  </div>
                </div>
              ))}
            </div>

            {/* Trust Indicators */}
            <div className="bg-gradient-to-br from-gray-800/50 to-gray-900/50 backdrop-blur-sm border border-gray-700/50 rounded-2xl p-6">
              <div className="grid grid-cols-3 gap-4 text-center">
                <div>
                  <div className="text-2xl font-bold text-emerald-400">50K+</div>
                  <div className="text-sm text-gray-400">Active Users</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-blue-400">$2.5B+</div>
                  <div className="text-sm text-gray-400">Volume Traded</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-purple-400">99.9%</div>
                  <div className="text-sm text-gray-400">Uptime</div>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column - Signin Form */}
          <div className="relative">
            <div
              ref={formRef}
              className="bg-gradient-to-br from-gray-800/80 to-gray-900/80 backdrop-blur-sm border border-gray-700/50 rounded-2xl p-6 transform transition-all duration-300"
              style={{ transformStyle: 'preserve-3d' }}
            >
              {/* Form Header */}
              <div className="text-center mb-6">
                <div className="inline-flex items-center justify-center w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl mb-3">
                  <Zap className="h-6 w-6 text-white" />
                </div>
                <h3 className="text-xl font-bold text-white mb-1">Welcome Back</h3>
                <p className="text-sm text-gray-400">Sign in to your trading account</p>
              </div>

              {/* Success Message */}
              {successMessage && (
                <div className="bg-green-500/10 border border-green-500/20 rounded-lg p-3 mb-4">
                  <p className="text-green-400 text-sm">{successMessage}</p>
                </div>
              )}

              {/* Error Message */}
              {error && (
                <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-3 mb-4">
                  <p className="text-red-400 text-sm">{error}</p>
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-4">
                {/* Email Field */}
                <div className="relative group">
                  <div className={`absolute inset-0 bg-gradient-to-r from-blue-500/20 to-purple-500/20 rounded-xl blur-sm opacity-0 group-hover:opacity-100 transition-opacity duration-300 ${
                    focusedField === 'email' ? 'opacity-100' : ''
                  }`}></div>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <input
                      type="email"
                      name="email"
                      value={formData.email}
                      onChange={handleInputChange}
                      onFocus={() => setFocusedField('email')}
                      onBlur={() => setFocusedField(null)}
                      placeholder="Email Address"
                      className="w-full pl-9 pr-3 py-2.5 bg-gray-700/50 border border-gray-600/50 rounded-lg text-sm text-white placeholder-gray-400 focus:outline-none focus:border-blue-400 focus:bg-gray-700/70 transition-all duration-300"
                      required
                    />
                  </div>
                </div>

                {/* Password Field */}
                <div className="relative group">
                  <div className={`absolute inset-0 bg-gradient-to-r from-blue-500/20 to-purple-500/20 rounded-xl blur-sm opacity-0 group-hover:opacity-100 transition-opacity duration-300 ${
                    focusedField === 'password' ? 'opacity-100' : ''
                  }`}></div>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      name="password"
                      value={formData.password}
                      onChange={handleInputChange}
                      onFocus={() => setFocusedField('password')}
                      onBlur={() => setFocusedField(null)}
                      placeholder="Password"
                      className="w-full pl-9 pr-10 py-2.5 bg-gray-700/50 border border-gray-600/50 rounded-lg text-sm text-white placeholder-gray-400 focus:outline-none focus:border-blue-400 focus:bg-gray-700/70 transition-all duration-300"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-white transition-colors duration-300"
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>

                {/* Forgot Password */}
                <div className="text-right">
                  <Link to="/forgot-password" className="text-sm text-blue-400 hover:text-blue-300 transition-colors duration-300">
                    Forgot your password?
                  </Link>
                </div>

                {/* Submit Button */}
                <button
                  type="submit"
                  disabled={isLoading}
                  className={`w-full group relative bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white py-3 rounded-lg font-semibold transition-all duration-300 transform hover:scale-105 hover:shadow-2xl hover:shadow-purple-500/25 overflow-hidden ${
                    isLoading ? 'opacity-50 cursor-not-allowed' : ''
                  }`}
                >
                  <span className="relative z-10 flex items-center justify-center space-x-2">
                    {isLoading ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        <span>Signing In...</span>
                      </>
                    ) : (
                      <>
                        <span>Sign In</span>
                        <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
                      </>
                    )}
                  </span>
                  <div className="absolute inset-0 bg-gradient-to-r from-purple-500 to-blue-600 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                </button>

                {/* Signup Link */}
                <div className="text-center pt-2">
                  <p className="text-gray-400">
                    Don't have an account?{' '}
                    <Link to="/signup" className="text-blue-400 hover:text-blue-300 font-medium transition-colors duration-300">
                      Create one here
                    </Link>
                  </p>
                  <p className="text-gray-400 mt-2">
                    <Link to="/" className="text-blue-400 hover:text-blue-300 font-medium transition-colors duration-300">
                      ← Back to Home
                    </Link>
                  </p>
                </div>
              </form>
            </div>

            {/* Floating Elements */}
            <div className="absolute -top-6 -left-6 w-12 h-12 bg-gradient-to-br from-blue-500/30 to-purple-500/30 rounded-full blur-sm animate-float"></div>
            <div className="absolute -bottom-3 -right-3 w-8 h-8 bg-gradient-to-br from-emerald-500/30 to-blue-500/30 rounded-full blur-sm animate-float-delayed"></div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SignIn;
