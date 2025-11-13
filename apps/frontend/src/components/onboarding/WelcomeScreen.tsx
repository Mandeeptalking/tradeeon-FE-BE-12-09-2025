import React, { useState } from 'react';
import { X, Sparkles, TrendingUp, Shield, Bot, ArrowRight, SkipForward } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';

interface WelcomeScreenProps {
  isOpen: boolean;
  onClose: () => void;
  onStartTour: () => void;
  userName?: string;
}

const WelcomeScreen = ({ isOpen, onClose, onStartTour, userName }: WelcomeScreenProps) => {
  const navigate = useNavigate();
  const [currentSlide, setCurrentSlide] = useState(0);

  const slides = [
    {
      icon: Sparkles,
      title: 'Welcome to Tradeeon!',
      description: 'Your all-in-one trading platform for managing crypto portfolios, automated trading, and advanced analytics.',
      color: 'from-blue-500 to-cyan-500',
    },
    {
      icon: Shield,
      title: 'Bank-Level Security',
      description: 'Your API keys are encrypted and stored securely. We never store withdrawal permissions and use IP whitelisting for maximum security.',
      color: 'from-green-500 to-emerald-500',
    },
    {
      icon: TrendingUp,
      title: 'Portfolio Management',
      description: 'Track your assets across multiple exchanges, view real-time balances, and analyze your trading performance.',
      color: 'from-purple-500 to-pink-500',
    },
    {
      icon: Bot,
      title: 'Automated Trading',
      description: 'Create and deploy trading bots with our advanced strategies. Set up DCA bots, grid trading, and more.',
      color: 'from-orange-500 to-red-500',
    },
  ];

  const handleNext = () => {
    if (currentSlide < slides.length - 1) {
      setCurrentSlide(currentSlide + 1);
    } else {
      handleGetStarted();
    }
  };

  const handleGetStarted = () => {
    onClose();
    // Optionally navigate to dashboard or connections
    navigate('/app');
  };

  if (!isOpen) return null;

  const currentSlideData = slides[currentSlide];
  const Icon = currentSlideData.icon;
  const progress = ((currentSlide + 1) / slides.length) * 100;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          className="relative w-full max-w-2xl bg-gray-800/95 backdrop-blur-sm border border-gray-700/50 rounded-2xl shadow-2xl overflow-hidden"
        >
          {/* Close Button */}
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-2 hover:bg-gray-700/50 rounded-lg transition-colors z-10"
            aria-label="Close"
          >
            <X className="h-5 w-5 text-gray-400" />
          </button>

          {/* Progress Indicator */}
          <div className="h-1 bg-gray-700/50">
            <motion.div
              className="h-full bg-gradient-to-r from-blue-500 to-cyan-500"
              initial={{ width: 0 }}
              animate={{ width: `${progress}%` }}
              transition={{ duration: 0.3 }}
            />
          </div>

          {/* Content */}
          <div className="p-8 md:p-12">
            {/* Slide Content */}
            <AnimatePresence mode="wait">
              <motion.div
                key={currentSlide}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.3 }}
                className="text-center"
              >
                {/* Icon */}
                <div className="flex justify-center mb-6">
                  <div className={`relative p-6 rounded-2xl bg-gradient-to-br ${currentSlideData.color} shadow-lg`}>
                    <div className="absolute inset-0 bg-white/20 rounded-2xl blur-xl" />
                    <Icon className="relative h-16 w-16 text-white" />
                  </div>
                </div>

                {/* Title */}
                <h2 className="text-3xl font-bold text-white mb-4">
                  {currentSlide === 0 && userName ? `Welcome, ${userName}!` : currentSlideData.title}
                </h2>

                {/* Description */}
                <p className="text-lg text-gray-300 mb-8 max-w-md mx-auto leading-relaxed">
                  {currentSlideData.description}
                </p>

                {/* Slide Indicators */}
                <div className="flex justify-center gap-2 mb-8">
                  {slides.map((_, index) => (
                    <button
                      key={index}
                      onClick={() => setCurrentSlide(index)}
                      className={`h-2 rounded-full transition-all ${
                        index === currentSlide
                          ? 'w-8 bg-blue-500'
                          : 'w-2 bg-gray-600 hover:bg-gray-500'
                      }`}
                      aria-label={`Go to slide ${index + 1}`}
                    />
                  ))}
                </div>
              </motion.div>
            </AnimatePresence>

            {/* Action Buttons */}
            <div className="flex items-center justify-between gap-4 mt-8">
              <button
                onClick={onClose}
                className="flex items-center gap-2 px-4 py-2 text-gray-400 hover:text-white transition-colors"
              >
                <SkipForward className="h-4 w-4" />
                <span>Skip</span>
              </button>

              <div className="flex gap-3">
                {currentSlide > 0 && (
                  <button
                    onClick={() => setCurrentSlide(currentSlide - 1)}
                    className="px-6 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg font-medium transition-colors"
                  >
                    Previous
                  </button>
                )}
                {currentSlide < slides.length - 1 ? (
                  <button
                    onClick={handleNext}
                    className="flex items-center gap-2 px-6 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg font-medium transition-colors"
                  >
                    <span>Next</span>
                    <ArrowRight className="h-4 w-4" />
                  </button>
                ) : (
                  <button
                    onClick={handleGetStarted}
                    className="flex items-center gap-2 px-6 py-2 bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600 text-white rounded-lg font-medium transition-all shadow-lg shadow-blue-500/30"
                  >
                    <span>Get Started</span>
                    <ArrowRight className="h-4 w-4" />
                  </button>
                )}
              </div>
            </div>

            {/* Take Tour Button */}
            {currentSlide === slides.length - 1 && (
              <div className="mt-6 pt-6 border-t border-gray-700/50">
                <button
                  onClick={() => {
                    onClose();
                    onStartTour();
                  }}
                  className="w-full px-4 py-2 bg-purple-500/20 hover:bg-purple-500/30 border border-purple-500/30 text-purple-300 rounded-lg font-medium transition-colors"
                >
                  Take Interactive Tour
                </button>
              </div>
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};

export default WelcomeScreen;

