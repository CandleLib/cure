/**
 * The primary export is a function
 * @module compile
 */

import { JSNode } from "@candlefw/js";
import { ImportModule } from "../types/import_module.js";
import { RawTestRig } from "../types/raw_test.js";
import { compileStatementsNew, compileStatementsNewer } from "./compile_statements.js";
import { Reporter } from "../main.js";
import { inspect } from "../test_running/test_harness.js";


/**
 * Compiles TestRigs from ast objects.
 * 
 * @param {JSNode} ast 
 * 
 * @param {Reporter} reporter - Users reporter.color to add asrenderWithFormattingAndSourceMapsertion messaging syntax highlights.
 */
export async function compileTest(ast: JSNode, reporter: Reporter, origin: string):
    Promise<{ raw_tests: RawTestRig[], imports: ImportModule[]; }> {
    const
        imports: Array<ImportModule> = [],
        tests: Array<RawTestRig> = [];

    let i = 0, test = null, rigs = [];

    const raw_rigs = <Array<{ rig: RawTestRig, import_names: Set<string>; }>><unknown>compileStatementsNewer(ast, reporter, imports);

    let index = 0;

    for (const { rig, import_names } of raw_rigs) {

        if (rig.type == "DISCRETE")
            rig.index = index++;
        else {
            rig.index = index;
            index += rig.test_maps.length;
        }

        for (const imp of imports) {

            for (const id of imp.import_names)

                if (import_names.has(id.import_name)) {

                    rig.imports.push({ module: imp, name: id });

                }
        }

        rigs.push(rig);
    }

    return { raw_tests: rigs, imports };
}