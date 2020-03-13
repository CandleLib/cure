import { MinTreeNodeType as $, parser, render as $r, ext, MinTreeNodeClass, MinTreeNode, stmt, MinTreeNodeType, exp } from "@candlefw/js";
import { traverse, bit_filter, make_replaceable, extract, add_parent, replace, make_skippable, filter } from "@candlefw/conflagrate";
import { getErrorMessageFromContent } from "./get_error_message.js";
import URL from "@candlefw/url";
import { i } from "@candlefw/whind/build/types/ascii_code_points";
/**
 * Compiles test blocks from ast objects.
 */
export async function compileTest(ast: MinTreeNode, origin: URL) {

    const asts = [], globals = [], imports = [], statements = [], bindings = [];

    let suite_name = "";

    for (
        const node of traverse(ast, "nodes")
            .then(bit_filter("type", MinTreeNodeClass.STATEMENT))
            .then(make_skippable())
    ) {
        /**
         * Import statements
         */
        if (node.type & MinTreeNodeClass.MODULE) {

            let
                url = new URL(ext(node, true).from.url.value);

            const
                obj = {
                    import_names: [],
                    module_source: url,
                    IS_RELATIVE: url.IS_RELATIVE
                };

            for (const id of traverse(node, "nodes")
                .then(filter("type",
                    MinTreeNodeType.Specifier,
                    MinTreeNodeType.IdentifierModule,
                    MinTreeNodeType.IdentifierDefault
                ))
                .then(make_skippable())
            ) {
                if (id.type == MinTreeNodeType.Specifier) {
                    const { original, transformed } = ext(id);
                    id.skip();
                    obj.import_names.push({ import_name: transformed.value, original_name: original.value });
                } else if (id.type == MinTreeNodeType.IdentifierDefault) {
                    obj.import_names.push({ import_name: id.value, original_name: "default" });
                } else {
                    obj.import_names.push({ import_name: id.value, original_name: id.value });
                }
            };

            imports.push(obj);

            continue;
        }


        //extract any statement that has double bindings
        const statement_tracker = {
            name: "",
            node,
            inputs: new Set(),
            outputs: new Set(),
            str: node.pos.slice(),
            index: statements.length
        };

        //Extract References and Bindings
        for (const id of traverse(node, "nodes").then(bit_filter("type", MinTreeNodeClass.IDENTIFIER))) {
            switch (id.type) {
                case $.IdentifierBinding:
                    statement_tracker.outputs.add(id.value);
                    break;
                case $.Identifier:
                    statement_tracker.inputs.add(id.value);
                    break;
                case $.IdentifierReference:
                    statement_tracker.inputs.add(id.value);
                    break;
            }
        }

        if (node.type == $.ExpressionStatement) {

            const { expression } = ext(node);

            if (expression.type == $.Parenthesized) {

                if (ext(node, true).expression.expression.type == $.Parenthesized) {
                    const current_binding = bindings.slice(-1)[0];

                    if (current_binding && !current_binding.node) {
                        current_binding.index = statements.length;
                        current_binding.node = node;
                    } else {
                        bindings.push(statement_tracker);
                    }
                    //Only want top level statements
                    node.skip();
                    continue;
                }
            }

            if (expression.type == $.StringLiteral) {

                if (!suite_name) {
                    suite_name = <string>expression.value;
                } else {
                    statement_tracker.name = <string>expression.value;
                    statement_tracker.node = null;
                    bindings.push(statement_tracker);
                }

                continue;
            }
        }

        statements.push(statement_tracker);

        //Only want top level statements
        node.skip();
    }

    for (const binding of bindings) {

        //create new script
        const
            node = parser`;`,
            map = [],
            stmts = node.nodes;

        stmts.length = 0;

        for (let i = 0; i < binding.index; i++)
            stmts.push(statements[i].node);

        const
            expr = <MinTreeNode>binding.node.nodes[0].nodes[0].nodes[0],
            message = getErrorMessageFromContent(expr);

        let out_expr = $r(expr);

        if (expr.type == $.CallExpression)
            out_expr = `(()=>{ try{${out_expr}}catch(e){return true;} return false; })()`;

        if (expr.type == $.ArrowFunction || expr.type & MinTreeNodeClass.VARIABLE)
            out_expr = `i.throws(${out_expr})`;

        if (expr.type == $.EqualityExpression) {
            switch (expr.symbol) {
                case "==":
                    out_expr = `i.equal(${$r(expr.nodes[0])}, ${$r(expr.nodes[1])})`;
                    break;
                case "!=":
                    out_expr = `i.notEqual(${$r(expr.nodes[0])}, ${$r(expr.nodes[1])})`;
                    break;
            }
        }

        try {
            const
                thr = stmt(`if(!(${out_expr})) throw AssertionError(\`${message}\`);`),
                landing = { ast: null };

            for (const node of traverse(thr, "nodes")
                .then(extract(landing))
                .then(replace(node => (node.pos = expr.pos, node)))
                .then(bit_filter("type", MinTreeNodeClass.IDENTIFIER))
                .then(make_replaceable())) {
                if (node.value == "t")
                    node.replace(expr);
            }
            stmts.push(landing.ast);
            asts.push({ ast: node, name: binding.name || "undefined" });
        } catch (e) {
            console.error(e);


        }
    }

    return { name: suite_name, asts, imports };
}
;
