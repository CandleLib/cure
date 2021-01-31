import { renderCompressed as $r, JSNodeType, JSNodeClass } from "@candlefw/js";
import { ExpressionHandler } from "../../types/expression_handler";

function sanitizeTemplate(string) {
    return string;
}

/** 
 * Harness built in evaluators
 * equal : ==              | boolean
 * equal : !=              | boolean
 * deep_equal : ===        | string or boolean
 * throws : throws( exp )  | boolean
 * extern : extern( exp )  | boolean
 */



const
    $ = sanitizeTemplate,

    default_expression_handlers: ExpressionHandler[] = [

        /**
         * Relational and Equality Expressions
         */
        {

            filter: JSNodeClass.BINARY_EXPRESSION,

            confirmUse: node => node.type == JSNodeType.EqualityExpression || node.type == JSNodeType.RelationalExpression,

            build: (node, stack) => {
                const [left, right] = node.nodes;

                stack.push(`"${$r(left).replace(/\"/g, "\\\"")}"`);
                const a = stack.push(left); // Push an expression to the test queue
                stack.push(`"${$r(right).replace(/\"/g, "\\\"")}"`);
                const b = stack.push(right);
                stack.push(`'${node.symbol.replace(/\"/g, "\\\"")}'`);
                const e = stack.evaluate(`${b} == ${a}`);
                stack.report(e);
            },

            print: (queue, reporter) => {

                const

                    [left_code, left_val, right_code, right_val, symbol] = [...queue.pop()],

                    symbol_to_phrase_map = {
                        "==": "to equal",
                        "!=": "to not equal",
                        "===": "to strictly equal",
                        "!==": "to strictly not equal",
                        ">=": "to be more than or equal to",
                        "<=": "to be less than or equal to",
                        ">": "to be more than",
                        "<": "to be less than"
                    };

                return [
                    ...(`Expected ${left_code}=[${left_val}]`).split("\n"),
                    symbol_to_phrase_map[symbol] ?? "something something" + symbol,
                    ...(`${right_code}=[${right_val}]`).split("\n")
                ];
            },
        },
    ];

export default default_expression_handlers;
