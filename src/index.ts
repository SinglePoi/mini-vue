export * from "./runtime-dom";
import { baseCompile } from "./compiler-core/src";
import * as runtimDom from "./runtime-dom";

import { registerRuntimeCompiler } from "./runtime-dom";

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
