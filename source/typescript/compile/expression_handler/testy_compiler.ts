import { Globals } from "../../types/globals.js";
import testy_parser from "../../utilities/testy_parser.js";

interface Operator {
    action_name: string;
    inputs: 1 | 2;
    precedence: number;
    function: ((a: any, b: any) => any) | ((a: any) => any);
}
interface OperatorReference {
    sym: string;
    index: number;
    precedence: number;
}

const default_operators = {
    "==": {
        action_name: "$harness.equal",
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
    }
};

function completeCaptures(array: (OperatorReference | number | string)[], globals: Globals) {

    const sorted_operators = [];
    let i = 0;

    for (const obj of array) {
        if (typeof obj == "number") {
            array[i] = `$harness.getValue(${obj})`;
        } else if (typeof obj != "string") {
            obj.index = i;
            sorted_operators.push(obj);
        }
        i++;
    }

    //convert to names
    sorted_operators.sort((a, b) => { return b.precedence - a.precedence; });

    let output = array[0];

    for (const obj of sorted_operators)
        if (obj.captures == 1)
            output = compileUnaryOperator(array, obj, default_operators[obj.sym]);

        else
            output = compileBinaryOperator(array, obj, default_operators[obj.sym]);

    return [output];
}
function compileBinaryOperator(array: (OperatorReference | number | string)[], obj: OperatorReference, operator: Operator) {

    const
        refA = array[obj.index - 1],
        refB = array[obj.index + 1];

    let output = `${operator.action_name}(${refA}, ${refB})`;

    array[obj.index + 1] = output;
    array[obj.index] = output;
    array[obj.index - 1] = output;

    return output;
}
function compileUnaryOperator(array: (OperatorReference | number | string)[], obj: OperatorReference, operator: Operator) {

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
