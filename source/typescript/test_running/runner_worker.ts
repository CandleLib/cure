import equal from "deep-equal";
import { performance } from "perf_hooks";
import util from "util";

//Types
import { parentPort } from "worker_threads";
import { TestResult } from "../types/test_result.js";
import { TestRig, ImportSource } from "../types/test_rig.js";
import { rst } from "../utilities/colors.js";
import { TestError } from "./test_error.js";
import { harnessConstructor } from "./test_harness.js";
import { constructTestFunction } from "./construct_test_function.js";
import { fail, pass } from "../utilities/colors.js";

export const ImportedModules: Map<string, any> = new Map();

//@ts-ignore
const { harness,
    harness_init,
    harness_clearClipboard,
    harness_getResults,
    harness_overrideLog,
    harness_restoreLog,
} = harnessConstructor(equal, util, performance, rst, TestError, false);

export { harness };

export async function loadImport(source) {
    return await import(source);
}

export function createAddendum(sources: ImportSource[], test: TestRig) {
    if (sources.findIndex(s => s.module_specifier == "@candlefw/wick") >= 0)
        return `await cfw.wick.server(); cfw.url.GLOBAL = new cfw.url("${test.cwd + "/"}")`;
    if (sources.findIndex(s => s.module_specifier == "@candlefw/url") >= 0)
        return `await cfw.url.server(); cfw.url.GLOBAL = new cfw.url("${test.cwd + "/"}")`;
    return "";
}


async function RunTest({ test }: { test: TestRig; }) {
    let results = [];
    try {
        //@ts-ignore
        harness.map = test.map;
        //@ts-ignore
        global.harness = harness;

        const fn = (await constructTestFunction(
            test,
            harness,
            ImportedModules,
            TestError,
            loadImport,
            createAddendum,
            pass,
            fail
        ));

        harness_overrideLog();

        harness_init();

        //Global Test Result
        harness.pushTestResult();

        await fn();

        harness.popTestResult();

        harness_restoreLog();

        results = harness_getResults().slice(1);

    } catch (e) {

        harness_restoreLog();

        let error = null;

        if (e instanceof TestError) {
            error = e;
        } else {
            try {
                error = new TestError(e, harness.origin, test.pos.line, test.pos.column, "", "", test.map);
            } catch (ee) {
                error = new TestError(`Could not wrap error:\n ${e} \n` + (typeof ee == "object" ? (ee.stack || ee.message || ee) : ee), harness.origin);
            }
        }

        error.index = harness.test_index;

        harness.setException(error);

        harness.popTestResult();

        harness_clearClipboard();

        results = harness_getResults().slice(0, 1); //Only return the worker test
    }

    if (results.length == 0) {

        harness_init();

        harness.pushTestResult();

        harness.setException(new Error("No results generated from this test"));

        harness.popTestResult();

        results = harness_getResults();
    }

    results.forEach((r, i) => {
        if (!r.name) r.name = test.name + "_" + i;
    });

    parentPort.postMessage(results);
}

parentPort.on("message", RunTest);