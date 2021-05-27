import { JSNode, JSNodeType } from "@candlelib/js";
import { jstBreadth } from "./traverse_js_node.js";


export function getFirstBlockStatement(node: JSNode) {
    return jstBreadth(node, 4).filter("type", JSNodeType.BlockStatement, JSNodeType.FunctionBody).run(_ => _)[0];
}
