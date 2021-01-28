import URL from "@candlefw/url";
import { parser } from "@candlefw/js";
import { NullReporter } from "@candlefw/test";
import { createGlobals, createTestSuite, initializeReporterColors } from "@candlefw/test/build/library/utilities/create_test_frame.js";
import { compileTests } from "@candlefw/test/build/library/compile/compile.js";
import { loadTests } from "@candlefw/test/build/library/loading/load_tests.js";
import { runTests } from "@candlefw/test/build/library/test_running/run_tests.js";
import { DesktopRunner } from "@candlefw/test/build/library/test_running/runners/desktop_runner.js";
import default_expression_handlers from "../build/library/compile/expression_handler/expression_handlers.js";
import { loadExpressionHandler } from "../build/library/compile/expression_handler/expression_handler_manager.js";

await URL.server();

export function createTestsFromStringSource(source) {

    const globals = createGlobalsObject();

    const { assertion_sites } = compileTests(parser(source).ast, globals, []);

    return assertion_sites;
}

function createGlobalsObject(report_constructor = NullReporter) {

    const globals = createGlobals(1000, "internal", false, false, false);

    for (const expression_handler of default_expression_handlers)
        loadExpressionHandler(globals, expression_handler);

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

    globals.runner = new DesktopRunner(1);

    globals.suites = new Map([["dd", await createTestSuiteFromSource(source, globals)]]);

    const suites = Array.from(globals.suites.values());

    await runTests(suites.flatMap(suite => suite.rigs), Array.from(suites), globals);

    return globals.outcome;
}