import { extend, isObject } from "@hello-vue/shared";
import { track, trigger } from "./effect";
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
