import { JSNode, stmt } from "@candlefw/js";
import { harness_internal_name } from "../../test_running/utilities/test_harness.js";
import { ExpressionHandler } from "../../types/expression_handler.js";

export function createPushInstruction(val: string): JSNode {
    return stmt(`${harness_internal_name}.pushValue(${val});`);
}
export function createPushAndAssetInstruction(val: string): JSNode {
    return stmt(`${harness_internal_name}.pushAndAssertValue(${val});`);
}

export function createSetNameInstruction(generated_name: string, static_name: string = "", dynamic_name: string = ""): JSNode {
    return stmt(`${harness_internal_name}.setResultName(${dynamic_name || `"${(static_name || generated_name).replace(/\"/g, "\\\"")}"`})`);
}

export function createPopTestResultInstruction(): JSNode {
    return stmt(`${harness_internal_name}.popTestResult();`);
}

export function createPushTestResultInstruction(handler: ExpressionHandler<JSNode>): JSNode {
    return stmt(`${harness_internal_name}.pushTestResult(${handler.identifier});`);
}
