import { h } from "../../dist/hello-vue.esm.js";
export const App = {
  render() {
    return h("div", { id: "root", class: ["red"] }, [
      h("p", { class: "red" }, "hi"),
      h("p", { class: "blue" }, "mini-vue"),
    ]);
  },
  setup() {
    return {
      msg: "mini-vue",
    };
  },
};

export default App;
