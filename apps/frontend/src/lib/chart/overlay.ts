// Minimal, framework-agnostic overlay helper. Adapt to your canvas chart API.

type LineSpec = { id: string; pane: "price" | "indicator"; y: number; label?: string };

let lines = new Map<string, LineSpec>();

export function addHorizontalLine(spec: LineSpec) {
  lines.set(spec.id, spec);
  // TODO: integrate with your chart: draw line in the correct pane
  // e.g., chart.addOverlayLine(spec)
  console.log('Adding overlay line:', spec);
}

export function removeOverlay(id: string) {
  lines.delete(id);
  // chart.removeOverlayLine(id)
  console.log('Removing overlay line:', id);
}

export function clearOverlays() {
  lines.clear();
  // chart.clearOverlayLines()
  console.log('Clearing all overlay lines');
}

export function getOverlayLines(): LineSpec[] {
  return Array.from(lines.values());
}



