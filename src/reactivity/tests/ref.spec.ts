import { effect } from "../src/effect";
import { isProxy, isReactive, reactive } from "../src/reactive";
import { isRef, proxyRef, ref, unRef } from "../src/ref";

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
  it("4、isRef 判断目标是否通过 ref 创建", () => {
    const just_ref = ref(1);
    const _user = {
      age: 1,
    };
    const react_user = reactive(_user);
    const ref_user = ref(_user);

    expect(isRef(just_ref)).toBe(true);
    expect(isRef(react_user)).toBe(false);
    expect(isRef(ref_user)).toBe(true);
    expect(isReactive(ref_user.value)).toBe(true);
  });

  it("5、unRef 返回 ref.value 或本身", () => {
    const just_ref = ref(1);
    const _user = {
      age: 1,
    };
    const one = 1;

    expect(unRef(just_ref)).toBe(1);
    expect(unRef(one)).toBe(1);
  });
  it("6、proxyRef 可以使目标 ref 获取值时不再需要 .value", () => {
    const user = {
      age: ref(0),
      name: "xiaohong",
    };

    const proxyUser = proxyRef(user);
    expect(user.age.value).toBe(0);
    expect(proxyUser.age).toBe(0);
    expect(proxyUser.name).toBe("xiaohong");

    // 对 proxyUser 的修改，也应该反映到源 ref 中
    proxyUser.age = 20;
    expect(proxyUser.age).toBe(20);
    expect(user.age.value).toBe(20);

    proxyUser.age = ref(10);
    expect(proxyUser.age).toBe(10);
    expect(user.age.value).toBe(10);

    // proxyUser 是否是 proxy ?
    // expect(isProxy(proxyUser)).toBe(true);
  });
});
