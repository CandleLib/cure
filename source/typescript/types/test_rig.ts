import { Lexer } from "@candlefw/wind";
import { TestError } from "../test_running/test_error";
import { TestMap } from "./test_map";

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

    /**
     * Position of the export name in the source
     */
    pos: Lexer;
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
     * original import url of the module
     */
    module_specifier: string;

    /**
     * `true` if the module_source is a relative path.
     */
    IS_RELATIVE: boolean;
};



/**
 * Contains a fully compiled test script that can be run. 
 */
export interface TestRig {
    type: "SEQUENCE" | "DISCRETE",

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
    error?: TestError;

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

    /**
    * In a SEQUENCE TestRig, test_maps map individual assertion 
    * sites to virtual test outcomes.
    */
    test_maps?: TestMap[];

    /**
     * Flag for only running and reporting the results of this TestRig. 
     * 
     * Enabled through marking an assertion site in one of the following 
     * ways:
     * 
     * >```js
     * >solo(( .... ))
     * >//or
     * >    s(( .... ))
     * >//or
     * >mono(( .... ))
     * >//or
     * >    m(( .... ))
     * >```
     * 
     * If other assertion site are marked as `SOLO`, then those tests will
     * run alongside each other.
     */
    SOLO: boolean;
    RUN: boolean;

    /**
     * Flag for Reporter to output the details of this test. 
     * 
     * Enabled through marking an assertion site in one of the following
     * ways:
     *
     * >```js
     * >inspect(( .... ))
     * >//or
     * >       i(( .... ))
     * >```
     *
     * This affects other tests in the same manner as `SOLO`.
     */
    INSPECT: boolean;

    /**
     * The current directory of the test file. Tests are
     * run from within their own directories. 
     */
    cwd: string;
    /**
     * Run the test in a browser context if true.
     */
    BROWSER: boolean;
    /**
     * Maximum amount of time in milliseconds test is allowed to run before timing out
     */
    timeout_limit: number;

    /**
     * Maximum number of times a timed out test can be retried before failing
     */
    retries: number;
};

