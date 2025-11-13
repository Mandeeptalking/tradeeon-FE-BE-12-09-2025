import React, { useState } from 'react';
import { ChevronDown, ChevronUp, ExternalLink, Key, Shield, AlertCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface ApiKeyLocationGuideProps {
  exchange: string;
}

const ApiKeyLocationGuide = ({ exchange }: ApiKeyLocationGuideProps) => {
  const [isExpanded, setIsExpanded] = useState(false);

  // Binance-specific guide
  const binanceSteps = [
    {
      step: 1,
      title: 'Log in to Binance',
      description: 'Go to www.binance.com and sign in to your account',
      link: 'https://www.binance.com/en/login',
      linkText: 'Go to Binance Login',
    },
    {
      step: 2,
      title: 'Navigate to API Management',
      description: 'Click on your profile icon → API Management, or go directly to API Management settings',
      link: 'https://www.binance.com/en/my/settings/api-management',
      linkText: 'Open API Management',
      tip: 'You may need to complete 2FA verification to access this section',
    },
    {
      step: 3,
      title: 'Create API Key',
      description: 'Click "Create API" button and select "System generated API Key"',
      tip: 'Choose a label/name for your API key (e.g., "Tradeeon Trading")',
    },
    {
      step: 4,
      title: 'Set Permissions',
      description: 'Enable the following permissions:',
      permissions: [
        '✅ Enable Reading (required)',
        '✅ Enable Spot & Margin Trading (required)',
        '⚠️ Optional: Enable Futures (if you plan to trade Futures)',
        '❌ Do NOT enable Withdrawals (security risk)',
      ],
      warning: '⚠️ IMPORTANT: You MUST whitelist IP 52.77.227.148 before enabling trading permissions, or Binance will revoke your key!',
    },
    {
      step: 5,
      title: 'Whitelist IP Address',
      description: 'Select "Restrict access to trusted IPs only" and add our IP address',
      ipAddress: '52.77.227.148',
      tip: 'Copy the IP address above and paste it in the IP whitelist field',
    },
    {
      step: 6,
      title: 'Save and Copy Credentials',
      description: 'After creating the API key, you will see:',
      items: [
        'API Key (starts with letters/numbers)',
        'Secret Key (shown only once - copy it immediately!)',
      ],
      warning: '⚠️ CRITICAL: Copy your Secret Key immediately! You cannot view it again after closing the dialog.',
    },
  ];

  const steps = exchange === 'BINANCE' ? binanceSteps : binanceSteps; // Default to Binance for now

  return (
    <div className="border border-blue-500/20 rounded-lg bg-blue-500/5 p-4">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between text-left"
      >
        <div className="flex items-center gap-2">
          <Key className="h-5 w-5 text-blue-400" />
          <span className="font-semibold text-blue-400">Show me how to find my API keys</span>
        </div>
        {isExpanded ? (
          <ChevronUp className="h-5 w-5 text-blue-400" />
        ) : (
          <ChevronDown className="h-5 w-5 text-blue-400" />
        )}
      </button>

      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="overflow-hidden"
          >
            <div className="mt-4 space-y-4 pt-4 border-t border-blue-500/20">
              {steps.map((step, index) => (
                <div key={step.step} className="space-y-2">
                  {/* Step Number and Title */}
                  <div className="flex items-start gap-3">
                    <div className="flex-shrink-0 w-8 h-8 rounded-full bg-blue-500/20 flex items-center justify-center">
                      <span className="text-sm font-bold text-blue-400">{step.step}</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="font-semibold text-white mb-1">{step.title}</h4>
                      <p className="text-sm text-gray-300">{step.description}</p>
                      
                      {/* Link */}
                      {step.link && (
                        <a
                          href={step.link}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 mt-2 text-sm text-blue-400 hover:text-blue-300 transition-colors"
                        >
                          <span>{step.linkText}</span>
                          <ExternalLink className="h-3.5 w-3.5" />
                        </a>
                      )}
                      
                      {/* IP Address */}
                      {step.ipAddress && (
                        <div className="mt-3 p-3 bg-gray-700/50 rounded-lg">
                          <div className="flex items-center justify-between gap-2">
                            <code className="flex-1 font-mono text-sm text-white break-all">
                              {step.ipAddress}
                            </code>
                            <button
                              onClick={() => navigator.clipboard.writeText(step.ipAddress!)}
                              className="px-3 py-1 bg-blue-500/20 hover:bg-blue-500/30 text-blue-300 rounded text-xs font-medium transition-colors whitespace-nowrap"
                            >
                              Copy IP
                            </button>
                          </div>
                        </div>
                      )}
                      
                      {/* Permissions List */}
                      {step.permissions && (
                        <ul className="mt-3 space-y-1.5">
                          {step.permissions.map((permission, idx) => (
                            <li key={idx} className="text-sm text-gray-300 flex items-start gap-2">
                              <span className="mt-0.5">{permission.includes('✅') ? '✅' : permission.includes('⚠️') ? '⚠️' : '❌'}</span>
                              <span>{permission.replace(/[✅⚠️❌]/g, '').trim()}</span>
                            </li>
                          ))}
                        </ul>
                      )}
                      
                      {/* Items List */}
                      {step.items && (
                        <ul className="mt-3 space-y-1.5">
                          {step.items.map((item, idx) => (
                            <li key={idx} className="text-sm text-gray-300 flex items-start gap-2">
                              <span className="mt-0.5">•</span>
                              <span>{item}</span>
                            </li>
                          ))}
                        </ul>
                      )}
                      
                      {/* Tip */}
                      {step.tip && (
                        <div className="mt-3 p-2 bg-blue-500/10 border border-blue-500/20 rounded text-xs text-blue-300">
                          💡 {step.tip}
                        </div>
                      )}
                      
                      {/* Warning */}
                      {step.warning && (
                        <div className="mt-3 p-2 bg-amber-500/10 border border-amber-500/20 rounded flex items-start gap-2">
                          <AlertCircle className="h-4 w-4 text-amber-400 flex-shrink-0 mt-0.5" />
                          <p className="text-xs text-amber-300">{step.warning}</p>
                        </div>
                      )}
                    </div>
                  </div>
                  
                  {/* Divider (except for last step) */}
                  {index < steps.length - 1 && (
                    <div className="ml-11 border-t border-gray-700/50 pt-4" />
                  )}
                </div>
              ))}
              
              {/* Additional Resources */}
              <div className="mt-6 p-4 bg-gray-700/30 rounded-lg border border-gray-600/50">
                <div className="flex items-start gap-2">
                  <Shield className="h-5 w-5 text-green-400 flex-shrink-0 mt-0.5" />
                  <div>
                    <h5 className="font-semibold text-white mb-2">Security Best Practices</h5>
                    <ul className="space-y-1.5 text-sm text-gray-300">
                      <li>• Never share your API keys with anyone</li>
                      <li>• Use a dedicated API key for Tradeeon only</li>
                      <li>• Regularly rotate your API keys (every 90 days)</li>
                      <li>• Monitor your API key usage in Binance</li>
                      <li>• Revoke keys immediately if compromised</li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default ApiKeyLocationGuide;

