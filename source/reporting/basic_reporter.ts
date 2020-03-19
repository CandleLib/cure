import spark from "@candlefw/spark";
import URL from "@candlefw/url";
import { Lexer } from "@candlefw/wind";
import { Reporter } from "../types/reporter.js";
import { CLITextDraw } from "../utilities/cli_text_console.js";
import { TestResult } from "../types/test_result.js";
import { rst } from "../utilities/colors.js";
import { performance } from "perf_hooks";
import { TestSuite } from "../types/test_suite.js";
import { TestRig } from "../types/test_rig.js";

function getNameData(name: string) {
    const name_parts = name.split("-->");
    const suites = name_parts.slice(0, -1);
    const [, name_string, , sub_test_count] = name_parts.pop().match(/([^\@]+)(\@\:(\d+))?/);

    return { suites, name: name_string, sub_test_count: parseInt(sub_test_count) || 0 };
}

type SuiteData = Map<string, { tests: Map<string, { name: string, complete: boolean, failed: boolean; duration: number; }>, suites: any; }>;

export class BasicReporter implements Reporter {
    colors: Reporter["colors"];
    suites: SuiteData;

    time_start: number;

    constructor() { this.suites = null; this.time_start = 0; }

    render(suites = this.suites, prepend = "") {

        const strings = [], { fail, msgA, pass, msgB } = this.colors;

        for (const [key, suite] of suites.suites.entries()) {

            strings.push(prepend + key + ":");

            for (const test of suite.tests.values()) {


                if (test.complete) {
                    const dur = ` - ${((test.duration * (test.duration < 1 ? 1000 : 1)) | 0)}${test.duration < 1 ? "μs" : "ms"}`;

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

    async start(pending_tests: TestRig[], suites: TestSuite[], terminal: CLITextDraw | Console) {

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

                target_suite.tests.set(name, { name, complete: false, failed: false });

            }
        } catch (e) {
            console.log(e);
        }

    }

    async update(results: Array<TestResult>, suites: TestSuite[], terminal: CLITextDraw | Console, COMPLETE = false) {


        terminal.clear();


        for (const { test, error, duration } of results) {

            let suites_ = this.suites.suites, target_suite = this.suites;

            const { suites, name } = getNameData(test.name);

            for (const suite of suites) {

                if (!suites_.has(suite))
                    suites_.set(suite, { tests: <Map<string, { name: string, complete: boolean, failed: boolean; duration: number; }>>new Map(), suites: new Map() });

                target_suite = suites_.get(suite);

                suites_ = target_suite.suites;
            };

            target_suite.tests.set(name, { name, complete: true, failed: !!error, duration });
        }

        const out = this.render();

        if (!COMPLETE)
            terminal.log(out);

        return out;
    }

    async complete(results: TestResult[], suites: TestSuite[], terminal: CLITextDraw | Console): Promise<boolean> {

        const
            strings = [await this.update(results, suites, terminal, true)],
            { fail, msgA, pass } = this.colors,
            errors = [];

        let
            FAILED = false,
            total = results.length,
            failed = 0;

        try {
            for (const { test, error } of results
            ) {

                const { suites: suites_name, name } = getNameData(test.name);

                if (error) {
                    failed++;

                    FAILED = true;

                    if (error.IS_TEST_ERROR) {

                        const
                            origin = error.origin || suites[test.suite_index].origin,
                            data = (await (new URL(origin))
                                .fetchText()),
                            lex = new Lexer(data);

                        lex.CHARACTERS_ONLY = true;

                        while (!lex.END) {
                            if (lex.line == error.line && lex.char >= error.column) break;
                            lex.next();
                        }

                        errors.push(`${rst}[ ${msgA + suites_name.join("|")} - ${rst + name + msgA} ]${rst} failed:\n\n    ${
                            fail
                            + lex.errorMessage(error.message, origin, 120)
                                .replace(error.match_source, error.replace_source)
                                .split("\n")
                                .join("\n   ")
                            }\n${rst}`);

                    } else {
                        errors.push(`${rst}[ ${msgA + suites_name.join("|")} - ${rst + name + msgA} ]${rst} failed:\n\n    ${
                            fail + error.message.split("\n").join("\n   ")}\n`);
                    }
                }
            }

            for (const suite of suites) {

                if (suite.error) {
                    failed++;
                    errors.push(`${rst}Suite ${fail + suite.origin + rst} failed:\n\n    ${
                        fail + suite.error.message.split("\n").join("\n   ")}\n${rst}`);
                }
            }
        } catch (e) {
            failed++;
            errors.push(`${rst}Reporter failed:\n\n    ${
                fail + e.stack.split("\n").join("\n   ")}\n${rst}`);
        }

        strings.push(`${total} test${total !== 1 ? "s" : ""} run. ${total > 0 ? (failed > 0
            ? fail + `${failed} failed test${(failed !== 1 ? "s" : "") + rst} :: ${pass + (total - failed)} successful test${total - failed !== 1 ? "s" : ""}`
            : pass + "All tests succeeded") : ""} ${rst}\n\nTotal time ${(performance.now() - this.time_start) | 0}ms\n\n`);

        terminal.log(strings.join("\n"), errors.join("\n"), "\n" + rst);

        await spark.sleep(1);

        return FAILED;
    }
}
