import { exp, JSCallExpression, JSIdentifierReference, JSNode, JSNodeType, renderCompressed } from "@candlelib/js";
import { Logger, LogLevel } from '@candlelib/log';
import URL from "@candlelib/uri";
import { AssertionSite } from "../../types/assertion_site.js";
import { CompilerState } from "../../types/compiler_state";
import { createHierarchalName } from "../../utilities/name_hierarchy.js";
import { setUnion } from "../../utilities/sets.js";
import { createTargetedTestError } from "../../utilities/test_error.js";
import { THROWABLE_TEST_OBJECT_ID } from "../../utilities/throwable_test_object_enum.js";
import { compileEnclosingStatement, compileTestsFromSourceAST, packageAssertionSites } from "../compile_statements.js";
import { compileExpressionHandler, selectExpressionHandler } from "../expression_handler/expression_handler_functions.js";
import { createPopNameInstruction, createPushNameInstruction } from "../expression_handler/test_instructions.js";
import { empty_set } from "../utilities/empty_set.js";
import { jst, jstBreadth } from "../utilities/traverse_js_node.js";
import { parseAssertionSiteArguments } from "./parse_assertion_site_args.js";

function createAssertSiteObject(
    static_name: string,
    SKIP: boolean,
    SOLO: boolean,
    INSPECT: boolean,
    AWAIT: boolean,
    BROWSER: boolean,
    assertion_site_ast: JSNode,
    original_assertion_expression: JSNode,
    ast: JSNode,
    timeout_limit: number,
    source: string
): AssertionSite {
    return <AssertionSite>{
        throwable_id: THROWABLE_TEST_OBJECT_ID.ASSERTION_SITE,
        index: -1,
        static_name,
        RUN: true,
        SKIP,
        SOLO,
        INSPECT,
        IS_ASYNC: AWAIT,
        BROWSER: !!BROWSER,
        error: null,
        imports: [],
        pos: <any>(original_assertion_expression || assertion_site_ast).pos,
        timeout_limit,
        import_names: empty_set,
        origin: null,
        ast,
        source_path: source
    };
}

export function compileAssertionSite(
    state: CompilerState,
    assertion_call_node: JSCallExpression,
    LEAVE_ASSERTION_SITE: boolean,
): JSNode | void {

    (<JSIdentifierReference>assertion_call_node.nodes[0]).value = ""; // Forcefully delete assert name

    const {
        assertion_expr: assertion_expression,
        name_expression,
        BROWSER,
        INSPECT,
        SKIP,
        SOLO,
        name: static_name,
        timeout_limit
    } = parseAssertionSiteArguments(assertion_call_node);


    let HAVE_EXPRESSION_HANDLER = false;
    let HAVE_ASSERTION_EXPRESSION = !!assertion_expression;

    const

        AWAIT = (jst(assertion_expression)
            .filter("type", JSNodeType.AwaitExpression)
            .run(true)
            .length) > 0,

        ast = <JSNode><any>{
            type: JSNodeType.Script,
            nodes: []
        };

    let test_name = renderCompressed(assertion_expression);

    if (HAVE_ASSERTION_EXPRESSION && !SKIP) {

        for (const express_handler of selectExpressionHandler(assertion_expression, state.globals)) {

            if (express_handler.confirmUse(assertion_expression)) {

                const { nodes, name } = compileExpressionHandler(
                    assertion_expression,
                    express_handler,
                    [],
                    [],
                    state.globals,
                    name_expression ? renderCompressed(name_expression) : "",
                    static_name,
                    state.suite_name
                );

                test_name = name;

                //@ts-ignore
                ast.nodes = nodes;

                HAVE_EXPRESSION_HANDLER = true;

                break;
            }
        }
    }

    if (!HAVE_ASSERTION_EXPRESSION || !HAVE_EXPRESSION_HANDLER) {
        const expr = exp("skip");

        expr.pos = assertion_call_node.pos;

        const { nodes, name } = compileExpressionHandler(
            expr,
            null,
            [],
            [],
            state.globals,
            name_expression ? renderCompressed(name_expression) : "",
            static_name,
            state.suite_name
        );

        test_name = name;

        //@ts-ignore
        ast.nodes = nodes;

        HAVE_EXPRESSION_HANDLER = true;
        HAVE_ASSERTION_EXPRESSION = true;
    }

    const assertion_site = createAssertSiteObject(
        test_name,
        SKIP,
        SOLO,
        INSPECT,
        AWAIT || state.AWAIT,
        BROWSER,
        assertion_call_node,
        assertion_expression,
        ast,
        timeout_limit,
        state.globals.input_source
    ),
        prop = compileTestsFromSourceAST(
            state.globals,
            assertion_call_node,
            state.imported_modules
        );


    if (LEAVE_ASSERTION_SITE)
        for (const ref of prop.required_references.values())
            state.global_reference_ids.add(ref);

    // Make sure the site is valid

    if (!HAVE_ASSERTION_EXPRESSION) {
        state.globals.harness.pushTestResult();
        state.globals.harness.setResultName("Could not find an expression for assertion site");
        state.globals.harness.addException(createTargetedTestError(assertion_site, "Could not find an expression for assertion site", state.globals.harness));
        state.globals.harness.popTestResult();
        return null;
    }

    if (!HAVE_EXPRESSION_HANDLER) {
        const url = new URL(state.globals.input_source);
        state.globals.harness.pushTestResult();
        state.globals.harness.setResultName(createHierarchalName(
            url.path,
            `Could not find an ExpressionHandler for ${renderCompressed(assertion_expression)}`
        ));
        state.globals.harness.addException(createTargetedTestError(assertion_site, "Could not find an expression for assertion site", state.globals.harness));
        state.globals.harness.popTestResult();
        return null;
    }

    packageAssertionSites(state, prop, assertion_site);

    assertion_site.origin = state.ast;

    return LEAVE_ASSERTION_SITE ? assertion_site.ast : null;
}


export function compileAssertionGroupSite(
    state: CompilerState,
    node: JSNode,
    INSIDE_SEQUENCED_ASSERTION_GROUP: boolean
): JSNode {

    const

        { SEQUENCED, BROWSER, SOLO, timeout_limit, name, INSPECT, SKIP }
            = parseAssertionSiteArguments(node),

        RETURN_PROPS_ONLY = true,

        LEAVE_ASSERTION_SITE = SEQUENCED || INSIDE_SEQUENCED_ASSERTION_GROUP,

        OUTER_SCOPE_IS_INSIDE_SEQUENCED = INSIDE_SEQUENCED_ASSERTION_GROUP,

        block: JSNode = <JSNode>jstBreadth(node, 4).filter("type", JSNodeType.BlockStatement, JSNodeType.FunctionBody).run(true)[0];

    let prop = null;

    if (block) {
        try {

            //@ts-ignore
            block.nodes.unshift(createPushNameInstruction(name));
            //@ts-ignore
            block.nodes.push(createPopNameInstruction());
        } catch (e) {

            Logger.get("cure").get("error").activate(LogLevel.CRITICAL).critical(e);

            process.exit();
        }

        prop = block ? compileEnclosingStatement(
            Object.assign({}, state, { suite_name: createHierarchalName(state.suite_name, name) }),
            block,
            LEAVE_ASSERTION_SITE,
            OUTER_SCOPE_IS_INSIDE_SEQUENCED,
            RETURN_PROPS_ONLY
        ) : null;
    }


    if (prop) {

        if (LEAVE_ASSERTION_SITE) {

            const
                imports_ = new Set(prop.assertion_sites.flatMap(r => [...r.import_names.values()])),
                assertion_site =
                    createAssertSiteObject(
                        name,
                        SKIP,
                        SOLO || prop.assertion_sites.some(s => s.SOLO),
                        INSPECT || prop.assertion_sites.some(s => s.INSPECT),
                        prop.assertion_sites.some(s => s.IS_ASYNC),
                        BROWSER || prop.assertion_sites.some(s => s.BROWSER),
                        node,
                        node,
                        prop.stmt,
                        timeout_limit,
                        state.globals.input_source
                    );

            if (imports_.size > 0)
                prop.required_references = new setUnion(imports_, prop.required_references);

            packageAssertionSites(state, prop, assertion_site);

        } else {


            // mergeStatementReferencesAndDeclarations(state, prop);

            for (const assertion_site of prop.assertion_sites) {
                assertion_site.IS_ASYNC = assertion_site.IS_ASYNC || state.AWAIT || assertion_site.IS_ASYNC;
                assertion_site.static_name = createHierarchalName(name, assertion_site.static_name);
                assertion_site.BROWSER = assertion_site.BROWSER || BROWSER || assertion_site.BROWSER;
                assertion_site.SOLO = assertion_site.SOLO || SOLO || assertion_site.SOLO;
                assertion_site.RUN = assertion_site.RUN;
                assertion_site.SKIP = SKIP;
                assertion_site.INSPECT = assertion_site.INSPECT || INSPECT;
                assertion_site.origin = state.ast;
            }


            packageAssertionSites(state, prop);

            if (prop.stmt.nodes.length > 0) {
                //state.AWAIT = prop.AWAIT || state.AWAIT;
                //state.statement_references.push(prop);
            }
        }
    }

    return null;
}
