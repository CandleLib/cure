import { getPositionLexerFromJsonSourceMap } from "@candlefw/conflagrate";
import { xtF, xtColor, xtReset, color, xtBold } from "@candlefw/wax";

import { markExceptionExpression } from "../get_error_message.js";
import { CLITextDraw } from "../cli_text_console.js";
import spark from "@candlefw/spark";
import URL from "@candlefw/url";
import { Lexer } from "@candlefw/whind";
import { TestResult } from "../types/test_result.js";

const c_pending = xtF(xtColor(color.gray30)), c_done = xtF(xtColor(color.grey50)), c_success = xtF(xtColor(color.seagreen3), xtBold), c_fail = xtF(xtColor(color.rosybrown), xtBold), c_reset = xtF(xtReset);
export class BasicReporter {
    suites: Map<string, any>;

    constructor() { this.suites = null; }

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

    async start(pending_tests, suites, console: CLITextDraw) {

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

    async update(results: Array<TestResult>, suites, console: CLITextDraw, COMPLETE = false) {

        console.clear();
        const suites_ = this.suites;

        for (const { test, error, duration } of results) {

            suites_.get(test.suite).set(test.name, { name: test.name, complete: true, failed: !!error, duration });
        }

        const out = this.render();

        if (!COMPLETE)
            console.log(out);

        return out;
    }

    async complete(results, suites, console: CLITextDraw) {

        const strings = [await this.update(results, suites, console, true)], errors = [];

        let FAILED = false,
            total = results.length,
            failed = 0;

        for (const { test, error } of results) {

            if (error) {

                failed++;

                FAILED = true;

                const
                    data = error.stack
                        .split("\n")[1]
                        .match(/\((.*)/)[0]
                        .slice(1, -1)
                        .split(",")
                        .pop()
                        .trim()
                        .split(":"),
                    [filepath, line, column] = data.length > 3
                        ? [data.slice(0, 2).join(":"), +data[2], +data[3]]
                        : [data[0], +data[1], +data[2]];

                if (filepath == "<anonymous>") {

                    const [l, c] = [line || 1, column || 1],
                        pos = await getPositionLexerFromJsonSourceMap(l, c, test.map);

                    errors.push(`[ ${c_done + test.suite} - ${c_reset + test.name + c_done} ]${c_reset} failed:\n\n    ${
                        markExceptionExpression(pos.errorMessage(error.message, test.origin, 120), pos).split("\n").join("\n   ")
                        }\n`);
                } else {

                    const
                        file_url = new URL(filepath),
                        data = await file_url.fetchText(),
                        lex = new Lexer(data);

                    lex.CHARACTERS_ONLY = true;

                    while (!lex.END) {
                        if (lex.line == line - 1 && lex.char >= column - 1) break;
                        lex.next();
                    }

                    errors.push(`[ ${c_done + test.suite} - ${c_reset + test.name + c_done} ]${c_reset} failed:\n\n    ${
                        lex.errorMessage(error.message, filepath, 120).split("\n").join("\n   ")}\n`);
                }
            }
        }

        for (const suite of suites) {

            if (suite.error) {

                errors.push(`Suite ${c_fail + suite.name + c_reset} failed:\n\n    ${suite.error.message.split("\n").join("\n    ")}\n`);
            }
        }

        strings.push(`${total} test${total !== 1 ? "s" : ""} run. ${total > 0 ? (failed > 0
            ? c_fail + `${failed} failed test${(failed !== 1 ? "s" : "") + c_reset} :: ${c_success + (total - failed)} successful test${total - failed !== 1 ? "s" : ""}`
            : c_success + "All tests succeeded") : ""}\n` + c_reset);

        console.log(strings.join("\n"), "\n", errors.join("\n"));

        await spark.sleep(1);

        return FAILED;
    }
}
;
