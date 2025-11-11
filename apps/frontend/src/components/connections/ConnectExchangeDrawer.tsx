import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { X, Eye, EyeOff, TestTube, CheckCircle, XCircle, Loader2 } from 'lucide-react';
import { Exchange, UpsertConnectionBody, TestConnectionBody, Connection } from '../../types/connections';
import { connectionsApi } from '../../lib/api/connections';

interface ConnectExchangeDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  onConnected: (connection: any) => void;
  initialConnection?: Connection | null;
}

const ConnectExchangeDrawer = ({ isOpen, onClose, onConnected, initialConnection }: ConnectExchangeDrawerProps) => {
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState(0);
  const [exchange, setExchange] = useState<Exchange>('BINANCE');
  const [apiKey, setApiKey] = useState('');
  const [apiSecret, setApiSecret] = useState('');
  const [passphrase, setPassphrase] = useState('');
  const [nickname, setNickname] = useState('');
  const [showApiKey, setShowApiKey] = useState(false);
  const [showApiSecret, setShowApiSecret] = useState(false);
  const [showPassphrase, setShowPassphrase] = useState(false);
  const [testResult, setTestResult] = useState<any>(null);
  const [isTesting, setIsTesting] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saveError, setSaveError] = useState<string | null>(null);

  const steps = [
    { title: 'Exchange', description: 'Select your exchange' },
    { title: 'API Keys', description: 'Enter your credentials' },
    { title: 'Test', description: 'Verify connection' },
    { title: 'Review', description: 'Confirm details' },
  ];

  const exchanges = [
    { value: 'BINANCE', label: 'Binance', logo: '🟡', requiresPassphrase: false },
    { value: 'COINBASE', label: 'Coinbase Pro', logo: '🔵', requiresPassphrase: true },
    { value: 'KRAKEN', label: 'Kraken', logo: '🟣', requiresPassphrase: true },
    { value: 'ZERODHA', label: 'Zerodha', logo: '🟢', requiresPassphrase: false },
  ];

  const selectedExchange = exchanges.find(e => e.value === exchange);

  const validateStep = (step: number): boolean => {
    const newErrors: Record<string, string> = {};

    // Step 0: Exchange Selection - no validation needed
    if (step === 0) {
      return true;
    }
    
    // Step 1: API Keys - validate required fields
    if (step === 1) {
      if (!apiKey.trim()) newErrors.apiKey = 'API Key is required';
      if (!apiSecret.trim()) newErrors.apiSecret = 'API Secret is required';
      if (selectedExchange?.requiresPassphrase && !passphrase.trim()) {
        newErrors.passphrase = 'Passphrase is required for this exchange';
      }
    }

    // Step 2: Test Connection - no validation needed (test is optional)
    if (step === 2) {
      return true;
    }

    // Step 3: Review - no validation needed
    if (step === 3) {
      return true;
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleNext = () => {
    console.log('handleNext called, currentStep:', currentStep, 'steps.length:', steps.length);
    if (currentStep < steps.length - 1) {
      const isValid = validateStep(currentStep);
      console.log('Validation result:', isValid);
      if (isValid) {
        setCurrentStep(currentStep + 1);
        console.log('Moving to step:', currentStep + 1);
      }
    }
  };

  const handlePrev = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleTestConnection = async () => {
    setIsTesting(true);
    setTestResult(null);
    
    try {
      const testBody: TestConnectionBody = {
        exchange,
        api_key: apiKey,
        api_secret: apiSecret,
        passphrase: selectedExchange?.requiresPassphrase ? passphrase : undefined,
      };
      
      const result = await connectionsApi.testConnection(testBody);
      setTestResult(result);
    } catch (error: any) {
      // Extract actual error message from API response
      const errorMessage = error?.response?.data?.detail || 
                          error?.response?.data?.message || 
                          error?.message || 
                          'Failed to test connection';
      
      setTestResult({
        ok: false,
        code: error?.response?.status === 401 ? 'authentication_failed' : 'error',
        message: errorMessage
      });
    } finally {
      setIsTesting(false);
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    setSaveError(null);
    
    try {
      const connectionBody: UpsertConnectionBody = {
        exchange,
        api_key: apiKey,
        api_secret: apiSecret,
        passphrase: selectedExchange?.requiresPassphrase ? passphrase : undefined,
        nickname: nickname.trim() || undefined,
      };
      
      const connection = await connectionsApi.upsertConnection(connectionBody);
      onConnected(connection);
      onClose();
      resetForm();
      // Redirect to dashboard after successful connection
      navigate('/app');
    } catch (error: any) {
      console.error('Failed to save connection:', error);
      // Extract error message from API response
      const errorMessage = error?.response?.data?.detail || 
                         error?.message || 
                         'Failed to save connection. Please check your credentials and try again.';
      setSaveError(errorMessage);
      // Show alert for user visibility
      alert(`Failed to save connection: ${errorMessage}`);
    } finally {
      setIsSaving(false);
    }
  };

  const resetForm = () => {
    setCurrentStep(0);
    setExchange('BINANCE');
    setApiKey('');
    setApiSecret('');
    setPassphrase('');
    setNickname('');
    setTestResult(null);
    setErrors({});
    setSaveError(null);
  };

  // Initialize form when editing existing connection
  React.useEffect(() => {
    if (initialConnection) {
      setExchange(initialConnection.exchange);
      setNickname(initialConnection.nickname || '');
      setApiKey('••••••••'); // Masked for security
      setApiSecret('••••••••'); // Masked for security
      setPassphrase('••••••••'); // Masked for security
    } else {
      resetForm();
    }
  }, [initialConnection]);

  const handleClose = () => {
    onClose();
    resetForm();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-hidden">
      <div className="absolute inset-0 bg-black/50" onClick={handleClose} />
      <div className="absolute right-0 top-0 h-full w-full max-w-md bg-white shadow-xl flex flex-col max-h-screen">
        <div className="flex flex-col h-full max-h-screen overflow-hidden">
          {/* Header */}
          <div className="flex-shrink-0 flex items-center justify-between p-4 border-b border-gray-200">
            <div>
              <h2 className="text-lg font-semibold text-gray-900">Connect Exchange</h2>
              <p className="text-sm text-gray-500">Secure connection to your trading account</p>
            </div>
            <button
              onClick={handleClose}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Progress */}
          <div className="flex-shrink-0 p-4 border-b border-gray-200">
            <div className="flex items-center justify-between">
              {steps.map((_, index) => (
                <div key={index} className="flex items-center">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                    index <= currentStep 
                      ? 'bg-blue-500 text-white' 
                      : 'bg-gray-200 text-gray-500'
                  }`}>
                    {index + 1}
                  </div>
                  {index < steps.length - 1 && (
                    <div className={`w-12 h-0.5 mx-2 ${
                      index < currentStep ? 'bg-blue-500' : 'bg-gray-200'
                    }`} />
                  )}
                </div>
              ))}
            </div>
            <div className="mt-2">
              <h3 className="text-sm font-medium text-gray-900">{steps[currentStep].title}</h3>
              <p className="text-xs text-gray-500">{steps[currentStep].description}</p>
            </div>
          </div>

          {/* Content */}
          <div className="flex-1 p-4 overflow-y-auto min-h-0">
            {/* Step 1: Exchange Selection */}
            {currentStep === 0 && (
              <div className="space-y-3 pb-2">
                <p className="text-sm text-gray-600">Select the exchange you want to connect:</p>
                <div className="grid gap-2">
                  {exchanges.map((ex) => (
                    <button
                      key={ex.value}
                      onClick={() => setExchange(ex.value as Exchange)}
                      className={`p-3 border rounded-lg text-left transition-colors ${
                        exchange === ex.value
                          ? 'border-blue-500 bg-blue-50'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <div className="flex items-center space-x-3">
                        <span className="text-2xl">{ex.logo}</span>
                        <div>
                          <div className="font-medium text-gray-900">{ex.label}</div>
                          {ex.requiresPassphrase && (
                            <div className="text-xs text-amber-600">Requires passphrase</div>
                          )}
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Step 2: API Keys */}
            {currentStep === 1 && (
              <div className="space-y-4 pb-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Exchange
                  </label>
                  <div className="flex items-center space-x-2 p-3 bg-gray-50 rounded-lg">
                    <span className="text-lg">{selectedExchange?.logo}</span>
                    <span className="font-medium">{selectedExchange?.label}</span>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    API Key *
                  </label>
                  <div className="relative">
                    <input
                      type={showApiKey ? 'text' : 'password'}
                      value={apiKey}
                      onChange={(e) => setApiKey(e.target.value)}
                      className={`w-full px-3 py-2 border rounded-lg pr-10 ${
                        errors.apiKey ? 'border-red-300' : 'border-gray-300'
                      }`}
                      placeholder="Enter your API key"
                    />
                    <button
                      type="button"
                      onClick={() => setShowApiKey(!showApiKey)}
                      className="absolute right-3 top-1/2 transform -translate-y-1/2"
                    >
                      {showApiKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                  {errors.apiKey && <p className="text-xs text-red-600 mt-1">{errors.apiKey}</p>}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    API Secret *
                  </label>
                  <div className="relative">
                    <input
                      type={showApiSecret ? 'text' : 'password'}
                      value={apiSecret}
                      onChange={(e) => setApiSecret(e.target.value)}
                      className={`w-full px-3 py-2 border rounded-lg pr-10 ${
                        errors.apiSecret ? 'border-red-300' : 'border-gray-300'
                      }`}
                      placeholder="Enter your API secret"
                    />
                    <button
                      type="button"
                      onClick={() => setShowApiSecret(!showApiSecret)}
                      className="absolute right-3 top-1/2 transform -translate-y-1/2"
                    >
                      {showApiSecret ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                  {errors.apiSecret && <p className="text-xs text-red-600 mt-1">{errors.apiSecret}</p>}
                </div>

                {selectedExchange?.requiresPassphrase && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Passphrase *
                    </label>
                    <div className="relative">
                      <input
                        type={showPassphrase ? 'text' : 'password'}
                        value={passphrase}
                        onChange={(e) => setPassphrase(e.target.value)}
                        className={`w-full px-3 py-2 border rounded-lg pr-10 ${
                          errors.passphrase ? 'border-red-300' : 'border-gray-300'
                        }`}
                        placeholder="Enter your passphrase"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassphrase(!showPassphrase)}
                        className="absolute right-3 top-1/2 transform -translate-y-1/2"
                      >
                        {showPassphrase ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                    {errors.passphrase && <p className="text-xs text-red-600 mt-1">{errors.passphrase}</p>}
                  </div>
                )}

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Nickname (Optional)
                  </label>
                  <input
                    type="text"
                    value={nickname}
                    onChange={(e) => setNickname(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                    placeholder="e.g., Main Trading Account"
                  />
                </div>
              </div>
            )}

            {/* Step 3: Test Connection */}
            {currentStep === 2 && (
              <div className="space-y-4 pb-4">
                <div className="text-center py-8">
                  <TestTube className="h-12 w-12 text-blue-500 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">Test Connection</h3>
                  <p className="text-sm text-gray-600 mb-6">
                    We'll verify your API credentials and check permissions.
                  </p>
                  <button
                    onClick={handleTestConnection}
                    disabled={isTesting}
                    className="inline-flex items-center space-x-2 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50"
                  >
                    <TestTube className="h-4 w-4" />
                    <span>{isTesting ? 'Testing...' : 'Test Connection'}</span>
                  </button>
                </div>

                {testResult && (
                  <div className={`p-4 rounded-lg ${
                    testResult.ok ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'
                  }`}>
                    <div className="flex items-center space-x-2">
                      {testResult.ok ? (
                        <CheckCircle className="h-5 w-5 text-green-500" />
                      ) : (
                        <XCircle className="h-5 w-5 text-red-500" />
                      )}
                      <span className={`font-medium ${
                        testResult.ok ? 'text-green-800' : 'text-red-800'
                      }`}>
                        {testResult.ok ? 'Connection Successful' : 'Connection Failed'}
                      </span>
                    </div>
                    {testResult.message && (
                      <p className={`text-sm mt-1 ${
                        testResult.ok ? 'text-green-700' : 'text-red-700'
                      }`}>
                        {testResult.message}
                      </p>
                    )}
                    {testResult.latency_ms && (
                      <p className="text-xs text-gray-600 mt-1">
                        Response time: {testResult.latency_ms}ms
                      </p>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Step 4: Review */}
            {currentStep === 3 && (
              <div className="space-y-4 pb-4">
                <h3 className="text-lg font-medium text-gray-900">Review Connection</h3>
                {saveError && (
                  <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                    <div className="flex items-start space-x-2">
                      <XCircle className="h-5 w-5 text-red-500 flex-shrink-0 mt-0.5" />
                      <div className="flex-1">
                        <p className="text-sm font-medium text-red-800">Error</p>
                        <p className="text-sm text-red-700 mt-1">{saveError}</p>
                      </div>
                    </div>
                  </div>
                )}
                <div className="bg-gray-50 rounded-lg p-4 space-y-3">
                  <div className="flex items-center space-x-2">
                    <span className="text-lg">{selectedExchange?.logo}</span>
                    <span className="font-medium">{selectedExchange?.label}</span>
                  </div>
                  {nickname && (
                    <div>
                      <span className="text-sm text-gray-600">Nickname: </span>
                      <span className="font-medium">{nickname}</span>
                    </div>
                  )}
                  <div>
                    <span className="text-sm text-gray-600">API Key: </span>
                    <span className="font-mono text-sm">{apiKey.substring(0, 8)}...</span>
                  </div>
                  <div>
                    <span className="text-sm text-gray-600">Status: </span>
                    <span className="text-green-600 font-medium">Ready to connect</span>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="flex-shrink-0 p-4 border-t border-gray-200">
            <div className="flex space-x-3">
              {currentStep > 0 && (
                <button
                  onClick={handlePrev}
                  className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
                >
                  Previous
                </button>
              )}
              {currentStep < steps.length - 1 ? (
                <button
                  onClick={handleNext}
                  className="flex-1 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
                >
                  Next
                </button>
              ) : (
                <button
                  onClick={handleSave}
                  disabled={isSaving || (currentStep === 2 && !testResult?.ok)}
                  className="flex-1 px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 disabled:opacity-50"
                >
                  {isSaving ? 'Connecting...' : 'Connect Exchange'}
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ConnectExchangeDrawer;
