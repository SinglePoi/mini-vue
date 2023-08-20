import { activeEffect, shouldTrack } from "./effect";
import { ReactiveFlags } from "./reactive";

// 对 set/get 进行缓存，只在初始化的时候执行一次，避免多余的内存消耗
const reactiveGet = createGetter();
const reactiveSet = createSetter();
const readonlyGet = createGetter(true);

function createGetter(isReadonly = false) {
  return function get(target, key) {
    if (key === ReactiveFlags.IS_READONLY) {
      return isReadonly;
    } else if (key === ReactiveFlags.IS_RESCTIVE) {
      return !isReadonly;
    }
    const result = Reflect.get(target, key);
    //  依赖收集
    if (!isReadonly) {
      track(target, key);
    }
    return result;
  };
}

function createSetter(isReadonly = false) {
  return function set(target, key, value) {
    const result = Reflect.set(target, key, value);
    //  触发依赖
    if (!isReadonly) {
      trigger(target, key);
    }
    return result;
  };
}

export const reactiveHandlers = {
  get: reactiveGet,
  set: reactiveSet,
};

export const readonlyHandlers = {
  get: readonlyGet,
  set() {
    console.warn("target is readonly");
    return true;
  },
};

const targetMap = new WeakMap();
export function track(target, key) {
  // 如果没有 activeEffect 不进行依赖收集
  if (!activeEffect) return;
  // stop 情况下，不收集依赖
  if (!shouldTrack) return;

  let depsMap = targetMap.get(target);
  if (!depsMap) {
    depsMap = new Map();
    targetMap.set(target, depsMap);
  }
  let deps = depsMap.get(key);
  if (!deps) {
    deps = new Set();
    depsMap.set(key, deps);
  }

  deps.add(activeEffect);
  activeEffect.deps.push(deps);
}

export function trigger(target, key) {
  const depsMap = targetMap.get(target);
  // 如果 depsMap 为 underfined ，说明没有进行过依赖收集，这时不应该执行依赖
  if (!depsMap) return;
  const deps = depsMap.get(key);

  for (const effect of deps) {
    if (effect._scheduler) {
      effect._scheduler();
    } else {
      effect.run();
    }
  }
}
