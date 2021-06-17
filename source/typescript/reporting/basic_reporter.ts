import { bidirectionalTraverse, traverse } from "@candlelib/conflagrate";
import { performance } from "perf_hooks";
import { Globals } from "../types/globals.js";
import { Reporter } from "../types/reporter.js";
import { Test } from "../types/test.js";
import { TestInfo } from "../types/test_info.js";
import { createHierarchalName, splitHierarchalName } from "../utilities/name_hierarchy.js";
import { blame, blameAssertionSite } from "../utilities/test_error.js";
import { CLITextDraw } from "./utilities/cli_text_console.js";
import { rst } from "./utilities/colors.js";
import { getExpressionHandlerReportLines } from "../compile/expression_handler/expression_handler_functions.js";
import { createInspectionMessage } from "./utilities/create_inspection_message.js";
import spark from "@candlelib/spark";

function Object_Is_TestResult(o: any): o is TestInfo {
    return !!o.test;
}

function getNameData(result: TestInfo | Test, globals: Globals) {

    const
        test: Test = Object_Is_TestResult(result) ? result.test : result,
        name = Object_Is_TestResult(result) ? result.name : createHierarchalName(result.name),
        suite_names = splitHierarchalName(result.name),
        test_name = suite_names.pop();

    let
        origin = "CandleLibrary/test",
        suite_sub_names = [];

    if (globals.suites) {

        const suite = [...globals.suites.values()][test.suite_index];

        if (suite) {

            origin = suite.origin;

            const origin_name = (suite.name ?? "undefined")
                .replace(/[_-]/g, " ")
                .split(" ")
                .map(d => d[0].toLocaleUpperCase() + d.slice(1).toLocaleLowerCase())
                .join(" ");

            suite_names.unshift(origin_name);
        }
    }

    return { suites: [origin, ...suite_names].filter(_ => _), name: test_name };
}


interface TestSuite {
    name: string,
    tests: Map<string, TestInfo>;
    suites: Map<string, TestSuite>;

    strings: string[];
}

function createSuite(name: string): TestSuite {
    return {
        name: name.toString(),
        tests: new Map(),
        suites: new Map(),
        strings: []
    };
}

function getSuiteAtDirectory(suite: TestSuite, dir: string[]): TestSuite {

    if (dir.length > 0) {

        const name = dir.shift();

        if (!suite.suites.has(name))
            suite.suites.set(name, createSuite(name));

        return getSuiteAtDirectory(suite.suites.get(name), dir);
    }

    return suite;
}
type Tests = Map<string, { INSPECT: boolean, name: string, complete: boolean, failed: boolean; duration: number; }>;
type SuiteData = { tests: Tests, suites: Map<string, SuiteData>; };
/**
 * Basic Report is the template reporter that implements all primary features of a reporter.
 */
export class BasicReporter implements Reporter {

    colors: Reporter["colors"];

    root_suite: TestSuite;

    time_start: number;

    notifications: any[];

    WORKING: boolean;

    pending: string;

    constructor() {
        this.root_suite = createSuite("/");
        this.time_start = 0;
        this.notifications = [];
    }

    notify(...messages) {
        const message = messages.map(m => m.toString()).join(" ");
        console.log(`${this.colors.symB + message + rst}`);
    }

    render(globals: Globals) {

        const
            strings = [],
            { fail, msgA, pass, msgB, symD, msgC, bkgr, objA } = this.colors;


        for (const { node: suite, meta: { depth } } of traverse(this.root_suite, "suites").skipRoot()) {

            const
                { name, tests } = suite,
                offsetA = (" ").repeat((depth) * 2),
                offsetB = (" ").repeat((depth + 1) * 2),
                suite_strings = [];

            let suite_header = "", FAILURE;

            for (const test_result of tests.values()) {
                const
                    { test, PASSED } = test_result,
                    { name: result_name } = getNameData(test_result, globals),
                    duration = test_result.clipboard_end - test_result.previous_clipboard_end,
                    dur_string = ` # ${Math.round((duration * (duration < 1 ? 10000 : 10))) / 10}${duration < 1 ? "μs" : "ms"}`;

                FAILURE = FAILURE || !PASSED;

                if (result_name.trim() == name.trim()) {
                    if (PASSED)
                        suite_header = offsetA + pass + "✓ " + msgA + result_name + dur_string + rst;
                    else
                        suite_header = offsetA + fail + "✗ " + msgA + result_name + dur_string + rst;
                } else {
                    if (PASSED)
                        suite_strings.push(offsetB + pass + " ✓ " + msgA + result_name + dur_string + rst);
                    else
                        suite_strings.push(offsetB + fail + " ✗ " + msgA + result_name + dur_string + rst);
                }
            }

            if (!suite_header) {
                if (tests.size == 0)
                    suite_header = offsetA + symD + "" + name + ":" + rst;
                else if (FAILURE) {
                    suite_header = offsetA + objA + "" + name + ":" + rst;
                } else
                    suite_header = offsetA + symD + "" + name + ":" + rst;
            }

            strings.push(suite_header, ...suite_strings);
        }

        return strings.join("\n") + "\n";
    }

    async loadingSuites(global: Globals, terminal) { }

    async loadingTests(global: Globals, terminal) { }

    async reloadingWatchedFile(global: Globals, terminal) { }

    async reloadingWatchedSuite(global: Globals, terminal) { }

    async prestart(global: Globals, terminal) { }

    async renderToTerminal(output: string, terminal: CLITextDraw) {
        if (this.WORKING) {

            this.pending = output;
            return;
        }

        this.pending = output;

        this.WORKING = true;

        terminal.log(this.pending);

        this.pending = "";

        await terminal.print();

        this.WORKING = false;
        /*
        if (this.pending) {

            const transfer = this.pending;

            this.pending = null;

            await this.renderToTerminal(transfer, terminal);
        }
        */

    }
    async start(pending_tests: Test[], global: Globals, terminal: CLITextDraw) {

        //Each test is its own suite.
        await this.renderToTerminal("starting", terminal);
        this.root_suite = createSuite("/");

        pending_tests = pending_tests.slice()
            .sort((a, b) => a.index < b.index ? -1 : 1)
            .sort((a, b) => a.suite_index < b.suite_index ? -1 : 1);

        this.time_start = performance.now();

        try {
            for (const test of pending_tests) {

                const { suites, name } = getNameData(test, global);

                const suite = getSuiteAtDirectory(this.root_suite, suites);
            }
        } catch (e) {
            //console.log(e);
        }

        this.render(global);
    }


    async update(results: Array<TestInfo>, global: Globals, terminal: CLITextDraw, COMPLETE = false) {

        for (const result of results) {

            const { suites, name } = getNameData(result, global);

            const suite = getSuiteAtDirectory(this.root_suite, suites);

            suite.tests.set(name, result);
        }

        const out = this.render(global);

        if (!COMPLETE)
            await this.renderToTerminal(out, terminal);

        return out;
    }

    async complete(results: TestInfo[], globals: Globals, terminal: CLITextDraw): Promise<boolean> {

        const
            time_end = performance.now(),

            strings = [await this.update(results, globals, terminal, true)],

            suites = [...globals.suites.values()],

            { fail, msgA, pass, objB } = this.colors;

        let

            total = results.length,

            failed = 0;

        try {


            for (const { node: suite, meta: { depth, parent } } of bidirectionalTraverse(this.root_suite, "suites", true)) {

                const
                    { name, tests } = suite, offsetA = (" ").repeat((depth) * 2), offsetB = (" ").repeat((depth + 1) * 2);

                if (tests.size > 0) {

                    for (const test_result of tests.values()) {

                        const
                            { test, PASSED } = test_result,
                            { name: result_name } = getNameData(test_result, globals);

                        if (!PASSED) {

                            failed++;


                            if (test_result.expression_handler_identifier >= 0) {


                                for (const line of getExpressionHandlerReportLines(test_result, globals))

                                    suite.strings.push(offsetB + line);

                                suite.strings.push(...(await blameAssertionSite(test, test_result, globals.harness)).map(s => offsetB + s));
                            }
                            for (const error of test_result.errors) {

                                suite.strings.push(offsetB + result_name + ":");

                                if (error.CAN_RESOLVE_TO_SOURCE) {
                                    const blame_string = await blame(error, globals.harness);
                                    suite.strings.push(...blame_string.map(s => offsetB + s));
                                }

                                suite.strings.push(offsetB + error.summary, ...error.detail.map(s => offsetB + s));
                            }


                            suite.strings.push("", "");
                        }

                        if (test?.INSPECT) {

                            suite.strings.push(...(await createInspectionMessage(test_result, test, suites[test.suite_index], this)).split("\n").map(str => offsetB + str));

                            if (test_result.logs.length > 0)

                                suite.strings.push(offsetB + "console.log calls:", ...test_result.logs.map(s => offsetB + "  " + s), "");
                        }

                    }
                }


                if (suite.strings.length > 0) {
                    const header = offsetA + name;
                    if (depth > 1)
                        parent.strings.push(header, ...suite.strings);
                    else
                        strings.push(header, ...suite.strings, "");

                }

                suite.strings.length = 0;
            }

        } catch (e) {
            failed++;
            strings.push(e);
            //  errors.push(`${rst}Reporter failed:\n\n    ${fail + (await (new TestError(e)).toAsyncBlameString()).split("\n").join("\n   ")}\n${rst}`, "");
        }

        strings.push(`${total} test${total !== 1 ? "s" : ""} ran. ${total > 0 ? (failed > 0
            ? fail + `${failed} test${(failed !== 1 ? "s" : "")} failed ${rst}:: ${pass + (total - failed)} test${total - failed !== 1 ? "s" : ""} passed`
            : pass + (total > 1 ? "All tests passed" : "The Test Has Passed")) : ""} ${rst}\n\nTotal time ${(time_end - this.time_start) | 0}ms\n\n`);


        await spark.sleep(10);

        await this.renderToTerminal([strings.join("\n"), rst].join("\n"), terminal);

        return failed > 0;
    }
}
