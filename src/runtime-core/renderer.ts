import { isObject } from "../shared/index";
import {
  createComponentInstance,
  setupComponent,
  setupRenderEffect,
} from "./component";

export function render(vnode, rootContainer) {
  patch(vnode, rootContainer);
}

export function patch(vnode, rootContainer) {
  /**
   * vnode.type: object | string
   */
  const { type } = vnode;
  if (isObject(type)) {
    processComponent(vnode, rootContainer);
  } else if (typeof type === "string") {
    processElement(vnode, rootContainer);
  }
}

function processComponent(vnode, rootContainer) {
  // updateComponent
  mountComponent(vnode, rootContainer);
}

function mountComponent(vnode, rootContainer) {
  // 通过 vnode 创建的实例对象，用于处理 props、slots、setup
  const instance = createComponentInstance(vnode);

  // 去装载 props、slots、setup、render，这一过程可以认为是一种装箱
  setupComponent(instance);

  // 去挂载 render ，这一过程可以认为是一种开箱
  setupRenderEffect(instance, rootContainer);
}

function processElement(vnode, rootContainer) {
  mountElement(vnode, rootContainer);
}

function mountElement(vnode, rootContainer) {
  const { type, children, props } = vnode;
  const el: Element = document.createElement(type);

  // 处理 children
  if (typeof children === "string") {
    el.textContent = children;
  } else if (Array.isArray(children)) {
    mountChildren(children, el);
  }
  // attribute
  for (const key in props) {
    const value = props[key];
    el.setAttribute(key, value);
  }

  rootContainer.append(el);
}

function mountChildren(children, container) {
  children.forEach((vnode) => {
    patch(vnode, container);
  });
}
