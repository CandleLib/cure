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

function endWatchedTests(globals: Globals, resolution) {

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
        }
        else
            resolution();
    }
}

function InitializeReporterColors(reporter: Reporter): Reporter {
    reporter.colors = Object.assign({}, colors, reporter.colors);
    return reporter;
}

const DefaultOptions: TestFrameOptions = {
    WATCH: false,
    number_of_workers: 2,
    assertion_compilers: []
};

/**
 * Loads tests files and returns a TestFrame from which tests can be run. 
 * 
 * @param {TestFrameOptions} - A TestFrameOptions object.
 * @param {string[]} test_suite_url_strings - An array of file paths to retrieve test files from.
 */
export function createTestFrame(
    {
        WATCH = false,
        number_of_workers = 2,
        assertion_compilers = []
    }: TestFrameOptions
        = DefaultOptions,
    ...test_suite_url_strings: string[]
): TestFrame {

    let resolution = null;

    let globals: Globals = {
        PENDING: false,
        suites: null,
        reporter: InitializeReporterColors(new BasicReporter()),
        runner: null,
        watchers: [],
        watched_files_map: new Map(),
        outcome: { FAILED: true, results: [], errors: [] },
        WATCH,
        exit: (reason = "Exiting for an unknown reason", error) => {

            const { fail } = globals.reporter.colors;

            console.log("\n" + fail + reason + colors.rst + "\n");

            if (error) {
                console.error(error);
                globals.outcome.errors.push(error);
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

            await URL.polyfill();

            if (resolution)
                endWatchedTests(globals, resolution);

            resolution = res;

            globals.suites = new Map(test_suite_url_strings.map((url_string, index) => [
                url_string, { origin: url_string, rigs: [], index }
            ]));

            globals.runner = new RunnerBoss(Math.max(number_of_workers, 1));

            globals.watchers.length = 0;

            const { suites, runner } = globals;

            try {

                for (const suite of suites.values())
                    await loadSuite(suite, globals);

                const st = Array.from(suites.values());

                globals.PENDING = true;

                await runTests(st.flatMap(suite => suite.rigs), st, globals);

            } catch (e) {
                globals.outcome.errors.push(new TestError(e, module.filename));
            }

            globals.PENDING = false;

            if (WATCH) {
                console.log("Waiting for changes...");
                process.on("exit", () => {
                    console.log("EXITING");
                    endWatchedTests(globals, resolution);
                });
            } else {
                endWatchedTests(globals, resolution);
            }
        })
    };
}
;
