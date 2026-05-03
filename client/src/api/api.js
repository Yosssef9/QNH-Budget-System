import axios from "axios";
import { getToken } from "../helpers/getToken";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

console.log("Axios baseURL:", API_BASE_URL);

if (!API_BASE_URL) {
  console.error("❌ VITE_API_BASE_URL is missing. Check .env and restart Vite");
}

const api = axios.create({
  baseURL: API_BASE_URL,
});

api.interceptors.request.use((config) => {
  const token = getToken();

  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  return config;
});

export default api;
