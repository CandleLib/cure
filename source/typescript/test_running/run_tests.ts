import spark from "@candlelib/spark";
import { test } from "@candlelib/wick";
import { completedRun, startRun, updateRun } from "../reporting/report.js";
import { Globals, Outcome } from "../types/globals.js";
import { Test } from "../types/test.js";
import { TestInfo } from "../types/test_info.js";
import { TestRunner, TestRunnerRequest, TestRunnerResponse } from "../types/test_runner.js";

export async function runTests(
    tests: Test[],
    globals: Globals,
    RELOAD_DEPENDENCIES: boolean = false
): Promise<Outcome> {

    const { runners: test_runners = [], outcome } = globals;

    let FAILED = false, SOLO_RUN = false;

    outcome.results.length = 0;

    outcome.fatal_errors.length = 0;

    try {

        let pending = 0;

        const
            runners: TestRunner[] = test_runners.filter(
                r => tests.some(t => r.Can_Accept_Test(t))
            ),

            intermediate_results = [],

            active_tests: { state: number, test: Test; }[] =
                tests.map(test => {
                    if (test.SOLO || test.INSPECT)
                        SOLO_RUN = true;
                    return { state: 0, test };
                })
                    .filter(({ test }) => test.RUN && (!SOLO_RUN || test.INSPECT || test.SOLO)),

            response: TestRunnerResponse = async function (test: Test, ...results: TestInfo[]) {
                intermediate_results.push(...results);
                pending++;
            },

            request: TestRunnerRequest = async function (runner: TestRunner) {
                for (const slug of active_tests.filter(t => t.state == 0))
                    if (runner.Can_Accept_Test(slug.test)) {
                        slug.state = 1;
                        return slug.test;
                    }
            };
        await startRun(active_tests.flatMap(d => d.test), globals);

        for (const runner of runners)
            runner.init(globals, request, response, RELOAD_DEPENDENCIES);

        while (pending <= active_tests.length) {

            if (intermediate_results.length > 0) {

                for (const result of intermediate_results)
                    outcome.results.push(result);

                updateRun(outcome.results, globals);

                intermediate_results.length = 0;
            }

            if (pending == active_tests.length) break;

            await spark.sleep(1);
        }

        for (const runner of runners)
            runner.complete();


        outcome.results.push(...globals.getLibraryTestInfo());
        outcome.results = outcome.results.filter(a => a.test).sort((a, b) => a.test.index < b.test.index ? -1 : 1);

        FAILED = await completedRun(outcome.results, globals);

    } catch (e) {

        FAILED = true;

        outcome.fatal_errors.push(e);

        globals.exit("Unrecoverable error encountered in run_tests.ts", e);
    }

    outcome.FAILED = FAILED;

    return outcome;
}

