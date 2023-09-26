import { isObject } from "@hello-vue/shared";
import {
  reactiveHandlers,
  readonlyHandlers,
  shallowReadonlyHandlers,
} from "./baseHandlers";

export const enum ReactiveFlags {
  IS_READONLY = "__v_isReadonly",
  IS_RESCTIVE = "__v_isReactive",
}

// reactive 工厂
export function reactive(target) {
  return createReactiveObject(target, reactiveHandlers);
}

// readonly 工厂
export function readonly(target: any) {
  return createReactiveObject(target, readonlyHandlers);
}

// shallowReadonly 工厂
export function shallowReadonly(target: any) {
  return createReactiveObject(target, shallowReadonlyHandlers);
}

// 响应式对象的抽象工厂
function createReactiveObject(target, baseHandlers) {
  if (!isObject(target)) {
    // 如果 target 不是对象类型，提示错误，并原样返回
    console.warn(`value cannot be made reactive: ${String(target)}`);
    return target;
  }
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
