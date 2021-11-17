import { JSNodeTypeLU, renderCompressed as $r } from "@candlelib/js";
import { loadExpressionHandler } from "../build/library/compile/expression_handler/expression_handler_functions.js";
import { getSuiteTestOutcomeFromURL } from "./tools.js";

const globals = { expression_handlers: [] };

assert_group(sequence, "Post Test Run", () => {

    loadExpressionHandler(globals, {

        filter: 128,

        confirmUse: node => node.type == JSNodeTypeLU.EqualityExpression || node.type == JSNodeTypeLU.RelationalExpression,

        build: (node, stack) => {

            stack.name("Mock Generated Name");

            const [left, right] = node.nodes;
            stack.push(`"${$r(left)}"`);
            const a = stack.push(left); // Push an expression to the evaluation stack
            stack.push(`"${$r(right)}"`);
            const b = stack.push(right);
            stack.push(`'${node.symbol.replace(/\"/g, "\\\"")}'`);
            const e = stack.evaluate(`${b} == ${a}`);
            stack.report(e);
        },

        print: (stack, reporter) => {
            const

                [left_code, left_val, right_code, right_val, symbol] = [...stack.pop()],

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
    });

    loadExpressionHandler(globals, {});

    assert("Only one expression handler should be loaded. The [{ }] should be rejected", globals.expression_handlers.length == 1);

    const { results } = await getSuiteTestOutcomeFromURL("./data/expression_handler_spec.js", globals);



    assert("The result[0] property expression_handler_identifier should equal 0", results[0].expression_handler_identifier == 0);

    assert("The result[0] name should equal 'Mock Generated Name'", results[0].name == "null-->Mock Generated Name");

    assert(results[0].PASSED == false);

    assert(results[0].test_stack[0] == "2");

    assert(results[0].test_stack[1] == "2");

    assert(results[0].test_stack[2] == "3");

    assert(results[0].test_stack[3] == "3");

    assert(results[0].test_stack[4] == "==");

    assert(skip, results[1].PASSED == true);

    assert(results[2].PASSED == true);

});


assert("Built in equality should pass", 2 == 2);
assert("Built in strict equality should pass", 2 === 2);

const throwing_function = (t) => { if (t) throw new Error("Error Encountered"); };

assert("Built in check for a call that throws should pass", throwing_function(false));

assert("Built in call for should not throw should pass", !throwing_function(true));