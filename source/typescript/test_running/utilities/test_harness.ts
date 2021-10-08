import { decodeJSONSourceMap, SourceMap } from "@candlelib/conflagrate";
import URL from "@candlelib/uri";
import { TransferableTestError } from "../../types/test_error";
import { TestHarness, TestHarnessEnvironment } from "../../types/test_harness";
import { TestInfo } from "../../types/test_info";
import { name_delimiter } from "../../utilities/name_hierarchy.js";

import { createTransferableTestErrorFromException } from "../../utilities/test_error.js";
import { THROWABLE_TEST_OBJECT_ID } from "../../utilities/throwable_test_object_enum";

const AsyncFunction = (async function () { }).constructor;
export const harness_internal_name = "$$h";



export function createTestHarnessEnvironmentInstance(equal, util, performance: Performance, rst): TestHarnessEnvironment {

    let
        active_test_result: TestInfo = null,
        previous_start = 0,
        source_location = "",
        working_directory = "",
        source = "",
        source_map: SourceMap = null;

    const

        log = console.log,

        pf_now: () => number = () => performance.now(),

        data_queue: any[] = [],

        clipboard: TestInfo[] = [],

        log_book: string[] = [],

        results: TestInfo[] = [],

        names: string[] = [],

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

            makeLiteral(value: any): string {

                if (value instanceof Error)
                    return `\n\n${value.stack}\n\n`;

                switch (typeof (value)) {

                    case "object":

                        if (value instanceof Error)
                            return `[${value.name}]{ message: "${value.message}" }`;

                        return rst + util.inspect(value, false, 20, true);

                    case "undefined":

                        return "undefined";

                    default:

                        return value.toString();
                }
            },

            doesNotThrow(values: [(...any: any[]) => any, ...any[]]): boolean | Promise<boolean> {
                try {
                    const val = harness.throws(values);

                    if (val instanceof Promise)
                        return val;

                    return !val;

                } catch (e) {
                    harness.addException(e);
                    return false;
                }
            },

            throws(values: [(...any: any[]) => any, ...any[]]): boolean | Promise<boolean> {
                if (!Array.isArray(values))
                    values = [values];

                const fn = values[0];

                if (typeof fn !== "function")
                    return false;

                try {
                    if (fn instanceof AsyncFunction) {
                        return new Promise(async (res) => {
                            await fn.apply(fn, values.slice(1));
                            res(false);
                        });
                    } else {
                        fn.apply(fn, values.slice(1));
                    }
                } catch (e) {
                    return true;
                }
                return false;
            },

            equal(a: any, b: any): boolean {

                if (typeof a == "object" && typeof b == "object" && a != b)
                    return equal(a, b);


                return a == b;
            },

            externAssertion(fn: Function): boolean {
                try {
                    fn();
                } catch (e) {
                    markWriteStart();
                    addErrorToActiveResult(e);
                    return true;
                }

                return false;
            },

            notEqual: (a, b): boolean => {
                return !harness.equal(a, b);
            },


            addException(e) {

                markWriteStart();
                if (e instanceof Error)
                    addErrorToActiveResult(e);
                else if (e.throwable_id == THROWABLE_TEST_OBJECT_ID.TRANSFERABLE_ERROR)
                    addTransferableErrorToActiveResult(e);
                else
                    addErrorToActiveResult(new Error("Could not report error"));

            },

            /**
             * If the first argument is a number, let "n", then this function will only produce an error if
             * it has been called "n" times. Useful in loops when one wants to observe results after "n" iterations. 
             * If the number is 0, then the arguments will be treated as if the second argument was the first, third was the second, and so on.
             * 
             * If the first argument is a number AND the second arg is a number , let "n", then the depth to which properties of 
             * objects are inspected is limited to a depth of "n".
             */
            inspect(...args) {
                markWriteStart();

                const
                    first = args[0],
                    second = args[1];

                let limit = 8;

                if (typeof first == "number" && args.length > 1) {
                    //if (harness.inspect_count++ < first)
                    //    return;

                    args = args.slice(1);

                    if (typeof second == "number" && args.length > 1) {

                        limit = second;

                        args = args.slice(1);
                    }
                }

                log_book.push("candle.cure.harness.inspect intercept:", ...args.flatMap(val => (util.inspect(val, false, limit, true) + "").split("\n")), "");
            },


            or(a: any, b: any): boolean {
                return !!a || !!b;
            },

            and(a: any, b: any): boolean {
                return (!!a && !!b);
            },

            getValueRange(start: number, end: number) {
                let
                    clip_start = data_queue.length - active_test_result.test_stack.length + start,
                    clip_end = clip_start + (end - start) + 1;

                return data_queue.slice(clip_start, clip_end);
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

                return true;
            },

            setResultName(string: string) {

                markWriteStart();

                if (!active_test_result.name)
                    active_test_result.name = string.toString();
            },

            pushName(string: string) {

                markWriteStart();

                names.push(string);

                if (!active_test_result.name)
                    active_test_result.name = names.join(name_delimiter);//string.toString(); 0;
            },

            popName() {
                names.pop();
            },

            setSourceLocation(column, line, offset) {

                markWriteStart();

                active_test_result.location.source = { column, line, offset };
            },

            setCompiledLocation(column, line, offset) { },

            pushTestResult(expression_handler_identifier: number = -1) {
                const start = pf_now();

                markWriteStart();

                active_test_result = <TestInfo>{
                    name: "",
                    message: "",
                    SKIPPED: false,
                    PASSED: true,
                    TIMED_OUT: false,
                    clipboard_write_start: -1,
                    clipboard_start: start,
                    clipboard_end: -1,
                    previous_clipboard_end: previous_start,
                    errors: [],
                    logs: [],
                    log_start: active_test_result ? active_test_result.log_start : 0,
                    test_stack: [],
                    expression_handler_identifier,
                    location: {
                        compiled: { column: 0, line: 0, offset: 0 },
                        source: { column: 0, line: 0, offset: 0 }
                    },
                    test: null
                };

                clipboard.push(active_test_result);
            },

            skip() {
                active_test_result.SKIPPED = true;
            },

            popTestResult() {

                markWriteStart();

                const previous_active = clipboard.pop();

                active_test_result = clipboard[clipboard.length - 1];

                const log_start = previous_active.log_start;

                previous_active.logs.push(...log_book.slice(log_start));

                log_book.length = log_start;

                data_queue.length -= previous_active.test_stack.length;

                previous_active.PASSED = previous_active.PASSED && previous_active.errors.length == 0;

                results.push(previous_active);

                previous_start = previous_active.clipboard_end = pf_now();
            },

            pushValue(val: any) {
                markWriteStart();
                active_test_result.test_stack.push(harness.makeLiteral(val));
                data_queue.push(val);
            },

            getValue(index: number) {
                markWriteStart();
                const pointer = data_queue.length - active_test_result.test_stack.length;
                return data_queue[pointer + index];
            },

            pushAndAssertValue(SUCCESS: boolean) {

                markWriteStart();

                if (!SUCCESS)
                    active_test_result.PASSED = false;

                harness.pushValue(SUCCESS);
            }
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

    function addTransferableErrorToActiveResult(e: TransferableTestError) {
        if (active_test_result)
            active_test_result.errors.push(e);
        else throw e;
    }

    function addErrorToActiveResult(e: Error) {
        addTransferableErrorToActiveResult(createTransferableTestErrorFromException(e, harness));
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
            source = "";
            active_test_result = null;
            results.length = 0;
            clipboard.length = 0;
            data_queue.length = 0;
            names.length = 0;
            source_map = null;
            previous_start = pf_now();

            URL.GLOBAL = new URL(test_working_directory);
        },

        harness_initialSourceCodeString(test_source_code: string) {
            source = test_source_code;
        },

        harness_initSourceMapFromString(test_source_map_string: string) {
            if (test_source_map_string) {
                try {
                    source_map = decodeJSONSourceMap(test_source_map_string);
                } catch (e) {
                    harness.addException(e);
                }
            }
        },

        /**
         Remove any TestInfo object with an index greater than 0 from the clipboard,
         and place them in the results array.
        */
        harness_flushClipboard() {

            if (clipboard.length > 1) {

                for (const test of clipboard.slice(1).reverse()) {
                    const end = pf_now();
                    active_test_result.previous_clipboard_end = end;
                    active_test_result.clipboard_end = end;
                    test.PASSED = false;
                    active_test_result = test;
                    data_queue.length = 0;
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
}



