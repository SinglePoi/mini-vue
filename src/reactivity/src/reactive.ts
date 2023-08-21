import {
  reactiveHandlers,
  readonlyHandlers,
  shallowReadonlyHandlers,
} from "./baseHandlers";

export const enum ReactiveFlags {
  IS_READONLY = "__v_isReadonly",
  IS_RESCTIVE = "__v_isReactive",
}

export function reactive(target) {
  return createReactiveObject(target, reactiveHandlers);
}

export function readonly(target: any) {
  return createReactiveObject(target, readonlyHandlers);
}

export function shallowReadonly(target: any) {
  return createReactiveObject(target, shallowReadonlyHandlers);
}

function createReactiveObject(target, baseHandlers) {
  return new Proxy(target, baseHandlers);
}

export function isReadonly(target) {
  return !!target[ReactiveFlags.IS_READONLY];
}

export function isReactive(target) {
  return !!target[ReactiveFlags.IS_RESCTIVE];
}

export function isProxy(target) {
  return isReadonly(target) || isReactive(target);
}
