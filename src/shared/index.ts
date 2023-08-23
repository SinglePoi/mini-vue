export const extend = Object.assign;

export function isObject(target: unknown) {
  return target != null && typeof target === "object";
}

export const hasChanged = (newValue, oldValue) => {
  return !Object.is(newValue, oldValue);
};
