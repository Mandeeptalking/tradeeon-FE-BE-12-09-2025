import React, { useState } from 'react';
import { Button } from '../../../components/ui/button';
import { CheckCircle2, XCircle, Copy, Check } from 'lucide-react';
import { validatePlaybook } from '../validation/playbookSchema';

interface PlaybookPreviewProps {
  playbook: any;
}

export default function PlaybookPreview({ playbook }: PlaybookPreviewProps) {
  const [copied, setCopied] = useState(false);
  
  const validation = validatePlaybook(playbook);
  const jsonString = JSON.stringify(playbook, null, 2);

  const handleCopy = () => {
    navigator.clipboard.writeText(jsonString);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-white">Playbook Preview</h3>
          <p className="text-sm text-gray-400">Live JSON preview with validation</p>
        </div>
        <div className="flex items-center gap-2">
          {validation.valid ? (
            <div className="flex items-center gap-2 text-green-400">
              <CheckCircle2 className="w-5 h-5" />
              <span className="text-sm font-medium">Valid</span>
            </div>
          ) : (
            <div className="flex items-center gap-2 text-red-400">
              <XCircle className="w-5 h-5" />
              <span className="text-sm font-medium">Invalid</span>
            </div>
          )}
          <Button
            onClick={handleCopy}
            variant="outline"
            size="sm"
            className="border-gray-600 text-gray-300 hover:bg-white/10"
          >
            {copied ? (
              <>
                <Check className="w-4 h-4 mr-2" />
                Copied
              </>
            ) : (
              <>
                <Copy className="w-4 h-4 mr-2" />
                Copy
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Validation Errors */}
      {!validation.valid && validation.errors.length > 0 && (
        <div className="p-4 bg-red-900/20 border border-red-500/30 rounded-lg">
          <h4 className="text-sm font-semibold text-red-300 mb-2">Validation Errors:</h4>
          <ul className="list-disc list-inside space-y-1">
            {validation.errors.map((error, index) => (
              <li key={index} className="text-sm text-red-400">{error}</li>
            ))}
          </ul>
        </div>
      )}

      {/* JSON Preview */}
      <div className="relative">
        <pre className="p-4 bg-gray-900/50 rounded-lg border border-gray-700/50 overflow-x-auto text-sm">
          <code className="text-gray-200 font-mono whitespace-pre-wrap">
            {jsonString}
          </code>
        </pre>
      </div>
    </div>
  );
}

