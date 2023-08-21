export function extend(target, other) {
  return Object.assign(target, other);
}

export function isObject(target: unknown) {
  return target != null && typeof target === "object";
}
