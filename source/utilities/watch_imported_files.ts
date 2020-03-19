import fs from "fs";

import { runTests } from "../test_running/run_tests.js";
import { rst } from "./colors.js";
import { TestSuite } from "../types/test_suite";
import { fatalExit } from "./fatal_exit.js";
import { Globals } from "source/types/globals.js";
import URL from "@candlefw/url";
import { parser, MinTreeNodeType, ext } from "@candlefw/js";
import { traverse, filter } from "@candlefw/conflagrate";

const fsp = fs.promises;

const WatchMap: Map<string, Map<string, TestSuite>> = new Map();

/**
 * Reads import statements from imported files and attempts to load relative targets for watching purposes. 
 * This is done recursively until no other files can be watched.
 * 
 * @param filepath 
 * @param suite 
 * @param globals 
 */
async function loadImports(filepath: string, suite: TestSuite, globals: Globals) {

    if (WatchMap.has(filepath))
        return;

    const org_url = new URL(filepath);

    if (org_url.ext == "js") {
        try {
            const string = await fsp.readFile(org_url.path, { encoding: "utf8" });

            const ast = parser(string);


            for (const imp of traverse(ast, "nodes").then(filter("type", MinTreeNodeType.FromClause))) {

                const url = new URL(<string>ext(imp).url.value);

                if (url.IS_RELATIVE) {

                    const { path } = URL.resolveRelative(url, org_url);

                    createRelativeFileWatcher(path, globals);

                    WatchMap.get(path).set(suite.origin, suite);

                    loadImports(path, suite, globals);
                }
            }

        } catch (e) {
            console.log(e);
        }
    }
}

function createRelativeFileWatcher(path: string, globals: Globals) {

    const url = new URL(path);

    WatchMap.set(path, new Map());

    try {
        const watcher = fs.watch(path, async function () {
            if (!globals.PENDING) {

                globals.PENDING = true;

                const suites = Array.from(WatchMap.get(path).values());

                await runTests(suites.flatMap(suite => suite.rigs), Array.from(suites), globals, true);

                globals.PENDING = false;

                console.log("Waiting for changes...");
            }
        });

        globals.watchers.push(watcher);
    }

    catch (e) {
        fatalExit(e, globals.reporter.colors.fail + "\nCannot continue in watch mode when a watched file cannot be found\n" + rst, globals);
    }
}
/**
 * Handles the creation of file watchers for relative imported modules.
 */
export async function handleWatchOfRelativeDependencies(suite: TestSuite, globals: Globals) {

    const { rigs: tests, origin } = suite, active_paths: Set<string> = new Set();

    tests
        .flatMap(test => test.import_module_sources)
        .filter(src => src.IS_RELATIVE)
        .forEach(src => {

            const path = src.source;

            loadImports(path, suite, globals);

            active_paths.add(path);

            if (!WatchMap.has(path))
                createRelativeFileWatcher(path, globals);
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