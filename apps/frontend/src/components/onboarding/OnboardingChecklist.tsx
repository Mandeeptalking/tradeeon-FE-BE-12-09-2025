import React, { useEffect, useState } from 'react';
import { CheckCircle, Circle, Link as LinkIcon, Wallet, Mail } from 'lucide-react';
import { motion } from 'framer-motion';
import { useAuthStore } from '../../store/auth';
import { connectionsApi } from '../../lib/api/connections';
import { useNavigate } from 'react-router-dom';

interface OnboardingChecklistProps {
  onDismiss?: () => void;
}

const OnboardingChecklist = ({ onDismiss }: OnboardingChecklistProps) => {
  const { user } = useAuthStore();
  const navigate = useNavigate();
  const [checklist, setChecklist] = useState({
    emailVerified: false,
    exchangeConnected: false,
    portfolioViewed: false,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkProgress();
    // Refresh every 30 seconds
    const interval = setInterval(checkProgress, 30000);
    return () => clearInterval(interval);
  }, []);

  const checkProgress = async () => {
    try {
      // Check email verification (user exists and is authenticated)
      const emailVerified = !!user && !!user.email;

      // Check if exchange is connected
      let exchangeConnected = false;
      try {
        const connections = await connectionsApi.listConnections();
        exchangeConnected = connections.some(
          (conn) => conn.exchange === 'BINANCE' && conn.status === 'connected'
        );
      } catch (error) {
        // Ignore errors
      }

      // Check if portfolio has been viewed (using localStorage)
      const portfolioViewed = localStorage.getItem('portfolio_viewed') === 'true';

      setChecklist({
        emailVerified,
        exchangeConnected,
        portfolioViewed,
      });
    } catch (error) {
      // Ignore errors
    } finally {
      setLoading(false);
    }
  };

  const completedCount = Object.values(checklist).filter(Boolean).length;
  const totalCount = Object.keys(checklist).length;
  const progressPercentage = (completedCount / totalCount) * 100;

  const checklistItems = [
    {
      key: 'emailVerified',
      icon: Mail,
      label: 'Verify Email',
      description: 'Confirm your email address',
      action: () => {
        // Email verification is handled separately
      },
      completed: checklist.emailVerified,
    },
    {
      key: 'exchangeConnected',
      icon: LinkIcon,
      label: 'Connect Exchange',
      description: 'Link your Binance account',
      action: () => {
        navigate('/app/connections');
        onDismiss?.();
      },
      completed: checklist.exchangeConnected,
    },
    {
      key: 'portfolioViewed',
      icon: Wallet,
      label: 'View Portfolio',
      description: 'Check your account overview',
      action: () => {
        navigate('/app/portfolio');
        localStorage.setItem('portfolio_viewed', 'true');
        checkProgress();
        onDismiss?.();
      },
      completed: checklist.portfolioViewed,
    },
  ];

  if (completedCount === totalCount && onDismiss) {
    // Auto-dismiss if all completed
    return null;
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="bg-gradient-to-br from-blue-500/10 to-purple-500/10 border border-blue-500/20 rounded-xl p-5 mb-6"
    >
      <div className="flex items-start justify-between mb-4">
        <div>
          <h3 className="text-lg font-semibold text-white mb-1">Getting Started</h3>
          <p className="text-sm text-gray-400">
            {completedCount} of {totalCount} steps completed
          </p>
        </div>
        {onDismiss && (
          <button
            onClick={onDismiss}
            className="text-gray-400 hover:text-white transition-colors"
            aria-label="Dismiss"
          >
            ×
          </button>
        )}
      </div>

      {/* Progress Bar */}
      <div className="mb-4">
        <div className="h-2 bg-gray-700/50 rounded-full overflow-hidden">
          <motion.div
            className="h-full bg-gradient-to-r from-blue-500 to-purple-500"
            initial={{ width: 0 }}
            animate={{ width: `${progressPercentage}%` }}
            transition={{ duration: 0.5 }}
          />
        </div>
        <p className="text-xs text-gray-400 mt-1 text-right">
          {Math.round(progressPercentage)}% Complete
        </p>
      </div>

      {/* Checklist Items */}
      <div className="space-y-3">
        {checklistItems.map((item, index) => {
          const Icon = item.icon;
          return (
            <motion.button
              key={item.key}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.1 }}
              onClick={item.completed ? undefined : item.action}
              disabled={item.completed}
              className={`w-full flex items-center gap-3 p-3 rounded-lg transition-all ${
                item.completed
                  ? 'bg-green-500/10 border border-green-500/20 cursor-default'
                  : 'bg-gray-700/30 border border-gray-600/50 hover:border-blue-500/50 hover:bg-gray-700/50 cursor-pointer'
              }`}
            >
              <div className="flex-shrink-0">
                {item.completed ? (
                  <CheckCircle className="h-5 w-5 text-green-400" />
                ) : (
                  <Circle className="h-5 w-5 text-gray-400" />
                )}
              </div>
              <Icon
                className={`h-5 w-5 flex-shrink-0 ${
                  item.completed ? 'text-green-400' : 'text-gray-400'
                }`}
              />
              <div className="flex-1 text-left">
                <p
                  className={`font-medium ${
                    item.completed ? 'text-green-400' : 'text-white'
                  }`}
                >
                  {item.label}
                </p>
                <p className="text-xs text-gray-400">{item.description}</p>
              </div>
              {!item.completed && (
                <ArrowRight className="h-4 w-4 text-gray-400" />
              )}
            </motion.button>
          );
        })}
      </div>
    </motion.div>
  );
};

export default OnboardingChecklist;

