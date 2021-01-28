import { JSNode } from "@candlefw/js";
import { ImportModule } from "./imports.js";
import { StatementProp } from "./statement_props";
import { closureSet, setUnion, setDiff } from "../utilities/sets.js";
import { Globals } from "./globals.js";
import { TestClosure } from "./test_site";
export type CompilerState = {
    globals: Globals;
    AST: JSNode;
    global_declarations: closureSet | setUnion | setDiff | Set<string>;
    global_references: closureSet | setUnion | Set<string>;
    tests: TestClosure[];
    imports: ImportModule[];
    statements: StatementProp[];
    declarations: StatementProp[];
    AWAIT: boolean;
    FORCE_USE: boolean;
};
