import { shallowReadonly } from "../reactivity/src/reactive";
import { isObject } from "../shared/index";
import { emit } from "./componentEmit";
import { initProps } from "./componentProps";
import { PublicInstanceProxyHandlers } from "./componentPublicInstance";
import { initSlots } from "./componentSlots";
import { patch } from "./renderer";

export function createComponentInstance(vnode) {
  const instance = {
    vnode,
    type: vnode.type,
    props: {},
    slots: {},
    setupState: {},
    emit: () => {},
  };

  instance.emit = emit.bind(null, instance) as any;

  return instance;
}

export function setupComponent(instance) {
  // props
  initProps(instance, instance.vnode.props);
  // slots
  initSlots(instance, instance.vnode.children);
  // setup
  setupStatefulComponent(instance);
}

function setupStatefulComponent(instance) {
  const { type: Component, props, emit } = instance;
  const { setup } = Component;

  // 设置一个代理，用于在 render 函数中可以使用 this 调用
  instance.proxy = new Proxy({ _: instance }, PublicInstanceProxyHandlers);

  if (setup) {
    const setupResult = setup(shallowReadonly(props), {
      emit,
    });

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

export function setupRenderEffect(instance, initialVnode, container) {
  const subTree = instance.render.call(instance.proxy);
  patch(subTree, container);

  // 在整个 element 渲染完毕后，再将 elementVnode 上的 el 赋值给当前组件的 el
  initialVnode.el = subTree.el;
}
