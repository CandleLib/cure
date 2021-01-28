import { Lexer } from "@candlefw/wind";
import { TestError } from "../utilities/test_error";
import { ImportSource, ModuleSpecifier } from "./imports";


/**
 * Contains a fully compiled test script that can be run. 
 */
export interface Test {
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
