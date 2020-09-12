import { JSNode, JSNodeType, renderCompressed, stmt } from "@candlefw/js";
import { RawTestRig } from "../types/raw_test.js";
import { Reporter } from "../main.js";
import { compileAssertionSite } from "./assertion_site/compile_assertion_site.js";
import { jst } from "./jst.js";
export function buildAssertionSiteNode(
    expression: JSNode,
    reporter: Reporter,
    index = 0
): RawTestRig {

    let assertion_expr = null, BROWSER = null, INSPECT = false, SKIP = false, SOLO = false, name = "";

    for (const { node, meta: { skip } } of jst(expression.nodes[1], 2).skipRoot().makeSkippable()) {

        if (node.type == JSNodeType.IdentifierReference) {
            const val = node.value;

            // Remove the value from the node to 
            // prevent the node from contributing
            // to the assertion's required references


            if (val == "skip") {
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

        } else if (node.type == JSNodeType.StringLiteral) {
            if (name == "")
                name = <string>node.value;
            continue;
        }

        if (assertion_expr)
            throw node.pos.throw(`candidate assertion expression [${
                renderCompressed(assertion_expr)}] already passed to this function.`);

        assertion_expr = node;

        skip();
    }

    let AWAIT = false;

    const assert_site_inputs: Set<string> = new Set();

    for (const { node: { type, value } } of jst(assertion_expr)
        .filter("type",
            JSNodeType.AwaitExpression,
            JSNodeType.IdentifierReference,
            JSNodeType.IdentifierName,
            JSNodeType.IdentifierBinding,
            JSNodeType.Identifier,
            JSNodeType.Identifier))
        if (type == JSNodeType.AwaitExpression)
            AWAIT = true;
        else
            assert_site_inputs.add(<string>value);

    if (!assertion_expr)
        throw expression.pos.throw(`Could not find an expression for assertion site${expression.pos.slice()}`);

    const { ast } = compileAssertionSite(assertion_expr, reporter);

    return <RawTestRig>{
        type: "DISCRETE",
        index,
        name,
        RUN: !SKIP,
        SOLO,
        INSPECT,
        IS_ASYNC: AWAIT,
        BROWSER,
        error: null,
        imports: [],
        pos: assertion_expr.pos,
        ast: {
            type: JSNodeType.Script,
            nodes: [
                stmt(`$harness.test_index = ${index}; `),
                ast
            ]
        },
        expression: assertion_expr,
    };
}
