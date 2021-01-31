import spark from "@candlefw/spark";
import { completedRun, startRun, updateRun } from "../reporting/report.js";
import { Globals } from "../types/globals.js";
import { Test } from "../types/test.js";

export async function runTests(
    tests: Test[],
    globals: Globals,
    RELOAD_DEPENDS: boolean = false
) {

    const update_timeout = 0, { runner, outcome } = globals;

    let FAILED = false, t = update_timeout, SOLO_RUN = false;

    try {

        const active_tests = tests
            .map(test => {
                if (test.SOLO || test.INSPECT)
                    SOLO_RUN = true;
                return test;
            })
            .filter(test => test.RUN && (!SOLO_RUN || test.INSPECT || test.SOLO));

        await startRun(active_tests.flat(), globals);

        outcome.results.length = 0;
        outcome.fatal_errors.length = 0;

        for (const res of runner.run(active_tests, RELOAD_DEPENDS, globals)) {
            try {

                if (res) {

                    outcome.results.push(...(res.flat()));

                    if (t-- <= 1) {
                        updateRun(outcome.results, globals);
                        t = update_timeout;
                    }

                }

                await spark.sleep(0);
            } catch (e) {
                return globals.exit("Failed to load test frame", e);
            }
        }

        outcome.results.push(...globals.getLibraryTestInfo());

        outcome.results = outcome.results.sort((a, b) => a.test.index < b.test.index ? -1 : 1);

        FAILED = await completedRun(outcome.results, globals);

    } catch (e) {

        FAILED = true;

        outcome.fatal_errors.push(e);

        globals.exit("Unrecoverable error encountered in run_tests.ts", e);
    }

    outcome.FAILED = FAILED;

    return outcome;
}

