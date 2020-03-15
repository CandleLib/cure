import equal from "deep-equal";
import { TestAssertionError } from "../types/test_error.js";
/**
 * Candle object accessible within a test.
 */
export const harness = {

    regA: null,

    regB: null,

    regC: null,

    regD: null,

    caught_exception: null,

    last_error: null,

    makeLiteral: (s) => {
        switch (typeof (s)) {
            case "string":
                return `"${s}"`;
            case "object":
                if (s instanceof Error)
                    return `[${s.name}]{ message: "${s.message}" }`;
                return JSON.stringify(s);
            default:
                return s;
        }
    },

    throws: (fn) => {
        try {
            fn();
        }
        catch (e) {
            harness.caught_exception = e;
            return true;
        }
        return false;
    },

    equal: (a, b) => {
        harness.regA = a;
        harness.regB = b;

        if (typeof a == "object" && typeof b == "object" && a != b)
            return equal(a, b);
        return a == b;
    },

    notEqual: (a, b) => {
        harness.regA = a;
        harness.regB = b;

        if (typeof a == "object" && typeof b == "object") {
            if (a == b)
                return false;
            //Do deep equality
            return !equal(a, b);
        }
        else
            return a == b;
    },

    setException: (e) => {
        if (!(e instanceof TestAssertionError))
            throw TypeError("Expected an Error object to be thrown.");
        harness.last_error = e;
    }
};
