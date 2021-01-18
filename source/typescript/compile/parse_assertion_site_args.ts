import { JSNode, JSNodeType, renderCompressed } from "@candlefw/js";
import { jst } from "./jst.js";


export function parseAssertionArguments(call_node: JSNode): { assertion_expr: JSNode; SEQUENCED: boolean; BROWSER: boolean; INSPECT: boolean; SKIP: boolean; SOLO: boolean; name: string; timeout_limit: number; } {

    let assertion_expr = null, BROWSER = null, INSPECT = false, SKIP = false, SOLO = false, SEQUENCED = false, name = "", timeout_limit = 0;

    for (const { node, meta: { skip } } of jst(call_node.nodes[1], 2).skipRoot().makeSkippable()) {

        if (node.type == JSNodeType.IdentifierReference) {
            const val = (<string>node.value).toLowerCase();

            // Remove the value from the node to 
            // prevent the node from contributing
            // to the assertion's required references
            if (val == "sequence") {
                SEQUENCED = true;
            } else if (val == "skip") {
                node.value = "";
                SKIP = true;
                continue;
            } else if (val == "only" || val == "solo") {
                node.value = "";
                SOLO = true;
                continue;
            } else if (val == "inspect") {
                node.value = "";
                INSPECT = true;
                continue;
            } else if (val == "browser") {
                node.value = "";
                BROWSER = true;
                continue;
            }

        } else if (node.type == JSNodeType.NumericLiteral && Number.isInteger(parseFloat(<string>node.value))) {
            timeout_limit = parseFloat(<string>node.value);
        } else if (node.type == JSNodeType.StringLiteral) {
            if (name == "")
                name = <string>node.value;
            continue;
        } else {

            if (assertion_expr)
                throw node.pos.throw(`candidate assertion expression [${renderCompressed(assertion_expr)}] already passed to this function.`);

            assertion_expr = node;
        }

        skip();
    }

    return { assertion_expr, BROWSER, INSPECT, SKIP, SOLO, name, SEQUENCED, timeout_limit };
}
