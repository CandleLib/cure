import { Reporter } from "../types/reporter.js";
import { CLITextDraw } from "../utilities/cli_text_console.js";
import { TestResult } from "../types/test_result.js";
import { rst } from "../utilities/colors.js";
import { performance } from "perf_hooks";
import { TestSuite } from "../types/test_suite.js";
import { TestRig } from "../types/test_rig.js";
import { TestError } from "../test_running/test_error.js";
import { inspect } from "util";

/**
 * Creates a printable inspection message.
 * @param result 
 * @param test 
 * @param suite 
 * @param reporter 
 */
async function createInspectionMessage(result: TestResult, test: TestRig, suite: TestSuite, reporter: Reporter): Promise<string> {
    let errors = [];

    for (let error of result.errors) {

        if (error.WORKER)
            error = Object.assign(new TestError(""), error);

        errors.push(await error.toAsyncBlameString());
    }


    const
        { msgD, pass, symD, valB, symC, symA } = reporter.colors,
        str_col = symC,
        num_col = symA,
        str =
            `${rst}
Test Duration: ${num_col + result.duration + rst}
Test Start Time: ${num_col + result.start + rst}
Test End Time: ${num_col + result.end + rst}

Source File: ${str_col + suite.origin + rst}

Dependencies:
    ${str_col + (test.import_module_sources.map(e => e.source.trim()).join("\n     ") || pass + "none") + rst}

-------------------------------------------------------------------------------
Test Rig Source Code:

    ${test.source.trim().split("\n").join("\n    ")}

-------------------------------------------------------------------------------
${rst}
`;

    return str.trim();
}

function getNameData(name: string) {

    const
        name_parts = name.split("-->"),
        suites = name_parts.slice(0, -1),
        name_string = name_parts.pop();

    return { suites, name: name_string };
}
type SuiteData = { tests: Map<string, { name: string, complete: boolean, failed: boolean; duration: number; }>, suites: Map<string, SuiteData>; };
/**
 * Basic Report is the template reporter that implements all primary features of a reporter.
 */
export class BasicReporter implements Reporter {

    colors: Reporter["colors"];

    suites: SuiteData;

    time_start: number;

    constructor() { this.suites = null; this.time_start = 0; }

    render(suites = this.suites, prepend = "") {

        const
            strings = [],
            { fail, msgA, pass, msgB } = this.colors;

        for (const [key, suite] of suites.suites.entries()) {

            strings.push(prepend + key + ":");

            for (const test of suite.tests.values()) {


                if (test.complete) {
                    const dur = ` - ${Math.round((test.duration * (test.duration < 1 ? 1000 : 1)))}${test.duration < 1 ? "μs" : "ms"}`;

                    if (test.failed) {

                        strings.push(prepend + fail + "  ❌ " + msgA + test.name + dur + rst);
                    }
                    else {

                        strings.push(prepend + pass + "  ✅ " + msgA + test.name + dur + rst);
                    }
                }
                else
                    strings.push(prepend + "    " + msgB + test.name + rst);
            }

            strings.push(this.render(suite, prepend + "  "));
        }

        return strings.join("\n");
    }

    async start(pending_tests: TestRig[], suites: TestSuite[], terminal: CLITextDraw) {

        pending_tests = pending_tests.slice()
            .sort((a, b) => a.index < b.index ? -1 : 1)
            .sort((a, b) => a.suite_index < b.suite_index ? -1 : 1);

        this.time_start = performance.now();

        //order tests according to suite
        this.suites = { suites: new Map, tests: new Map };

        try {


            for (const e of pending_tests) {

                let suites_ = this.suites.suites, target_suite = this.suites;

                const { suites, name } = getNameData(e.name);

                for (const suite of suites) {

                    if (!suites_.has(suite))
                        suites_.set(suite, { tests: <Map<string, { name: string, complete: boolean, failed: boolean; duration: number; }>>new Map(), suites: new Map() });

                    target_suite = suites_.get(suite);

                    suites_ = target_suite.suites;
                };

                target_suite.tests.set(name, { name, complete: false, failed: false, duration: 0 });

            }
        } catch (e) {
            //console.log(e);
        }

    }

    async update(results: Array<TestResult>, suites: TestSuite[], terminal: CLITextDraw, COMPLETE = false) {

        terminal.clear();

        for (const { test, errors, duration } of results) {

            let suites_ = this.suites.suites, target_suite = this.suites;

            const { suites, name } = getNameData(test.name);

            for (const suite of suites) {

                if (!suites_.has(suite))
                    suites_.set(suite, { tests: <Map<string, { name: string, complete: boolean, failed: boolean; duration: number; }>>new Map(), suites: new Map() });

                target_suite = suites_.get(suite);

                suites_ = target_suite.suites;
            };

            target_suite.tests.set(name, { name, complete: true, failed: errors ? errors.length > 0 : true, duration });
        }

        const out = this.render();

        if (!COMPLETE) {
            terminal.log(out);
            await terminal.print();
        }

        return out;
    }

    async complete(results: TestResult[], suites: TestSuite[], terminal: CLITextDraw): Promise<boolean> {

        const
            strings = [await this.update(results, suites, terminal, true)],
            { fail, msgA, pass, objB, valB } = this.colors,
            errors = [], inspections = [];

        let
            FAILED = false,
            total = results.length,
            failed = 0;

        try {
            for (const result of results) {

                const { test, errors: test_errors } = result;

                if (!test_errors)
                    terminal.log(`Missing test_errors from test ${inspect(result)}`);

                const { suites: suites_name, name } = getNameData(test.name);

                if (test_errors && test_errors.length > 0) {

                    for (let error of test_errors) {

                        failed++;

                        FAILED = true;

                        if (error.WORKER)
                            error = Object.assign(new TestError(""), error);

                        if (error.origin) {

                            const lex = await error.blameSource();

                            errors.push(`${rst}[ ${msgA + suites_name.join(" > ")} - ${rst + name + msgA} ]${rst} failed:\n\n    ${
                                fail
                                + lex.errorMessage(error.message, error.origin, 120)
                                    .replace(error.match_source, error.replace_source)
                                    .split("\n")
                                    .join("\n    ")
                                }\n${rst}`);

                        } else {
                            errors.push(`${rst}[ ${msgA + suites_name.join(" > ")} - ${rst + name + msgA} ]${rst} failed:\n\n    ${
                                fail + error.message.split("\n").join("\n    ")}\n`);
                        }
                    }
                }

                if (test.INSPECT) {
                    const suite = suites[test.suite_index];


                    errors.push(`${objB}[ ${msgA + suites_name.join(" > ")} - ${rst + name + objB} ] ${objB}inspection${rst}:`,
                        "   " + (await createInspectionMessage(result, test, suite, this))
                            .split("\n")
                            .join("\n    ")
                    );
                }
            }

            for (const suite of suites) {

                if (suite.error) {
                    failed++;
                    errors.push(`${rst}Suite ${fail + suite.origin + rst} failed:\n\n    ${
                        fail + suite.error.message.split("\n").join("\n    ")}\n${rst}`, "");
                }
            }
        } catch (e) {
            failed++;
            errors.push(`${rst}Reporter failed:\n\n    ${
                fail + e.stack.split("\n").join("\n   ")}\n${rst}`, "");
        }

        strings.push(`${total} test${total !== 1 ? "s" : ""} run. ${total > 0 ? (failed > 0
            ? fail + `${failed} failed test${(failed !== 1 ? "s" : "") + rst} :: ${pass + (total - failed)} passed test${total - failed !== 1 ? "s" : ""}`
            : pass + "All tests passed") : ""} ${rst}\n\nTotal time ${(performance.now() - this.time_start) | 0}ms\n\n`);

        terminal.log(strings.join("\n"), errors.join("\n"), inspections.join("\n"), rst);

        await terminal.print();

        return FAILED;
    }
}
