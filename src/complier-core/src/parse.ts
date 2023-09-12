import { Nodes } from "./ast";

export function baseParse(content) {
  // 创建上下文对象
  const context = createParserContext(content);
  return createRoot(parseChildren(context));
}

function parseChildren(context) {
  const nodes: any[] = [];
  let node;
  if (context.source.startsWith("{{")) {
    node = parseInterpolation(context);
  }

  nodes.push(node);

  return nodes;
}

function parseInterpolation(context) {
  // {{msg}}
  const openDelimiter = "{{";
  const closeDelimiter = "}}";

  const startIndex = openDelimiter.length;
  const closeIndex = context.source.indexOf(closeDelimiter, startIndex);

  // 推进下一步处理
  advanceBy(context, startIndex); // msg}}

  const rawContentLength = closeIndex - startIndex;

  const content = context.source.slice(0, rawContentLength).trim(); // msg

  console.log("content", content);

  // 推进下一步处理
  advanceBy(context, rawContentLength + closeDelimiter.length);

  return {
    type: Nodes.INTERPOLATION,
    content: {
      type: Nodes.SIMPLE_EXPRESSON,
      content: content,
    },
  };
}

function advanceBy(context, length) {
  context.source = context.source.slice(length);
}

function createRoot(children) {
  return {
    children,
  };
}

function createParserContext(content: any) {
  return {
    source: content,
  };
}
