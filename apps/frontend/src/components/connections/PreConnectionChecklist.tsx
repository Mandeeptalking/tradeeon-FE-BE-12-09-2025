import React, { useState } from 'react';
import { X, CheckCircle, ExternalLink, Shield, Key, Globe, BookOpen, ArrowRight } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface PreConnectionChecklistProps {
  isOpen: boolean;
  onClose: () => void;
  onReady: () => void;
  exchange?: string;
}

const PreConnectionChecklist = ({ isOpen, onClose, onReady, exchange = 'BINANCE' }: PreConnectionChecklistProps) => {
  const [checkedItems, setCheckedItems] = useState<Record<string, boolean>>({
    hasAccount: false,
    knowsApiKeys: false,
    understandsIp: false,
    readSecurity: false,
  });

  const handleToggle = (key: string) => {
    setCheckedItems((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  const allChecked = Object.values(checkedItems).every(Boolean);

  const checklistItems = [
    {
      key: 'hasAccount',
      icon: Shield,
      title: 'Have a Binance Account',
      description: 'You need an active Binance account to generate API keys',
      link: 'https://www.binance.com/en/register',
      linkText: 'Create Binance Account',
    },
    {
      key: 'knowsApiKeys',
      icon: Key,
      title: 'Know Where to Find API Keys',
      description: 'API keys are located in Binance API Management section',
      link: 'https://www.binance.com/en/my/settings/api-management',
      linkText: 'View API Management',
    },
    {
      key: 'understandsIp',
      icon: Globe,
      title: 'Understand IP Whitelisting',
      description: 'You must whitelist our IP address (52.77.227.148) before enabling trading permissions',
      link: null,
      linkText: null,
    },
    {
      key: 'readSecurity',
      icon: BookOpen,
      title: 'Read Security Best Practices',
      description: 'Understand how to keep your API keys secure and what permissions to enable',
      link: null,
      linkText: null,
    },
  ];

  const securityTips = [
    'Never share your API keys with anyone',
    'Only enable "Enable Reading" and "Enable Spot & Margin Trading"',
    'Do NOT enable "Enable Withdrawals" for security',
    'Whitelist IP address before enabling trading permissions',
    'Use a dedicated API key for Tradeeon only',
  ];

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          className="relative w-full max-w-2xl bg-gray-800/95 backdrop-blur-sm border border-gray-700/50 rounded-2xl shadow-2xl overflow-hidden"
        >
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-gray-700/50">
            <div>
              <h2 className="text-2xl font-bold text-white mb-1">Before You Connect</h2>
              <p className="text-sm text-gray-400">Make sure you have everything ready</p>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-700/50 rounded-lg transition-colors"
              aria-label="Close"
            >
              <X className="h-5 w-5 text-gray-400" />
            </button>
          </div>

          {/* Content */}
          <div className="p-6 max-h-[70vh] overflow-y-auto custom-scrollbar">
            {/* Checklist */}
            <div className="space-y-3 mb-6">
              {checklistItems.map((item) => {
                const Icon = item.icon;
                const isChecked = checkedItems[item.key];

                return (
                  <div
                    key={item.key}
                    onClick={() => handleToggle(item.key)}
                    className={`flex items-start gap-4 p-4 rounded-lg border cursor-pointer transition-all ${
                      isChecked
                        ? 'bg-green-500/10 border-green-500/30'
                        : 'bg-gray-700/30 border-gray-600/50 hover:border-gray-500/50'
                    }`}
                  >
                    <div className="flex-shrink-0 mt-0.5">
                      <div
                        className={`w-6 h-6 rounded border-2 flex items-center justify-center transition-all ${
                          isChecked
                            ? 'bg-green-500 border-green-500'
                            : 'bg-transparent border-gray-500'
                        }`}
                      >
                        {isChecked && <CheckCircle className="h-4 w-4 text-white" />}
                      </div>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <Icon className={`h-4 w-4 ${isChecked ? 'text-green-400' : 'text-gray-400'}`} />
                        <h3 className={`font-semibold ${isChecked ? 'text-green-400' : 'text-white'}`}>
                          {item.title}
                        </h3>
                      </div>
                      <p className="text-sm text-gray-400 mb-2">{item.description}</p>
                      {item.link && (
                        <a
                          href={item.link}
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={(e) => e.stopPropagation()}
                          className="inline-flex items-center gap-1 text-xs text-blue-400 hover:text-blue-300 transition-colors"
                        >
                          <span>{item.linkText}</span>
                          <ExternalLink className="h-3 w-3" />
                        </a>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Security Tips */}
            <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-4 mb-6">
              <div className="flex items-center gap-2 mb-3">
                <Shield className="h-5 w-5 text-blue-400" />
                <h3 className="font-semibold text-blue-400">Security Best Practices</h3>
              </div>
              <ul className="space-y-2">
                {securityTips.map((tip, index) => (
                  <li key={index} className="flex items-start gap-2 text-sm text-blue-300/80">
                    <span className="text-blue-400 mt-0.5">•</span>
                    <span>{tip}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* IP Whitelist Info */}
            <div className="bg-amber-500/10 border border-amber-500/20 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-2">
                <Globe className="h-5 w-5 text-amber-400" />
                <h3 className="font-semibold text-amber-400">Important: IP Whitelisting</h3>
              </div>
              <p className="text-sm text-amber-300/80 mb-3">
                Binance will revoke unrestricted API keys with trading permissions. You MUST whitelist our IP address before enabling trading permissions.
              </p>
              <div className="flex items-center gap-2 p-3 bg-gray-700/50 rounded-lg">
                <code className="flex-1 font-mono text-sm text-white">52.77.227.148</code>
                <button
                  onClick={() => navigator.clipboard.writeText('52.77.227.148')}
                  className="px-3 py-1.5 bg-blue-500/20 hover:bg-blue-500/30 text-blue-300 rounded text-xs font-medium transition-colors"
                >
                  Copy IP
                </button>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between p-6 border-t border-gray-700/50 bg-gray-800/50">
            <button
              onClick={onClose}
              className="px-4 py-2 text-gray-400 hover:text-white transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={onReady}
              disabled={!allChecked}
              className={`flex items-center gap-2 px-6 py-2 rounded-lg font-medium transition-all ${
                allChecked
                  ? 'bg-blue-500 hover:bg-blue-600 text-white'
                  : 'bg-gray-700 text-gray-500 cursor-not-allowed'
              }`}
            >
              <span>I'm Ready</span>
              <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};

export default PreConnectionChecklist;

