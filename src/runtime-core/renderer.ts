import { ShapeFlages } from "../shared/ShapeFlags";
import { isObject, isOn } from "../shared/index";
import {
  createComponentInstance,
  setupComponent,
  setupRenderEffect,
} from "./component";
import { Fragment } from "./vnode";

export function render(vnode, rootContainer) {
  patch(vnode, rootContainer);
}

export function patch(vnode, rootContainer) {
  const { type, shapeFlag } = vnode;

  /**
   * 设置一个 Fragment type，专门用于处理 children
   */
  switch (type) {
    case Fragment:
      processFragment(vnode, rootContainer);
      break;

    default:
      if (ShapeFlages.STATEFUL_COMPONENT & shapeFlag) {
        processComponent(vnode, rootContainer);
      } else if (ShapeFlages.ELEMENT & shapeFlag) {
        processElement(vnode, rootContainer);
      }
      break;
  }
}

function processFragment(vnode, rootContainer) {
  mountChildren(vnode.children, rootContainer);
}

function processComponent(initialVnode, rootContainer) {
  // updateComponent
  mountComponent(initialVnode, rootContainer);
}

function mountComponent(initialVnode, rootContainer) {
  // 通过 vnode 创建的实例对象，用于处理 props、slots、setup
  const instance = createComponentInstance(initialVnode);

  // 去装载 props、slots、setup、render，这一过程可以认为是一种装箱
  setupComponent(instance);

  // 去挂载 render ，这一过程可以认为是一种开箱
  setupRenderEffect(instance, initialVnode, rootContainer);
}

function processElement(vnode, rootContainer) {
  mountElement(vnode, rootContainer);
}

function mountElement(vnode, rootContainer) {
  const { type, children, props, shapeFlag } = vnode;

  // 这里赋值给 vnode.el 是为了可以在 render 函数中调用 this.$el
  // 但需要注意这里的 vnode 指的是 element
  const el: Element = (vnode.el = document.createElement(type));

  // 处理 children
  if (ShapeFlages.TEXT_CHILDREN & shapeFlag) {
    el.textContent = children;
  } else if (ShapeFlages.ARRAY_CHILDREN & shapeFlag) {
    mountChildren(children, el);
  }

  // attribute
  for (const key in props) {
    const value = props[key];
    if (isOn(key)) {
      const event = key.slice(2).toLowerCase();
      el.addEventListener(event, value);
    } else {
      el.setAttribute(key, value);
    }
  }

  rootContainer.append(el);
}

function mountChildren(children, container) {
  children.forEach((vnode) => {
    patch(vnode, container);
  });
}
