"use client";

import Script from "next/script";

interface GoogleMapsScriptProps {
  onReady: () => void;
}

/**
 * Loads the Google Places SDK only on screens that use address autocomplete.
 *
 * @param props Component callbacks.
 * @returns A deferred Next.js script element, or null when no API key exists.
 */
export function GoogleMapsScript({ onReady }: GoogleMapsScriptProps) {
  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
  if (!apiKey) return null;

  return (
    <Script
      id="google-maps-places"
      src={`https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places&loading=async`}
      strategy="afterInteractive"
      onReady={onReady}
    />
  );
}
