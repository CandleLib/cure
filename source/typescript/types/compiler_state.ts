import { JSNode } from "@candlefw/js";
import { ImportModule } from "./imports.js";
import { StatementReference } from "./statement_props";
import { closureSet, setUnion, setDiff } from "../utilities/sets.js";
import { Globals } from "./globals.js";
import { AssertionSiteClosure } from "./assertion_site";
export type CompilerState = {
    globals: Globals;

    AST: JSNode;
    AWAIT: boolean;
    FORCE_USE: boolean;

    imported_modules: ImportModule[];

    global_declarations: closureSet | setUnion | setDiff | Set<string>;
    global_references: closureSet | setUnion | Set<string>;

    statement_references: StatementReference[];
    declaration_references: StatementReference[];

    test_closures: AssertionSiteClosure[];
};
