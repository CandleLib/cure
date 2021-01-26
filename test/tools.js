import URL from "@candlefw/url";
import { parser } from "@candlefw/js";
import { NullReporter } from "@candlefw/test";
import { compileRawTestRigs } from "../build/library/compile/compile_statements.js";
import { createGlobals, createTestSuite, initializeReporterColors } from "../build/library/utilities/create_test_frame.js";
import { loadTests } from "../build/library/utilities/load_tests.js";
import { runTests } from "../build/library/test_running/run_tests.js";
import { RunnerBoss } from "../build/library/test_running/runner_boss.js";

await URL.server();

export function createTestRigsFromStringSource(source) {

    const reporter = new NullReporter;

    initializeReporterColors(reporter);

    const { raw_rigs: rigs } = compileRawTestRigs(parser(source).ast, reporter, []);

    return rigs;
}

function createGlobalsObject(report_constructor = NullReporter) {
    const globals = createGlobals(1000, "internal", false, false, false);

    globals.reporter = initializeReporterColors(new report_constructor());

    return globals;
}

export async function createTestSuiteFromSource(source, globals = createGlobalsObject()) {

    const suite = createTestSuite("internal", 0);

    await loadTests(source, suite, globals);

    suite.name = "test";

    return suite;
}

export async function getSuiteTestOutcomeFromSource(source) {

    const globals = createGlobalsObject();

    globals.runner = new RunnerBoss(1);

    globals.suites = new Map([["dd", await createTestSuiteFromSource(source, globals)]]);

    const suites = Array.from(globals.suites.values());

    await runTests(suites.flatMap(suite => suite.rigs), Array.from(suites), globals);

    return globals.outcome;
}