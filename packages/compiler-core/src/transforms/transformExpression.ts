import { NodeTypes } from "../ast";

// 插值处理插件
export function transformExpression(node) {
  if (node.type === NodeTypes.INTERPOLATION) {
    node.content = processExpression(node.content);
  }
}

function processExpression(node) {
  node.content = "_ctx." + node.content;
  return node;
}
