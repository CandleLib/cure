import spark from "@candlefw/spark";
import { Runner } from "./runner.js";
import { completedRun, updateRun, startRun } from "./report.js";
export async function runTests(final_tests, suites, runner = new Runner(1), reporter = undefined) {

    await startRun(final_tests, suites, reporter);

    let FAILED = false;

    const results = [];

    for (const res of runner.run(final_tests)) {
        if (res) {
            results.push(...res);
            updateRun(results, suites, reporter);
        }
        await spark.sleep(2);
    }

    try {
        FAILED = await completedRun(results, suites, reporter);
    }

    catch (e) {
        FAILED = true;
        console.error(e);
    }

    return FAILED;
}
