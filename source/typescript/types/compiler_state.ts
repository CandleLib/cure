import { JSNode } from "@candlelib/js";
import { ImportModule } from "./imports.js";
import { StatementReference } from "./statement_props";
import { closureSet, setUnion, setDiff } from "../utilities/sets.js";
import { Globals } from "./globals.js";
import { AssertionSiteClosure } from "./assertion_site";
export type CompilerState = {
    globals: Globals;

    ast: JSNode;
    AWAIT: boolean;
    FORCE_USE: boolean;

    imported_modules: ImportModule[];

    global_declaration_ids: closureSet | setUnion | setDiff | Set<string>;
    global_reference_ids: closureSet | setUnion | Set<string>;

    statement_references: StatementReference[];
    declaration_references: StatementReference[];

    test_closures: AssertionSiteClosure[];
    /**
     * Hierarchal string of the names of the chain of assertion_groups 
     * this statement is a part of.
     */
    suite_name: string;
};
