export function toNumber(value) {
  const num = Number(value);
  return Number.isFinite(num) ? num : 0;
}
