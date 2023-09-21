import { NodeTypes, createVNodeCall } from "../ast";

export function transformElement(node, context) {
  if (node.type === NodeTypes.ELEMENT) {
    return () => {
      const vnodeTag = `'${node.tag}'`;

      let vnodeProps;

      const chidlren = node.children;
      let vnodeChildren = chidlren[0];

      const vnodeElement = {
        type: NodeTypes.ELEMENT,
        tag: vnodeTag,
        props: vnodeProps,
        children: vnodeChildren,
      };

      node.codegenNode = createVNodeCall(
        context,
        vnodeTag,
        vnodeProps,
        vnodeChildren
      );
    };
  }
}
