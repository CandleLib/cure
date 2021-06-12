import URL from "@candlelib/uri";
import { getPackageJsonObject } from "@candlelib/paraffin";
import default_expression_handlers from "../compile/expression_handler/expression_handlers.js";
import { loadExpressionHandler } from "../compile/expression_handler/expression_handler_functions.js";
import { createSuiteReloaderFunction, loadSuite, SuiteReloader } from "../loading/load_suite.js";
import { BasicReporter } from "../reporting/basic_reporter.js";
import * as colors from "../reporting/utilities/colors.js";
import { BrowserRunner } from "../test_running/runners/browser_runner.js";
import { DesktopRunner } from "../test_running/runners/desktop_runner.js";
import { runTests } from "../test_running/run_tests.js";
import { Globals, Outcome } from "../types/globals";
import { Reporter } from "../types/reporter.js";
import { TestFrame, TestFrameOptions } from "../types/test_frame";
import { createGlobals } from "./create_globals.js";
import { createTestSuite } from "./create_test_suite.js";
import { DefaultOptions } from "./default_options.js";
import { endWatchedTests } from "./end_watched_tests.js";
import { createGlobalError } from "./library_errors.js";

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
        {
            PRELOAD_IMPORTS = false,
            WATCH = false,
            number_of_workers = 2,
            test_dir,
            max_timeout,
            BROWSER_HEADLESS
        } = Object.assign(<TestFrameOptions>{}, DefaultOptions, config_options),
        {
            globals,
            harness_init
        } = createGlobals(
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

                harness_init(globals.package_dir.toString(), globals.package_dir.toString());

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


function watchTestsOrExit(globals: Globals, resolution: any) {

    if (globals.flags.WATCH) {

        //  globals.reporter.notify("Waiting for changes...");

        process.on("exit", () => {

            globals.reporter.notify("EXITING");

            endWatchedTests(globals, resolution);
        });

    } else {

        endWatchedTests(globals, resolution);
    }
}

async function initializeGlobals(globals: Globals, number_of_workers: number) {

    for (const expression_handler of default_expression_handlers) {
        loadExpressionHandler(globals, expression_handler);
    }

    if (!globals.reporter) globals.reporter = initializeReporterColors(new BasicReporter());

    await loadPackageJson(globals);

    globals.runners = [
        new DesktopRunner(Math.max(number_of_workers || 1, 1)),
        new BrowserRunner()
    ];

    globals.watchers.length = 0;

    if (globals.flags.USE_HEADLESS_BROWSER) globals.reporter.notify("-- browser tests will be run in a headless browser --");

}

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

async function loadPackageJson(globals: Globals) {
    const { package: pkg, FOUND: PACKAGE_FOUND, package_dir } = await getPackageJsonObject(process.cwd() + "/");

    if (PACKAGE_FOUND) {
        globals.package_name = pkg?.name ?? "";
        globals.package_dir = new URL(package_dir);
        globals.package_main = pkg?.main ?? "";
    }
}

export function initializeReporterColors(reporter: Reporter): Reporter {
    reporter.colors = Object.assign({}, colors, reporter.colors);
    return reporter;
}