import { MinTreeNodeClass, MinTreeNode, MinTreeNodeType } from "@candlefw/js";
import { traverse, bit_filter, filter } from "@candlefw/conflagrate";
import { AssertionSite } from "../types/assertion_site.js";
import { Scope } from "../types/scope.js";
export function createUncompiledAssertionSite(scope: Scope, node: MinTreeNode, suite_names: string[]): AssertionSite {

    /*********************************************************
     * ADD Assertion site.
     *********************************************************/
    const
        names = new Set(),
        nm = suite_names.pop();

    let AWAIT: boolean = false;

    for (const id of traverse(node, "nodes")

        .then(bit_filter("type", MinTreeNodeClass.IDENTIFIER))
    ) {
        if (id.type & MinTreeNodeClass.PROPERTY_NAME)
            continue;
        names.add(id.value);
    }

    for (const id of traverse(node, "nodes")

        .then(filter("type", MinTreeNodeType.AwaitExpression))
    ) {
        AWAIT = true;
        break;
    }

    suite_names.push("#");

    return <AssertionSite>{
        type: "THREADED",
        start: scope.stmts.length,
        ast: node,
        name_data: {
            name: nm == "#"
                ? ""
                : nm, suite_names: suite_names
                    .reduce(
                        (r, s) => (s == "#"
                            ? 0
                            : r.push(s), r), []
                    )
        },
        scope,
        names,
        AWAIT
    };
}
