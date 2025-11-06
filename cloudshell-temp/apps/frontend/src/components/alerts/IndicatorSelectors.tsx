import * as React from "react";
import { listIndicators, getIndicator, CatalogItem, SettingSpec } from "../../lib/indicators/catalog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { Switch } from "../ui/switch";

type IndicatorSelectorsProps = {
  indicator?: string;
  component?: string;
  settings?: Record<string, any>;
  onChange: (next: { indicator?: string; component?: string; settings?: Record<string, any> }) => void;
};

export default function IndicatorSelectors({ indicator, component, settings, onChange }: IndicatorSelectorsProps) {
  const indicators = React.useMemo(() => listIndicators(), []);
  const selected = getIndicator(indicator);

  function update(partial: Partial<{ indicator: string; component: string; settings: Record<string, any> }>) {
    onChange({ indicator, component, settings, ...partial });
  }

  return (
    <div className="space-y-2">
      <div className="grid grid-cols-3 gap-2">
        <div>
          <Label>Indicator</Label>
          <Select value={indicator} onValueChange={(v) => {
            const next = getIndicator(v);
            // reset component & settings to defaults for this indicator
            update({ indicator: v, component: next?.components?.[0], settings: next?.defaults || {} });
          }}>
            <SelectTrigger><SelectValue placeholder="Select indicator" /></SelectTrigger>
            <SelectContent>
              {indicators.map(i => <SelectItem key={i.key} value={i.key}>{i.label}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label>Component</Label>
          <Select value={component} onValueChange={(v) => update({ component: v })} disabled={!selected}>
            <SelectTrigger><SelectValue placeholder="Select component" /></SelectTrigger>
            <SelectContent>
              {(selected?.components || []).map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label>Pane</Label>
          <div className="h-10 flex items-center text-sm px-2 rounded-md border bg-muted/20">
            {selected?.pane || "—"}
          </div>
        </div>
      </div>

      {/* Settings */}
      {!!selected?.settings?.length && (
        <div className="grid grid-cols-3 gap-2">
          {selected.settings.map((spec) => (
            <SettingField
              key={spec.key}
              spec={spec}
              value={settings?.[spec.key] ?? selected.defaults?.[spec.key]}
              onChange={(val) => update({ settings: { ...(settings || {}), [spec.key]: val } })}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function SettingField({
  spec, value, onChange
}: { spec: SettingSpec; value: any; onChange: (v: any) => void }) {
  if (spec.type === "number") {
    return (
      <div>
        <Label>{spec.key}</Label>
        <Input
          type="number"
          step={spec.step ?? 1}
          min={spec.min}
          max={spec.max}
          value={value ?? ""}
          onChange={(e) => onChange(e.target.value === "" ? undefined : Number(e.target.value))}
        />
      </div>
    );
  }
  if (spec.type === "select") {
    return (
      <div>
        <Label>{spec.key}</Label>
        <Select value={value} onValueChange={(v) => onChange(v)}>
          <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
          <SelectContent>
            {spec.options.map(opt => <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>
    );
  }
  if (spec.type === "boolean") {
    return (
      <div className="flex items-center gap-2">
        <Switch checked={!!value} onCheckedChange={onChange} />
        <Label>{spec.key}</Label>
      </div>
    );
  }
  return null;
}



