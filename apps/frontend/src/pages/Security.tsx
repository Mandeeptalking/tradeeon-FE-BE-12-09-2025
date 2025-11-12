import { Shield, Lock, CheckCircle, AlertTriangle, Globe, Key, Server, FileText } from 'lucide-react';
import { Link } from 'react-router-dom';

const Security = () => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      <div className="max-w-4xl mx-auto px-4 py-12">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-100 rounded-full mb-4">
            <Shield className="w-8 h-8 text-blue-600" />
          </div>
          <h1 className="text-4xl font-bold text-gray-900 mb-4">Security</h1>
          <p className="text-xl text-gray-600">
            How we protect your data and trading accounts
          </p>
        </div>

        {/* Security Overview */}
        <div className="bg-white rounded-xl shadow-lg p-8 mb-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-6 flex items-center gap-2">
            <Lock className="w-6 h-6 text-blue-600" />
            Security Overview
          </h2>
          <p className="text-gray-700 mb-6">
            At Tradeeon, security is our top priority. We implement industry-standard security measures
            to protect your data, API keys, and trading accounts. This page outlines our security practices,
            certifications, and how we handle security incidents.
          </p>
          <div className="grid md:grid-cols-2 gap-4">
            <div className="p-4 bg-green-50 rounded-lg border border-green-200">
              <div className="flex items-center gap-2 mb-2">
                <CheckCircle className="w-5 h-5 text-green-600" />
                <span className="font-semibold text-green-900">Production Ready</span>
              </div>
              <p className="text-sm text-green-800">
                Comprehensive security measures implemented and verified
              </p>
            </div>
            <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
              <div className="flex items-center gap-2 mb-2">
                <Shield className="w-5 h-5 text-blue-600" />
                <span className="font-semibold text-blue-900">OWASP Compliant</span>
              </div>
              <p className="text-sm text-blue-800">
                Following OWASP Top 10 security best practices
              </p>
            </div>
          </div>
        </div>

        {/* Security Measures */}
        <div className="bg-white rounded-xl shadow-lg p-8 mb-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-6 flex items-center gap-2">
            <Server className="w-6 h-6 text-blue-600" />
            Security Measures
          </h2>
          
          <div className="space-y-6">
            {/* Encryption */}
            <div className="border-l-4 border-blue-500 pl-4">
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Encryption</h3>
              <ul className="space-y-2 text-gray-700">
                <li className="flex items-start gap-2">
                  <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                  <span><strong>TLS 1.2+:</strong> All data encrypted in transit using industry-standard TLS protocols</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                  <span><strong>HSTS:</strong> HTTP Strict Transport Security enforced with preload</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                  <span><strong>API Keys:</strong> Encrypted at rest using Fernet symmetric encryption</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                  <span><strong>Database:</strong> All sensitive data encrypted at rest</span>
                </li>
              </ul>
            </div>

            {/* Authentication */}
            <div className="border-l-4 border-green-500 pl-4">
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Authentication & Authorization</h3>
              <ul className="space-y-2 text-gray-700">
                <li className="flex items-start gap-2">
                  <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                  <span><strong>Supabase Auth:</strong> Industry-standard authentication service</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                  <span><strong>Email Verification:</strong> Required before account access</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                  <span><strong>JWT Tokens:</strong> Secure token-based authentication</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                  <span><strong>Session Management:</strong> Secure session storage via Supabase</span>
                </li>
              </ul>
            </div>

            {/* API Security */}
            <div className="border-l-4 border-purple-500 pl-4">
              <h3 className="text-lg font-semibold text-gray-900 mb-2">API Security</h3>
              <ul className="space-y-2 text-gray-700">
                <li className="flex items-start gap-2">
                  <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                  <span><strong>Rate Limiting:</strong> All endpoints protected (5-20 requests per 5-10 seconds)</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                  <span><strong>CSRF Protection:</strong> CSRF tokens and Origin header validation</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                  <span><strong>Input Validation:</strong> All user inputs sanitized and validated</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                  <span><strong>Output Encoding:</strong> HTML entity encoding for all user-generated content</span>
                </li>
              </ul>
            </div>

            {/* Infrastructure */}
            <div className="border-l-4 border-orange-500 pl-4">
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Infrastructure Security</h3>
              <ul className="space-y-2 text-gray-700">
                <li className="flex items-start gap-2">
                  <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                  <span><strong>AWS CloudFront:</strong> DDoS protection and edge security</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                  <span><strong>WAF:</strong> Web Application Firewall protecting against common attacks</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                  <span><strong>Security Headers:</strong> Comprehensive HTTP security headers</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                  <span><strong>Regular Updates:</strong> Dependencies updated and vulnerabilities patched</span>
                </li>
              </ul>
            </div>
          </div>
        </div>

        {/* Security Headers */}
        <div className="bg-white rounded-xl shadow-lg p-8 mb-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-6 flex items-center gap-2">
            <Globe className="w-6 h-6 text-blue-600" />
            HTTP Security Headers
          </h2>
          <div className="space-y-4">
            <div className="bg-gray-50 rounded-lg p-4">
              <h3 className="font-semibold text-gray-900 mb-2">Implemented Headers:</h3>
              <ul className="space-y-1 text-sm text-gray-700 font-mono">
                <li>✓ Strict-Transport-Security: max-age=31536000; includeSubDomains; preload</li>
                <li>✓ Content-Security-Policy: Comprehensive policy restricting scripts and resources</li>
                <li>✓ X-Content-Type-Options: nosniff</li>
                <li>✓ X-Frame-Options: DENY</li>
                <li>✓ Referrer-Policy: strict-origin-when-cross-origin</li>
                <li>✓ Permissions-Policy: Restricts geolocation, microphone, camera</li>
                <li>✓ X-XSS-Protection: 1; mode=block</li>
              </ul>
            </div>
            <p className="text-sm text-gray-600">
              Verify our security headers: <a href="https://securityheaders.com/?q=https://www.tradeeon.com" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">securityheaders.com</a>
            </p>
          </div>
        </div>

        {/* Vulnerability Disclosure */}
        <div className="bg-white rounded-xl shadow-lg p-8 mb-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-6 flex items-center gap-2">
            <AlertTriangle className="w-6 h-6 text-blue-600" />
            Vulnerability Disclosure
          </h2>
          <p className="text-gray-700 mb-4">
            We take security seriously and appreciate responsible disclosure of vulnerabilities.
            If you discover a security issue, please report it to us.
          </p>
          <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
            <h3 className="font-semibold text-blue-900 mb-2">How to Report:</h3>
            <ul className="space-y-2 text-blue-800">
              <li>📧 Email: <a href="mailto:security@tradeeon.com" className="underline">security@tradeeon.com</a></li>
              <li>📄 Security Policy: <a href="/.well-known/security.txt" className="underline">/.well-known/security.txt</a></li>
              <li>⏱️ Response Time: We respond within 48 hours</li>
            </ul>
          </div>
        </div>

        {/* Security Certifications & Audits */}
        <div className="bg-white rounded-xl shadow-lg p-8 mb-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-6 flex items-center gap-2">
            <FileText className="w-6 h-6 text-blue-600" />
            Security Certifications & Audits
          </h2>
          <div className="space-y-4">
            <div className="border-l-4 border-blue-500 pl-4">
              <h3 className="font-semibold text-gray-900 mb-2">Current Status:</h3>
              <ul className="space-y-2 text-gray-700">
                <li className="flex items-start gap-2">
                  <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                  <span><strong>OWASP Compliance:</strong> Following OWASP Top 10 best practices</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                  <span><strong>SSL/TLS:</strong> A-grade certificate configuration (AWS ACM)</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
                  <span><strong>External Audit:</strong> Planned for Q2 2025</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
                  <span><strong>GDPR Compliance:</strong> Privacy policy and data protection measures in place</span>
                </li>
              </ul>
            </div>
            <div className="bg-gray-50 rounded-lg p-4">
              <h3 className="font-semibold text-gray-900 mb-2">Security Test Results:</h3>
              <ul className="space-y-2 text-sm text-gray-700">
                <li>🔒 <a href="https://www.ssllabs.com/ssltest/analyze.html?d=www.tradeeon.com" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">SSL Labs Test</a> - A-grade TLS configuration</li>
                <li>🛡️ <a href="https://securityheaders.com/?q=https://www.tradeeon.com" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">Security Headers Test</a> - All headers present</li>
              </ul>
            </div>
          </div>
        </div>

        {/* Data Protection */}
        <div className="bg-white rounded-xl shadow-lg p-8 mb-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-6 flex items-center gap-2">
            <Key className="w-6 h-6 text-blue-600" />
            Data Protection
          </h2>
          <div className="space-y-4">
            <div>
              <h3 className="font-semibold text-gray-900 mb-2">What We Protect:</h3>
              <ul className="space-y-2 text-gray-700">
                <li>✓ API keys encrypted at rest</li>
                <li>✓ User credentials never stored in plain text</li>
                <li>✓ Trading data encrypted in transit</li>
                <li>✓ Personal information protected per GDPR</li>
              </ul>
            </div>
            <div>
              <h3 className="font-semibold text-gray-900 mb-2">What We Don't Store:</h3>
              <ul className="space-y-2 text-gray-700">
                <li>✓ We never store your API secrets in plain text</li>
                <li>✓ We never store your trading passwords</li>
                <li>✓ We never access your exchange accounts without permission</li>
              </ul>
            </div>
          </div>
        </div>

        {/* Best Practices */}
        <div className="bg-blue-50 rounded-xl p-8 mb-8 border border-blue-200">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Security Best Practices for Users</h2>
          <ul className="space-y-3 text-gray-700">
            <li className="flex items-start gap-2">
              <CheckCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
              <span>Use strong, unique passwords for your Tradeeon account</span>
            </li>
            <li className="flex items-start gap-2">
              <CheckCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
              <span>Enable two-factor authentication (2FA) when available</span>
            </li>
            <li className="flex items-start gap-2">
              <CheckCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
              <span>Create API keys with minimal required permissions</span>
            </li>
            <li className="flex items-start gap-2">
              <CheckCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
              <span>Whitelist our IP addresses in your exchange API settings</span>
            </li>
            <li className="flex items-start gap-2">
              <CheckCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
              <span>Never share your API keys or secrets</span>
            </li>
            <li className="flex items-start gap-2">
              <CheckCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
              <span>Regularly review your connected accounts and active sessions</span>
            </li>
          </ul>
        </div>

        {/* Contact */}
        <div className="text-center">
          <p className="text-gray-600 mb-4">
            Questions about security? Contact us at{' '}
            <a href="mailto:security@tradeeon.com" className="text-blue-600 hover:underline">
              security@tradeeon.com
            </a>
          </p>
          <Link
            to="/"
            className="inline-flex items-center gap-2 text-blue-600 hover:text-blue-700 font-medium"
          >
            ← Back to Home
          </Link>
        </div>
      </div>
    </div>
  );
};

export default Security;

