export function formatQty(value) {
  const num = Number(value || 0);

  return num.toLocaleString("en-US", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  });
}
