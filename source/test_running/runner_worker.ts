import { parentPort } from "worker_threads";
import { performance } from "perf_hooks";
import { TestResult } from "../types/test_result";
import { Test } from "../types/test";

/**
 * Candle object accessible within a test.
 */
const i = {
    makeLiteral: (s) => {
        switch (typeof (s)) {
            case "string":
                return `"${s}"`;
            default:
                return s;
        }
    },

    throws: (fn) => {
        try {
            fn();
        } catch (e) {
            return true;
        }

        return false;
    },

    equal: (a, b) => {
        if (typeof a == "object" && typeof b == "object") {
            //Do deep equality
        } else
            return a == b;
    },

    notEqual: (a, b) => {
        if (typeof a == "object" && typeof b == "object") {
            //Do deep equality
        } else
            return a == b;
    }


};

const SourceMaps: Map<string, any> = new Map();

parentPort.on("message", async (msg) => {

    const
        { test }: { test: Test; } = msg,
        { test_function_object_args: args, import_arg_specifiers: spec, import_module_sources: sources, } = test,
        result: TestResult = { start: performance.now(), end: 0, duration: 0, error: null, test, TIMED_OUT: false };

    try {

        for (const { source } of sources) {

            if (!SourceMaps.has(source)) {

                SourceMaps.set(source, await import(source));
            }
        }

        //console.log(test.name, args.slice(-1));

        const testFunction = new (test.async ? Function : Function)(...args),

            //Create arg_map
            test_args = [i, Error, ...spec.map(e => {

                const module = SourceMaps.get(e.module_specifier);

                return module[e.module_name];

            })];

        testFunction.apply({}, test_args);

    } catch (e) {
        result.error = e;
    }

    result.end = performance.now();
    result.duration = result.end - result.start;

    parentPort.postMessage(result);

});

