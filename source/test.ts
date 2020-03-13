import { parser, render as $r } from "@candlefw/js";
import URL from "@candlefw/url";
import {
    createSourceMap, createSourceMapJSON
} from "@candlefw/conflagrate";

import path from "path";
import fs from "fs";

import { compileTest } from "./compile.js";
import { runTests } from "./test_running/run_tests.js";
import { Runner } from "./test_running/runner.js";
import { BasicReporter } from "./reporting/basic_reporter.js";

let
    suites = null,
    reporter = null,
    runner = null;

async function loadTests(url, suite, WATCH = false) {
    try {

        const
            text = await url.fetchText(),
            ast = parser(text),
            { asts, imports, name: suite_name } = await compileTest(ast, url);

        suite.name = suite_name;

        for (const final of asts) {

            const
                map = createSourceMap(),
                import_arg_names = [],
                import_module_sources = [],
                import_arg_specifiers = [];

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

            const
                args = ["i", "AssertionError", ...import_arg_names, $r(final.ast, map)];

            suite.tests.push({
                name: final.name,
                suite: suite_name,
                import_module_sources,
                import_arg_specifiers,
                map: createSourceMapJSON(map, text),
                origin: url + "",
                test_function_object_args: args,
                RUN: true,
                errors: []
            });
        }
    } catch (e) {
        suite.tests.length = 0;
        suite.error = e;
    }
}

const WatchMap = new Map();

async function loadSuite(suite, WATCH = false) {

    suite.tests.length = 0;
    suite.error = null;
    suite.name = suite.url + "";

    await loadTests(suite.url, suite, WATCH);

    if (WATCH) {
        let PENDING = false;

        //Watch all relative import files 
        suite.tests

            .flatMap(test => test.import_module_sources)

            .filter(src => src.IS_RELATIVE)

            .forEach(src => {

                const path = src.source;

                if (!WatchMap.has(path)) {

                    WatchMap.set(path, new Map());

                    fs.watch(path, async function () {
                        if (!PENDING) {
                            PENDING = true;

                            const suites = Array.from(WatchMap.get(path).values());

                            await runTests(
                                suites.flatMap(suite => suite.tests),
                                Array.from(suites),
                                WATCH,
                                runner,
                                reporter,
                                true);

                            console.log("Waiting for changes...");
                            PENDING = false;
                        }
                    });
                } else {
                    const watch = WatchMap.get(path);
                    watch.set(suite.name, suite);
                }
            });

        fs.watch(suite.url + "", async function (a) {
            if (!PENDING) {
                PENDING = true;
                suite.tests.length = 0;
                suite.error = null;
                suite.name = suite.url + "";
                await loadTests(suite.url, suite, WATCH);
                await runTests(suite.tests.slice(), [suite], WATCH, runner, reporter);
                console.log("Waiting for changes...");
                PENDING = false;
            }
        });
    }
}

async function test(WATCH = false, ...test_suite_url_strings: string[]) {

    await URL.polyfill();

    suites = new Map(test_suite_url_strings.map((url_string: string) => [
        url_string, { url: new URL(path.resolve(process.cwd(), url_string)), tests: [] }
    ]));

    for (const suite of suites.values())
        await loadSuite(suite, WATCH);

    runner = new Runner(4);
    reporter = new BasicReporter();

    const
        st = Array.from(suites.values()),
        FAILED = await runTests(st.flatMap(suite => suite.tests), st, WATCH, runner, reporter) ||
            Array.from(suites.values()).filter(s => !!s.error).length > 0;

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