import { h, renderSlots } from "../../../lib/mini-vue.esm.js";

export const Foo = {
  name: "Foo",
  setup() {},
  render() {
    const age = 18;
    const foo = h("p", {}, "foo");
    console.log(this.$slots);
    return h("div", {}, [
      renderSlots(this.$slots, "header", { age }),
      foo,
      renderSlots(this.$slots, "footer"),
    ]);
  },
};

export default Foo;
