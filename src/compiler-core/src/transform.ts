import { NodeTypes } from "./ast";
import { TO_DISPLAY_STRING } from "./runtimeHelpers";

export function transform(root, options = {}) {
  // 创建上下文对象
  const context = createTransformContext(root, options);
  // 遍历树 - 深度优先搜索
  traverseNode(root, context);

  // 生成需要代码生成的内容
  createCodegenNode(root);

  // 不同节点对应的处理方法，一般在 Vue 包中
  root.helpers = [...context.helpers.keys()];
}

function createCodegenNode(root) {
  const child = root.children[0];
  if (child.type === NodeTypes.ELEMENT) {
    root.codegenNode = child.codegenNode;
  } else {
    root.codegenNode = root.children[0];
  }
}
/**
 *
 * @param node 并不是根节点，因为在处理 children 时也会调用，此时的 node 是 children 节点
 * @param context 上下文对象
 */
function traverseNode(node: any, context) {
  // 获取自定义插件
  const transformNode = context.nodeTransforms;

  const exitFns: any = [];

  // 执行插件规则
  for (let i = 0; i < transformNode.length; i++) {
    const transform = transformNode[i];
    const onExit = transform(node, context);
    if (onExit) exitFns.push(onExit);
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

  let i = exitFns.length;
  while (i--) {
    exitFns[i]();
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
