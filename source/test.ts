import { parser, render as $r } from "@candlefw/js";
import URL from "@candlefw/url";

import path from "path";
import fs from "fs";

import { createSourceMap, createSourceMapJSON } from "@candlefw/conflagrate";
import { compileTest } from "./compile.js";
import { runTests } from "./run_tests.js";
import { Runner } from "./runner.js";
import { BasicReporter } from "./report.js";

let
    suites = null,
    reporter = null,
    runner = null;

async function loadTest(url, suite, WATCH = false) {
    try {

        const
            text = await url.fetchText(),
            ast = parser(text),
            { asts, imports, name: suite_name } = await compileTest(ast);

        suite.name = suite_name;

        for (const final of asts) {

            const
                map = createSourceMap(),
                import_arg_names = [],
                import_module_sources = [],
                import_arg_specifiers = [];

            // Load imports into args
            for (const import_obj of imports) {

                const { import_names: names, module_source: source } = import_obj;

                import_module_sources.push(source);

                for (const name of names) {
                    import_arg_names.push(name.import_name);
                    import_arg_specifiers.push({ module_specifier: source, module_name: name.original_name });
                }
            }

            const
                args = ["s", "AssertionError", ...import_arg_names, $r(final.ast, map)];

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
        console.error(e);
        suite.tests.length = 0;
        suite.error = e;
    }
}

async function loadTests(suite, WATCH = false) {

    suite.tests.length = 0;
    suite.error = null;
    suite.name = suite.url + "";

    await loadTest(suite.url, suite, WATCH);

    if (WATCH) {
        let PENDING = false;
        fs.watch(suite.url + "", async function (a) {
            if (!PENDING) {
                PENDING = true;
                await loadTests(suite, false);
                await runTests(suite.tests, [suite], runner, reporter);
                console.log("Waiting for changes...");
                PENDING = false;
            }
        });
    }
}

async function test(WATCH = false, ...test_suite_url_strings: string[]) {

    await URL.polyfill();


    suites = new Map(test_suite_url_strings.map((url_string: string) => [
        url_string, { url: new URL(url_string), tests: [] }
    ]));

    for (const suite of suites.values()) {
        await loadTests(suite, WATCH);
    }

    runner = new Runner(4);
    reporter = new BasicReporter();

    const
        st = Array.from(suites.values()),
        FAILED = await runTests(st.flatMap(suite => suite.tests), st, runner, reporter);

    if (WATCH) {
        console.log("Waiting for changes...");
    } else {
        runner.destroy();

        if (FAILED)
            process.exit(-1);

        process.exit(0);
    }
};

export { test };