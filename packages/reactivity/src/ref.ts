import { hasChanged, isObject } from "@hello-vue/shared";
import { isTracking, trackEffects, triggerEffects } from "./effect";
import { reactive } from "./reactive";

class RefImpl {
  private _value: any;
  public dep: any;
  private _rawValue: any;
  public isRef = true;

  constructor(value) {
    this._rawValue = value;
    this._value = convert(value);
    this.dep = new Set();
  }

  get value() {
    trackRefValue(this);
    return this._value;
  }

  set value(newValue) {
    if (hasChanged(newValue, this._rawValue)) {
      this._rawValue = newValue;
      this._value = convert(newValue);
      triggerEffects(this.dep);
    }
  }
}

function trackRefValue(ref) {
  if (isTracking()) {
    trackEffects(ref.dep);
  }
}

function convert(value) {
  return isObject(value) ? reactive(value) : value;
}

export function ref(value: any) {
  return new RefImpl(value);
}

export function isRef(ref) {
  return !!ref.isRef;
}

export function unRef(ref) {
  return isRef(ref) ? ref.value : ref;
}

export function proxyRef(proxyWithRef) {
  return new Proxy(proxyWithRef, proxyRefHandlers);
}

const proxyRefHandlers = {
  get(target, key) {
    const result = Reflect.get(target, key);
    // return isRef(result) ? result.value : result;
    return unRef(result);
  },
  set(target, key, value) {
    /**
     * 有两种情况
     * 1、老值是 ref，新值不是 ref，需要对 .value 进行赋值
     * 2、新值是 ref，进行替换
     */
    const original = target[key];
    if (isRef(original) && !isRef(value)) {
      return (original.value = value);
    } else {
      return Reflect.set(target, key, value);
    }
  },
};
