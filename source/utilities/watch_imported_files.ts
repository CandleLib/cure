import fs from "fs";

import { runTests } from "../test_running/run_tests.js";
import { c_fail, c_reset } from "./colors.js";
import { Suite } from "../types/test.js";
import { fatalExit } from "./fatal_exit.js";
import { PENDING } from "./pending.js";


const WatchMap: Map<string, Map<string, Suite>> = new Map();

function createRelativeFileWatcher(path: string, runner, reporter) {
    WatchMap.set(path, new Map());
    try {
        fs.watch(path, async function () {
            if (!PENDING) {
                PENDING.is = true;
                const suites = Array.from(WatchMap.get(path).values());
                await runTests(suites.flatMap(suite => suite.tests), Array.from(suites), true, runner, reporter, true);
                PENDING.is = false;
            }
        });
    }
    catch (e) {
        fatalExit(e, c_fail + "\nCannot continue in watch mode when a watched file cannot be found\n" + c_reset);
    }
}
/**
 * Handles the creation of file watchers for relative imported modules.
 */
export async function handleWatchOfRelativeDependencies(suite: Suite, runner, reporter) {
    const { tests, name: origin } = suite, active_paths: Set<string> = new Set();
    tests
        .flatMap(test => test.import_module_sources)
        .filter(src => src.IS_RELATIVE)
        .forEach(src => {
            const path = src.source;
            active_paths.add(path);
            if (!WatchMap.has(path))
                createRelativeFileWatcher(path, runner, reporter);
        });
    //Remove suite from existing maps
    [...WatchMap.values()].map(wm => {
        if (wm.has(origin))
            wm.delete(origin);
    });
    //And suite to the newly identifier watched file handlers
    for (const path of active_paths.values())
        WatchMap.get(path).set(origin, suite);
}
