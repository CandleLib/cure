import { FSWatcher } from "fs";
import { Runner } from "../test_running/runner.js";
import { TestSuite } from "./test_suite";
import { TestResult } from "./test_result.js";
import { Reporter } from "./reporter.js";
import { TestRig } from "./test_rig.js";

export interface Outcome {
    errors?: Error[],
    FAILED: boolean,
    results: TestResult[];
    rigs?: TestRig[];
}

export interface Globals {

    suites: Map<string, TestSuite>;

    reporter: Reporter;

    runner?: Runner;

    watchers: FSWatcher[];

    outcome: Outcome;

    /**
     * Forcefully exits the test frame.
     */
    exit: (error?: Error) => void;

    /**
     * `true` if test files and dependencies with relative 
     * paths are to be watched.
     */
    WATCH: boolean;

    /**
     * `true` if a test is running.
     */
    PENDING: boolean;

};
