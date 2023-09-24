import { ReactiveEffect } from "./effect";

class ComputedRefImpl {
  private _effect: ReactiveEffect;
  private _dirty: boolean = true;
  private _value: any;
  constructor(getter) {
    /**
     * 为了满足响应式对象发生变化后，下次调用时，computed 会重新执行 getter
     * 在 effect 上做文章，借用 ReactiveEffect
     * 这样依赖的响应式对象在 get 的时候就会收集到这个依赖
     * 响应式对象发生改变时，会执行我们定义的 scheduler 函数，使 _dirty 重置为 true
     */
    this._effect = new ReactiveEffect(getter, () => {
      if (!this._dirty) {
        this._dirty = true;
      }
    });
  }
  get value() {
    /**
     * 使用 _dirty 可以让 getter 不再重复执行
     * 但以下方式，只是让 getter 只能执行一次
     */
    if (this._dirty) {
      this._dirty = false;
      this._value = this._effect.run();
    }
    return this._value;
  }
}

export function computed(getter) {
  return new ComputedRefImpl(getter);
}
