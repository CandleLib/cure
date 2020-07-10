import { Reporter } from "../types/reporter.js";
import { CLITextDraw } from "../utilities/cli_text_console.js";
import { TestResult } from "../types/test_result.js";
import { rst, pass, fail, symA, valD, valA, valB, valC, symB, symC, objA, objB, objC, objD, msgC, symD } from "../utilities/colors.js";
import { performance } from "perf_hooks";
import { TestSuite } from "../types/test_suite.js";
import { TestRig } from "../types/test_rig.js";
import { TestError, getLexerFromLineColumnString } from "../test_running/test_error.js";
import { inspect } from "util";
import { parser, renderWithFormatting, MinTreeNodeType, MinTreeNodeClass, MinTreeNode } from "@candlefw/js";
import { format_rules } from "../utilities/format_rules.js";
import { Globals } from "../types/globals.js";


function syntaxHighlight(str: string, prop_name, node: MinTreeNode): string {
    const { type } = node;

    if ("==>><<<+-||&&!/*".includes(str))
        return symC + str + rst;

    if ("(){}[]".includes(str))
        return symD + str + rst;

    switch (type) {
        case MinTreeNodeType.NewInstanceExpression:
        case MinTreeNodeType.NewExpression:
        case MinTreeNodeType.VariableDeclaration:
        case MinTreeNodeType.LexicalDeclaration:
        case MinTreeNodeType.IfStatement:
        case MinTreeNodeType.ForInStatement:
        case MinTreeNodeType.WhileStatement:
        case MinTreeNodeType.DoStatement:
        case MinTreeNodeType.TryStatement:
        case MinTreeNodeType.ForOfStatement:
        case MinTreeNodeType.ForOfStatement:
            return valB + str + rst;
        case MinTreeNodeType.IdentifierProperty:
            return objD + str + rst;
        case MinTreeNodeType.IdentifierBinding:
        case MinTreeNodeType.IdentifierReference:
            return objC + str + rst;
        case MinTreeNodeType.TemplateHead:
        case MinTreeNodeType.TemplateMiddle:
        case MinTreeNodeType.TemplateTail:
        case MinTreeNodeType.Template:
        case MinTreeNodeType.StringLiteral:
            return valA + str.replace(/\x1b\[[^m]+m/g, "") + rst;
    }

    if (type & MinTreeNodeClass.LITERAL)
        return symA + str + rst;

    return str;
}
/**
 * Creates a printable inspection message.
 * @param result 
 * @param test 
 * @param suite 
 * @param reporter 
 */
async function createInspectionMessage(result: TestResult, test: TestRig, suite: TestSuite, reporter: Reporter, watched_files: Set<string>): Promise<string> {

    let errors = [];

    for (let error of result.errors) {

        if (error.WORKER)
            error = Object.assign(new TestError(""), error);

        errors.push(await error.toAsyncBlameString(watched_files));
    }
    const
        { msgD, pass, symD, valB, symC, symA, valA } = reporter.colors,
        { line, column } = test.pos,
        str_col = valA,
        num_col = symA,
        str =
            `${rst}
Duration: ${num_col + result.duration + rst}
Start Time: ${num_col + result.start + rst}
End Time: ${num_col + result.end + rst}
Timed Out: ${num_col + result.TIMED_OUT + rst}

Passed: ${num_col + result.PASSED + rst}
Asynchronous Test: ${num_col + test.IS_ASYNC + rst}

Source File: ${str_col + suite.origin + rst}

Imports:
    ${
            test.import_arg_specifiers.map(({ module_name, module_specifier }) => symD + module_name + rst + " from \n        " + pass + module_specifier + rst).join("\n    ")
            || pass + "none"
            }

-------------------------------------------------------------------------------

${getLexerFromLineColumnString(line, column, suite.data).errorMessage("Source Location", suite.origin).split("\n").join(("\n    "))}

-------------------------------------------------------------------------------

Test Rig Source Code:

    ${renderWithFormatting(parser(test.source), format_rules, syntaxHighlight).trim().split("\n").join("\n    ")}

${rst}-------------------------------------------------------------------------------`;

    return str.trim();
}

function getNameData(name: string) {

    const
        name_parts = name.split("-->"),
        suites = name_parts.slice(0, -1),
        name_string = name_parts.pop();

    return { suites, name: name_string };
}
type SuiteData = { tests: Map<string, { INSPECT: boolean, name: string, complete: boolean, failed: boolean; duration: number; }>, suites: Map<string, SuiteData>; };
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
            { fail, msgA, pass, msgB, symD } = this.colors;

        for (const [key, suite] of suites.suites.entries()) {

            strings.push(prepend + key + ":");

            for (const test of suite.tests.values()) {

                const insp = test.INSPECT ? "" + symD + "i " + rst : "  ";

                if (test.complete) {
                    const dur = ` - ${Math.round((test.duration * (test.duration < 1 ? 10000 : 10))) / 10}${test.duration < 1 ? "μs" : "ms"}`;

                    if (test.failed) {

                        strings.push(prepend + fail + " ❌ " + insp + msgA + test.name + dur + rst);
                    }
                    else {

                        strings.push(prepend + pass + " ✅ " + insp + msgA + test.name + dur + rst);
                    }
                }
                else
                    strings.push(prepend + "   " + insp + msgB + test.name + rst);
            }

            strings.push(this.render(suite, prepend + "  "));
        }

        return strings.join("\n");
    }

    async start(pending_tests: TestRig[], global: Globals, terminal: CLITextDraw) {

        const { suites } = global;

        pending_tests = pending_tests.slice()
            .sort((a, b) => a.index < b.index ? -1 : 1)
            .sort((a, b) => a.suite_index < b.suite_index ? -1 : 1);

        this.time_start = performance.now();

        //order tests according to suite
        this.suites = { suites: new Map, tests: new Map };

        try {


            for (const { name: combined_name, INSPECT } of pending_tests) {

                let suites_ = this.suites.suites, target_suite = this.suites;

                const { suites, name } = getNameData(combined_name);

                for (const suite of suites) {

                    if (!suites_.has(suite))
                        suites_.set(suite, { tests: <Map<string, { INSPECT: boolean, name: string, complete: boolean, failed: boolean; duration: number; }>>new Map(), suites: new Map() });

                    target_suite = suites_.get(suite);

                    suites_ = target_suite.suites;
                };

                target_suite.tests.set(name, { INSPECT, name, complete: false, failed: false, duration: 0 });

            }
        } catch (e) {
            //console.log(e);
        }

    }

    async update(results: Array<TestResult>, global: Globals, terminal: CLITextDraw, COMPLETE = false) {

        terminal.clear();

        for (const { test: { INSPECT, name: combined_name }, errors, duration } of results) {

            let suites_ = this.suites.suites, target_suite = this.suites;

            const { suites, name } = getNameData(combined_name);

            for (const suite of suites) {

                if (!suites_.has(suite))
                    suites_.set(suite, { tests: <Map<string, { INSPECT: boolean, name: string, complete: boolean, failed: boolean; duration: number; }>>new Map(), suites: new Map() });

                target_suite = suites_.get(suite);

                suites_ = target_suite.suites;
            };

            target_suite.tests.set(name, { INSPECT, name, complete: true, failed: errors ? errors.length > 0 : true, duration });
        }

        const out = this.render();

        if (!COMPLETE) {
            terminal.log(out);
            await terminal.print();
        }

        return out;
    }

    async complete(results: TestResult[], global: Globals, terminal: CLITextDraw): Promise<boolean> {

        const
            { suites: suite_map, watched_files_map }
                = global,

            suites = [...suite_map.values()],

            watched_files = new Set(watched_files_map.keys()),

            strings = [await this.update(results, global, terminal, true)],

            { fail, msgA, pass, objB } = this.colors,

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

                    failed++;

                    for (let error of test_errors) {


                        FAILED = true;

                        if (error.WORKER)
                            error = Object.assign(new TestError(""), error);


                        const message = await error.toAsyncBlameString(watched_files, suites[test.suite_index].origin);

                        errors.push(`${rst}[ ${msgA + suites_name.join(" > ")} - ${rst + name + msgA} ]${rst} failed:\n\n    ${
                            fail
                            + message
                                .replace(error.match_source, error.replace_source)
                                .split("\n")
                                .join("\n    ")
                            }\n${rst}`);
                    }
                }

                if (test.INSPECT) {

                    const suite = suites[test.suite_index];

                    errors.push(`${symD}#### inspection [ ${msgA + suites_name.join(" > ")} - ${rst + name + symD} ] inspection ####:${rst}`,
                        "   " + (await createInspectionMessage(result, test, suite, this, watched_files))
                            .split("\n")
                            .join("\n    ")
                    );
                }
            }

            for (const suite of suites.values()) {

                const { error } = suite;

                if (error) {

                    failed++;

                    const message = await error.toAsyncBlameString(watched_files, suite.origin);

                    errors.push(`${rst}Suite ${fail + suite.origin + rst} failed:\n\n    ${
                        fail + message
                            .replace(error.match_source, error.replace_source)
                            .split("\n")
                            .join("\n    ")}\n${rst}`, "");
                }
            }
        } catch (e) {
            failed++;
            errors.push(`${rst}Reporter failed:\n\n    ${
                fail + (await (new TestError(e)).toAsyncBlameString()).split("\n").join("\n   ")}\n${rst}`, "");
        }

        strings.push(`${total} test${total !== 1 ? "s" : ""} run. ${total > 0 ? (failed > 0
            ? fail + `${failed} failed test${(failed !== 1 ? "s" : "") + rst} :: ${pass + (total - failed)} passed test${total - failed !== 1 ? "s" : ""}`
            : pass + "All tests passed") : ""} ${rst}\n\nTotal time ${(performance.now() - this.time_start) | 0}ms\n\n`);

        terminal.log(strings.join("\n"), errors.join("\n"), inspections.join("\n"), rst);

        await terminal.print();

        return FAILED;
    }
}
