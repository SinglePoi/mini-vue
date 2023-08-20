export let activeEffect;

export function effect(fn) {
  const _effect = new ReactiveEffevt(fn);
  _effect.run();
}

class ReactiveEffevt {
  private _fn;
  constructor(fn) {
    this._fn = fn;
  }
  run() {
    activeEffect = this;
    this._fn();
  }
}
