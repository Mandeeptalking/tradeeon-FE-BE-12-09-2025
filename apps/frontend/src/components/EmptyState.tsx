import React from 'react';
import { LucideIcon } from 'lucide-react';
import { motion } from 'framer-motion';

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
  tips?: string[];
  illustration?: React.ReactNode;
}

const EmptyState = ({
  icon: Icon,
  title,
  description,
  actionLabel,
  onAction,
  tips,
  illustration,
}: EmptyStateProps) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex flex-col items-center justify-center gap-6 rounded-3xl border border-dashed border-white/10 bg-white/[0.02] px-8 py-16 text-center"
    >
      {/* Illustration or Icon */}
      {illustration ? (
        <div className="mb-2">{illustration}</div>
      ) : (
        <div className="relative">
          <div className="absolute inset-0 bg-blue-500/10 rounded-full blur-2xl animate-pulse" />
          <div className="relative w-20 h-20 bg-blue-500/10 rounded-full flex items-center justify-center">
            <Icon className="h-10 w-10 text-blue-400" />
          </div>
        </div>
      )}

      {/* Title and Description */}
      <div className="space-y-2 max-w-md">
        <h3 className="text-xl font-semibold text-white">{title}</h3>
        <p className="text-sm text-white/60 leading-relaxed">{description}</p>
      </div>

      {/* Tips */}
      {tips && tips.length > 0 && (
        <div className="w-full max-w-md mt-2">
          <div className="bg-blue-500/5 border border-blue-500/20 rounded-lg p-4">
            <h4 className="text-xs font-semibold text-blue-400 mb-2 uppercase tracking-wide">
              💡 Helpful Tips
            </h4>
            <ul className="space-y-1.5 text-left">
              {tips.map((tip, index) => (
                <li key={index} className="text-xs text-blue-300/80 flex items-start gap-2">
                  <span className="text-blue-400 mt-0.5">•</span>
                  <span>{tip}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}

      {/* Action Button */}
      {actionLabel && onAction && (
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={onAction}
          className="inline-flex items-center gap-2 rounded-full bg-blue-500 px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-blue-500/30 transition hover:bg-blue-600"
        >
          {actionLabel}
        </motion.button>
      )}
    </motion.div>
  );
};

export default EmptyState;

