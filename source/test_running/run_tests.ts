import spark from "@candlefw/spark";

import { completedRun, updateRun, startRun } from "../reporting/report.js";

import { Globals } from "source/types/globals.js";

import { TestRig, TestMap } from "source/types/test_rig.js";
import { TestSuite } from "source/types/test_suite";
import { TestResult } from "../types/test_result.js";


function TestRigFromTestMap(test_map: TestMap, test_rig: TestRig): TestRig {
    return Object.assign({}, test_rig, {
        name: test_map.name,
        index: test_map.index,
    });
}

function mapResults(rst: TestResult) {

    const test = rst.test;

    if (test.type == "SEQUENCE") {

        const results: TestResult[] =
            test.test_maps.map(tm => (<TestResult>{
                TIMED_OUT: rst.TIMED_OUT,
                PASSED: true,
                duration: rst.duration,
                start: rst.start,
                end: rst.end,
                test: TestRigFromTestMap(tm, test),
                errors: []
            }));

        for (const error of rst.errors) {
            if (error.index >= 0) {
                const result = results[error.index];
                result.PASSED = false;
                result.errors.push(error);
            } else for (const result of results) {
                result.PASSED = false;
                result.errors.push(error);
            }
        }

        return results;
    }
    return rst;
}
export async function runTests(tests: TestRig[], suites: TestSuite[], globals: Globals, RELOAD_DEPENDS: boolean = false) {

    let SOLO_RUN = false;

    const final_tests = tests
        .map(test => {
            if (test.SOLO || test.INSPECT)
                SOLO_RUN = true;
            return test;
        })
        .filter(test => test.RUN && (!SOLO_RUN || test.INSPECT || test.SOLO)),
        { runner, reporter, outcome } = globals,
        update_timout = 5;

    let FAILED = false, t = update_timout;

    await startRun(final_tests.flatMap(test => {

        if (test.type == "SEQUENCE") {
            return test.test_maps.map(tm => TestRigFromTestMap(tm, test));
        } else
            return test;
    }
    ), suites, reporter);

    outcome.results.length = 0;

    for (const res of runner.run(final_tests, RELOAD_DEPENDS)) {
        try {

            if (res) {

                outcome.results.push(...(res).flatMap(mapResults));

                if (t-- < 1) {
                    updateRun(outcome.results, suites, reporter);
                    t = update_timout;
                }

            }
            await spark.sleep(0);
        } catch (e) {
            globals.exit(e);
        }
    }

    outcome.results
        .sort((a, b) => a.test.index < b.test.index ? -1 : 1)
        .sort((a, b) => a.test.suite_index < b.test.suite_index ? -1 : 1);

    try {
        FAILED = await completedRun(outcome.results, suites, reporter);
    } catch (e) {
        FAILED = true;
        console.error(e);
    }

    outcome.FAILED = FAILED;

    return outcome;
}
