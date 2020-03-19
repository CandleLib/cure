import spark from "@candlefw/spark";

import { completedRun, updateRun, startRun } from "../reporting/report.js";

import { Globals } from "source/types/globals.js";

import { TestRig } from "source/types/test_rig.js";
import { TestSuite } from "source/types/test_suite";

export async function runTests(final_tests: TestRig[], suites: TestSuite[], globals: Globals, RELOAD_DEPENDS: boolean = false) {

    const { runner, reporter, outcome, WATCH } = globals,
        update_timout = 0;

    let FAILED = false, t = update_timout;

    await startRun(final_tests, suites, reporter);

    outcome.results.length = 0;

    for (const res of runner.run(final_tests, RELOAD_DEPENDS)) {

        if (res) {

            outcome.results.push(...res);

            //if (t-- < 0) {
            updateRun(outcome.results, suites, reporter);
            t = update_timout;
            //}
        }
        await spark.sleep(0);
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
