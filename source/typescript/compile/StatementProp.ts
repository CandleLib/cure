import { JSNode } from "@candlefw/js";
import { RawTestRig } from "../types/raw_test.js";

export interface StatementProp {
    /**
     * Any AST node that has the STATEMENT
     * class flag.
     */
    stmt: JSNode;


    /**
     * Any variable reference within
     * the statement that does not
     * have a matching declaration
     * within the statement closure
     */
    declared_variables: Set<string>;

    /**
     * Any declaration within the statement
     * closure that is not lexically scoped
     * within the same closure. Mainly var
     * declarations in block statements
     */
    required_references: Set<string>;

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

    raw_rigs: RawTestRig[];
}
