import { MinTreeNodeType as $, MinTreeNode, MinTreeNodeType } from "@candlefw/js";
import { traverse, skip_root, filter, make_replaceable, extract } from "@candlefw/conflagrate";

/**
 * Removes double parenthesis statements from an AST.
 * 
 * @param {MinTreeNode} ast 
 */
export function sanitize(ast: MinTreeNode) {

    const receiver = { ast: <MinTreeNode>null };
    /**
     * The active suite/test name
     */

    for (const node of traverse(ast, "nodes")
        .then(filter("type", MinTreeNodeType.ExpressionStatement))
        .then(make_replaceable())
        .then(extract(receiver))
        .then(skip_root())
    ) {

        if (node.nodes[0].type == $.Parenthesized &&
            node.nodes[0].nodes[0].type == $.Parenthesized) {
            node.replace(null);
        }
    }

    return receiver.ast;
}
