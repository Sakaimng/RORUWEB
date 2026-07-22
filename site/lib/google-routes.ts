export type LatLngPoint = { lat: number; lng: number };

/** Decode an encoded polyline from the Routes API. */
export function decodePolyline(encoded: string): LatLngPoint[] {
  const points: LatLngPoint[] = [];
  let index = 0;
  let lat = 0;
  let lng = 0;

  while (index < encoded.length) {
    let shift = 0;
    let result = 0;
    let byte: number;

    do {
      byte = encoded.charCodeAt(index++) - 63;
      result |= (byte & 0x1f) << shift;
      shift += 5;
    } while (byte >= 0x20);

    const dlat = (result & 1) !== 0 ? ~(result >> 1) : result >> 1;
    lat += dlat;

    shift = 0;
    result = 0;

    do {
      byte = encoded.charCodeAt(index++) - 63;
      result |= (byte & 0x1f) << shift;
      shift += 5;
    } while (byte >= 0x20);

    const dlng = (result & 1) !== 0 ? ~(result >> 1) : result >> 1;
    lng += dlng;

    points.push({ lat: lat / 1e5, lng: lng / 1e5 });
  }

  return points;
}

export function straightLinePath(from: LatLngPoint, to: LatLngPoint, segments = 24): LatLngPoint[] {
  const path: LatLngPoint[] = [];
  for (let i = 0; i <= segments; i += 1) {
    const t = i / segments;
    path.push({
      lat: from.lat + (to.lat - from.lat) * t,
      lng: from.lng + (to.lng - from.lng) * t,
    });
  }
  return path;
}

/** Fetch a driving route via our API proxy (Google Routes API). */
export async function fetchDrivingRoute(
  origin: LatLngPoint,
  destination: LatLngPoint,
): Promise<LatLngPoint[]> {
  try {
    const res = await fetch("/api/order/driving-route", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ origin, destination }),
    });
    if (!res.ok) return straightLinePath(origin, destination);
    const data = (await res.json()) as { encodedPolyline?: string };
    if (!data.encodedPolyline) return straightLinePath(origin, destination);
    const path = decodePolyline(data.encodedPolyline);
    return path.length > 1 ? path : straightLinePath(origin, destination);
  } catch {
    return straightLinePath(origin, destination);
  }
}
