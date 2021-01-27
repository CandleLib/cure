
import { TestHarness } from "../types/test_harness";
import { TestResult } from "../types/test_result";
import { TestError } from "./test_error";

const harnessConstructor = (equal, util, performance: Performance, rst, te: typeof TestError, BROWSER = false) => {

    let active_test_result: TestResult = null, previous_start = 0, results: TestResult[] = [];

    const

        pf_now: () => number = performance.now,

        MAX_ERROR_LIMIT = 10,

        clipboard: TestResult[] = [],

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

        harness = <TestHarness>{

            async _import(url) {
                return import(url);
            },

            accessible_files: null,

            last_time: -1,

            inspect_count: 0,

            test_index: -1,

            imports: null,

            errors: [],

            time_points: [],

            regA: null,

            regB: null,

            regC: null,

            regD: null,

            caught_exception: null,

            origin: "",

            map: "",

            start: 0,

            mark(index: number) {
                //@ts-ignore
                harness.errors.push(new te(new Error("marked: " + index), "", 0, 0, "", ""));
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
                            harness.regA = await fn();
                            res(false);
                        } catch (e) {
                            addTestErrorToActiveResult(e);
                            res(true);
                        }
                    });
                }
                try {
                    harness.regA = fn();
                } catch (e) {
                    markWriteStart();
                    addTestErrorToActiveResult(e);
                    return true;
                }
                return false;
            },

            equal: (a: any, b: any): boolean => {
                harness.regA = a;
                harness.regB = b;

                if (typeof a == "object" && typeof b == "object" && a != b)
                    return equal(a, b);

                return a == b;
            },

            externAssertion: (fn: Function): boolean => {
                try {
                    harness.regA = fn();
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
                if (!(e instanceof te))
                    e = new te(e);

                if (harness.test_index > 0)
                    e.index = harness.test_index;

                addTestErrorToActiveResult(e);

                if (harness.errors.length > MAX_ERROR_LIMIT)
                    throw new Error("Maximum number of errors reached. Error count is. " + (MAX_ERROR_LIMIT + 1));
            },

            inspect: (...args) => {
                markWriteStart();
                const e = createInspectionError(...args);

                active_test_result.logs.push(e.stack.toString());

                //const test_error = new te(e, "", 0, 0, "", harness.origin, harness.map);
                //test_error.INSPECTION_ERROR = true;
                //harness.errors.push(test_error);
            },

            inspectAndThrow: (...args) => {
                throw createInspectionError(...args);
            },

            shouldHaveProperty(object, ...properties: string[]) {

                markWriteStart();

                for (const prop of properties) {
                    if (typeof object[prop] == "undefined")
                        harness.setException(new te(`Expected property ${prop} to be present on object ${util.inspect(object)}`));
                }
            },

            shouldEqual(A, B, strict?: boolean) {

                markWriteStart();

                if (strict && A !== B) {
                    harness.setException(new te(`Expected A->${A} to strictly equal B->${B}`));
                } else if (A != B) {
                    harness.setException(new te(`Expected A->${A} to equal B->${B}`));
                }
            },

            shouldNotEqual(A, B, strict?: boolean) {

                markWriteStart();

                if (strict && A === B) {
                    harness.setException(new te(`Expected A->${A} to not strictly equal B->${B}`));
                } else if (A == B) {
                    harness.setException(new te(`Expected A->${A} to not equal B->${B}`));
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

                active_test_result = <TestResult>{
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
        active_test_result.errors.push(e?.stack?.toString() ?? e.toString());
    }

    function markWriteStart() {

        const start = pf_now();

        if (active_test_result && active_test_result?.clipboard_write_start < 0)
            active_test_result.clipboard_write_start = start;
    }


    function harness_init() {
        active_test_result = null;
        results.length = 0;
        previous_start = pf_now();
    }

    function harness_clearClipboard() {
        for (const test of clipboard) {
            const end = pf_now();
            active_test_result.previous_clipboard_end = end;
            active_test_result.clipboard_end = end;
            test.PASSED = false;
            test.message = "Could not complete test due to error from previous test";
            results.push(test);
        }
    }

    function harness_getResults() {
        return results.slice();
    }

    const log = console.log;

    function harness_overrideLog() {
        console.log = harness.inspect;
    }

    function harness_restoreLog() {
        console.log = log;
    }

    return { harness, harness_init, harness_clearClipboard, harness_getResults, harness_overrideLog, harness_restoreLog };
};



export { harnessConstructor };
