/**
 * The primary export is a function
 * @module compile
 */

import { JSNode } from "@candlefw/js";
import { ImportModule } from "../types/import_module.js";
import { RawTestRig } from "../types/raw_test.js";
import { compileRawTestRigs } from "./compile_statements.js";
import { Reporter } from "../main.js";


/**
 * Compiles TestRigs from ast objects.
 * 
 * @param {JSNode} ast 
 * 
 * @param {Reporter} reporter - Users reporter.color to add asrenderWithFormattingAndSourceMapsertion messaging syntax highlights.
 */
export async function compileTest(ast: JSNode, reporter: Reporter, origin: string):

    Promise<{ raw_tests: RawTestRig[], imports: ImportModule[]; }> {

    ast.pos.source = origin;

    const
        imports: Array<ImportModule> = [],
        rigs = [],
        ast_prop = compileRawTestRigs(ast, reporter, imports);

    let index = 0;

    for (const rig of ast_prop.raw_rigs) {

        const { import_names } = rig;

        if (rig.type == "DISCRETE")
            rig.index = index++;
        else {
            rig.index = index;
            index += rig.test_maps.length;
        }

        for (const $import of imports)
            for (const id of $import.import_names)
                if (import_names.has(id.import_name))
                    rig.imports.push({ module: $import, name: id });


        rigs.push(rig);
    }

    return { raw_tests: rigs, imports };
}