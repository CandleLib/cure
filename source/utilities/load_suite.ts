import fs from "fs";

import { rst } from "./colors.js";

import { runTests } from "../test_running/run_tests.js";
import { handleWatchOfRelativeDependencies } from "./watch_imported_files.js";
import { fatalExit } from "./fatal_exit.js";
import { loadTests } from "./load_tests.js";
import { Globals } from "../types/globals.js";
import { TestSuite } from "../types/test_suite.js";

export async function loadSuite(suite: TestSuite, globals: Globals) {

    const { reporter, WATCH } = globals;

    suite.rigs.length = 0;

    suite.error = null;

    await loadTests(suite.origin, suite, reporter);

    if (WATCH) {

        handleWatchOfRelativeDependencies(suite, globals);

        try {
            const watcher = fs.watch(suite.origin + "", async function (a) {

                if (!globals.PENDING) {

                    globals.PENDING = true;

                    suite.rigs.length = 0;

                    suite.error = null;

                    await loadTests(suite.origin, suite, reporter);

                    handleWatchOfRelativeDependencies(suite, globals);

                    await runTests(suite.rigs.slice(), [suite], globals);

                    console.log("Waiting for changes...");

                    globals.PENDING = false;
                }
            });

            globals.watchers.push(watcher);
        }
        catch (e) {
            fatalExit(e, reporter.colors.fail + "\nCannot continue in watch mode when a watched file cannot be found\n" + rst, globals);
        }
    }
}
