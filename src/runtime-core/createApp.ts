import { render } from "./renderer";
import { createVNode } from "./vnode";

export function createApp(rootComponent) {
  return {
    mount(rootContainer) {
      // 创建虚拟节点 vnode
      const vnode = createVNode(rootComponent);

      // 通过 vnode 去渲染真实节点
      render(vnode, rootContainer);
    },
  };
}
