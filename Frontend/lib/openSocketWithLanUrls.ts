import { getApiSocketConnectUrls } from "@/lib/axios";
import { io, type Socket } from "socket.io-client";

type OpenSocketOptions = {
  transports: string[];
  auth: { token: string };
};

/**
 * When `EXPO_PUBLIC_API_URL` is unset, tries the first LAN host then the
 * next on `connect_error` (e.g. phone on a different Wi‑Fi than 192.168.x).
 */
export const openSocketWithLanUrls = (
  options: OpenSocketOptions,
  register: (socket: Socket) => void
): (() => void) => {
  const urls = getApiSocketConnectUrls();
  let active: Socket | null = null;
  let cancelled = false;

  const tryAt = (index: number) => {
    if (cancelled || index >= urls.length) return;
    const s = io(urls[index], options);
    active = s;

    const onFail = () => {
      s.removeAllListeners();
      s.close();
      if (active === s) active = null;
      if (index + 1 < urls.length) tryAt(index + 1);
    };

    if (urls.length > 1 && index < urls.length - 1) {
      s.once("connect_error", onFail);
      s.once("connect", () => s.off("connect_error", onFail));
    }

    register(s);
  };

  tryAt(0);

  return () => {
    cancelled = true;
    if (active) {
      active.removeAllListeners();
      active.close();
      active = null;
    }
  };
};
