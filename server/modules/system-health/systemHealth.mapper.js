import { HEALTH_STATUS } from "./systemHealth.constants.js";

const statusRank = {
  [HEALTH_STATUS.HEALTHY]: 0,
  [HEALTH_STATUS.NOT_CONFIGURED]: 1,
  [HEALTH_STATUS.DEGRADED]: 2,
  [HEALTH_STATUS.CRITICAL]: 3,
};

export function combineHealthStatuses(statuses = []) {
  return statuses.reduce((current, status) => {
    return statusRank[status] > statusRank[current] ? status : current;
  }, HEALTH_STATUS.HEALTHY);
}

export function buildHealthCheck({ key, label, status, description, meta = {} }) {
  return {
    key,
    label,
    status,
    description,
    meta,
  };
}

export function sanitizeErrorMessage(message) {
  if (!message) return "";

  return String(message)
    .replace(/password=[^;\s]+/gi, "password=[redacted]")
    .replace(/pwd=[^;\s]+/gi, "pwd=[redacted]")
    .replace(/token=[^;\s]+/gi, "token=[redacted]")
    .replace(/Bearer\s+[A-Za-z0-9._-]+/gi, "Bearer [redacted]")
    .slice(0, 500);
}
