/**
 * 实现 DOM 的渲染接口
 */

import { createRenderer } from "../runtime-core";
import { isOn } from "../shared";

function createElement(type) {
  console.log("createElement---------------", type);

  return document.createElement(type);
}
function patchProp(el, key, value) {
  console.log("patchProp---------------", el);
  if (isOn(key)) {
    const event = key.slice(2).toLowerCase();
    el.addEventListener(event, value);
  } else {
    el.setAttribute(key, value);
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
