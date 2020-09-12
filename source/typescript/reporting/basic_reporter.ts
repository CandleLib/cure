import { performance } from "perf_hooks";
import { inspect } from "util";

import { TestError } from "../test_running/test_error.js";
import { Globals } from "../types/globals.js";
import { Reporter } from "../types/reporter.js";
import { TestResult } from "../types/test_result.js";
import { TestRig } from "../types/test_rig.js";

import { CLITextDraw } from "../utilities/cli_text_console.js";
import { rst, symD } from "../utilities/colors.js";
import { createInspectionMessage } from "./create_inspection_method.js";


function getNameData(test: TestRig, globals: Globals) {
    const name = test.name;

    const
        suite_name = [...globals.suites.values()][test.suite_index].name
            .replace(/[_-]/g, " ")
            .split(" ")
            .map(d => d[0].toLocaleUpperCase() + d.slice(1).toLocaleLowerCase())
            .join(" ");

    return { suites: [suite_name], name: name };
}

type Tests = Map<string, { INSPECT: boolean, name: string, complete: boolean, failed: boolean; duration: number; }>;
type SuiteData = { tests: Tests, suites: Map<string, SuiteData>; };
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

    async loadingSuites(global: Globals, terminal) {

    }

    async loadingTests(global: Globals, terminal) {


    }

    async reloadingWatchedFile(global: Globals, terminal) {

    }

    async reloadingWatchedSuite(global: Globals, terminal) {

    }

    async prestart(global: Globals, terminal) {

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


            for (const test of pending_tests) {

                let suites_ = this.suites.suites, target_suite = this.suites;

                const { suites, name } = getNameData(test, global);

                for (const suite of suites) {

                    if (!suites_.has(suite))
                        suites_.set(suite, { tests: <Tests>new Map(), suites: new Map() });

                    target_suite = suites_.get(suite);

                    suites_ = target_suite.suites;
                };

                target_suite.tests.set(name, { INSPECT: test.INSPECT, name, complete: false, failed: false, duration: 0 });

            }
        } catch (e) {
            //console.log(e);
        }

    }

    async update(results: Array<TestResult>, global: Globals, terminal: CLITextDraw, COMPLETE = false) {

        terminal.clear();

        for (const { test, errors, duration, PASSED } of results) {

            let suites_ = this.suites.suites, target_suite = this.suites;

            const { suites, name } = getNameData(test, global);

            for (const suite of suites) {

                if (!suites_.has(suite))
                    suites_.set(suite, { tests: <Tests>new Map(), suites: new Map() });

                target_suite = suites_.get(suite);

                suites_ = target_suite.suites;
            };

            target_suite.tests.set(name, { INSPECT: test.INSPECT, name, complete: true, failed: !PASSED, duration });
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

                const { test, errors: test_errors, PASSED } = result;

                if (!PASSED) {
                    failed++;
                    FAILED = true;
                }

                const { suites: suites_name, name } = getNameData(test, global);

                if (test_errors && test_errors.length > 0) {


                    for (let error of test_errors) {
                        //FAILED = true;

                        if (error.WORKER) {
                            console.log(error);
                            error = Object.assign(new TestError(error), error);
                        }

                        const message = await error.toAsyncBlameString(watched_files, suites[test.suite_index].origin);

                        errors.push(`${rst}${msgA}[  ${name} ]${rst} ${error.INSPECTION_ERROR ? "" : "failed"}:\n\n    ${
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

        strings.push(`${total} test${total !== 1 ? "s" : ""} ran. ${total > 0 ? (failed > 0
            ? fail + `${failed} test${(failed !== 1 ? "s" : "")} failed ${rst}:: ${pass + (total - failed)} test${total - failed !== 1 ? "s" : ""} passed`
            : pass + (total > 1 ? "All tests passed" : "The Test Has Passed")) : ""} ${rst}\n\nTotal time ${(performance.now() - this.time_start) | 0}ms\n\n`);

        terminal.log(strings.join("\n"), errors.join("\n"), inspections.join("\n"), rst);

        await terminal.print();

        return FAILED;
    }
}