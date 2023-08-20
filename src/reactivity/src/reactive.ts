import { reactiveHandlers, readonlyHandlers } from "./baseHandlers";

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

function createReactiveObject(target, baseHandlers) {
  return new Proxy(target, baseHandlers);
}

export function isReadonly(target) {
  return !!target[ReactiveFlags.IS_READONLY];
}

export function isReative(target) {
  return !!target[ReactiveFlags.IS_RESCTIVE];
}
