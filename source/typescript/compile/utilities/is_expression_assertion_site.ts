import { JSCallExpression, JSNode, JSNodeType, tools } from "@candlelib/js";

const assert_group_names = ["assert_group"];
const assert_site_names = ["assert"];

export interface AssertionCallSite extends JSCallExpression { IS_ASSERTION_SITE: true; }
export interface AssertionGroupSite extends JSCallExpression { IS_ASSERTION_GROUP_SITE: true; }


export function Expression_Is_An_Assertion_Site(expr: JSNode): expr is AssertionCallSite {
    if (
        //stmt.type == JSNodeType.ExpressionStatement
        //&& 
        expr.type == JSNodeType.CallExpression
        && expr.nodes[0].type == JSNodeType.IdentifierReference
        && assert_site_names.includes(tools.getIdentifierName(expr.nodes[0]))
    ) {
        return true;
    }

    return false;
}

export function Expression_Is_An_Assertion_Group_Site(expr: JSNode): expr is AssertionGroupSite {
    if (
        //stmt.type == JSNodeType.ExpressionStatement
        //&&
        expr.type == JSNodeType.CallExpression
        && expr.nodes[0].type == JSNodeType.IdentifierReference
        && assert_group_names.includes(tools.getIdentifierName(expr.nodes[0]))
    )
        return true;

    return false;
}
