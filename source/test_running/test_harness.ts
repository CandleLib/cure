import equal from "deep-equal";
import util from "util";
import { TestError } from "./test_error.js";
import { TestHarness } from "../types/test_harness";

export const harness = <TestHarness>{

    test_index: -1,

    imports: null,

    errors: [],

    regA: null,
    regB: null,
    regC: null,
    regD: null,
    caught_exception: null,
    last_error: null,
    makeLiteral: (value: any): string => {

        if (value instanceof Error)
            return `\n\n${value.stack}\n\n`;

        switch (typeof (value)) {

            case "string":
                return `"${value}"`;
            case "object":
                if (value instanceof Error)
                    return `[${value.name}]{ message: "${value.message}" }`;
                return util.inspect(value, false, 3, true);
                return JSON.stringify(value);
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
        }

        catch (e) {
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
    },

    inspect(object) {
        const e = new Error(util.inspect(object, true, 8, true));
        e.name = "cfw.test harness inspection intercept\n";
        throw e;
    }
};
