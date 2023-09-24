import { createApp } from "../../dist/hello-vue.esm.js";
import App from "./App.js";

const app = document.querySelector("#app");
createApp(App).mount(app);
