import { ReactiveEffectRunner, effect, stop } from "../src/effect";
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
  it("effect 函数应该在 reactive 对象触发 setter 方法时被触发", () => {
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
  it("增加 scheduler 参数，接受自定义的函数", () => {
    let dummy;
    let run;

    const user = reactive({
      age: 1,
    });

    // jest.fn 是 jest 特例化的 function，增加了 jest 监听的功能
    const scheduler = jest.fn(() => {
      run = runner;
    });

    const runner = effect(
      () => {
        dummy = user.age;
      },
      { scheduler }
    );

    /**
     * scheduler 的作用在于
     * 1、此时的 effect 只在定义时执行一次
     * 2、由响应式触发依赖时，只会执行 scheduler 函数
     * 3、但是 runner() 执行的仍是第一个参数
     */

    // 这是定义时执行的一次
    expect(dummy).toBe(1);
    // 此时 scheduler 不应该被执行
    expect(scheduler).not.toHaveBeenCalled();

    // 这里有一个特例：num++ 目前是无法完成这个测试用例的，之后会解决
    user.age = 2;
    expect(dummy).toBe(1);
    // scheduler 应该被执行一次
    expect(scheduler).toHaveBeenCalledTimes(1);

    run();
    // 执行 run 意味着，执行了 effect 的第一个函数
    expect(dummy).toBe(2);
  });

  it("stop 方法能够使 effect 暂时离开依赖队列，直到再次执行 runner", () => {
    let dummy;
    const user = reactive({
      age: 1,
    });
    const runner: ReactiveEffectRunner = effect(() => {
      dummy = user.age;
    });

    user.age = 2;
    // 此时 effect 会执行一次
    expect(dummy).toBe(2);

    stop(runner);
    user.age = 3;
    // effect 不应该被执行
    expect(dummy).toBe(2);

    runner();
    // effect 被手动执行
    expect(dummy).toBe(3);

    // 此时 stop 已经没用了，是这样的吗？
    stop(runner);
    user.age = 4;
    expect(dummy).toBe(4);
  });
  it("onStop: stop 的钩子函数,应该在调用 stop 时执行", () => {
    const user = reactive({
      age: 0,
    });
    const onStop = jest.fn();

    let dummy;
    const runner = effect(
      () => {
        dummy = user.age;
      },
      {
        onStop,
      }
    );
    stop(runner);
    expect(onStop).toHaveBeenCalled();
    expect(onStop).toHaveBeenCalledTimes(1);
  });
});
