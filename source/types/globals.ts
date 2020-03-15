import { FSWatcher } from "fs";
import { Runner } from "../test_running/runner.js";
import { BasicReporter } from "../reporting/basic_reporter.js";
import { Suite } from "./suite";
import { TestResult } from "./test_result.js";

export type Outcome = {
    FAILED: boolean,
    results: Array<TestResult>
}

export type Globals = {
    suites: Map<string, Suite>;
    reporter: BasicReporter;
    runner: Runner;
    watchers: FSWatcher[];
    outcome: Outcome;

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
