type AuthInvalidationHandler = (reason?: string) => Promise<void>;

let authInvalidationHandler: AuthInvalidationHandler | null = null;
let invalidationInFlight = false;

export const setAuthInvalidationHandler = (handler: AuthInvalidationHandler | null) => {
  authInvalidationHandler = handler;
};

export const notifyAuthInvalidated = async (reason?: string) => {
  if (!authInvalidationHandler || invalidationInFlight) return;
  invalidationInFlight = true;
  try {
    await authInvalidationHandler(reason);
  } finally {
    invalidationInFlight = false;
  }
};
