import { createTextVNode, h } from "../../../lib/mini-vue.esm.js";
import Foo from "./Foo.js";
export const App = {
  name: "App",
  render() {
    const app = h("div", {}, "App");
    const slot1 = h("p", {}, "im slot template1");
    const slot2 = h("p", {}, "im slot template2");
    // 具名插槽
    const nameSlots = {
      header: slot1,
      footer: slot2,
    };
    // const foo = h(Foo, {}, nameSlots);
    /**
     * 作用域插槽：父组件能够读取子组件暴露的指定状态
     */
    const scopeSlots = {
      header: ({ age }) => h("p", {}, "我的年龄是" + age),
      footer: () => h("p", {}, "你好"),
    };
    const foo = h(Foo, {}, scopeSlots);
    return h("div", {}, [createTextVNode("123"), foo]);
  },
  setup() {
    return {
      msg: "在实现 setup 时，props 应该作为 setup 函数的第一个参数",
    };
  },
};

export default App;
