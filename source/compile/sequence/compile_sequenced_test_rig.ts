import { MinTreeNode } from "@candlefw/js";

import { AssertionSiteSequence } from "../../types/assertion_site.js";
import { ImportDependNode } from "../../types/import_depend_node.js";

import { RawTestRig } from "../../types/raw_test.js";
import { compileOuterScope } from "../compile_outer_scope.js";
import { createTestAST } from "../create_test_ast.js";
export function compileSequencedTestRig(
    {
        name_data: { name, suite_names },
        ast: node, scope, names, index,
        tests, AWAIT
    }: AssertionSiteSequence,
    imports: ImportDependNode[])
    : RawTestRig {

    let IS_ASYNC = AWAIT;

    //for (const test of tests)
    //test.index += index;
    //index += tests.length;

    const
        async_check = { is: false },
        stmts: MinTreeNode[] = [...compileOuterScope(scope, names, async_check), node];

    if (async_check.is)
        IS_ASYNC = true;

    const { ast, imported_dependencies } = createTestAST(stmts, names, imports);

    //inspect(0, 2, render(ast), names, statements.map(e => render(e)), scope);

    return {
        type: "SEQUENCE",
        name: [...suite_names, (name)].join("-->"),
        ast,
        imports: imported_dependencies,
        pos: node.pos,
        index,
        IS_ASYNC,
        SOLO: false,
        RUN: true,
        INSPECT: false,
        test_maps: tests
    };
}
