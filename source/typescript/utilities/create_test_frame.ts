import URL from "@candlefw/url";

import { RunnerBoss } from "../test_running/runner_boss.js";
import { BasicReporter } from "../reporting/basic_reporter.js";
import { Globals, Outcome } from "../types/globals";
import { TestFrame } from "../types/test_frame";
import { runTests } from "../test_running/run_tests.js";
import { loadSuite } from "./load_suite.js";
import { Reporter } from "../types/reporter.js";
import * as colors from "./colors.js";
import { TestFrameOptions } from "../types/test_frame_options";
import { TestError } from "../test_running/test_error.js";
import { getPackageJsonObject } from "@candlefw/wax";

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

                for (const test_rig of suite.rigs)
                    globals.outcome.rigs.push(test_rig);
            }

            resolution(globals.outcome);

        } else

            resolution(globals.outcome);
    }
}

export function InitializeReporterColors(reporter: Reporter): Reporter {
    reporter.colors = Object.assign({}, colors, reporter.colors);
    return reporter;
}

const DefaultOptions: TestFrameOptions = {
    test_dir: "",
    PRELOAD_IMPORTS: false,
    WATCH: false,
    number_of_workers: 1,
    assertion_compilers: [],
    max_timeout: 2000
    //test_globs: [path.resolve(process.cwd(), "test/**/*")],
};

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

    const {
        PRELOAD_IMPORTS = false,
        WATCH = false,
        number_of_workers = 2,
        assertion_compilers = [],
        test_dir,
        max_timeout,
        BROWSER_HEADLESS
    } = <TestFrameOptions>Object.assign({}, DefaultOptions, config_options);

    let
        resolution = null,
        globals: Globals = {

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

            reporter: InitializeReporterColors(new BasicReporter()),

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

    return {

        setReporter: (reporter: Reporter) => {
            globals.reporter = InitializeReporterColors(reporter);
        },

        get number_of_workers() { return number_of_workers; },

        get WATCHED() { return WATCH; },

        endWatchedTests: () => endWatchedTests(globals, resolution),

        start: (): Promise<Outcome> => new Promise(async (res) => {

            await URL.server();

            const { package: pkg, FOUND: PACKAGE_FOUND, package_dir }
                = await getPackageJsonObject(process.cwd() + "/");

            if (PACKAGE_FOUND) {
                globals.package_name = pkg?.name ?? "";
                globals.package_dir = new URL(package_dir);
                globals.package_main = pkg?.main ?? "";
            }

            if (resolution)
                endWatchedTests(globals, resolution);

            resolution = res;

            globals.suites = new Map(test_suite_url_strings.map((url_string, index) => [
                url_string, { origin: url_string, rigs: [], index, data: "", name: "" }
            ]));

            globals.runner = new RunnerBoss(Math.max(number_of_workers, 1));

            globals.watchers.length = 0;

            const { suites } = globals;

            if (globals.flags.USE_HEADLESS_BROWSER)
                globals.reporter.notify("-- browser tests will be run in a headless browser --");

            try {

                for (const suite of suites.values())
                    await loadSuite(suite, globals);

                const st = Array.from(suites.values());

                globals.flags.PENDING = true;

                await runTests(st.flatMap(suite => suite.rigs), st, globals);

            } catch (e) {
                globals.outcome.errors.push(new TestError(e, "", 0, 0, "", "", undefined));
            }

            globals.flags.PENDING = false;

            if (WATCH) {

                globals.reporter.notify("Waiting for changes...");

                process.on("exit", () => {

                    globals.reporter.notify("EXITING");

                    endWatchedTests(globals, resolution);
                });

            } else {

                endWatchedTests(globals, resolution);
            }
        })
    };
}
;
