import { JSNode, JSNodeType, tools } from "@candlefw/js";


export function Is_Expression_An_Assertion_Site(stmt: JSNode): boolean {
    if (stmt.type == JSNodeType.ExpressionStatement
        && stmt.nodes[0].type == JSNodeType.CallExpression
        && tools.getIdentifierName(stmt.nodes[0].nodes[0]) == "assert")
        return true;

    return false;
}
