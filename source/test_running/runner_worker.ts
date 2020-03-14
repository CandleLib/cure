import { parentPort } from "worker_threads";
import { performance } from "perf_hooks";

import { TestResult } from "../types/test_result";
import { Test } from "../types/test";
import equal from "deep-equal";
import { TestAssertionError } from "../types/test_error.js";

/**
 * Candle object accessible within a test.
 */
const i = {
    temp: null,
    temp1: null,
    temp2: null,
    caught_exception: null,
    last_error: null,
    makeLiteral: (s) => {
        switch (typeof (s)) {
            case "string":
                return `"${s}"`;
            case "object":
                if (s instanceof Error)
                    return `[${s.name}]{ message: "${s.message}" }`;
                return JSON.stringify(s);
            default:
                return s;
        }
    },

    throws: (fn) => {
        try {
            fn();
        } catch (e) {
            i.caught_exception = e;
            return true;
        }

        return false;
    },

    equal: (a, b) => {
        if (typeof a == "object" && typeof b == "object" && a != b)
            return equal(a, b);
        return a == b;
    },

    notEqual: (a, b) => {
        if (typeof a == "object" && typeof b == "object") {
            if (a == b)
                return false;
            //Do deep equality
            return !equal(a, b);
        } else
            return a == b;
    },
    setException: (e) => {
        if (!(e instanceof TestAssertionError))
            throw TypeError("Expected an Error object to be thrown.");
        i.last_error = e;
    }
};

//Object.freeze(i);

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

        const testFunction = new (test.IS_ASYNC ? Function : Function)(...args),

            //Create arg_map
            test_args = [i, TestAssertionError, ...spec.map(e => {

                const module = SourceMaps.get(e.module_specifier);

                return module[e.module_name];
            })];

        testFunction.apply({}, test_args);

        result.error = i.last_error;
    } catch (e) {
        result.error = e;
    }

    i.last_error = null;

    result.end = performance.now();
    result.duration = result.end - result.start;

    parentPort.postMessage(result);

});

