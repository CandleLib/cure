import URL from "@candlefw/url";

import fs from "fs";
import { cpus } from "os";

import CompilerBindings from "./compile/assertion_compilers.js";
import { c_fail, c_reset } from "./utilities/colors.js";
import { PENDING } from "./utilities/pending.js";

import { Runner } from "./test_running/runner.js";
import { BasicReporter } from "./reporting/basic_reporter.js";
import { Suite } from "./types/test.js";

import { runTests } from "./test_running/run_tests.js";
import { loadBindingCompiler } from "./compile/assertion_compiler_manager.js";
import { handleWatchOfRelativeDependencies } from "./utilities/watch_imported_files.js";
import { fatalExit } from "./utilities/fatal_exit.js";
import { loadTests } from "./compile/load_tests.js";

CompilerBindings.map(loadBindingCompiler);

let
    suites: Map<string, Suite> = null,
    reporter = null,
    runner = null;

async function loadSuite(suite, WATCH = false) {

    suite.tests.length = 0;
    suite.error = null;
    suite.name = suite.origin + "";

    await loadTests(suite.origin, suite);

    if (WATCH) {


        handleWatchOfRelativeDependencies(suite, runner, reporter);

        try {
            fs.watch(suite.origin + "", async function (a) {
                if (!PENDING.is) {
                    PENDING.is = true;
                    suite.tests.length = 0;
                    suite.error = null;
                    suite.name = suite.origin + "";

                    await loadTests(suite.origin, suite);

                    handleWatchOfRelativeDependencies(suite, runner, reporter);

                    await runTests(suite.tests.slice(), [suite], true, runner, reporter);

                    PENDING.is = false;
                }
            });
        } catch (e) {
            fatalExit(e, c_fail + "\nCannot continue in watch mode when a watched file cannot be found\n" + c_reset);
        }

    }
}

async function test(WATCH = false, ...test_suite_url_strings: string[]) {

    await URL.polyfill();

    suites = new Map(test_suite_url_strings.map(url_string => [
        url_string, { origin: url_string, name: url_string, tests: [] }
    ]));

    for (const suite of suites.values())
        await loadSuite(suite, WATCH);

    runner = new Runner(Math.max(cpus().length - 1, 1));
    reporter = new BasicReporter();

    const
        st = Array.from(suites.values()),
        outcome = await runTests(st.flatMap(suite => suite.tests), st, WATCH, runner, reporter)
            || { FAILED: Array.from(suites.values()).filter(s => !!s.error).length > 0, results: [] };

    if (WATCH) {
        console.log("Waiting for changes...");
    } else {

        runner.destroy();

        if (outcome.FAILED) {
            console.log("\n Exiting with failed tests. ");
            process.exit(-1);
        }

        process.exit(0);
    }
};

export { test };