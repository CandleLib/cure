import { MinTreeNodeType as $, render as $r, ext, MinTreeNodeClass, MinTreeNode, MinTreeNodeType, exp, stmt, parser } from "@candlefw/js";
import { traverse, bit_filter, make_skippable, skip_root, filter, make_replaceable, extract, replace } from "@candlefw/conflagrate";
import URL from "@candlefw/url";

import { MinTreeExtendedNode } from "@candlefw/js/build/types/types/mintree_extended_node";
import { compileAssertionSite } from "./compile_assertion_site.js";
import { TestAssertionError } from "../types/test_error.js";
import { Lexer } from "@candlefw/whind";


export type RawTest = {
    suite: string;
    name: string;
    ast: MinTreeNode;
    /**
     * Weak hashing of the test structure. 
     */
    hash?: string;
    error?: Error;
    imports: ImportDependNode[];
    pos: Lexer,
};

export type DependGraphNode = {
    ast: MinTreeNode,
    imports: Set<string>,
    exports: Set<string>;
};

/**
 * Named import reference. 
 */
export type ImportName = {

    /**
     * The reference name of the import that is available within the script;
     */
    import_name: string;

    /**
     * The original name of the imported reference as exported from the module;
     */
    module_name: string;
};
export type ImportDependNode = DependGraphNode & {
    /**
     * An of ImportName
     */
    import_names: Array<ImportName>;
    /**
     * An empty set for compatibility with the DependGraphNode
     */
    exports: Set<void>;
    /**
     * The path / URL / module_name of the import.
     */
    module_source: string;
    /**
     * `true` if the module specifier is a relative pathname.
     */
    IS_RELATIVE: boolean;
};

export type CompileResults = {
    imports: ImportDependNode[],
    raw_tests: RawTest[],
    error?: Error;
};



type Scope = {
    ast: MinTreeNode,
    offset: number,
    parent?: Scope,
    imp: ImportDependNode[];
    dec: DependGraphNode[],
    stmts: DependGraphNode[];
    root: MinTreeNode;
    nodes: MinTreeNode[];

};

type TestSite = {
    start: number;
    node: MinTreeNode,
    name: string,
    scope: Scope;
    names: Set<string>;
};



function compileImport(node: MinTreeExtendedNode, imports: ImportDependNode[]) {
    let
        url = new URL(<string>ext(node, true).from.url.value);

    const
        obj = <ImportDependNode>{
            imports: new Set,
            exports: new Set,
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
            obj.import_names.push({ import_name: <string>transformed.value, module_name: <string>original.value });
        } else if (id.type == MinTreeNodeType.IdentifierDefault) {
            obj.import_names.push({ import_name: <string>id.value, module_name: "default" });
        } else {
            obj.import_names.push({ import_name: <string>id.value, module_name: <string>id.value });
        }
    };

    obj.import_names.forEach(n => obj.exports.add(n.import_name));

    imports.push(obj);
}

function partialIntersectionOfSets(setA, setB) {
    for (const a of setA.values())
        if (setB.has(a))
            return true;

    return false;
};

function getUsedStatements(scope: Scope, offset, names) {
    const statements = scope.stmts.slice(0, offset).reverse();

    const out_statements = [];

    for (const statement of statements) {

        if (partialIntersectionOfSets(names, statement.exports)) {

            for (const imp of statement.imports)
                names.add(imp);
            out_statements.push(statement.ast);
        }
    }

    return { statements: out_statements.reverse(), names };
}

function replaceNodes(node, parent, index) {

    const replaced = Object.assign({}, node);

    if (parent)
        parent.nodes[index] = replaced;

    if (replaced.nodes)
        replaced.nodes = replaced.nodes.slice();

    return replaced;
}


function compileOuterScope(scope, names) {
    const
        start = scope.offset,
        root = scope.root,
        nodes = scope.nodes;

    let statements = null;

    const { statements: s, names: n } = getUsedStatements(scope, start, names);

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
        return [...compileOuterScope(scope.parent, names), ...statements];

    else return statements;
}

function compileTestBinding(name: string, test_site: TestSite, imports: ImportDependNode[]): RawTest {
    const i = [];

    let
        node = test_site.node,
        assertion_statement = compileAssertionSite(node),
        scope = test_site.scope,
        names = test_site.names,
        root = scope.root,
        nodes = scope.nodes,
        start = test_site.start;

    if (!assertion_statement) {
        const expr = test_site.node.nodes[0].nodes[0].nodes[0];
        return {
            imports: [], suite: "", name, ast: null, pos: node.pos,
            error: new TestAssertionError(`Could not find a SiteCompiler for MinTreeNode [${$[expr.type]}]`, expr.pos.line, expr.pos.char, "", "")
        };
    } else {


        let statements = [];

        const { statements: s, names: n } = getUsedStatements(scope, start, names);

        statements = [...s, assertion_statement];
        names = n;

        if (root) {
            const receiver = { ast: <MinTreeNode>null };
            nodes.length = 0;
            nodes.push(...statements);
            traverse(root, "nodes").then(replace(replaceNodes)).then(extract(receiver)).run();

            statements = [receiver.ast];
        }

        if (scope.parent) {
            statements = [...compileOuterScope(scope.parent, names), ...statements];
        }

        //Add declarations and identify imports. 

        const ast = parser(";");

        ast.nodes = statements;


        /**
         * for (const decl of decl)
         */

        for (const imp of imports) {
            for (const id of imp.import_names)
                if (names.has(id.import_name)) {
                    i.push(imp);
                    break;
                }
        }

        return { name, suite: name, ast, imports: i, pos: node.pos };
    }
}

function sanitize(ast: MinTreeNode) {
    const receiver = { ast: <MinTreeNode>null };

    /**
     * The active suite/test name 
     */

    for (
        const node of traverse(ast, "nodes")
            .then(filter("type", MinTreeNodeType.ExpressionStatement))
            .then(make_replaceable())
            .then(extract(receiver))
            .then(skip_root())
    ) {
        if (
            node.nodes[0].type == $.Parenthesized &&
            node.nodes[0].nodes[0].type == $.Parenthesized
        ) {
            node.replace(null);
        }
    }

    return receiver.ast;
}

function compileStatements(
    ast: MinTreeNode,
    parent_scope = null,
    suite_name: string = "",
    active_test_name: string = "",
    name_iterations: number = 0,
    root = null,
    root_nodes = null,
): { scope: Scope, test_sites: TestSite[]; } {
    const test_sites: TestSite[] = [];
    const scope: Scope = {
        root,
        nodes: root_nodes,
        ast,
        offset: parent_scope ? parent_scope.offset : 0,
        parent: parent_scope,
        imp: [],
        dec: [],
        stmts: []
    };

    const receiver = {};

    /**
     * The active suite/test name 
     */

    for (
        const node of traverse(ast, "nodes")
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
                test_sites.push(
                    ...compileStatements(node, scope, suite_name, active_test_name, name_iterations, new_node, new_node.nodes).test_sites
                );

                node.skip();

            } continue;
            case $.FunctionDeclaration: {

                const new_node = sanitize(node);

            } break;
            case $.Class: {

                const new_node = sanitize(node);

            } break;
            case $.ExpressionStatement: {

                const { expression } = ext(node, true);

                if (
                    expression.type == $.Parenthesized &&
                    expression.expression.type == $.Parenthesized
                ) {

                    const name = (active_test_name || "undefined test")
                        + (++name_iterations > 0 ? " @:" + name_iterations : "");

                    /*********************************************************
                     * ADD Assertion site.
                     *********************************************************/
                    const names = new Set();

                    for (const id of traverse(node, "nodes").then(bit_filter("type", MinTreeNodeClass.IDENTIFIER)))
                        names.add(id.value);

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
                        suite_name = "@[" + expression.value + "]";
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

            console.log("\n", test);
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
/*
 * Compiles test blocks from ast objects.
 */
export async function compileTest(ast: MinTreeNode) {

    const
        imports: Array<ImportDependNode> = [],
        tests: Array<RawTest> = [];

    let error = null;
    let i = 0;
    const { test_sites, scope } = compileStatements(ast);

    /*********************************************************
     * Assertion test sites.
     *********************************************************/
    //for (const site of test_sites) {
    for (const site of test_sites) {

        const test = compileTestBinding(site.name, site, scope.imp);

        if (test)
            tests.push(test);
    }

    return <CompileResults>{ raw_tests: tests, imports, error };
}
