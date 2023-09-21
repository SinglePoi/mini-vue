export const extend = Object.assign;

export function isObject(target: unknown) {
  return target != null && typeof target === "object";
}

export function isString(target: unknown) {
  return typeof target === "string";
}

export const hasChanged = (newValue, oldValue) => {
  return !Object.is(newValue, oldValue);
};

export const hasOwn = (target, key: string) =>
  Object.prototype.hasOwnProperty.call(target, key);

export const isOn = (key: string) => /^on[A-Z]/.test(key);

export const capitalize = (str: string) => {
  return str.charAt(0).toUpperCase() + str.slice(1);
};

export const camelize = (str: string) => {
  return str.replace(/-(\w)/g, (_, c) => {
    return c ? c.toUpperCase() : "";
  });
};

export const EMPTY_OBJ = {};
