import { h } from "../../../lib/mini-vue.esm.js";

export const Foo = {
  name: "Foo",
  setup(props, { emit }) {
    const emitAdd = () => {
      emit("add", 1, 2);
      emit("foo-add");
    };
    return {
      emitAdd,
    };
  },
  render() {
    const btn = h("button", { onClick: this.emitAdd }, "emitAdd");
    const foo = h("p", {}, "foo");
    return h("div", { class: "blue" }, [foo, btn]);
  },
};

export default Foo;
