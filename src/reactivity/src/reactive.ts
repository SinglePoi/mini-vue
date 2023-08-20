import { activeEffect } from "./effect";

export function reactive(raw) {
  return new Proxy(raw, {
    get(target, key) {
      const result = Reflect.get(target, key);
      //  依赖收集
      track(target, key);
      return result;
    },
    set(target, key, value) {
      const result = Reflect.set(target, key, value);
      //  触发依赖
      trigger(target, key);
      return result;
    },
  });
}

const targetMap = new WeakMap();
export function track(target, key) {
  // 如果没有 activeEffect 不进行依赖收集
  if (!activeEffect) return;

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
}

export function trigger(target, key) {
  const depsMap = targetMap.get(target);
  // 如果 depsMap 为 underfined ，说明没有进行过依赖收集，这时不应该执行依赖
  if (!depsMap) return;
  const deps = depsMap.get(key);

  for (const effect of deps) {
    effect.run();
  }
}
