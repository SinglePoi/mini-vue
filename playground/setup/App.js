import { h } from "../../lib/mini-vue.esm.js";
window.self = null;
export const App = {
  render() {
    self = this;
    return h("div", { id: "root", class: ["red"] }, "" + this.msg);
  },
  setup() {
    return {
      msg: "mini-vue",
    };
  },
};

export default App;
