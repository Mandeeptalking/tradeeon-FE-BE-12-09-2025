/**
 * Chart Initialization for KlineCharts
 * 
 * Registers custom indicators and overlays, initializes chart with proper configuration
 */

import { registerIndicator } from 'klinecharts';
import { RSI_INDICATOR, createRSIIndicatorDefinition } from '../indicators/rsi';
import { TRADEEON_EMA, createEMAIndicatorDefinition } from '../indicators/ema';

/**
 * Register all custom indicators and overlays
 * Call this once before creating any charts
 */
export function registerCustomComponents(): boolean {
  console.log('🔧 Registering custom chart components...');
  
  try {
    // Register RSI indicator (with type assertion to bypass strict typing)
    registerIndicator(RSI_INDICATOR as any);
    console.log('✅ Registered RSI indicator');
    
    // Register TRADEEON_EMA indicator (unique name to avoid collision with built-in EMA)
    registerIndicator(TRADEEON_EMA as any);
    console.log('✅ Registered TRADEEON_EMA indicator:', TRADEEON_EMA.name);
    
    
    // Register RSI bands overlay
    // registerOverlay(RSI_BANDS_OVERLAY);
    // console.log('✅ Registered RSI bands overlay');
    
    // Register RSI levels overlay (persistent version)
    // registerOverlay(RSI_LEVELS_OVERLAY);
    // console.log('✅ Registered RSI levels overlay');

    // registerOverlay(RSI_SETTINGS_BUTTON_OVERLAY);
    // console.log('✅ Registered RSI settings button overlay');
    
    console.log('🎯 All custom components registered successfully');
    return true;
    
  } catch (error) {
    console.error('❌ Error registering custom components:', error);
    return false;
  }
}

/**
 * Create RSI indicator with bands on chart
 */
export function createRSIWithBands(
  chart: any,
  params: {
    length?: number;
    source?: string;
    maLength?: number;
    showMA?: boolean;
    overbought?: number;
    oversold?: number;
    showBands?: boolean;
    showBackground?: boolean;
    rsiColor?: string;
    rsiMAColor?: string;
    overboughtColor?: string;
    oversoldColor?: string;
    lineStyle?: string;
  } = {},
  onDoubleClick?: () => void,
  onSettingsClick?: () => void
): { rsiIndicatorId: string | null, rsiPaneId: string | null, bandsOverlayId: string | null } {
  
  console.log('🎨 Creating RSI with bands...', params);
  
  if (!chart) {
    console.error('❌ Chart instance not available');
    return { rsiIndicatorId: null, rsiPaneId: null, bandsOverlayId: null };
  }
  
  try {
    // Create a unique RSI indicator name for this specific configuration (including colors)
    const colorHash = `${(params.rsiColor ?? '#4C84FF').replace('#', '')}_${(params.rsiMAColor ?? '#9094a6').replace('#', '')}`;
    const rsiName = `TRADEEON_RSI_${params.length ?? 14}_${params.source ?? 'close'}_${params.maLength ?? 9}_${params.showMA !== false}_${colorHash}`;
    console.log('🔧 Creating dynamic RSI indicator with colors:', rsiName);
    
    // Create and register a new RSI definition for these specific parameters
    const rsiDefinition = createRSIIndicatorDefinition(
      params.length ?? 14,
      params.source ?? 'close',
      params.maLength ?? 9,
      params.showMA !== false,
      params.overbought ?? 70,
      params.oversold ?? 30,
      params.showBands !== false,
      params.rsiColor ?? '#4C84FF',
      params.rsiMAColor ?? '#9094a6',
      params.overboughtColor ?? '#ef4444',
      params.oversoldColor ?? '#22c55e'
    );
    rsiDefinition.name = rsiName; // Override the name to be unique
    
    // Register this specific RSI indicator
    registerIndicator(rsiDefinition as any);
    
    // Create RSI indicator in separate pane using the registered name
    const rsiIndicatorId = chart.createIndicator(rsiName, false); // false = separate pane
    
    // Immediately resolve the pane id
    const rsiPaneId = chart.getIndicators({ id: rsiIndicatorId })?.[0]?.paneId;
    
    // Lock y-axis to 0–100
    if (rsiPaneId) {
      try {
        chart.setPaneOptions(rsiPaneId, { yAxis: { type: 'custom', min: 0, max: 100 } });
      } catch {}
    }
    
    console.log('✅ RSI indicator with built-in reference lines created in pane:', rsiPaneId);
    
    // Add double-click event listener to RSI pane
    if (rsiPaneId && onDoubleClick) {
      setTimeout(() => {
        try {
          // Get the chart DOM element and add double-click listener
          const chartDom = chart.getDom();
          if (chartDom) {
            const handleDoubleClick = (e: MouseEvent) => {
              // Check if the double-click happened on the RSI pane
              const chartRect = chartDom.getBoundingClientRect();
              
              // Simple approach: if RSI is enabled and user double-clicks anywhere on chart,
              // check if it's in the lower portion (where RSI would be)
              const clickY = e.clientY - chartRect.top;
              const chartHeight = chartRect.height;
              
              // Assume RSI pane is in bottom 30% of chart (rough estimation)
              if (clickY > chartHeight * 0.7) {
                console.log('🖱️ Double-clicked in RSI area, opening settings');
                e.preventDefault();
                e.stopPropagation();
                onDoubleClick();
              }
            };
            
            chartDom.addEventListener('dblclick', handleDoubleClick);
            console.log('✅ Added double-click listener to chart for RSI');
            
            // Store the handler for cleanup (if needed later)
            if (!chart._rsiDoubleClickHandler) {
              chart._rsiDoubleClickHandler = handleDoubleClick;
            }
          }
        } catch (error) {
          console.warn('⚠️ Could not add double-click listener:', error);
        }
      }, 200);
    }

    // Create settings button using simpler approach
    let bandsOverlayId = 'built-in';
    if (rsiPaneId && onSettingsClick) {
      setTimeout(() => {
        try {
          // Try to create a simple text annotation for settings button
          const currentTime = Date.now();
          const settingsOverlayId = chart.createOverlay({
            name: 'simpleAnnotation',
            paneId: rsiPaneId,
            points: [{ timestamp: currentTime, value: 95 }],
            styles: {
              text: {
                content: '⚙️',
                color: '#666666',
                size: 14,
                family: 'Arial'
              },
              point: {
                color: 'transparent',
                borderColor: 'transparent',
                radius: 0
              }
            }
          });
          
          if (settingsOverlayId) {
            console.log('✅ Created RSI settings button annotation:', settingsOverlayId);
            bandsOverlayId = settingsOverlayId;
            
            // Add click listener to the chart for settings button area
            const chartDom = chart.getDom();
            if (chartDom) {
              const handleSettingsClick = (e: MouseEvent) => {
                const chartRect = chartDom.getBoundingClientRect();
                const clickY = e.clientY - chartRect.top;
                const clickX = e.clientX - chartRect.left;
                const chartHeight = chartRect.height;
                const chartWidth = chartRect.width;
                
                // Check if click is in top-right area of RSI pane (bottom 30% of chart)
                if (clickY > chartHeight * 0.7 && clickX > chartWidth * 0.9) {
                  console.log('⚙️ Settings area clicked');
                  e.preventDefault();
                  e.stopPropagation();
                  onSettingsClick();
                }
              };
              
              chartDom.addEventListener('click', handleSettingsClick);
              console.log('✅ Added settings button click listener');
            }
          }
        } catch (error) {
          console.warn('⚠️ Could not create settings button:', error);
        }
      }, 300);
    }
    
    // Force pane Y-axis to 0-100 range
    if (rsiPaneId) {
      setTimeout(() => {
        try {
          // Try to set Y-axis range for RSI pane
          chart.setPaneOptions(rsiPaneId, {
            axisOptions: {
              minValue: 0,
              maxValue: 100
            }
          });
          console.log('✅ Set RSI pane Y-axis to 0-100');
        } catch (error) {
          console.warn('⚠️ Could not set RSI pane Y-axis range:', error);
        }
      }, 100);
    }
    
    return { rsiIndicatorId, rsiPaneId, bandsOverlayId };
    
  } catch (error) {
    console.error('❌ Error creating RSI with bands:', error);
    return { rsiIndicatorId: null, rsiPaneId: null, bandsOverlayId: null };
  }
}

/**
 * Update RSI parameters
 */
export function updateRSIParams(
  chart: any,
  rsiIndicatorId: string,
  bandsOverlayId: string | null,
  params: any
): { newRsiIndicatorId: string | null, newRsiPaneId: string | null } {
  console.log('🔄 Updating RSI with dynamic registration:', params);
  
  try {
    // Remove the old RSI indicator
    if (rsiIndicatorId) {
      chart.removeIndicator({ id: rsiIndicatorId });
      console.log('🗑️ Removed old RSI indicator:', rsiIndicatorId);
    }
    
    // Remove old bands overlay if it exists
    if (bandsOverlayId) {
      chart.removeOverlay({ id: bandsOverlayId });
      console.log('🗑️ Removed old bands overlay:', bandsOverlayId);
    }
    
    // Create new RSI with updated parameters using dynamic registration (including colors)
    const colorHash = `${(params.rsiColor ?? '#4C84FF').replace('#', '')}_${(params.rsiMAColor ?? '#9094a6').replace('#', '')}`;
    const rsiName = `TRADEEON_RSI_${params.length ?? 14}_${params.source ?? 'close'}_${params.maLength ?? 9}_${params.showMA !== false}_${colorHash}`;
    console.log('🔧 Creating new RSI indicator with colors:', rsiName);
    
    // Create and register new RSI definition
    const rsiDefinition = createRSIIndicatorDefinition(
      params.length ?? 14,
      params.source ?? 'close',
      params.maLength ?? 9,
      params.showMA !== false,
      params.overbought ?? 70,
      params.oversold ?? 30,
      params.showBands !== false,
      params.rsiColor ?? '#4C84FF',
      params.rsiMAColor ?? '#9094a6',
      params.overboughtColor ?? '#ef4444',
      params.oversoldColor ?? '#22c55e'
    );
    rsiDefinition.name = rsiName;
    
    // Register the new RSI indicator
    registerIndicator(rsiDefinition as any);
    
    // Create the new RSI indicator
    const newRsiIndicatorId = chart.createIndicator(rsiName, false); // false = separate pane
    
    // Get the new pane ID
    const newRsiPaneId = chart.getIndicators({ id: newRsiIndicatorId })?.[0]?.paneId;
    
    // Lock y-axis to 0–100
    if (newRsiPaneId) {
      try {
        chart.setPaneOptions(newRsiPaneId, { yAxis: { type: 'custom', min: 0, max: 100 } });
      } catch {}
    }
    
    console.log('✅ RSI updated successfully:', { newRsiIndicatorId, newRsiPaneId });
    return { newRsiIndicatorId, newRsiPaneId };
    
  } catch (e) {
    console.error('❌ RSI update failed:', e);
    return { newRsiIndicatorId: null, newRsiPaneId: null };
  }
}

/**
 * Add EMA indicator (overlay on candle pane) using string signature
 */
export function addEMA(chart: any, { length, color, source = 'close' }:
  { length: number; color: string; source?: 'close'|'hlc3'|'ohlc4' }) {
  console.log('🔧 Adding EMA:', { length, color, source });
  
  try {
    // Create a unique indicator name for this specific EMA configuration
    const indicatorName = `TRADEEON_EMA_${length}_${source}_${color.replace('#', '')}`;
    
    // Create and register a new indicator definition for these specific parameters
    const emaDefinition = createEMAIndicatorDefinition(Number(length), source, color);
    emaDefinition.name = indicatorName; // Override the name to be unique
    
    // Register this specific indicator
    registerIndicator(emaDefinition as any);
    
    // Now create the indicator using the registered name
    const id = chart.createIndicator(indicatorName, true, {
      id: 'candle_pane'
    });
    
    console.log('✅ EMA created:', { id, length, color });
    return id ?? null;
  } catch (error) {
    console.error('❌ Error creating dynamic EMA:', error);
    return null;
  }
}

/**
 * Update EMA indicator using id-based override
 */
export function updateEMA(chart: any, id: string, opts: { length: number; color: string; source: 'close'|'hlc3'|'ohlc4' }) {
  console.log('🔄 Updating TRADEEON_EMA:', { id, opts });
  
  const updateParams = {
    id,
    calcParams: [Number(opts.length), opts.source],
    styles: { 
      lines: [{ color: opts.color, size: 1.8 }],
      ema: { color: opts.color }  // Try both style formats
    },
  };
  console.log('🔄 Override params:', updateParams);
  
  try {
    chart.overrideIndicator(updateParams);
    console.log('✅ EMA updated successfully');
    return true;
  } catch (error) {
    console.error('❌ Error updating EMA:', error);
    return false;
  }
}

/**
 * Remove legacy built-in EMA indicators (cleanup after init)
 */
export function removeLegacyEMA(chart: any) {
  (chart.getIndicators?.() ?? []).forEach((ind: any) => {
    if (ind?.name === 'EMA') chart.removeIndicator?.({ id: ind.id })
  })
}


