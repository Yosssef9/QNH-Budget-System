export function normalizeId(value) {
  if (value === null || value === undefined || value === "") {
    return null;
  }

  const num = Number(value);

  return Number.isNaN(num) ? String(value) : num;
}

export function idsEqual(a, b) {
  return normalizeId(a) === normalizeId(b);
}

export function idsIncludes(list = [], value) {
  return list.some((item) => idsEqual(item, value));
}

export function idsRemove(list = [], value) {
  return list.filter((item) => !idsEqual(item, value));
}
