import { ShapeFlages } from "../shared/ShapeFlags";
import { isObject } from "../shared/index";

export const Fragment = Symbol("Fragment");
export const Text = Symbol("Text");

export function createVNode(type, props?, children?) {
  const vnode = {
    type,
    props,
    children,
    el: null,
    component: null,
    key: props?.key,
    shapeFlag: getShapeFlag(type),
  };

  // children
  if (typeof children === "string") {
    vnode.shapeFlag |= ShapeFlages.TEXT_CHILDREN;
  } else if (Array.isArray(children)) {
    vnode.shapeFlag |= ShapeFlages.ARRAY_CHILDREN;
  }

  // 如果 type 是组件 且 children 是对象类型，说明需要将 children 处理为 slots
  if (vnode.shapeFlag & ShapeFlages.STATEFUL_COMPONENT) {
    if (isObject(children)) {
      vnode.shapeFlag |= ShapeFlages.SLOT_CHILDREN;
    }
  }

  return vnode;
}

export function createTextVNode(text) {
  return createVNode(Text, {}, text);
}

function getShapeFlag(type) {
  return typeof type === "string"
    ? ShapeFlages.ELEMENT
    : ShapeFlages.STATEFUL_COMPONENT;
}
