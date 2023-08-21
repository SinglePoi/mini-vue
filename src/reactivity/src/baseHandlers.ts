import { extend, isObject } from "../../shared/index";
import { activeEffect, shouldTrack } from "./effect";
import { ReactiveFlags, reactive, readonly } from "./reactive";

// 对 set/get 进行缓存，只在初始化的时候执行一次，避免多余的内存消耗
const reactiveGet = createGetter();
const reactiveSet = createSetter();
const readonlyGet = createGetter(true);
const shallowReadonlyGet = createGetter(true, true);

function createGetter(isReadonly = false, shallow = false) {
  return function get(target, key) {
    if (key === ReactiveFlags.IS_READONLY) {
      return isReadonly;
    } else if (key === ReactiveFlags.IS_RESCTIVE) {
      return !isReadonly;
    }
    const result = Reflect.get(target, key);

    // 如果是浅层，应该直接返回
    if (shallow) {
      return result;
    }

    // result 作为 Proxy 返回的值，如果该值的类型仍然是 object
    // 为了实现深层代理的目的，应该对 result 进行代理
    if (isObject(result)) {
      return isReadonly ? readonly(result) : reactive(result);
    }

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

export const shallowReadonlyHandlers = extend({}, readonlyHandlers, {
  get: shallowReadonlyGet,
});

// {
//   get: shallowReadonlyGet,
//   set() {
//     console.warn("target is readonly");
//     return true;
//   },
// };

const targetMap = new WeakMap();
export function track(target, key) {
  if (!isTracking()) return;

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

  // 如果 deps 已经收集了该依赖，没必要再搜集一次
  if (deps.has(activeEffect)) return;

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

// 在 tracking 状态中
function isTracking() {
  // 如果没有 activeEffect 不进行依赖收集
  //   if (!activeEffect) return;
  // stop 情况下，不收集依赖
  //   if (!shouldTrack) return;

  return shouldTrack && activeEffect !== undefined;
}
