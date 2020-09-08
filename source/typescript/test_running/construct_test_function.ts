import { TestRig } from "../types/test_rig.js";
import { TestHarness } from "../types/test_harness.js";

const AsyncFunction = (async function () { }).constructor,
    accessible_files: Set<string> = new Set();
export async function constructTestFunction(
    test: TestRig,
    harness: TestHarness,
    ImportedModules: Map<string, NodeModule>,
    TestError,
    ld: (arg: string) => Promise<NodeModule>,
    createAddendum = (a, b) => "",
    pass = "",
    fail = ""
) {

    const { test_function_object_args: args, import_arg_specifiers: spec, import_module_sources: sources, source } = test,
        addendum = createAddendum(sources, test);

    harness.imports = sources;

    harness.errors = [];

    harness.test_index = -1;

    harness.origin = "";

    harness.accessible_files = accessible_files;

    for (const { module_specifier: source } of sources) {
        if (!ImportedModules.has(source))
            ImportedModules.set(source, await ld(source));
    }

    const fn = ((true || test.IS_ASYNC) ? AsyncFunction : Function)(...[...args, addendum + source]),

        test_args = [harness, TestError, ...spec.map(e => {

            const module = ImportedModules.get(e.module_specifier);

            if (!module[e.module_name])
                throw new TestError(`Could not find object [${e.module_name}] export of \n${pass} ${e.module_specifier} ${fail}\n`, "", e.pos.line + 1, e.pos.column + 1, e.module_name, pass + e.module_name + fail);

            return module[e.module_name];
        })];

    return () => fn.apply({}, test_args);

}
