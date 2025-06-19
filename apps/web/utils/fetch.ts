import axios from "axios";
import { NEXT_PUBLIC_API_URL } from "./variables";

const API_BASE_URL = NEXT_PUBLIC_API_URL || "http://localhost:3001";

export const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    "Content-Type": "application/json",
  },
});

export default api;
