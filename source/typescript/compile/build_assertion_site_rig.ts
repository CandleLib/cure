import { JSNode, JSNodeType, renderCompressed } from "@candlefw/js";
import { RawTestRig } from "../types/raw_test.js";
import { Reporter } from "../main.js";
import { compileAssertionSite } from "./assertion_site/compile_assertion_site.js";
import { jst } from "./jst.js";
export function buildAssertionSiteNode(
    expression: JSNode,
    reporter: Reporter,
    name = "",
    SOLO = false,
    INSPECT = false,
    SKIP = false
): RawTestRig {

    let assertion_expr = null, BROWSER = null;

    for (const { node, meta: { index } } of jst(expression.nodes[1], 2).skipRoot()) {

        if (node.type == JSNodeType.IdentifierReference) {
            if (node.value == "skip") {

                SKIP = true;
                continue;
            } else if (node.value == "only" || node.value == "solo") {

                SOLO = true;
                continue;
            } else if (node.value == "inspect") {

                INSPECT = true;
                continue;
            } else if (node.value == "browser") {

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
        index: 0,
        expression: assertion_expr,
        name,
        ast,
        error: null,
        imports: [],
        pos: assertion_expr.pos,
        IS_ASYNC: AWAIT,
        SOLO,
        RUN: !SKIP,
        BROWSER,
        INSPECT
    };
}
