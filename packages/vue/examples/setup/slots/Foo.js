import { h, renderSlots } from "../../../dist/hello-vue.esm.js";

export const Foo = {
  name: "Foo",
  setup() {},
  render() {
    const age = 18;
    const foo = h("p", {}, "foo");
    console.log(this.$slots);
    return h("div", {}, [
      // 如果 slots 是数组，而数组中又必须是 vnode，依靠 renderSlots 将数组转换为 vnode
      renderSlots(this.$slots, "header", { age }),
      foo,
      renderSlots(this.$slots, "footer"),
    ]);
  },
};

export default Foo;
