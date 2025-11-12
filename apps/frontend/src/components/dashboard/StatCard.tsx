import { ReactNode } from 'react';
import { motion } from 'framer-motion';
import { LucideIcon } from 'lucide-react';

interface StatCardProps {
  title: string;
  value: ReactNode;
  subtitle?: ReactNode;
  icon: LucideIcon;
  iconColor: string;
  iconBgColor: string;
  gradientFrom: string;
  gradientTo: string;
  progress?: number; // 0-100 for progress bar
  delay?: number;
}

/**
 * Enhanced stat card component with animations and gradients
 */
export const StatCard = ({
  title,
  value,
  subtitle,
  icon: Icon,
  iconColor,
  iconBgColor,
  gradientFrom,
  gradientTo,
  progress,
  delay = 0,
}: StatCardProps) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay }}
      whileHover={{ y: -4, transition: { duration: 0.2 } }}
      className="group relative overflow-hidden bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl p-6 hover:border-white/20 transition-all duration-300"
    >
      {/* Animated gradient background */}
      <div
        className={`absolute inset-0 opacity-0 group-hover:opacity-10 transition-opacity duration-300 bg-gradient-to-br ${gradientFrom} ${gradientTo}`}
      />
      
      {/* Content */}
      <div className="relative z-10">
        <div className="flex items-center justify-between mb-4">
          <motion.div
            className={`p-3 ${iconBgColor} rounded-lg`}
            whileHover={{ scale: 1.1, rotate: 5 }}
            transition={{ type: 'spring', stiffness: 300 }}
          >
            <Icon className={`h-6 w-6 ${iconColor}`} />
          </motion.div>
          <span className="text-xs text-white/60 uppercase tracking-wide font-medium">{title}</span>
        </div>

        <div className="space-y-2">
          <div className="text-3xl font-bold text-white">
            {value}
          </div>
          
          {subtitle && (
            <div className="text-sm text-white/60">
              {subtitle}
            </div>
          )}

          {/* Progress bar */}
          {progress !== undefined && (
            <div className="mt-3 h-1.5 bg-white/5 rounded-full overflow-hidden">
              <motion.div
                className={`h-full bg-gradient-to-r ${gradientFrom} ${gradientTo}`}
                initial={{ width: 0 }}
                animate={{ width: `${progress}%` }}
                transition={{ duration: 1, delay: delay + 0.3 }}
              />
            </div>
          )}
        </div>
      </div>

      {/* Shine effect on hover */}
      <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500">
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />
      </div>
    </motion.div>
  );
};

