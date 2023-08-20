export let activeEffect;

export function effect(fn, obj?) {
  const _effect = new ReactiveEffevt(fn, obj?.scheduler);
  _effect.run();
  return _effect.run.bind(_effect);
}

class ReactiveEffevt {
  private _fn: any;
  public _scheduler: any;
  constructor(fn, scheduler) {
    this._fn = fn;
    this._scheduler = scheduler;
  }
  run() {
    activeEffect = this;
    return this._fn();
  }
}
