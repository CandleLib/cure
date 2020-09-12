import { JSNode } from "@candlefw/js";
import { Lexer } from "@candlefw/wind";
import { ImportModule } from "./import_module";
import { TestMap } from "./test_map";
import { ImportName } from "./import_name";

export interface RawTestRig {
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


    /**
     * In a SEQUENCE TestRig, test_maps map individual assertion 
     * sites that produce virtual test outcomes.
     */
    test_maps?: TestMap[];

    SOLO: boolean;
    RUN: boolean;
    INSPECT: boolean;
    /**
     * The expression that is to be tested
     */
    expression: JSNode;
};
