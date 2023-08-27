import { ShapeFlages } from "../shared/ShapeFlags";

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

  return vnode;
}

function getShapeFlag(type) {
  return typeof type === "string"
    ? ShapeFlages.ELEMENT
    : ShapeFlages.STATEFUL_COMPONENT;
}
