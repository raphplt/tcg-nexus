import axios from "axios";
import { NEXT_PUBLIC_API_URL } from "./variables";

const API_BASE_URL =
  NEXT_PUBLIC_API_URL ||
  (process.env.NODE_ENV === "production" ? "/api" : "http://localhost:3001");

export const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    "Content-Type": "application/json",
  },
});

export default api;

export const secureApi = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    "Content-Type": "application/json",
  },
  withCredentials: true,
});

/**
 * Fonction fetcher générique pour Tanstack Query (compatible avec axios et sécurisée)
 * @param url L'URL relative de l'API (ex: /tournaments)
 * @param config Config axios optionnelle (params, headers...)
 * @returns Les données de la réponse (response.data)
 * @throws L'erreur axios si la requête échoue
 *
 * Utilisation :
 * const { data } = useQuery({ queryKey: ['tournaments'], queryFn: () => fetcher('/tournaments') })
 */
export async function fetcher<T = unknown>(
  url: string,
  config?: Record<string, unknown>,
): Promise<T> {
  const response = await secureApi.get<T>(url, {
    ...config,
    withCredentials: true,
  });
  return response.data;
}

/**
 * Fonction de fetch générique authentifiée pour tous les verbes HTTP
 * @param method Le verbe HTTP (GET, POST, PATCH, DELETE, etc.)
 * @param url L'URL relative de l'API (ex: /tournaments)
 * @param options Options de requête : { data, params, headers, ... }
 * @returns Les données de la réponse (response.data)
 * @throws L'erreur axios si la requête échoue
 *
 * Utilisation :
 * await authedFetch('POST', '/tournaments', { data: { ... } })
 */
export async function authedFetch<T = unknown>(
  method: "GET" | "POST" | "PUT" | "PATCH" | "DELETE",
  url: string,
  options: {
    data?: unknown;
    params?: Record<string, unknown>;
    headers?: Record<string, string>;
    [key: string]: unknown;
  } = {},
): Promise<T> {
  const config = {
    method,
    url,
    ...options,
    withCredentials: true,
  };
  const response = await secureApi.request<T>(config);
  return response.data;
}
