import { useCallback, useEffect, useState } from "react";

const STORAGE_KEY = "budgetAnalytics.smartFilters.v1";
const RECENT_LIMIT = 8;
const SAVED_LIMIT = 20;

function createId() {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return crypto.randomUUID();
  }

  return `local-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function readStorage() {
  try {
    const value = localStorage.getItem(STORAGE_KEY);
    if (!value) return { recent: [], saved: [] };

    const parsed = JSON.parse(value);

    return {
      recent: Array.isArray(parsed?.recent) ? parsed.recent : [],
      saved: Array.isArray(parsed?.saved) ? parsed.saved : [],
    };
  } catch {
    return { recent: [], saved: [] };
  }
}

function writeStorage(value) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(value));
}

export default function useSmartFilterStorage() {
  const [storage, setStorage] = useState(() => readStorage());

  useEffect(() => {
    writeStorage(storage);
  }, [storage]);

  const recordRecent = useCallback((query) => {
    const normalized = String(query || "").trim();
    if (!normalized) return;

    setStorage((prev) => {
      const recent = [
        { query: normalized, usedAt: new Date().toISOString() },
        ...prev.recent.filter((item) => item.query !== normalized),
      ].slice(0, RECENT_LIMIT);

      return {
        ...prev,
        recent,
      };
    });
  }, []);

  const saveSearch = useCallback((name, query) => {
    const normalizedName = String(name || "").trim();
    const normalizedQuery = String(query || "").trim();

    if (!normalizedName || !normalizedQuery) return false;

    setStorage((prev) => {
      const saved = [
        {
          id: createId(),
          name: normalizedName,
          query: normalizedQuery,
          createdAt: new Date().toISOString(),
        },
        ...prev.saved.filter(
          (item) =>
            item.name.toLowerCase() !== normalizedName.toLowerCase() &&
            item.query !== normalizedQuery,
        ),
      ].slice(0, SAVED_LIMIT);

      return {
        ...prev,
        saved,
      };
    });

    return true;
  }, []);

  const deleteSavedSearch = useCallback((id) => {
    setStorage((prev) => ({
      ...prev,
      saved: prev.saved.filter((item) => item.id !== id),
    }));
  }, []);

  const clearRecent = useCallback(() => {
    setStorage((prev) => ({
      ...prev,
      recent: [],
    }));
  }, []);

  return {
    recentSearches: storage.recent,
    savedSearches: storage.saved,
    recordRecent,
    saveSearch,
    deleteSavedSearch,
    clearRecent,
  };
}
