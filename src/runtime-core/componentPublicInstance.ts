import { hasOwn } from "../shared/index";

const publicPropertiesMap = {
  /**
   * 这里使用了 instance.vnode ，指向当前组件实例
   * 但我们在 mountElement 函数中 el 是赋值给 element 的 vnode 的，这里并不同一个vnode
   * 所以才需要在 setupRenderEffect 函数的最后一步，将 element vnode 的 el 再赋值给 instance.vnode 的 el
   * @param i -> instance
   * @returns
   */
  $el: (i) => i.vnode.el,
};
export const PublicInstanceProxyHandlers = {
  get({ _: instance }, key) {
    const { setupState, props } = instance;

    const publicGetter = publicPropertiesMap[key];

    if (hasOwn(setupState, key)) {
      return setupState[key];
    } else if (hasOwn(props, key)) {
      return props[key];
    }

    if (publicGetter) {
      return publicGetter(instance);
    }
  },
  set(target, key, newValue) {
    return true;
  },
};
