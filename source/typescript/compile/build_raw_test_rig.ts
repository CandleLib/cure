import { JSNode, JSNodeType, stmt } from "@candlefw/js";
import { RawTestRig } from "../types/raw_test.js";
import { Reporter } from "../main.js";
import { compileAssertionSite } from "./assertion_site/compile_assertion_site.js";
import { jst } from "./jst.js";
import { parseAssertionArguments } from "./parse_assertion_site_args.js";

export function buildRawTestRig(
    call_expression: JSNode,
    reporter: Reporter,
    index = 0
): RawTestRig {

    const { assertion_expr, BROWSER, INSPECT, SKIP, SOLO, name, timeout_limit } = parseAssertionArguments(call_expression);

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
        throw call_expression.pos.throw(`Could not find an expression for assertion site${call_expression.pos.slice()}`);

    const { ast } = compileAssertionSite(assertion_expr, reporter);

    return <RawTestRig><any>{
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
        timeout_limit
    };
}
