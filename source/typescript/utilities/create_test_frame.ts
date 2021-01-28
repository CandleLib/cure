import URL from "@candlefw/url";

import { DesktopRunner } from "../test_running/runners/desktop_runner.js";
import { BasicReporter } from "../reporting/basic_reporter.js";
import { Globals, Outcome } from "../types/globals";
import { TestFrame, TestFrameOptions } from "../types/test_frame";
import { runTests } from "../test_running/run_tests.js";
import { createSuiteReloaderFunction, loadSuite, SuiteReloader } from "../loading/load_suite.js";
import { Reporter } from "../types/reporter.js";
import * as colors from "../reporting/utilities/colors.js";
import { TestError } from "./test_error.js";
import { getPackageJsonObject } from "@candlefw/wax";
import { TestSuite } from "../types/test_suite.js";
import { constructHarness } from "../test_running/utilities/test_harness.js";
import { TestHarness } from "../types/test_harness.js";
import { loadExpressionHandler } from "../compile/expression_handler/expression_handler_manager.js";
import default_expression_handlers from "../compile/expression_handler/expression_handlers.js";
import { createGlobalError } from "./library_errors.js";
import { loadTests } from "../loading/load_tests.js";
import { handleWatchOfRelativeDependencies } from "../loading/watch_imported_files.js";
import { completedRun } from "../reporting/report.js";
import { TestInfo } from "../types/test_info.js";


const DefaultOptions: TestFrameOptions = {
    test_dir: "",
    PRELOAD_IMPORTS: false,
    WATCH: false,
    number_of_workers: 1,
    assertion_compilers: [],
    max_timeout: 2000
};

type Resolver = (value: Outcome | PromiseLike<Outcome>) => void;

/**
 * Loads tests files and returns a TestFrame from which tests can be run. 
 * 
 * @param {TestFrameOptions} - A TestFrameOptions object.
 * @param {string[]} test_suite_url_strings - An array of file paths to retrieve test files from.
 */
export function createTestFrame(
    config_options: TestFrameOptions,
    ...test_suite_url_strings: string[]
): TestFrame {



    const

        { harness,
            harness_init,
            harness_getResults,
            harness_flushClipboard
        } = constructHarness(
            (a, b) => a == b,
            { performance: () => 0 },
            <Performance>{ now: () => 0 },
            {},
            TestError
        ),
        {
            PRELOAD_IMPORTS = false,
            WATCH = false,
            number_of_workers = 2,
            test_dir,
            max_timeout,
            BROWSER_HEADLESS
        } = Object.assign(<TestFrameOptions>{}, DefaultOptions, config_options),
        globals = createGlobals(
            harness,
            max_timeout,
            test_dir,
            WATCH,
            PRELOAD_IMPORTS,
            BROWSER_HEADLESS,
            null
        );


    let resolution: Resolver = null;

    function initializeResolver(res: Resolver) {

        if (resolution) endWatchedTests(globals, resolution);

        resolution = res;
    }

    globals.getLibraryTestInfo = function () {
        harness_flushClipboard();

        const results = harness_getResults();

        results.forEach(r => r.test = { name: "Library Error" });

        return results;
    };

    globals.reportErrors = function reportErrors() {

        harness_flushClipboard();

        const results = globals.getLibraryTestInfo();

        completedRun(results, globals);

        harness_init();

        globals.unlock();
    };

    return {

        setReporter: (reporter: Reporter) => {
            globals.reporter = initializeReporterColors(reporter);
        },

        get number_of_workers() { return number_of_workers; },

        get WATCHED() { return WATCH; },

        endWatchedTests: () => endWatchedTests(globals, resolution),

        start: (): Promise<Outcome> => new Promise(async (resolver: Resolver) => {

            await URL.server();

            initializeResolver(resolver);

            await initializeGlobals(globals, number_of_workers);

            try {

                harness_init();

                await loadAndRunTestSuites(globals, test_suite_url_strings);

                watchTestsOrExit(globals, resolution);

            } catch (e) {
                //Use this point to log any errors encountered during test loading
                if (e == 0) {
                    //Error successfully logged to the global harness. Proceed to report error

                    globals.reportErrors();

                    watchTestsOrExit(globals, resolution);

                } else {
                    //Some uncaught error has occured Exit completely
                    globals.exit("Uncaught Exception", e);
                    //Just to make sure
                    process.exit(-1);
                }
            }
        })
    };
};

async function loadAndRunTestSuites(globals: Globals, test_suite_url_strings: string[]) {

    if (globals.lock()) {

        try {

            const reloader: SuiteReloader = createSuiteReloaderFunction(globals, async (suite) => {

                const tests = suite.tests.slice();

                if (tests.length > 0)
                    await runTests(tests, globals);
                else
                    globals.reportErrors();

            });

            const st = await loadTestSuites(test_suite_url_strings, globals, reloader);

            const tests = st.flatMap(suite => suite.tests);

            if (tests.length > 0)
                await runTests(tests, globals);
            else
                globals.reportErrors();

        } catch (e) {

            createGlobalError(globals, e, "Critical Error Encountered");

        }

        globals.unlock();

    } else {
        createGlobalError(globals, new Error("Could Not Acquire Lock"), "Critical Error Encountered");
    }
}

async function initializeGlobals(globals: Globals, number_of_workers: number) {

    for (const expression_handler of default_expression_handlers)
        loadExpressionHandler(globals, expression_handler);

    if (!globals.reporter) globals.reporter = initializeReporterColors(new BasicReporter());

    await loadPackageJson(globals);

    globals.runner = new DesktopRunner(Math.max(number_of_workers, 1));

    globals.watchers.length = 0;

    if (globals.flags.USE_HEADLESS_BROWSER) globals.reporter.notify("-- browser tests will be run in a headless browser --");

}

async function loadPackageJson(globals: Globals) {
    const { package: pkg, FOUND: PACKAGE_FOUND, package_dir } = await getPackageJsonObject(process.cwd() + "/");

    if (PACKAGE_FOUND) {
        globals.package_name = pkg?.name ?? "";
        globals.package_dir = new URL(package_dir);
        globals.package_main = pkg?.main ?? "";
    }
}

async function loadTestSuites(test_suite_url_strings: string[], globals: Globals, suiteReloader: SuiteReloader) {

    globals.suites = new Map(test_suite_url_strings.map((url_string, index) => [
        url_string, createTestSuite(url_string, index)
    ]));

    try {

        for (const suite of globals.suites.values())
            await loadSuite(suite, globals, suiteReloader);

    } catch (e) {
        createGlobalError(globals, e, "Critical Error Encountered");
    }

    const st = Array.from(globals.suites.values());

    return st;
}

function watchTestsOrExit(globals: Globals, resolution: any) {

    if (globals.flags.WATCH) {

        globals.reporter.notify("Waiting for changes...");

        process.on("exit", () => {

            globals.reporter.notify("EXITING");

            endWatchedTests(globals, resolution);
        });

    } else {

        endWatchedTests(globals, resolution);
    }
}

export function createGlobals(
    harness: TestHarness,
    max_timeout: number = 1000,
    test_dir: string = "",
    WATCH: boolean = false,
    PRELOAD_IMPORTS: boolean = false,
    BROWSER_HEADLESS: boolean = false,
    resolution: any = null
): Globals {

    const globals: Globals = {

        expression_handlers: [],

        harness,

        default_retries: 1,

        max_timeout,

        flags: {
            PRELOAD_IMPORTS,

            PENDING: false,

            WATCH,

            USE_HEADLESS_BROWSER: BROWSER_HEADLESS
        },

        test_dir,

        package_name: "",

        package_dir: new URL,

        package_main: "",

        suites: null,

        reporter: null,

        runner: null,

        watchers: [],

        watched_files_map: new Map(),

        outcome: { FAILED: true, results: [], errors: [] },

        exit: (reason = "Exiting for an unknown reason", error) => {

            const { fail } = globals.reporter.colors;

            globals.reporter.notify("\n" + fail + reason + colors.rst + "\n");

            if (error) {
                //Make sure this is printed no matter what.
                console.error(error);
                globals.outcome.errors.push(new TestError(error));
            }

            endWatchedTests(globals, resolution);
        },

        lock: () => {
            const PENDING = globals.flags.PENDING;
            globals.flags.PENDING = true;
            if (!PENDING) {
                globals.flags.PENDING = true;
                return true;
            }
            return false;
        },

        unlock: () => {
            globals.flags.PENDING = false;
        }
    };

    return globals;
}

export function createTestSuite(url_string: string, index: number): TestSuite {
    return {
        origin: url_string,
        tests: [],
        index,
        data: "",
        name: "",
        url: null
    };
}

function endWatchedTests(globals: Globals, resolution: (arg: Outcome) => void) {

    for (const watcher of globals.watchers)
        watcher.close();

    if (globals.runner)
        globals.runner.destroy();

    if (resolution) {

        if (globals.outcome) {

            globals.outcome.rigs = [];

            for (const suite of globals.suites.values()) {

                if (suite.error)
                    globals.outcome.errors.push(suite.error);

                for (const test_rig of suite.tests)
                    globals.outcome.rigs.push(test_rig);
            }

            resolution(globals.outcome);

        } else

            resolution(globals.outcome);
    }
}

export function initializeReporterColors(reporter: Reporter): Reporter {
    reporter.colors = Object.assign({}, colors, reporter.colors);
    return reporter;
}