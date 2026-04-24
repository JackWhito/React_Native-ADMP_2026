import mongoose from "mongoose";

const DEFAULT_LIMIT = 30;
const MAX_LIMIT = 100;

export function parseListLimit(raw: unknown, defaultLimit = DEFAULT_LIMIT): number {
  const n = Number(raw);
  if (!Number.isFinite(n)) return defaultLimit;
  return Math.min(Math.max(Math.floor(n), 1), MAX_LIMIT);
}

export type SortCursor = { t: string; id: string };

export function encodeSortCursor(t: Date, id: string): string {
  const payload: SortCursor = { t: t.toISOString(), id };
  return Buffer.from(JSON.stringify(payload), "utf8").toString("base64url");
}

export function decodeSortCursor(raw: string): SortCursor | null {
  if (!raw || typeof raw !== "string") return null;
  try {
    const json = Buffer.from(raw, "base64url").toString("utf8");
    const v = JSON.parse(json) as unknown;
    if (!v || typeof v !== "object") return null;
    const t = (v as SortCursor).t;
    const id = (v as SortCursor).id;
    if (typeof t !== "string" || typeof id !== "string") return null;
    const d = new Date(t);
    if (Number.isNaN(d.getTime())) return null;
    if (!mongoose.Types.ObjectId.isValid(id)) return null;
    return { t, id };
  } catch {
    return null;
  }
}

/** Compound sort (desc t, desc id) next page: rows strictly “after” the cursor. */
export function nextPageFilter(
  field: "lastMessageAt" | "createdAt",
  cursor: SortCursor
): Record<string, unknown> {
  const d = new Date(cursor.t);
  const oid = new mongoose.Types.ObjectId(cursor.id);
  return {
    $or: [
      { [field]: { $lt: d } },
      { $and: [{ [field]: d }, { _id: { $lt: oid } }] },
    ],
  };
}
