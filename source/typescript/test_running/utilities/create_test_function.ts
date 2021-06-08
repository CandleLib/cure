import { Test } from "../../types/test.js";
import { TestHarness } from "../../types/test_harness.js";
import { createHierarchalName } from "../../utilities/name_hierarchy.js";

const AsyncFunction = (async function () { }).constructor;
export async function createTestFunctionFromTestSource(
    test: Test,
    harness: TestHarness,
    ImportedModules: Map<string, NodeModule>,
    ld: (arg: string) => Promise<NodeModule>,
    createAddendum = (a, b) => ""
) {

    harness.pushTestResult();

    harness.setResultName(createHierarchalName(test.name, "Could Not Load Imports"));

    await loadModules(test, ImportedModules, ld);

    harness.popTestResult();


    harness.pushTestResult();

    harness.setResultName(createHierarchalName(test.name, "Could Not Create Test Function"));

    const compiled_fn = createTest__cfwtest(test, createAddendum(test.import_module_sources, test), harness, ImportedModules);

    harness.popTestResult();

    return compiled_fn;
}

export function createTest__cfwtest(test: Test, addendum: string, harness: TestHarness, ImportedModules: Map<string, NodeModule>) {

    const
        { test_function_object_args, import_arg_specifiers, source } = test,

        test_args = [harness];

    for (const e of import_arg_specifiers) {

        const module = ImportedModules.get(e.module_specifier);

        if (!module[e.module_name])
            throw new Error(`Could not find object [${e.module_name}] export of ${e.module_specifier}`);

        test_args.push(module[e.module_name]);
    }

    try {
        const fn = ((AsyncFunction)(...test_function_object_args, addendum + source));

        return () => fn.apply({}, test_args);
    } catch (e) {
        e.message = e.message + "dds";
        throw e;
    }
}

async function loadModules(test: Test, ImportedModules: Map<string, NodeModule>, ld: (arg: string) => Promise<NodeModule>) {

    for (const { source, module_specifier } of test.import_module_sources)

        if (!ImportedModules.has(module_specifier)) {

            const mod = await ld(source, module_specifier);

            if (!mod) {
                throw new Error(`Could not load module ${module_specifier} located ${source}`);
            }
            ImportedModules.set(module_specifier, mod);
        }
}

