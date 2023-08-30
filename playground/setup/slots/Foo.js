import { h, renderSlots } from "../../../lib/mini-vue.esm.js";

export const Foo = {
  name: "Foo",
  setup() {},
  render() {
    const foo = h("p", {}, "foo");
    console.log(this.$slots);
    return h("div", {}, [
      renderSlots(this.$slots, "header"),
      foo,
      renderSlots(this.$slots, "footer"),
    ]);
  },
};

export default Foo;
