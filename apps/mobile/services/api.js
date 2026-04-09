import axios from "axios";
const API_URL = process.env.EXPO_PUBLIC_API_URL ?? "http://localhost:3001/api";
export const api = axios.create({
  baseURL: API_URL,
  timeout: 10000,
  headers: {
    "Content-Type": "application/json",
  },
});
