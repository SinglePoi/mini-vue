import { isObject } from "../shared/index";
import { patch } from "./renderer";

export function createComponentInstance(vnode) {
  const instance = {
    vnode,
    type: vnode.type,
    props: {},
    slots: [],
    setupState: {},
  };
  return instance;
}

export function setupComponent(instance) {
  // props
  // slots
  // setup
  setupStatefulComponent(instance);
}

function setupStatefulComponent(instance) {
  const Component = instance.type;
  const { setup } = Component;

  // 设置一个代理，用于在 render 函数中可以使用 this 调用
  instance.proxy = new Proxy(
    {},
    {
      get(target, key) {
        const { setupState } = instance;
        debugger;
        if (key in setupState) {
          return setupState[key];
        }

        if (key === "$el") {
          return instance.vnode.el;
        }
      },
      set(target, key, newValue) {
        return true;
      },
    }
  );

  if (setup) {
    const setupResult = setup();

    handlerSetupResult(instance, setupResult);
  }
}

function handlerSetupResult(instance, setupResult) {
  /**
   * setupResult: function | object
   */
  if (isObject(setupResult)) {
    instance.setupState = setupResult;
  }

  // 确保组件的 render 是有值的
  finishComponentSetup(instance);
}

function finishComponentSetup(instance) {
  const Component = instance.type;
  if (Component.render) {
    instance.render = Component.render;
  }
}

export function setupRenderEffect(instance, vnode, container) {
  const subTree = instance.render.call(instance.proxy);
  patch(subTree, container);

  vnode.el = subTree.el;
}
