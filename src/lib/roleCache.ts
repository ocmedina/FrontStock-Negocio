type CachedRoleEntry = {
  role: string;
  expiresAt: number;
};

const STORAGE_KEY = "roleCache";
const DEFAULT_TTL_MS = 60 * 60 * 1000;

const isBrowser = () => typeof window !== "undefined";

const loadCache = (): Record<string, CachedRoleEntry> => {
  if (!isBrowser()) return {};
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as Record<string, CachedRoleEntry>;
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
};

const saveCache = (cache: Record<string, CachedRoleEntry>) => {
  if (!isBrowser()) return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(cache));
  } catch {
    // Ignore storage errors to avoid breaking auth flow.
  }
};

export const cacheUserRole = (userId: string, role: string, ttlMs: number = DEFAULT_TTL_MS) => {
  if (!userId || !role) return;
  const cache = loadCache();
  cache[userId] = {
    role,
    expiresAt: Date.now() + ttlMs,
  };
  saveCache(cache);
};

export const getCachedUserRole = async (userId?: string) => {
  const cache = loadCache();
  const now = Date.now();

  if (userId) {
    const entry = cache[userId];
    if (!entry) return null;
    if (entry.expiresAt < now) {
      delete cache[userId];
      saveCache(cache);
      return null;
    }
    return entry.role;
  }

  for (const key of Object.keys(cache)) {
    const entry = cache[key];
    if (!entry) continue;
    if (entry.expiresAt < now) {
      delete cache[key];
      continue;
    }
    saveCache(cache);
    return entry.role;
  }

  saveCache(cache);
  return null;
};
