import { NextResponse } from "next/server";

type RouteBody = {
  origin?: { lat?: number; lng?: number };
  destination?: { lat?: number; lng?: number };
};

export async function POST(request: Request) {
  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "Google Maps is not configured. Add NEXT_PUBLIC_GOOGLE_MAPS_API_KEY." },
      { status: 503 },
    );
  }

  let body: RouteBody;
  try {
    body = (await request.json()) as RouteBody;
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const originLat = Number(body.origin?.lat);
  const originLng = Number(body.origin?.lng);
  const destLat = Number(body.destination?.lat);
  const destLng = Number(body.destination?.lng);

  if (![originLat, originLng, destLat, destLng].every(Number.isFinite)) {
    return NextResponse.json({ error: "Invalid coordinates" }, { status: 400 });
  }

  try {
    const res = await fetch("https://routes.googleapis.com/directions/v2:computeRoutes", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Goog-Api-Key": apiKey,
        "X-Goog-FieldMask": "routes.polyline.encodedPolyline",
      },
      body: JSON.stringify({
        origin: {
          location: { latLng: { latitude: originLat, longitude: originLng } },
        },
        destination: {
          location: { latLng: { latitude: destLat, longitude: destLng } },
        },
        travelMode: "DRIVE",
        routingPreference: "TRAFFIC_UNAWARE",
      }),
    });

    if (!res.ok) {
      const detail = await res.text();
      return NextResponse.json(
        { error: detail || "Routes API request failed" },
        { status: res.status },
      );
    }

    const data = (await res.json()) as {
      routes?: Array<{ polyline?: { encodedPolyline?: string } }>;
    };
    const encodedPolyline = data.routes?.[0]?.polyline?.encodedPolyline;
    if (!encodedPolyline) {
      return NextResponse.json({ error: "No route found" }, { status: 404 });
    }

    return NextResponse.json({ encodedPolyline });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Routes API error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
