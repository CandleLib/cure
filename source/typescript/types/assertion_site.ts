import { JSNode } from "@candlefw/js";
import { Lexer } from "@candlefw/wind";
import { ImportRequirement, ImportModule, ImportName } from "./imports";



export interface AssertionSite {
    type: "SEQUENCE" | "DISCRETE",

    /**
     * Index of the assertion site within the source file. Top Down. 
     */
    index: number,

    static_name: string;

    ast: JSNode;
    import_names: Set<string>;

    imports: ImportRequirement[];

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
