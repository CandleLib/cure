import fs from "fs";

import { runTests } from "../test_running/run_tests.js";
import { rst } from "../reporting/utilities/colors.js";
import { TestSuite } from "../types/test_suite";
import { fatalExit } from "../utilities/fatal_exit.js";
import URL from "@candlefw/url";
import { parser, JSNodeType, ext } from "@candlefw/js";
import { traverse, filter } from "@candlefw/conflagrate";
import { Globals } from "../types/globals.js";

const fsp = fs.promises;

function createFileWatcher(path: URL, globals: Globals) {

    try {

        const path_string = path.toString();

        globals.reporter.notify("Watching", path + "");

        const watcher = fs.watch(path_string, async function () {


            if (!globals.flags.PENDING) {

                globals.flags.PENDING = true;

                const suites = Array.from(globals.watched_files_map.get(path_string).values());

                await runTests(suites.flatMap(suite => suite.tests), globals, true);

                globals.flags.PENDING = false;

                globals.reporter.notify("Waiting for changes...");
            }
        });

        globals.watchers.push(watcher);
    } catch (e) {
        fatalExit(e, globals.reporter.colors.fail + "\nCannot continue in watch mode when a watched file cannot be found\n d" + path + " " + rst, globals);
    }
}

/**
 * Reads import statements from imported files and attempts to load relative 
 * targets for watching purposes.  This is done recursively until no new 
 * relative files can be found.
 * 
 * @param filepath 
 * @param suite 
 * @param globals 
 */
async function loadImports(filepath: URL, suite: TestSuite, globals: Globals) {


    const file_path_string = filepath.toString();

    if (globals.watched_files_map.has(file_path_string) /*|| !filepath.isSUBDIRECTORY_OF(globals.package_dir)*/) return;

    if (!globals.watched_files_map.has(file_path_string)) {

        globals.watched_files_map.set(file_path_string, new Map());

        if (globals.flags.WATCH)
            createFileWatcher(filepath, globals);

        if (filepath.ext == "js") {

            try {

                const
                    string = await fsp.readFile(filepath.path, { encoding: "utf8" }),
                    ast = parser(string).ast;

                for (const { node } of traverse(ast, "nodes").filter("type", JSNodeType.FromClause)) {

                    const { path, IS_PACKAGE_PATH } = getPackagePath(<string>ext(node).url.value, globals);

                    let url = new URL(path), IS_RELATIVE = url.IS_RELATIVE;

                    if (IS_RELATIVE)
                        url = URL.resolveRelative(url, filepath);

                    if (IS_RELATIVE || IS_PACKAGE_PATH)
                        loadImports(url, suite, globals);
                }
            } catch (e) {
                return fatalExit(e, globals.reporter.colors.fail + "\nCannot continue in watch mode when a watched file cannot be found\n" + filepath + rst, globals);
            }
        }

        globals.watched_files_map.get(file_path_string).set(suite.origin, suite);
    }
}

function getPackagePath(path: string, globals: Globals)
    : { IS_PACKAGE_PATH: boolean, path: string; } {

    let IS_PACKAGE_PATH = false;

    if (path == globals.package_name) {
        path = URL.resolveRelative(globals.package_main, globals.package_dir).path;
        IS_PACKAGE_PATH = true;
    } else if (path.indexOf(globals.package_name) == 0) {
        path = URL.resolveRelative(path.replace(globals.package_name, "./"), globals.package_dir).path;
        IS_PACKAGE_PATH = true;
    }

    return { IS_PACKAGE_PATH, path };
}

/**
 * Handles the creation of file watchers for relative imported modules.
 */
export async function handleWatchOfRelativeDependencies(suite: TestSuite, globals: Globals) {

    globals.reporter.notify(`\nLoading watched files from suite: ${suite.origin}`);

    const { tests: tests, origin } = suite, active_paths: Set<string> = new Set();

    for (const imprt of tests.flatMap(test => test.import_module_sources).filter(src => {
        const { path, IS_PACKAGE_PATH } = getPackagePath(src.source, globals);

        src.source = path;

        if (IS_PACKAGE_PATH)
            src.IS_RELATIVE = false;

        return src.IS_RELATIVE || IS_PACKAGE_PATH;
    })) {

        const path = URL.resolveRelative(imprt.source, globals.package_dir);

        await loadImports(path, suite, globals);

        active_paths.add(path + "");
    }

    //And suite to the newly identifier watched file handlers
    for (const path of active_paths.values()) {
        if (globals.watched_files_map.get(path))
            globals.watched_files_map.get(path).set(origin, suite);
        else
            throw new Error("Could not configure watch of path " + path);
    }
}