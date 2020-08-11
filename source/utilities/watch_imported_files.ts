import fs from "fs";

import { runTests } from "../test_running/run_tests.js";
import { rst } from "./colors.js";
import { TestSuite } from "../types/test_suite";
import { fatalExit } from "./fatal_exit.js";
import { Globals } from "source/types/globals.js";
import URL from "@candlefw/url";
import { parser, JSNodeType, ext } from "@candlefw/js";
import { traverse, filter } from "@candlefw/conflagrate";

const fsp = fs.promises;

function createRelativeFileWatcher(path: string, globals: Globals) {

    try {

        const watcher = fs.watch(path, async function () {

            if (!globals.flags.PENDING) {

                globals.flags.PENDING = true;

                const suites = Array.from(globals.watched_files_map.get(path).values());

                await runTests(suites.flatMap(suite => suite.rigs), Array.from(suites), globals, true);

                globals.flags.PENDING = false;

                console.log("Waiting for changes...");
            }
        });

        globals.watchers.push(watcher);
    } catch (e) {
        fatalExit(e, globals.reporter.colors.fail + "\nCannot continue in watch mode when a watched file cannot be found\n d" + path + " " + rst, globals);
    }
}

/**
 * Reads import statements from imported files and attempts to load relative targets for watching purposes. 
 * This is done recursively until no other files can be watched.
 * 
 * @param filepath 
 * @param suite 
 * @param globals 
 */
async function loadImports(filepath: string, suite: TestSuite, globals: Globals) {


    if (!globals.watched_files_map.get(filepath)) {

        globals.watched_files_map.set(filepath, new Map());

        if (globals.flags.WATCH) createRelativeFileWatcher(filepath, globals);

        const org_url = new URL(filepath);

        if (org_url.ext == "js") {

            try {

                const
                    string = await fsp.readFile(org_url.path, { encoding: "utf8" }),
                    ast = parser(string);

                for (const { node } of traverse(ast, "nodes").filter("type", JSNodeType.FromClause)) {

                    const url = new URL(<string>ext(node).url.value);

                    if (url.IS_RELATIVE) {

                        const { path } = URL.resolveRelative(url, org_url);

                        await loadImports(path, suite, globals);
                    }
                }
            } catch (e) {
                return fatalExit(e, globals.reporter.colors.fail + "\nCannot continue in watch mode when a watched file cannot be found\n" + filepath + rst, globals);
            }
        }

        globals.watched_files_map.get(filepath).set(suite.origin, suite);
    }
}

/**
 * Handles the creation of file watchers for relative imported modules.
 */
export async function handleWatchOfRelativeDependencies(suite: TestSuite, globals: Globals) {

    const { rigs: tests, origin } = suite, active_paths: Set<string> = new Set();


    for (const imprt of tests.flatMap(test => test.import_module_sources).filter(src => src.IS_RELATIVE)) {

        const path = imprt.source;

        await loadImports(path, suite, globals);

        active_paths.add(path);
    }

    //And suite to the newly identifier watched file handlers
    for (const path of active_paths.values())
        globals.watched_files_map.get(path).set(origin, suite);
}