import path from "path";

import URL from "@candlefw/url";
import { parser, renderWithFormattingAndSourceMap } from "@candlefw/js";
import { createSourceMap, createSourceMapJSON } from "@candlefw/conflagrate";

import { TestRig, ModuleSpecifier, ImportSource } from "../types/test_rig.js";
import { compileTest } from "../compile/compile.js";
import { TestSuite } from "../types/test_suite.js";
import { Globals } from "../types/globals.js";
import { format_rules } from "./format_rules.js";
import { TestError } from "../test_running/test_error.js";
import { ImportModule } from "../types/import_module.js";
import { Lexer } from "@candlefw/wind";

/**
 * Create TestRigs from a test filepath and add to suite.
 * 
 * @param {string} url_string - A path to the test file.
 * @param {TestSuite} suite - A TestSuite that the TestRigs will be added to.
 */
export async function loadTests(text_data: string, suite: TestSuite, globals: Globals): Promise<void> {

    try {
        const lex = new Lexer(text_data);

        lex.source = suite.origin;


        const { ast } = parser(lex);

        const
            { raw_tests } = await compileTest(ast, globals.reporter, "");

        let source = "";

        for (const { error: e, ast, imports, name, pos, index, type, test_maps, IS_ASYNC, SOLO, RUN, INSPECT, BROWSER, timeout_limit } of raw_tests) {

            const
                mappings = <Array<number[]>>[],
                import_arg_names = [],
                args = [],
                import_module_sources: ImportSource[] = [],
                import_arg_specifiers: ModuleSpecifier[] = [];

            let error = e;

            if (!error) {
                try {
                    const ImportMap: Map<ImportModule, string> = new Map();
                    // Load imports into args
                    for (const { module: import_module, name: { import_name, module_name, pos } } of imports) {

                        let source = "";

                        if (!ImportMap.has(import_module)) {
                            const { import_names: imports, module_source, IS_RELATIVE } = import_module;

                            source = IS_RELATIVE
                                ? URL.resolveRelative(module_source, path.resolve(process.cwd(), suite.origin)) + ""
                                : module_source + "";

                            ImportMap.set(import_module, source);

                            import_module_sources.push(<ImportSource>{ module_specifier: source, source, IS_RELATIVE, });
                        } else {
                            source = ImportMap.get(import_module);
                        }

                        import_arg_names.push(import_name);

                        import_arg_specifiers.push({
                            module_specifier: source,
                            module_name: module_name,
                            pos
                        });
                    }
                } catch (e) {
                    error = new TestError(e, "");
                }

                args.push("$harness", "AssertionError",
                    ...import_arg_names);

                source = renderWithFormattingAndSourceMap(ast, <any>format_rules, null, mappings, 0, null);
            }

            const sm = createSourceMap(mappings, "", "", [], [], []);

            suite.rigs.push(<TestRig>{
                type,
                index,
                suite_index: suite.index,
                name,
                source,
                import_module_sources,
                import_arg_specifiers,
                map: createSourceMapJSON(sm),
                test_function_object_args: args,
                error,
                pos,
                test_maps,
                IS_ASYNC,
                SOLO,
                RUN,
                INSPECT,
                BROWSER: BROWSER || false,
                timeout_limit: timeout_limit > 0 ? timeout_limit : globals.max_timeout,
                cwd: new URL(suite.origin).dir
            });
        }

    } catch (e) {
        suite.rigs.length = 0;
        suite.error = new TestError(e, suite.origin, 0, 0, "", "");
    }
}
