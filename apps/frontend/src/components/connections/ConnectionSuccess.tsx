import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { CheckCircle, ArrowRight, Wallet, Bot, BarChart3, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface ConnectionSuccessProps {
  isOpen: boolean;
  onClose: () => void;
  exchange: string;
  connectionName?: string;
}

const ConnectionSuccess = ({ isOpen, onClose, exchange, connectionName }: ConnectionSuccessProps) => {
  const navigate = useNavigate();
  const [showConfetti, setShowConfetti] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setShowConfetti(true);
      // Hide confetti after animation completes
      const timer = setTimeout(() => setShowConfetti(false), 3000);
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  const quickActions = [
    {
      icon: Wallet,
      title: 'View Portfolio',
      description: 'See your assets and balances',
      action: () => {
        navigate('/app/portfolio');
        onClose();
      },
      color: 'from-green-500 to-emerald-500',
    },
    {
      icon: BarChart3,
      title: 'Explore Dashboard',
      description: 'Check account overview',
      action: () => {
        navigate('/app');
        onClose();
      },
      color: 'from-blue-500 to-cyan-500',
    },
    {
      icon: Bot,
      title: 'Create Trading Bot',
      description: 'Set up automated trading',
      action: () => {
        navigate('/app/bots');
        onClose();
      },
      color: 'from-purple-500 to-pink-500',
    },
  ];

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
        {/* Confetti Animation */}
        {showConfetti && (
          <div className="fixed inset-0 pointer-events-none overflow-hidden">
            {[...Array(50)].map((_, i) => (
              <motion.div
                key={i}
                className="absolute w-2 h-2 rounded-full"
                style={{
                  left: `${Math.random() * 100}%`,
                  top: '-10%',
                  backgroundColor: ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6'][
                    Math.floor(Math.random() * 5)
                  ],
                }}
                initial={{ y: 0, rotate: 0, opacity: 1 }}
                animate={{
                  y: window.innerHeight + 100,
                  rotate: 360,
                  opacity: 0,
                  x: (Math.random() - 0.5) * 200,
                }}
                transition={{
                  duration: 2 + Math.random() * 2,
                  delay: Math.random() * 0.5,
                  ease: 'easeOut',
                }}
              />
            ))}
          </div>
        )}

        <motion.div
          initial={{ opacity: 0, scale: 0.9, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.9, y: 20 }}
          className="relative w-full max-w-lg bg-gray-800/95 backdrop-blur-sm border border-gray-700/50 rounded-2xl shadow-2xl overflow-hidden"
        >
          {/* Close Button */}
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-2 hover:bg-gray-700/50 rounded-lg transition-colors z-10"
            aria-label="Close"
          >
            <X className="h-5 w-5 text-gray-400" />
          </button>

          {/* Success Icon */}
          <div className="flex flex-col items-center pt-12 pb-6 px-6">
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: 'spring', duration: 0.6, delay: 0.2 }}
              className="relative"
            >
              <div className="absolute inset-0 bg-green-500/20 rounded-full blur-2xl animate-pulse" />
              <div className="relative w-24 h-24 bg-green-500 rounded-full flex items-center justify-center shadow-lg shadow-green-500/30">
                <CheckCircle className="h-12 w-12 text-white" />
              </div>
            </motion.div>

            {/* Success Message */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
              className="text-center mt-6"
            >
              <h2 className="text-3xl font-bold text-white mb-2">Connection Successful!</h2>
              <p className="text-gray-400">
                {connectionName ? (
                  <>
                    <span className="font-semibold text-white">{connectionName}</span> has been connected successfully
                  </>
                ) : (
                  <>
                    Your <span className="font-semibold text-white">{exchange}</span> account is now connected
                  </>
                )}
              </p>
            </motion.div>
          </div>

          {/* What's Next Section */}
          <div className="px-6 pb-6">
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.6 }}
            >
              <h3 className="text-lg font-semibold text-white mb-4">What's Next?</h3>
              <div className="grid gap-3">
                {quickActions.map((action, index) => {
                  const Icon = action.icon;
                  return (
                    <motion.button
                      key={action.title}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.7 + index * 0.1 }}
                      onClick={action.action}
                      className={`group relative overflow-hidden rounded-xl bg-gradient-to-r ${action.color} p-4 text-left transition-all hover:scale-[1.02] hover:shadow-lg`}
                    >
                      <div className="relative z-10 flex items-center gap-4">
                        <div className="flex-shrink-0 w-12 h-12 bg-white/20 rounded-lg flex items-center justify-center backdrop-blur-sm">
                          <Icon className="h-6 w-6 text-white" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <h4 className="font-semibold text-white mb-0.5">{action.title}</h4>
                          <p className="text-sm text-white/80">{action.description}</p>
                        </div>
                        <ArrowRight className="h-5 w-5 text-white/60 group-hover:text-white group-hover:translate-x-1 transition-all" />
                      </div>
                      <div className="absolute inset-0 bg-white/0 group-hover:bg-white/10 transition-colors" />
                    </motion.button>
                  );
                })}
              </div>
            </motion.div>
          </div>

          {/* Footer */}
          <div className="px-6 pb-6">
            <motion.button
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 1 }}
              onClick={onClose}
              className="w-full px-4 py-2.5 bg-gray-700/50 hover:bg-gray-700 text-white rounded-lg font-medium transition-colors"
            >
              Close
            </motion.button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};

export default ConnectionSuccess;

