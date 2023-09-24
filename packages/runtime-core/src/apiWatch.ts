import { ReactiveEffect } from "..";
import { queuePreFlushCb } from "../src/queueJobs";

/**
 * @todo
 * a. watchEffect 的默认在节点更新前执行 fn
 * b. 如何判断节点关系，需要使用 effect 的第二个参数
 * @param fn
 */
export function watchEffect(source) {
  function job() {
    effect.run();
  }

  let cleanup;
  const onCleanup = function (fn) {
    cleanup = effect.onStop = () => {
      fn();
    };
  };

  function getter() {
    if (cleanup) {
      cleanup();
    }
    source(onCleanup);
  }

  /**
   * 在任务队列中将 fn 添加进去
   */
  const effect = new ReactiveEffect(getter, () => {
    queuePreFlushCb(job);
  });

  effect.run();

  return () => {
    effect.stop();
  };
}
