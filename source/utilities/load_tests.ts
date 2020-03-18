import path from "path";

import URL from "@candlefw/url";
import { parser, render as $r } from "@candlefw/js";
import { createSourceMap, createSourceMapJSON } from "@candlefw/conflagrate";

import { TestRig } from "../types/test_rig.js";
import { TestError } from "../test_running/test_error.js";
import { compileTest } from "../compile/compile.js";
import { TestSuite } from "../types/test_suite.js";
import { Reporter } from "../main.js";

/**
 * Creates TestRigs from a test file.
 * 
 * @param {string} url_string - A path to the test file.
 * @param {TestSuite} suite - A TestSuite that the TestRigs will be attached to.
 */
export async function loadTests(url_string: string, suite: TestSuite, reporter: Reporter): Promise<void> {

    try {

        const
            url = new URL(path.resolve(process.cwd(), url_string)),
            text = await url.fetchText(),
            ast = parser(text),
            { raw_tests } = await compileTest(ast, reporter);

        let source = "";

        for (const { error: e, ast, imports, name, pos, index } of raw_tests) {

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

                        const
                            { import_names: imports, module_source, IS_RELATIVE }
                                = import_obj,
                            source = IS_RELATIVE
                                ? URL.resolveRelative(module_source, url) + ""
                                : module_source + "";

                        import_module_sources.push({ source, IS_RELATIVE });

                        for (const import_spec of imports) {

                            import_arg_names.push(import_spec.import_name);

                            import_arg_specifiers.push({
                                module_specifier: source,
                                module_name: import_spec.module_name
                            });
                        }
                    }
                } catch (e) {
                    error = e;
                }
                args.push("$cfw", "AssertionError",
                    ...import_arg_names);

                source = $r(ast, map);
            }

            map.sourceContent.push(text);

            suite.rigs.push(<TestRig>{
                index,
                suite_index: suite.index,
                name,
                source,
                import_module_sources,
                import_arg_specifiers,
                map: createSourceMapJSON(map, <string>text),
                origin: url_string,
                test_function_object_args: args,
                RUN: true,
                IS_ASYNC: false,
                error,
                pos
            });
        }

    } catch (e) {
        suite.rigs.length = 0;
        suite.error = new TestError(e, 0, 0, "", "");
    }
}
