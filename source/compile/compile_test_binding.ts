import { MinTreeNodeType as $, MinTreeNode, parser } from "@candlefw/js";
import { traverse, extract, replace } from "@candlefw/conflagrate";

import { TestAssertionError } from "../types/test_error.js";
import { TestSite } from "../types/test_site.js";
import { ImportDependNode } from "../types/import_depend_node.js";
import { RawTest } from "../types/raw_test.js";

import { compileAssertionSite } from "./compile_assertion_site.js";
import { getUsedStatements } from "./get_used_statements.js";
import { replaceNodes } from "./replace_nodes.js";
import { compileOuterScope } from "./compile_outer_scope.js";

export function compileTestBinding(name: string, test_site: TestSite, imports: ImportDependNode[]): RawTest {

    const i = [];

    let
        node = test_site.node, assertion_statement = compileAssertionSite(node),
        scope = test_site.scope,
        names = test_site.names,
        root = scope.root,
        nodes = scope.nodes,
        start = test_site.start;

    if (!assertion_statement) {

        const expr = test_site.node.nodes[0].nodes[0].nodes[0];

        return {
            imports: [],
            suite: "", name, ast: null, pos: node.pos,
            error: new TestAssertionError(`Could not find a SiteCompiler for MinTreeNode [${$[expr.type]}]`, expr.pos.line, expr.pos.char, "", "")
        };
    }

    else {

        let statements = [];

        const { statements: s, names: n } = getUsedStatements(scope, start, names);

        statements = s;

        statements.splice(test_site.start, 0, assertion_statement);

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

        if (scope.parent) {
            statements = [...compileOuterScope(scope.parent, names), ...statements];
        }
        //Add declarations and identify imports. 
        const ast = parser(";");

        ast.nodes = statements;

        /**
         * for (const decl of decl)
         */
        for (const imp of imports) {
            for (const id of imp.import_names)
                if (names.has(id.import_name)) {
                    i.push(imp);
                    break;
                }
        }
        return { name, suite: name, ast, imports: i, pos: node.pos };
    }
}
