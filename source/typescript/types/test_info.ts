import { Test } from "./test.js";
import { TransferableTestError } from "./test_error.js";
/**
 * Information collected during testing
 */
export interface TestInfo {

    /**
     * Human Friendly Unique name of test
     * 
     * Hierarchal test name structure can be created by 
     * separating the name with the name delimiter? (<= specify where this delimiter is set )
     */
    name: string;
    /**
     * Millisecond timestamp for the fist call to a harness function after clipboard_start.
     */
    clipboard_write_start: number;

    /**
     * Millisecond timestamp when this test result was created.
     */
    clipboard_start: number;

    /**
     * Millisecond timestamp when this test result was popped from the clipboard stack.
     */
    clipboard_end: number;

    /**
     * Millisecond timestamp for when the last test result was pushed to the stack or popped from the stack,
     * which ever comes first. 
     */
    previous_clipboard_end: number;

    /**
     * Original test rig data. Assigned a value after
     * tests have been run.
     */
    test?: Test;

    /**
     * True if the test completed without throwing an
     * exception or timing out
     */
    PASSED: boolean;

    /**
     * True if the test exceeded the time limit. 
     * If `true` then the test has failed. 
     * Default limit is 2000 milliseconds.
     */
    TIMED_OUT: boolean;

    /**
     * Optional test message to report if the test has failed.
     */
    message?: string;

    /**
     * A list of error string generated during the execution of the test test.
     * If this array contains data then the test has failed.
     */
    errors: TransferableTestError[];

    /**
     * A list of user generated logging information collect during the execution
     * of the test. 
     */
    logs: string[];

    /**
     * Assertion location
     * 
     * Location of test within the original source code and compiled source code
     */
    location: {
        source: { offset: number, line: number, column: number; },
        compiled: { offset: number, line: number, column: number; };
    };
};
