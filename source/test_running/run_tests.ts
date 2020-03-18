import spark from "@candlefw/spark";

import { completedRun, updateRun, startRun } from "../reporting/report.js";

import { Globals } from "source/types/globals.js";

import { TestRig } from "source/types/test_rig.js";
import { TestSuite } from "source/types/test_suite";

export async function runTests(final_tests: TestRig[], suites: TestSuite[], globals: Globals, RELOAD_DEPENDS: boolean = false) {

    const { runner, reporter, outcome, WATCH } = globals,
        update_timout = 10;

    let FAILED = false, t = update_timout;

    await startRun(final_tests, suites, reporter);

    outcome.results.length = 0

    for (const res of runner.run(final_tests, RELOAD_DEPENDS)) {

        if (res) {

            outcome.results.push(...res);

            if (WATCH && t-- < 0) {

                t = update_timout;
                updateRun(outcome.results, suites, reporter);
            }
        }
        await spark.sleep(1);
    }

    try {
        FAILED = await completedRun(outcome.results, suites, reporter, WATCH ? undefined : console);
    } catch (e) {
        FAILED = true;
        console.error(e);
    }

    outcome.FAILED = FAILED;

    return outcome;
}
