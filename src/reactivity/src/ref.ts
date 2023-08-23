import { isObject } from "../../shared/index";
import { isTracking, trackEffects, triggerEffects } from "./effect";
import { reactive } from "./reactive";

class RefImpl {
  private _value: any;
  public dep: any;
  private _rawValue: any;

  constructor(value) {
    this._rawValue = value;
    this._value = isObject(value) ? reactive(value) : value;
    this.dep = new Set();
  }

  get value() {
    if (isTracking()) {
      trackEffects(this.dep);
    }
    return this._value;
  }

  set value(_value) {
    if (Object.is(this._rawValue, _value)) return;
    this._rawValue = _value;
    this._value = isObject(_value) ? reactive(_value) : _value;
    triggerEffects(this.dep);
  }
}

export function ref(value: any) {
  return new RefImpl(value);
}
