import { JSNode, JSNodeType, tools } from "@candlefw/js";

const assert_group_names = ["assert_group"];
const assert_site_names = ["assert"];

export function Expression_Is_An_Assertion_Site(stmt: JSNode): boolean {
    if (
        stmt.type == JSNodeType.ExpressionStatement
        && stmt.nodes[0].type == JSNodeType.CallExpression
        && stmt.nodes[0].nodes[0].type == JSNodeType.IdentifierReference
        && assert_site_names.includes(tools.getIdentifierName(stmt.nodes[0].nodes[0]))
    )
        return true;

    return false;
}

export function Expression_Is_An_Assertion_Group_Site(stmt: JSNode): boolean {
    if (
        stmt.type == JSNodeType.ExpressionStatement
        && stmt.nodes[0].type == JSNodeType.CallExpression
        && stmt.nodes[0].nodes[0].type == JSNodeType.IdentifierReference
        && assert_group_names.includes(tools.getIdentifierName(stmt.nodes[0].nodes[0]))
    )
        return true;

    return false;
}
