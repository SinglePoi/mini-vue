import {
  isReadonly,
  isReactive,
  reactive,
  readonly,
  shallowReadonly,
  isProxy,
} from "../src/reactive";

import { vi } from "vitest";

describe("reactive", () => {
  const _user = {
    name: "ming",
  };
  const user = reactive(_user);
  it("1、reactive 构造的对象具备最基础的 get/set 操作", () => {
    // getter
    expect(user.name).toBe("ming");

    // setter
    user.name = "hong";
    expect(user.name).toBe("hong");
  });
  it("2、reactive 构造的对象不再是原对象", () => {
    expect(user).not.toBe(_user);
  });
  it("3、readonly 使对象变得只读", () => {
    const r_user = readonly(_user);

    console.warn = vi.fn();

    // 开始前 name 值
    expect(r_user.name).toBe("hong");

    // 触发 readonly 的 set 方法
    r_user.name = "xinxin";
    // name 值不应该被改变
    expect(r_user.name).toBe("hong");
    // 且 console.warn 被调用
    expect(console.warn).toHaveBeenCalled();
  });
  it("4、isReadonly 判断对象是否经过 readonly 处理", () => {
    const r_user = readonly(_user);
    expect(isReadonly(r_user)).toBe(true);
  });
  it("5、isReative 判断对象是否经过 reactive 处理", () => {
    expect(isReactive(user)).toBe(true);
  });
  it("6、reactive 对对象的转化应该是深层次的", () => {
    const _product = {
      price: 12,
      // 配料
      batching: {
        carbohydrate: "20%", // 碳水化合物
      },
    };
    const product = reactive(_product);
    expect(isReactive(product)).toBe(true);
    expect(isReactive(product.batching)).toBe(true);
  });
  it("7、readonly 对对象的转化应该是深层次的", () => {
    const _product = {
      price: 12,
      // 配料
      batching: {
        carbohydrate: "20%", // 碳水化合物
      },
    };
    const product = readonly(_product);
    expect(isReadonly(product)).toBe(true);
    expect(isReadonly(product.batching)).toBe(true);
  });
  it("8、shallowReadonly 对对象的转化应该是浅层次的", () => {
    const _product = {
      price: 12,
      // 配料
      batching: {
        carbohydrate: "20%", // 碳水化合物
      },
    };
    const product = shallowReadonly(_product);
    expect(isReadonly(product)).toBe(true);
    expect(isReadonly(product.batching)).toBe(false);
  });
  it("9、isProxy 判断对象是否时 Proxy 代理对象", () => {
    expect(isReactive(user)).toBe(true);
    expect(isProxy(user)).toBe(true);

    const r_user = readonly(_user);
    expect(isReadonly(r_user)).toBe(true);
    expect(isProxy(r_user)).toBe(true);
  });
});
