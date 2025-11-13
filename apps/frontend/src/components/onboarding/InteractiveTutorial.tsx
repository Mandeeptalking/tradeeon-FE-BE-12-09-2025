import React, { useState, useEffect, useRef } from 'react';
import { X, ArrowRight, ArrowLeft, CheckCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface TutorialStep {
  id: string;
  title: string;
  description: string;
  targetSelector: string; // CSS selector for element to highlight
  position?: 'top' | 'bottom' | 'left' | 'right' | 'center';
  action?: () => void; // Optional action to perform
}

interface InteractiveTutorialProps {
  isOpen: boolean;
  onClose: () => void;
  onComplete: () => void;
  steps: TutorialStep[];
}

const InteractiveTutorial = ({ isOpen, onClose, onComplete, steps }: InteractiveTutorialProps) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [highlightedElement, setHighlightedElement] = useState<HTMLElement | null>(null);
  const overlayRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen) return;

    const step = steps[currentStep];
    if (!step) return;

    // Find target element
    const element = document.querySelector(step.targetSelector) as HTMLElement;
    if (element) {
      setHighlightedElement(element);
      // Scroll element into view
      element.scrollIntoView({ behavior: 'smooth', block: 'center' });
    } else {
      setHighlightedElement(null);
    }
  }, [isOpen, currentStep, steps]);

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      handleComplete();
    }
  };

  const handlePrev = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleComplete = () => {
    localStorage.setItem('tutorial_completed', 'true');
    setHighlightedElement(null);
    onComplete();
  };

  const handleSkip = () => {
    localStorage.setItem('tutorial_completed', 'true');
    setHighlightedElement(null);
    onClose();
  };

  if (!isOpen) return null;

  const currentStepData = steps[currentStep];
  if (!currentStepData) return null;

  const progress = ((currentStep + 1) / steps.length) * 100;

  return (
    <>
      {/* Overlay with cutout */}
      <div
        ref={overlayRef}
        className="fixed inset-0 z-[90] pointer-events-none"
        style={{
          background: highlightedElement
            ? `radial-gradient(circle at ${highlightedElement.getBoundingClientRect().left + highlightedElement.offsetWidth / 2}px ${highlightedElement.getBoundingClientRect().top + highlightedElement.offsetHeight / 2}px, transparent 150px, rgba(0, 0, 0, 0.8))`
            : 'rgba(0, 0, 0, 0.8)',
        }}
      />

      {/* Tooltip */}
      {highlightedElement && (
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="fixed z-[91] bg-gray-800 border border-gray-700 rounded-xl shadow-2xl p-6 max-w-sm"
          style={{
            top: highlightedElement.getBoundingClientRect().bottom + 20,
            left: highlightedElement.getBoundingClientRect().left,
          }}
        >
          {/* Progress Indicator */}
          <div className="mb-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-medium text-gray-400">
                Step {currentStep + 1} of {steps.length}
              </span>
              <span className="text-xs font-medium text-blue-400">
                {Math.round(progress)}%
              </span>
            </div>
            <div className="h-1.5 bg-gray-700 rounded-full overflow-hidden">
              <motion.div
                className="h-full bg-gradient-to-r from-blue-500 to-cyan-500"
                initial={{ width: 0 }}
                animate={{ width: `${progress}%` }}
                transition={{ duration: 0.3 }}
              />
            </div>
          </div>

          {/* Content */}
          <h3 className="text-lg font-semibold text-white mb-2">{currentStepData.title}</h3>
          <p className="text-sm text-gray-300 mb-4">{currentStepData.description}</p>

          {/* Actions */}
          <div className="flex items-center justify-between gap-3">
            <button
              onClick={handleSkip}
              className="text-xs text-gray-400 hover:text-white transition-colors"
            >
              Skip Tutorial
            </button>
            <div className="flex gap-2">
              {currentStep > 0 && (
                <button
                  onClick={handlePrev}
                  className="flex items-center gap-1 px-3 py-1.5 bg-gray-700 hover:bg-gray-600 text-white rounded-lg text-sm font-medium transition-colors"
                >
                  <ArrowLeft className="h-4 w-4" />
                  Previous
                </button>
              )}
              <button
                onClick={handleNext}
                className="flex items-center gap-1 px-4 py-1.5 bg-blue-500 hover:bg-blue-600 text-white rounded-lg text-sm font-medium transition-colors"
              >
                {currentStep < steps.length - 1 ? (
                  <>
                    Next
                    <ArrowRight className="h-4 w-4" />
                  </>
                ) : (
                  <>
                    <CheckCircle className="h-4 w-4" />
                    Complete
                  </>
                )}
              </button>
            </div>
          </div>
        </motion.div>
      )}
    </>
  );
};

export default InteractiveTutorial;

