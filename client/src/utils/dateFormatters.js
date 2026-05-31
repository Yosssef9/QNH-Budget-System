// src/utils/dateFormatters.js

const SAUDI_TIMEZONE = "Asia/Riyadh";

export function formatDateTime(value) {
  if (!value) return "-";

  return new Intl.DateTimeFormat("en-GB", {
    timeZone: SAUDI_TIMEZONE,
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(new Date(value));
}

export function formatDate(value) {
  if (!value) return "-";

  return new Intl.DateTimeFormat("en-GB", {
    timeZone: SAUDI_TIMEZONE,
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(value));
}

export function formatTime(value) {
  if (!value) return "-";

  return new Intl.DateTimeFormat("en-GB", {
    timeZone: SAUDI_TIMEZONE,
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(new Date(value));
}
