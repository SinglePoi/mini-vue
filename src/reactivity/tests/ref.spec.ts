import { effect } from "../src/effect";
import { isReactive } from "../src/reactive";
import { ref } from "../src/ref";

describe("ref", () => {
  it("1、ref 应该通过 .value 获取值", () => {
    const v = ref(1);
    expect(v.value).toBe(1);
  });
  it("2、如果 ref 的参数是一个对象，应该应用 reactive", () => {
    const v = ref({
      age: 0,
    });

    expect(isReactive(v.value)).toBe(true);
    expect(v.value.age).toBe(0);
  });
  it("3、ref 也也应该具备依赖收集的能力", () => {
    const v = ref(1);
    let age: number = 0;
    let dummy;
    effect(() => {
      age++;
      dummy = v.value;
    });

    expect(age).toBe(1);
    expect(dummy).toBe(1);

    v.value = 2;
    expect(age).toBe(2);
    expect(dummy).toBe(2);

    v.value = 2;
    expect(age).toBe(2);
    expect(dummy).toBe(2);
  });
});
