import { Test } from "../../types/test.js";
import { TestHarness } from "../../types/test_harness.js";

const AsyncFunction = (async function () { }).constructor,
    accessible_files: Set<string> = new Set();
export async function createTestFunctionFromTestSource(
    test: Test,
    harness: TestHarness,
    ImportedModules: Map<string, NodeModule>,
    TestError,
    ld: (arg: string) => Promise<NodeModule>,
    createAddendum = (a, b) => ""
) {

    harness.pushTestResult();

    harness.setResultName("Could Not Load Imports");

    await loadModules(test, ImportedModules, ld);

    harness.popTestResult();


    harness.pushTestResult();

    harness.setResultName("Could Not Create Test Function");

    const compiled_fn = createTest(test, createAddendum(test.import_module_sources, test), harness, TestError, ImportedModules);

    harness.popTestResult();


    return compiled_fn;
}

function createTest(test: Test, addendum: string, harness: TestHarness, TestError: any, ImportedModules: Map<string, NodeModule>) {

    const
        { test_function_object_args, import_arg_specifiers, source } = test,

        test_args = [harness, TestError];

    for (const e of import_arg_specifiers) {

        const module = ImportedModules.get(e.module_specifier);

        if (!module[e.module_name])
            throw new Error(`Could not find object [${e.module_name}] export of ${e.module_specifier}`);

        test_args.push(module[e.module_name]);
    }

    const

        fn = ((AsyncFunction)(...test_function_object_args, addendum + source));

    return () => fn.apply({}, test_args);
}

async function loadModules(test: Test, ImportedModules: Map<string, NodeModule>, ld: (arg: string) => Promise<NodeModule>) {

    for (const { source, module_specifier } of test.import_module_sources)

        if (!ImportedModules.has(module_specifier))

            ImportedModules.set(module_specifier, await ld(source));
}

