import axios, {
  AxiosError,
  type AxiosRequestConfig,
  type InternalAxiosRequestConfig,
} from "axios";
import Constants from "expo-constants";
import { Platform } from "react-native";
import { toast } from "@/store/useToastStore";
import { getApiErrorMessage } from "@/utils/apiError";

export interface AppAxiosRequestConfig<D = unknown>
  extends AxiosRequestConfig<D> {
  _retry?: boolean;
  _netRetry?: boolean;
  skipAuth?: boolean;
  skipErrorToast?: boolean;
}

export interface AppInternalAxiosRequestConfig<D = unknown>
  extends InternalAxiosRequestConfig<D> {
  _retry?: boolean;
  _netRetry?: boolean;
  skipAuth?: boolean;
  skipErrorToast?: boolean;
}

export const isRetriableNetworkError = (error: AxiosError): boolean =>
  error.code === "ERR_NETWORK" && !error.response;

export const wait = (ms: number): Promise<void> =>
  new Promise((resolve) => setTimeout(resolve, ms));

const getDefaultApiUrl = (): string =>
  Platform.OS === "android"
    ? "http://10.0.2.2:3001/api"
    : "http://localhost:3001/api";

const extraApiUrl =
  typeof Constants.expoConfig?.extra?.apiUrl === "string"
    ? Constants.expoConfig.extra.apiUrl.trim()
    : "";

const configApiUrl =
  extraApiUrl && extraApiUrl !== "http://localhost:3001/api" ? extraApiUrl : "";

export const API_URL =
  process.env.EXPO_PUBLIC_API_URL?.trim() || configApiUrl || getDefaultApiUrl();

export const api = axios.create({
  baseURL: API_URL,
  headers: {
    "Content-Type": "application/json",
  },
  timeout: 10000,
});

export const notifyApiError = (error: unknown): void => {
  if (axios.isAxiosError(error)) {
    const requestConfig = error.config as AppAxiosRequestConfig | undefined;
    if (requestConfig?.skipErrorToast || error.code === "ERR_CANCELED") {
      return;
    }
  }

  toast.showError(getApiErrorMessage(error));
};

api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const config = error.config as AppInternalAxiosRequestConfig | undefined;
    if (config && !config._netRetry && isRetriableNetworkError(error)) {
      config._netRetry = true;
      await wait(400);
      return api(config);
    }

    notifyApiError(error);
    return Promise.reject(error);
  },
);
