import { BindingExpressionCompiler } from "../types/binding_compile";
import { MinTreeNodeClass, MinTreeNodeType, MinTreeNode } from "@candlefw/js";

const BindingCompilers = [];

export function loadBindingCompiler(obj: BindingExpressionCompiler) {
    // Check for the presence of the expected 
    // properties of BindingExpressionCompiler
    if (!obj)
        return false;

    if (!obj.signature || typeof obj.signature !== "number")
        return false;

    if (!obj.test || typeof obj.test !== "function")
        return false;

    if (!obj.getExceptionMessage || typeof obj.test !== "function")
        return false;

    if (!obj.build || typeof obj.build !== "function")
        return false;

    BindingCompilers.push(obj);

    return true;
};

export function selectBindingCompiler(node: MinTreeNode): BindingExpressionCompiler[] {

    const type = node.type;
    //return BindingCompilers
    return BindingCompilers.filter(c => ((c.signature & (type & 0xFFFFFF))) && ((!(c.signature & 0xFF000000)) || c.signature == type));
};

export function clearBindingsCompilers() {
    BindingCompilers.length = 0;
}
export function test() {
    throw new SyntaxError("This is the error that was thrown");
}