import { h, getCurrentInstance } from "../../../lib/mini-vue.esm.js";

export const Foo = {
  name: "Foo",
  setup(props, { emit }) {
    const instance = getCurrentInstance();
    console.log("Foo", instance);
  },
  render() {
    return h("div", {}, "foo");
  },
};

export default Foo;
