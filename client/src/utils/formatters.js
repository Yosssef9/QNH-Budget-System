export function formatNumber(value) {
  return Number(value || 0).toLocaleString();
}

export function formatSAR(value) {
  return `${formatNumber(value)} ر.س`;
}
