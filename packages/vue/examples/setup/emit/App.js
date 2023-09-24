import { h } from "../../../lib/mini-vue.esm.js";
import Foo from "./Foo.js";
export const App = {
  render() {
    return h(
      "div",
      {
        id: "root",
        class: ["red"],
      },
      [
        h("div", {}, "hi, " + this.msg),
        h(Foo, {
          onAdd: (...args) => {
            console.log("at App but add", args);
          },
          onFooAdd: (...args) => {
            console.log("at App but foo-add", args);
          },
        }),
      ]
    );
  },
  setup() {
    return {
      msg: "in the setup module, we want to set props as a parameter in the setup function",
    };
  },
};

export default App;
