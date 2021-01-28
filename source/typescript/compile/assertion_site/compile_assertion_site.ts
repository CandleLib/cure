import { traverse } from "@candlefw/conflagrate";
import { JSNode, JSNodeType, JSNodeTypeLU, parser, renderCompressed, stmt } from "@candlefw/js";
import { AssertionSite } from "../../types/assertion_site.js";
import { CompilerState } from "../../types/compiler_state";
import { assertionSiteSoftError } from "../../utilities/library_errors.js";
import { createHierarchalName } from "../../utilities/name_hierarchy.js";
import { setUnion } from "../../utilities/sets.js";
import { combinePropRefsAndDecl, compileLoopingStatement, compileTestsFromSourceAST, packageAssertionSites } from "../compile_statements.js";
import { selectExpressionHandler } from "../expression_handler/expression_handler_manager.js";
import { empty_set } from "../utilities/empty_set.js";
import { jst } from "../utilities/traverse_js_node.js";
import { parseAssertionSiteArguments } from "./parse_assertion_site_args.js";

function createAssertSiteObject(
    static_name: string,
    SKIP: boolean,
    SOLO: boolean,
    INSPECT: boolean,
    AWAIT: boolean,
    BROWSER: any,
    original_assertion_expression: JSNode,
    ast: JSNode,
    timeout_limit: number
): AssertionSite {
    return <AssertionSite>{
        index: -1,
        static_name,
        RUN: !SKIP,
        SOLO,
        INSPECT,
        IS_ASYNC: AWAIT,
        BROWSER,
        error: null,
        imports: [],
        pos: original_assertion_expression.pos,
        expression: original_assertion_expression,
        timeout_limit,
        import_names: empty_set,
        ast,
    };
}

/**
 * Compiles an Assertion Site. 
 * 
 * @param node - An expression node within the double parenthesize Assertion Site. 
 * @param reporter - A Reporter for color data.
 * @param origin File path of the source test file.
 */
export function compileAssertionSiteTestExpression(state: CompilerState, expr: JSNode)
    : { ast: JSNode, optional_name: string; } {

    for (const binding_compiler of selectExpressionHandler(expr, state.globals)) {

        if (binding_compiler.test(expr)) {

            const
                js_string = binding_compiler.build(expr),

                { highlight, message, match } = binding_compiler.getExceptionMessage(expr, state.globals.reporter),

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

export function compileAssertionSite(
    state: CompilerState,
    node: JSNode,
    LEAVE_ASSERTION_SITE: boolean
): JSNode | void {

    node.nodes[0].value = ""; // Forcefully delete assert name

    const {
        assertion_expr,
        name_expression,
        BROWSER,
        INSPECT,
        SKIP,
        SOLO,
        name,
        timeout_limit
    } = parseAssertionSiteArguments(node);

    if (!assertion_expr) {
        assertionSiteSoftError(state.globals, node.pos.errorMessage(`Could not find an expression for assertion site [${node.pos.slice()}]`), "Could not find assertion site");
        return;
    }

    const
        AWAIT = jst(assertion_expr).filter("type", JSNodeType.AwaitExpression).run(true).length > 0,

        { ast: source_ast } = compileAssertionSiteTestExpression(state, assertion_expr),

        rig_name = name || renderCompressed(assertion_expr),

        { pos } = assertion_expr,

        ast: JSNode = <JSNode><any>{
            type: JSNodeType.Script,
            nodes: [
                stmt(`$harness.pushTestResult(${0});`),
                source_ast,
                stmt(`$harness.setSourceLocation(${[pos.off,
                pos.line + 1, pos.column].join(",")});`),
                name_expression
                    ? stmt(`$harness.setResultName(${renderCompressed(name_expression)})`)
                    : stmt(`$harness.setResultName("${rig_name}")`),
                stmt(`$harness.popTestResult(${0});`),
            ]
        };

    const assertion_site = createAssertSiteObject(
        rig_name,
        SKIP, SOLO,
        INSPECT, AWAIT,
        BROWSER,
        assertion_expr,
        ast,
        timeout_limit
    ),
        prop = compileTestsFromSourceAST(
            state.globals,
            node,
            state.imports
        );

    packageAssertionSites(state, prop, assertion_site);

    if (LEAVE_ASSERTION_SITE)
        for (const ref of prop.required_references.values())
            state.global_references.add(ref);

    return LEAVE_ASSERTION_SITE ? assertion_site.ast : null;
}


export function compileAssertionGroupSite(
    state: CompilerState,
    node: JSNode,
    OUTER_SEQUENCED: boolean
): JSNode {

    const
        { statements, tests: tests }
            = state,

        { SEQUENCED, BROWSER, SOLO, timeout_limit, name, INSPECT, SKIP }
            = parseAssertionSiteArguments(node),

        RETURN_PROPS_ONLY = true,

        LEAVE_ASSERTION_SITE = SEQUENCED || OUTER_SEQUENCED,

        OUT_SEQUENCED = true,

        prop = compileLoopingStatement(
            state,
            node,
            LEAVE_ASSERTION_SITE,
            OUT_SEQUENCED,
            RETURN_PROPS_ONLY
        );

    if (prop) {

        if (LEAVE_ASSERTION_SITE) {


            const
                imports_ = new Set(prop.assertion_sites.flatMap(r => [...r.import_names.values()])),
                assertion_site =
                    createAssertSiteObject(
                        name,
                        SKIP,
                        SOLO,
                        INSPECT,
                        prop.assertion_sites.some(s => s.IS_ASYNC),
                        BROWSER,
                        node,
                        prop.stmt,
                        timeout_limit
                    );

            if (imports_.size > 0)
                prop.required_references = new setUnion(imports_, prop.required_references);

            packageAssertionSites(state, prop, assertion_site);

        } else {

            combinePropRefsAndDecl(state, prop);

            for (const assertion_site of prop.assertion_sites) {
                assertion_site.static_name = createHierarchalName(name, assertion_site.static_name);
                assertion_site.BROWSER = assertion_site.BROWSER || BROWSER;
                assertion_site.SOLO = assertion_site.SOLO || SOLO;
                assertion_site.RUN = assertion_site.RUN || !SKIP;
                assertion_site.INSPECT = assertion_site.INSPECT || INSPECT;
            }

            packageAssertionSites(state, prop);

            if (prop.stmt.nodes.length > 0) {
                state.AWAIT = prop.AWAIT || state.AWAIT;
                statements.push(prop);
            }
        }
    }

    return null;
}
