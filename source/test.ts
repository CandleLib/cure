import { parser, render as $r } from "@candlefw/js";
import URL from "@candlefw/url";
import { createSourceMap, createSourceMapJSON } from "@candlefw/conflagrate";
import * as path from "path";
import * as fs from "fs";

import { compileTest } from "./compile/compile.js";
import { runTests } from "./test_running/run_tests.js";
import { Runner } from "./test_running/runner.js";
import { BasicReporter } from "./reporting/basic_reporter.js";
import { c_fail, c_reset } from "./utilities/colors.js";
import { Suite } from "./types/test.js";
import CompilerBindings from "./compile/binding_compilers.js";
import { loadBindingCompiler } from "./compile/binding_compiler_manager.js";
import { TestAssertionError } from "./types/test_error.js";


CompilerBindings.map(loadBindingCompiler);

let
    suites: Map<string, Suite> = null,
    reporter = null,
    runner = null,
    PENDING = false;

function hardFail(error, why_we_are_failing_while_app) {
    console.error(error.message);
    console.log(why_we_are_failing_while_app);
    process.exit(-1);
}

const WatchMap: Map<string, Map<string, Suite>> = new Map();

function createRelativeFileWatcher(path: string) {

    WatchMap.set(path, new Map());

    try {

        fs.watch(path, async function () {

            if (!PENDING) {
                PENDING = true;


                const suites = Array.from(WatchMap.get(path).values());

                await runTests(
                    suites.flatMap(suite => suite.tests),
                    Array.from(suites),
                    true,
                    runner,
                    reporter,
                    true);

                PENDING = false;
            }
        });
    } catch (e) {
        hardFail(e, c_fail + "\nCannot continue in watch mode when a watched file cannot be found\n" + c_reset);
    }
}

/**
 * Handles the creation of file watchers for relative imported modules.
 */
async function handleWatchOfRelativeDependencies(suite: Suite) {

    const { tests, name: origin } = suite,
        active_paths: Set<string> = new Set();

    tests
        .flatMap(test => test.import_module_sources)
        .filter(src => src.IS_RELATIVE)
        .forEach(src => {

            const path = src.source;

            active_paths.add(path);

            if (!WatchMap.has(path))
                createRelativeFileWatcher(path);
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

async function loadTests(url_string, suite) {
    try {

        const
            url = new URL(path.resolve(process.cwd(), url_string)),
            text = await url.fetchText(),
            ast = parser(text),
            { asts, imports, name: suite_name } = await compileTest(ast, url);

        suite.name = suite_name;

        for (const final of asts) {

            const
                error = final.error,
                map = createSourceMap(),
                import_arg_names = [],
                args = [],
                import_module_sources = [],
                import_arg_specifiers = [];

            if (error)
                hardFail(error, "NULL");

            if (!error) {

                // Load imports into args
                for (const import_obj of imports) {

                    const { import_names: names, module_source, IS_RELATIVE } = import_obj,
                        source = IS_RELATIVE ? URL.resolveRelative(module_source, url) + "" : module_source + "";

                    import_module_sources.push({ source, IS_RELATIVE });

                    for (const name of names) {
                        import_arg_names.push(name.import_name);
                        import_arg_specifiers.push({ module_specifier: source, module_name: name.original_name });
                    }
                }

                args.push("i", "AssertionError", ...import_arg_names, $r(final.ast, map));
            }

            suite.tests.push({
                name: final.name,
                suite: suite_name,
                import_module_sources,
                import_arg_specifiers,
                map: createSourceMapJSON(map, <string>text),
                origin: url_string,
                test_function_object_args: args,
                RUN: true,
                error
            });
        }
    } catch (e) {
        suite.tests.length = 0;
        suite.error = new TestAssertionError(e.message + " " + url_string, 0, 0, "", "");
    }
}

async function loadSuite(suite, WATCH = false) {

    suite.tests.length = 0;
    suite.error = null;
    suite.name = suite.origin + "";

    await loadTests(suite.origin, suite);

    if (WATCH) {


        handleWatchOfRelativeDependencies(suite);

        try {
            fs.watch(suite.origin + "", async function (a) {
                if (!PENDING) {
                    PENDING = true;
                    suite.tests.length = 0;
                    suite.error = null;
                    suite.name = suite.origin + "";

                    await loadTests(suite.origin, suite);

                    handleWatchOfRelativeDependencies(suite);

                    await runTests(suite.tests.slice(), [suite], true, runner, reporter);

                    PENDING = false;
                }
            });
        } catch (e) {
            hardFail(e, c_fail + "\nCannot continue in watch mode when a watched file cannot be found\n" + c_reset);
        }

    }
}

async function test(WATCH = false, ...test_suite_url_strings: string[]) {

    console.log(test_suite_url_strings);

    await URL.polyfill();

    suites = new Map(test_suite_url_strings.map(url_string => [
        url_string, { origin: url_string, name: url_string, tests: [] }
    ]));

    for (const suite of suites.values())
        await loadSuite(suite, WATCH);

    runner = new Runner(10);
    reporter = new BasicReporter();

    const
        st = Array.from(suites.values()),
        FAILED = await runTests(st.flatMap(suite => suite.tests), st, WATCH, runner, reporter)
            || Array.from(suites.values()).filter(s => !!s.error).length > 0;

    if (WATCH) {
        console.log("Waiting for changes...");
    } else {

        runner.destroy();

        if (FAILED) {
            console.log("\n Exiting with failed tests. ");
            process.exit(-1);
        }

        process.exit(0);
    }
};

export { test };