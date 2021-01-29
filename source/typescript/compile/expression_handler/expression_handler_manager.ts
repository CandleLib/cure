import { JSNode } from "@candlefw/js";

import { ExpressionHandler } from "../../types/expression_handler.js";
import { Globals } from "../../types/globals.js";


export function loadExpressionHandler(globals: Globals, obj: ExpressionHandler) {


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



    globals.expression_handlers.push(obj);

    return true;
};

export function* selectExpressionHandler(node: JSNode, globals: Globals): Generator<ExpressionHandler> {

    const type = node.type;

    for (const c of globals.expression_handlers) {
        if (((c.signature & (type & 0x7FFFFF))) && ((!(c.signature & 0xFF100000)) || c.signature == type)) {
            yield c;
        }
    }
};