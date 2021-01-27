import URL from "@candlefw/url";

import { DesktopRunner } from "../test_running/runners/desktop_runner.js";
import { BasicReporter } from "../reporting/basic_reporter.js";
import { Globals, Outcome } from "../types/globals";
import { TestFrame, TestFrameOptions } from "../types/test_frame";
import { runTests } from "../test_running/run_tests.js";
import { loadSuite } from "../loading/load_suite.js";
import { Reporter } from "../types/reporter.js";
import * as colors from "../reporting/utilities/colors.js";
import { TestError } from "./test_error.js";
import { getPackageJsonObject } from "@candlefw/wax";
import { TestSuite } from "../types/test_suite.js";
import { constructHarness } from "../test_running/utilities/test_harness.js";
import { TestHarness } from "../types/test_harness.js";
import { loadExpressionHandler } from "../compile/expression_handler/expression_handler_manager.js";
import default_expression_handlers from "../compile/expression_handler/expression_handlers.js";


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
            harness_clearClipboard
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

            globals.expression_handlers;

            await initializeGlobals(globals, number_of_workers);

            await loadAndRunTestSuites(globals, test_suite_url_strings);

            watchTestsOrExit(globals, resolution);
        })
    };
};

async function loadAndRunTestSuites(globals: Globals, test_suite_url_strings: string[]) {

    globals.flags.PENDING = true;

    try {

        const st = await loadTestSuites(test_suite_url_strings, globals);

        await runTests(st.flatMap(suite => suite.tests), st, globals);

    } catch (e) {
        globals.outcome.errors.push(new TestError(e, "", 0, 0, "", "", undefined));
    }

    globals.flags.PENDING = false;
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

async function loadTestSuites(test_suite_url_strings: string[], globals: Globals) {

    globals.suites = new Map(test_suite_url_strings.map((url_string, index) => [
        url_string, createTestSuite(url_string, index)
    ]));

    for (const suite of globals.suites.values())
        await loadSuite(suite, globals);

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
        name: ""
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