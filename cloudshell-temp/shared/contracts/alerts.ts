import { z } from "zod";

/** Timeframes like 'same','1m','5m','15m','1h','1d' */
export const Timeframe = z.string().min(2);

export const CompareWith = z.enum(["value", "indicator_component", "price"]);
export const Operator = z.enum([
  ">", "<", ">=", "<=", "equals", "crosses_above", "crosses_below",
]);

export const IndicatorRef = z.object({
  indicator: z.string(),           // e.g. "RSI", "EMA", "MACD"
  component: z.string().optional(),// e.g. "RSI", "Signal", "EMA"
  settings: z.record(z.any()).optional(),
});

export const Condition = z.object({
  id: z.string(),
  type: z.enum(["indicator", "price", "volume"]),
  // LHS
  indicator: z.string().optional(),         // when type='indicator'
  component: z.string().optional(),
  settings: z.record(z.any()).optional(),
  // Comparison
  operator: Operator,
  compareWith: CompareWith,
  compareValue: z.number().optional(),      // when compareWith='value'
  rhs: IndicatorRef.optional(),             // when compareWith='indicator_component'
  // Context
  timeframe: z.string().default("same"),
});

export const ConditionArray = z.array(Condition).min(1);
export const Logic = z.enum(["AND", "OR"]);

export const Action = z.discriminatedUnion("type", [
  z.object({ type: z.literal("notify") }),
  z.object({ type: z.literal("webhook"), url: z.string().url() }),
  // future
  z.object({ type: z.literal("bot"), bot_id: z.string() }),
]);

export const FireMode = z.enum(["per_bar", "per_close", "per_tick"]);

export const AlertCreate = z.object({
  symbol: z.string(),
  base_timeframe: Timeframe,
  conditions: ConditionArray,
  logic: Logic.default("AND"),
  action: Action.default({ type: "notify" }),
  status: z.enum(["active", "paused"]).default("active"),
  fireMode: FireMode.default("per_bar"),
});

export type TCondition = z.infer<typeof Condition>;
export type TAction = z.infer<typeof Action>;
export type TFireMode = z.infer<typeof FireMode>;
export type TAlertCreate = z.infer<typeof AlertCreate>;
