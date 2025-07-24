import axios from "axios";
import { NEXT_PUBLIC_API_URL } from "./variables";
import Cookies from "js-cookie";

const API_BASE_URL = NEXT_PUBLIC_API_URL || "http://localhost:3001";

export const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    "Content-Type": "application/json",
  },
});

export default api;

// Instance axios sécurisée (ajoute le token si présent)
export const secureApi = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    "Content-Type": "application/json",
  },
});

secureApi.interceptors.request.use((config) => {
  const token = Cookies.get("accessToken");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
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
export async function fetcher<T = any>(url: string, config?: any): Promise<T> {
  const response = await secureApi.get<T>(url, config);
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
export async function authedFetch<T = any>(
  method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE',
  url: string,
  options: {
    data?: any;
    params?: any;
    headers?: any;
    [key: string]: any;
  } = {}
): Promise<T> {
  const config = {
    method,
    url,
    ...options,
  };
  const response = await secureApi.request<T>(config);
  return response.data;
}
