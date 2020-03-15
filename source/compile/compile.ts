import { render as $r, MinTreeNode, exp, stmt } from "@candlefw/js";

import { CompileResults } from "../types/compiler_result.js";
import { ImportDependNode } from "../types/import_depend_node.js";
import { RawTest } from "../types/raw_test.js";
import { compileStatements } from "./compile_statements.js";
import { compileTestSite } from "./compile_test_site.js";


/*
 * Compiles test blocks from ast objects.
 */
export async function compileTest(ast: MinTreeNode) {

    const
        imports: Array<ImportDependNode> = [],
        tests: Array<RawTest> = [];

    let i = 0;

    const { test_sites, scope } = compileStatements(ast);

    /*********************************************************
     * Assertion test sites.
     *********************************************************/

    for (const site of test_sites) {

        site.index = i++;

        const test = compileTestSite(site.name, site, scope.imp);

        if (test)
            tests.push(test);
    }

    return <CompileResults>{ raw_tests: tests, imports };
}
