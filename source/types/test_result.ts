import { TestRig } from "./test_rig.js";
import { TestError } from "../test_running/test_error.js";

/**
 * Result object returned after running a test.
 */
export interface TestResult {

    /**
     * Millisecond timestamp for start of test.
     */
    start: number;

    /**
     * Millisecond timestamp for end of test.
     */
    end: number;

    /**
     * Number of milleseconds taken to run the test.
     */
    duration: number;


    /**
     * Original test data.
     */
    test: TestRig;

    /**
     * True if the test exceeded the time limit.
     *
     * Default limit is 2000 milliseconds.
     */
    TIMED_OUT: boolean;

    /**
     * An error object if some error was thrown during the execution of 
     * the test.
     */
    error: TestError;
};
