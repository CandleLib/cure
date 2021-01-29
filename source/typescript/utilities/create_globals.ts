import URL from "@candlefw/url";
import { Globals } from "../types/globals";
import * as colors from "../reporting/utilities/colors.js";
import { TestError } from "./test_error.js";
import { constructHarness } from "../test_running/utilities/test_harness.js";
import { TestHarness } from "../types/test_harness.js";
import { completedRun } from "../reporting/report.js";
import { TestInfo } from "../types/test_info.js";
import { endWatchedTests } from "./end_watched_tests.js";
import { NullReporter } from "../reporting/null_reporter.js";


export function createGlobals(
    max_timeout: number = 1000,
    test_dir: string = "",
    WATCH: boolean = false,
    PRELOAD_IMPORTS: boolean = false,
    BROWSER_HEADLESS: boolean = false,
    resolution: any = null
): {
    globals: Globals;
    harness: TestHarness;
    harness_init: () => void;
    harness_getResults: () => TestInfo[];
    harness_flushClipboard: () => void;
} {

    const { harness,
        harness_init,
        harness_getResults,
        harness_flushClipboard
    } = constructHarness(
        (a, b) => a == b,
        { performance: () => 0 },
        <Performance>{ now: () => 0 },
        {}
    ),
        globals: Globals = {

            flags: {

                PRELOAD_IMPORTS,

                PENDING: false,

                WATCH,

                USE_HEADLESS_BROWSER: BROWSER_HEADLESS
            },

            default_retries: 1,

            max_timeout,

            test_dir,

            package_name: "",

            package_main: "",

            package_dir: new URL,

            suites: null,

            reporter: new NullReporter,

            runner: null,

            watchers: [],

            watched_files_map: new Map(),

            outcome: { FAILED: true, results: [], fatal_errors: [] },

            expression_handlers: [],

            harness,

            exit(reason = "Exiting for an unknown reason", error) {

                const { fail } = globals.reporter.colors;

                globals.reporter.notify("\n" + fail + reason + colors.rst + "\n");

                if (error) {
                    //Make sure this is printed no matter what.
                    console.error(error);
                    globals.outcome.fatal_errors.push(error);
                }

                endWatchedTests(globals, resolution);
            },

            lock() {
                const PENDING = globals.flags.PENDING;
                globals.flags.PENDING = true;
                if (!PENDING) {
                    globals.flags.PENDING = true;
                    return true;
                }
                return false;
            },

            unlock() {
                globals.flags.PENDING = false;
            },

            getLibraryTestInfo() {
                harness_flushClipboard();

                const results = harness_getResults();

                results.forEach(r => r.test = { name: "Library Error" });

                return results;
            },

            reportErrors() {

                harness_flushClipboard();

                const results = globals.getLibraryTestInfo();

                globals.outcome.results.push(...results);

                globals.outcome.fatal_errors.push(...results.flatMap(i => i.errors));

                completedRun(results, globals);

                harness_init();

                globals.unlock();
            },
        };

    return {
        globals,
        harness,
        harness_init,
        harness_getResults,
        harness_flushClipboard
    };
}
