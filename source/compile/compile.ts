import { render as $r, MinTreeNode, exp, stmt } from "@candlefw/js";

import { CompileResults } from "../types/compiler_result.js";
import { ImportDependNode } from "../types/import_depend_node.js";
import { RawTest } from "../types/raw_test.js";
import { compileStatements } from "./compile_statements.js";
import { compileTestBinding } from "./compile_test_binding.js";


/*
 * Compiles test blocks from ast objects.
 */
export async function compileTest(ast: MinTreeNode) {

    const
        imports: Array<ImportDependNode> = [],
        tests: Array<RawTest> = [];

    let error = null;
    let i = 0;
    const { test_sites, scope } = compileStatements(ast);

    /*********************************************************
     * Assertion test sites.
     *********************************************************/

    for (const site of test_sites) {

        const test = compileTestBinding(site.name, site, scope.imp);
        console.log($r(test.ast))
        if (test)
            tests.push(test);
    }

    return <CompileResults>{ raw_tests: tests, imports, error };
}
