import { JSNode, JSStatementClass } from "@candlelib/js";
import { AssertionSite } from "./assertion_site.js";
import { setUnion, closureSet } from "../utilities/sets.js";

/**
 * A reference to a statement node that 
 * tracks the requirements of the statement, 
 * such as
 * - References: Referenced identifiers contained in the statement
 * - Declarations: Identifiers declared in the statement the exist
 * in the statement's parent scope.
 * - Assertion Sites: All assertions sites that have been compiled within 
 * the statement
 */
export interface StatementReference {
    /**
     * Any AST node that has the STATEMENT
     * class flag.
     */
    stmt: JSStatementClass;

    /**
     * Any variable reference within
     * the statement that does not
     * have a matching declaration
     * within the statement's closure
     */
    declared_variables: Set<string>;

    /**
     * Any declaration within the statement
     * closure that is not lexically scoped
     * within the same closure. Mainly `var`
     * declarations in block statements
     */
    required_references: Set<string> | setUnion | closureSet;

    /**
     * If true then the stmt should
     * be used regardless of the references
     */
    FORCE_USE: boolean;

    /**
     * If true then an await expression is present
     * within the stmt
     */
    AWAIT: boolean;

    assertion_sites: AssertionSite[];
}
