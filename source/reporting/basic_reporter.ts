import spark from "@candlefw/spark";
import URL from "@candlefw/url";
import { Lexer } from "@candlefw/whind";

import { CLITextDraw } from "../utilities/cli_text_console.js";
import { TestResult } from "../types/test_result.js";
import { c_fail, c_done, c_reset, c_success, c_pending } from "../utilities/colors.js";
import { performance } from "perf_hooks";
import { Test } from "../types/test.js";
import { render } from "@candlefw/js";

export class BasicReporter {
    suites: Map<string, any>;

    time_start: number;

    constructor() { this.suites = null; this.time_start = 0; }

    render() {
        const strings = [], suites = this.suites;

        for (const [key, suite] of suites.entries()) {

            strings.push(key + ":");

            for (const test of suite.values()) {

                if (test.complete) {
                    const dur = ` - ${((test.duration * (test.duration < 1 ? 1000 : 1)) | 0)}${test.duration < 1 ? "μs" : "ms"}`;

                    if (test.failed) {

                        strings.push(c_fail + "  ❌ " + c_done + test.name + dur + c_reset);
                    }
                    else {

                        strings.push(c_success + "  ✅ " + c_done + test.name + dur + c_reset);
                    }
                }
                else
                    strings.push("    " + c_pending + test.name + c_reset);
            }

            strings.push("");
        }

        return strings.join("\n");
    }

    async start(pending_tests, suites, console: CLITextDraw | Console) {

        this.time_start = performance.now();

        //order tests according to suite
        this.suites = new Map;

        const suites_ = this.suites;

        for (const e of pending_tests) {

            if (!suites_.has(e.suite)) {

                suites_.set(e.suite, new Map());
            }
            suites_.get(e.suite).set(e.name, { name: e.name, complete: false, failed: false });
        }
    }

    async update(results: Array<TestResult>, suites, terminal: CLITextDraw | Console, COMPLETE = false) {
        terminal.clear();
        const suites_ = this.suites;

        for (const { test, error, duration } of results) {

            suites_.get(test.suite).set(test.name, { name: test.name, complete: true, failed: !!error, duration });
        }

        const out = this.render();

        if (!COMPLETE) {
            terminal.log(out);
        }

        return out;
    }

    async complete(results, suites, terminal: CLITextDraw | Console) {

        const
            strings = [await this.update(results, suites, terminal, true)],
            errors = [];

        let
            FAILED = false,
            total = results.length,
            failed = 0;

        try {
            for (const { test, error } of results) {

                if (error) {
                    failed++;

                    FAILED = true;

                    if (error.IS_TEST_ERROR) {

                        const
                            origin = error.origin || test.origin,
                            data = (await (new URL(origin))
                                .fetchText())
                                .replace(error.match_source, error.replace_source),

                            lex = new Lexer(data);

                        lex.CHARACTERS_ONLY = true;

                        while (!lex.END) {
                            if (lex.line == error.line && lex.char >= error.column) break;
                            lex.next();
                        }

                        errors.push(`[ ${c_done + test.suite} - ${c_reset + test.name + c_done} ]${c_reset} failed:\n\n    ${
                            c_fail + lex.errorMessage(error.message, origin, 120).split("\n").join("\n   ")}\n${c_reset}`);

                    } else {
                        errors.push(`[ ${c_done + test.suite} - ${c_reset + test.name + c_done} ]${c_reset} failed:\n\n    ${
                            c_fail + error.message.split("\n").join("\n   ")}\n`);
                    }

                    errors.push(JSON.stringify(test));
                }
            }


            for (const suite of suites) {

                if (suite.error) {
                    failed++;
                    errors.push(`Suite ${c_fail + suite.name + c_reset} failed:\n\n    ${
                        c_fail + suite.error.message.split("\n").join("\n   ")}\n${c_reset}`);
                }
            }
        } catch (e) {
            failed++;
            errors.push(`Reporter failed:\n\n    ${
                c_fail + e.stack.split("\n").join("\n   ")}\n${c_reset}`);
        }

        strings.push(`${total} test${total !== 1 ? "s" : ""} run. ${total > 0 ? (failed > 0
            ? c_fail + `${failed} failed test${(failed !== 1 ? "s" : "") + c_reset} :: ${c_success + (total - failed)} successful test${total - failed !== 1 ? "s" : ""}`
            : c_success + "All tests succeeded") : ""} ${c_reset}\n\nTotal time ${(performance.now() - this.time_start) | 0}ms\n\n`);

        terminal.log(strings.join("\n"), errors.join("\n"), "\n" + c_reset);

        await spark.sleep(1);

        return FAILED;
    }
}
