import equal from "deep-equal";
import util from "util";
import { TestError } from "./test_error.js";
import { TestHarness } from "../types/test_harness";
import { rst } from "../utilities/colors.js";
import { performance } from "perf_hooks";

const
    MAX_ERROR_LIMIT = 10,
    inspect = (...args) => {
        const
            first = args[0],
            second = args[1];

        let limit = 8;

        if (!isNaN(first) && args.length > 1) {
            if (harness.inspect_count++ < first)
                return;

            args = args.slice(1);

            if (!isNaN(second) && args.length > 1) {

                limit = second;

                args = args.slice(1);
            }
        }

        const e = new Error("cfw.test.harness.inspect intercept:\n    " + rst + args.map(val => util.inspect(val, false, limit, true)).join("    \n") + "\n");

        throw e;
    },

    harness = <TestHarness>{

        accessible_files: null,

        last_time: -1,

        inspect_count: 0,

        test_index: -1,

        imports: null,

        errors: [],

        regA: null,

        regB: null,

        regC: null,

        regD: null,

        caught_exception: null,

        last_error: null,

        origin: "",

        mark(index: number) {
            harness.errors.push(new TestError(new Error("marked: " + index), "", 0, 0, "", ""));
        },

        /**
         * Marks point in execution time.  
         */
        markTime() {
            const now = performance.now();

            if (harness.last_time > 0) {
                harness.errors.push(new TestError(new Error("Time marked at: " + (now - harness.last_time)), "", 0, 0, "", ""));
                harness.last_time = -1;
            } else
                harness.last_time = now;
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

                    return rst + util.inspect(value, false, 3, true);

                default:

                    return value;
            }
        },

        throws: (fn: Function): boolean => {
            try {
                harness.regA = fn();
            }
            catch (e) {
                harness.caught_exception = e;
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

                harness.caught_exception = e;

                harness.errors.push(e);

                return true;
            }

            return false;
        },

        notEqual: (a, b): boolean => {

            return !harness.equal(a, b);
        },

        setException: (e) => {

            if (!(e instanceof TestError))
                e = new TestError(e);

            if (harness.test_index > 0)
                e.index = harness.test_index;

            harness.errors.push(e);

            if (harness.errors.length > MAX_ERROR_LIMIT)
                throw new Error("Maximum number of errors reached. Error count is. " + (MAX_ERROR_LIMIT + 1));
        },

        inspect
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


export { harness, inspect };