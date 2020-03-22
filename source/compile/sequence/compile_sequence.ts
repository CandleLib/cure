import { MinTreeNode, MinTreeNodeType, ext } from "@candlefw/js";
import { traverse, skip_root, make_skippable } from "@candlefw/conflagrate";
import { Scope } from "../../types/scope.js";
import { AssertionSite } from "../../types/assertion_site.js";
import { extractIdentifierDependencies } from "../utils/extract_identifier_dependencies.js";
import { createAssertionSite } from "../assertion_site/create_assertion_site.js";

/**
 * Compiles a sequence of assertion sites found within
 * a labeled block statement:
 * >```javascript
 * >SEQUENCE: {
 * >    statement
 * >    ((test1))
 * >    statement
 * >    ((test2))
 * >    //...
 * >}
 * >```
 * 
 * Sequenced AssertionSites run sequentially within one test thread. 
* 
 * @param labelled_statement 
 * @param scope 
 * @param test_sites 
 */
export function compileSequence(labelled_statement: MinTreeNode, scope: Scope, suite_names: string[]): AssertionSite {

    const
        statements = [],
        assertion_site = <AssertionSite>{
            type: "SEQUENCED",
            index: 0,
            start: scope.offset,
            ast: labelled_statement,
            name_data: { name: "", suite_names: [] },
            scope,
            names: new Set(),
            AWAIT: false,
            statements
        };

    for (const node of traverse(labelled_statement.nodes[1], "nodes", 2)
        .then(skip_root())
        .then(make_skippable())
    ) {
        if (node.type == MinTreeNodeType.ExpressionStatement) {
            const { expression } = ext(node, true);

            if (
                expression.type == MinTreeNodeType.Parenthesized
                &&
                expression.expression.type == MinTreeNodeType.Parenthesized
            ) {
                statements.push(createAssertionSite(scope, expression.expression.expression, suite_names));

                node.skip();

                continue;
            } else if (expression.type == MinTreeNodeType.StringLiteral) {

                if (suite_names.slice(-1)[0] == "#")
                    suite_names.pop();

                suite_names.push(<string>expression.value);

                continue;

            } else if (expression.type == MinTreeNodeType.CallExpression) {
                const
                    name = (expression.nodes[0].value + "").toLocaleLowerCase(),
                    first_arg = node.nodes[0].nodes[0];

                if (first_arg && first_arg.type == MinTreeNodeType.Parenthesized) {
                    const
                        SOLO = ["solo", "mono", "s", "m"].includes(name),
                        INSPECT = ["inspect", "i"].includes(name),
                        RUN = !["skip", "sk"].includes(name);

                    statements.push(createAssertionSite(scope, first_arg.nodes[0], suite_names, SOLO, INSPECT, RUN));

                    node.skip();
                }
            }
        }

        const { AWAIT, exports, imports } =
            extractIdentifierDependencies(node);

        statements.push({ AWAIT, ast: node, imports, exports });
    }



    return assertion_site;
}; 