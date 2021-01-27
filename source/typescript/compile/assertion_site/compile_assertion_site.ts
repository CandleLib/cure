import { JSNode, JSNodeType, JSNodeTypeLU, parser, renderCompressed, stmt } from "@candlefw/js";
import { AssertionSite } from "../../types/assertion_site.js";
import { Reporter } from "../../test.js";
import { jst } from "../../utilities/jst.js";
import { parseAssertionSiteArguments } from "./parse_assertion_site_args.js";
import { selectBindingCompiler } from "../expression_handler/expression_handler_manager.js";
import { traverse } from "@candlefw/conflagrate";

export function compileAssertionSite(
    call_expression: JSNode,
    reporter: Reporter,
    index = 0
): AssertionSite {

    const {
        assertion_expr,
        name_expression,
        BROWSER,
        INSPECT,
        SKIP,
        SOLO,
        name,
        timeout_limit
    } = parseAssertionSiteArguments(call_expression);

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
        throw call_expression.pos.throw(`Could not find an expression for assertion site [${call_expression.pos.slice()}]`);

    const { ast } = compileAssertionSiteTestExpression(assertion_expr, reporter),
        { pos } = assertion_expr,
        rig_name = name || renderCompressed(assertion_expr);
    return <AssertionSite><any>{
        type: "DISCRETE",
        index,
        name: rig_name,
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
                stmt(`$harness.pushTestResult(${index});`),
                ast,
                stmt(`$harness.setSourceLocation(${[pos.off, pos.line + 1, pos.column].join(",")});`),
                name_expression
                    ? stmt(`$harness.setResultName(${renderCompressed(name_expression)})`)
                    : stmt(`$harness.setResultName("${rig_name}")`),
                stmt(`$harness.popTestResult(${index});`),
            ]
        },
        expression: assertion_expr,
        timeout_limit
    };
}

/**
 * Compiles an Assertion Site. 
 * 
 * @param node - An expression node within the double parenthesize Assertion Site. 
 * @param reporter - A Reporter for color data.
 * @param origin File path of the source test file.
 */
export function compileAssertionSiteTestExpression(expr: JSNode, reporter: Reporter)
    : { ast: JSNode, optional_name: string; } {


    for (const binding_compiler of selectBindingCompiler(expr)) {

        if (binding_compiler.test(expr)) {

            const
                js_string = binding_compiler.build(expr),

                { highlight, message, match } = binding_compiler.getExceptionMessage(expr, reporter),

                error_data = [
                    `\`${message}\``,
                    `""`,
                    expr.pos.line + 1,
                    expr.pos.char,
                    `\`${match.replace(/"/g, "\"")}\``,
                    `\`${highlight.replace(/"/g, "\\\"")}\``
                ];

            const
                thr =
                    message ?
                        parser(`if(${js_string}) $harness.setException(new AssertionError(${error_data}));`).ast
                        : parser(`if(${js_string});`).ast;


            for (const { node, meta } of traverse(thr, "nodes")) {
                node.pos = expr.pos;
            }

            return { ast: thr || stmt(";"), optional_name: match };
        }
    }

    //Bypass the test
    return { ast: expr, optional_name: `Could not find a AssertionSiteCompiler for JSNode [${JSNodeTypeLU[expr.type]}]`, };
}
