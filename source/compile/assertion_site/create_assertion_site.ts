import { MinTreeNodeClass, MinTreeNode, MinTreeNodeType } from "@candlefw/js";
import { traverse, bit_filter, filter } from "@candlefw/conflagrate";
import { AssertionSite } from "../../types/assertion_site.js";
import { Scope } from "../../types/scope.js";
export function createAssertionSite(scope: Scope, expression: MinTreeNode, suite_names: string[], SOLO = false, INSPECT = false, RUN = true): AssertionSite {

    /*********************************************************
     * ADD Assertion site.
     *********************************************************/
    const
        names = new Set(),
        nm = suite_names.slice(-1)[0];

    let AWAIT: boolean = false;

    for (const id of traverse(expression, "nodes")

        .then(bit_filter("type", MinTreeNodeClass.IDENTIFIER))
    ) {
        if (id.type & MinTreeNodeClass.PROPERTY_NAME)
            continue;
        names.add(id.value);
    }

    for (const id of traverse(expression, "nodes")

        .then(filter("type", MinTreeNodeType.AwaitExpression))
    ) {
        AWAIT = true;
        break;
    }

    return <AssertionSite>{
        type: "THREADED",
        start: scope.stmts.length,
        ast: expression,
        name_data: {
            name: nm == "#"
                ? ""
                : nm, suite_names: suite_names.slice(0, -1)
                    .reduce(
                        (r, s) => (s == "#"
                            ? 0
                            : r.push(s), r), []
                    )
        },
        scope,
        names,
        AWAIT,
        SOLO,
        INSPECT,
        RUN
    };
}
