import { FSWatcher } from "fs";
import { Runner } from "../test_running/runner.js";
import { TestSuite } from "./test_suite";
import { TestResult } from "./test_result.js";
import { Reporter } from "./reporter.js";

export interface Outcome {
    error?: Error,
    FAILED: boolean,
    results: Array<TestResult>;
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
