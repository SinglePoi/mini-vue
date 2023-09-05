/**
 * 实现 DOM 的渲染接口
 */

import { createRenderer } from "../runtime-core";
import { isOn } from "../shared";

function createElement(type) {
  console.log("createElement---------------", type);

  return document.createElement(type);
}
function patchProp(el, key, prevProp, nextProp) {
  console.log("patchProp---------------", el);
  if (isOn(key)) {
    const event = key.slice(2).toLowerCase();
    el.addEventListener(event, nextProp);
  } else {
    // 场景二：当新节点对比旧节点的属性值为 null 或 undefined 时，应该去删除这部分 props
    if (nextProp === undefined || nextProp === null) {
      el.removeAttribute(key);
    } else {
      el.setAttribute(key, nextProp);
    }
  }
}
function insert(el, parent) {
  console.log("insert---------------", el);
  parent.append(el);
}

const renderer: any = createRenderer({
  createElement,
  patchProp,
  insert,
});

export function createApp(...arg) {
  return renderer.createApp(...arg);
}

export * from "../runtime-core/index";
