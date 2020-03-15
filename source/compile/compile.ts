import { render as $r, MinTreeNode, exp, stmt } from "@candlefw/js";

import { CompileResults } from "../types/compiler_result";
import { ImportDependNode } from "../types/ImportDependNode";
import { RawTest } from "../types/raw_test";
import { compileStatements } from "./compileStatements";
import { compileTestBinding } from "./compile_test_binding";


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
