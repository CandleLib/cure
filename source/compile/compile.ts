/**
 * The primary export is a function
 * @module compile
 */

import { render as $r, MinTreeNode, exp, stmt } from "@candlefw/js";

import { CompileResults } from "../types/compiler_result.js";
import { ImportDependNode } from "../types/import_depend_node.js";
import { RawTest } from "../types/raw_test.js";
import { compileStatements } from "./compile_statements.js";
import { compileTestRig } from "./compile_test_rig.js";
import { Reporter } from "../main.js";


/**
 * Compiles TestRigs from ast objects.
 * 
 * @param {MinTreeNode} ast 
 * 
 * @param {Reporter} reporter - Users reporter.color to add assertion messaging syntax highlights.
 */
export async function compileTest(ast: MinTreeNode, reporter: Reporter, full_origin_path: string) {

    const
        imports: Array<ImportDependNode> = [],
        tests: Array<RawTest> = [];

    let i = 0;

    const { test_sites, scope } = compileStatements(ast, full_origin_path);

    /*********************************************************
     * Assertion test sites.
     *********************************************************/

    for (const site of test_sites) {

        site.index = i++;

        const test = compileTestRig(site.name_data, site, scope.imp, reporter);

        if (test)
            tests.push(test);
    }

    return <CompileResults>{ raw_tests: tests, imports };
}
