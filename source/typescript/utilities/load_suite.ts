import fs from "fs";

import URL from "@candlefw/url";
import path from "path";

import { Globals } from "../types/globals.js";
import { TestSuite } from "../types/test_suite.js";

import { runTests } from "../test_running/run_tests.js";
import { loadTests } from "./load_tests.js";
import { handleWatchOfRelativeDependencies } from "./watch_imported_files.js";

export async function loadSuite(suite: TestSuite, globals: Globals) {
    try {


        const { flags: { WATCH, PRELOAD_IMPORTS } } = globals,
            url = new URL(path.resolve(process.cwd(), suite.origin)),
            text = await url.fetchText();

        suite.name = url.filename;

        suite.data = text;

        suite.rigs.length = 0;

        suite.error = null;

        await loadTests(text, suite, globals);

        if (PRELOAD_IMPORTS || WATCH)
            await handleWatchOfRelativeDependencies(suite, globals);

        if (WATCH) {

            try {
                const watcher = fs.watch(suite.origin + "", async function (a) {

                    if (!globals.flags.PENDING) {

                        globals.flags.PENDING = true;

                        suite.rigs.length = 0;

                        suite.error = null;

                        suite.data = await url.fetchText();

                        await loadTests(suite.data, suite, globals);

                        handleWatchOfRelativeDependencies(suite, globals);

                        await runTests(suite.rigs.slice(), [suite], globals);

                        console.log("Waiting for changes...");

                        globals.flags.PENDING = false;
                    }
                });

                globals.watchers.push(watcher);
            } catch (e) {
                globals.exit("\nCannot continue in watch mode when a watched file cannot be found\n", e);
            }
        }
    } catch (e) {
        globals.exit("\nCannot continue due to the following error:\n", e);
    }
}
