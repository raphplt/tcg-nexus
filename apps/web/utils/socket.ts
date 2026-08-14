import { API_BASE_URL } from "@/utils/fetch";

/**
 * Base URL used to open socket.io connections.
 *
 * `API_BASE_URL` targets the REST API, which lives behind the `/api` global
 * prefix. socket.io derives the namespace from the URL pathname, so keeping
 * that prefix would make the client ask for `/api/match` while the gateway
 * serves `/match` — the handshake is then rejected with "Invalid namespace".
 * The prefix is therefore stripped here, once, for every gateway.
 *
 * @returns The origin to pass to `io()`, or an empty string during SSR.
 */
export function getSocketBaseUrl(): string {
  const rawBaseUrl = API_BASE_URL.startsWith("http")
    ? API_BASE_URL
    : typeof window === "undefined"
      ? ""
      : new URL(API_BASE_URL, window.location.origin).toString();

  if (!rawBaseUrl) {
    return "";
  }

  try {
    const parsed = new URL(rawBaseUrl);
    const cleanedPath = parsed.pathname.replace(/\/?api\/?$/, "");
    return `${parsed.origin}${cleanedPath}`.replace(/\/$/, "");
  } catch {
    return rawBaseUrl.replace(/\/?api\/?$/, "").replace(/\/$/, "");
  }
}
