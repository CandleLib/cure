import URL from "@candlelib/uri";
import { FSWatcher } from "fs";
import { DesktopRunner } from "../test_running/runners/desktop_runner.js";
import { THROWABLE_TEST_OBJECT_ID } from "../utilities/throwable_test_object_enum.js";
import { ExpressionHandler } from "./expression_handler.js";
import { RunnerPlugin } from "./plugin.js";
import { Reporter } from "./reporter";
import { Test } from "./test";
import { TransferableTestError } from "./test_error.js";
import { TestHarness } from "./test_harness";
import { TestInfo } from "./test_info";
import { TestRunner } from "./test_runner.js";
import { TestSuite } from "./test_suite";

export interface Outcome {
    fatal_errors?: TransferableTestError[],
    FAILED: boolean,
    results: TestInfo[];
    rigs?: Test[];
}

export interface Globals {

    throwable_id: THROWABLE_TEST_OBJECT_ID.GLOBALS,

    suites: Map<string, TestSuite>;

    expression_handlers: ExpressionHandler[];

    reporter: Reporter;

    runners?: TestRunner[];

    watchers: FSWatcher[];

    watched_files_map: Map<string, Map<string, TestSuite>>;

    outcome: Outcome;

    harness: TestHarness,

    /**
     * Forcefully exits the test frame.
     * 
     * @param reason A message explaining why the test frame is exiting.
     * @param error An optional TransferableTestError object that will logged in the console.
     */
    exit: (reason?: string, error?: TransferableTestError) => void;

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

        USE_HEADLESS_BROWSER: boolean;

    };

    /**
     * Maximum amount of time in milliseconds to wait for a test to complete.
     */
    max_timeout: number;

    /**
     * Default number of times a timed out test should be retried before failing
     */
    default_retries: number;

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
     * Root directory for @candlelib/test
     */
    test_dir: string,

    /**
     * Location of spec file that is being compiled
     */
    input_source?: string,

    /**
     * Aquire global lock. True if lock acquired successfully
     */
    lock(): boolean;
    /**
     * Release lock
     */
    unlock(): void;

    reportErrors(): void;

    getLibraryTestInfo(): TestInfo[];
};
