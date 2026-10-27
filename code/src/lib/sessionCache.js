export const EVENTS_PAGE_CACHE_KEY = "palouse:events-page-cache";
export const ORGANIZATIONS_PAGE_CACHE_KEY = "palouse:organizations-page-cache";
export const ADMIN_UI_STATE_KEY = "palouse:admin-ui-state";
export const ADMIN_ROLE_CACHE_KEY = "palouse:admin-role-cache";

function getStorage() {
  if (typeof window === "undefined") {
    return null;
  }

  try {
    return window.sessionStorage;
  } catch {
    return null;
  }
}

export function readSessionCache(key) {
  const storage = getStorage();

  if (!storage) {
    return null;
  }

  try {
    const rawValue = storage.getItem(key);
    if (!rawValue) {
      return null;
    }

    const parsedValue = JSON.parse(rawValue);
    if (!parsedValue || typeof parsedValue !== "object") {
      return null;
    }

    return parsedValue;
  } catch {
    return null;
  }
}

export function writeSessionCache(key, value) {
  const storage = getStorage();

  if (!storage) {
    return;
  }

  try {
    storage.setItem(
      key,
      JSON.stringify({
        storedAt: Date.now(),
        value,
      })
    );
  } catch {
    // Ignore storage failures and continue with in-memory state.
  }
}

export function removeSessionCache(key) {
  const storage = getStorage();

  if (!storage) {
    return;
  }

  try {
    storage.removeItem(key);
  } catch {
    // Ignore storage failures.
  }
}

export function isSessionCacheFresh(entry, maxAgeMs) {
  if (!entry || typeof entry !== "object") {
    return false;
  }

  if (!maxAgeMs) {
    return true;
  }

  if (typeof entry.storedAt !== "number") {
    return false;
  }

  return Date.now() - entry.storedAt < maxAgeMs;
}

export function getSessionCacheValue(entry) {
  if (!entry || typeof entry !== "object") {
    return null;
  }

  return entry.value ?? null;
}