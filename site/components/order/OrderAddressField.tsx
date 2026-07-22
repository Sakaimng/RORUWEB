import { useEffect, useId, useRef, useState } from "react";
import { ORDER_INTEGRATIONS } from "@/lib/order-config";
import { loadGoogleMaps, mapsReferrerHelp, resetGoogleMapsScript } from "@/lib/google-maps";
import type { DeliveryAddress } from "@/lib/order-types";

type Props = {
  value: string;
  onChange: (value: string) => void;
  onSelect: (address: DeliveryAddress) => void;
  placeholder?: string;
  className?: string;
};

export function OrderAddressField({
  value,
  onChange,
  onSelect,
  placeholder = "Enter delivery address",
  className = "",
}: Props) {
  const fieldId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const suppressChangeRef = useRef(false);
  const onChangeRef = useRef(onChange);
  const onSelectRef = useRef(onSelect);
  const apiKey = ORDER_INTEGRATIONS.googleMapsApiKey;
  const [mapsNotice, setMapsNotice] = useState<string | null>(null);

  useEffect(() => {
    onChangeRef.current = onChange;
    onSelectRef.current = onSelect;
  });

  useEffect(() => {
    if (inputRef.current && inputRef.current.value !== value) {
      inputRef.current.value = value;
    }
  }, [value]);

  useEffect(() => {
    if (!apiKey) return;

    window.gm_authFailure = () => {
      resetGoogleMapsScript();
      setMapsNotice(mapsReferrerHelp());
    };

    return () => {
      delete window.gm_authFailure;
    };
  }, [apiKey]);

  useEffect(() => {
    if (!apiKey || !inputRef.current) return;

    let autocomplete: {
      addListener: (event: string, handler: () => void) => void;
      getPlace: () => {
        formatted_address?: string;
        geometry?: { location: { lat: () => number; lng: () => number } };
        address_components?: Array<{ long_name: string; types: string[] }>;
      };
    } | null = null;
    let cancelled = false;

    loadGoogleMaps(apiKey)
      .then(() => {
        if (cancelled || !inputRef.current || !window.google?.maps?.places) {
          if (!cancelled) setMapsNotice(mapsReferrerHelp());
          return;
        }

        setMapsNotice(null);
        autocomplete = new window.google.maps.places.Autocomplete(inputRef.current, {
          componentRestrictions: { country: "hk" },
          fields: ["formatted_address", "geometry", "address_components"],
        });

        autocomplete.addListener("place_changed", () => {
          const place = autocomplete?.getPlace();
          if (!place?.geometry?.location || !place.formatted_address) return;

          const line1 =
            place.address_components?.find((c) => c.types.includes("street_number"))
              ?.long_name ?? place.formatted_address.split(",")[0] ?? "";

          const selected = {
            formatted: place.formatted_address,
            line1,
            lat: place.geometry.location.lat(),
            lng: place.geometry.location.lng(),
          };

          suppressChangeRef.current = true;
          if (inputRef.current) {
            inputRef.current.value = place.formatted_address;
          }
          onSelectRef.current(selected);
          suppressChangeRef.current = false;
        });
      })
      .catch(() => {
        if (!cancelled) {
          setMapsNotice("Could not load Google Maps. You can still type an address manually.");
        }
      });

    return () => {
      cancelled = true;
      autocomplete = null;
    };
  }, [apiKey, fieldId]);

  return (
    <div className={className}>
      <input
        ref={inputRef}
        id={fieldId}
        type="text"
        defaultValue={value}
        onChange={(event) => {
          if (suppressChangeRef.current) return;
          onChangeRef.current(event.target.value);
        }}
        placeholder={placeholder}
        className="order-field"
        autoComplete="off"
      />
      {!apiKey ? (
        <p className="order-field-note">
          Add <code>NEXT_PUBLIC_GOOGLE_MAPS_API_KEY</code> for address autocomplete
          and distance-based delivery ETA.
        </p>
      ) : null}
      {mapsNotice ? <p className="order-field-note">{mapsNotice}</p> : null}
    </div>
  );
}
