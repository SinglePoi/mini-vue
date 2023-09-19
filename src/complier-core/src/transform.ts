import { NodeTypes } from "./ast";
import { TO_DISPLAY_STRING } from "./runtimeHelpers";

export function transform(root, options = {}) {
  // 创建上下文对象
  const context = createTransformContext(root, options);
  // 遍历树 - 深度优先搜索
  traverseNode(root, context);

  // 生成需要代码生成的内容
  createCodegenNode(root);

  root.helpers = [...context.helpers.keys()];
}

function createCodegenNode(root) {
  root.codegenNode = root.children[0];
}
/**
 *
 * @param node 并不是根节点，因为在处理 children 时也会调用，此时的 node 是 children 节点
 * @param context 上下文对象
 */
function traverseNode(node: any, context) {
  // 获取自定义插件
  const transformNode = context.nodeTransforms;

  // 执行插件规则
  for (let i = 0; i < transformNode.length; i++) {
    const transform = transformNode[i];
    transform(node);
  }

  // 添加不同的节点类型的处理函数
  // 这些函数会在 codegen 阶段应用
  switch (node.type) {
    case NodeTypes.INTERPOLATION:
      context.helper(TO_DISPLAY_STRING);
      break;
    case NodeTypes.ROOT:
    case NodeTypes.ELEMENT:
      // 处理 children 内容
      traverseChildren(node.children, context);
      break;
    default:
      break;
  }
}

function traverseChildren(children, context) {
  for (let i = 0; i < children.length; i++) {
    const node = children[i];
    traverseNode(node, context);
  }
}

function createTransformContext(root: any, options: any) {
  const context = {
    root,
    nodeTransforms: options.nodeTransforms || [],
    helpers: new Map(),
    helper(key) {
      context.helpers.set(key, 1);
    },
  };

  return context;
}
