import { MinTreeNode, MinTreeNodeType, ext, stmt, MinTreeNodeClass, render } from "@candlefw/js";
import { traverse, make_skippable, skip_root, make_replaceable, extract } from "@candlefw/conflagrate";
import { Scope } from "../../types/scope.js";
import { AssertionSiteSequence } from "../../types/assertion_site.js";
import { createAssertionSite } from "../assertion_site/create_assertion_site.js";
import { sanitize } from "../utils/sanitize.js";
import { compileAssertionSite } from "../assertion_site/compile_assertion_site.js";
import { TestMap } from "../../types/test_map.js";
import { Reporter } from "../../main.js";
import { createDeflateRaw } from "zlib";

function wrapAssertSite(scope, expression, suite_names, reporter, origin, SOLO = false, INSPECT = false, SKIP = false) {
    const
        { names, ast: a, name_data: { name, suite_names: sn }, AWAIT }
            = createAssertionSite(scope, expression, suite_names, SOLO, INSPECT, SKIP),
        { ast, optional_name } = compileAssertionSite(a, reporter, origin);

    return {
        ast,
        names,
        AWAIT,
        test_map: <TestMap>{
            name: [...sn, (name || optional_name)].join("-->"),
            index: 0,
            SOLO,
            INSPECT,
            RUN: !SKIP,
        }
    };
}

/**
 * Compiles a sequence of assertion sites found within
 * labeled block statements and iteration statements.
 * 
 * 
 * If the statement is a labeled statement, the label is 
 * assumed to be SEQUENCE:
 * 
 * >```javascript
 * >SEQUENCE: {
 * >    statement
 * >    ((test1))
 * >    statement
 * >    ((test2))
 * >    //...
 * >}
 * >```
 * 
 * Sequenced AssertionSites run sequentially within one worker. 
 * @param ast A statement with an inner statement or block node
 * @param stmts_ast A statement or block child of the outer_ast.
 * @param scope 
 * @param suite_names 
 */

export function compileSequence(ast: MinTreeNode, parent_scope: Scope, suite_names: string[], reporter: Reporter, origin: string)
    : { assertion_site: AssertionSiteSequence, sanitized: MinTreeNode, number_of_statements: number; } {

    const
        sanitized = sanitize(ast),

        scope: Scope = {
            type: "SCOPE",
            ast,
            offset: parent_scope ? parent_scope.stmts.length : 0,
            parent: parent_scope,
            imp: [],
            //dec: [],
            stmts: [],
            pragmas: [],
            USE_ALL: false
        },

        assertion_site = <AssertionSiteSequence>{
            type: "SEQUENCED",
            index: 0,
            start: scope.offset,
            ast,
            name_data: { name: "", suite_names: [] },
            scope,
            tests: [],
            names: new Set(),
            AWAIT: false
        }, receiver = { ast: null };

    let test_index = 0, number_of_statements = 0;

    for (const node of traverse(ast, "nodes")
        .then(skip_root())
        .then(make_replaceable())
        .then(extract(receiver))
        .then(make_skippable())
    ) {
        if (node.type == MinTreeNodeType.ExpressionStatement) {

            const [expression] = node.nodes;

            if (
                expression.type == MinTreeNodeType.Parenthesized
                &&
                expression.nodes[0].type == MinTreeNodeType.Parenthesized
            ) {
                const { AWAIT, test_map: tm, names, ast }
                    = wrapAssertSite(scope, expression.nodes[0].nodes[0], suite_names, reporter, origin);

                for (const name of names.values())
                    assertion_site.names.add(name);

                if (AWAIT) assertion_site.AWAIT = true;

                assertion_site.tests.push(tm);

                tm.index = test_index;

                suite_names.pop();

                suite_names.push("#");

                node.replace({
                    type: MinTreeNodeType.BlockStatement,
                    nodes: [stmt(`$harness.test_index = ${test_index++};`), ast],
                    pos: ast.pos
                });

                node.skip();

                continue;

            } else if (expression.type == MinTreeNodeType.StringLiteral) {

                if (suite_names.slice(-1)[0] == "#")
                    suite_names.pop();

                suite_names.push(<string>expression.value);

                node.replace(null);

                node.skip();


                continue;

            } else if (expression.type == MinTreeNodeType.CallExpression) {
                const
                    name = (expression.nodes[0].value + "").toLocaleLowerCase(),
                    [, args] = expression.nodes;

                if (args.nodes.length == 1) {

                    const [is_paren] = args.nodes;

                    if (is_paren && is_paren.type == MinTreeNodeType.Parenthesized) {

                        const
                            SOLO = ["solo", "only", "s", "o"].includes(name),
                            INSPECT = ["inspect", "i"].includes(name),
                            SKIP = ["skip", "sk"].includes(name);

                        /**
                         * Only create assertion site if the the call expression has one of the above listed identifier names.
                         * If the name is something else, skip the statement entirely to prevent reference errors in other assertion
                         * sites.
                         */
                        if (SOLO || INSPECT || SKIP) {
                            const { AWAIT, test_map: tm, names, ast }
                                = wrapAssertSite(scope, is_paren.nodes[0], suite_names, reporter, origin, SOLO, INSPECT, SKIP);

                            for (const name of names.values())
                                assertion_site.names.add(name);

                            if (AWAIT) assertion_site.AWAIT = true;

                            assertion_site.tests.push(tm);

                            tm.index = test_index;

                            suite_names.pop();

                            suite_names.push("#");

                            node.replace({
                                type: MinTreeNodeType.BlockStatement,
                                nodes: [stmt(`$harness.test_index = ${test_index++};`), ast],
                                pos: ast.pos
                            });
                        }

                        node.skip();
                        continue;
                    }
                }
            }
        } else if (node.type == MinTreeNodeType.AwaitExpression)
            assertion_site.AWAIT = true;
    }

    assertion_site.ast = receiver.ast;
    return { assertion_site, sanitized, number_of_statements };
}; 