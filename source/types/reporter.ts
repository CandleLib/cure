/**
 * @namespace Reporter
 */

import { CLITextDraw } from "../utilities/cli_text_console.js";
import { TestResult } from "./test_result.js";
import { TestSuite } from "./test_suite.js";
import { TestRig } from "./test_rig.js";

/**
 * Provides an interface to report on running and completed tests.
 */
export interface Reporter {

    /**
     * Called during suite building.
     * 
     * @param {string} message - A message indicating the current status of suite building.
     */
    buildUpdate?: (message: string[], suites: TestSuite[], terminal: CLITextDraw | Console) => void;

    /**
     * Called before tests a run.
     * 
     * @param {TestRig[]} pending_tests - All tests that will be run.
     * @param {Suites[]} suites - An array of test suites.
     * @param {CLITextDraw | Console} terminal - An output terminal to write test messages to.
     * 
     */
    start: (pending_tests: TestRig[], suites: TestSuite[], terminal: CLITextDraw | Console) => void;

    /**
     * Called periodically if the TestFrame is in watch mode.
     * 
     * @param {TestResult[]} results - An array of test results.
     * @param {Suites[]} suites - An array of test suites.
     * @param {CLITextDraw | Console} terminal - An output terminal to write test messages to.
     * 
     */
    update: (results: TestResult[], suites: TestSuite[], terminal: CLITextDraw | Console) => void;

    /**
     * Called when all tests have completed their runs. 
     * 
     * @param {TestResult[]} results - An array of test results.
     * @param {Suites[]} suites - An array of test suites.
     * @param {CLITextDraw | Console} terminal - An output terminal to write test messages to.
     * 
     * @returns {boolean} `true` if the reporter determines all tests and suites have met their pass condition.
     *
     * @async
     */
    complete: (results: TestResult[], suites: TestSuite[], terminal: CLITextDraw | Console) => Promise<boolean>;

    /**
     * An object of terminal color strings to override the default coloring scheme.
     * 
     * Auto generated if not present on the active reporter.
     */
    colors?: {
        /**
         * Background color for characters of minimal importance.
         */
        bkgr: string,
        /**
         * Color to denote test failure.
         */
        fail: string,

        /**
         * Color to denote test success.
         */
        pass: string,

        /**
         * General color to highlight an object name such as a member expression or variable.
         */
        objA: string,
        /**
         * General color to highlight an object name such as a member expression or variable.
         */
        objB: string,
        /**
         * General color to highlight an object name such as a member expression or variable.
         */
        objC: string,
        /**
         * General color to highlight an object name such as a member expression or variable.
         */
        objD: string,
        /**
         * General color to highlight an literal value, such 0, true, null, undefined
         */
        valA: string,
        /**
         * General color to highlight an literal value, such 0, true, null, undefined
         */
        valB: string,
        /**
         * General color to highlight an literal value, such 0, true, null, undefined
         */
        valC: string,
        /**
         * General color to highlight an literal value, such 0, true, null, undefined
         */
        valD: string,
        /**
         * Neutral color to highlight a message such a as tip.
         */
        msgA: string,
        /**
         * Neutral color to highlight a message such a as tip.
         */
        msgB: string,
        /**
         * Neutral color to highlight a message such a as tip.
         */
        msgC: string,
        /**
         * Neutral color to highlight a message such a as tip.
         */
        msgD: string;
        /**
         * Highlight color to highlight a non test symbol.
         */
        symA: string,
        /**
         * Highlight color to highlight a non test symbol.
         */
        symB: string,
        /**
         * Highlight color to highlight a non test symbol.
         */
        symC: string,
        /**
         * Highlight color to highlight a non test symbol.
         */
        symD: string;
    };
}
