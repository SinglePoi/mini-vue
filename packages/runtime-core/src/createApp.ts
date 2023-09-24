import { createVNode } from "./vnode";

export function createAppAPI(render) {
  return function createApp(rootComponent) {
    return {
      mount(rootContainer) {
        // 创建虚拟节点 vnode
        const vnode = createVNode(rootComponent);

        // 通过 vnode 去渲染真实节点
        render(vnode, rootContainer);
      },
    };
  };
}
