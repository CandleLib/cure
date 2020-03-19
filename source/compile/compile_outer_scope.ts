import { MinTreeNode } from "@candlefw/js";
import { traverse, extract, replace } from "@candlefw/conflagrate";

import { getUsedStatements } from "./get_used_statements.js";
import { replaceNodes } from "./replace_nodes.js";

export function compileOuterScope(scope, names, async_check = { is: false }) {

    let statements = null;

    const
        start = scope.offset,
        root = scope.root,
        nodes = scope.nodes,
        { statements: s, names: n, AWAIT } = getUsedStatements(scope, start, names);

    if (AWAIT) async_check.is = true;

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
        return [...compileOuterScope(scope.parent, names, async_check), ...statements];
    else
        return statements;
}
