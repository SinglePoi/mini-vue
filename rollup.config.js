import typescript from "@rollup/plugin-typescript";
export default {
  input: "./packages/vue/src/index.ts", // 入口文件
  output: [
    // 打包输出文件
    {
      format: "cjs",
      file: "packages/vue/dist/hello-vue.cjs.js",
    },
    {
      format: "esm",
      file: "packages/vue/dist/hello-vue.esm.js",
    },
  ],
  plugins: [typescript()],
};
