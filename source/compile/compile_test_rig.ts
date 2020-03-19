import { MinTreeNodeType as $, MinTreeNode, parser } from "@candlefw/js";
import { traverse, extract, replace } from "@candlefw/conflagrate";

import { TestError } from "../test_running/test_error.js";
import { AssertionSite } from "../types/assertion_site.js";
import { ImportDependNode } from "../types/import_depend_node.js";
import { RawTest } from "../types/raw_test.js";

import { compileAssertionSite } from "./compile_assertion_site.js";
import { getUsedStatements } from "./get_used_statements.js";
import { replaceNodes } from "./replace_nodes.js";
import { compileOuterScope } from "./compile_outer_scope.js";
import { Reporter } from "../main.js";

export function compileTestRig(
    { name, suite_names },
    { node, scope, names, index, start, AWAIT }: AssertionSite,
    imports: ImportDependNode[],
    reporter: Reporter)
    : RawTest {

    const i = [];

    let
        IS_ASYNC = AWAIT,
        { root, nodes } = scope,
        { ast: assertion_statement, optional_name } = compileAssertionSite(node, reporter);

    if (!assertion_statement) {

        const expr = node.nodes[0].nodes[0].nodes[0];

        return {
            name: [...suite_names, (name || optional_name)].join("-->"),
            IS_ASYNC: false,
            index,
            imports: [],
            ast: null,
            pos: node.pos,
            error: new TestError(
                `Could not find a AssertionSiteCompiler for MinTreeNode [${$[expr.type]}]`,
                expr.pos.line,
                expr.pos.char,
                "",
                "")
        };

    } else {

        let statements = [];

        const { statements: s, names: n, AWAIT } = getUsedStatements(scope, start, names);

        if (AWAIT)
            IS_ASYNC = true;

        statements = s;

        statements.splice(start, 0, assertion_statement);

        names = n;

        if (root) {

            const receiver = { ast: <MinTreeNode>null };

            nodes.length = 0;

            nodes.push(...statements);

            traverse(root, "nodes").then(replace(replaceNodes)).then(extract(receiver)).run();

            statements = [receiver.ast];
        }

        for (const pragma of scope.pragmas) {

            switch (pragma.type) {
                case "AE":
                    statements.push(...pragma.nodes);
                    break;
                case "BE":
                    statements.unshift(...pragma.nodes);
                    break;
            }
        }

        const async_check = { is: false };

        if (scope.parent)
            statements = [...compileOuterScope(scope.parent, names, async_check), ...statements];
        //Add declarations and identify imports. 
        const ast = parser(";");

        if (async_check.is)
            IS_ASYNC = true;

        ast.nodes = statements;

        for (const imp of imports) {
            for (const id of imp.import_names)
                if (names.has(id.import_name)) {
                    i.push(imp);
                    break;
                }
        }

        return { name: [...suite_names, (name || optional_name)].join("-->"), ast, imports: i, pos: node.pos, index, IS_ASYNC };
    }
}
