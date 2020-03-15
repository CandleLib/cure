import spark from "@candlefw/spark";
import { Runner } from "./runner.js";
import { completedRun, updateRun, startRun } from "../reporting/report.js";
export async function runTests(final_tests, suites, WATCH = false, runner = new Runner(1), reporter = undefined, RELOAD_DEPENDS: boolean = false) {

    await startRun(final_tests, suites, reporter);

    let FAILED = false;

    const outcome = { FAILED: false, results: [] };
    const update_timout = 10;
    let t = update_timout;
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
