export const SIDEBAR_OPENING_MODE_STORAGE_KEY = "qnh-budget-sidebar-opening-mode";

export function normalizeSidebarOpeningMode(value) {
  return value === "click" ? "click" : "hover";
}

export function loadSidebarOpeningMode(storage) {
  try {
    return normalizeSidebarOpeningMode(storage?.getItem(SIDEBAR_OPENING_MODE_STORAGE_KEY));
  } catch {
    return "hover";
  }
}

export function isSidebarExpanded({ mode, hovered, clickOpen }) {
  return Boolean(mode === "click" ? clickOpen : hovered);
}
