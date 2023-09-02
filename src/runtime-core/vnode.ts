import { ShapeFlages } from "../shared/ShapeFlags";
import { isObject } from "../shared/index";

export const Fragment = Symbol("Fragment");

export function createVNode(type, props?, children?) {
  const vnode = {
    type,
    props,
    children,
    el: null,
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

function getShapeFlag(type) {
  return typeof type === "string"
    ? ShapeFlages.ELEMENT
    : ShapeFlages.STATEFUL_COMPONENT;
}
