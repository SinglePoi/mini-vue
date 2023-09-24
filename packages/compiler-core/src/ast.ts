import { CREATE_ELEMENT_VNODE } from "./runtimeHelpers";

export enum NodeTypes {
  INTERPOLATION,
  SIMPLE_EXPRESSON,
  ELEMENT,
  TEXT,
  ROOT,
  COMPOUND_EXPRESSION,
}

export function createVNodeCall(context, vnodeTag, vnodeProps, vnodeChildren) {
  context.helper(CREATE_ELEMENT_VNODE);
  const vnodeElement = {
    type: NodeTypes.ELEMENT,
    tag: vnodeTag,
    props: vnodeProps,
    children: vnodeChildren,
  };
  return vnodeElement;
}
