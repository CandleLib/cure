import { FSWatcher } from "fs";
import { RunnerBoss } from "../test_running/runner_boss.js";
import { TestSuite } from "./test_suite";
import { TestResult } from "./test_result.js";
import { Reporter } from "./reporter.js";
import { TestRig } from "./test_rig.js";
import { TestError } from "../test_running/test_error.js";

export interface Outcome {
    errors?: TestError[],
    FAILED: boolean,
    results: TestResult[];
    rigs?: TestRig[];
}

export interface Globals {

    suites: Map<string, TestSuite>;

    reporter: Reporter;

    runner?: RunnerBoss;

    watchers: FSWatcher[];

    watched_files_map: Map<string, Map<string, TestSuite>>;

    outcome: Outcome;

    /**
     * Forcefully exits the test frame.
     * 
     * @param reason A message explaining why the test frame is exiting.
     * @param error An optional error object that will logged in the console.
     */
    exit: (reason?: string, error?: Error) => void;

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
