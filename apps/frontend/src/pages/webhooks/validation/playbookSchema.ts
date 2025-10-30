import { z } from 'zod';

export const FireModeSchema = z.enum(['per_bar', 'per_close', 'per_tick']);
export const PatternSchema = z.enum(['ALL', 'SEQUENCE', 'N_OF_M']);
export const TimeframeSchema = z.enum(['base', '1m', '3m', '5m', '15m', '1h', '4h', '1d']);

export const AlertDefSchema = z.object({
  id: z.string(),
  name: z.string().min(1, 'Name is required'),
  source: z.literal('tradingview'),
  keyHint: z.string().optional(),
  fireMode: FireModeSchema,
  validityBars: z.number().min(1, 'Validity must be at least 1 bar'),
  debounceBars: z.number().min(0, 'Debounce must be at least 0'),
  resetOnOpposite: z.boolean(),
  timeframe: TimeframeSchema,
  meta: z.record(z.any()).optional(),
});

const OrchestrationBaseSchema = z.discriminatedUnion('pattern', [
  z.object({
    pattern: z.literal('ALL'),
    alertIds: z.array(z.string()).min(1, 'At least one alert is required'),
    simultaneous: z.boolean(),
  }),
  z.object({
    pattern: z.literal('SEQUENCE'),
    steps: z.array(z.object({
      alertId: z.string(),
      windowBars: z.number().min(0, 'Window must be non-negative'),
    })).min(1, 'At least one step is required'),
  }),
  z.object({
    pattern: z.literal('N_OF_M'),
    group: z.array(z.object({
      alertId: z.string(),
    })).min(1, 'At least one alert in group is required'),
    n: z.number().int().min(1),
    sharedWindowBars: z.number().min(0, 'Window must be non-negative'),
  }),
]);

export const OrchestrationDefSchema = OrchestrationBaseSchema.superRefine((data, ctx) => {
  if (data.pattern === 'N_OF_M') {
    if (data.n > data.group.length) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'N cannot exceed the number of alerts in group',
        path: ['n'],
      });
    }
  }
});

export const GateDefSchema = z.object({
  decisionTiming: FireModeSchema,
  rearmCooldownBars: z.number().min(0, 'Cooldown must be non-negative'),
  maxEntriesPerDay: z.number().min(0, 'Max entries must be non-negative'),
  tradingWindow: z.object({
    start: z.string(),
    end: z.string(),
  }).optional(),
});

export const PlaybookDraftSchema = z.object({
  alerts: z.array(AlertDefSchema).min(1, 'At least one alert is required'),
  orchestration: OrchestrationDefSchema,
  gate: GateDefSchema,
});

export type ValidationResult = {
  valid: boolean;
  errors: string[];
};

export function validatePlaybook(playbook: any): ValidationResult {
  const result = PlaybookDraftSchema.safeParse(playbook);
  
  if (result.success) {
    return { valid: true, errors: [] };
  }
  
  const errors = result.error.errors.map(err => {
    const path = err.path.join('.');
    return `${path}: ${err.message}`;
  });
  
  return { valid: false, errors };
}

