import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"
 
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/** Use for React Native Image: empty or whitespace `uri` triggers "source.uri should not be an empty string". */
export function remoteImageSource(uri: string | undefined | null): { uri: string } | undefined {
  const u = typeof uri === "string" ? uri.trim() : "";
  return u.length > 0 ? { uri: u } : undefined;
}