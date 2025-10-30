import React, { useState, useEffect } from 'react'
import { useForm, useFieldArray } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Button } from '../ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../ui/dialog'
import { Input } from '../ui/input'
import { Label } from '../ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select'
import { Plus, X, Trash2 } from 'lucide-react'
import { useAlertsStore } from '../../state/alertsStore'
import type { Condition, Action } from '../../lib/api/alertsApi'
import IndicatorSelectors from './IndicatorSelectors'
import { getIndicator } from '../../lib/indicators/catalog'
import { addHorizontalLine, removeOverlay, clearOverlays } from '../../lib/chart/overlay'

const conditionSchema = z.object({
  id: z.string(),
  type: z.enum(['indicator', 'price', 'volume']),
  indicator: z.string().optional(),
  component: z.string().optional(),
  operator: z.enum(['>', '<', '>=', '<=', 'equals', 'crosses_above', 'crosses_below']),
  compareWith: z.enum(['value', 'indicator_component', 'price']),
  compareValue: z.number().optional(),
  timeframe: z.string().default('same'),
  settings: z.record(z.any()).optional()
})

const actionSchema = z.discriminatedUnion('type', [
  z.object({ type: z.literal('notify') }),
  z.object({ type: z.literal('webhook'), url: z.string().url() })
])

const alertSchema = z.object({
  symbol: z.string().min(1, 'Symbol is required'),
  base_timeframe: z.string().min(1, 'Timeframe is required'),
  conditions: z.array(conditionSchema).min(1, 'At least one condition is required'),
  logic: z.enum(['AND', 'OR']).default('AND'),
  action: actionSchema,
  status: z.enum(['active', 'paused']).default('active'),
  fireMode: z.enum(['per_bar', 'per_close', 'per_tick']).default('per_bar')
})

type AlertFormData = z.infer<typeof alertSchema>

interface AlertBuilderProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  defaultSymbol?: string
  defaultTimeframe?: string
  prefillIndicator?: string
  prefillComponent?: string
}

export default function AlertBuilder({ open, onOpenChange, defaultSymbol = 'BTCUSDT', defaultTimeframe = '1h', prefillIndicator, prefillComponent }: AlertBuilderProps) {
  const { addAlert, loading, error } = useAlertsStore()
  const [selectedConditionType, setSelectedConditionType] = useState<'indicator' | 'price' | 'volume'>('indicator')

  const { control, register, handleSubmit, watch, setValue, reset, formState: { errors } } = useForm<AlertFormData>({
    resolver: zodResolver(alertSchema),
    defaultValues: {
      symbol: defaultSymbol,
      base_timeframe: defaultTimeframe,
      conditions: [{
        id: crypto.randomUUID(),
        type: 'indicator',
        indicator: prefillIndicator || 'RSI',
        component: prefillComponent || 'RSI',
        operator: 'crosses_below',
        compareWith: 'value',
        compareValue: 30,
        timeframe: 'same',
        settings: { length: 14 }
      }],
      logic: 'AND',
      action: { type: 'notify' },
      status: 'active'
    }
  })

  const { fields, append, remove } = useFieldArray({
    control,
    name: 'conditions'
  })

  const watchedConditions = watch('conditions')
  const watchedAction = watch('action')

  // Preview overlay effect
  useEffect(() => {
    if (!open) {
      clearOverlays()
      return
    }

    // build previews for simple value comparisons
    const subs: string[] = []
    ;(fields || []).forEach((f, idx) => {
      const prefix = `conditions.${idx}` as const
      const cw = watch(`${prefix}.compareWith` as any)
      if (cw !== "value") return

      const indKey = watch(`${prefix}.indicator` as any) as string | undefined
      const comp = watch(`${prefix}.component` as any) as string | undefined
      const val = watch(`${prefix}.compareValue` as any) as number | undefined

      if (indKey && typeof val === "number") {
        const meta = getIndicator(indKey)
        const pane = meta?.pane ?? "indicator"
        const id = `preview-${f.id}`
        addHorizontalLine({ id, pane, y: val, label: `${indKey} = ${val}` })
        subs.push(id)
      }
    })

    return () => { subs.forEach(removeOverlay) }
  }, [fields, watch, open])

  // Clear overlays when dialog closes
  useEffect(() => {
    if (!open) {
      clearOverlays()
    }
  }, [open])

  const onSubmit = async (data: AlertFormData) => {
    console.log('Form submitted with data:', data)
    try {
      // Create alert object for localStorage
      const alertData = {
        id: `alert_${Date.now()}`,
        symbol: data.symbol,
        base_timeframe: data.base_timeframe,
        conditions: data.conditions,
        logic: data.logic,
        action: data.action,
        status: 'active',
        created_at: new Date().toISOString(),
        last_triggered_at: null,
        message: generateAlertMessage(data)
      }

      // Store in localStorage for persistence
      const existingAlerts = JSON.parse(localStorage.getItem('complex_alerts') || '[]')
      existingAlerts.push(alertData)
      localStorage.setItem('complex_alerts', JSON.stringify(existingAlerts))
      
      console.log('Alert created successfully')
      reset()
      onOpenChange(false)
      // Show success message
      alert('Alert created successfully!')
    } catch (error) {
      console.error('Failed to create alert:', error)
      // Show detailed error to user
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      alert(`Failed to create alert: ${errorMessage}`)
    }
  }

  const generateAlertMessage = (data: AlertFormData) => {
    const conditionCount = data.conditions.length
    const logicText = data.logic === 'AND' ? 'all' : 'any'
    return `Alert for ${data.symbol}: ${conditionCount} condition(s) (${logicText} must be true) on ${data.base_timeframe} timeframe`
  }

  const addCondition = () => {
    append({
      id: crypto.randomUUID(),
      type: selectedConditionType,
      indicator: selectedConditionType === 'indicator' ? 'RSI' : undefined,
      component: selectedConditionType === 'indicator' ? 'RSI' : undefined,
      operator: 'crosses_below',
      compareWith: 'value',
      compareValue: selectedConditionType === 'indicator' ? 30 : undefined,
      timeframe: 'same',
      settings: selectedConditionType === 'indicator' ? { length: 14 } : undefined
    })
  }

  const getOperatorOptions = (type: string) => {
    switch (type) {
      case 'indicator':
        return [
          { value: 'crosses_above', label: 'crosses above' },
          { value: 'crosses_below', label: 'crosses below' },
          { value: '>', label: 'is greater than' },
          { value: '<', label: 'is less than' },
          { value: '>=', label: 'is greater than or equal to' },
          { value: '<=', label: 'is less than or equal to' },
          { value: 'equals', label: 'equals' }
        ]
      case 'price':
        return [
          { value: '>', label: 'is above' },
          { value: '<', label: 'is below' },
          { value: '>=', label: 'is above or equal to' },
          { value: '<=', label: 'is below or equal to' },
          { value: 'equals', label: 'equals' }
        ]
      case 'volume':
        return [
          { value: '>', label: 'is greater than' },
          { value: '<', label: 'is less than' },
          { value: '>=', label: 'is greater than or equal to' },
          { value: '<=', label: 'is less than or equal to' },
          { value: 'equals', label: 'equals' }
        ]
      default:
        return []
    }
  }


  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto bg-white shadow-2xl">
        <DialogHeader>
          <DialogTitle>Create Alert</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          {/* Basic Settings */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="symbol">Symbol</Label>
              <Input
                id="symbol"
                {...register('symbol')}
                placeholder="BTCUSDT"
              />
              {errors.symbol && <p className="text-sm text-red-500 mt-1">{errors.symbol.message}</p>}
            </div>
            <div>
              <Label htmlFor="base_timeframe">Timeframe</Label>
              <Select
                value={watch('base_timeframe')}
                onValueChange={(value) => setValue('base_timeframe', value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select timeframe" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1m">1 Minute</SelectItem>
                  <SelectItem value="5m">5 Minutes</SelectItem>
                  <SelectItem value="15m">15 Minutes</SelectItem>
                  <SelectItem value="1h">1 Hour</SelectItem>
                  <SelectItem value="4h">4 Hours</SelectItem>
                  <SelectItem value="1d">1 Day</SelectItem>
                </SelectContent>
              </Select>
              {errors.base_timeframe && <p className="text-sm text-red-500 mt-1">{errors.base_timeframe.message}</p>}
            </div>
          </div>

          {/* Conditions */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <Label className="text-base font-medium">Conditions</Label>
              <div className="flex gap-2">
                <Select
                  value={selectedConditionType}
                  onValueChange={(value: 'indicator' | 'price' | 'volume') => setSelectedConditionType(value)}
                >
                  <SelectTrigger className="w-32">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="indicator">Indicator</SelectItem>
                    <SelectItem value="price">Price</SelectItem>
                    <SelectItem value="volume">Volume</SelectItem>
                  </SelectContent>
                </Select>
                <Button type="button" variant="outline" size="sm" onClick={addCondition}>
                  <Plus className="w-4 h-4 mr-1" />
                  Add
                </Button>
              </div>
            </div>

            <div className="space-y-4">
              {fields.map((field, index) => {
                const condition = watchedConditions[index]
                return (
                  <div key={field.id} className="p-4 border rounded-lg bg-gray-50">
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-sm font-medium">Condition {index + 1}</span>
                      {fields.length > 1 && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => remove(index)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      )}
                    </div>

                    <div className="space-y-4">
                      {/* Indicator/Component/Settings Selection */}
                      {condition.type === 'indicator' && (
                        <IndicatorSelectors
                          indicator={watch(`conditions.${index}.indicator` as any)}
                          component={watch(`conditions.${index}.component` as any)}
                          settings={watch(`conditions.${index}.settings` as any)}
                          onChange={(next) => {
                            setValue(`conditions.${index}.indicator` as any, next.indicator);
                            setValue(`conditions.${index}.component` as any, next.component);
                            setValue(`conditions.${index}.settings` as any, next.settings);
                          }}
                        />
                      )}

                      {/* Operator Selection */}
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <Label>Operator</Label>
                          <Select
                            value={condition.operator || ''}
                            onValueChange={(value) => setValue(`conditions.${index}.operator`, value as any)}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Select operator" />
                            </SelectTrigger>
                            <SelectContent>
                              {getOperatorOptions(condition.type).map(option => (
                                <SelectItem key={option.value} value={option.value}>
                                  {option.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>

                        <div>
                          <Label>Timeframe</Label>
                          <Select
                            value={condition.timeframe || 'same'}
                            onValueChange={(value) => setValue(`conditions.${index}.timeframe`, value)}
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="same">Same as alert</SelectItem>
                              <SelectItem value="1m">1 Minute</SelectItem>
                              <SelectItem value="3m">3 Minutes</SelectItem>
                              <SelectItem value="5m">5 Minutes</SelectItem>
                              <SelectItem value="15m">15 Minutes</SelectItem>
                              <SelectItem value="1h">1 Hour</SelectItem>
                              <SelectItem value="4h">4 Hours</SelectItem>
                              <SelectItem value="1d">1 Day</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>

                      {/* Compare With Selection */}
                      <div>
                        <Label>Compare With</Label>
                        <Select
                          value={condition.compareWith || 'value'}
                          onValueChange={(value) => setValue(`conditions.${index}.compareWith`, value as any)}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select comparison" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="value">Fixed Value</SelectItem>
                            <SelectItem value="indicator_component">Another Indicator</SelectItem>
                            <SelectItem value="price">Price</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      {/* Comparison Value or RHS Indicator */}
                      {condition.compareWith === 'value' && (
                        <div>
                          <Label>Value</Label>
                          <Input
                            type="number"
                            step="0.01"
                            {...register(`conditions.${index}.compareValue`, { valueAsNumber: true })}
                            placeholder="30"
                          />
                        </div>
                      )}

                      {condition.compareWith === 'indicator_component' && (
                        <div className="rounded-lg border p-2 space-y-2 bg-muted/30">
                          <Label>Compare Indicator (RHS)</Label>
                          <IndicatorSelectors
                            indicator={watch(`conditions.${index}.rhs.indicator` as any)}
                            component={watch(`conditions.${index}.rhs.component` as any)}
                            settings={watch(`conditions.${index}.rhs.settings` as any)}
                            onChange={(next) => {
                              setValue(`conditions.${index}.rhs.indicator` as any, next.indicator);
                              setValue(`conditions.${index}.rhs.component` as any, next.component);
                              setValue(`conditions.${index}.rhs.settings` as any, next.settings);
                            }}
                          />
                        </div>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
            {errors.conditions && <p className="text-sm text-red-500 mt-1">{errors.conditions.message}</p>}
          </div>

          {/* Logic */}
          <div>
            <Label>Logic</Label>
            <Select
              value={watch('logic')}
              onValueChange={(value: 'AND' | 'OR') => setValue('logic', value)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="AND">All conditions must be true (AND)</SelectItem>
                <SelectItem value="OR">Any condition can be true (OR)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Fire Mode */}
          <div>
            <Label>Fire Mode</Label>
            <Select
              value={watch('fireMode')}
              onValueChange={(value: 'per_bar' | 'per_close' | 'per_tick') => setValue('fireMode', value)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="per_bar">Once per bar (default)</SelectItem>
                <SelectItem value="per_close">Once per close</SelectItem>
                <SelectItem value="per_tick">Once per tick</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-sm text-gray-600 mt-1">
              Controls how often the alert can fire within the same time period
            </p>
          </div>

          {/* Action */}
          <div>
            <Label>Action</Label>
            <Select
              value={watchedAction.type}
              onValueChange={(value: 'notify' | 'webhook') => {
                if (value === 'notify') {
                  setValue('action', { type: 'notify' })
                } else {
                  setValue('action', { type: 'webhook', url: '' })
                }
              }}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="notify">Send notification</SelectItem>
                <SelectItem value="webhook">Send webhook</SelectItem>
              </SelectContent>
            </Select>

            {watchedAction.type === 'webhook' && (
              <div className="mt-3">
                <Label htmlFor="webhook-url">Webhook URL</Label>
                <Input
                  id="webhook-url"
                  type="url"
                  placeholder="https://api.example.com/webhook"
                  {...register('action.url')}
                />
                {errors.action && 'url' in errors.action && (
                  <p className="text-sm text-red-500 mt-1">{errors.action.url?.message}</p>
                )}
              </div>
            )}
          </div>

          {/* Error Display */}
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-sm text-red-600">{error}</p>
            </div>
          )}

          {/* Submit Button */}
          <div className="flex justify-end gap-3">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? 'Creating...' : 'Create Alert'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
