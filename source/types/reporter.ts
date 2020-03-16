import { CLITextDraw } from "../utilities/cli_text_console.js";
import { TestResult } from "./test_result.js";
import { Suite } from "./suite.js";
import { Test } from "./test.js";

export interface Reporter {

    /**
     * Called before tests a run.
     * 
     * @param {Test[]} pending_tests - All tests that will be run.
     * @param {Suites[]} suites - An array of test suites.
     * @param {CLITextDraw | Console} terminal - An output terminal to write test messages to.
     * 
     */
    start: (pending_tests: Test[], suites: Suite[], terminal: CLITextDraw | Console) => void;

    /**
     * Called periodically if the test frame is in watch mode.
     * 
     * @param {TestResult[]} results - An array of test results.
     * @param {Suites[]} suites - An array of test suites.
     * @param {CLITextDraw | Console} terminal - An output terminal to write test messages to.
     * 
     */
    update: (results: TestResult[], suites: Suite[], terminal: CLITextDraw | Console) => void;

    /**
     * Called when all tests have completed their runs. 
     * 
     * @param {TestResult[]} results - An array of test results.
     * @param {Suites[]} suites - An array of test suites.
     * @param {CLITextDraw | Console} terminal - An output terminal to write test messages to.
     * 
     * @returns {boolean} `true` if the reporter determins all tests and suites have met their pass condition.
     */
    complete: (results: TestResult[], suites: Suite[], terminal: CLITextDraw | Console) => Promise<boolean>;
}
