import { JSNode, stmt } from "@candlelib/js";
import { harness_internal_name } from "../../test_running/utilities/test_harness.js";
import { ExpressionHandler } from "../../types/expression_handler.js";
import { name_delimiter, createHierarchalName } from "../../utilities/name_hierarchy.js";


export function createSkipInstruction(): JSNode {
    return stmt(`${harness_internal_name}.skip();`);
}
export function createPushInstruction(val: string): JSNode {
    return stmt(`${harness_internal_name}.pushValue(${val});`);
}
export function createPushAndAssetInstruction(val: string): JSNode {
    return stmt(`${harness_internal_name}.pushAndAssertValue(${val});`);
}

export function createSetNameInstruction(generated_name: string, static_name: string = "", dynamic_name: string = "", suite_name = ""): JSNode {
    const used_name = dynamic_name || `"${((static_name || generated_name) + "").replace(/\"/g, "\\\"")}"`;

    const hierarchal_name = suite_name
        ? `"${suite_name + name_delimiter}" + ${used_name}`
        : used_name;

    return stmt(`${harness_internal_name}.setResultName(${hierarchal_name})`);
}

export function createPushNameInstruction(generated_name: string, static_name: string = "", dynamic_name: string = ""): JSNode {
    const used_name = dynamic_name || `"${((static_name || generated_name) + "").replace(/\"/g, "\\\"")}"`;

    return stmt(`${harness_internal_name}.pushName(${used_name})`);
}

export function createPopNameInstruction(): JSNode {
    return stmt(`${harness_internal_name}.popName()`);
}

export function createPopTestResultInstruction(): JSNode {
    return stmt(`${harness_internal_name}.popTestResult();`);
}

export function createPushTestResultInstruction(handler: ExpressionHandler<JSNode>): JSNode {
    return stmt(`${harness_internal_name}.pushTestResult(${handler.identifier});`);
}
