import { JSNode, renderCompressed } from "@candlelib/js";
import { ExpressionHandler, ExpressionHandlerBase } from "../../types/expression_handler.js";
import { Globals } from "../../types/globals.js";
import { ReportQueue } from "../../types/report_queue.js";
import { TestInfo } from "../../types/test_info.js";
import { jst } from "../utilities/traverse_js_node.js";
import { compileTestyScript } from "./testy_compiler.js";
import {
    createPopNameInstruction,
    createPopTestResultInstruction,
    createPushAndAssetInstruction,
    createPushInstruction,
    createPushNameInstruction,
    createPushTestResultInstruction,
    createSkipInstruction
} from "./test_instructions.js";

export function loadExpressionHandler(globals: Globals, obj: ExpressionHandlerBase) {

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

export function* selectExpressionHandler(node: JSNode, globals: Globals): Generator<ExpressionHandlerBase> {

    const type = node.type;

    for (const c of globals.expression_handlers) {
        if (((c.filter & (type & 0x7FFFFF))) && ((!(c.filter & 0xFF100000)) || c.filter == type)) {
            yield c;
        }
    }
};

export function compileExpressionHandler(
    expression_node: JSNode,
    handler: ExpressionHandler<JSNode>,
    setup_statements: JSNode[],
    teardown_statements: JSNode[],
    globals: Globals,
    dynamic_name: string,
    static_name: string,
    suite_name: string
): { nodes: JSNode[], name; } {
    const instructions: JSNode[] = [];

    let generated_name = renderCompressed(expression_node);

    instructions.push(...setup_statements);;

    const value_lookup: Map<string, number> = new Map();
    if (generated_name == "skip") {

        instructions.unshift(createPushNameInstruction(generated_name, static_name, dynamic_name));

        instructions.push(createSkipInstruction());

        instructions.unshift(createPushTestResultInstruction(<any>{ identifier: 100000 }));

    } else {

        handler.build(expression_node, {

            name(string) {
                generated_name = string;
            },

            push(node) {

                const id = "$$" + value_lookup.size;

                value_lookup.set(id, value_lookup.size);

                const val = typeof node == "string"
                    ? node
                    : renderCompressed(node);

                instructions.push(createPushInstruction(val));

                return id;
            },

            evaluate(expression_script) {

                const id = "$$" + value_lookup.size;

                value_lookup.set(id, value_lookup.size);

                instructions.push(createPushInstruction(compileTestyScript(expression_script, globals)));

                return id;
            },


            report(report_script) {

                const id = "$$" + value_lookup.size;

                value_lookup.set(id, value_lookup.size);

                instructions.push(createPushAndAssetInstruction(compileTestyScript(report_script, globals)));

                return id;
            }
        });


        // Ensure these are added to the top of the instructions array in the following order
        // harness.pushTestResult...
        // harness.setResultName...

        instructions.unshift(createPushNameInstruction(generated_name, static_name, dynamic_name));

        instructions.unshift(createPushTestResultInstruction(handler));
    }


    instructions.push(...teardown_statements);

    instructions.push(createPopNameInstruction());

    instructions.push(createPopTestResultInstruction());

    jst(<any>{ nodes: instructions }).run(node => void (node.pos = expression_node.pos));

    return { nodes: instructions, name: static_name || generated_name };
}

export function getExpressionHandlerReportLines(test_info: TestInfo, globals: Globals): string[] {

    const id = test_info.expression_handler_identifier;

    const handler = globals.expression_handlers[id];

    if (!handler) return ["Unable To Print Expression Handler Message"];

    return handler.print(<ReportQueue>{
        shift: function* () {
            for (const val of test_info.test_stack)
                yield val;
        }

    }, globals.reporter);
}

