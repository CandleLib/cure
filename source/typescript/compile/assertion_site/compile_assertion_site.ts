import { JSCallExpression, JSIdentifierReference, JSNode, JSNodeType, renderCompressed } from "@candlefw/js";
import { AssertionSite } from "../../types/assertion_site.js";
import { CompilerState } from "../../types/compiler_state";
import { assertionSiteSoftError } from "../../utilities/library_errors.js";
import { createHierarchalName } from "../../utilities/name_hierarchy.js";
import { setUnion } from "../../utilities/sets.js";
import { combinePropRefsAndDecl, compileEnclosingStatement, compileTestsFromSourceAST, packageAssertionSites } from "../compile_statements.js";
import { compileExpressionHandler, selectExpressionHandler } from "../expression_handler/expression_handler_functions.js";
import { empty_set } from "../utilities/empty_set.js";
import { jst, jstBreadth } from "../utilities/traverse_js_node.js";
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
        pos: <any>original_assertion_expression.pos,
        expression: original_assertion_expression,
        timeout_limit,
        import_names: empty_set,
        origin: null,
        ast,
    };
}

export function compileAssertionSite(
    state: CompilerState,
    node: JSCallExpression,
    LEAVE_ASSERTION_SITE: boolean,
    index: number
): JSNode | void {

    (<JSIdentifierReference>node.nodes[0]).value = ""; // Forcefully delete assert name

    const {
        assertion_expr,
        name_expression,
        BROWSER,
        INSPECT,
        SKIP,
        SOLO,
        name: static_name,
        timeout_limit
    } = parseAssertionSiteArguments(node);

    if (!assertion_expr) {
        assertionSiteSoftError(state.globals, 0, node.pos.errorMessage(`Could not find an expression for assertion site [${node.pos.slice()}]`));
        return;
    }

    const
        AWAIT = (jst(assertion_expr)
            .filter("type", JSNodeType.AwaitExpression)
            .run(true)
            .length) > 0,

        ast = <JSNode><any>{
            type: JSNodeType.BlockStatement,
            nodes: []
        };

    let test_name = renderCompressed(assertion_expr);

    for (const express_handler of selectExpressionHandler(assertion_expr, state.globals)) {

        if (express_handler.confirmUse(assertion_expr)) {

            const { nodes, name } = compileExpressionHandler(
                assertion_expr,
                express_handler,
                [],
                [],
                state.globals,
                name_expression ? renderCompressed(name_expression) : "",
                static_name
            );

            test_name = name;

            //@ts-ignore
            ast.nodes = nodes;

            break;
        }
    }

    const assertion_site = createAssertSiteObject(
        test_name,
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

    assertion_site.origin = state.AST;

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

        block: JSNode = <JSNode>jstBreadth(node, 4).filter("type", JSNodeType.BlockStatement, JSNodeType.FunctionBody).run(true)[0],

        prop = block ? compileEnclosingStatement(
            state,
            block,
            LEAVE_ASSERTION_SITE,
            OUT_SEQUENCED,
            RETURN_PROPS_ONLY
        ) : null;

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

            //assertion_site.origin = state.AST;

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
                assertion_site.origin = state.AST;
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
