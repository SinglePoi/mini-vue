import { isObject } from "../shared/index";
import { patch } from "./renderer";

export function createComponentInstance(vnode) {
  const instance = {
    vnode,
    type: vnode.type,
    props: {},
    slots: [],
    setup: {},
  };
  return instance;
}

export function setupComponent(instance) {
  // props
  // slots
  // setup

  const Component = instance.type;
  const { setup } = Component;

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

export function setupRenderEffect(instance, container) {
  const subTree = instance.render();
  patch(subTree, container);
}
