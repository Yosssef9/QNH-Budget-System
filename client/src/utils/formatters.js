export function formatNumber(value) {
  return Number(value || 0).toLocaleString();
}

export function formatSAR(value) {
  const number = Number(value || 0);

  return new Intl.NumberFormat("en-US", {
    minimumFractionDigits: Number.isInteger(number) ? 0 : 2,
    maximumFractionDigits: 2,
  }).format(number);
}
export function formatCompactSAR(value) {
  const number = Number(value || 0);

  return new Intl.NumberFormat("en-US", {
    notation: "compact",
    compactDisplay: "short",
    maximumFractionDigits: 2,
  }).format(number);
}
