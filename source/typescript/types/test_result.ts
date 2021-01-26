import { TestRig } from "./test_rig.js";
import { TestError } from "../test_running/test_error.js";


export interface TestResult {


    /**
     * Human Friendly Unique name of test
     * 
     * Hierarchal test name structure can be created by 
     * separating the name with the name delimiter? (<= specify where this delimiter is set )
     */
    name: string;

    /**
     * Millisecond timestamp for start of test.
     */
    start: number;

    /**
     * Millisecond timestamp for end of test.
     */
    end: number;

    /**
     * Number of milliseconds taken to run the test.
     */
    duration: number;

    /**
     * Original test rig data. Assigned a value after
     * tests have been run.
     */
    test?: TestRig;

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
    errors: string[];

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
