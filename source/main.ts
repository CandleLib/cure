import { cpus } from "os";

import URL from "@candlefw/url";

import CompilerBindings from "./compile/assertion_compilers.js";

import { Runner } from "./test_running/runner.js";
import { BasicReporter } from "./reporting/basic_reporter.js";
import { Globals, Outcome } from "./types/globals";
import { TestFrame } from "./types/test_frame";

import { runTests } from "./test_running/run_tests.js";
import { loadBindingCompiler } from "./compile/assertion_compiler_manager.js";
import { loadSuite } from "./utilities/load_suite.js";

CompilerBindings.map(loadBindingCompiler);

function endWatchedTests(globals: Globals, resolution) {

    for (const watcher of globals.watchers)
        watcher.close();

    if (globals.runner)
        globals.runner.destroy();

    if (resolution) {
        if (globals.outcome)
            resolution(globals.outcome);
        else
            resolution()
    }
}

export function test(WATCH = false, ...test_suite_url_strings: string[]): TestFrame {

    const globals: Globals = {
        PENDING: false,
        suites: null,
        reporter: null,
        runner: null,
        watchers: [],
        outcome: { FAILED: true, results: [] },
        WATCH
    }

    let resolution = null;

    return {

        get WATCHED() { return WATCH },

        endWatchedTests: () => endWatchedTests(globals, resolution),

        start: (): Promise<Outcome> => new Promise(async res => {

            await URL.polyfill();

            resolution = res;

            globals.suites = new Map(test_suite_url_strings.map(url_string => [
                url_string, { origin: url_string, name: url_string, tests: [] }
            ]));

            globals.runner = new Runner(Math.max(cpus().length - 1, 1));
            globals.reporter = new BasicReporter();
            globals.watchers.length = 0;

            const { suites, runner } = globals;

            for (const suite of suites.values())
                await loadSuite(suite, globals);

            const
                st = Array.from(suites.values());

            globals.PENDING = true

            await runTests(st.flatMap(suite => suite.tests), st, globals);

            globals.PENDING = false;

            if (WATCH) {

                console.log("Waiting for changes...");

                process.on("exit", () => {
                    console.log("EXITING")
                    endWatchedTests(globals, resolution)
                })

            } else {
                runner.destroy();
                resolution(globals.outcome);
            }
        })
    }
};