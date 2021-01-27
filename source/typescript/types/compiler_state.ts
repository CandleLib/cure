import { JSNode } from "@candlefw/js";
import { ImportModule } from "./imports.js";
import { StatementProp } from "./statement_props";
import { closureSet, setUnion, setDiff } from "../utilities/sets.js";
import { Globals } from "./globals.js";
import { TestSite } from "./test_site";
export type CompilerState = {
    globals: Globals;
    ast: JSNode;
    glbl_decl: closureSet | setUnion | setDiff | Set<string>;
    glbl_ref: closureSet | setUnion | Set<string>;
    tests: TestSite[];
    imports: ImportModule[];
    statements: StatementProp[];
    declarations: StatementProp[];
    AWAIT: boolean;
    FORCE_USE: boolean;
};
