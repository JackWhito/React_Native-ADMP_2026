import axios from "axios";
import { useAuth } from "@clerk/expo";
import { useCallback } from "react";

const DEFAULT_API_URL = "http://192.168.1.11:5000/api";

type ApiClientOptions = {
  baseURL?: string;
  timeout?: number;
};

const normalizeRequestUrl = (url?: string) => {
  if (!url) return url;
  const value = String(url).trim();
  if (!value) return value;
  if (/^https?:\/\//i.test(value)) return value;
  // Keep requests under the configured "/api" base path.
  return value.replace(/^\/+/, "");
};

const normalizeBaseUrl = (url?: string) => {
  if (!url) return undefined;
  const trimmed = String(url).trim().replace(/^['"]+|['"]+$/g, "");
  if (!trimmed) return undefined;
  if (!/^https?:\/\//i.test(trimmed)) return undefined;
  return trimmed.replace(/\/+$/, "");
};

const ensureApiPath = (url?: string) => {
  const normalized = normalizeBaseUrl(url);
  if (!normalized) return undefined;
  return /\/api$/i.test(normalized) ? normalized : `${normalized}/api`;
};

const resolveBaseUrl = (overrideBaseUrl?: string) => {
  const envBaseUrl =
    process.env.EXPO_PUBLIC_API_URL || process.env.EXPO_PUBLIC_BACKEND_URL;

  return (
    ensureApiPath(overrideBaseUrl) ||
    ensureApiPath(envBaseUrl) ||
    DEFAULT_API_URL
  );
};

const createApiClient = (options?: ApiClientOptions) =>
  axios.create({
    baseURL: resolveBaseUrl(options?.baseURL),
    timeout: options?.timeout ?? 15000,
    headers: { "Content-Type": "application/json" },
  });

const api = createApiClient();

// Response interceptor (registered once)
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response) {
      const status = error.response.status;
      const requestUrl = String(error.config?.url ?? "");
      const responseError = String(error.response?.data?.error ?? "");
      const isExpectedMissingServerAfterDelete =
        status === 404 &&
        responseError.toLowerCase() === "server not found" &&
        /servers\/[^/]+\/(members|channel-list|invite)$/i.test(requestUrl);

      if (isExpectedMissingServerAfterDelete) {
        return Promise.reject(error);
      }

      console.error(
        `API Error: ${error.config?.method?.toUpperCase()} ${error.config?.url}`,
        {
          status,
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

api.interceptors.request.use((config) => ({
  ...config,
  url: normalizeRequestUrl(config.url),
}));

export const useApi = () => {
  const { getToken } = useAuth();

  const apiWithAuth = useCallback(
    async <T = any>(
      config: Parameters<typeof api.request>[0],
      options?: ApiClientOptions
    ) => {
      const token = await getToken();
      const client = options ? createApiClient(options) : api;

      return client.request<T>({
        ...config,
        url: normalizeRequestUrl(config.url),
        baseURL: resolveBaseUrl(config.baseURL || options?.baseURL),
        headers: {
          ...config.headers,
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      });
    },
    [getToken]
  );

  const getApiClient = useCallback((options?: ApiClientOptions) => {
    if (!options) return api;
    return createApiClient(options);
  }, []);

  return { api, apiWithAuth, getApiClient };
};