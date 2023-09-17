import { NodeTypes } from "../src/ast";
import { baseParse } from "../src/parse";

describe("Parse", () => {
  describe("插值解析", () => {
    test("简单插值", () => {
      const ast = baseParse("{{ msg }}");

      expect(ast.children[0]).toStrictEqual({
        type: NodeTypes.INTERPOLATION,
        content: {
          type: NodeTypes.SIMPLE_EXPRESSON,
          content: "msg",
        },
      });
    });
  });

  describe("标签解析", () => {
    test("简单标签", () => {
      const ast = baseParse("<div></div>");

      expect(ast.children[0]).toStrictEqual({
        type: NodeTypes.ELEMENT,
        tag: "div",
        children: [],
      });
    });
  });

  describe("文本解析", () => {
    test("简单文本", () => {
      const ast = baseParse("some text");

      expect(ast.children[0]).toStrictEqual({
        type: NodeTypes.TEXT,
        content: "some text",
      });
    });
  });

  describe("联合解析", () => {
    test("单标签", () => {
      const ast = baseParse("<div>hi, {{ message }}</div>");

      expect(ast.children[0]).toStrictEqual({
        type: NodeTypes.ELEMENT,
        tag: "div",
        children: [
          {
            type: NodeTypes.TEXT,
            content: "hi, ",
          },
          {
            type: NodeTypes.INTERPOLATION,
            content: {
              type: NodeTypes.SIMPLE_EXPRESSON,
              content: "message",
            },
          },
        ],
      });
    });

    test("嵌套标签", () => {
      const ast = baseParse("<div><p>hi</p>{{ message }}</div>");

      expect(ast.children[0]).toStrictEqual({
        type: NodeTypes.ELEMENT,
        tag: "div",
        children: [
          {
            type: NodeTypes.ELEMENT,
            tag: "p",
            children: [
              {
                type: NodeTypes.TEXT,
                content: "hi",
              },
            ],
          },
          {
            type: NodeTypes.INTERPOLATION,
            content: {
              type: NodeTypes.SIMPLE_EXPRESSON,
              content: "message",
            },
          },
        ],
      });
    });
    test("缺少闭合标签应该抛出异常", () => {
      expect(() => baseParse("<div><span></div>")).toThrow(
        "缺少闭合标签：span"
      );
    });
  });
});
