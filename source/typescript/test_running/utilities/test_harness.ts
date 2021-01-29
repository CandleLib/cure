import { decodeJSONSourceMap, SourceMap } from "@candlefw/conflagrate";
import { TestHarness, TestHarnessEnvironment } from "../../types/test_harness";
import { TestInfo } from "../../types/test_info";
import { createTestErrorFromErrorObject } from "../../utilities/test_error";

export function createTestHarnessEnvironmentInstance(equal, util, performance: Performance, rst): TestHarnessEnvironment {

    let
        active_test_result: TestInfo = null,
        previous_start = 0,
        results: TestInfo[] = [],
        source_location = "",
        working_directory = "",
        source = "",
        source_map: SourceMap = null;

    let regA, regB, regC, regD;

    const


        log = console.log,

        pf_now: () => number = performance.now,

        MAX_ERROR_LIMIT = 10,

        clipboard: TestInfo[] = [],

        /**
         * If the first argument is a number, let "n", then this function will only produce an error if
         * it has been called "n" times. Useful in loops when one wants to observe results after "n" iterations. 
         * If the number is 0, then the arguments will be treated as if the second argument was the first, third was the second, and so on.
         * 
         * If the first argument is a number AND the second arg is a number , let "n", then the depth to which properties of 
         * objects are inspected is limited to a depth of "n".
         */
        createInspectionError = (...args): Error => {
            const
                first = args[0],
                second = args[1];

            let limit = 8;

            if (typeof first == "number" && args.length > 1) {
                if (harness.inspect_count++ < first)
                    return;

                args = args.slice(1);

                if (typeof second == "number" && args.length > 1) {

                    limit = second;

                    args = args.slice(1);
                }
            }

            const e = new Error("cfw.test.harness.inspect intercept:\n    " + rst + args.map(val => util.inspect(val, false, limit, true)).join("    \n") + "\n");

            e.stack = e.stack.split("\n").slice(3).join("\n");

            return e;
        },

        harness: TestHarness = <TestHarness>{

            accessible_files: null,

            last_time: -1,

            inspect_count: 0,

            test_index: -1,

            imports: null,

            time_points: [],

            caught_exception: null,

            async _import(url) {
                return import(url);
            },

            get source_location(): string {
                return source_location;
            },

            get working_directory(): string {
                return working_directory;
            },

            get test_source_code(): string {
                return source;
            },

            get test_source_map(): SourceMap {
                return source_map;
            },

            mark(index: number) {
                //@ts-ignore
                //harness.errors.push(new te(new Error("marked: " + index), "", 0, 0, "", ""));
            },

            /**
             * Marks point in execution time.  
             */
            markTime() {
                harness.time_points.push(pf_now());
            },

            getTime(message: string) {
                const now = pf_now();
                const t = harness.time_points.pop();
                if (typeof t == "number") {
                    console.log((message ?? "Time marked at:") + " " + (now - t) + "ms");
                    return now - t;
                }
                return Infinity;
            },

            makeLiteral: (value: any): string => {

                if (value instanceof Error)
                    return `\n\n${value.stack}\n\n`;

                switch (typeof (value)) {

                    case "string":

                        return `"${value}"`;

                    case "object":

                        if (value instanceof Error)
                            return `[${value.name}]{ message: "${value.message}" }`;

                        return rst + util.inspect(value, false, 20, true);

                    default:

                        return value;
                }
            },

            throws: (fn: Function, async = false): boolean | Promise<boolean> => {
                if (async) {
                    return new Promise(async res => {
                        try {
                            regA = await fn();
                            res(false);
                        } catch (e) {
                            addTestErrorToActiveResult(e);
                            res(true);
                        }
                    });
                }
                try {
                    regA = fn();
                } catch (e) {
                    markWriteStart();
                    addTestErrorToActiveResult(e);
                    return true;
                }
                return false;
            },

            equal: (a: any, b: any): boolean => {
                regA = a;
                regB = b;

                if (typeof a == "object" && typeof b == "object" && a != b)
                    return equal(a, b);

                return a == b;
            },

            externAssertion: (fn: Function): boolean => {
                try {
                    regA = fn();
                } catch (e) {
                    markWriteStart();
                    addTestErrorToActiveResult(e);
                    return true;
                }

                return false;
            },

            notEqual: (a, b): boolean => {
                return !harness.equal(a, b);
            },


            setException: (e) => {
                markWriteStart();
                addTestErrorToActiveResult(e);
            },

            inspect: (...args) => {
                markWriteStart();
                const e = createInspectionError(...args);

                active_test_result.logs.push(e.stack.toString());
            },

            inspectAndThrow: (...args) => {
                throw createInspectionError(...args);
            },

            shouldHaveProperty(object, ...properties: string[]) {

                markWriteStart();

                for (const prop of properties) {
                    if (typeof object[prop] == "undefined")
                        return false;
                }
                return true;
            },

            shouldEqual(A, B, strict?: boolean) {

                markWriteStart();

                if (strict && A !== B) {
                    return false;
                } else if (A != B) {
                    return false;
                }

                return true;
            },

            shouldNotEqual(A, B, strict?: boolean) {

                markWriteStart();

                if (strict && A === B) {
                    return false;
                } else if (A == B) {
                    return false;
                }
            },

            setResultName(string: string) {

                markWriteStart();

                if (!active_test_result.name)
                    active_test_result.name = string.toString();
            },

            setSourceLocation(column, line, offset) {

                markWriteStart();

                active_test_result.location.source = { column, line, offset };
            },

            setCompiledLocation(column, line, offset) {

                markWriteStart();

                active_test_result.location.compiled = { column, line, offset };
            },

            pushTestResult() {
                const start = pf_now();

                markWriteStart();

                active_test_result = <TestInfo>{
                    name: "",
                    message: "",
                    PASSED: false,
                    TIMED_OUT: false,
                    clipboard_write_start: -1,
                    clipboard_start: start,
                    clipboard_end: -1,
                    previous_clipboard_end: previous_start,
                    errors: [],
                    logs: [],
                    location: {
                        compiled: { column: 0, line: 0, offset: 0 },
                        source: { column: 0, line: 0, offset: 0 }
                    },
                    test: null
                };

                clipboard.push(active_test_result);
            },

            popTestResult() {

                markWriteStart();

                const previous_active = clipboard.pop();

                active_test_result = clipboard[clipboard.length - 1];

                previous_active.PASSED = previous_active.errors.length == 0;

                results.push(previous_active);

                previous_start = previous_active.clipboard_end = pf_now();
            },
        };

    ////@ts-ignore Make harness available to all modules.
    if (typeof global !== "undefined") {
        //@ts-ignore
        if (typeof global.cfw == "undefined") {
            //@ts-ignore
            global.cfw = { harness };
            //@ts-ignore
        } else Object.assign(global.cfw, { harness });
    }

    function addTestErrorToActiveResult(e: Error) {
        const error = createTestErrorFromErrorObject(e, harness);
        active_test_result.errors.push(error);
    }

    function markWriteStart() {

        const start = pf_now();

        if (active_test_result && active_test_result?.clipboard_write_start < 0)
            active_test_result.clipboard_write_start = start;
    }

    return <TestHarnessEnvironment>{

        harness,

        harness_init(
            test_source_location: string = "",
            test_working_directory: string = ""
        ) {

            working_directory = test_working_directory;
            source_location = test_source_location;
            active_test_result = null;
            results.length = 0;
            clipboard.length = 0;
            previous_start = pf_now();
            source_map = null;
            source = "";
        },

        harness_initialSourceCodeString(test_source_code: string) {
            source = test_source_code;;
        },

        harness_initSourceMapFromString(test_source_map_string: string) {
            if (test_source_map_string) {
                try {
                    source_map = decodeJSONSourceMap(test_source_map_string);
                } catch (e) {

                }
            }
        },

        harness_flushClipboard() {

            if (clipboard.length > 1) {

                for (const test of clipboard.slice(1).reverse()) {
                    const end = pf_now();
                    active_test_result.previous_clipboard_end = end;
                    active_test_result.clipboard_end = end;
                    test.PASSED = false;
                    test.message = "Could not complete test due to error from previous test";
                    active_test_result = test;
                    results.push(test);
                }


                clipboard.length = 1;

                active_test_result = clipboard[0];
            }
        },

        harness_getResults() {
            return results.slice();
        },

        harness_restoreLog() {
            console.log = log;
        },

        harness_overrideLog() {
            console.log = harness.inspect;
        }
    };
};


