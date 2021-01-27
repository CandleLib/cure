import equal from "deep-equal";
import { performance } from "perf_hooks";
import util from "util";
import { parentPort } from "worker_threads";
import { ImportSource } from "../../types/imports.js";
import { Test } from "../../types/test.js";
import { fail, pass, rst } from "../../reporting/utilities/colors.js";
import { createTestFunctionFromTestSource } from "../utilities/create_test_function.js";
import { TestError } from "../../utilities/test_error.js";
import { harnessConstructor } from "../utilities/test_harness.js";


export const ImportedModules: Map<string, any> = new Map();

//@ts-ignore
const { harness,
    harness_init,
    harness_clearClipboard,
    harness_getResults,
    harness_overrideLog,
    harness_restoreLog,
} = harnessConstructor(equal, util, <Performance><any>performance, rst, TestError, false);

export { harness };

export async function loadImport(source) {
    return await import(source);
}

export function createAddendum(sources: ImportSource[], test: Test) {
    if (sources.findIndex(s => s.module_specifier == "@candlefw/wick") >= 0)
        return `await cfw.wick.server(); cfw.url.GLOBAL = new cfw.url("${test.cwd + "/"}")`;
    if (sources.findIndex(s => s.module_specifier == "@candlefw/url") >= 0)
        return `await cfw.url.server(); cfw.url.GLOBAL = new cfw.url("${test.cwd + "/"}")`;
    return "";
}

async function RunTest({ test }: { test: Test; }) {
    let results = [];

    try {
        //@ts-ignore
        harness.map = test.map;
        //@ts-ignore
        global.harness = harness;

        harness_init();

        harness_overrideLog();

        //Test Initialization TestResult
        harness.pushTestResult();

        harness.setResultName("Load modules and create test function");

        const fn = (await createTestFunctionFromTestSource(
            test,
            harness,
            ImportedModules,
            TestError,
            loadImport,
            createAddendum,
            pass,
            fail
        ));

        harness.popTestResult();


        // Global TestResult 
        // - Catchall for any errors that lead to a hard crash of the test function
        harness.pushTestResult();

        harness.setResultName("Test Rig Ran Without Critical Errors");

        await fn();

        harness.popTestResult();

        harness_restoreLog();

        results = harness_getResults().slice(1, -1);

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

        results = harness_getResults().slice(-1); //Only return the worker test
    }


    if (results.length == 0) {

        harness_init();

        harness.pushTestResult();

        harness.setResultName("No Critical Test Errors");

        harness.setException(new Error("No results generated from this test"));

        harness.popTestResult();

        results = harness_getResults();
    }


    results.forEach((r, i) => {
        if (r.name == "") r.name = "test_" + i;
    });

    parentPort.postMessage(results);
}

parentPort.on("message", RunTest);


