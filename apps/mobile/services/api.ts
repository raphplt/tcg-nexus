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
  skipAuth?: boolean;
  skipErrorToast?: boolean;
}

export interface AppInternalAxiosRequestConfig<D = unknown>
  extends InternalAxiosRequestConfig<D> {
  _retry?: boolean;
  skipAuth?: boolean;
  skipErrorToast?: boolean;
}

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
    notifyApiError(error);
    return Promise.reject(error);
  },
);
