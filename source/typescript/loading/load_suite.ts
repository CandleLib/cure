import fs from "fs";

import URL from "@candlelib/uri";
import path from "path";

import { Globals } from "../types/globals.js";
import { TestSuite } from "../types/test_suite.js";

import { compileTestsFromString } from "./load_tests.js";
import { handleWatchOfRelativeDependencies } from "./watch_imported_files.js";
import { createSuiteError } from "../utilities/library_errors.js";
import spark from "@candlelib/spark";

async function loadSuiteCode(
    globals: Globals,
    suite: TestSuite,
    url: URL = suite.url
) {

    suite.name = url.filename;

    suite.url = url;

    suite.data = await suite.url.fetchText();

    suite.tests.length = 0;

    compileTestsFromString(suite.data, suite, globals);
}

export type SuiteReloader = (suite: TestSuite) => Promise<void>;

export async function loadSuite(suite: TestSuite, globals: Globals, reloadSuite: (suite: TestSuite) => Promise<void>) {
    try {

        const { flags: { WATCH, PRELOAD_IMPORTS } } = globals;

        await loadSuiteCode(globals, suite, new URL(path.resolve(process.cwd(), suite.origin)));

        if (PRELOAD_IMPORTS || WATCH)
            await handleWatchOfRelativeDependencies(suite, globals);

        if (WATCH) {

            try {

                const watcher = fs.watch(suite.origin + "", async function (a) {
                    //Sleep 100 ms to ensure new data is read
                    await spark.sleep(100);

                    await reloadSuite(suite);

                });

                globals.watchers.push(watcher);

            } catch (e) {

                createSuiteError(globals, suite, e, `Error trying to work with watched file`);
            }
        }
    } catch (e) {

        createSuiteError(globals, suite, e, `Critical error encountered while compiling suite`);
    }
}

export function createSuiteReloaderFunction(globals: Globals, postInitialize: (suite: TestSuite) => Promise<void>): SuiteReloader {

    return async function reloadTestSuite(suite: TestSuite) {

        if (globals.lock()) {

            globals.flags.PENDING = true;

            await loadSuiteCode(globals, suite);

            compileTestsFromString(suite.data, suite, globals);

            await handleWatchOfRelativeDependencies(suite, globals);

            await postInitialize(suite);

            globals.flags.PENDING = false;

            globals.unlock();
        }
    };
}
