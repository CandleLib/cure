import { FSWatcher } from "fs";
import { RunnerBoss } from "../test_running/runner_boss.js";
import { TestSuite } from "./test_suite";
import { TestResult } from "./test_result.js";
import { Reporter } from "./reporter.js";
import { TestRig } from "./test_rig.js";
import { TestError } from "../test_running/test_error.js";
import URL from "@candlefw/url";

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
     * Set of flags to enable and disable features.
     */
    flags: {

        /**
         * `true` if test import dependencies with relative 
         * paths are to be watched.
         * 
         * @readonly
         * @default false
         */
        WATCH: boolean;

        /**
         * `true` if any test rig is currently running.
         */
        PENDING: boolean;

        /**
         * Wait for loading, parsing and linking of all relative imported files before testing.
         * May slow down initial loading of tests.
         * 
         * @readonly
         * @default false
         */
        PRELOAD_IMPORTS: boolean;

    };

    /**
     * Name of the package test running within. 
     */
    package_name?: string,

    /**
     * File path of the root directory for the package being tested.
     */
    package_dir?: URL,

    /**
     * Main entry point for the package being tested.
     */
    package_main?: string,
    /**
     * Root directory for @candlefw/test
     */
    test_dir: string,

};
