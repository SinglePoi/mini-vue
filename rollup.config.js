import pkg from "./package.json" assert { type: "json" };
import typescript from "@rollup/plugin-typescript";
export default {
  input: "./src/index.ts", // 入口文件
  output: [
    // 打包输出文件
    {
      format: "cjs",
      file: pkg.main,
    },
    {
      format: "esm",
      file: pkg.module,
    },
  ],
  plugins: [typescript()],
};
