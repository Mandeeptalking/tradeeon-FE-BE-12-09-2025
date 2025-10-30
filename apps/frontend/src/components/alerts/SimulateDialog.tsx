import * as React from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { simulateAlert } from "@/lib/api/alertsApi";
import { Button } from "@/components/ui/button";

export default function SimulateDialog({ 
  id, 
  open, 
  onOpenChange 
}: {
  id: string;
  open: boolean;
  onOpenChange: (b: boolean) => void;
}) {
  const [result, setResult] = React.useState<any>();
  const [loading, setLoading] = React.useState(false);
  
  React.useEffect(() => {
    if (open) {
      setLoading(true);
      simulateAlert(id)
        .then(setResult)
        .finally(() => setLoading(false));
    }
  }, [open, id]);
  
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Test Trigger</DialogTitle>
        </DialogHeader>
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2"></div>
              <p className="text-gray-600">Simulating alert evaluation...</p>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <span className="font-medium">Would fire:</span>
              <span className={`px-2 py-1 rounded text-sm font-semibold ${
                result?.would_fire 
                  ? 'bg-green-100 text-green-800' 
                  : 'bg-red-100 text-red-800'
              }`}>
                {result?.would_fire ? "YES" : "NO"}
              </span>
            </div>
            
            {result?.reasons && result.reasons.length > 0 && (
              <div>
                <h4 className="font-medium mb-2">Condition Results:</h4>
                <div className="space-y-2">
                  {result.reasons.map((reason: any, index: number) => (
                    <div key={index} className="flex items-center gap-2 p-2 bg-gray-50 rounded">
                      <span className={`w-2 h-2 rounded-full ${
                        reason.ok ? 'bg-green-500' : 'bg-red-500'
                      }`}></span>
                      <span className="text-sm">
                        Condition {index + 1}: {reason.ok ? 'PASSED' : 'FAILED'}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
            
            {result?.snapshot && (
              <div>
                <h4 className="font-medium mb-2">Market Data Snapshot:</h4>
                <div className="rounded border p-3 bg-muted/30">
                  <pre className="text-xs whitespace-pre-wrap overflow-auto max-h-40">
                    {JSON.stringify(result.snapshot, null, 2)}
                  </pre>
                </div>
              </div>
            )}
            
            <div className="flex justify-end pt-4 border-t">
              <Button onClick={() => onOpenChange(false)}>
                Close
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

