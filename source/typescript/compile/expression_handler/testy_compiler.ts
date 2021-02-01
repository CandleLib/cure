import { Globals } from "../../types/globals.js";
import testy_parser from "../../utilities/testy_parser.js";

interface Operator {
    action_name: string;
    inputs: 1 | 2;
    precedence: number;
    function?: ((a: any, b: any) => any) | ((a: any) => any);
}

/**
 * Special operator used to return
 * an array of values from start to end, inclusive
 */
interface ValueRange {
    type: "range";
    start: number,
    end: number,
}

/**
 * Reference to general built-in or user defined operator
 */
interface OperatorReference {
    type: "op_ref";
    sym: string;
    index: number;
    precedence: number;
}
type TestyObjects =
    | ValueRange
    | OperatorReference
    | number
    | string;


const default_operators = {
    "<": {
        action_name: "$harness.lessThan",
        BUILT_IN: true,
        precedence: 0,
        inputs: 2
    },
    ">": {
        action_name: "$harness.greaterThan",
        BUILT_IN: true,
        precedence: 0,
        inputs: 2
    },
    "==": {
        action_name: "$harness.equal",
        BUILT_IN: true,
        precedence: 0,
        inputs: 2
    },
    "===": {
        action_name: "$harness.equal",
        BUILT_IN: true,
        precedence: 0,
        inputs: 2
    },
    "!==": {
        action_name: "$harness.notEqual",
        BUILT_IN: true,
        precedence: 0,
        inputs: 2
    },
    "!=": {
        action_name: "$harness.notEqual",
        BUILT_IN: true,
        precedence: 0,
        inputs: 2
    },
    "!": {
        action_name: "$harness.throws",
        BUILT_IN: true,
        precedence: 4,
        inputs: 1
    },
    "noThrow": {
        action_name: "$harness.doesNotThrow",
        BUILT_IN: true,
        precedence: 4,
        inputs: 1
    },
    "&&": {
        action_name: "$harness.and",
        BUILT_IN: true,
        precedence: 4,
        inputs: 1
    },
    "||": {
        action_name: "$harness.or",
        BUILT_IN: true,
        precedence: 4,
        inputs: 1
    }
};

function completeCaptures(array: TestyObjects[], globals: Globals) {

    const sorted_operators = [];

    let i = 0;

    for (const obj of array) {
        if (typeof obj == "number") {
            array[i] = `$harness.getValue(${obj})`;
        } else if (typeof obj != "string") {
            if (obj.type == "op_ref") {
                obj.index = i;
                sorted_operators.push(obj);
            } else {
                array[i] = `$harness.getValueRange(${obj.start},${obj.end})`;
            }
        }
        i++;
    }

    sorted_operators.sort((a, b) => {
        if (a.precedence == b.precedence)
            return -1;
        return b.precedence - a.precedence;
    });

    let output = array[0] + "";

    let z = [];

    for (const obj of sorted_operators) {

        z.push(array.slice());

        if (obj.captures == 1)
            output = compileUnaryOperator(array, obj, default_operators[obj.sym]);
        else
            output = compileBinaryOperator(array, obj, default_operators[obj.sym]);


    }

    z.push(array.slice());

    return [output];
}

function compileBinaryOperator(array: TestyObjects[], obj: OperatorReference, operator: Operator) {

    const
        refA = array[obj.index - 1],
        refB = array[obj.index + 1];

    let output = `${operator.action_name}(${refA}, ${refB})`;

    array[obj.index + 1] = output;
    array[obj.index] = output;
    array[obj.index - 1] = output;

    return output;
}
function compileUnaryOperator(array: TestyObjects[], obj: OperatorReference, operator: Operator) {

    const
        ref = array[obj.index + 1];

    let output = `${operator.action_name}(${ref})`;

    array[obj.index] = output;
    array[obj.index + 1] = output;

    return output;
}

function getPrecedence(symbols_string: string, globals: Globals): number {
    return default_operators[symbols_string]?.precedence ?? -1;
}

export function compileTestyScript(input: string, globals: Globals): string {

    const { FAILED, result, error_message } = testy_parser(input, {
        getPrecedence,
        completeCaptures
    });

    if (FAILED) {
        globals.harness.pushTestResult();
        globals.harness.setResultName("Failed to parse testy script");
        globals.harness.addException(new Error(`Failed to parse [${input}]: \n ${error_message}`));
        globals.harness.popTestResult();
        return "";
    } else {
        return result[0];
    }
}