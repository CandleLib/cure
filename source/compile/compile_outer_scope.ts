import { MinTreeNode } from "@candlefw/js";
import { traverse, extract, replace } from "@candlefw/conflagrate";

import { getUsedStatements } from "./get_used_statements";
import { replaceNodes } from "./replace_nodes";

export function compileOuterScope(scope, names) {

    let statements = null;

    const
        start = scope.offset,
        root = scope.root,
        nodes = scope.nodes,
        { statements: s, names: n } = getUsedStatements(scope, start, names);

    names = n;

    statements = s;

    if (root) {

        const receiver = { ast: <MinTreeNode>null };

        nodes.length = 0;

        nodes.push(...statements);

        traverse(root, "nodes").then(replace(replaceNodes)).then(extract(receiver)).run();

        statements = [receiver.ast];
    }

    if (scope.parent)
        return [...compileOuterScope(scope.parent, names), ...statements];
    else
        return statements;
}
