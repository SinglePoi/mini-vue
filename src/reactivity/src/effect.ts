import { extend } from "../../shared/index";

export let activeEffect;
export let shouldTrack = false;
export interface ReactiveEffectRunner<T = any> {
  (): T;
  effect: ReactiveEffect;
}
export type EffectScheduler = (...args: any[]) => any;
export interface ReactiveEffectOptions {
  scheduler?: EffectScheduler;
  onStop?: () => void;
}

export function effect(fn, obj?: ReactiveEffectOptions) {
  const _effect = new ReactiveEffect(fn, obj?.scheduler);
  _effect.run();
  const runenr = _effect.run.bind(_effect) as ReactiveEffectRunner;
  runenr.effect = _effect;
  extend(_effect, obj);
  return runenr;
}

export type EffectFn = () => any;

class ReactiveEffect {
  private _fn: EffectFn;
  public _scheduler: EffectScheduler;
  public deps = [];
  private active = true;
  public onStop?: () => any;
  constructor(fn, scheduler) {
    this._fn = fn;
    this._scheduler = scheduler;
  }
  run() {
    // stop 情况下，继承 shouldTrack 的值，此时为 false
    if (!this.active) {
      return this._fn();
    }

    // 非 stop 情况下
    shouldTrack = true;
    activeEffect = this;
    const result = this._fn();

    // 最后设置为 false
    shouldTrack = false;

    return result;
  }
  stop() {
    // 防止重复调用 stop，导致多次执行 cleanup
    if (this.active) {
      cleanupEffect(this);
      if (this.onStop) {
        this.onStop();
      }
      this.active = false;
    }
  }
}

function cleanupEffect(effect: ReactiveEffect) {
  effect.deps.forEach((dep: Set<any>) => {
    dep.delete(effect);
  });
  effect.deps.length = 0;
}

export function stop(runner: any) {
  runner.effect.stop();
}

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

  // 完成 effect 的收集
  trackEffects(deps);
}

export function trigger(target, key) {
  const depsMap = targetMap.get(target);
  // 如果 depsMap 为 underfined ，说明没有进行过依赖收集，这时不应该执行依赖
  if (!depsMap) return;
  const deps = depsMap.get(key);

  triggerEffects(deps);
}

// 在 tracking 状态中
export function isTracking() {
  // 如果没有 activeEffect 不进行依赖收集
  //   if (!activeEffect) return;
  // stop 情况下，不收集依赖
  //   if (!shouldTrack) return;

  return shouldTrack && activeEffect !== undefined;
}

// 为了方便 ref 的调用，对其逻辑进行抽离
export function trackEffects(deps) {
  // 如果 deps 已经收集了该依赖，没必要再搜集一次
  if (deps.has(activeEffect)) return;

  deps.add(activeEffect);
  activeEffect.deps.push(deps);
}

// 为了方便 ref 的调用，对其逻辑进行抽离
export function triggerEffects(deps) {
  for (const effect of deps) {
    if (effect._scheduler) {
      effect._scheduler();
    } else {
      effect.run();
    }
  }
}
