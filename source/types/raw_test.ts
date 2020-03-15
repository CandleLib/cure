import { MinTreeNode } from "@candlefw/js";
import { Lexer } from "@candlefw/whind";
import { ImportDependNode } from "./import_depend_node";

export type RawTest = {
    /**
     * Index of the assertion site within the source file. Top Down. 
     */
    index: number,

    suite: string;

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
};
