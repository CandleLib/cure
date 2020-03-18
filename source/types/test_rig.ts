import { Lexer } from "@candlefw/wind";
import { TestError } from "../test_running/test_error";

/**
 * Maps a module name to a file path.
 */
export interface ModuleSpecifier {

    /**
     * Name of a module export.
     */
    module_specifier: string,

    /**
     * URL or name of a module.
     */
    module_name: string;
};

/**
 * Information
 */
export interface ImportSource {

    /**
     * Resolved URL of the module. 
     */
    source: string;

    /**
     * Names of exports required of the module.
     */
    import_names: string[];

    /**
     * URL of the module
     */
    module_source: string;

    /**
     * `true` if the module_source is a relative path.
     */
    IS_RELATIVE: boolean;
};

/**
 * Contains a fully compiled test script that can be run. 
 */
export interface TestRig {

    /**
     * Name of the test. Includes suite name and redundant name info.
     */
    name: string;

    /**
     * The test compiled into JavaScript script string. 
     */
    source: string,

    /**
     * List of arguments to past to the Test Function
     */
    test_function_object_args: string[];

    /**
     * List of translators from imported module names to argument names 
     */
    import_arg_specifiers: Array<ModuleSpecifier>;

    /**
     * List of modules to import into the test harness. 
     */
    import_module_sources: ImportSource[];

    /**
     * `true` if the test has one or more await expressions
     */
    IS_ASYNC: boolean;

    /**
    * An error object if an exception was thrown during test compilation.
    */
    error?: Error | TestError;

    /**
     * Position Lexer for mapping errors back to the source file.
     */
    pos?: Lexer;

    /**
     * A JSON string source map mapping the compiled test script to the original test file. 
     */
    map: string;

    /**
     * The index location of the test's Assertion Site within the original test file.
     */
    index: number;

    /**
     * The TestSuite.index value.
     */
    suite_index: number;
};
