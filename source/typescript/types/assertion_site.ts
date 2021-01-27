import { JSNode } from "@candlefw/js";
import { Lexer } from "@candlefw/wind";
import { ImportModule, ImportName } from "./imports";

export interface AssertionSite {
    type: "SEQUENCE" | "DISCRETE",

    /**
     * Index of the assertion site within the source file. Top Down. 
     */
    index: number,

    name: string;

    ast: JSNode;

    /**
     * Weak hashing of the test structure.
     */
    hash?: string;

    error?: Error;
    import_names: Set<string>;

    imports: { module: ImportModule, name: ImportName; }[];

    pos: Lexer;
    /**
     * `true` if the test has one or more await expressions
     */
    IS_ASYNC: boolean;

    SOLO: boolean;
    RUN: boolean;
    INSPECT: boolean;
    BROWSER: boolean;

    /**
     * The expression that is to be tested
     */
    expression: JSNode;

    timeout_limit?: number;
};
