export let activeEffect;

export function effect(fn) {
  const _effect = new ReactiveEffevt(fn);
  _effect.run();
  return _effect.run.bind(_effect);
}

class ReactiveEffevt {
  private _fn;
  constructor(fn) {
    this._fn = fn;
  }
  run() {
    activeEffect = this;
    return this._fn();
  }
}
