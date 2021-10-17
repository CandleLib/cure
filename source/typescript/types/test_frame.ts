/**
 * @module candle.cure
 */

import { Outcome, Globals } from "./globals";
import { Reporter } from "./reporter";
import { TestSuite } from './test_suite';

/**
 * Returned from a call to `createTestFrame`. Provides an
 * interface to manage active tests. 
 */
export interface TestFrame {

    /**
     * True if the argument WATCH was passed to test.
     */
    readonly WATCHED: boolean;

    /**
    * Will end testing and resolve the start promise.
    *
    * Only applicable when tests are being watched.
    */
    endWatchedTests: () => void;

    /**
    * Starts the test cycle. An optional array of 
    * TestSuites can be passed to override the default
    * behavior of loading tests from `*.spec.js` files.
    */
    start: (suites?: TestSuite[]) => Promise<Outcome>;

    /**
     * Set the reporter used to log test data.
     */
    setReporter: (reporter: Reporter) => void;

    /**
     * The number of threads the test frame uses
     * when running tests.
     */
    readonly number_of_workers: number;

    /**
     * The globals object
     */
    readonly globals: Globals;

    /**
     * Returns a promise that resolves when the 
     * global initialization has completed.
     */
    init(): Promise<void>;
};

/**
 * An object of options that can be passed to the createTestFrame function.
 */
export interface TestFrameOptions {
    /**
     * Set to `true` to enable file watching features.
     * 
     * @default false
     */
    WATCH?: boolean;

    /**
     * Number of workers threads to use to run tests concurrently.
     * 
    * @default 2
     */
    number_of_workers?: number;

    /**
     * Additional  {@link #AssertionSiteCompiler} to use to compile assertion sites.
     * These will receive selection priority over the built in {@link AssertionSiteCompiler AssertionSiteCompilers}.
     */
    assertion_compilers?: [];

    /**
     * Wait for loading, parsing and linking of all relative imported files before testing. 
     * May slow down initial loading of tests.
     * 
     * @default false
     */
    PRELOAD_IMPORTS?: boolean;

    /**
     * Root dir of @candlelib/cure. Required 
     */
    test_dir?: string;

    /**
     * Maximum time (in milliseconds) a test rig is allowed to 
     * run before throwing an error for taking too long.
     */
    max_timeout?: number;

    /**
     * If true, runs browser tests in headless mode (if available for selected browsers)
     */
    BROWSER_HEADLESS?: boolean;
}
