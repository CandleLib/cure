import equal from "deep-equal";
import util from "util";
import { TestError } from "./test_error.js";
/**
 * Provides methods and properties that are used during the reporting 
 */
export const harness = {

    test_index: -1,

    errors: <Array<TestError>>[],

    /**
     * A temporary variable that can be used to hold assertion site object data.
     */
    regA: null,

    /**
     * A temporary variable that can be used to hold assertion site object data.
     */
    regB: null,

    /**
     * A temporary variable that can be used to hold assertion site object data.
     */
    regC: null,

    /**
     * A temporary variable that can be used to hold assertion site object data.
     */
    regD: null,

    /**
     * Stores an exception caught within an assertion site. 
     */
    caught_exception: null,


    last_error: null,

    /**
     * Converts a value into a reportable string.
     * 
     * @param {any} value - Any value that should be turned into string
     * that can be used in a error message.
     */
    makeLiteral: (value: any): string => {

        if (value instanceof Error)
            return `\n\n${value.stack}\n\n`;

        switch (typeof (value)) {

            case "string":
                return `"${value}"`;
            case "object":
                if (value instanceof Error)
                    return `[${value.name}]{ message: "${value.message}" }`;
                return util.inspect(value);
                return JSON.stringify(value);
            default:
                return value;
        }
    },

    /**
     * Test whether a function throws when called.
     * 
     * @param {Function} fn - A function that will be called.
     * @returns {boolean} - `true` if the function threw an exception.
     */
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

    /**
     * Tests the equality of two values.
     * 
     * If the values are objects, then `equal` from `deep-equal` is
     * used to determine of the values are similar.
     * 
     * The values harness.regA and harness.regB are set to the values of a and b, respectively.
     * 
     * @param {any} a - A value of any type.
     * @param {any} b - A value of any type.
     * 
     * @returns {boolean} - `true` if the two values are the same.
     */
    equal: (a: any, b: any): boolean => {
        harness.regA = a;
        harness.regB = b;

        if (typeof a == "object" && typeof b == "object" && a != b)
            return equal(a, b);

        return a == b;
    },

    /**
     * Handles the assertion thrown from an external library.
     * 
     * @param {Function} fn - A function that will be called.
     * @returns {boolean} - `true` if the function threw an exception.
     */
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


    /**
     * Tests the equality of two values.
     *
     * If the values are objects, then `equal` from `deep-equal` is
     * used to determine of the values are similar.
     * 
     * The values harness.regA and harness.regB are set to the values of a and b, respectively.
     *
     * @param {any} a - A value of any type.
     * @param {any} b - A value of any type.
     *
     * @returns {boolean} - `true` if the two values are different.
     */
    notEqual: (a, b): boolean => {
        return !harness.equal(a, b);
    },

    /**
     * Add error to test harness.
     */
    setException: (e) => {
        if (!(e instanceof TestError))
            e = new TestError(e);

        if (harness.test_index > 0)
            e.index = harness.test_index;

        harness.errors.push(e);
    }
};
