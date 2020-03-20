import { MinTreeNodeType as $, ext, MinTreeNodeClass, MinTreeNode } from "@candlefw/js";
import { traverse, bit_filter, make_skippable, skip_root, extract } from "@candlefw/conflagrate";

import { AssertionSite } from "../types/assertion_site.js";
import { Scope } from "../types/scope.js";

import { compileImport } from "./compile_import.js";
import { sanitize } from "./sanitize.js";
import { compileSequence } from "./compile_sequence.js";
import { createAssertionSite } from "./create_assertion_site.js";
import { extractIdentifierDependencies } from "./extract_identifier_dependencies.js";


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
    main: for (const node of traverse(ast, "nodes")
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

            case $.LabeledStatement: {

                const labeled = ext(node);

                switch (<string>labeled.label.value) {
                    case "AFTER_EACH":
                        scope.pragmas.push({
                            type: "AE",
                            nodes: sanitize(labeled).statement.nodes || []
                        });
                        node.skip();
                        continue main;
                    case "BEFORE_EACH":
                        scope.pragmas.push({
                            type: "BE",
                            nodes: sanitize(labeled).statement.nodes || []
                        });
                        node.skip();
                        continue main;
                    case "SEQUENCE":
                        test_sites.push(compileSequence(node, scope, suite_names.slice()));
                        node.skip();
                        continue main;
                }
            }

            case $.FunctionDeclaration: {
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


                if (expression.type == $.Parenthesized

                    &&

                    expression.expression.type == $.Parenthesized) {

                    test_sites.push(createAssertionSite(scope, node, suite_names));

                    node.skip();

                    continue;
                } else if (expression.type == $.StringLiteral) {

                    if (suite_names.slice(-1)[0] == "#")
                        suite_names.pop();

                    suite_names.push(<string>expression.value);

                    continue;

                } else if (expression.type == $.CallExpression) { }
            } break;
        }

        /*********************************************************
         * ADD DependGraphNode
         *****************************************  ****************/

        const { AWAIT, exports, imports } =
            extractIdentifierDependencies(node);
        scope.stmts.push({ AWAIT, ast: node, imports, exports });
        scope.offset = scope.stmts.length;
        //Only want top level statements
        node.skip();
    }
    return { test_sites, scope };
}
