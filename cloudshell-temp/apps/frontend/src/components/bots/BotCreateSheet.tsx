import { useState } from 'react';
import { X, ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '../ui/sheet';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../ui/select';
import { Separator } from '../ui/separator';
import type { BotType, Exchange, CreateBotPayload } from '../../lib/api/bots';

interface BotCreateSheetProps {
  isOpen: boolean;
  onClose: () => void;
  onCreateBot: (payload: CreateBotPayload) => void;
  preselectedType?: BotType;
}

const EXCHANGES: Exchange[] = ['Binance', 'Zerodha', 'KuCoin'];

const POPULAR_PAIRS = {
  Binance: ['BTCUSDT', 'ETHUSDT', 'ADAUSDT', 'SOLUSDT', 'DOTUSDT'],
  Zerodha: ['NIFTY50', 'BANKNIFTY', 'RELIANCE', 'TCS', 'HDFC'],
  KuCoin: ['BTCUSDT', 'ETHUSDT', 'SOLUSDT', 'AVAXUSDT', 'MATICUSDT'],
};

export default function BotCreateSheet({ 
  isOpen, 
  onClose, 
  onCreateBot, 
  preselectedType 
}: BotCreateSheetProps) {
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState<Partial<CreateBotPayload>>({
    bot_type: preselectedType,
    exchange: 'Binance',
    pair: '',
    name: '',
    initial_amount: 10000,
  });

  const handleNext = () => {
    if (step < 3) setStep(step + 1);
  };

  const handleBack = () => {
    if (step > 1) setStep(step - 1);
  };

  const handleSubmit = () => {
    if (formData.name && formData.bot_type && formData.exchange && formData.pair) {
      onCreateBot(formData as CreateBotPayload);
      handleClose();
    }
  };

  const handleClose = () => {
    setStep(1);
    setFormData({
      bot_type: preselectedType,
      exchange: 'Binance',
      pair: '',
      name: '',
      initial_amount: 10000,
    });
    onClose();
  };

  const isStepValid = () => {
    switch (step) {
      case 1: return !!formData.bot_type;
      case 2: return !!formData.exchange && !!formData.pair;
      case 3: return !!formData.name && (formData.initial_amount || 0) > 0;
      default: return false;
    }
  };

  const currentPairs = formData.exchange ? POPULAR_PAIRS[formData.exchange] : [];

  return (
    <Sheet open={isOpen} onOpenChange={handleClose}>
      <SheetContent className="w-full sm:max-w-md">
        <SheetHeader>
          <SheetTitle>Create Trading Bot</SheetTitle>
          <SheetDescription>
            Set up a new automated trading bot in {step} of 3 steps
          </SheetDescription>
        </SheetHeader>

        <div className="mt-6 space-y-6">
          {/* Progress Indicator */}
          <div className="flex items-center space-x-2">
            {[1, 2, 3].map((stepNum) => (
              <div key={stepNum} className="flex items-center">
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                    stepNum === step
                      ? 'bg-primary text-primary-foreground'
                      : stepNum < step
                      ? 'bg-primary/20 text-primary'
                      : 'bg-muted text-muted-foreground'
                  }`}
                >
                  {stepNum}
                </div>
                {stepNum < 3 && (
                  <div
                    className={`w-8 h-0.5 mx-2 ${
                      stepNum < step ? 'bg-primary' : 'bg-muted'
                    }`}
                  />
                )}
              </div>
            ))}
          </div>

          <Separator />

          {/* Step Content */}
          <div className="space-y-4">
            {/* Step 1: Bot Type */}
            {step === 1 && (
              <div className="space-y-4">
                <div>
                  <Label className="text-base font-medium">Choose Bot Type</Label>
                  <p className="text-sm text-muted-foreground mt-1">
                    Select the trading strategy for your bot
                  </p>
                </div>

                <div className="space-y-3">
                  {[
                    { type: 'dca', label: 'DCA Bot', desc: 'Dollar Cost Averaging' },
                    { type: 'grid', label: 'Grid Bot', desc: 'Grid Trading Strategy' },
                    { type: 'custom', label: 'Custom Bot', desc: 'Custom Strategy' },
                  ].map((option) => (
                    <div
                      key={option.type}
                      className={`p-4 border-2 rounded-lg cursor-pointer transition-colors ${
                        formData.bot_type === option.type
                          ? 'border-primary bg-primary/5'
                          : 'border-border hover:border-primary/50'
                      }`}
                      onClick={() => setFormData({ ...formData, bot_type: option.type as BotType })}
                    >
                      <div className="font-medium">{option.label}</div>
                      <div className="text-sm text-muted-foreground">{option.desc}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Step 2: Exchange & Pair */}
            {step === 2 && (
              <div className="space-y-4">
                <div>
                  <Label className="text-base font-medium">Exchange & Trading Pair</Label>
                  <p className="text-sm text-muted-foreground mt-1">
                    Choose where to trade and which pair
                  </p>
                </div>

                <div className="space-y-4">
                  <div>
                    <Label htmlFor="exchange">Exchange</Label>
                    <Select
                      value={formData.exchange}
                      onValueChange={(exchange: string) => 
                        setFormData({ ...formData, exchange: exchange as Exchange, pair: '' })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select exchange" />
                      </SelectTrigger>
                      <SelectContent>
                        {EXCHANGES.map((exchange) => (
                          <SelectItem key={exchange} value={exchange}>
                            {exchange}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label htmlFor="pair">Trading Pair</Label>
                    <Input
                      id="pair"
                      placeholder="e.g., BTCUSDT"
                      value={formData.pair}
                      onChange={(e) => setFormData({ ...formData, pair: e.target.value.toUpperCase() })}
                    />
                    
                    {/* Popular Pairs */}
                    <div className="mt-2 flex flex-wrap gap-1">
                      <span className="text-xs text-muted-foreground mr-2">Popular:</span>
                      {currentPairs.map((pair) => (
                        <button
                          key={pair}
                          onClick={() => setFormData({ ...formData, pair })}
                          className="text-xs px-2 py-1 bg-muted hover:bg-muted/80 rounded text-muted-foreground hover:text-foreground transition-colors"
                        >
                          {pair}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Step 3: Bot Configuration */}
            {step === 3 && (
              <div className="space-y-4">
                <div>
                  <Label className="text-base font-medium">Bot Configuration</Label>
                  <p className="text-sm text-muted-foreground mt-1">
                    Name your bot and set initial parameters
                  </p>
                </div>

                <div className="space-y-4">
                  <div>
                    <Label htmlFor="name">Bot Name</Label>
                    <Input
                      id="name"
                      placeholder="e.g., My BTC DCA Bot"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    />
                  </div>

                  <div>
                    <Label htmlFor="amount">Initial Amount (₹)</Label>
                    <Input
                      id="amount"
                      type="number"
                      placeholder="10000"
                      value={formData.initial_amount}
                      onChange={(e) => setFormData({ ...formData, initial_amount: Number(e.target.value) })}
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      Minimum: ₹1,000 • This amount will be allocated to the bot
                    </p>
                  </div>

                  {/* Summary */}
                  <div className="p-4 bg-muted/50 rounded-lg space-y-2">
                    <h4 className="font-medium text-sm">Summary</h4>
                    <div className="space-y-1 text-sm">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Type:</span>
                        <span className="capitalize">{formData.bot_type}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Exchange:</span>
                        <span>{formData.exchange}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Pair:</span>
                        <span>{formData.pair}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Initial:</span>
                        <span>₹{formData.initial_amount?.toLocaleString('en-IN')}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          <Separator />

          {/* Navigation Footer */}
          <div className="flex items-center justify-between">
            <Button
              variant="outline"
              onClick={step === 1 ? handleClose : handleBack}
              disabled={step === 1}
            >
              {step === 1 ? (
                <X className="h-4 w-4 mr-2" />
              ) : (
                <ChevronLeft className="h-4 w-4 mr-2" />
              )}
              {step === 1 ? 'Cancel' : 'Back'}
            </Button>

            <div className="flex items-center space-x-2">
              {step < 3 ? (
                <Button
                  onClick={handleNext}
                  disabled={!isStepValid()}
                >
                  Next
                  <ChevronRight className="h-4 w-4 ml-2" />
                </Button>
              ) : (
                <Button
                  onClick={handleSubmit}
                  disabled={!isStepValid()}
                  className="bg-green-600 hover:bg-green-700"
                >
                  Create Bot
                </Button>
              )}
            </div>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}

