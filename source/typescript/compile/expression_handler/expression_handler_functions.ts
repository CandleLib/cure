import { JSNode, renderCompressed, stmt } from "@candlefw/js";

import { ExpressionHandler } from "../../types/expression_handler.js";
import { Globals } from "../../types/globals.js";
import { TestInfo } from "../../types/test_info.js";
import { jst } from "../utilities/traverse_js_node.js";

/** 
 * Harness built in evaluators
 * equal : ==              | boolean
 * equal : !=              | boolean
 * deep_equal : ===        | string or boolean
 * throws : throws( exp )  | boolean
 * extern : extern( exp )  | boolean
 */
export function loadExpressionHandler(globals: Globals, obj: ExpressionHandler) {

    // Check for the presence of the expected 
    // properties of BindingExpressionCompiler
    if (!obj)
        return false;

    if (!obj.filter || typeof obj.filter !== "number")
        return false;

    if (!obj.confirmUse || typeof obj.confirmUse !== "function")
        return false;

    if (!obj.print || typeof obj.print !== "function")
        return false;

    if (!obj.build || typeof obj.build !== "function")
        return false;

    obj.identifier = globals.expression_handlers.push(obj) - 1;

    return true;
};

export function* selectExpressionHandler(node: JSNode, globals: Globals): Generator<ExpressionHandler> {

    const type = node.type;

    for (const c of globals.expression_handlers) {
        if (((c.filter & (type & 0x7FFFFF))) && ((!(c.filter & 0xFF100000)) || c.filter == type)) {
            yield c;
        }
    }
};

function parseEvaluationScript(script: string, lookup: Map<string, number>): string {

    script = script.replace(/(.*)==(.*)/g, (m, p1, p2) => `$harness.equal(${p1}, ${p2})`);

    script = script.replace(/(.*)!=(.*)/g, (m, p1, p2) => `$harness.notEqual(${p1}, ${p2})`);

    script = script.replace(/!(.*)/g, (m, p1, p2) => `$harness.throws(${p1})`);

    script = script.replace(/\$(exp|val|rep)(\d{0,3})/g, (match, p1) => {
        if (lookup.has(match))
            return `$harness.getValue(${lookup.get(match)})`;
        return "";
    });


    return script;
}

export function compileExpressionHandler(
    expression_node: JSNode,
    handler: ExpressionHandler,
    setup_statements: JSNode[],
    teardown_statements: JSNode[],
    globals: Globals,
    dynamic_name: string,
    static_name: string,
): { nodes: JSNode[], name; } {
    const instructions: JSNode[] = [];

    let generated_name = renderCompressed(expression_node);

    instructions.push(...setup_statements);

    const value_lookup: Map<string, number> = new Map();

    handler.build(expression_node, {

        name(string) {
            generated_name = string;
        },

        push(node) {

            const id = "$val" + value_lookup.size;

            value_lookup.set(id, value_lookup.size);

            const val = typeof node == "string"
                ? node
                : renderCompressed(node);

            instructions.push(stmt(`$harness.pushValue(${val});`));

            return id;
        },

        evaluate(expression_script) {

            const id = "$exp" + value_lookup.size;

            value_lookup.set(id, value_lookup.size);

            instructions.push(stmt(`$harness.pushValue(${parseEvaluationScript(expression_script, value_lookup)});`));

            return id;
        },


        report(report_script) {

            const id = "$rep" + value_lookup.size;

            value_lookup.set(id, value_lookup.size);

            instructions.push(stmt(`$harness.pushAndAssertValue(${parseEvaluationScript(report_script, value_lookup)});`));

            return id;
        }
    });

    // Ensure these are added to the top of the instructions array in the following order
    // harness.pushTestResult...
    // harness.setResultName...

    instructions.unshift(stmt(`$harness.setResultName(${dynamic_name || `"${(static_name || generated_name).replace(/\"/g, "\\\"")}"`})`));

    instructions.unshift(stmt(`$harness.pushTestResult(${handler.identifier});`));

    //

    instructions.push(...teardown_statements);

    instructions.push(stmt(`$harness.popTestResult();`));

    jst(<any>{ nodes: instructions }).run(node => void (node.pos = expression_node.pos));

    return { nodes: instructions, name: static_name || generated_name };
}

export function getExpressionHandlerReportLines(test_info: TestInfo, globals: Globals): string[] {

    const id = test_info.expression_handler_identifier;

    const handler = globals.expression_handlers[id];

    if (!handler) return ["Unable To Print Expression Handler Message"];

    return handler.print({
        pop: function* () {
            for (const val of test_info.test_stack)
                yield val;
        }

    }, globals.reporter);
}