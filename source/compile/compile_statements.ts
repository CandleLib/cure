import { MinTreeNodeType as $, ext, MinTreeNodeClass, MinTreeNode, MinTreeNodeType } from "@candlefw/js";
import { traverse, bit_filter, make_skippable, skip_root, extract, filter } from "@candlefw/conflagrate";

import { AssertionSite } from "../types/assertion_site.js";
import { Scope } from "../types/scope.js";
import { DependGraphNode } from "../types/depend_graph_node.js";

import { compileImport } from "./compile_import.js";
import { sanitize } from "./sanitize.js";

export function compileStatements(
    ast: MinTreeNode,
    full_origin_path: string,
    parent_scope = null,
    suite_names: string[] = [],
    active_test_name: string = "",
    name_iterations: number = 0,
    root = null,
    root_nodes = null,
    USE_ALL = false): {
        scope: Scope;
        test_sites: AssertionSite[];
    } {

    let LOCAL_SUITE_NAME = suite_names.length == 0;;

    const
        test_sites: AssertionSite[] = [],
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

                compileImport(node, scope.imp, full_origin_path);

            } continue;

            case $.ExportDeclaration: continue;

            case $.BlockStatement: {
                const new_node = sanitize(node);

                /*********************************************************
                 * Reserve Block statement
                 *********************************************************/
                test_sites.push(...compileStatements(node, full_origin_path, scope, suite_names.slice(), active_test_name, name_iterations, new_node, new_node.nodes, true).test_sites);

                node.skip();
            } continue;

            case $.FunctionDeclaration: {

                const funct = ext(node);
                //@ts-ignore
                if (funct.name.value == "AFTER_EACH") {

                    scope.pragmas.push({
                        type: "AE",
                        nodes: sanitize(funct).body.nodes || []
                    });
                }
                //@ts-ignore
                else if (funct.name.value == "BEFORE_EACH") {

                    scope.pragmas.push({
                        type: "BE",
                        nodes: sanitize(funct).body.nodes || []
                    });
                }

                const new_node = sanitize(node);
            } break;

            case $.WhileStatement: {
                const new_node = sanitize(node);

                /*********************************************************
                 * Reserve Block statement
                 *********************************************************/
                test_sites.push(...compileStatements(node.nodes[1], full_origin_path, scope, suite_names.slice(), active_test_name, name_iterations, new_node, new_node.nodes[1].nodes, true).test_sites);

                node.skip();
            } continue;

            case $.Class: {
                const new_node = sanitize(node);
            } break;

            case $.ExpressionStatement: {
                const { expression } = ext(node, true);
                let AWAIT = false;

                if (expression.type == $.Parenthesized &&

                    expression.expression.type == $.Parenthesized) {

                    const name = (active_test_name || "");

                    /*********************************************************
                     * ADD Assertion site.
                     *********************************************************/
                    const names = new Set();

                    for (const id of traverse(node, "nodes")
                        .then(bit_filter("type", MinTreeNodeClass.IDENTIFIER))
                    ) {
                        if (id.type & MinTreeNodeClass.PROPERTY_NAME)
                            continue;
                        names.add(id.value);
                    };

                    for (const id of traverse(node, "nodes")
                        .then(filter("type", MinTreeNodeType.AwaitExpression))
                    ) { AWAIT = true; break; };

                    const nm = suite_names.pop();

                    test_sites.push(<AssertionSite>{
                        start: scope.stmts.length,
                        node,
                        name_data: { name: nm == "#" ? "" : nm, suite_names: suite_names.slice() },
                        scope,
                        names,
                        AWAIT
                    });

                    node.skip();

                    continue;
                } else if (expression.type == $.StringLiteral) {

                    suite_names.push(<string>expression.value);

                    continue;

                } else if (expression.type == $.CallExpression) {
                }
            } break;
        }

        /*********************************************************
         * ADD DependGraphNode
         *********************************************************/

        const statement_tracker = <DependGraphNode>{
            AWAIT: false,
            ast: node,
            imports: new Set(),
            exports: new Set()
        };

        //Extract References and Bindings and check for await expression
        for (const id of traverse(node, "nodes").then(filter("type",
            MinTreeNodeType.AwaitExpression,
            $.IdentifierBinding,
            $.Identifier,
            $.IdentifierReference,
            $.IdentifierName

        ))) {

            if (id.type & MinTreeNodeClass.PROPERTY_NAME)
                continue;

            if (id.type == MinTreeNodeType.AwaitExpression) {
                statement_tracker.AWAIT = true;
                continue;
            }

            switch (id.type) {

                case $.IdentifierBinding:
                    statement_tracker.exports.add(<string>id.value);
                    break;

                case $.Identifier:
                case $.IdentifierReference:
                case $.IdentifierName:
                default:
                    statement_tracker.imports.add(<string>id.value);
                    statement_tracker.exports.add(<string>id.value);
                    break;
            }
            //            statement_tracker.exports.add(<string>id.value);
        }

        //search for await expression

        scope.stmts.push(statement_tracker);

        scope.offset = scope.stmts.length;

        //Only want top level statements
        node.skip();
    }

    return { test_sites, scope };
}
