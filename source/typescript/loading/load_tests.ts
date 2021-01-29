import { createSourceMap, createSourceMapJSON, SourceMap } from "@candlefw/conflagrate";
import { parser, renderWithFormattingAndSourceMap } from "@candlefw/js";
import URL from "@candlefw/url";
import { Lexer } from "@candlefw/wind";
import path from "path";
import { compileTests } from "../compile/compile.js";
import { format_rules } from "../reporting/utilities/format_rules.js";
import { AssertionSite } from "../types/assertion_site.js";
import { Globals } from "../types/globals.js";
import { ImportModule, ImportRequirement, ImportSource, ModuleSpecifier } from "../types/imports.js";
import { Test } from "../types/test.js";
import { TestSuite } from "../types/test_suite.js";
import { createTestError } from "../utilities/library_errors.js";

/**
 * Create Tests from a test filepath and add to suite.
 * 
 * @param {string} url_string - A path to the test file.
 * @param {TestSuite} suite - A TestSuite that the TestRigs will be added to.
 */
export function loadTests(text_data: string, suite: TestSuite, globals: Globals): void {

    try {
        const lex = new Lexer(text_data);

        lex.source = suite.origin;

        const { assertion_sites } = compileTests(parser(lex).ast, globals, "");

        suite.tests = mapAssertionSitesToTests(assertion_sites, suite, globals);

    } catch (e) {

        createTestError(globals, suite, e, `Critical error encountered when compiling tests`);
    }
}

function mapAssertionSitesToTests(assertion_sites: AssertionSite[], suite: TestSuite, globals: Globals): Test[] {

    const test_rigs: Test[] = [];

    for (const assertion_site of assertion_sites) {

        const
            {
                source,
                import_arg_specifiers,
                import_module_sources,
                args,
                mappings
            } = createTestRigFunctionSourceCode(suite, assertion_site),

            sm = createSourceMap(mappings, "", "", [], [], []);

        test_rigs.push(
            createTestRig(
                assertion_site,
                suite,
                globals,
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
    assertion_site: AssertionSite,
    suite: TestSuite,
    globals: Globals,
    import_module_sources: ImportSource[],
    import_arg_specifiers: ModuleSpecifier[],
    test_function_source: string,
    test_function_arguments: string[],
    source_map: SourceMap
): Test {
    const
        {
            static_name,
            pos,
            index,
            IS_ASYNC,
            SOLO,
            RUN,
            INSPECT,
            BROWSER,
            timeout_limit
        } = assertion_site;

    return {

        name: static_name,
        suite_index: suite.index,
        index,
        timeout_limit: timeout_limit > 0 ? timeout_limit : globals.max_timeout,
        retries: globals.default_retries,

        import_module_sources,
        import_arg_specifiers,

        source: test_function_source,
        test_function_object_args: test_function_arguments,
        pos,
        map: createSourceMapJSON(source_map),

        IS_ASYNC,
        SOLO,
        RUN,
        INSPECT,
        BROWSER: BROWSER || false,

        source_location: suite.url.toString(),
        working_directory: globals.package_dir.toString(),

    };
}

function createTestRigFunctionSourceCode(suite: TestSuite, assertion_site: AssertionSite) {

    const
        { ast, imports } = assertion_site,
        test_function_arguments: string[] = [],
        import_arg_names: any[] = [],
        import_module_sources: ImportSource[] = [],
        import_arg_specifiers: ModuleSpecifier[] = [];

    let error = null, mappings = <Array<number[]>>[];

    try {
        collectImports(suite, imports, import_module_sources, import_arg_names, import_arg_specifiers);

        test_function_arguments.push("$harness", ...import_arg_names);

        const source = renderWithFormattingAndSourceMap(ast, <any>format_rules, null, mappings, 0, null);

        return {
            error, source,
            import_module_sources,
            import_arg_specifiers,
            args: test_function_arguments,
            mappings
        };

    } catch (e) {
    }
}

function collectImports(
    suite: TestSuite,
    import_links: ImportRequirement[],
    import_module_sources: ImportSource[],
    import_arg_names: any[],
    import_arg_specifiers: ModuleSpecifier[]
) {
    const ImportMap: Map<ImportModule, string> = new Map();
    // Load imports into args
    for (const { module: import_module, name: { import_name, module_name, pos } } of import_links) {

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

