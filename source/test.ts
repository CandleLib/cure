import { parser, render as $r } from "@candlefw/js";
import URL from "@candlefw/url";

import path from "path";
import fs from "fs";

import { createSourceMap } from "@candlefw/conflagrate";
import CompilerBindings from "./compile/assertion_compilers.js";
import { loadBindingCompiler } from "./compile/assertion_compiler_manager.js";
import { compileTest } from "./compile/compile.js";
import { runTests } from "./test_running/run_tests.js";
import { Runner } from "./test_running/runner.js";
import { BasicReporter } from "./reporting/basic_reporter.js";
import { c_fail, c_reset } from "./utilities/colors.js";
import { Suite, Test } from "./types/test.js";
import { TestAssertionError } from "./types/test_error.js";
import { handleWatchOfRelativeDependencies } from "./utilities/watch_imported_files.js";
import { PENDING } from "./utilities/pending.js";
import { fatalExit } from "./utilities/fatal_exit.js";
import { cpus } from "os";

CompilerBindings.map(loadBindingCompiler);

let
    suites: Map<string, Suite> = null,
    reporter = null,
    runner = null;

async function loadTests(url_string, suite) {
    try {

        const
            url = new URL(path.resolve(process.cwd(), url_string)),
            text = await url.fetchText(),
            ast = parser(text),
            { raw_tests } = await compileTest(ast);

        for (const { error: e, ast, imports, name, pos } of raw_tests) {

            const
                map = createSourceMap(),
                import_arg_names = [],
                args = [],
                import_module_sources = [],
                import_arg_specifiers = [];

            let error = e;

            if (!error) {

                try {


                    // Load imports into args
                    for (const import_obj of imports) {

                        const { import_names: imports, module_source, IS_RELATIVE } = import_obj,
                            source = IS_RELATIVE ? URL.resolveRelative(module_source, url) + "" : module_source + "";

                        import_module_sources.push({ source, IS_RELATIVE });

                        for (const import_spec of imports) {
                            import_arg_names.push(import_spec.import_name);
                            import_arg_specifiers.push({ module_specifier: source, module_name: import_spec.module_name });
                        }
                    }

                } catch (e) {
                    error = e;
                }
                args.push("$cfw", "AssertionError", ...import_arg_names, $r(ast));
            }


            suite.tests.push(<Test>{
                name,
                suite: "TODO at test:70:0",
                import_module_sources,
                import_arg_specifiers,
                //map: createSourceMapJSON(map, <string>text),
                origin: url_string,
                test_function_object_args: args,
                RUN: true,
                IS_ASYNC: false,
                error,
                pos
            });
        }
    } catch (e) {
        suite.tests.length = 0;
        suite.error = new TestAssertionError(e, 0, 0, "", "");
    }
}

async function loadSuite(suite, WATCH = false) {

    suite.tests.length = 0;
    suite.error = null;
    suite.name = suite.origin + "";

    await loadTests(suite.origin, suite);

    if (WATCH) {


        handleWatchOfRelativeDependencies(suite, runner, reporter);

        try {
            fs.watch(suite.origin + "", async function (a) {
                if (!PENDING.is) {
                    PENDING.is = true;
                    suite.tests.length = 0;
                    suite.error = null;
                    suite.name = suite.origin + "";

                    await loadTests(suite.origin, suite);

                    handleWatchOfRelativeDependencies(suite, runner, reporter);

                    await runTests(suite.tests.slice(), [suite], true, runner, reporter);

                    PENDING.is = false;
                }
            });
        } catch (e) {
            fatalExit(e, c_fail + "\nCannot continue in watch mode when a watched file cannot be found\n" + c_reset);
        }

    }
}

async function test(WATCH = false, ...test_suite_url_strings: string[]) {

    await URL.polyfill();

    suites = new Map(test_suite_url_strings.map(url_string => [
        url_string, { origin: url_string, name: url_string, tests: [] }
    ]));

    for (const suite of suites.values())
        await loadSuite(suite, WATCH);

    runner = new Runner(Math.max(cpus().length - 1, 1));
    reporter = new BasicReporter();

    const
        st = Array.from(suites.values()),
        outcome = await runTests(st.flatMap(suite => suite.tests), st, WATCH, runner, reporter)
            || { FAILED: Array.from(suites.values()).filter(s => !!s.error).length > 0, results: [] };

    if (WATCH) {
        console.log("Waiting for changes...");
    } else {

        runner.destroy();

        if (outcome.FAILED) {
            console.log("\n Exiting with failed tests. ");
            process.exit(-1);
        }

        process.exit(0);
    }
};

export { test };