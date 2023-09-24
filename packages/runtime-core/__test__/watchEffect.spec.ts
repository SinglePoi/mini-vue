import { reactive } from "@hello-vue/reactivity";
import { watchEffect } from "../src/apiWatch";
import { nextTick } from "../src/queueJobs";
import { expect, vi } from "vitest";

describe("wacthEffect", () => {
  it("init", async () => {
    const state = reactive({ count: 0 });
    let dummy;
    watchEffect(() => {
      dummy = state.count;
    });
    expect(dummy).toBe(0);

    state.count++;
    await nextTick();

    expect(dummy).toBe(1);
  });

  it("onStop", async () => {
    const state = reactive({ count: 0 });
    let dummy;
    const stop: any = watchEffect(() => {
      dummy = state.count;
    });
    expect(dummy).toBe(0);

    stop();
    state.count++;
    await nextTick();
    expect(dummy).toBe(0);
  });

  it("onCleanUp", async () => {
    const state = reactive({ count: 0 });
    const cleanup = vi.fn();
    let dummy;

    const stop: any = watchEffect((onCleanup) => {
      onCleanup(cleanup);
      dummy = state.count;
    });
    expect(dummy).toBe(0);
    state.count++;
    await nextTick();
    expect(cleanup).toHaveBeenCalledTimes(1);
    expect(dummy).toBe(1);

    stop();
    expect(cleanup).toHaveBeenCalledTimes(2);
  });
});
