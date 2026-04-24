import axios, { type AxiosInstance, type InternalAxiosRequestConfig } from "axios";
import * as SecureStore from "expo-secure-store";
import { useAuth } from "@clerk/expo";
import { useCallback } from "react";
import { Alert } from "react-native";
import { APP_JWT_STORE_KEY } from "@/lib/appJwtStorageKey";
import { notifyAuthInvalidated } from "@/lib/authInvalidation";

const getAppJwtFromStore = () => SecureStore.getItemAsync(APP_JWT_STORE_KEY);
let lastApiWarningAt = 0;
let lastApiWarningMessage = "";
const API_WARNING_COOLDOWN_MS = 2500;

const warnApiError = (message: string) => {
  const now = Date.now();
  if (
    now - lastApiWarningAt < API_WARNING_COOLDOWN_MS &&
    lastApiWarningMessage === message
  ) {
    return;
  }
  lastApiWarningAt = now;
  lastApiWarningMessage = message;
  Alert.alert("Warning", message);
};

/**
 * When `EXPO_PUBLIC_API_URL` / `EXPO_PUBLIC_BACKEND_URL` are unset: REST uses the
 * first host; if it is unreachable (e.g. phone on a different Wi‑Fi), Axios
 * retries once on the second. Sockets: `getApiSocketConnectUrls` + `connect_error`
 * then next host.
 */
const DEFAULT_LAN_API_BASES = [
  "http://192.168.1.11:5000",
  "http://10.166.73.78:5000",
] as const;

const hasPublicApiUrl = () =>
  !!(process.env.EXPO_PUBLIC_API_URL || process.env.EXPO_PUBLIC_BACKEND_URL);

const primaryDevLanApi = () => ensureApiPath(DEFAULT_LAN_API_BASES[0])!;

const fallbackDevLanApi = () => ensureApiPath(DEFAULT_LAN_API_BASES[1])!;

const sameBase = (a?: string, b?: string) => {
  if (!a || !b) return false;
  return String(a).replace(/\/+$/, "") === String(b).replace(/\/+$/, "");
};

type ApiClientOptions = {
  baseURL?: string;
  timeout?: number;
};

const normalizeRequestUrl = (url?: string) => {
  if (!url) return url;
  const value = String(url).trim();
  if (!value) return value;
  if (/^https?:\/\//i.test(value)) return value;
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
    primaryDevLanApi()
  );
};

/**
 * When using env, a single host; otherwise [home LAN, phone WiFi LAN] for
 * `connect_error` / retry.
 */
export const getApiSocketConnectUrls = (): string[] => {
  if (hasPublicApiUrl()) {
    return [resolveBaseUrl().replace(/\/api\/?$/, "")];
  }
  return [...DEFAULT_LAN_API_BASES];
};

export const getApiSocketOrigin = () => getApiSocketConnectUrls()[0] ?? "";

const attachResponseHandlers = (client: AxiosInstance) => {
  client.interceptors.response.use(
    (response) => response,
    async (error) => {
      const config = error.config as
        | (InternalAxiosRequestConfig & { _lanApiFallbackTried?: boolean })
        | undefined;

      if (
        config &&
        !error.response &&
        !(config as InternalAxiosRequestConfig & { _lanApiFallbackTried?: boolean })
          ._lanApiFallbackTried &&
        !hasPublicApiUrl() &&
        sameBase(config.baseURL, primaryDevLanApi())
      ) {
        const next = {
          ...config,
          baseURL: fallbackDevLanApi(),
          _lanApiFallbackTried: true,
        } as InternalAxiosRequestConfig & { _lanApiFallbackTried?: boolean };
        return client.request(next);
      }

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

        if (status === 401 && error.config?.headers?.Authorization) {
          await notifyAuthInvalidated("unauthorized");
        } else {
          const apiMessage =
            String(error.response?.data?.error ?? "") ||
            String(error.response?.data?.message ?? "");
          const warningMessage = apiMessage.trim() || `Request failed (${status}). Please try again.`;
          warnApiError(warningMessage);
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
};

const createApiClient = (options?: ApiClientOptions) => {
  const c = axios.create({
    baseURL: resolveBaseUrl(options?.baseURL),
    timeout: options?.timeout ?? 15000,
    headers: { "Content-Type": "application/json" },
  });
  c.interceptors.request.use((config) => ({
    ...config,
    url: normalizeRequestUrl(config.url),
  }));
  attachResponseHandlers(c);
  return c;
};

const api = createApiClient();

export { api };

export const useApi = () => {
  const { getToken } = useAuth();

  const apiWithAuth = useCallback(
    async <T = unknown>(
      config: Parameters<typeof api.request>[0],
      options?: ApiClientOptions
    ) => {
      const [local, clerk] = await Promise.all([getAppJwtFromStore(), getToken()]);
      const token = (local && local.length > 0 ? local : null) ?? clerk;
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
