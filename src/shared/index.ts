export const extend = Object.assign;

export function isObject(target: unknown) {
  return target != null && typeof target === "object";
}

export const hasChanged = (newValue, oldValue) => {
  return !Object.is(newValue, oldValue);
};

export const hasOwn = (target, key: string) =>
  Object.prototype.hasOwnProperty.call(target, key);

export const isOn = (key: string) => /^on[A-Z]/.test(key);
