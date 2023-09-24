import { computed } from "../src/computed";
import { reactive } from "../src/reactive";
import { vi } from "vitest";

describe("computed", () => {
  /**
   * computed 和 ref 很像，都是通过 .value 来获取值
   * 但是 computed 多了一个缓存的功能
   */
  it("computed 的基础功能", () => {
    const user = reactive({
      age: 10,
    });

    const age = computed(() => {
      return user.age;
    });

    expect(age.value).toBe(10);
  });
  it("computed 具备缓存能力", () => {
    const user = reactive({
      age: 10,
    });

    const getter = vi.fn(() => {
      return user.age;
    });

    const computed_age = computed(getter);

    // computed 在不取值时不应该执行 getter
    expect(getter).not.toHaveBeenCalled();

    // 取值时才会执行 getter
    expect(computed_age.value).toBe(10);
    expect(getter).toHaveBeenCalledTimes(1);

    // 依赖的响应式对象没有发生变化，computed 不该执行
    computed_age.value;
    expect(getter).toHaveBeenCalledTimes(1);

    // 依赖的响应式对象发生变化，computed 执行 getter
    user.age = 20;
    expect(getter).toHaveBeenCalledTimes(1);
    expect(computed_age.value).toBe(20);
    expect(getter).toHaveBeenCalledTimes(2);

    //
    computed_age.value;
    expect(getter).toHaveBeenCalledTimes(2);
  });
});
