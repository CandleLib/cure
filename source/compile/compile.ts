/**
 * The primary export is a function
 * @module compile
 */

import { render as $r, MinTreeNode, exp, stmt } from "@candlefw/js";

import { CompileResults } from "../types/compiler_result.js";
import { ImportDependNode } from "../types/import_depend_node.js";
import { RawTestRig } from "../types/raw_test.js";
import { compileStatements } from "./compile_statements.js";
import { compileTestRig } from "./compile_test_rig.js";
import { Reporter } from "../main.js";
import { compileSequencedTestRig } from "./sequence/compile_sequenced_test_rig.js";
import { inspect } from "../test_running/test_harness.js";


/**
 * Compiles TestRigs from ast objects.
 * 
 * @param {MinTreeNode} ast 
 * 
 * @param {Reporter} reporter - Users reporter.color to add assertion messaging syntax highlights.
 */
export async function compileTest(ast: MinTreeNode, reporter: Reporter, origin: string) {

    const
        imports: Array<ImportDependNode> = [],
        tests: Array<RawTestRig> = [];

    let i = 0, test = null;

    const { assertion_sites, scope } = compileStatements(ast, origin, reporter);

    /*********************************************************
     * Assertion test sites.
     *********************************************************/


    for (const site of assertion_sites) {

        site.index = i;

        switch (site.type) {

            case "SEQUENCED":
                test = compileSequencedTestRig(site, scope.imp);
                i = site.index + test.test_maps.length;
                break;

            default:
                test = compileTestRig(site, scope.imp, reporter, origin);
                i = site.index + 1;
                break;
        }



        if (test)
            tests.push(test);
    }

    return <CompileResults>{ raw_tests: tests, imports };
}
