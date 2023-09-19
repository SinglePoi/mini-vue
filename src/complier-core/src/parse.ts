import { NodeTypes } from "./ast";

const enum TagType {
  START,
  END,
}

export function baseParse(content) {
  // 创建解析器上下文对象
  const context = createParserContext(content);
  return createRoot(parseChildren(context, []));
}

/**
 *
 * @param context 待解析的内容
 * @param ancestor 标签栈，用于判断标签是否闭合
 * @returns
 */
function parseChildren(context, ancestor?) {
  const nodes: any[] = [];

  while (!isEnd(context, ancestor)) {
    let node;
    const { source: s } = context;
    if (s.startsWith("{{")) {
      // 如果字符以 {{ 开头，认为是插值
      node = parseInterpolation(context);
    } else if (s[0] === "<") {
      if (s[1] === "/") {
        //用于匹配 </p> {{ message }} </div>
        if (/[a-z]/i.test(s[2])) {
          // 去除 </p>, 移动下标至下一个处理点
          parseTag(context, TagType.END);
          continue;
        }
      } else if (/[a-z]/i.test(s[1])) {
        // 用于匹配  <p>xxxx</p>
        node = parseElement(context, ancestor);
      }
    }

    // 处理文本
    if (!node) {
      node = parseText(context);
    }

    nodes.push(node);
  }
  return nodes;
}

/**
 * 满足解析完毕的条件
 * a、遇到结束标签(结束标签必须与开始标签一一对应)
 * b、解析目标的长度为 0
 * @param context 上下文对象
 * @returns a || b
 */
function isEnd(context, ancestor) {
  const source = context.source;
  if (source.startsWith("</")) {
    for (let i = ancestor.length - 1; i >= 0; i--) {
      const tag = ancestor[i].tag;
      if (startsWithEndTagOpen(context.source, tag)) {
        return true;
      }
    }
  }
  return !source;
}

function parseTextData(context, length) {
  const content = context.source.slice(0, length);
  advanceBy(context, length);

  return content;
}

function parseText(context) {
  const source = context.source;
  let endIndex = source.length;
  let endTokens = ["<", "{{"];

  // 寻找下一个处理点，以此判断本轮处理的结束位置 endIndex
  for (let i = 0; i < endTokens.length; i++) {
    const index = source.indexOf(endTokens[i]);
    if (index !== -1 && endIndex > index) {
      endIndex = index;
    }
  }

  // 文本内容
  const content = parseTextData(context, endIndex);

  return {
    type: NodeTypes.TEXT,
    content,
  };
}

function parseElement(context, ancestor) {
  const element: any = parseTag(context, TagType.START);
  ancestor.push(element);
  const children = parseChildren(context, ancestor);
  ancestor.pop();
  if (startsWithEndTagOpen(context.source, element.tag)) {
    parseTag(context, TagType.END);
  } else {
    throw new Error(`缺少闭合标签：${element.tag}`);
  }

  element.children = children;

  return element;
}

function startsWithEndTagOpen(source, tag) {
  /**
   * 如果是闭合标签，且和开始标签相同
   */
  return (
    source.startsWith("</") &&
    source.slice(2, 2 + tag.length).toLowerCase() === tag.toLowerCase()
  );
}

function parseTag(context, type: TagType) {
  //  [ '<div', 'div', index: 0, input: '<div></div>', groups: undefined ]
  const match: any = /^<\/?([a-z]*)/i.exec(context.source);
  // if (!match) return;
  // div
  const tag = match[1];
  advanceBy(context, match[0].length + 1);
  if (type === TagType.END) return;

  return {
    type: NodeTypes.ELEMENT,
    tag,
  };
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
  const content = parseTextData(context, rawContentLength).trim();
  // 推进下一步处理
  advanceBy(context, closeDelimiter.length);

  return {
    type: NodeTypes.INTERPOLATION,
    content: {
      type: NodeTypes.SIMPLE_EXPRESSON,
      content,
    },
  };
}

function advanceBy(context, length) {
  context.source = context.source.slice(length);
}

function createRoot(children) {
  return {
    children,
    type: NodeTypes.ROOT,
  };
}

function createParserContext(content: any) {
  return {
    source: content,
  };
}
