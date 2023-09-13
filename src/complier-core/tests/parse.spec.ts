import { Nodes } from "../src/ast";
import { baseParse } from "../src/parse";

describe("Parse", () => {
  describe("插值解析", () => {
    test("简单插值", () => {
      const ast = baseParse("{{ msg }}");

      expect(ast.children[0]).toStrictEqual({
        type: Nodes.INTERPOLATION,
        content: {
          type: Nodes.SIMPLE_EXPRESSON,
          content: "msg",
        },
      });
    });
  });

  describe("标签解析", () => {
    test("简单标签", () => {
      const ast = baseParse("<div></div>");

      expect(ast.children[0]).toStrictEqual({
        type: Nodes.ELEMENT,
        tag: "div",
      });
    });
  });
});
