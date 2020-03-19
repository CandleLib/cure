import { parentPort } from "worker_threads";
import { performance } from "perf_hooks";
import { TestResult } from "../types/test_result";
import { TestRig } from "../types/test_rig";
import { TestError } from "./test_error.js";
import { harness } from "./test_harness.js";

const
    ImportedModules: Map<string, any> = new Map(),
    AsyncFunction = (async function () { }).constructor;

parentPort.on("message", async (msg) => {

    const
        { test }: { test: TestRig; } = msg,
        { test_function_object_args: args, import_arg_specifiers: spec, import_module_sources: sources, source, map } = test,
        result: TestResult = { start: performance.now(), end: 0, duration: 0, error: null, test, TIMED_OUT: false };

    try {

        for (const { source } of sources) {

            if (!ImportedModules.has(source)) {

                ImportedModules.set(source, await import(source));
            }
        }

        const testFunction = (test.IS_ASYNC ? AsyncFunction : Function)(...[...args, source]),

            test_args = [harness, TestError, ...spec.map(e => {

                const module = ImportedModules.get(e.module_specifier);

                return module[e.module_name];
            })];

        result.start = performance.now();

        await testFunction.apply({}, test_args);

        result.end = performance.now();

        result.error = harness.last_error;

    } catch (e) {

        result.error = new TestError(e, test.pos.line, test.pos.char, "", "", sources, map);

        result.end = performance.now();
    }

    harness.last_error = null;

    result.duration = result.end - result.start;

    parentPort.postMessage(result);

});
