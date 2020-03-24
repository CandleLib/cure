import path from "path";

import URL from "@candlefw/url";
import { parser, render as $r, MinTreeNodeDefinition, renderWithFormattingAndSourceMap } from "@candlefw/js";
import { createSourceMap, createSourceMapJSON } from "@candlefw/conflagrate";

import { TestRig } from "../types/test_rig.js";
import { compileTest } from "../compile/compile.js";
import { TestSuite } from "../types/test_suite.js";
import { Globals } from "../types/globals.js";
import { format_rules } from "./format_rules.js";
import { TestError } from "../test_running/test_error.js";

/**
 * Creates TestRigs from a test file.
 * 
 * @param {string} url_string - A path to the test file.
 * @param {TestSuite} suite - A TestSuite that the TestRigs will be attached to.
 */
export async function loadTests(url_string: string, suite: TestSuite, globals: Globals): Promise<void> {

    try {

        const
            url = new URL(path.resolve(process.cwd(), url_string)),
            text = await url.fetchText(),
            ast = parser(text),
            { raw_tests } = await compileTest(ast, globals.reporter, url_string);

        let source = "";

        for (const { error: e, ast, imports, name, pos, index, type, test_maps, IS_ASYNC, SOLO, RUN, INSPECT } of raw_tests) {

            const
                mappings = <Array<number[]>>[],
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

                        //Prime watched files.
                        //if (!globals.watched_files_map.has(source))
                        //    globals.watched_files_map.set(source, null);

                        for (const import_spec of imports) {

                            import_arg_names.push(import_spec.import_name);

                            import_arg_specifiers.push({
                                module_specifier: source,
                                module_name: import_spec.module_name
                            });
                        }
                    }
                } catch (e) {
                    error = new TestError(e, url_string);
                }

                args.push("$harness", "AssertionError",
                    ...import_arg_names);

                source = renderWithFormattingAndSourceMap(ast, format_rules, null, mappings, 0, null);
            }

            const sm = createSourceMap(mappings, "", "", [url_string], [], []);

            suite.rigs.push(<TestRig>{
                type,
                index,
                suite_index: suite.index,
                name,
                source,
                import_module_sources,
                import_arg_specifiers,
                map: createSourceMapJSON(sm),
                origin: url_string,
                test_function_object_args: args,
                error,
                pos,
                test_maps,
                IS_ASYNC,
                SOLO,
                RUN,
                INSPECT
            });
        }
        // inspect(0, 1, 2);
    } catch (e) {
        suite.rigs.length = 0;
        suite.error = new TestError(e, suite.origin, 0, 0, "", "");
    }
}
