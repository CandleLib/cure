import { MinTreeNodeType as $, MinTreeNodeClass, MinTreeNode, render, extendAll, exp, stmt, MinTreeNodeType } from "@candlefw/js";
import { traverse, bit_filter, make_skippable, skip_root } from "@candlefw/conflagrate";

import { AssertionSite, AssertionSiteSequence } from "../types/assertion_site.js";
import { Scope } from "../types/scope.js";

import { compileImport } from "./compile_import.js";
import { sanitize } from "./utils/sanitize.js";
import { compileSequence } from "./sequence/compile_sequence.js";
import { createAssertionSite } from "./assertion_site/create_assertion_site.js";
import { extractIdentifierDependencies } from "./utils/extract_identifier_dependencies.js";
import { Reporter } from "../main.js";
import { inspect } from "../test_running/test_harness.js";

/**
 * Generates a graph accessible symbols from any givin line within a 
 * source file.
 */
export function generateSymbolGraph(ast: MinTreeNode):
    any {
    return ast;
}

export function compileStatements(

    ast: MinTreeNode,
    origin: string = "",
    reporter: Reporter,
    parent_scope = null,
    suite_names: string[] = [],
    USE_ALL = false,
    SKIP_ALL = false): {
        scope: Scope;
        assertion_sites: (AssertionSite | AssertionSiteSequence)[];
    } {

    const

        assert_sites: (AssertionSite | AssertionSiteSequence)[] = [],

        scope: Scope = <Scope>{
            type: "SCOPE",
            ast,
            offset: parent_scope ? parent_scope.stmts.length : 0,
            parent: parent_scope,
            imp: [],
            //dec: [],
            stmts: [],
            pragmas: [],
            USE_ALL
        },
        declared = <Set<string>>new Set(),
        imports = <Set<string>>new Set(),
        exports = <Set<string>>new Set();

    main: for (let { node } of traverse(ast, "nodes", 2)
        .then(bit_filter("type", MinTreeNodeClass.STATEMENT))
        .then(skip_root())
    ) {
        let merge_names = null;

        switch (node.type) {

            case $.ImportDeclaration: { compileImport(node, scope.imp); } continue;
            case $.ExportDeclaration: continue;
            case $.WhileStatement:
            case $.DoStatement:
            case $.ForStatement:
            case $.ForInStatement:
            case $.ForOfStatement:
            case $.SwitchStatement: {

                const { sanitized, assertion_site } = compileSequence(node, scope, suite_names.slice(), reporter, origin);

                assert_sites.push(assertion_site);

                suite_names.push("#");
                suite_names.pop();
                merge_names = assertion_site.names;

                node = sanitized;

            } break;

            case $.BlockStatement: {
                suite_names.push("#");

                const { scope: s, assertion_sites } = compileStatements(
                    node, origin, reporter, scope, suite_names.slice(), false
                );
                suite_names.pop();

                assert_sites.push(...assertion_sites);

                scope.stmts.push(s);

            } continue;

            case $.LabeledStatement: {

                const [label] = node.nodes;

                switch (<string>label.value) {

                    case "AFTER_EACH":
                        scope.pragmas.push({
                            type: "AE",
                            nodes: sanitize(node).nodes[1].nodes || []
                        });
                        continue main;

                    case "BEFORE_EACH":
                        scope.pragmas.push({
                            type: "BE",
                            nodes: sanitize(node).nodes[1].nodes || []
                        });
                        continue main;

                    case "SEQUENCE": {

                        const { assertion_site } = compileSequence(node, scope, suite_names.slice(), reporter, origin);

                        assert_sites.push(assertion_site);

                        merge_names = assertion_site.names;

                        for (const name of extractIdentifierDependencies(node, new Set(declared)).imports)
                            merge_names.add(name);

                    } continue main;

                    case "SKIP": {

                        const { assertion_site } = compileSequence(node, scope, suite_names.slice(), reporter, origin);

                        assertion_site.RUN = false;

                        assert_sites.push(assertion_site);

                    } continue main;
                }
            } break;

            case $.ExpressionStatement: {

                const [expression] = node.nodes;

                if (
                    expression.type == $.Parenthesized
                    &&
                    expression.nodes[0].type == $.Parenthesized
                ) {

                    assert_sites.push(createAssertionSite(scope, expression.nodes[0].nodes[0], suite_names));
                    suite_names.pop();
                    suite_names.push("#");

                    continue;
                } else if (expression.type == $.StringLiteral) {

                    if (suite_names.slice(-1)[0] == "#")
                        suite_names.pop();

                    suite_names.push(<string>expression.value);

                    continue;

                } else if (expression.type == $.CallExpression) {
                    const
                        name = (expression.nodes[0].value + "").toLocaleLowerCase(),
                        [, args] = expression.nodes;

                    if (args.nodes.length == 1) {

                        const [is_paren] = args.nodes;

                        if (is_paren && is_paren.type == $.Parenthesized) {

                            const
                                SOLO = ["solo", "only", "s", "o"].includes(name),
                                INSPECT = ["inspect", "i"].includes(name),
                                SKIP = ["skip", "sk"].includes(name);

                            /**
                             * Only create assertion site if the the call expression has one of the above listed identifier names.
                             * If the name is something else, skip the statement entirely to prevent reference errors in other assertion
                             * sites.
                             */
                            if (SOLO || INSPECT || SKIP)
                                assert_sites.push(createAssertionSite(scope, is_paren.nodes[0], suite_names, SOLO, INSPECT, !SKIP));

                            continue;
                        }
                    }
                }
            } break;
        }

        /*********************************************************
         * ADD DependGraphNode
         *********************************************************/

        const { imports, exports, AWAIT }
            = extractIdentifierDependencies(node, new Set(declared));

        scope.stmts.push({ type: "DEPEND_GRAPH_NODE", AWAIT, ast: node, imports, exports });

        if (merge_names) {

            for (const name of imports)
                merge_names.add(name);
        }

        //  scope.offset = scope.stmts.length;
    }

    if (SKIP_ALL)
        for (const site of assert_sites)
            site.RUN = false;

    return { assertion_sites: assert_sites, scope };
}
