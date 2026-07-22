/* Minimal Maps JS types for autocomplete and tracking map display. */
export type GoogleMap = { fitBounds: (b: GoogleLatLngBounds, padding?: number) => void };
export type GoogleLatLngBounds = { extend: (p: { lat: number; lng: number }) => void };
export type GoogleMarker = {
  setPosition: (p: { lat: number; lng: number }) => void;
  setVisible: (v: boolean) => void;
};

declare global {
  interface Window {
    gm_authFailure?: () => void;
    google?: {
      maps: {
        Map: new (el: HTMLElement, opts: object) => GoogleMap;
        Marker: new (opts: object) => GoogleMarker;
        LatLngBounds: new () => GoogleLatLngBounds;
        Polyline: new (opts: object) => void;
        SymbolPath: { CIRCLE: number };
        places: {
          Autocomplete: new (
            input: HTMLInputElement,
            opts?: object,
          ) => {
            addListener: (event: string, handler: () => void) => void;
            getPlace: () => {
              formatted_address?: string;
              geometry?: { location: { lat: () => number; lng: () => number } };
              address_components?: Array<{ long_name: string; types: string[] }>;
            };
          };
        };
      };
    };
  }
}

let mapsScriptPromise: Promise<void> | null = null;

export function resetGoogleMapsScript(): void {
  mapsScriptPromise = null;
}

/** Load Maps JavaScript API (Places library included for address autocomplete). */
export function loadGoogleMaps(apiKey: string): Promise<void> {
  if (typeof window === "undefined") return Promise.resolve();
  if (window.google?.maps) return Promise.resolve();
  if (mapsScriptPromise) return mapsScriptPromise;

  mapsScriptPromise = new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places`;
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => {
      resetGoogleMapsScript();
      reject(new Error("Google Maps failed to load"));
    };
    document.head.appendChild(script);
  });

  return mapsScriptPromise;
}

export function mapsReferrerHelp(): string {
  const current =
    typeof window === "undefined" ? "http://localhost:3000/*" : `${window.location.origin}/*`;
  return [
    "Google Maps blocked this page (RefererNotAllowedMapError).",
    "Add this HTTP referrer in Google Cloud Console → Credentials → your API key:",
    current,
    "Also add http://127.0.0.1:3000/* if you use 127.0.0.1.",
    "Allow Maps JavaScript API, Places API, and Routes API.",
  ].join(" ");
}
