import fs from "fs";

import { c_fail, c_reset } from "./colors.js";

import { runTests } from "../test_running/run_tests.js";
import { handleWatchOfRelativeDependencies } from "./watch_imported_files.js";
import { fatalExit } from "./fatal_exit.js";
import { loadTests } from "./load_tests.js";

export async function loadSuite(suite, globals) {

    const { runner, reporter, WATCH } = globals;

    suite.tests.length = 0;

    suite.error = null;

    suite.name = suite.origin + "";

    await loadTests(suite.origin, suite);

    if (WATCH) {

        handleWatchOfRelativeDependencies(suite, globals);

        try {
            const watcher = fs.watch(suite.origin + "", async function (a) {

                if (!globals.PENDING) {

                    globals.PENDING = true;

                    suite.tests.length = 0;

                    suite.error = null;

                    suite.name = suite.origin + "";

                    await loadTests(suite.origin, suite);

                    handleWatchOfRelativeDependencies(suite, globals);

                    await runTests(suite.tests.slice(), [suite], globals);

                    globals.PENDING = false;
                }
            });

            globals.watchers.push(watcher);
        }
        catch (e) {
            fatalExit(e, c_fail + "\nCannot continue in watch mode when a watched file cannot be found\n" + c_reset);
        }
    }
}
