
/**
 * The primary export is a function
 * @module compile
 */

import { JSNode } from "@candlefw/js";
import { ImportModule } from "../types/imports.js";
import { AssertionSite } from "../types/assertion_site.js";
import { compileTestsFromSourceAST } from "./compile_statements.js";
import { Globals } from "../types/globals.js";


/**
 * Compiles TestRigs from ast objects.
 * 
 * @param {JSNode} ast 
 * 
 * @param {Reporter} reporter - Users reporter.color to add asrenderWithFormattingAndSourceMapsertion messaging syntax highlights.
 */
export async function compileTests(ast: JSNode, globals: Globals, origin: string):

    Promise<{ assertion_sites: AssertionSite[], imports: ImportModule[]; }> {

    ast.pos.source = origin;

    const
        imports: Array<ImportModule> = [],
        assertion_sites: AssertionSite[] = [],
        ast_prop = compileTestsFromSourceAST(globals, ast, imports);

    let index = 0;

    for (const assertion_sites of ast_prop.assertion_sites) {

        const { import_names } = assertion_sites;

        assertion_sites.index = index;

        for (const $import of imports)
            for (const id of $import.import_names)
                if (import_names.has(id.import_name))
                    assertion_sites.imports.push({ module: $import, name: id });


        assertion_sites.push(assertion_sites);
    }

    return { assertion_sites, imports };
}