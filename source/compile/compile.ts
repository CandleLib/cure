import { MinTreeNodeType as $, render as $r, ext, MinTreeNodeClass, MinTreeNode, MinTreeNodeType, exp } from "@candlefw/js";
import { traverse, bit_filter, make_skippable, filter } from "@candlefw/conflagrate";
import URL from "@candlefw/url";

import { CompileBinding } from "./compile_binding.js";

/*
 * Compiles test blocks from ast objects.
 */
export async function compileTest(ast: MinTreeNode, origin: URL) {

    const
        asts = [],
        imports = [],
        statements = [],
        bindings = [];

    let
        suite_name = "",
        PRAGMA = null;

    try {
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
                    url = new URL(<string>ext(node, true).from.url.value);

                const
                    obj = {
                        import_names: [],
                        module_source: url.path,
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
                    if (PRAGMA) {
                        switch (PRAGMA.type) {
                            case "AE":
                                asts.slice(0, PRAGMA.ast_end).forEach(({ stmts }) => {
                                    stmts.push(...statements.slice(PRAGMA.start));
                                });
                        }
                        PRAGMA = null;
                    }

                    switch (<string>expression.value) {
                        case "#AFTER EACH":
                            console.log(PRAGMA);
                            PRAGMA = { type: "AE", start: statements.length, ast_end: asts.length };
                            break;
                        default:
                            if (!suite_name) {
                                suite_name = <string>expression.value;
                            } else {
                                statement_tracker.name = <string>expression.value;
                                statement_tracker.node = null;
                                bindings.push(statement_tracker);
                            }
                    }

                    continue;
                }
            }

            statements.push(statement_tracker);

            //Only want top level statements
            node.skip();
        }

        asts.push(...bindings.filter(b => !!b.node).map(b => CompileBinding(b, statements, origin.path)));

        if (PRAGMA) {
            switch (PRAGMA.type) {
                case "AE":
                    const ae_statements = statements.slice(PRAGMA.start).map(stmt => stmt.node);
                    asts.forEach(({ stmts }) => {
                        stmts.push(...ae_statements);
                    });
            }
            PRAGMA = null;
        }

    } catch (e) {
        asts.push({ ast: null, name: "FAILED PARSE", error: e });
    }

    return { name: suite_name, asts, imports };
}
