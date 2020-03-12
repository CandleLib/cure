import { getPositionLexerFromJsonSourceMap } from "@candlefw/conflagrate";
import { markExceptionExpression } from "./get_error_message.js";
import { xtF, xtColor, xtReset, color, xtBold } from "@candlefw/wax";


const c_pending = xtF(xtColor(color.gray30)),
    c_done = xtF(xtColor(color.grey50)),
    c_success = xtF(xtColor(color.seagreen3), xtBold),
    c_fail = xtF(xtColor(color.rosybrown), xtBold),
    c_reset = xtF(xtReset);
export class BasicReporter {
    constructor() {
        this.suites = null;
    }

    render() {

        const
            strings = [],
            suites = this.suites;

        for (const [key, suite] of suites.entries()) {

            strings.push(key + ":");

            for (const test of suite.values()) {
                if (test.complete) {
                    if (test.failed) {
                        strings.push(c_fail + "  ❌ " + c_done + test.name + c_reset);
                    }
                    else {
                        strings.push(c_success + "  ✅ " + c_done + test.name + c_reset);
                    }
                } else
                    strings.push("    " + c_pending + test.name + c_reset);
            }

            strings.push("");
        }

        return strings.join("\n");
    }
    start(pending_tests, suites) {
        console.clear();
        //order tests according to suite
        this.suites = new Map;

        const suites_ = this.suites;

        for (const e of pending_tests) {

            if (!suites_.has(e.suite)) {
                suites_.set(e.suite,
                    new Map());
            }

            suites_.get(e.suite).set(e.name, { name: e.name, complete: false, failed: false });
        }

        console.log(this.render());
    }

    async update(results, suites, COMPLETE = false) {
        console.clear();

        const suites_ = this.suites;

        for (const { test, errors } of results) {
            suites_.get(test.suite).set(test.name, { name: test.name, complete: true, failed: errors.length > 0 });
        }

        const out = this.render();

        if (!COMPLETE) {
            console.log(out);
        }

        return out;
    }

    async complete(results, suites) {
        console.clear();

        const strings = [await this.update(results, suites, true)],
            errors = [];

        let FAILED = false;



        let total = results.length,
            failed = 0;

        for (const result of results) {



            if (result.errors.length > 0) {
                failed++;
                FAILED = true;

                const
                    test = result.test,
                    error: Error = result.errors[0],
                    error_pos = (error.stack) ? error.stack.match(/<anonymous>:(\d+):(\d+)/) : null,
                    [line, column] = (error_pos) ? error_pos.slice(1, 3).map(e => parseInt(e)) : [1, 1],
                    pos = await getPositionLexerFromJsonSourceMap(line, column, test.map);

                errors.push(`[ ${c_done + test.suite} - ${c_reset + test.name + c_done} ]${c_reset} failed:\n\n    ${error_pos
                    ? markExceptionExpression(pos.errorMessage(error.message, test.origin, 120), pos).split("\n").join("\n   ")
                    : c_fail + error.message + c_reset
                    }\n`);
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

        return FAILED;
    }
};

export async function startRun(pending_tests, suites, reporter = new BasicReporter()) {
    return reporter.start(pending_tests, suites);
}

export async function updateRun(completed_tests, suites, reporter = new BasicReporter()) {
    return reporter.update(completed_tests, suites);
}

export async function completedRun(completed_tests, suites, reporter = new BasicReporter()) {
    return reporter.complete(completed_tests, suites);
}