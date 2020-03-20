import { MinTreeNodeType as $, MinTreeNodeClass, MinTreeNode, MinTreeNodeType } from "@candlefw/js";
import { traverse, filter } from "@candlefw/conflagrate";
/**
 * Identifies variable dependencies and places them in sets.
 * @param ast
 * @param in_set
 * @param out_set
 */
export function extractIdentifierDependencies(ast: MinTreeNode): {
    AWAIT: boolean;
    imports: Set<string>;
    exports: Set<string>;
} {
    const imports: Set<string> = new Set(), exports: Set<string> = new Set();
    let AWAIT = false;
    //Extract References and Bindings and check for await expression
    for (const node of traverse(ast, "nodes").then(filter("type", MinTreeNodeType.AwaitExpression, $.IdentifierBinding, $.Identifier, $.IdentifierReference, $.IdentifierName))) {
        if (node.type & MinTreeNodeClass.PROPERTY_NAME)
            continue;
        if (node.type == MinTreeNodeType.AwaitExpression) {
            AWAIT = true;
            continue;
        }
        switch (node.type) {
            case $.IdentifierBinding:
                exports.add(<string>node.value);
                break;
            case $.Identifier:
            case $.IdentifierReference:
            case $.IdentifierName:
            default:
                imports.add(<string>node.value);
                exports.add(<string>node.value);
                break;
        }
    }
    return { AWAIT, imports, exports };
}
