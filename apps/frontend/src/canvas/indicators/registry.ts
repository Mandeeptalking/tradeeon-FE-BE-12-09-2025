export type Candle = { t: number; o: number; h: number; l: number; c: number; v?: number };
export type PaneId = 'price' | 'rsi' | 'macd' | 'stochastic' | 'williams_r' | 'atr' | 'adx';
export type IndParams = Record<string, any>;
export type IndStyle = { color: string; width: number; dashed?: boolean; alpha?: number };

export interface IndicatorDef {
  name: string;
  pane: PaneId;
  calc: (candles: Candle[], params: IndParams, prev?: Map<number, number | null>) => Map<number, number | null> | Record<string, Map<number, number | null>>;
  draw: (
    ctx: CanvasRenderingContext2D,
    data: Map<number, number | null> | Record<string, Map<number, number | null>>,
    style: IndStyle,
    xOfIdx: (i: number) => number,
    yOfPrice: (p: number) => number,
    from: number,
    to: number,
    candles: Candle[]
  ) => void;
}

export interface IndicatorInst {
  id: string;
  name: string;
  pane: PaneId;
  params: IndParams;
  style: IndStyle;
  data: Map<number, number | null> | Record<string, Map<number, number | null>>;
}

// Registry storage
const indicatorDefs = new Map<string, IndicatorDef>();
const indicatorInsts = new Map<string, IndicatorInst>();
let nextId = 1;

export const registerIndicator = (def: IndicatorDef): void => {
  indicatorDefs.set(def.name, def);
};

export const createIndicator = (
  name: string,
  pane: PaneId,
  params: IndParams,
  style: IndStyle
): IndicatorInst => {
  const def = indicatorDefs.get(name);
  if (!def) {
    throw new Error(`Indicator '${name}' not found in registry`);
  }

  const id = `${name}_${nextId++}`;
  const inst: IndicatorInst = {
    id,
    name,
    pane,
    params: { ...params },
    style: { ...style },
    data: new Map()
  };

  indicatorInsts.set(id, inst);
  return inst;
};

export const updateIndicator = (
  id: string,
  next: { params?: IndParams; style?: IndStyle; data?: Map<number, number | null> }
): IndicatorInst | undefined => {
  const inst = indicatorInsts.get(id);
  if (!inst) return undefined;

  if (next.params) {
    inst.params = { ...inst.params, ...next.params };
  }
  if (next.style) {
    inst.style = { ...inst.style, ...next.style };
  }
  if (next.data) {
    inst.data = next.data;
  }

  return inst;
};

export const removeIndicator = (id: string): void => {
  indicatorInsts.delete(id);
};

export const listIndicators = (pane: PaneId): IndicatorInst[] => {
  return Array.from(indicatorInsts.values()).filter(inst => inst.pane === pane);
};

export const getIndicatorDef = (name: string): IndicatorDef | undefined => {
  return indicatorDefs.get(name);
};

export const getIndicatorInst = (id: string): IndicatorInst | undefined => {
  return indicatorInsts.get(id);
};

export const getAllIndicatorDefs = (): IndicatorDef[] => {
  return Array.from(indicatorDefs.values());
};
