import { ref } from "../../dist/hello-vue.esm.js";

export const App = {
  name: "App",
  template: "<div>hi,{{count}}</div>",
  setup() {
    const count = (window.count = ref(1));
    return {
      message: "mini-vue",
      count,
    };
  },
};

export default App;
