import { effect } from "../src/effect";
import { reactive } from "../src/reactive";

describe("effect", () => {
  // effect 结合 reactive 来校验

  it("effect 函数应该立即执行一次", () => {
    const _user = {
      name: "ming",
    };
    const user = reactive(_user);
    let temp: string = "null";
    effect(() => {
      temp = user.name as string;
    });
    expect(temp).toBe(user.name);
  });
  it("effect 函数应该 reactive 对象触发 setter 方法时被触发", () => {
    const _user = {
      name: "ming",
    };
    const user = reactive(_user);
    let temp: string = "null";
    effect(() => {
      temp = user.name;
    });
    user.name = "hong";
    expect(temp).toBe("hong");
  });
});
