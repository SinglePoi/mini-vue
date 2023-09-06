import { h } from "../../lib/mini-vue.esm.js";
import ArrayToText from "./ArrayToText.js";
import TextToText from "./TextToText.js";
import TextToArray from "./TextToArray.js";

export const App = {
  name: "App",
  setup() {
    return {};
  },
  render() {
    return h("div", { tId: "1" }, [h("p", {}, "主页"), h(TextToArray)]);
  },
};

export default App;
