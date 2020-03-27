import { parentPort } from "worker_threads";
import { performance } from "perf_hooks";

import { TestRig } from "../types/test_rig.js";
import { TestResult } from "../types/test_result.js";

import { TestError } from "./test_error.js";
import { harness, inspect } from "./test_harness.js";
import { pass, rst, fail } from "../utilities/colors.js";


const
    ImportedModules: Map<string, any> = new Map(),
    AsyncFunction = (async function () { }).constructor;

let accessible_files: Set<string> = new Set();

async function RunTest(msg) {

    const
        { test }: { test: TestRig; } = msg,
        { test_function_object_args: args, import_arg_specifiers: spec, import_module_sources: sources, source, map } = test,
        result: TestResult = { start: performance.now(), end: 0, duration: 0, errors: [], test, TIMED_OUT: false, PASSED: true };

    try {
        harness.imports = sources;

        harness.errors = [];

        harness.test_index = -1;

        harness.origin = "";

        harness.accessible_files = accessible_files;


        for (const { source } of sources) {

            if (!ImportedModules.has(source)) {

                ImportedModules.set(source, await import(source));
            }
        }

        const testFunction = (test.IS_ASYNC ? AsyncFunction : Function)(...[...args, source]),

            test_args = [harness, TestError, ...spec.map(e => {

                const module = ImportedModules.get(e.module_specifier);

                if (!module[e.module_name])
                    throw new TestError(`Could not find object [${e.module_name}] export of \n${pass} ${e.module_specifier} ${fail}\n`, "", e.pos.line + 1, e.pos.column + 1, e.module_name, pass + e.module_name + fail);

                return module[e.module_name];
            })];


        result.start = performance.now();

        await testFunction.apply({}, test_args);

        result.end = performance.now();

        result.errors = harness.errors;

        if (result.errors.length > 0)
            result.PASSED = false;

    } catch (e) {
        let error = null;

        if (e instanceof TestError) {

            error = e;
        } else {
            try {
                error = new TestError(e, harness.origin, test.pos.line, test.pos.column, "", "", map);
            } catch (ee) {
                error = new TestError(`Could not wrap error:\n ${e} \n` + (typeof ee == "object" ? (ee.stack || ee.message || ee) : ee), harness.origin);
            }
        }

        error.index = harness.test_index;

        result.errors = harness.errors;

        result.errors.push(error);

        result.end = performance.now();

        result.PASSED = false;
    }

    harness.last_error = null;

    result.duration = result.end - result.start;

    parentPort.postMessage(result);

}

parentPort.on("message", RunTest);
