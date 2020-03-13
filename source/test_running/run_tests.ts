import spark from "@candlefw/spark";
import { Runner } from "./runner.js";
import { completedRun, updateRun, startRun } from "../reporting/report.js";
export async function runTests(final_tests, suites, WATCH = false, runner = new Runner(1), reporter = undefined, RELOAD_DEPENDS: boolean = false) {

    await startRun(final_tests, suites, reporter);

    let FAILED = false;

    const results = [];

    for (const res of runner.run(final_tests, RELOAD_DEPENDS)) {
        if (res) {
            results.push(...res);
            if (WATCH)
                updateRun(results, suites, reporter);
        }
        await spark.sleep(2);
    }

    try {
        FAILED = await completedRun(results, suites, reporter);
    } catch (e) {
        FAILED = true;
        console.error(e);
    }

    return FAILED;
}
