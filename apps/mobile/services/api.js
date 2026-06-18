import axios from "axios";
import Constants from "expo-constants";
import { Platform } from "react-native";

const getDefaultApiUrl = () =>
  Platform.OS === "android"
    ? "http://10.0.2.2:3001/api"
    : "http://localhost:3001/api";

const extraApiUrl =
  typeof Constants.expoConfig?.extra?.apiUrl === "string"
    ? Constants.expoConfig.extra.apiUrl.trim()
    : "";

const configApiUrl =
  extraApiUrl && extraApiUrl !== "http://localhost:3001/api" ? extraApiUrl : "";

const API_URL =
  process.env.EXPO_PUBLIC_API_URL?.trim() || configApiUrl || getDefaultApiUrl();
export const api = axios.create({
  baseURL: API_URL,
  timeout: 10000,
  headers: {
    "Content-Type": "application/json",
  },
});
