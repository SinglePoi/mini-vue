import { h } from "../../../lib/mini-vue.esm.js";
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
    const foo = h(Foo, {}, nameSlots);
    return h("div", {}, [app, foo]);
  },
  setup() {
    return {
      msg: "in the setup module, we want to set props as a parameter in the setup function",
    };
  },
};

export default App;
