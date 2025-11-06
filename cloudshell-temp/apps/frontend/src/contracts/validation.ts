import { z } from 'zod';
import { Candle } from './candle';
import { IndicatorSpec, IndicatorInstanceMeta, IndicatorUpdate, IndicatorPoint, OutputMeta } from './indicator';

/**
 * Zod schema for Candle validation
 */
export const CandleSchema = z.object({
  t: z.number().int().positive(),
  o: z.number().positive(),
  h: z.number().positive(),
  l: z.number().positive(),
  c: z.number().positive(),
  v: z.number().min(0),
  f: z.boolean().optional(),
}).refine(
  (data) => data.h >= Math.max(data.o, data.c),
  { message: "High must be >= max(open, close)" }
).refine(
  (data) => data.l <= Math.min(data.o, data.c),
  { message: "Low must be <= min(open, close)" }
);

/**
 * Zod schema for OutputMeta validation
 */
export const OutputMetaSchema = z.object({
  key: z.string().min(1),
  type: z.enum(["line", "histogram", "area"]),
  overlay: z.boolean(),
  zeroLine: z.boolean().optional(),
  levels: z.array(z.number()).optional(),
});

/**
 * Zod schema for IndicatorSpec validation
 */
export const IndicatorSpecSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  inputs: z.record(z.string(), z.union([z.string(), z.number()])),
  timeframe: z.enum(['1m', '5m', '15m', '1h', '4h', '1d']),
  pane: z.enum(['auto', 'price', 'new']),
  style: z.record(z.string(), z.unknown()).optional(),
  version: z.string().optional(),
});

/**
 * Zod schema for IndicatorInstanceMeta validation
 */
export const IndicatorInstanceMetaSchema = z.object({
  id: z.string().min(1),
  outputsMeta: z.array(OutputMetaSchema),
  warmup: z.number().int().min(0),
  defaultPane: z.enum(["price", "new"]),
});

/**
 * Zod schema for IndicatorPoint validation
 */
export const IndicatorPointSchema = z.object({
  t: z.number().int().positive(),
  values: z.record(z.string(), z.union([z.number(), z.null()])),
  status: z.enum(['partial', 'final']),
});

/**
 * Zod schema for IndicatorUpdate validation
 */
export const IndicatorUpdateSchema = z.object({
  id: z.string().min(1),
  points: z.array(IndicatorPointSchema).min(1),
});

/**
 * Validation result type
 */
export type ValidationResult<T> = {
  success: boolean;
  data?: T;
  error?: string;
  path?: string;
};

/**
 * Safe validation function that returns ValidationResult
 */
export function validate<T>(schema: z.ZodSchema<T>, data: unknown): ValidationResult<T> {
  try {
    const result = schema.parse(data);
    return { success: true, data: result };
  } catch (error) {
    if (error instanceof z.ZodError) {
      const firstError = error.issues[0];
      return {
        success: false,
        error: firstError.message,
        path: firstError.path.join('.')
      };
    }
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown validation error'
    };
  }
}

/**
 * Validate candle data
 */
export const validateCandle = (data: unknown): ValidationResult<Candle> => {
  return validate(CandleSchema, data);
};

/**
 * Validate indicator spec
 */
export const validateIndicatorSpec = (data: unknown): ValidationResult<IndicatorSpec> => {
  return validate(IndicatorSpecSchema, data);
};

/**
 * Validate indicator instance meta
 */
export const validateIndicatorInstanceMeta = (data: unknown): ValidationResult<IndicatorInstanceMeta> => {
  return validate(IndicatorInstanceMetaSchema, data);
};

/**
 * Validate indicator update
 */
export const validateIndicatorUpdate = (data: unknown): ValidationResult<IndicatorUpdate> => {
  return validate(IndicatorUpdateSchema, data);
};

/**
 * Validate indicator point
 */
export const validateIndicatorPoint = (data: unknown): ValidationResult<IndicatorPoint> => {
  return validate(IndicatorPointSchema, data);
};

/**
 * Batch validation for multiple items
 */
export function validateBatch<T>(
  validator: (data: unknown) => ValidationResult<T>,
  items: unknown[]
): { valid: T[]; invalid: Array<{ index: number; error: string }> } {
  const valid: T[] = [];
  const invalid: Array<{ index: number; error: string }> = [];

  items.forEach((item, index) => {
    const result = validator(item);
    if (result.success && result.data) {
      valid.push(result.data);
    } else {
      invalid.push({
        index,
        error: result.error || 'Validation failed'
      });
    }
  });

  return { valid, invalid };
}
