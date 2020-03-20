import { MinTreeNode } from "@candlefw/js";
import { Lexer } from "@candlefw/wind";
import { ImportDependNode } from "./import_depend_node";

export interface RawTestRig {
    type: "SEQUENCE" | "DISCRETE",
    /**
     * Index of the assertion site within the source file. Top Down. 
     */
    index: number,

    name: string;

    ast: MinTreeNode;

    /**
     * Weak hashing of the test structure.
     */
    hash?: string;

    error?: Error;

    imports: ImportDependNode[];

    pos: Lexer;

    /**
     * `true` if the test has one or more await expressions
     */
    IS_ASYNC: boolean;

    /**
     * In a SEQUENCE TestRig, test_maps map individual assertion 
     * sites to virtual test outcomes.
     */
    test_maps?: Array<{
        name: string,
        index: number,
        error?: Error;
    }>;
};
