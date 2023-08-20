export let activeEffect;

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
  _effect.onStop = obj?.onStop;
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
    activeEffect = this;
    return this._fn();
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
}

export function stop(runner: any) {
  runner.effect.stop();
}
