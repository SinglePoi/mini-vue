import { h } from "../../../lib/mini-vue.esm.js";
export default {
  name: "Child",
  setup(props) {
    return {};
  },
  render(proxy) {
    console.log("=====", this.$props.msg);
    return h("div", {}, [
      h(
        "div",
        { a: this.$props.msg },
        "child - props - msg:" + this.$props.msg
      ),
    ]);
  },
};
