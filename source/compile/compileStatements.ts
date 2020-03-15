import { MinTreeNodeType as $, ext, MinTreeNodeClass, MinTreeNode } from "@candlefw/js";
import { traverse, bit_filter, make_skippable, skip_root, extract } from "@candlefw/conflagrate";
import { compileImport } from "./compileImport.js";
import { TestSite } from "../types/test_site";
import { Scope } from "../types/scope";
import { DependGraphNode } from "../types/depend_graph_node";
import { sanitize } from "./sanitize";

export function compileStatements(
    ast: MinTreeNode,
    parent_scope = null,
    suite_name: string = "",
    active_test_name: string = "",
    name_iterations: number = 0,
    root = null,
    root_nodes = null,
    USE_ALL = false): {
        scope: Scope;
        test_sites: TestSite[];
    } {

    const
        test_sites: TestSite[] = [],
        scope: Scope = {
            root,
            nodes: root_nodes,
            ast,
            offset: parent_scope ? parent_scope.offset : 0,
            parent: parent_scope,
            imp: [],
            dec: [],
            stmts: [],
            pragmas: [],
            USE_ALL
        },
        receiver = { ast: null };
    /**
     * The active suite/test name
     */
    for (const node of traverse(ast, "nodes")
        .then(bit_filter("type", MinTreeNodeClass.STATEMENT))
        .then(make_skippable())
        .then(extract(receiver))
        .then(skip_root())
    ) {

        switch (node.type) {

            case $.ImportDeclaration: {

                compileImport(node, scope.imp);

            } continue;

            case $.ExportDeclaration: continue;

            case $.BlockStatement: {
                const new_node = sanitize(node);

                /*********************************************************
                 * Reserve Block statement
                 *********************************************************/
                test_sites.push(...compileStatements(node, scope, suite_name, active_test_name, name_iterations, new_node, new_node.nodes, true).test_sites);

                node.skip();
            } continue;

            case $.FunctionDeclaration: {

                const funct = ext(node);

                if (funct.name.value == "AFTER_EACH") {

                    scope.pragmas.push({
                        type: "AE",
                        node: sanitize(funct).body
                    });
                }
                else if (funct.name.value == "BEFORE_EACH") {

                    scope.pragmas.push({
                        type: "BE",
                        node: sanitize(funct).body
                    });
                }

                const new_node = sanitize(node);
            } break;

            case $.WhileStatement: {
                const new_node = sanitize(node);

                console.dir(ext(new_node, true), { depth: null });

                /*********************************************************
                 * Reserve Block statement
                 *********************************************************/
                test_sites.push(...compileStatements(node.nodes[1], scope, suite_name, active_test_name, name_iterations, new_node, new_node.nodes[1].nodes, true).test_sites);

                node.skip();
            } continue;

            case $.Class: {
                const new_node = sanitize(node);
            } break;

            case $.ExpressionStatement: {
                const { expression } = ext(node, true);

                if (expression.type == $.Parenthesized &&

                    expression.expression.type == $.Parenthesized) {

                    const name = (active_test_name || "undefined test")
                        + (++name_iterations > 0 ? " @:" + name_iterations : "");

                    /*********************************************************
                 * ADD Assertion site.
                 *********************************************************/
                    const names = new Set();

                    for (const id of traverse(node, "nodes")
                        .then(bit_filter("type", MinTreeNodeClass.IDENTIFIER))
                    ) names.add(id.value);

                    test_sites.push(<TestSite>{
                        start: scope.stmts.length,
                        node,
                        name,
                        scope,
                        names
                    });

                    node.skip();

                    continue;
                } else if (expression.type == $.StringLiteral) {

                    /*********************************************************
                     * ADD Assertion site.
                     *********************************************************/

                    //If the active name has never been used then assume suite name. 
                    if (name_iterations == 0 && !suite_name) {
                        suite_name = expression.value + ".";
                        active_test_name = suite_name;
                    } else
                        active_test_name = suite_name + expression.value;
                } else if (expression.type == $.CallExpression) {
                    /*********************************************************
                     * Check for PRAGMAS
                     *********************************************************/
                    //BEFORE EACH
                    //AFTER EACH
                    //AFTER ALL
                    //BEFORE ALL
                }
            } break;
        }

        /*********************************************************
         * ADD DependGraphNode
         *********************************************************/

        const statement_tracker = <DependGraphNode>{
            ast: node,
            imports: new Set(),
            exports: new Set()
        };

        //Extract References and Bindings
        for (const id of traverse(node, "nodes").then(bit_filter("type", MinTreeNodeClass.IDENTIFIER))) {

            switch (id.type) {

                case $.IdentifierBinding:
                    statement_tracker.exports.add(<string>id.value);
                    break;

                case $.Identifier:
                    statement_tracker.imports.add(<string>id.value);
                    statement_tracker.exports.add(<string>id.value);
                    break;

                case $.IdentifierReference:
                    statement_tracker.imports.add(<string>id.value);
                    statement_tracker.exports.add(<string>id.value);
                    break;

                case $.IdentifierName:
                    statement_tracker.imports.add(<string>id.value);
                    statement_tracker.exports.add(<string>id.value);
                    break;
            }
            //            statement_tracker.exports.add(<string>id.value);
        }

        scope.stmts.push(statement_tracker);

        scope.offset = scope.stmts.length;

        //Only want top level statements
        node.skip();
    }

    return { test_sites, scope };
}
