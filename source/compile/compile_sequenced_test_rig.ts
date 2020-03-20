import { stmt as $, render, MinTreeNodeType, MinTreeNode } from "@candlefw/js";

import { AssertionSite } from "../types/assertion_site.js";
import { ImportDependNode } from "../types/import_depend_node.js";

import { RawTestRig } from "../types/raw_test.js";
import { compileAssertionSite, } from "./compile_assertion_site.js";
import { compileOuterScope } from "./compile_outer_scope.js";
import { Reporter } from "../main.js";
import { createTestAST } from "./create_test_ast.js";
import { DependGraphNode } from "../types/depend_graph_node.js";
import { TestMap } from "../types/test_rig.js";

export function compileSequencedTestRig(
    {
        name_data: { name, suite_names },
        ast: node, scope, names, index,
        AWAIT, statements,
    }: AssertionSite,
    imports: ImportDependNode[],
    reporter: Reporter)
    : RawTestRig {

    let IS_ASYNC = AWAIT, test_index = 0;

    const
        our_stmts: MinTreeNode[] = [],
        tests: TestMap[] = [];

    for (const stmt of statements) {

        if ((<AssertionSite>stmt).type == "THREADED") {

            const
                assert: AssertionSite = <AssertionSite>stmt,
                { name_data: { name, suite_names } } = assert,
                { ast, optional_name } = compileAssertionSite(assert.ast, reporter);

            tests.push({
                name: [...suite_names,
                (name || optional_name)].join("-->"),
                index: index + test_index,
            });

            for (const name of assert.names.values())
                names.add(name);

            our_stmts.push($(`$harness.test_index = ${test_index++};`), ast);

        } else {

            const depend_node = <DependGraphNode>stmt;

            for (const name of depend_node.imports.values())
                names.add(name);

            our_stmts.push(depend_node.ast);
        }
    }

    const
        async_check = { is: false },
        stmts: MinTreeNode[] = [...compileOuterScope(scope, names, async_check), ...our_stmts];

    if (async_check.is)
        IS_ASYNC = true;

    const { ast, imported_dependencies } = createTestAST(stmts, names, imports);

    return {
        type: "SEQUENCE",
        name: [...suite_names,
        (name)].join("-->"),
        ast,
        imports: imported_dependencies,
        pos: node.pos,
        index: index + test_index,
        IS_ASYNC,
        test_maps: tests
    };
}
