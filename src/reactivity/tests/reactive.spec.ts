import { isReadonly, isReative, reactive, readonly } from "../src/reactive";

describe("reactive", () => {
  const _user = {
    name: "ming",
  };
  const user = reactive(_user);
  it("reactive 构造的对象具备最基础的 get/set 操作", () => {
    // getter
    expect(user.name).toBe("ming");

    // setter
    user.name = "hong";
    expect(user.name).toBe("hong");
  });
  it("reactive 构造的对象不再是原对象", () => {
    expect(user).not.toBe(_user);
  });
  it("readonly 使对象变得只读", () => {
    const r_user = readonly(_user);

    console.warn = jest.fn();

    // 开始前 name 值
    expect(r_user.name).toBe("hong");

    // 触发 readonly 的 set 方法
    r_user.name = "xinxin";
    // name 值不应该被改变
    expect(r_user.name).toBe("hong");
    // 且 console.warn 被调用
    expect(console.warn).toHaveBeenCalled();
  });
  it("isReadonly 判断对象是否经过 readonly 处理", () => {
    const r_user = readonly(_user);
    expect(isReadonly(r_user)).toBe(true);
  });
  it("isReative 判断对象是否经过 reactive 处理", () => {
    expect(isReative(user)).toBe(true);
  });
});
