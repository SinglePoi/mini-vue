import { isString } from "@hello-vue/shared";
import { NodeTypes } from "./ast";
import {
  CREATE_ELEMENT_VNODE,
  TO_DISPLAY_STRING,
  helperMapName,
} from "./runtimeHelpers";

export function generate(ast) {
  // 创建上下文对象
  const context = createCodegenContext();
  const { push } = context;

  // 生成导入文本
  genFuntionPreamble(ast, context);

  const functionName = "render";
  const args = ["_ctx", "_cache"];
  const signature = args.join(",");

  push("return");
  push(` function ${functionName}(${signature}) {`);
  push("return");
  genNode(ast.codegenNode, context);
  push("}");
  return {
    code: context.code,
  };
}

// 文件头部的导入
function genFuntionPreamble(ast, context) {
  const VueBinging = "Vue";
  const aliasHelper = (v) => `${helperMapName[v]}: _${helperMapName[v]}`;
  if (ast.helpers.length > 0) {
    context.push(
      ` const { ${ast.helpers.map(aliasHelper).join(",")} } = ${VueBinging}\n`
    );
  }
}

function createCodegenContext() {
  const context = {
    code: "",
    push(source) {
      context.code += source;
    },
    helper(key) {
      return `_${helperMapName[key]}`;
    },
  };

  return context;
}

// 这里是 return 的内容
function genNode(node: any, context: any) {
  switch (node.type) {
    case NodeTypes.TEXT:
      genText(node, context);
      break;
    case NodeTypes.INTERPOLATION:
      genInterpolation(node, context);
      break;
    case NodeTypes.SIMPLE_EXPRESSON:
      genExpresson(node, context);
      break;
    case NodeTypes.ELEMENT:
      genElement(node, context);
      break;
    case NodeTypes.COMPOUND_EXPRESSION:
      genCompoundExpression(node, context);
      break;
    default:
      break;
  }
}

function genCompoundExpression(node, context) {
  const { push } = context;
  const children = node.chidlren;

  for (let i = 0; i < children.length; i++) {
    const child = children[i];
    if (isString(child)) {
      push(child);
    } else {
      genNode(child, context);
    }
  }
}

function genElement(node, context) {
  const { push, helper } = context;
  const { tag, children, props } = node;
  push(` ${helper(CREATE_ELEMENT_VNODE)}(`);
  genNodeList(genNullable([tag, props, children]), context);
  // genNode(children, context);
  // 对 children 循环拼接
  // for (let i = 0; i < children.length; i++) {
  //   const child = children[i];
  //   genNode(child, context);
  // }

  push(")");
}

function genNodeList(nodes, context) {
  const { push } = context;

  for (let i = 0; i < nodes.length; i++) {
    const node = nodes[i];
    if (isString(node) || node === null) {
      push(" " + node);
    } else {
      genNode(node, context);
    }

    if (i < nodes.length - 1) {
      push(",");
    }
  }
}

function genNullable(args) {
  return args.map((i) => i || null);
}

function genExpresson(node, context) {
  const { push } = context;
  push(node.content);
}

function genInterpolation(node, context) {
  const { push, helper } = context;
  push(` ${helper(TO_DISPLAY_STRING)}(`);
  genNode(node.content, context);
  push(`)`);
}

function genText(node, context) {
  const { push } = context;
  push(` '${node.content}'`);
}
