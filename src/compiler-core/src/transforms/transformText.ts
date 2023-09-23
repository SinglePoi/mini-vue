import { NodeTypes } from "../ast";
import { isText } from "../utils";

export function transformText(node, context) {
  const { type, children } = node;

  let currentContainer;

  // 如果是标签
  if (type === NodeTypes.ELEMENT) {
    return () => {
      // 需要将标签包含的内容使用 + 号拼接起来
      for (let i = 0; i < children.length; i++) {
        const child = children[i];
        // 判断是否是文本或插值，
        if (isText(child)) {
          // 搜索下一个节点，同时去判断该节点是否是文本或插值
          for (let j = i + 1; j < children.length; j++) {
            const next = children[j];
            if (isText(next)) {
              // 收集内容
              if (!currentContainer) {
                currentContainer = children[i] = {
                  type: NodeTypes.COMPOUND_EXPRESSION,
                  chidlren: [child],
                };
              }

              currentContainer.chidlren.push("+");
              currentContainer.chidlren.push(next);
              children.splice(j, 1);
              j--;
            } else {
              currentContainer = undefined;
              break;
            }
          }
        }
      }
    };
  }
}
