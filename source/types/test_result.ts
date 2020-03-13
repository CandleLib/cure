import { Test } from "./test.js";

/**
 * Result object returned after running a test.
 */
export type TestResult = {

    /**
     * Millisecond timestamp for start of test.
     */
    start: number;

    /**
     * Millisecond timestamp for end of test.
     */
    end: number;

    /**
     * Number of milleseconds taken to run test.
     */
    duration: number;

    /**
     * Original test data.
     */
    test: Test;

    /**
     * True if the test exceeded duration limit.
     *
     * Default limit is 2000 milliseconds.
     */
    TIMED_OUT: boolean;

    /**
     * An error object if some error was thrown during the execution of 
     * the test.
     */
    error: Error | null;
};
