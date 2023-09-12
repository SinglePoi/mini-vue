import {
  h,
  ref,
  getCurrentInstance,
  nextTick,
} from "../../lib/mini-vue.esm.js";
export const App = {
  name: "App",
  render() {
    const button = h("button", { onClick: this.onclick }, "开始一百次更新");
    const view = h("p", {}, "现在是值是" + this.msg);
    return h("div", {}, [button, view]);
  },
  setup() {
    let msg = ref(0);

    const instance = getCurrentInstance();

    function onclick() {
      for (let i = 1; i < 101; i++) {
        msg.value = i;
      }

      // 查看点击时的组件实例，此时应该时没有更新的
      console.log("the instance is", instance);

      // nextTick 的作用就是将回调函数推入任务队列
      nextTick(() => {
        console.log("更新完毕", instance);
      });

      // await nextTick()
      // console.log('更新完毕');
    }
    return {
      msg,
      onclick,
    };
  },
};

export default App;
