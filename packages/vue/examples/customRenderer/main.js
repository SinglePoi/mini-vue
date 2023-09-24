import App from "./App.js";
import { createRenderer } from "../../lib/mini-vue.esm.js";

const game = new PIXI.Application({
  background: "#1099bb",
  width: 500,
  height: 500,
});

document.body.appendChild(game.view);

const renderer = createRenderer({
  createElement(type) {
    if (type === "rect") {
      const rect = new PIXI.Graphics();
      rect.beginFill(0xf00);
      rect.drawRect(0, 0, 100, 100);
      rect.endFill();

      return rect;
    }
  },
  patchProp(el, key, value) {
    el[key] = value;
  },
  insert(el, parent) {
    parent.addChild(el);
  },
});

const app = game.stage;
renderer.createApp(App).mount(app);
