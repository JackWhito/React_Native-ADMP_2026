import * as SecureStore from "expo-secure-store";
import { APP_JWT_STORE_KEY } from "@/lib/appJwtStorageKey";

/**
 * App JWT (email sign-in) takes precedence, then Clerk session (e.g. Google).
 */
export async function resolveAuthToken(
  getClerkToken: () => Promise<string | null>
): Promise<string | null> {
  const local = await SecureStore.getItemAsync(APP_JWT_STORE_KEY);
  if (local && local.length > 0) return local;
  return getClerkToken();
}
