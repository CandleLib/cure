import { JSNode } from "@candlefw/js";
import { ImportModule } from "../types/imports.js";
import { Reporter } from "../test.js";
import { CompilerState } from "../types/compiler_state";
import { Globals } from "../types/globals.js";

export function createCompilerState(
    globals: Globals,
    AST: JSNode,
    Imports: ImportModule[]
): CompilerState {
    return {
        globals,
        AST: AST,
        imports: Imports,
        global_declarations: new Set,
        global_references: new Set,
        tests: [],
        statements: [],
        declarations: [],
        AWAIT: false,
        FORCE_USE: false
    };
}
