import { motion } from 'framer-motion';
import { TrendingUp, Grid3X3, Zap, ArrowRight } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import type { BotType } from '../../lib/api/bots';

interface BotTemplate {
  type: BotType;
  title: string;
  description: string;
  icon: React.ComponentType<any>;
  features: string[];
  color: string;
  bgColor: string;
}

interface BotTemplatesProps {
  onCreateBot: (type: BotType) => void;
}

const templates: BotTemplate[] = [
  {
    type: 'dca',
    title: 'DCA Bot',
    description: 'Dollar Cost Averaging strategy for long-term accumulation',
    icon: TrendingUp,
    features: ['Automated buying', 'Risk management', 'Market timing'],
    color: 'text-blue-600',
    bgColor: 'bg-blue-50',
  },
  {
    type: 'grid',
    title: 'Grid Bot',
    description: 'Profit from market volatility with grid trading strategy',
    icon: Grid3X3,
    features: ['Range trading', 'Multiple orders', 'Volatility profit'],
    color: 'text-green-600',
    bgColor: 'bg-green-50',
  },
  {
    type: 'custom',
    title: 'Custom Bot',
    description: 'Build your own trading strategy with custom indicators',
    icon: Zap,
    features: ['Custom logic', 'Advanced indicators', 'Full control'],
    color: 'text-purple-600',
    bgColor: 'bg-purple-50',
  },
];

export default function BotTemplates({ onCreateBot }: BotTemplatesProps) {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="text-center space-y-2">
        <h3 className="text-xl font-semibold text-foreground">Choose a Bot Template</h3>
        <p className="text-muted-foreground">
          Get started with pre-built strategies or create your own custom bot
        </p>
      </div>

      {/* Templates Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {templates.map((template, index) => (
          <motion.div
            key={template.type}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
            whileHover={{ y: -4, transition: { duration: 0.2 } }}
          >
            <Card className="h-full transition-all duration-200 hover:shadow-lg border-2 hover:border-primary/20">
              <CardHeader className="text-center pb-4">
                <div className={`mx-auto p-4 rounded-2xl ${template.bgColor} mb-4`}>
                  <template.icon className={`h-8 w-8 ${template.color}`} />
                </div>
                <CardTitle className="text-lg">{template.title}</CardTitle>
                <CardDescription className="text-sm">
                  {template.description}
                </CardDescription>
              </CardHeader>

              <CardContent className="space-y-4">
                {/* Features List */}
                <div className="space-y-2">
                  {template.features.map((feature, featureIndex) => (
                    <div key={featureIndex} className="flex items-center space-x-2">
                      <div className={`w-1.5 h-1.5 rounded-full ${template.color.replace('text-', 'bg-')}`} />
                      <span className="text-sm text-muted-foreground">{feature}</span>
                    </div>
                  ))}
                </div>

                {/* Create Button */}
                <Button
                  onClick={() => onCreateBot(template.type)}
                  className={`w-full ${template.color.replace('text-', 'bg-').replace('-600', '-600')} hover:${template.color.replace('text-', 'bg-').replace('-600', '-700')} text-white`}
                >
                  Create {template.title}
                  <ArrowRight className="h-4 w-4 ml-2" />
                </Button>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      {/* Help Text */}
      <div className="text-center">
        <p className="text-sm text-muted-foreground">
          Need help choosing? Check our{' '}
          <a href="#" className="text-primary hover:underline" rel="noopener noreferrer">
            strategy guide
          </a>{' '}
          or{' '}
          <a href="#" className="text-primary hover:underline" rel="noopener noreferrer">
            watch tutorials
          </a>
        </p>
      </div>
    </div>
  );
}

