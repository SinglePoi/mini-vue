export function transform(root, options) {
  // 创建上下文对象
  const context = createTransformContext(root, options);
  // 遍历树 - 深度优先搜索
  traverseNode(root, context);
}
function traverseNode(node: any, context) {
  // 获取自定义插件
  const transformNode = context.nodeTransforms;

  // 执行插件规则
  for (let i = 0; i < transformNode.length; i++) {
    const transform = transformNode[i];
    transform(node);
  }

  traverseChildren(node.children, context);
}

function traverseChildren(children, context) {
  if (children) {
    for (let i = 0; i < children.length; i++) {
      const node = children[i];
      traverseNode(node, context);
    }
  }
}

function createTransformContext(root: any, options: any) {
  const context = {
    root,
    nodeTransforms: options.nodeTransforms || [],
  };

  return context;
}
