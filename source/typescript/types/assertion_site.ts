import { JSNode } from "@candlelib/js";
import { Lexer } from "@candlelib/wind";
import { THROWABLE_TEST_OBJECT_ID } from "../utilities/throwable_test_object_enum";
import { ImportRequirement } from "./imports";
import { StatementReference } from "./statement_props";



export type AssertionSiteClosure = {
    assertion_site: AssertionSite;
    statement_reference: StatementReference;
    statement_index: number;
};


export interface AssertionSite {
    throwable_id: THROWABLE_TEST_OBJECT_ID.ASSERTION_SITE,

    /**
     * Index of the assertion site within the source file. Top Down. 
     * NOT NEEDED
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

    SKIP: boolean;
    INSPECT: boolean;
    BROWSER: boolean;

    /**
     * Reference to the {JSStatement} that contains the assertion site expression
     */
    origin: JSNode;

    timeout_limit?: number;

    /**
     * Location of the source file
     */
    source_path: string;

    meta_labels?: string[];
};
