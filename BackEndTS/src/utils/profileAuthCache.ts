import type { Types } from "mongoose";

const TTL_MS = 45_000;

export type CachedAuthProfile = {
  _id: Types.ObjectId;
  clerkId: string;
  moderationStatus: "active" | "suspended" | "banned" | "shadow_banned";
  suspendedUntil?: Date | null;
  forceLogoutAfter?: Date | null;
};

const byClerkId = new Map<string, { entry: CachedAuthProfile; expiresAt: number }>();

export function getCachedAuthProfile(clerkId: string): CachedAuthProfile | null {
  const row = byClerkId.get(clerkId);
  if (!row || row.expiresAt <= Date.now()) {
    if (row) byClerkId.delete(clerkId);
    return null;
  }
  return row.entry;
}

export function setCachedAuthProfile(clerkId: string, entry: CachedAuthProfile) {
  byClerkId.set(clerkId, { entry, expiresAt: Date.now() + TTL_MS });
}

export function invalidateAuthProfileCacheForClerkId(clerkId: string) {
  if (clerkId) byClerkId.delete(clerkId);
}

/** When you only have profile id (e.g. admin routes), clear the matching entry. */
export function invalidateAuthProfileCacheForProfileId(profileId: string) {
  const id = String(profileId);
  for (const [k, v] of byClerkId) {
    if (String(v.entry._id) === id) {
      byClerkId.delete(k);
      return;
    }
  }
}

export function invalidateAuthProfileCacheAfterSave(profile: { clerkId?: string; _id: unknown }) {
  if (profile.clerkId) {
    invalidateAuthProfileCacheForClerkId(String(profile.clerkId));
  } else {
    invalidateAuthProfileCacheForProfileId(String(profile._id));
  }
}
