import { useState } from 'react';
import {
  Shield,
  Lock,
  Eye,
  ChevronDown,
  ChevronRight,
  CheckCircle,
} from 'lucide-react';

const SecurityPanel = () => {
  const [expandedFaq, setExpandedFaq] = useState<string | null>(null);

  const securityFeatures = [
    {
      icon: Lock,
      title: 'AES-256 encrypted',
      description: 'Your keys are encrypted using military-grade encryption',
      status: 'secure'
    },
    {
      icon: Eye,
      title: 'Scoped permissions',
      description: 'We only request the minimum permissions needed',
      status: 'secure'
    },
    {
      icon: Shield,
      title: 'You can revoke anytime',
      description: 'Full control over your connections and data access',
      status: 'secure'
    },
    {
      icon: CheckCircle,
      title: 'Rotations encouraged',
      description: 'Regular key rotation keeps your accounts secure',
      status: 'recommended'
    }
  ];

  const faqItems = [
    {
      id: 'keys-storage',
      question: 'Where are my keys stored?',
      answer: 'Your API keys are encrypted using AES-256 encryption and stored securely on our servers. They are never stored in plain text and are only decrypted temporarily when needed for trading operations.'
    },
    {
      id: 'permissions',
      question: 'What permissions do you need?',
      answer: 'We only request the minimum permissions required for trading operations: read account balance, place/cancel orders, and view trade history. We never request withdrawal permissions.'
    },
    {
      id: 'rotation',
      question: 'How do I rotate keys?',
      answer: 'You can rotate your API keys anytime from the connection settings. We recommend rotating keys every 90 days for maximum security.'
    },
    {
      id: 'automatic-trading',
      question: 'Will you place trades automatically?',
      answer: 'No, we will never place trades without your explicit consent. All trading actions are initiated by you through our platform or by bots you have configured and authorized.'
    }
  ];

  const toggleFaq = (id: string) => {
    setExpandedFaq(expandedFaq === id ? null : id);
  };

  return (
    <div className="bg-white rounded-2xl border border-gray-200 p-6">
      <div className="flex items-center space-x-2 mb-4">
        <Shield className="h-5 w-5 text-green-500" />
        <h3 className="text-lg font-semibold text-gray-900">Security & Trust</h3>
      </div>

      {/* Security Features */}
      <div className="space-y-3 mb-6">
        {securityFeatures.map((feature, index) => (
          <div key={index} className="flex items-start space-x-3">
            <div className={`p-1.5 rounded-lg ${
              feature.status === 'secure' ? 'bg-green-100' : 'bg-blue-100'
            }`}>
              <feature.icon className={`h-4 w-4 ${
                feature.status === 'secure' ? 'text-green-600' : 'text-blue-600'
              }`} />
            </div>
            <div className="flex-1">
              <h4 className="text-sm font-medium text-gray-900">{feature.title}</h4>
              <p className="text-xs text-gray-500">{feature.description}</p>
            </div>
          </div>
        ))}
      </div>

      {/* FAQ Accordion */}
      <div>
        <h4 className="text-sm font-semibold text-gray-900 mb-3">Frequently Asked Questions</h4>
        <div className="space-y-2">
          {faqItems.map((item) => (
            <div key={item.id} className="border border-gray-200 rounded-lg">
              <button
                onClick={() => toggleFaq(item.id)}
                className="w-full flex items-center justify-between p-3 text-left hover:bg-gray-50 transition-colors"
              >
                <span className="text-sm font-medium text-gray-900">{item.question}</span>
                {expandedFaq === item.id ? (
                  <ChevronDown className="h-4 w-4 text-gray-500" />
                ) : (
                  <ChevronRight className="h-4 w-4 text-gray-500" />
                )}
              </button>
              {expandedFaq === item.id && (
                <div className="px-3 pb-3">
                  <p className="text-xs text-gray-600 leading-relaxed">{item.answer}</p>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default SecurityPanel;
