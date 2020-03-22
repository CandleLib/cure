import { MinTreeNodeType as $, MinTreeNode, MinTreeNodeType } from "@candlefw/js";
import { traverse, skip_root, filter, make_replaceable, extract } from "@candlefw/conflagrate";
import { MinTreeExtendedNode } from "@candlefw/js/build/types/types/mintree_extended_node";

/**
 * Removes double parenthesis statements from an AST.
 * 
 * @param {MinTreeNode | MinTreeExtendedNode} ast 
 */
export function sanitize<T>(ast: T): T {

    type $T = T & { nodes: $T[], type: number; };

    const receiver = { ast: null };
    /**
     * The active suite/test name
     */

    for (const node of traverse(<$T>ast, "nodes")
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
