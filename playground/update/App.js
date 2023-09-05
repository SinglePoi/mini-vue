import { h, ref } from "../../lib/mini-vue.esm.js";

export const App = {
  name: "App",
  setup() {
    const count = ref(0);
    const onClick = () => {
      count.value++;
    };

    const props = ref({
      foo: "foo",
      bar: "bar",
    });

    const onChangePropsDemo1 = () => {
      props.value.foo = "new-foo";
    };

    const onChangePropsDemo2 = () => {
      props.value.foo = undefined;
    };

    const onChangePropsDemo3 = () => {
      props.value = {
        foo: "foo",
      };
    };

    return {
      count,
      onClick,
      props,
      onChangePropsDemo1,
      onChangePropsDemo2,
      onChangePropsDemo3,
    };
  },
  render() {
    return h("div", { id: "root", ...this.props }, [
      h("div", {}, "count:" + this.count),
      h(
        "button",
        {
          onClick: this.onClick,
        },
        "click"
      ),
      h(
        "button",
        {
          onClick: this.onChangePropsDemo1,
        },
        "changeProps 的值发生了改变，应该去修改"
      ),
      h(
        "button",
        {
          onClick: this.onChangePropsDemo2,
        },
        "changeProps 的值变成了 undefined ，应该被删除"
      ),
      h(
        "button",
        {
          onClick: this.onChangePropsDemo3,
        },
        "changeProps 的 bar 不存在了，应该被删除"
      ),
    ]);
  },
};

export default App;
