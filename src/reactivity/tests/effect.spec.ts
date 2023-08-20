import { effect } from "../src/effect";
import { reactive } from "../src/reactive";

describe("effect", () => {
  // effect 结合 reactive 来校验
  const _user = {
    name: "ming",
  };
  const user = reactive(_user);
  let temp: string = "null";
  it("effect 函数应该立即执行一次", () => {
    effect(() => {
      temp = user.name;
    });
    expect(temp).toBe(user.name);
  });
  it("effect 函数应该 reactive 对象触发 setter 方法时被触发", () => {
    effect(() => {
      temp = user.name;
    });
    user.name = "hong";
    expect(temp).toBe("hong");
  });
  it("effect 需要一个返回值,由开发者控制 effect 执行的时机", () => {
    let num = 0;
    const runner = effect(() => {
      // 这里有一个特例：num++ 目前是无法完成这个测试用例的，之后会解决
      num = num + 1;
      return "num";
    });

    expect(num).toBe(1);

    const r = runner();
    expect(num).toBe(2);
    expect(r).toBe("num");
  });
});
