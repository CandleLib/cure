import { traverse } from "@candlefw/conflagrate";
import { JSNode, JSNodeType, JSNodeTypeLU, parser, renderCompressed, renderWithFormatting, stmt } from "@candlefw/js";
import { Reporter } from "../../test.js";
import { AssertionSite } from "../../types/assertion_site.js";
import { setUnion } from "../../utilities/sets.js";
import { compileLoopingStatement, CompileRawTestRigsOptions, compileTestsFromSourceAST } from "../compile_statements.js";
import { selectBindingCompiler } from "../expression_handler/expression_handler_manager.js";
import { getFirstBlockStatement } from "../utilities/get_first_block_statement.js";
import { replaceFirstBlockContentWithNodes } from "../utilities/replace_block_statement_contents.js";
import { jst } from "../utilities/traverse_js_node.js";
import { parseAssertionSiteArguments } from "./parse_assertion_site_args.js";

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

export function compileAssertionGroupSite(
    node: JSNode,
    OUTER_SEQUENCED: boolean,
    options: CompileRawTestRigsOptions
): JSNode {
    console.log(renderWithFormatting(node));
    const
        { statements, test_sites, report, imports }
            = options,

        block = getFirstBlockStatement(node),

        { SEQUENCED, BROWSER, SOLO, timeout_limit, assertion_expr: assert_expr, name }
            = parseAssertionSiteArguments(node), group_name = name,

        RETURN_PROPS_ONLY = true,

        LEAVE_ASSERTION_SITE = SEQUENCED || OUTER_SEQUENCED,

        OUT_SEQUENCED = true,

        prop = compileLoopingStatement(options,
            block,
            LEAVE_ASSERTION_SITE,
            OUT_SEQUENCED,
            RETURN_PROPS_ONLY
        );


    console.log({ prop });
    if (prop) {

        console.log(renderWithFormatting(node), LEAVE_ASSERTION_SITE);

        if (LEAVE_ASSERTION_SITE) {
            process.exit();
            const imports_ = new Set(prop.raw_rigs.flatMap(r => [...r.import_names.values()]));

            prop.required_references = new setUnion(imports_, prop.required_references);

            for (const rig of prop.raw_rigs) {

                if (group_name)
                    rig.name = group_name + "-->" + rig.name;

                rig.BROWSER = BROWSER || rig.BROWSER;

                rig.SOLO = SOLO || rig.SOLO;

                rig.ast = replaceFirstBlockContentWithNodes(assert_expr, rig.ast);

                test_sites.push(repackageRawTestRig(rig, prop, statements.length));
            }

            statements.push(prop);

            return prop.stmt;

        } else {

            process.exit();


            const prop = compileTestsFromSourceAST(
                fn_stmt.type == JSNodeType.ArrowFunction ? fn_stmt.nodes[1] : fn_stmt,
                report,
                imports,
                false
            );

            for (const rig of prop.raw_rigs) {

                rig.ast = replaceFirstBlockContentWithNodes(node, rig.ast);

                test_sites.push(repackageRawTestRig(rig, prop, statements.length));
            }
            /*

            for (const rig of prop.raw_rigs) {

                if (group_name)
                    rig.name = group_name + "-->" + rig.name;

                rig.BROWSER = BROWSER || rig.BROWSER;

                rig.ast = replaceFirstBlockContentWithNodes(assert_expr, rig.ast);

                test_sites.push(repackageRawTestRig(rig, prop, statements.length));
            }
            */


        }
    }
    return null;
}
