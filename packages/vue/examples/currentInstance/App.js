import { h, getCurrentInstance } from "../../../lib/mini-vue.esm.js";
import Foo from "./Foo.js";
export const App = {
  name: "App",
  render() {
    return h("div", {}, [h("p", {}, "这是 currentInstance"), h(Foo)]);
  },
  setup() {
    const instance = getCurrentInstance();
    console.log("App:", instance);
  },
};

export default App;
