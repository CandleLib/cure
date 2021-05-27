import { JSNode } from "@candlelib/js";
import { CompilerState } from "../types/compiler_state";
import { Globals } from "../types/globals.js";
import { ImportModule } from "../types/imports.js";

export function createCompilerState(
    globals: Globals,
    ast: JSNode,
    Imports: ImportModule[],
    suite_name = ""
): CompilerState {
    return <CompilerState>{
        globals,
        ast,
        imported_modules: Imports,
        global_declaration_ids: new Set,
        global_reference_ids: new Set,
        test_closures: [],
        statement_references: [],
        declaration_references: [],
        AWAIT: false,
        FORCE_USE: false,
        suite_name
    };
}
