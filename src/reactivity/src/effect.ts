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
