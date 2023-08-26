import { h } from "../../lib/mini-vue.esm.js";
export const App = {
  render() {
    return h("div", { id: "root", class: ["red"] }, "" + this.msg);
  },
  setup() {
    return {
      msg: "mini-vue",
    };
  },
};

export default App;
