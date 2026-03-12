import axios from "axios";
import { useAuth } from "@clerk/expo";
import { useCallback } from "react";

const API_URL = "http://10.46.162.78:5000/api";

const api = axios.create({
  baseURL: API_URL,
  headers: { "Content-Type": "application/json" },
});

// Response interceptor (registered once)
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response) {
      console.error(
        `API Error: ${error.config?.method?.toUpperCase()} ${error.config?.url}`,
        {
          status: error.response.status,
          data: error.response.data,
        }
      );
    } else if (error.request) {
      console.warn("API request sent but no response received", {
        endpoint: error.config?.url,
        method: error.config?.method,
      });
    } else {
      console.error("API request setup error:", error.message);
    }

    return Promise.reject(error);
  }
);

export const useApi = () => {
  const { getToken } = useAuth();

  const apiWithAuth = useCallback(
    async <T = any>(config: Parameters<typeof api.request>[0]) => {
      const token = await getToken();

      return api.request<T>({
        ...config,
        headers: {
          ...config.headers,
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      });
    },
    [getToken]
  );

  return { api, apiWithAuth };
};