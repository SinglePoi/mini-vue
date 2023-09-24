import { ShapeFlages } from "@hello-vue/shared";

export function initSlots(instance, children) {
  const { slots, vnode } = instance;
  // 如果需要 slots 才进行处理
  if (vnode.shapeFlag & ShapeFlages.SLOT_CHILDREN) {
    normalizeSlotObject(slots, children);
  }
}

function normalizeSlotObject(slots, children) {
  /**
   * createVnode 的第三个参数是 children
   * 进来的时候 slots 是空的
   * 此时的 children 是一个对象类型，遍历 children 的属性，将值处理之后赋值给 slots 对应的属性
   * 之后，slots 就拥有了值
   */
  for (const key in children) {
    const value = children[key];
    slots[key] = (props) => normalizeSlotValue(value(props));
  }
}

function normalizeSlotValue(value) {
  return Array.isArray(value) ? value : [value];
}
