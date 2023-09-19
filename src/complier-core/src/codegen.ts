import { NodeTypes } from "./ast";
import { TO_DISPLAY_STRING, helperMapName } from "./runtimeHelpers";

export function generate(ast) {
  // 创建上下文对象
  const context = createCodegenContext();
  const { push } = context;
  push("return");

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
  const VueBinging = "vue";
  const aliasHelper = (v) => `${helperMapName[v]}: _${helperMapName[v]}`;
  if (ast.helpers.length > 0) {
    context.push(
      ` const { ${ast.helpers.map(aliasHelper).join(",")} } = "${VueBinging}"\n`
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
    default:
      break;
  }
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
