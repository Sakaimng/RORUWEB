import { useEffect, useRef } from "react";
import { ORDER_INTEGRATIONS, RESTAURANT } from "@/lib/order-config";
import { fetchDrivingRoute, type LatLngPoint } from "@/lib/google-routes";
import { loadGoogleMaps, type GoogleMap, type GoogleMarker } from "@/lib/google-maps";
import type { DeliveryAddress } from "@/lib/order-types";
import type { DeliveryTrackingStage } from "@/lib/order-tracking";

type Props = {
  address: DeliveryAddress;
  stage: DeliveryTrackingStage;
};

function offsetPoint(lat: number, lng: number, dLat: number, dLng: number) {
  return { lat: lat + dLat, lng: lng + dLng };
}

export function OrderTrackingMap({ address, stage }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<GoogleMap | null>(null);
  const driverMarkerRef = useRef<GoogleMarker | null>(null);
  const pathRef = useRef<LatLngPoint[]>([]);
  const animRef = useRef<number | null>(null);
  const apiKey = ORDER_INTEGRATIONS.googleMapsApiKey;

  useEffect(() => {
    if (!apiKey || !containerRef.current) return;

    let cancelled = false;

    const restaurant = { lat: RESTAURANT.lat, lng: RESTAURANT.lng };
    const destination = { lat: address.lat, lng: address.lng };

    loadGoogleMaps(apiKey)
      .then(async () => {
        if (cancelled || !containerRef.current || !window.google?.maps) return;

        const maps = window.google.maps;

        const map = new maps.Map(containerRef.current, {
          disableDefaultUI: true,
          zoomControl: true,
          gestureHandling: "greedy",
        });
        mapRef.current = map;

        new maps.Marker({
          map,
          position: restaurant,
          title: RESTAURANT.name,
          icon: {
            path: maps.SymbolPath.CIRCLE,
            scale: 10,
            fillColor: "#121212",
            fillOpacity: 1,
            strokeWeight: 2,
            strokeColor: "#ffffff",
          },
          label: { text: "R", color: "#ffffff", fontWeight: "700" },
        });

        new maps.Marker({
          map,
          position: destination,
          title: "Delivery address",
          icon: {
            path: maps.SymbolPath.CIRCLE,
            scale: 9,
            fillColor: "#f54500",
            fillOpacity: 1,
            strokeWeight: 2,
            strokeColor: "#ffffff",
          },
        });

        const driverMarker = new maps.Marker({
          map,
          visible: false,
          title: "Driver",
          zIndex: 10,
          icon: {
            path: maps.SymbolPath.CIRCLE,
            scale: 8,
            fillColor: "#2563eb",
            fillOpacity: 1,
            strokeWeight: 2,
            strokeColor: "#ffffff",
          },
        });
        driverMarkerRef.current = driverMarker;

        const bounds = new maps.LatLngBounds();
        bounds.extend(restaurant);
        bounds.extend(destination);

        const path = await fetchDrivingRoute(restaurant, destination);
        if (cancelled) return;

        pathRef.current = path;

        new maps.Polyline({
          path,
          geodesic: true,
          strokeColor: "#121212",
          strokeOpacity: 0.88,
          strokeWeight: 4,
          map,
        });

        map.fitBounds(bounds, 56);
      })
      .catch(() => {
        /* Fallback schematic rendered when no API key */
      });

    return () => {
      cancelled = true;
      if (animRef.current != null) cancelAnimationFrame(animRef.current);
    };
  }, [address.lat, address.lng, apiKey]);

  useEffect(() => {
    const marker = driverMarkerRef.current;
    const path = pathRef.current;
    if (!marker) return;

    if (animRef.current != null) {
      cancelAnimationFrame(animRef.current);
      animRef.current = null;
    }

    if (stage === "preparing" || stage === "ready_for_pickup") {
      marker.setVisible(false);
      return;
    }

    const restaurant = { lat: RESTAURANT.lat, lng: RESTAURANT.lng };

    if (stage === "driver_approaching") {
      marker.setVisible(true);
      marker.setPosition(offsetPoint(restaurant.lat, restaurant.lng, -0.0018, -0.0014));
      return;
    }

    if (stage === "driver_picked_up") {
      marker.setVisible(true);
      marker.setPosition(restaurant);
      return;
    }

    if (stage === "on_the_way") {
      marker.setVisible(true);
      if (path.length < 2) {
        marker.setPosition(restaurant);
        return;
      }

      const start = performance.now();
      const duration = TRACKING_ON_THE_WAY_ANIM_MS;

      const tick = (now: number) => {
        const t = Math.min(1, (now - start) / duration);
        const index = Math.min(path.length - 1, Math.floor(t * (path.length - 1)));
        marker.setPosition(path[index]);
        if (t < 1) animRef.current = requestAnimationFrame(tick);
      };

      animRef.current = requestAnimationFrame(tick);
    }
  }, [stage]);

  if (!apiKey) {
    return <OrderTrackingMapFallback address={address} stage={stage} />;
  }

  return (
    <div className="order-tracking-map">
      <div ref={containerRef} className="order-tracking-map__canvas" aria-hidden />
      <div className="order-tracking-map__legend">
        <span className="order-tracking-map__legend-item">
          <span className="order-tracking-map__dot order-tracking-map__dot--restaurant" />
          {RESTAURANT.name}
        </span>
        <span className="order-tracking-map__legend-item">
          <span className="order-tracking-map__dot order-tracking-map__dot--destination" />
          Delivery
        </span>
      </div>
    </div>
  );
}

const TRACKING_ON_THE_WAY_ANIM_MS = 12_000;

function OrderTrackingMapFallback({
  address,
  stage,
}: {
  address: DeliveryAddress;
  stage: DeliveryTrackingStage;
}) {
  const showDriver =
    stage !== "preparing" &&
    stage !== "ready_for_pickup";
  const driverProgress =
    stage === "driver_approaching"
      ? 12
      : stage === "driver_picked_up"
        ? 22
        : stage === "on_the_way"
          ? 72
          : 0;

  return (
    <div className="order-tracking-map order-tracking-map--fallback">
      <div className="order-tracking-map__schematic" aria-hidden>
        <span className="order-tracking-map__pin order-tracking-map__pin--from">R</span>
        <span className="order-tracking-map__route-line" />
        {showDriver ? (
          <span
            className="order-tracking-map__pin order-tracking-map__pin--driver"
            style={{ left: `${driverProgress}%` }}
          />
        ) : null}
        <span className="order-tracking-map__pin order-tracking-map__pin--to" />
      </div>
      <p className="order-tracking-map__fallback-note">
        {RESTAURANT.name} → {address.line1 || address.formatted}
      </p>
    </div>
  );
}
