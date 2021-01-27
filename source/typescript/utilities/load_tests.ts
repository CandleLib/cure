import path from "path";

import URL from "@candlefw/url";
import { parser, renderWithFormattingAndSourceMap } from "@candlefw/js";
import { createSourceMap, createSourceMapJSON, SourceMap } from "@candlefw/conflagrate";

import { TestRig, ModuleSpecifier, ImportSource } from "../types/test_rig.js";
import { compileTest } from "../compile/compile.js";
import { TestSuite } from "../types/test_suite.js";
import { Globals } from "../types/globals.js";
import { format_rules } from "./format_rules.js";
import { TestError } from "../test_running/test_error.js";
import { ImportModule } from "../types/import_module.js";
import { Lexer } from "@candlefw/wind";
import { RawTestRig } from "../types/raw_test.js";
import { ImportName } from "../types/import_name.js";

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

        const
            { ast } = parser(lex),
            { raw_tests } = await compileTest(ast, globals.reporter, "");

        suite.rigs = mapRawTestsToTests(raw_tests, suite, globals);

    } catch (e) {
        suite.rigs.length = 0;
        suite.error = new TestError(e, suite.origin, 0, 0, "", "");
    }
}

function mapRawTestsToTests(raw_rigs: RawTestRig[], suite: TestSuite, globals: Globals): TestRig[] {

    const test_rigs: TestRig[] = [];

    for (const raw_rig of raw_rigs) {

        let
            source = "",
            mappings = [],
            args = [],
            import_module_sources: ImportSource[] = [],
            import_arg_specifiers: ModuleSpecifier[] = [],
            error = raw_rig.error;

        if (!error) {
            ({ error, source, import_arg_specifiers, import_module_sources, args, mappings } = createTestRigFunctionSourceCode(suite, raw_rig));
        }

        const sm = createSourceMap(mappings, "", "", [], [], []);

        test_rigs.push(
            createTestRig(
                raw_rig,
                suite,
                globals,
                error,
                import_module_sources,
                import_arg_specifiers,
                source,
                args,
                sm
            )
        );
    }

    return test_rigs;
}

function createTestRig(
    raw_rig: RawTestRig,
    suite: TestSuite,
    globals: Globals,
    error: Error,
    import_module_sources: ImportSource[],
    import_arg_specifiers: ModuleSpecifier[],
    test_function_source: string,
    test_function_arguments: string[],
    source_map: SourceMap
): TestRig {
    const
        {
            name,
            pos,
            index,
            type,
            test_maps,
            IS_ASYNC,
            SOLO,
            RUN,
            INSPECT,
            BROWSER,
            timeout_limit
        } = raw_rig;

    return {
        cwd: new URL(suite.origin).dir,

        name,
        suite_index: suite.index,
        type,
        index,
        timeout_limit: timeout_limit > 0 ? timeout_limit : globals.max_timeout,
        retries: globals.default_retries,

        error,

        import_module_sources,
        import_arg_specifiers,

        source: test_function_source,
        test_function_object_args: test_function_arguments,
        pos,
        map: createSourceMapJSON(source_map),
        test_maps,

        IS_ASYNC,
        SOLO,
        RUN,
        INSPECT,
        BROWSER: BROWSER || false,
    };
}

function createTestRigFunctionSourceCode(suite: TestSuite, raw_rig: RawTestRig) {

    const
        {
            ast,
            imports,
        } = raw_rig,
        test_function_arguments: [] = [],
        import_arg_names: any[] = [],
        import_module_sources: ImportSource[] = [],
        import_arg_specifiers: ModuleSpecifier[] = [];

    let error = null, mappings = <Array<number[]>>[];

    try {
        collectImports(imports, suite, import_module_sources, import_arg_names, import_arg_specifiers);
    } catch (e) {
        error = new TestError(e, "");
    }

    test_function_arguments.push("$harness", "AssertionError", ...import_arg_names);

    const source = renderWithFormattingAndSourceMap(ast, <any>format_rules, null, mappings, 0, null);

    return {
        error, source,
        import_module_sources,
        import_arg_specifiers,
        args: test_function_arguments,
        mappings
    };
}

function collectImports(imports: { module: ImportModule; name: ImportName; }[], suite: TestSuite, import_module_sources: ImportSource[], import_arg_names: any[], import_arg_specifiers: ModuleSpecifier[]) {
    const ImportMap: Map<ImportModule, string> = new Map();
    // Load imports into args
    for (const { module: import_module, name: { import_name, module_name, pos } } of imports) {

        let source = "";

        if (!ImportMap.has(import_module)) {

            const { module_source, IS_RELATIVE } = import_module;

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
}

