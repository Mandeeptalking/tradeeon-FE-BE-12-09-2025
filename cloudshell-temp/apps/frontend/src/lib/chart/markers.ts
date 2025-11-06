// simple runtime marker registry; integrate with your chart library
export type Marker = {
  id: string;
  symbol: string;
  timeframe: string;
  time: string;      // ISO or epoch
  type: "alert";
  color?: string;
  label?: string;
};

const markers = new Map<string, Marker>();

export function addMarker(m: Marker) {
  markers.set(m.id, m);
  // TODO: chartAPI.addMarker(m)
  console.log('Adding marker:', m);
}

export function removeMarker(id: string) {
  markers.delete(id);
  // TODO: chartAPI.removeMarker(id)
  console.log('Removing marker:', id);
}

export function clearMarkers() {
  markers.clear();
  // TODO: chartAPI.clearMarkers()
  console.log('Clearing all markers');
}

export function getMarkers() {
  return Array.from(markers.values());
}



