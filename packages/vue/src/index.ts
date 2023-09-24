export * from "@hello-vue/runtime-dom";
import { baseCompile } from "@hello-vue/compiler-core";
import * as runtimDom from "@hello-vue/runtime-dom";

import { registerRuntimeCompiler } from "@hello-vue/runtime-dom";

function compileToFunction(template) {
  const { code } = baseCompile(template);
  //     const code = `const { toDisplayString: _toDisplayString, openBlock: _openBlock, createElementBlock: _createElementBlock } = Vue

  //     return function render(_ctx, _cache, $props, $setup, $data, $options) {
  //       return (_openBlock(), _createElementBlock("div", null, "hi," + _toDisplayString(_ctx.message), 1 /* TEXT */))
  //     }`;

  //   `return const { toDisplayString: _toDisplayString,createElementBlock: _createElementBlock } = "vue"\n
  //   return function render(_ctx,_cache) {return _createElementBlock( 'div', null, 'hi,'+ _toDisplayString(_ctx.message))}`
  const render = new Function("Vue", code)(runtimDom);
  return render;
}

registerRuntimeCompiler(compileToFunction);

// 旧的不变，新的创建。一键替换，旧的再见
