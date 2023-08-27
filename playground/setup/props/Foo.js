import { h } from "../../../lib/mini-vue.esm.js";

export const Foo = {
  name: "Foo",
  setup(props) {
    // has props
    console.log(props);

    // props is shallow readonly
  },
  render() {
    return h("div", { class: "blue" }, "foo: " + this.count);
  },
};

export default Foo;
