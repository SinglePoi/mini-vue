import { h, inject, provide } from "../../../lib/mini-vue.esm.js";

const Provider = {
  name: "Provide",
  setup() {
    provide("foo", "fooVal");
    provide("bar", "barVal");
  },
  render() {
    return h("div", {}, [h("p", {}, `第一层 Provider`), h(ProviderT)]);
  },
};

const ProviderT = {
  name: "Provide",
  setup() {
    provide("foo", "fooTwo");
    const foo = inject("foo");
    return {
      foo,
    };
  },
  render() {
    return h("div", {}, [
      h("p", {}, `第二层 Provider, ${this.foo}`),
      h(Consumer),
    ]);
  },
};

const Consumer = {
  name: "Consumer",
  setup() {
    const foo = inject("foo");
    const bar = inject("bar");
    const baz = inject("baz", "defaultBaz");
    return { foo, bar, baz };
  },
  render() {
    return h("div", {}, `Consumer- ${this.foo} - ${this.bar} - ${this.baz}`);
  },
};

export default {
  name: "App",
  setup() {},
  render() {
    return h("div", {}, [h("p", {}, "apiinject"), h(Provider)]);
  },
};
