import { Profile } from "../models/Profile";

function normalizeBase(input: string) {
  const cleaned = input
    .toLowerCase()
    .replace(/[^a-z0-9._-]+/g, "")
    .slice(0, 18);
  return cleaned || "user";
}

export async function generateUniqueUsername(seed: string) {
  const base = normalizeBase(seed);
  let candidate = base;
  let attempt = 0;

  while (await Profile.exists({ username: candidate })) {
    attempt += 1;
    const suffix = Math.floor(1000 + Math.random() * 9000).toString();
    candidate = `${base.slice(0, Math.max(1, 18 - suffix.length))}${suffix}`;
    if (attempt > 20) {
      candidate = `${base}${Date.now().toString().slice(-5)}`;
    }
  }

  return candidate;
}

export function usernameFromLinkOrCode(raw: string) {
  const value = (raw ?? "").trim();
  const schemeMatch = value.match(/^discord:\/\/friend\/([^/?#\s]+)$/i);
  if (schemeMatch?.[1]) return schemeMatch[1];
  return value;
}
