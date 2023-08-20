import { add } from "./src/index";

describe("测试环境", () => {
  it("项目是否能够运行", () => {
    expect(true).toBe(true);
  });
  it("项目能否使用 es6", () => {
    expect(add(1, 2)).toBe(3);
  });
});
