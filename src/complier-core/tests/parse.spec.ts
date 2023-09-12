import { Nodes } from "../src/ast";
import { baseParse } from "../src/parse";

describe("Parse", () => {
  describe("插槽", () => {
    test("初始化插槽", () => {
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
});
