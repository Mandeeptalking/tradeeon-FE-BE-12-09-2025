import { IndicatorDef, Candle, registerIndicator } from './registry';
import { emaSeries, emaNext, type Candle as SharedCandle } from '../../shared/indicators/core';

const EMA: IndicatorDef = {
  name: 'EMA',
  pane: 'price',
  calc(candles, { length = 20, source = 'close' }) {
    const lengthNum = Number(length);
    const sourceStr = (source ?? 'close') as 'close'|'hlc3'|'ohlc4';
    return emaSeries(candles as SharedCandle[], lengthNum, sourceStr);
  },

  draw(ctx, data, style, xOfIdx, yOfPrice, from, to, candles) {
    ctx.save();
    ctx.lineWidth = style.width ?? 1.5;
    ctx.strokeStyle = style.color;
    if (style.alpha && style.alpha < 1) {
      ctx.globalAlpha = style.alpha;
    }
    if (style.dashed) {
      ctx.setLineDash([4, 3]);
    }

    let started = false;
    
    // Draw based on candle indices for proper alignment
    for (let i = from; i <= to; i++) {
      if (i < 0 || i >= candles.length) continue;
      
      const timestamp = candles[i].t;
      const value = data.get(timestamp);
      
      if (value == null) {
        started = false;
        continue;
      }

      const x = xOfIdx(i);
      const y = yOfPrice(value);

      if (!started) {
        ctx.beginPath();
        ctx.moveTo(x, y);
        started = true;
      } else {
        ctx.lineTo(x, y);
      }
    }

    if (started) {
      ctx.stroke();
    }
    
    ctx.restore();
  }
};

// Register the indicator
registerIndicator(EMA);

// Export incremental EMA function for live updates
export function emaIncremental(
  lastBar: Candle,
  prevEmaValue: number | null,
  params: { length: number; source: 'close'|'hlc3'|'ohlc4' }
): number | null {
  return emaNext(lastBar as SharedCandle, prevEmaValue, params.length, params.source);
}

export default EMA;
