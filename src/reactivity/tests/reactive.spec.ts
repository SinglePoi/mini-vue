import { reactive } from "../src/reactive";

describe("reactive", () => {
  const _user = {
    name: "ming",
  };
  const user = reactive(_user);
  it("reactive 构造的对象具备最基础的 get/set 操作", () => {
    // getter
    expect(user.name).toBe("ming");

    //setter
    user.name = "hong";
    expect(user.name).toBe("hong");
  });
  it("reactive 构造的对象不再是原对象", () => {
    expect(user).not.toBe(_user);
  });
});
