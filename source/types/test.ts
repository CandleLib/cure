import URL from "@candlefw/url";
import { TestAssertionError } from "./test_error";
export type ModuleSpecifier = {
    /**
     * Name of a module export.
     */
    module_specifier: string,

    /**
     * URL or name of a module.
     */
    module_name: string;
};
export type Test = {

    /**
     * Name of the test's suite.
     */
    suite: string;

    /**
     * Name given to the test.
     */
    name: string;

    /**
     * List of arguments to past to the Test Function
     */
    test_function_object_args: string[];

    /**
     * List of translators from imported modules to argument 
     */
    import_arg_specifiers: Array<ModuleSpecifier>;

    /**
     * List of modules to import into the test harness. 
     */
    import_module_sources: Source[];

    /**
     * `true` if the test has one or more await expressions
     */
    IS_ASYNC: boolean;

    /**
    * An error object if an exception was thrown during test compilation.
    */
    error?: Error | TestAssertionError;
};
export type Source = {

    /**
     * Resolved URL of the module. 
     */
    source: string;

    /**
     * Names of exports required of the module.
     */
    import_names: string[];

    /**
     * url of the module
     */
    module_source: string;

    /**
     * `true` if the module_source is a relative path.
     */
    IS_RELATIVE: boolean;
};

export type Suite = {

    /**
     * Name givin to the test.
     */
    name: string;

    /**
     * Tests this suite runs
     */
    tests: Test[];

    /**
     * The original url of the suite
     */
    origin: string;

    /**
     * An error object if an exception was thrown during test compilation.
     */
    error?: Error | TestAssertionError;
};