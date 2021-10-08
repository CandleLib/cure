import { Globals } from "./globals.js";
import { Test } from "./test.js";
import { TestInfo } from "./test_info";



export type TestRunnerRequest = (runner: TestRunner) => Promise<Test>;

export type TestRunnerResponse = (test: Test, ...results: TestInfo[]) => void;

export interface TestRunner {

    /**
     * 
     * Called when there are no more tests available and the test
     * runner should stop requesting them.
     */
    complete(): void;

    /**
     * 
     * Called when the runner should release all resources and close down
     */
    close(): void;

    /**
     * Called during a request of a test. Must return a bool that 
     * is true if the test runner is able to run the test based
     * on the state of the test's flags and meta labels.
     * @param test 
     */
    Can_Accept_Test(test: Test): boolean;

    /**
     * Initialize the request and response system to start requesting
     * tests and respond with test results.
     * 
     * The test runner is responsible for ensuring it is ready to start
     * handling tests before requesting them. There is no limit to how
     * many requests the runner can request, but it should ensure that
     * any test returned by the request function is mapped to an array
     * of test results that are returned through the response function.
     * 
     * Every time the function is called, the runner MUST clear out any
     * existing tests by what ever means necessary. No more responses
     * or requests should be performed until the new request and response
     * functions are assigned. 
     * 
     * @param {TestRunnerRequest} request - Function called by the test
     * runner to request and receive a new {Test}
     *  
     * @param {TestRunnerResponse} respond - Function called by the test
     * runner to return a test and its results once the test run has 
     * completed.
     * 
     * @param {boolean} RELOAD_DEPENDENCIES - Force the test runner to 
     * unload all imported modules and reload the test environment
     */
    init(globals: Globals, request: TestRunnerRequest, respond: TestRunnerResponse, RELOAD_DEPENDENCIES?: boolean): Promise<void>;
}
