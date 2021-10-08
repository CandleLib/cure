
/**
 * The primary export is a function
 * @module compile
 */

import { JSModule, JSScript } from "@candlelib/js";
import { AssertionSite } from "../types/assertion_site.js";
import { Globals } from "../types/globals.js";
import { ImportModule } from "../types/imports.js";
import { compileTestsFromSourceAST } from "./compile_statements.js";


/**
 * Compiles TestRigs from ast objects.
 * 
 * @param {JSNode} source_ast 
 * 
 * @param {Reporter} reporter - Users reporter.color to add asrenderWithFormattingAndSourceMapsertion messaging syntax highlights.
 */
export function compileTests(source_ast: JSScript | JSModule, globals: Globals, origin: string): { assertion_sites: AssertionSite[], imports: ImportModule[]; } {


    const
        imports: Array<ImportModule> = [],
        assertion_sites: AssertionSite[] = [],
        script_stmt_ref = compileTestsFromSourceAST(globals, source_ast, imports);

    let index = 0;

    for (const assertion_site of script_stmt_ref.assertion_sites) {

        const { import_names } = assertion_site;

        assertion_site.index = index;

        for (const $import of imports)

            for (const id of $import.import_names)

                if (import_names.has(id.import_name))

                    assertion_site.imports.push({ module: $import, name: id });

        assertion_sites.push(assertion_site);
    }

    return { assertion_sites, imports };
}